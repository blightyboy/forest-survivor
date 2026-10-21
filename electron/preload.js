'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/** File-backed save API for the packaged / Electron desktop build. */
contextBridge.exposeInMainWorld('jungleSave', {
  load() {
    return ipcRenderer.sendSync('save:load');
  },
  save(data) {
    return ipcRenderer.sendSync('save:write', data);
  },
  path() {
    return ipcRenderer.sendSync('save:path');
  },
  quit() {
    ipcRenderer.send('app:quit');
  },
});

/** Display / window controls (Electron only). */
contextBridge.exposeInMainWorld('jungleDisplay', {
  list() {
    return ipcRenderer.sendSync('display:list');
  },
  get() {
    return ipcRenderer.sendSync('display:get');
  },
  apply(settings) {
    return ipcRenderer.sendSync('display:apply', settings);
  },
  available: true,
});
