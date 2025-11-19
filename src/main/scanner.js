import fs from 'node:fs';
import path from 'node:path';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm', '.mov'];

function isVideoFile(filename) {
  return VIDEO_EXTENSIONS.includes(path.extname(filename).toLowerCase());
}

export function scanCourseFolder(dirPath) {
  const structure = {
    videos: [],
    sections: []
  };

  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  // First pass: files in root
  for (const item of items) {
    if (item.isFile() && isVideoFile(item.name)) {
      structure.videos.push({
        name: path.parse(item.name).name,
        path: path.join(dirPath, item.name)
      });
    } else if (item.isDirectory() && !item.name.startsWith('.')) {
      // Second pass: subdirectories as sections
      const sectionPath = path.join(dirPath, item.name);
      const sectionItems = fs.readdirSync(sectionPath, { withFileTypes: true });
      const sectionVideos = [];

      for (const subItem of sectionItems) {
        if (subItem.isFile() && isVideoFile(subItem.name)) {
          sectionVideos.push({
            name: path.parse(subItem.name).name,
            path: path.join(sectionPath, subItem.name)
          });
        }
      }

      if (sectionVideos.length > 0) {
        structure.sections.push({
          name: item.name,
          path: sectionPath,
          videos: sectionVideos
        });
      }
    }
  }

  // Sort alphabetically
  structure.videos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  structure.sections.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  structure.sections.forEach(section => {
    section.videos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  });

  return structure;
}
