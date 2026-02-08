const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

const HOST = "127.0.0.1";
const CONFIG_FILE_NAME = "mystic-config.json";
const DEFAULT_CONFIG = {
  token: "",
  apiBaseUrl: "https://api.deepseek.com/chat/completions",
  apiModel: "deepseek-reasoner",
  prompts: {}
};

let server;
let configFilePath;
let cachedConfig = { ...DEFAULT_CONFIG };

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function safeResolve(base, requestPath) {
  const cleanPath = decodeURIComponent((requestPath || "/").split("?")[0]).replace(/^\/+/, "");
  const relativePath = cleanPath || "index.html";
  const fullPath = path.resolve(base, relativePath);
  if (!fullPath.startsWith(base)) return null;
  return fullPath;
}

function mergeConfig(base, patch) {
  const next = {
    ...base,
    ...patch,
    prompts: {
      ...(base.prompts || {}),
      ...(patch.prompts || {})
    }
  };
  return next;
}

function loadConfigFromDisk() {
  if (!configFilePath) return { ...DEFAULT_CONFIG };
  try {
    if (!fs.existsSync(configFilePath)) {
      return { ...DEFAULT_CONFIG };
    }
    const raw = fs.readFileSync(configFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfigToDisk(config) {
  if (!configFilePath) return;
  const text = JSON.stringify(config, null, 2);
  fs.writeFileSync(configFilePath, text, "utf8");
}

function createStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      try {
        const target = safeResolve(rootDir, req.url);
        if (!target) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }

        let filePath = target;
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }

        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }

        res.writeHead(200, {
          "Content-Type": contentType(filePath),
          "Cache-Control": "no-store"
        });
        fs.createReadStream(filePath).pipe(res);
      } catch (err) {
        res.writeHead(500);
        res.end(`Server error: ${err.message}`);
      }
    });

    srv.on("error", reject);
    srv.listen(0, HOST, () => {
      resolve(srv);
    });
  });
}

function createWindow(url) {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    title: "赛博玄学矩阵",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadURL(url);

  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (!targetUrl.startsWith(url.replace(/\/index\.html$/, ""))) {
      event.preventDefault();
      shell.openExternal(targetUrl);
    }
  });
}

ipcMain.handle("mm:config-read", async () => {
  return cachedConfig;
});

ipcMain.handle("mm:config-write", async (_event, patch) => {
  cachedConfig = mergeConfig(cachedConfig, patch || {});
  saveConfigToDisk(cachedConfig);
  return cachedConfig;
});

ipcMain.handle("mm:chat", async (_event, payload) => {
  const token = String(payload?.token || "").trim();
  if (!token) {
    throw new Error("请先配置接口密钥");
  }

  const endpoint = String(payload?.endpoint || cachedConfig.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl).trim();
  const model = payload?.model || cachedConfig.apiModel || DEFAULT_CONFIG.apiModel;
  const fallback = {
    model,
    messages: [
      { role: "system", content: payload?.system || "" },
      { role: "user", content: payload?.user || "" }
    ],
    stream: false
  };
  const requestPayload = payload?.payload && typeof payload.payload === "object" ? payload.payload : fallback;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`请求失败 ${response.status}: ${text.slice(0, 400)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  if (!content) {
    throw new Error("模型返回为空");
  }

  return content;
});

app.whenReady().then(async () => {
  const ses = require("electron").session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === "media" || permission === "camera" || permission === "microphone") {
      callback(true);
      return;
    }
    callback(false);
  });
  ses.setPermissionCheckHandler((_wc, permission) => {
    if (permission === "media" || permission === "camera" || permission === "microphone") {
      return true;
    }
    return false;
  });

  configFilePath = path.join(app.getPath("userData"), CONFIG_FILE_NAME);
  cachedConfig = loadConfigFromDisk();

  const rootDir = path.resolve(__dirname, "..");
  server = await createStaticServer(rootDir);
  const addr = server.address();
  const appUrl = `http://${HOST}:${addr.port}/index.html`;
  createWindow(appUrl);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(appUrl);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (server) {
    server.close();
  }
});
