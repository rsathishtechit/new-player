import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initDB, addCourse, getCourses, getCourseDetails, updateProgress, getSetting, setSetting, resetVideoProgress, resetCourseProgress, markVideoComplete } from './main/db';
import { scanCourseFolder } from './main/scanner';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Needed to load local video files
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// Initialize DB
initDB();

// Register IPC Handlers
app.whenReady().then(() => {
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
