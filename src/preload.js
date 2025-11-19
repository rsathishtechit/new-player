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
});
