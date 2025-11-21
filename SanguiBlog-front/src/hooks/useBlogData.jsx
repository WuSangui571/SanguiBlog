import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { fetchSiteMeta, fetchCategories, fetchPosts, fetchPostDetail, fetchComments, createComment, login as apiLogin } from "../api";

const BlogContext = createContext(null);

export const BlogProvider = ({ children }) => {
  const value = useProvideBlog();
  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
};

export const useBlog = () => useContext(BlogContext);

function useProvideBlog() {
  const [meta, setMeta] = useState(null);
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [user, setUser] = useState(null);

  const loadMeta = useCallback(async () => {
    try {
      const res = await fetchSiteMeta();
      const data = res.data || res;
      setMeta(data);
      if (data?.author) setUser(data.author);
    } catch (e) {
      console.warn("load meta failed", e);
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

  const loadPosts = useCallback(async (filters = {}) => {
    try {
      const res = await fetchPosts({ page: 1, size: 20, ...filters });
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
    const data = res.data || res;
    setComments((prev) => [data, ...(prev || [])]);
  }, []);

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
    loadPosts();
  }, [loadCategories, loadMeta, loadPosts]);

  return useMemo(
    () => ({
      meta,
      categories,
      posts,
      article,
      comments,
      user,
      loadPosts,
      loadArticle,
      submitComment,
      doLogin,
      logout,
    }),
    [meta, categories, posts, article, comments, user, loadPosts, loadArticle, submitComment, doLogin, logout]
  );
}
