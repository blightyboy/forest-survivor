'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/** File-backed save API for the packaged / Electron desktop build. */
contextBridge.exposeInMainWorld('forestSave', {
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
contextBridge.exposeInMainWorld('forestDisplay', {
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

/** GitHub release auto-update (packaged builds). */
contextBridge.exposeInMainWorld('forestUpdate', {
  available: true,
  check() {
    return ipcRenderer.invoke('update:check');
  },
  download() {
    return ipcRenderer.invoke('update:download');
  },
  install() {
    return ipcRenderer.invoke('update:install');
  },
  pending() {
    return ipcRenderer.invoke('update:pending');
  },
  onAvailable(cb) {
    ipcRenderer.on('update:available', (_e, info) => cb(info));
  },
  onProgress(cb) {
    ipcRenderer.on('update:progress', (_e, info) => cb(info));
  },
  onReady(cb) {
    ipcRenderer.on('update:ready', (_e, info) => cb(info));
  },
  onError(cb) {
    ipcRenderer.on('update:error', (_e, info) => cb(info));
  },
  onStatus(cb) {
    ipcRenderer.on('update:status', (_e, info) => cb(info));
  },
});
