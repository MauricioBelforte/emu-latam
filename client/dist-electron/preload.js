"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: (channel, data) => electron.ipcRenderer.invoke(channel, data),
    on: (channel, func) => {
      electron.ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
