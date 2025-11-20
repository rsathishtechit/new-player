import { app, BrowserWindow, ipcMain, dialog, protocol, nativeImage, Tray, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { initDB, addCourse, getCourses, getCourseDetails, updateProgress, getSetting, setSetting, resetVideoProgress, resetCourseProgress, markVideoComplete, deleteCourse } from './main/db';
import { scanCourseFolder } from './main/scanner';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let splashWindow;
let mainWindow;
let tray = null;

// Helper function to get icon path based on platform
function getIconPath() {
  let basePath;
  if (app.isPackaged) {
    basePath = process.resourcesPath;
  } else {
    // In development, __dirname is .vite/build, so we need to go up to project root
    // __dirname/.vite/build -> go up 2 levels to get to project root
    basePath = path.join(__dirname, '../..');
    // Verify we're in the right place by checking for assets folder
    const testAssetsPath = path.join(basePath, 'assets');
    if (!fs.existsSync(testAssetsPath)) {
      // If that doesn't work, try going up one more level
      basePath = path.join(__dirname, '../../..');
    }
  }
  
  const assetsPath = path.join(basePath, 'assets');
  
  // Platform-specific icon formats
  if (process.platform === 'win32') {
    // Windows prefers .ico
    const icoPath = path.join(assetsPath, 'icon.ico');
    try {
      if (fs.existsSync(icoPath)) {
        return icoPath;
      }
    } catch (e) {}
    // Fallback to PNG
    return path.join(assetsPath, 'icon.png');
  } else if (process.platform === 'darwin') {
    // macOS: In packaged app, icon should be in app bundle Resources
    if (app.isPackaged) {
      // Try app bundle Resources folder (where Electron Forge embeds the icon)
      const bundleResourcesPath = path.join(process.resourcesPath, '..');
      const bundleIconPath = path.join(bundleResourcesPath, 'icon.icns');
      if (fs.existsSync(bundleIconPath)) {
        return bundleIconPath;
      }
      // Also try assets folder
      const assetsIconPath = path.join(assetsPath, 'icon.icns');
      if (fs.existsSync(assetsIconPath)) {
        return assetsIconPath;
      }
    } else {
      // Development mode: use project assets
      const devIconPath = path.join(assetsPath, 'icon.icns');
      if (fs.existsSync(devIconPath)) {
        return devIconPath;
      }
      // Fallback to PNG
      const devPngPath = path.join(assetsPath, 'icon.png');
      if (fs.existsSync(devPngPath)) {
        return devPngPath;
      }
    }
    // Fallback to PNG
    return path.join(assetsPath, 'icon.png');
  } else {
    // Linux and others use PNG
    return path.join(assetsPath, 'icon.png');
  }
}

// Helper function to load app icon
function loadAppIcon() {
  const iconPath = getIconPath();
  
  // Debug logging in development
  if (!app.isPackaged) {
    console.log('Attempting to load icon from:', iconPath);
    console.log('Icon file exists:', fs.existsSync(iconPath));
  }
  
  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      console.warn('Icon file is empty or not found at:', iconPath);
      // Try fallback PNG
      let fallbackPath;
      if (app.isPackaged) {
        fallbackPath = path.join(process.resourcesPath, 'assets', 'icon.png');
      } else {
        // In development, use the same basePath logic as getIconPath
        const basePath = path.join(__dirname, '../..');
        fallbackPath = path.join(basePath, 'assets', 'icon.png');
      }
      const fallbackIcon = nativeImage.createFromPath(fallbackPath);
      if (!fallbackIcon.isEmpty()) {
        if (!app.isPackaged) {
          console.log('Using fallback PNG icon');
        }
        return fallbackIcon;
      }
      return null;
    }
    if (!app.isPackaged) {
      const size = icon.getSize();
      console.log('Icon loaded successfully, size:', size.width, 'x', size.height);
    }
    return icon;
  } catch (error) {
    console.warn('Failed to load icon from:', iconPath, error);
    // Try fallback PNG
    try {
      let fallbackPath;
      if (app.isPackaged) {
        fallbackPath = path.join(process.resourcesPath, 'assets', 'icon.png');
      } else {
        // In development, use the same basePath logic as getIconPath
        const basePath = path.join(__dirname, '../..');
        fallbackPath = path.join(basePath, 'assets', 'icon.png');
      }
      const fallbackIcon = nativeImage.createFromPath(fallbackPath);
      if (!fallbackIcon.isEmpty()) {
        if (!app.isPackaged) {
          console.log('Using fallback PNG icon');
        }
        return fallbackIcon;
      }
    } catch (e) {
      console.error('Fallback icon also failed:', e);
    }
    return null;
  }
}

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
          <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
              </linearGradient>
            </defs>
            <rect width="256" height="256" rx="48" fill="url(#grad1)"/>
            <path d="M80 70 L80 186 L186 128 Z" fill="white" opacity="0.95"/>
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
  // Load and set app icon
  const appIcon = loadAppIcon();
  
  // Set macOS dock icon (works in both dev and production)
  // Note: In packaged apps, icon should be embedded in bundle, but this ensures it's set
  if (appIcon && process.platform === 'darwin') {
    try {
      app.dock.setIcon(appIcon);
    } catch (error) {
      console.warn('Failed to set dock icon in createWindow:', error);
    }
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // Don't show until ready
    backgroundColor: '#111827', // Dark gray background (matches app theme)
    icon: appIcon || undefined, // Set window icon (Windows/Linux/macOS)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Needed to load local video files
    },
  });
  
  // Ensure icon is set after window creation (Windows sometimes needs this)
  if (appIcon && process.platform === 'win32') {
    mainWindow.setIcon(appIcon);
  }

  // Suppress service worker storage errors (harmless Electron warnings)
  mainWindow.webContents.on('console-message', (event) => {
    const { level, message } = event;
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

// Create system tray
function createTray() {
  const appIcon = loadAppIcon();
  if (!appIcon) {
    console.warn('Could not create tray icon - icon not found');
    return;
  }

  // Resize icon for tray (tray icons are typically 16x16 on Windows, 22x22 on macOS)
  const traySize = process.platform === 'darwin' ? 22 : 16;
  const trayIcon = appIcon.resize({ width: traySize, height: traySize });
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Nilaa Player',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.focus();
          } else {
            mainWindow.show();
          }
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Nilaa Player');
  tray.setContextMenu(contextMenu);
  
  // On macOS, click event shows/hides window
  if (process.platform === 'darwin') {
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        createWindow();
      }
    });
  }
}

// Configure auto-updater
function setupAutoUpdater() {
  // Configure updater for GitHub releases
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'rsathishtechit',
    repo: 'new-player',
  });

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.log('Update check failed:', err);
    });
  }, 4 * 60 * 60 * 1000);

  // Check for updates on app start (after a delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.log('Initial update check failed:', err);
    });
  }, 5000);

  // Update available
  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  // Update not available
  autoUpdater.on('update-not-available', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available');
    }
  });

  // Update download progress
  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    }
  });

  // Update downloaded and ready to install
  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  // Error handling
  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', {
        message: error.message,
      });
    }
  });
}

// Register IPC Handlers
app.whenReady().then(async () => {
  // Set app icon early (especially important for macOS dock and Windows taskbar)
  const appIcon = loadAppIcon();
  
  if (appIcon) {
    // Set macOS dock icon (this overrides the bundle icon at runtime)
    // Note: For packaged apps, the icon should also be embedded in the app bundle
    if (process.platform === 'darwin') {
      try {
        app.dock.setIcon(appIcon);
        if (!app.isPackaged) {
          console.log('Dock icon set successfully');
        }
      } catch (error) {
        console.error('Failed to set dock icon:', error);
      }
    }
    
    // Set Windows taskbar icon (setAppUserModelId helps with taskbar grouping)
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.nilaa.player');
      try {
        // Windows also benefits from explicit icon setting
        if (app.setAppIcon) {
          app.setAppIcon(appIcon);
        }
      } catch (error) {
        console.warn('Failed to set app icon on Windows:', error);
      }
    }
  } else {
    console.warn('No app icon loaded - using default Electron icon');
  }
  
  // Initialize database
  await initDB();
  
  // Create system tray
  createTray();
  
  // Setup auto-updater (only in production)
  if (app.isPackaged) {
    setupAutoUpdater();
  }
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

  ipcMain.handle('db:deleteCourse', async (event, courseId) => {
    await deleteCourse(courseId);
  });

  // Auto-updater IPC handlers
  ipcMain.handle('updater:checkForUpdates', async () => {
    if (app.isPackaged) {
      try {
        await autoUpdater.checkForUpdates();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Not available in development' };
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    if (app.isPackaged) {
      autoUpdater.quitAndInstall(false, true);
    }
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
  // On macOS, keep app running even when all windows are closed (tray keeps it alive)
  // On other platforms, quit the app
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up tray on app quit
app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
  }
});
