(function () {
  const TOKEN_KEY = "mm_api_token";
  const API_BASE_URL_KEY = "mm_api_base_url";
  const API_MODEL_KEY = "mm_api_model";
  const API_PROVIDER_KEY = "mm_api_provider";
  const PROMPT_PREFIX = "mm_prompt_override_";

  const DEFAULT_API_BASE_URL = "https://api.deepseek.com/chat/completions";
  const DEFAULT_API_MODEL = "deepseek-reasoner";
  let cameraPermissionPromise = null;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token || "");
    if (window.MMBridge && typeof window.MMBridge.configWrite === "function") {
      window.MMBridge.configWrite({ token: token || "" }).catch(() => {});
    }
  }

  function getApiBaseUrl() {
    return localStorage.getItem(API_BASE_URL_KEY) || DEFAULT_API_BASE_URL;
  }

  function setApiBaseUrl(url) {
    const value = (url || "").trim() || DEFAULT_API_BASE_URL;
    localStorage.setItem(API_BASE_URL_KEY, value);
    if (window.MMBridge && typeof window.MMBridge.configWrite === "function") {
      window.MMBridge.configWrite({ apiBaseUrl: value }).catch(() => {});
    }
  }

  function getApiModel() {
    return localStorage.getItem(API_MODEL_KEY) || DEFAULT_API_MODEL;
  }

  function setApiModel(model) {
    const value = (model || "").trim() || DEFAULT_API_MODEL;
    localStorage.setItem(API_MODEL_KEY, value);
    if (window.MMBridge && typeof window.MMBridge.configWrite === "function") {
      window.MMBridge.configWrite({ apiModel: value }).catch(() => {});
    }
  }

  function getApiProvider() {
    return localStorage.getItem(API_PROVIDER_KEY) || "";
  }

  function setApiProvider(name) {
    const value = (name || "").trim();
    localStorage.setItem(API_PROVIDER_KEY, value);
    if (window.MMBridge && typeof window.MMBridge.configWrite === "function") {
      window.MMBridge.configWrite({ apiProvider: value }).catch(() => {});
    }
  }

  function getPromptOverride(type) {
    return localStorage.getItem(`${PROMPT_PREFIX}${type}`) || "";
  }

  function setPromptOverride(type, prompt) {
    const value = prompt || "";
    localStorage.setItem(`${PROMPT_PREFIX}${type}`, value);
    if (window.MMBridge && typeof window.MMBridge.configWrite === "function") {
      const patch = { prompts: {} };
      patch.prompts[type] = value;
      window.MMBridge.configWrite(patch).catch(() => {});
    }
  }

  function clearPromptOverride(type) {
    localStorage.removeItem(`${PROMPT_PREFIX}${type}`);
    if (window.MMBridge && typeof window.MMBridge.configWrite === "function") {
      const patch = { prompts: {} };
      patch.prompts[type] = "";
      window.MMBridge.configWrite(patch).catch(() => {});
    }
  }

  async function syncFromDesktopConfig() {
    if (!window.MMBridge || typeof window.MMBridge.configRead !== "function") {
      return;
    }

    try {
      const cfg = await window.MMBridge.configRead();
      if (!cfg || typeof cfg !== "object") return;

      if (typeof cfg.token === "string") localStorage.setItem(TOKEN_KEY, cfg.token);
      if (typeof cfg.apiBaseUrl === "string" && cfg.apiBaseUrl) localStorage.setItem(API_BASE_URL_KEY, cfg.apiBaseUrl);
      if (typeof cfg.apiModel === "string" && cfg.apiModel) localStorage.setItem(API_MODEL_KEY, cfg.apiModel);
      if (typeof cfg.apiProvider === "string") localStorage.setItem(API_PROVIDER_KEY, cfg.apiProvider);

      if (cfg.prompts && typeof cfg.prompts === "object") {
        Object.keys(cfg.prompts).forEach((key) => {
          const value = cfg.prompts[key];
          if (typeof value === "string") {
            localStorage.setItem(`${PROMPT_PREFIX}${key}`, value);
          }
        });
      }
    } catch {
      // keep local storage fallback
    }
  }

  function formatTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return String(iso || "");
    return date.toLocaleString("zh-CN", { hour12: false });
  }

  function summarize(text, maxLen) {
    const value = (text || "").replace(/\s+/g, " ").trim();
    if (!value) return "无摘要";
    return value.length > maxLen ? value.slice(0, maxLen) + "..." : value;
  }

  function status(el, text, cls) {
    if (!el) return;
    el.className = "status" + (cls ? ` ${cls}` : "");
    el.textContent = text || "";
  }

  function renderMarkdown(target, text) {
    if (!target) return;
    if (window.marked && typeof window.marked.parse === "function") {
      target.innerHTML = window.marked.parse(text || "");
      return;
    }
    target.textContent = text || "";
  }

  async function chat(options) {
    const token = (options.token || getToken() || "").trim();
    if (!token) throw new Error("请先配置接口密钥");

    const endpoint = (options.endpoint || getApiBaseUrl() || DEFAULT_API_BASE_URL).trim();
    const model = options.model || getApiModel() || DEFAULT_API_MODEL;
    const system = options.system || "";
    const user = options.user || "";
    const isReasoner = /deepseek-reasoner/i.test(String(model));

    const payload = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      stream: false
    };

    if (isReasoner) {
      payload.max_tokens = 64000;
      payload.thinking = { type: "enabled" };
    } else {
      payload.max_tokens = 8192;
      payload.temperature = options.temperature ?? 0.8;
    }

    if (window.MMBridge && typeof window.MMBridge.chat === "function") {
      return window.MMBridge.chat({ token, endpoint, payload });
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`请求失败 ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    if (!content) throw new Error("模型返回为空");
    return content;
  }

  async function ensureCameraPermission(constraints) {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      throw new Error("当前环境不支持摄像头访问");
    }
    if (!cameraPermissionPromise) {
      const requestConstraints = constraints || { video: true, audio: false };
      cameraPermissionPromise = navigator.mediaDevices.getUserMedia(requestConstraints)
        .then((stream) => {
          stream.getTracks().forEach((t) => t.stop());
          return true;
        })
        .catch((err) => {
          cameraPermissionPromise = null;
          throw err;
        });
    }
    return cameraPermissionPromise;
  }

  function ensureAkashic() {
    if (!window.Akashic || typeof window.Akashic.save !== "function") {
      throw new Error("未加载 common/storage.js");
    }
  }

  function saveRecord(record) {
    ensureAkashic();
    return window.Akashic.save(record);
  }

  function getAllRecords() {
    ensureAkashic();
    return window.Akashic.getAll();
  }

  function getRecordsByDate(dateStr) {
    ensureAkashic();
    return window.Akashic.getByDate(dateStr);
  }

  function deleteRecord(id) {
    ensureAkashic();
    window.Akashic.delete(id);
  }

  function clearRecords() {
    ensureAkashic();
    window.Akashic.clear();
  }

  const ready = syncFromDesktopConfig();

  window.MM = {
    ready,
    $, escapeHtml,
    getToken, setToken,
    getApiBaseUrl, setApiBaseUrl,
    getApiModel, setApiModel,
    getApiProvider, setApiProvider,
    getPromptOverride, setPromptOverride, clearPromptOverride,
    formatTime, summarize, status, renderMarkdown,
    chat,
    ensureCameraPermission,
    saveRecord, getAllRecords, getRecordsByDate, deleteRecord, clearRecords
  };
})();
