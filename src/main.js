import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initDB, addCourse, getCourses, getCourseDetails, updateProgress, getSetting, setSetting, resetVideoProgress, resetCourseProgress, markVideoComplete } from './main/db';
import { scanCourseFolder } from './main/scanner';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let splashWindow;
let mainWindow;

const createSplashWindow = () => {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
  });

  // Create splash HTML content
  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .splash-container {
          text-align: center;
          animation: fadeIn 0.5s ease-in;
        }
        .logo {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 40px rgba(59, 130, 246, 0.3);
        }
        .logo svg {
          width: 48px;
          height: 48px;
          fill: white;
        }
        h1 {
          color: white;
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 10px 0;
        }
        .loading {
          color: #94a3b8;
          font-size: 14px;
        }
        .dots {
          display: inline-block;
          width: 20px;
        }
        .dots::after {
          content: '';
          animation: dots 1.5s steps(4, end) infinite;
        }
        @keyframes dots {
          0%, 20% { content: ''; }
          40% { content: '.'; }
          60% { content: '..'; }
          80%, 100% { content: '...'; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    </head>
    <body>
      <div class="splash-container">
        <div class="logo">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6h2v2H4V6zm0 5h2v2H4v-2zm0 5h2v2H4v-2zm16-8V6H8.023v2H20zM8 11h12v2H8v-2zm0 5h12v2H8v-2z"/>
          </svg>
        </div>
        <h1>Nilaa Player</h1>
        <div class="loading">Loading<span class="dots"></span></div>
      </div>
    </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
};

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // Don't show until ready
    backgroundColor: '#111827', // Dark gray background (matches app theme)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Needed to load local video files
    },
  });

  // Suppress service worker storage errors (harmless Electron warnings)
  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    if (message.includes('service_worker_storage') || message.includes('Failed to delete the database')) {
      return;
    }
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    // Close splash and show main window
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// Register IPC Handlers
app.whenReady().then(async () => {
  // Initialize database
  await initDB();
  // Register custom protocol for local video files if needed, 
  // but webSecurity: false is often easier for local files in Electron
  protocol.registerFileProtocol('local-video', (request, callback) => {
    const url = request.url.replace('local-video://', '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error(error);
      return callback(404);
    }
  });

  ipcMain.handle('dialog:openFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (canceled) {
      return;
    } else {
      const dirPath = filePaths[0];
      const structure = scanCourseFolder(dirPath);
      const title = path.basename(dirPath);
      const courseId = await addCourse(title, dirPath, structure);
      return { courseId, title, structure };
    }
  });

  ipcMain.handle('db:getCourses', async () => {
    return await getCourses();
  });

  ipcMain.handle('db:getCourse', async (event, courseId) => {
    return await getCourseDetails(courseId);
  });

  ipcMain.handle('db:saveProgress', async (event, { videoId, courseId, currentTime, isCompleted }) => {
    await updateProgress(videoId, courseId, currentTime, isCompleted);
  });

  ipcMain.handle('db:getSetting', async (event, key) => {
    return await getSetting(key);
  });

  ipcMain.handle('db:setSetting', async (event, { key, value }) => {
    await setSetting(key, value);
  });

  ipcMain.handle('db:resetVideoProgress', async (event, videoId) => {
    await resetVideoProgress(videoId);
  });

  ipcMain.handle('db:resetCourseProgress', async (event, courseId) => {
    await resetCourseProgress(courseId);
  });

  ipcMain.handle('db:markVideoComplete', async (event, { videoId, courseId }) => {
    await markVideoComplete(videoId, courseId);
  });

  // Create splash screen first
  createSplashWindow();
  
  // Then create main window (will show after splash closes)
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
