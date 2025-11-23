const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";

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
export const adminFetchTags = () => request("/admin/tags");
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

  const res = await fetch(`${API_BASE.replace('/api', '')}/api/upload/avatar`, {
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
