import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  fetchSiteMeta,
  fetchCategories,
  fetchTags,
  fetchPosts,
  fetchPostDetail,
  fetchComments,
  fetchRecentComments,
  createComment,
  deleteComment,
  updateComment,
  login as apiLogin,
  fetchCurrentUser,
  fetchAbout,
} from "../api";

const BlogContext = createContext(null);
const HOME_POSTS_PAGE_SIZE = 500;

export const BlogProvider = ({ children }) => {
  const value = useProvideBlog();
  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
};

export const useBlog = () => useContext(BlogContext);

function useProvideBlog() {
  const [meta, setMeta] = useState(null);
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState([]);
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [recentComments, setRecentComments] = useState([]);
  const [about, setAbout] = useState(null);
  const [user, setUser] = useState(null);

  const applyAssetOrigin = useCallback((origin) => {
    if (typeof window === "undefined") return;
    const normalized = origin ? origin.replace(/\/$/, "") : "";
    if (normalized) {
      window.__SG_ASSET_ORIGIN__ = normalized;
    } else if (window.__SG_ASSET_ORIGIN__) {
      delete window.__SG_ASSET_ORIGIN__;
    }
  }, []);

  const loadMeta = useCallback(async () => {
    try {
      const res = await fetchSiteMeta();
      const data = res.data || res;
      setMeta(data);
      applyAssetOrigin(data?.assetBaseUrl);
      // if (data?.author) setUser(data.author);
    } catch (e) {
      console.warn("load meta failed", e);
    }
  }, [applyAssetOrigin]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("sg_token");
    if (!token) return;
    try {
      const res = await import("../api").then(m => m.fetchCurrentUser());
      const data = res.data || res;
      if (data) setUser(data);
    } catch (e) {
      console.warn("restore auth failed", e);
      if (e?.status === 401) {
        localStorage.removeItem("sg_token");
        setUser(null);
      }
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetchCategories();
      const data = res.data || res;
      setCategories([{ id: "all", label: "全部", children: [] }, ...(data || [])]);
    } catch (e) {
      console.warn("load categories failed", e);
    }
  }, []);

  const loadTags = useCallback(async () => {
    try {
      const res = await fetchTags();
      const data = res.data || res;
      setTags(data || []);
    } catch (e) {
      console.warn("load tags failed", e);
    }
  }, []);

  const loadPosts = useCallback(async (filters = {}) => {
    try {
      const res = await fetchPosts({ page: 1, size: HOME_POSTS_PAGE_SIZE, ...filters });
      const data = res.data || res;
      setPosts(data?.records || []);
    } catch (e) {
      console.warn("load posts failed", e);
    }
  }, []);

  const loadComments = useCallback(async (postId) => {
    try {
      const res = await fetchComments(postId);
      const data = res.data || res;
      setComments(data || []);
    } catch (e) {
      console.warn("load comments failed", e);
    }
  }, []);

  const loadRecentComments = useCallback(async (size = 5) => {
    try {
      const res = await fetchRecentComments(size);
      const data = res.data || res;
      setRecentComments(data || []);
    } catch (e) {
      console.warn("load recent comments failed", e);
    }
  }, []);

  const loadAbout = useCallback(async () => {
    try {
      const res = await fetchAbout();
      const data = res.data || res;
      setAbout(data || null);
    } catch (e) {
      console.warn("load about failed", e);
      setAbout(null);
    }
  }, []);

  const loadArticle = useCallback(async (id) => {
    setArticle(null);
    setComments([]);
    try {
      const res = await fetchPostDetail(id);
      const data = res.data || res;
      setArticle(data);
      await loadComments(id);
    } catch (e) {
      console.warn("load article failed", e);
      throw e;
    }
  }, [loadComments]);

  const submitComment = useCallback(async (postId, payload) => {
    const res = await createComment(postId, payload);
    await loadComments(postId);
    await loadRecentComments();
    return res.data || res;
  }, [loadComments, loadRecentComments]);

  const removeComment = useCallback(async (postId, commentId) => {
    await deleteComment(postId, commentId);
    await loadComments(postId);
    await loadRecentComments();
  }, [loadComments, loadRecentComments]);

  const editComment = useCallback(async (postId, commentId, content) => {
    const res = await updateComment(postId, commentId, content);
    await loadComments(postId);
    await loadRecentComments();
    return res.data || res;
  }, [loadComments, loadRecentComments]);

  const doLogin = useCallback(async (username, password) => {
    const res = await apiLogin(username, password);
    const data = res.data || res;
    if (data?.token) localStorage.setItem("sg_token", data.token);
    if (data?.user) setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("sg_token");
    setUser(null);
  }, []);

  useEffect(() => {
    loadMeta();
    loadCategories();
    loadTags();
    loadPosts();
    loadRecentComments();
    loadAbout();
    checkAuth();
  }, [loadCategories, loadTags, loadMeta, loadPosts, loadRecentComments, loadAbout, checkAuth]);

  return useMemo(
    () => ({
      meta,
      categories,
      tags,
      posts,
      article,
      comments,
       recentComments,
      about,
      user,
      loadPosts,
      loadArticle,
      submitComment,
      removeComment,
      editComment,
      loadRecentComments,
      loadAbout,
      doLogin,
      logout,
    }),
    [meta, categories, tags, posts, article, comments, recentComments, about, user, loadPosts, loadArticle, submitComment, removeComment, editComment, loadRecentComments, loadAbout, doLogin, logout]
  );
}
