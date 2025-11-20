import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  getCourses: () => ipcRenderer.invoke('db:getCourses'),
  getCourse: (courseId) => ipcRenderer.invoke('db:getCourse', courseId),
  saveProgress: (data) => ipcRenderer.invoke('db:saveProgress', data),
  getSetting: (key) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (data) => ipcRenderer.invoke('db:setSetting', data),
  resetVideoProgress: (videoId) => ipcRenderer.invoke('db:resetVideoProgress', videoId),
  resetCourseProgress: (courseId) => ipcRenderer.invoke('db:resetCourseProgress', courseId),
  markVideoComplete: (data) => ipcRenderer.invoke('db:markVideoComplete', data),
  deleteCourse: (courseId) => ipcRenderer.invoke('db:deleteCourse', courseId),
  // Auto-updater API
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, data) => callback(data)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', () => callback()),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, data) => callback(data)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (_event, data) => callback(data)),
});
