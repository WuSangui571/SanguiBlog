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
    throw new Error(txt || res.statusText);
  }
  return res.json();
};

export const fetchSiteMeta = () => request("/site/meta");

export const fetchCategories = () => request("/categories/tree");

export const fetchTags = () => request("/tags");

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

export const fetchComments = (postId) => request(`/posts/${postId}/comments`);

export const createComment = (postId, payload) =>
  request(`/posts/${postId}/comments`, {
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
