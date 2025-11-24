const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

const buildHeaders = () => {
  const token = localStorage.getItem("sg_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const request = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders(),
    ...options,
  });
  if (!res.ok) {
    const txt = await res.text();
    const error = new Error(txt || res.statusText);
    error.status = res.status;
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

export const login = (username, password) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const fetchCurrentUser = () => request("/auth/me");

export const fetchComments = (postId) => request(`/posts/${postId}/comments`);

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

export const createPost = (payload) =>
  request("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
