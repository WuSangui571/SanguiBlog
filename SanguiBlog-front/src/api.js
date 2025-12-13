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
      console.warn("Invalid VITE_API_BASE, fallback to default origin", e);
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
    const json = atob(normalized);
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

const buildHeaders = () => {
  const token = localStorage.getItem("sg_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const request = async (path, options = {}) => {
  const token = localStorage.getItem("sg_token");
  if (isTokenExpired(token)) {
    localStorage.removeItem("sg_token");
    const expiredError = new Error("登录已过期，请重新登录");
    expiredError.status = 401;
    throw expiredError;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders(),
    ...options,
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

export const fetchPostDetail = (id) => request(`/posts/${id}`);

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
