import logger from "./utils/logger.js";

// 这是本机测试的 API_BASE
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
// 勿该下面配置，这是专门用于测试部署的 API_BASE
// const API_BASE = "/api";
// const API_BASE = "http://localhost:8080/api";

const deriveApiOrigin = () => {
  if (API_BASE.startsWith("http")) {
    try {
      return new URL(API_BASE).origin.replace(/\/$/, "");
    } catch (e) {
      logger.warn("Invalid VITE_API_BASE, fallback to default origin", e);
    }
  }
  if (import.meta.env.VITE_API_ORIGIN) {
    return import.meta.env.VITE_API_ORIGIN.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return (import.meta.env.VITE_DEV_SERVER_ORIGIN || "http://localhost:8082").replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "http://localhost:8082";
};

export const API_ORIGIN = deriveApiOrigin();
export const ASSET_ORIGIN = (import.meta.env.VITE_ASSET_ORIGIN || API_ORIGIN || "http://localhost:8082").replace(/\/$/, "");

const decodeJwtExp = (token) => {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = normalized.length % 4;
    const padded = padLength ? normalized.padEnd(normalized.length + (4 - padLength), "=") : normalized;
    const json = atob(padded);
    const data = JSON.parse(json);
    return typeof data.exp === "number" ? data.exp * 1000 : null;
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  if (!token) return false;
  const expMs = decodeJwtExp(token);
  if (!expMs) return false;
  return Date.now() >= expMs;
};

const INVALID_STORED_TOKEN_VALUES = new Set(["null", "undefined"]);

const getStoredToken = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("sg_token");
    if (!raw) return null;
    const token = String(raw).trim();
    if (!token) return null;
    if (INVALID_STORED_TOKEN_VALUES.has(token)) {
      localStorage.removeItem("sg_token");
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

const notifyAuthExpired = (detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sg-auth-expired", { detail }));
};

const SILENT_AUTH_PATHS = [
  "/analytics/page-view",
  "/analytics/client-ip",
];

const shouldSilentAuthNotice = (path = "") =>
  SILENT_AUTH_PATHS.some((prefix) => path.startsWith(prefix));

// 仅对“公开读取接口”在 401 时做一次无鉴权重试（GET-only），避免旧 token 影响访客首屏。
const RETRY_NO_AUTH_ON_401_PATHS = [
  "/site/",
  "/site",
  "/posts",
  "/categories",
  "/tags",
  "/about",
  "/comments",
];

const shouldRetryNoAuthOn401 = (path = "") =>
  RETRY_NO_AUTH_ON_401_PATHS.some((prefix) => path.startsWith(prefix));

const buildHeaders = () => {
  const token = getStoredToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const ANALYTICS_REFERRER_HEADER = "X-SG-Referrer";
const ANALYTICS_SOURCE_LABEL_HEADER = "X-SG-Source-Label";
const SG_PREV_URL_KEY = "sg_prev_url";
const SG_PREV_URL_TS_KEY = "sg_prev_url_ts";
const SG_PREV_URL_MAX_AGE_MS = 15000;

const safeTrim = (value, maxLen) => {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (!v) return "";
  return v.length > maxLen ? v.slice(0, maxLen) : v;
};

const takeSpaPrevUrl = () => {
  if (typeof window === "undefined") return "";
  try {
    const url = window.sessionStorage.getItem(SG_PREV_URL_KEY) || "";
    const tsStr = window.sessionStorage.getItem(SG_PREV_URL_TS_KEY) || "";
    window.sessionStorage.removeItem(SG_PREV_URL_KEY);
    window.sessionStorage.removeItem(SG_PREV_URL_TS_KEY);

    const ts = Number(tsStr);
    if (!url || !Number.isFinite(ts)) return "";
    if (Date.now() - ts > SG_PREV_URL_MAX_AGE_MS) return "";
    return url;
  } catch {
    return "";
  }
};

const classifyInternalSourceLabel = (pathname = "/") => {
  const path = pathname || "/";
  if (path === "/" || path === "") return "来自首页";
  if (path.startsWith("/admin")) return "来自后台页面";
  if (path.startsWith("/archive")) return "来自归档页";
  if (path.startsWith("/article")) return "来自站内文章";
  if (path.startsWith("/tools") || path.startsWith("/games")) return "来自工具页";
  if (path.startsWith("/about")) return "来自关于页";
  if (path.startsWith("/login")) return "来自登录页";
  return `来自站内：${path}`;
};

const buildAnalyticsReferrerHeaders = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {};
  }

  const prevUrl = takeSpaPrevUrl();
  const docReferrer = document.referrer || "";
  const referrer = safeTrim(prevUrl || docReferrer, 900);

  const headers = {};
  if (referrer) {
    headers[ANALYTICS_REFERRER_HEADER] = referrer;
  }

  // 站内跳转由前端给出中文来源；外部来源（尤其搜索引擎）交给后端解析关键词并展示
  if (prevUrl) {
    try {
      const parsed = new URL(prevUrl);
      const currentOrigin = window.location?.origin || "";
      if (currentOrigin && parsed.origin === currentOrigin) {
        const label = safeTrim(classifyInternalSourceLabel(parsed.pathname), 200);
        if (label) {
          headers[ANALYTICS_SOURCE_LABEL_HEADER] = label;
        }
      }
    } catch {
      // ignore
    }
  }

  return headers;
};

const request = async (path, options = {}) => {
  const token = getStoredToken();
  if (isTokenExpired(token)) {
    localStorage.removeItem("sg_token");
    notifyAuthExpired({ reason: "token_expired", status: 401, message: "登录已过期" });

    // 公开读取接口：即使 token 过期，也应该允许“以访客身份”继续请求，避免首屏报错需要手动刷新。
    const method = String(options?.method || "GET").toUpperCase();
    const canProceedAsGuest = method === "GET" && shouldRetryNoAuthOn401(path);
    if (!canProceedAsGuest) {
      const expiredError = new Error("登录已过期，请重新登录");
      expiredError.status = 401;
      throw expiredError;
    }
  }
  const mergedHeaders = {
    ...buildHeaders(),
    ...(options && options.headers ? options.headers : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });
  if (!res.ok) {
    const txt = await res.text();
    let payload = null;
    let message = txt || res.statusText;
    if (txt) {
      try {
        payload = JSON.parse(txt);
        if (payload && typeof payload === "object") {
          message = payload.message || payload.msg || message;
        }
      } catch {
        // ignore JSON parse errors, fallback to raw text
      }
    }
    const error = new Error(message || res.statusText);
    error.status = res.status;
    if (payload) error.payload = payload;

    // 关键修复：当本地残留旧 token（或非法值）导致公开接口首次访问 401 时，先清理 token 再通知会话失效，避免“第一次打开就提示登录过期”，并让后续请求可自愈。
    if (res.status === 401) {
      const hadToken = Boolean(token);
      if (hadToken) {
        localStorage.removeItem("sg_token");
      }
      if (!shouldSilentAuthNotice(path)) {
        notifyAuthExpired({ reason: "unauthorized", status: 401, message });
      }
      // 对公开接口做一次无鉴权重试（GET-only 且本次请求携带过 token），避免用户手动刷新才能看到文章列表
      const method = String(options?.method || "GET").toUpperCase();
      const canRetry = method === "GET" && shouldRetryNoAuthOn401(path);
      if (hadToken && canRetry && !options.__sgRetriedNoAuth) {
        return request(path, { ...options, __sgRetriedNoAuth: true });
      }
    } else if (res.status === 403 && !getStoredToken()) {
      notifyAuthExpired({ reason: "forbidden_no_token", status: 403, message });
    }
    throw error;
  }
  return res.json();
};

export const fetchSiteMeta = () => request(`/site/meta?t=${Date.now()}`);

export const fetchCategories = () => request("/categories/tree");

export const fetchTags = () => request("/tags");
export const adminFetchTags = (params = {}) => {
  const search = new URLSearchParams();
  if (params.keyword) search.append("keyword", params.keyword);
  if (params.page) search.append("page", params.page);
  if (params.size) search.append("size", params.size);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/admin/tags${query}`);
};
export const adminCreateTag = (payload) =>
  request("/admin/tags", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const adminUpdateTag = (id, payload) =>
  request(`/admin/tags/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const adminDeleteTag = (id) =>
  request(`/admin/tags/${id}`, {
    method: "DELETE",
  });

export const adminFetchCategories = (params = {}) => {
  const search = new URLSearchParams();
  if (params.keyword) search.append("keyword", params.keyword);
  if (params.parentId !== undefined && params.parentId !== null) search.append("parentId", params.parentId);
  if (params.page) search.append("page", params.page);
  if (params.size) search.append("size", params.size);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/admin/categories${query}`);
};

export const adminCreateCategory = (payload) =>
  request("/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const adminUpdateCategory = (id, payload) =>
  request(`/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const adminDeleteCategory = (id) =>
  request(`/admin/categories/${id}`, {
    method: "DELETE",
  });

export const adminFetchPosts = (params = {}) => {
  const search = new URLSearchParams();
  if (params.keyword) search.append("keyword", params.keyword);
  if (params.categoryId) search.append("categoryId", params.categoryId);
  if (params.page) search.append("page", params.page);
  if (params.size) search.append("size", params.size);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/admin/posts${query}`);
};

export const adminFetchPostDetail = (id) => request(`/admin/posts/${id}`);

export const adminFetchPostSiblings = (id) => request(`/admin/posts/${id}/siblings`);

export const adminUpdatePost = (id, payload) =>
  request(`/admin/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const fetchPosts = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.append(k, v);
  });
  return request(`/posts?${search.toString()}`);
};

export const fetchArchiveSummary = () => request("/posts/archive/summary");

export const fetchArchiveMonth = (year, month, params = {}) => {
  const search = new URLSearchParams();
  if (year) search.append("year", year);
  if (month) search.append("month", month);
  if (params.page) search.append("page", params.page);
  if (params.size) search.append("size", params.size);
  return request(`/posts/archive/month?${search.toString()}`);
};

export const fetchPostDetail = (id) =>
  request(`/posts/${id}`, {
    headers: buildAnalyticsReferrerHeaders(),
  });

export const fetchPostNeighbors = (id) => request(`/posts/${id}/neighbors`);

export const login = (username, password, captcha) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password, captcha }),
  });

export const fetchCurrentUser = () => request("/auth/me");

export const fetchComments = (postId) => request(`/posts/${postId}/comments`);

export const fetchRecentComments = (size = 5) => {
  const search = new URLSearchParams();
  if (size) search.append("size", size);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/comments/recent${query}`);
};

export const fetchUnreadNotifications = (limit = 20) => {
  const search = new URLSearchParams();
  if (limit) search.append("limit", limit);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/notifications/unread${query}`);
};

export const markNotificationRead = (id) =>
  request(`/notifications/${id}/read`, {
    method: "POST",
  });

export const markAllNotificationsRead = () =>
  request("/notifications/read-all", {
    method: "POST",
  });

export const fetchNotificationHistory = (page = 1, size = 10) => {
  const search = new URLSearchParams();
  if (page) search.append("page", page);
  if (size) search.append("size", size);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/notifications/history${query}`);
};

export const backfillNotifications = () =>
  request("/notifications/backfill", {
    method: "POST",
  });

export const fetchLoginCaptcha = (force = false) => {
  const query = force ? "?force=true" : "";
  return request(`/auth/captcha${query}`);
};

// About 单页
export const fetchAbout = () => request("/about");
export const adminFetchAbout = () => request("/admin/about");
export const adminSaveAbout = (payload) =>
  request("/admin/about", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const createComment = (postId, payload) =>
  request(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const deleteComment = (postId, commentId) =>
  request(`/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });

export const updateComment = (postId, commentId, content) =>
  request(`/posts/${postId}/comments/${commentId}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });

export const adminFetchComments = (params = {}) => {
  const search = new URLSearchParams();
  if (params.postId) search.append("postId", params.postId);
  if (params.keyword) search.append("keyword", params.keyword);
  if (params.status && params.status !== "ALL") search.append("status", params.status);
  if (params.page) search.append("page", params.page);
  if (params.size) search.append("size", params.size);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/admin/comments${query}`);
};

export const adminUpdateComment = (commentId, payload = {}) =>
  request(`/admin/comments/${commentId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const adminDeleteComment = (commentId) =>
  request(`/admin/comments/${commentId}`, {
    method: "DELETE",
  });

export const updateBroadcast = (payload) =>
  request("/site/broadcast", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const recordPageView = (payload) =>
  request("/analytics/page-view", {
    method: "POST",
    body: JSON.stringify(payload),
  }).catch(() => {
    // swallow tracking errors
  });

export const fetchClientIp = () => request("/analytics/client-ip");

export const updateProfile = (payload) =>
  request("/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const uploadAvatar = async (file) => {
  const token = localStorage.getItem("sg_token");
  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch(`${API_ORIGIN}/api/upload/avatar`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: formData,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
};

export const reservePostAssetsFolder = async (folder) => {
  const token = localStorage.getItem("sg_token");
  const formData = new FormData();
  if (folder) formData.append("folder", folder);
  const res = await fetch(`${API_ORIGIN}/api/upload/post-assets/reserve`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: formData,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
};

export const uploadPostAssets = async (files, folder) => {
  const token = localStorage.getItem("sg_token");
  const formData = new FormData();
  if (folder) formData.append("folder", folder);
  files.forEach((file) => {
    const name = file.webkitRelativePath || file.relativePath || file.name;
    formData.append("files", file, name);
  });
  const res = await fetch(`${API_ORIGIN}/api/upload/post-assets`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: formData,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
};

export const uploadPostCover = async (file, postSlug) => {
  const token = localStorage.getItem("sg_token");
  const formData = new FormData();
  if (postSlug) formData.append("postSlug", postSlug);
  formData.append("file", file);
  const res = await fetch(`${API_ORIGIN}/api/upload/post-cover`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
};

export const createPost = (payload) =>
  request("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updatePost = (id, payload) =>
  request(`/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const adminFetchUsers = (params = {}) => {
  const search = new URLSearchParams();
  if (params.keyword) search.append("keyword", params.keyword);
  if (params.role) search.append("role", params.role);
  if (params.page) search.append("page", params.page);
  if (params.size) search.append("size", params.size);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/admin/users${query}`);
};

export const adminFetchUserDetail = (id) => request(`/admin/users/${id}`);

export const adminCreateUser = (payload) =>
  request("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const adminUpdateUser = (id, payload) =>
  request(`/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const adminDeleteUser = (id) =>
  request(`/admin/users/${id}`, {
    method: "DELETE",
  });

export const adminFetchRoles = () => request("/admin/users/roles");

export const adminFetchAnalyticsSummary = (params = {}) => {
  const search = new URLSearchParams();
  if (params.days) search.append("days", params.days);
  if (params.top) search.append("top", params.top);
  if (params.recent) search.append("recent", params.recent);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/admin/analytics/summary${query}`);
};

export const adminFetchPageViewLogs = (params = {}) => {
  const search = new URLSearchParams();
  if (params.page) search.append("page", params.page);
  if (params.size) search.append("size", params.size);
  if (params.ip) search.append("ip", params.ip);
  if (params.keyword) search.append("keyword", params.keyword);
  if (params.loggedIn === true) search.append("loggedIn", "true");
  if (params.loggedIn === false) search.append("loggedIn", "false");
  if (params.postId) search.append("postId", params.postId);
  if (params.excludeSystemPages === true) search.append("excludeSystemPages", "true");
  if (params.start) search.append("start", params.start);
  if (params.end) search.append("end", params.end);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/admin/analytics/page-views${query}`);
};

export const adminDeletePageViewLog = (id) =>
  request(`/admin/analytics/page-views/${id}`, {
    method: "DELETE",
  });

export const adminDeletePageViewLogs = (ids = []) => {
  const search = new URLSearchParams();
  (ids || []).forEach((id) => {
    if (id !== undefined && id !== null) {
      search.append("ids", id);
    }
  });
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/admin/analytics/page-views${query}`, {
    method: "DELETE",
  });
};

export const adminDeleteMyAnalyticsLogs = () =>
  request("/admin/analytics/page-views/me", {
    method: "DELETE",
  });

export const adminFetchPermissionMatrix = () => request("/admin/permissions");

export const adminUpdateRolePermissions = (roleCode, permissions) =>
  request(`/admin/permissions/${roleCode}`, {
    method: "PUT",
    body: JSON.stringify({ permissions }),
  });

export const fetchMyPermissions = () => request("/permissions/me");

// Maintenance - unused asset cleanup (SUPER_ADMIN)
export const adminScanUnusedAssets = () => request("/admin/maintenance/unused-assets");

export const adminDeleteUnusedAssets = (paths = []) =>
  request("/admin/maintenance/unused-assets/delete", {
    method: "POST",
    body: JSON.stringify({ paths }),
  });

// Maintenance - empty folder cleanup (SUPER_ADMIN)
export const adminScanEmptyFolders = () => request("/admin/maintenance/empty-folders");

export const adminDeleteEmptyFolders = (paths = []) =>
  request("/admin/maintenance/empty-folders/delete", {
    method: "POST",
    body: JSON.stringify({ paths }),
  });

// 游戏 / 自定义 HTML 页面
export const fetchGames = () => request("/games");
export const fetchGameDetail = (id) => request(`/games/${id}`);

export const adminFetchGames = (params = {}) => {
  const search = new URLSearchParams();
  if (params.keyword) search.append("keyword", params.keyword);
  if (params.page) search.append("page", params.page);
  if (params.size) search.append("size", params.size);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request(`/admin/games${query}`);
};

const authFormRequest = async (path, method, formData) => {
  const token = localStorage.getItem("sg_token");
  const res = await fetch(`${API_ORIGIN}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
};

export const adminCreateGame = async ({ title, description, status = "ACTIVE", sortOrder = 0, file }) => {
  const formData = new FormData();
  if (title) formData.append("title", title);
  if (description) formData.append("description", description);
  if (status) formData.append("status", status);
  if (sortOrder !== undefined && sortOrder !== null) formData.append("sortOrder", sortOrder);
  if (file) formData.append("file", file);
  return authFormRequest("/api/admin/games", "POST", formData);
};

export const adminUpdateGame = async (id, { title, description, status, sortOrder, file }) => {
  const formData = new FormData();
  if (title) formData.append("title", title);
  if (description !== undefined) formData.append("description", description ?? "");
  if (status) formData.append("status", status);
  if (sortOrder !== undefined && sortOrder !== null) formData.append("sortOrder", sortOrder);
  if (file) formData.append("file", file);
  return authFormRequest(`/api/admin/games/${id}`, "PUT", formData);
};

export const adminDeleteGame = (id) =>
  request(`/admin/games/${id}`, {
    method: "DELETE",
  });
