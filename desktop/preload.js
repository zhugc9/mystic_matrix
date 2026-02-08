const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("MMBridge", {
  isDesktop: true,
  chat(payload) {
    return ipcRenderer.invoke("mm:chat", payload);
  },
  configRead() {
    return ipcRenderer.invoke("mm:config-read");
  },
  configWrite(patch) {
    return ipcRenderer.invoke("mm:config-write", patch);
  }
});
