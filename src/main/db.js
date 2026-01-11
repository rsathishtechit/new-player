import { createRequire } from "node:module";
import path from "node:path";
import { app } from "electron";
import { v4 as uuidv4 } from "uuid";

// Use CommonJS require for native modules (sqlite3)
const require = createRequire(import.meta.url);
const sqlite3 = require("sqlite3");

let db;

export function initDB() {
  const dbPath = path.join(app.getPath("userData"), "player.db");
  db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        section_id TEXT,
        title TEXT NOT NULL,
        path TEXT NOT NULL,
        duration REAL DEFAULT 0,
        order_index INTEGER NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS progress (
        video_id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        current_time REAL DEFAULT 0,
        is_completed BOOLEAN DEFAULT 0,
        last_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS daily_learning (
        date TEXT PRIMARY KEY,
        duration_seconds INTEGER DEFAULT 0
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Set default autoplay setting
    db.run(`
      INSERT OR IGNORE INTO settings (key, value) VALUES ('autoplay', 'true')
    `);
  });
}

export function addCourse(title, coursePath, structure) {
  return new Promise((resolve, reject) => {
    const courseId = uuidv4();

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      const insertCourse = db.prepare(
        "INSERT INTO courses (id, title, path) VALUES (?, ?, ?)"
      );
      insertCourse.run(courseId, title, coursePath);
      insertCourse.finalize();

      let videoOrder = 0;
      let sectionOrder = 0;

      const insertSection = db.prepare(
        "INSERT INTO sections (id, course_id, title, order_index) VALUES (?, ?, ?, ?)"
      );
      const insertVideo = db.prepare(
        "INSERT INTO videos (id, course_id, section_id, title, path, order_index) VALUES (?, ?, ?, ?, ?, ?)"
      );

      // Handle root level videos
      if (structure.videos && structure.videos.length > 0) {
        for (const video of structure.videos) {
          insertVideo.run(
            uuidv4(),
            courseId,
            null,
            video.name,
            video.path,
            videoOrder++
          );
        }
      }

      // Handle sections
      if (structure.sections && structure.sections.length > 0) {
        for (const section of structure.sections) {
          const sectionId = uuidv4();
          insertSection.run(sectionId, courseId, section.name, sectionOrder++);

          if (section.videos && section.videos.length > 0) {
            for (const video of section.videos) {
              insertVideo.run(
                uuidv4(),
                courseId,
                sectionId,
                video.name,
                video.path,
                videoOrder++
              );
            }
          }
        }
      }

      insertSection.finalize();
      insertVideo.finalize();

      db.run("COMMIT", (err) => {
        if (err) reject(err);
        else resolve(courseId);
      });
    });
  });
}

export function getCourses() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        c.*,
        COUNT(v.id) as total_videos,
        COUNT(p.video_id) as started_videos,
        SUM(CASE WHEN p.is_completed = 1 THEN 1 ELSE 0 END) as completed_videos,
        MAX(p.last_watched_at) as last_accessed
      FROM courses c
      LEFT JOIN videos v ON c.id = v.course_id
      LEFT JOIN progress p ON v.id = p.video_id
      GROUP BY c.id
      ORDER BY COALESCE(MAX(p.last_watched_at), c.created_at) DESC
    `,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

export function getCourseDetails(courseId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM courses WHERE id = ?", [courseId], (err, course) => {
      if (err) return reject(err);
      if (!course) return resolve(null);

      db.all(
        "SELECT * FROM sections WHERE course_id = ? ORDER BY order_index",
        [courseId],
        (err, sections) => {
          if (err) return reject(err);

          db.all(
            `
          SELECT v.*, p.current_time, p.is_completed, p.last_watched_at 
          FROM videos v
          LEFT JOIN progress p ON v.id = p.video_id
          WHERE v.course_id = ? 
          ORDER BY v.order_index
        `,
            [courseId],
            (err, videos) => {
              if (err) return reject(err);

              const rootVideos = videos.filter((v) => !v.section_id);
              const sectionsWithVideos = sections.map((section) => ({
                ...section,
                videos: videos.filter((v) => v.section_id === section.id),
              }));

              resolve({
                ...course,
                rootVideos,
                sections: sectionsWithVideos,
              });
            }
          );
        }
      );
    });
  });
}

export function updateProgress(videoId, courseId, currentTime, isCompleted) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO progress (video_id, course_id, current_time, is_completed, last_watched_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(video_id) DO UPDATE SET
        current_time = excluded.current_time,
        is_completed = MAX(is_completed, excluded.is_completed),
        last_watched_at = CURRENT_TIMESTAMP
    `,
      [videoId, courseId, currentTime, isCompleted ? 1 : 0],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : null);
    });
  });
}

export function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
      [key, value],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function resetVideoProgress(videoId) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM progress WHERE video_id = ?", [videoId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function resetCourseProgress(courseId) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM progress WHERE course_id = ?", [courseId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function markVideoComplete(videoId, courseId) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO progress (video_id, course_id, current_time, is_completed, last_watched_at)
      VALUES (?, ?, 0, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(video_id) DO UPDATE SET
        is_completed = 1,
        last_watched_at = CURRENT_TIMESTAMP
    `,
      [videoId, courseId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function deleteCourse(courseId) {
  return new Promise((resolve, reject) => {
    // Due to CASCADE constraints, deleting the course will automatically delete
    // all related sections, videos, and progress records
    db.run("DELETE FROM courses WHERE id = ?", [courseId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function recordLearningTime(seconds) {
  const today = new Date().toISOString().split("T")[0];
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO daily_learning (date, duration_seconds)
      VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET
        duration_seconds = duration_seconds + excluded.duration_seconds
    `,
      [today, seconds],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function getTodayLearningTime() {
  const today = new Date().toISOString().split("T")[0];
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT duration_seconds FROM daily_learning WHERE date = ?",
      [today],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.duration_seconds : 0);
      }
    );
  });
}
