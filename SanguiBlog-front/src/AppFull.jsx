import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useBlog } from "./hooks/useBlogData";
import { recordPageView, updateBroadcast } from "./api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion';
import AdminProfile from './pages/admin/Profile';
import {
  Code, User, Heart, MessageSquare, Share2, X, Menu, ChevronRight,
  Search, LogIn, LogOut, Settings, Eye, Github, Twitter,
  BarChart3, Filter, Tag, AlertTriangle, MessageCircle,
  Layers, Hash, Clock, FileText, Terminal, Zap, Sparkles,
  ArrowUpRight, Grid, List, Activity, ChevronLeft, Shield, Lock, Users,
  Home, TrendingUp, Edit, Send, Moon, Sun, Upload, Map, ArrowUp, BookOpen, CheckCircle, PenTool
} from 'lucide-react';

// ... (keep existing code until CommentsSection)

const CommentsSection = ({ list = [], isDarkMode, onSubmit, currentUser, setView, onDeleteComment, onUpdateComment, postAuthorName }) => {
  const [content, setContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyContent, setReplyContent] = useState("");

  const inputBg = isDarkMode ? 'bg-gray-800 text-white' : 'bg-[#F0F0F0] text-black';
  const commentBg = isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-black';
  const resolvedAuthorName = currentUser?.displayName || currentUser?.nickname || currentUser?.username || '访客';
  const resolvedAvatar = currentUser?.avatarUrl || currentUser?.avatar;
  const normalizedList = Array.isArray(list) ? list : [];

  const countAll = (items = []) => items.reduce((sum, item) => sum + 1 + countAll(item.replies || []), 0);
  const totalComments = countAll(normalizedList);

  const getAvatarSrc = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) return avatarPath;
    return `http://localhost:8080${avatarPath}`;
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit && onSubmit({
      authorName: resolvedAuthorName,
      avatarUrl: resolvedAvatar,
      content: content.trim(),
    });
    setContent("");
  };

  const handleReplySubmit = () => {
    if (!replyTarget || !replyContent.trim()) return;
    onSubmit && onSubmit({
      authorName: resolvedAuthorName,
      avatarUrl: resolvedAvatar,
      content: replyContent.trim(),
      parentId: replyTarget.comment.id,
    });
    setReplyContent("");
    setReplyTarget(null);
  };

  const renderComment = (c, depth = 0) => {
    const replies = Array.isArray(c.replies) ? c.replies : [];
    const avatarSrc = getAvatarSrc(c.avatar);
    const isReplying = replyTarget?.comment?.id === c.id;
    const canReply = depth < 1;

    return (
      <div key={c.id || `${depth}-${c.authorName}`} className={`flex gap-4 ${depth > 0 ? 'ml-8 border-l-2 border-dashed border-black/30 pl-6' : ''}`}>
        <div className={`w-12 h-12 border-2 border-black rounded-full shrink-0 flex items-center justify-center font-bold overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-200 text-black'}`}>
          {avatarSrc ? (
            <img src={avatarSrc} alt={c.authorName} className="w-full h-full object-cover" />
          ) : (
            (c.authorName || c.user || 'U').toString().slice(0, 2)
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className="font-black text-lg">{c.authorName || c.user}</span>
            {postAuthorName && (c.authorName === postAuthorName || c.user === postAuthorName) && (
              <span className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-black border border-black rounded shadow-[2px_2px_0px_0px_#000] ${isDarkMode ? 'bg-pink-600 text-white' : 'bg-yellow-400 text-black'}`}>
                <PenTool size={10} strokeWidth={3} />
                博主
              </span>
            )}
            <span className="text-xs font-bold text-gray-500">{c.time || ''}</span>
            <div className="ml-auto flex gap-2">
              {currentUser && canReply && (
                <button
                  onClick={() => {
                    setReplyTarget({ comment: c, depth });
                    setReplyContent("");
                  }}
                  className={`text-xs font-bold px-2 py-1 border-2 border-black transition-colors ${isDarkMode ? 'hover:bg-purple-500 hover:text-white' : 'hover:bg-purple-100'}`}
                >
                  回复
                </button>
              )}
              {currentUser && c.userId === currentUser.id && (
                <>
                  <button
                    onClick={() => {
                      setEditingCommentId(c.id);
                      setEditContent(c.content);
                    }}
                    className={`text-xs font-bold px-2 py-1 border-2 border-black transition-colors ${isDarkMode ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-blue-100'}`}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(c.id)}
                    className={`text-xs font-bold px-2 py-1 border-2 border-black transition-colors ${isDarkMode ? 'hover:bg-red-500 hover:text-white' : 'hover:bg-red-100'}`}
                  >
                    删除
                  </button>
                </>
              )}
            </div>
          </div>
          {editingCommentId === c.id ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={`w-full p-2 border-2 border-black ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onUpdateComment && onUpdateComment(c.id, editContent);
                    setEditingCommentId(null);
                  }}
                  className="px-3 py-1 bg-green-500 text-white font-bold border-2 border-black"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingCommentId(null)}
                  className="px-3 py-1 bg-gray-500 text-white font-bold border-2 border-black"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className={`${commentBg} border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000]`}>
              <p className="font-medium">{c.content || c.text}</p>
            </div>
          )}

          {deleteConfirm === c.id && (
            <div className={`mt-2 p-3 border-2 border-red-500 ${isDarkMode ? 'bg-red-900' : 'bg-red-50'}`}>
              <p className="font-bold text-sm mb-2">确认删除这条评论？</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onDeleteComment && onDeleteComment(c.id);
                    setDeleteConfirm(null);
                  }}
                  className="px-3 py-1 bg-red-500 text-white font-bold border-2 border-black text-xs"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3 py-1 bg-gray-500 text-white font-bold border-2 border-black text-xs"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {isReplying && currentUser && (
            <div className={`mt-4 border-2 border-black p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className={`w-full p-3 border-2 border-black font-bold focus:outline-none min-h-[100px] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                placeholder={`回复 ${c.authorName || c.user || 'Ta'}...`}
              />
              <div className="flex gap-2 mt-2">
                <PopButton onClick={handleReplySubmit}>发送回复</PopButton>
                <button
                  onClick={() => {
                    setReplyTarget(null);
                    setReplyContent("");
                  }}
                  className="px-3 py-1 border-2 border-black font-bold shadow-[2px_2px_0px_0px_#000] bg-gray-200"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {replies.length > 0 && (
            <div className="mt-6 space-y-6">
              {replies.map((child) => renderComment(child, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-16">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare size={28} className="text-black dark:text-white" strokeWidth={3} />
        <h2 className="text-3xl font-black uppercase">Comments ({totalComments})</h2>
      </div>

      {currentUser ? (
        <div className={`${inputBg} border-2 border-black p-6 mb-12 shadow-[8px_8px_0px_0px_#000]`}>
          <div className="flex gap-4 mb-4">
            <div className={`w-12 h-12 border-2 border-black ${commentBg} rounded-full flex items-center justify-center font-bold overflow-hidden`}>
              {resolvedAvatar ? (
                <img src={resolvedAvatar.startsWith('http') ? resolvedAvatar : `http://localhost:8080${resolvedAvatar}`} alt={currentUser.username} className="w-full h-full object-cover" />
              ) : (
                currentUser.username?.slice(0, 2) || 'ME'
              )}
            </div>
            <div className="flex-1">
              <textarea
                placeholder="写下你的想法..."
                className={`w-full min-h-[120px] p-4 border-2 border-black font-bold focus:outline-none focus:ring-4 focus:ring-[#FFD700] transition-shadow ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              ></textarea>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm font-bold flex-wrap gap-4">
            <span className="uppercase tracking-wide">{resolvedAuthorName} 已登录</span>
            <PopButton onClick={handleSubmit}>发布评论</PopButton>
          </div>
        </div>
      ) : (
        <div className={`${inputBg} border-2 border-black p-6 mb-12 shadow-[8px_8px_0px_0px_#000] flex flex-col md:flex-row items-center justify-between gap-4`}>
          <div>
            <p className="font-black text-lg">登录后参与讨论</p>
            <p className="text-sm text-gray-500 font-mono">SIGN IN TO LEAVE A TRAIL.</p>
          </div>
          <PopButton onClick={() => setView('login')} icon={LogIn}>前往登录</PopButton>
        </div>
      )}

      <div className="space-y-8">
        {normalizedList.map((comment) => renderComment(comment))}
      </div>
    </div>
  );
};

const ArticleDetail = ({ id, setView, isDarkMode, articleData, commentsData, onSubmitComment, onDeleteComment, onUpdateComment, currentUser, onCategoryClick }) => {
  const summary = articleData?.summary;

  // The backend returns a PostDetailDto which contains a 'summary' field (PostSummaryDto).
  // We should prioritize using 'summary' as the source of post metadata.
  const postSource = summary || MOCK_POSTS.find(p => p.id === id) || MOCK_POSTS[0];

  const post = {
    ...postSource,
    // Ensure fallback for fields that might be missing or named differently in Mock vs API
    authorName: postSource.authorName || postSource.author || 'Unknown',
    authorAvatar: postSource.authorAvatar || postSource.avatar,
    // PostSummaryDto does not have 'authorTitle', so we default it. 
    // If needed, we would need to update the backend DTO.
    authorTitle: postSource.authorTitle || '博主',
    date: postSource.date || (postSource.publishedAt ? new Date(postSource.publishedAt).toLocaleDateString() : 'Recently'),
    views: postSource.views || postSource.viewsCount || 0,
    color: postSource.color || postSource.themeColor || 'shadow-[8px_8px_0px_0px_#000]',
  };

  const contentHtml = articleData?.contentHtml;
  const contentMd = articleData?.contentMd;
  const comments = commentsData && commentsData.length ? commentsData : [];
  const text = isDarkMode ? 'text-gray-100' : 'text-black';
  const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;

  const quoteBg = isDarkMode ? 'bg-gray-800' : 'bg-[#FFFAF0]';
  const quoteText = isDarkMode ? 'text-gray-300' : 'text-black';
  const codeBlockBg = isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900';
  const inlineCodeBg = isDarkMode ? 'bg-gray-800 text-pink-200' : 'bg-gray-100 text-pink-600';
  const proseClass = `prose prose-xl prose-headings:font-black prose-p:font-medium max-w-none prose-code:before:content-none prose-code:after:content-none ${isDarkMode ? 'prose-invert' : ''}`;
  const shouldRenderMarkdown = Boolean(contentMd && contentMd.trim());

  const handleCommentSubmit = (payload) => {
    onSubmitComment && onSubmitComment(payload);
  };

  const [showShareToast, setShowShareToast] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    });
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return MOCK_USER.avatar;
    if (avatarPath.startsWith('http')) return avatarPath;

    // Ensure it starts with /
    let cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;

    // Fix for legacy static avatars: if it's not in /uploads/ or /avatar/, prepend /avatar
    // This handles DB values like "/sangui.jpg" -> "/avatar/sangui.jpg"
    if (!cleanPath.startsWith('/uploads/') && !cleanPath.startsWith('/avatar/')) {
      cleanPath = `/avatar${cleanPath}`;
    }

    return `http://localhost:8080${cleanPath}`;
  };

  const avatarSrc = getAvatarUrl(post.authorAvatar);

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className={`min-h-screen pt-24 px-4 md:px-0 pb-20 ${surface} ${text}`}>
      {/* Share Toast Notification */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-24 left-1/2 z-[60] px-6 py-3 border-2 border-black shadow-[4px_4px_0px_0px_#000] flex items-center gap-3 ${isDarkMode ? 'bg-green-600 text-white' : 'bg-green-400 text-black'}`}
          >
            <CheckCircle size={24} strokeWidth={3} />
            <span className="font-black text-lg">链接已复制！</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Back Button - Aligned with article content */}
      <div className="fixed top-24 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-4xl mx-auto px-4 md:px-0 relative">
          <motion.button
            onClick={() => setView('home')}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            className={`pointer-events-auto absolute -left-6 md:-left-40 px-4 py-2 font-black border-2 border-black shadow-[4px_4px_0px_0px_#000] transition-all hover:shadow-[6px_6px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
          >
            <div className="flex items-center gap-2">
              <ChevronRight size={20} className="rotate-180" />
              <span>返回首页</span>
            </div>
          </motion.button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">

        <div className={`border-4 border-black shadow-[12px_12px_0px_0px_#000] p-8 md:p-12 ${surface} relative overflow-hidden`}>
          <div className={`absolute top-0 right-0 w-64 h-64 ${post.color} rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none`}></div>

          <div className={`flex items-center gap-2 mb-6 border-b-4 ${isDarkMode ? 'border-gray-700' : 'border-black'} pb-6`}>
            <span
              onClick={() => onCategoryClick && onCategoryClick(post.parentCategory)}
              className={`bg-black text-white px-3 py-1 font-bold text-sm cursor-pointer transition-transform hover:scale-105 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'hover:bg-gray-800'}`}
            >{post.parentCategory}</span>
            <ChevronRight size={16} className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={3} />
            <span
              onClick={() => onCategoryClick && onCategoryClick(post.parentCategory, post.category)}
              className={`px-3 py-1 font-bold text-sm border-2 border-black ${post.color} text-white shadow-[2px_2px_0px_0px_#000] cursor-pointer transition-transform hover:scale-105`}
            >{post.category}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">{post.title}</h1>

          {/* Article Meta: Date, Reading Time, Word Count */}
          <div className="flex flex-wrap items-center gap-4 mb-8 text-sm font-bold text-gray-500">
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>{post.date}</span>
            </div>
            {articleData?.readingTime && (
              <div className="flex items-center gap-1">
                <BookOpen size={16} />
                <span>{articleData.readingTime}</span>
              </div>
            )}
            {articleData?.wordCount && (
              <div className="flex items-center gap-1">
                <FileText size={16} />
                <span>{articleData.wordCount} 字</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye size={16} />
              <span>{post.views} 阅读</span>
            </div>
          </div>

          <div className={`flex items-center justify-between p-4 border-2 border-black mb-12 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border-2 border-black rounded-full bg-white overflow-hidden flex items-center justify-center">
                <img
                  src={avatarSrc}
                  alt={post.authorName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = MOCK_USER.avatar;
                  }}
                />
              </div>
              <div>
                <p className="font-black text-lg leading-none">{post.authorName}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] ${isDarkMode ? 'bg-pink-600 text-white' : 'bg-yellow-400 text-black'}`}>
                  {post.authorTitle ? post.authorTitle.toUpperCase() : '博主'}
                </span>
              </div>
            </div>

            <button
              onClick={handleShare}
              className={`p-2 border-2 border-black shadow-[4px_4px_0px_0px_#000] transition-all hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-black'}`}
              title="复制链接"
            >
              <Share2 size={20} />
            </button>
          </div>

          <article className={proseClass}>
            <div className={`p-6 border-l-8 border-[#FFD700] font-serif italic text-xl mb-8 ${quoteBg} ${quoteText}`}>
              {post.excerpt}
            </div>
            {shouldRenderMarkdown ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={{
                  pre: ({ children }) => <>{children}</>,
                  code({ inline, className, children, ...props }) {
                    const rawText = String(children);
                    const textContent = rawText.replace(/\n$/, '');
                    const hasLanguage = typeof className === 'string' && className.includes('language-');
                    const isMultiline = textContent.includes('\n');
                    const shouldInline = inline ?? (!hasLanguage && !isMultiline);
                    if (shouldInline) {
                      const backtickCount = (textContent.match(/`/g) || []).length;
                      if (backtickCount > 0 && backtickCount % 2 === 0) {
                        const parts = textContent.split('`');
                        return (
                          <>
                            {parts.map((part, i) => {
                              if (i % 2 === 0) {
                                return <code key={i} className={`px-1 py-0.5 rounded font-mono text-sm ${inlineCodeBg}`} {...props}>{part}</code>;
                              } else {
                                return <span key={i}>{part}</span>;
                              }
                            })}
                          </>
                        );
                      }
                      return (
                        <code
                          className={`px-1 py-0.5 rounded font-mono text-sm ${inlineCodeBg}`}
                          {...props}
                        >
                          {textContent}
                        </code>
                      );
                    }
                    return (
                      <div className={`not-prose my-6 rounded-lg border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'border-gray-600 shadow-none' : ''}`}>
                        <div className={`flex items-center gap-2 px-4 py-2 border-b-2 border-black ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-[#F0F0F0]'}`}>
                          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/20"></div>
                          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/20"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/20"></div>
                        </div>
                        <pre className={`p-4 overflow-auto m-0 ${isDarkMode ? 'bg-[#1E1E1E] text-gray-200' : 'bg-[#282c34] text-white'}`}>
                          <code className={`${className} !bg-transparent !p-0 !border-none font-mono text-sm`} {...props}>
                            {textContent}
                          </code>
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {contentMd}
              </ReactMarkdown>
            ) : contentHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            ) : (
              <p className="font-semibold">暂无正文内容</p>
            )}
          </article>

          <CommentsSection
            list={comments}
            isDarkMode={isDarkMode}
            onSubmit={handleCommentSubmit}
            currentUser={currentUser}
            setView={setView}
            onDeleteComment={onDeleteComment}
            onUpdateComment={onUpdateComment}
            postAuthorName={post.authorName}
          />
        </div>
      </div>
    </motion.div>
  );
};

// --- 1. 设计系统 & 基础数据 ---
const THEME = {
  colors: {
    bgLight: "bg-[#F0F0F0]",
    surfaceLight: "bg-white",
    bgDark: "bg-[#111827]",
    surfaceDark: "bg-[#1f2937]",
    primary: "bg-[#6366F1]",
    secondary: "bg-[#FFD700]",
    accent: "bg-[#FF0080]",
    dark: "bg-[#1A1A1A]",
    border: "border-2 border-black",
  },
};

// 角色定义
const ROLES = {
  SUPER_ADMIN: { label: "超级管理员", color: "bg-[#FF0080]" },
  ADMIN: { label: "管理员", color: "bg-[#6366F1]" },
  USER: { label: "用户", color: "bg-[#00E096]" }
};

const CATEGORY_TREE = [
  { id: "all", label: "全部", children: [] },
  { id: "programming", label: "硬核编程", children: [{ id: "java", label: "Java Core" }, { id: "frontend", label: "Modern Web" }, { id: "algo", label: "算法进阶" }] },
  { id: "architecture", label: "架构视角", children: [{ id: "cloud", label: "云原生" }, { id: "system", label: "分布式系统" }] },
  { id: "life", label: "数字生活", children: [{ id: "gear", label: "装备控" }, { id: "think", label: "碎碎念" }] }
];

const SITE_STATS = {
  posts: 71,
  comments: 24,
  categories: 11,
  tags: 43,
  views: 1643,
  lastUpdated: "2025/11/17",
  lastUpdatedFull: "2025-11-17 00:00:00"
};

const MOCK_USER = {
  id: 1,
  username: "三桂 SanGui",
  title: "Fullstack Developer",
  bio: "用代码构建现实，用逻辑解构虚无。",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SanGui&backgroundColor=FFD700",
  role: "SUPER_ADMIN",
  social: {
    github: "https://github.com/Wusangui571",
    wechatQr: "/contact/wechat.jpg"
  }
};

const GENERATE_POSTS = () => {
  const base = [
    { id: 101, title: "SpringBoot 3.0: 原生编译的终极奥义", excerpt: "GraalVM AOT.", category: "Java Core", parentCategory: "硬核编程", tags: ["Java", "AOT"], color: "bg-[#6366F1]", likes: 128, comments: 45, date: "2023-11-24", views: 532 },
    { id: 102, title: "Vue3 Composition API: 逻辑复用的艺术", excerpt: "告别 Options API 的面条代码。", category: "Modern Web", parentCategory: "硬核编程", tags: ["Vue3", "Refactor"], color: "bg-[#FF0080]", likes: 89, comments: 12, date: "2023-11-20", views: 321 },
    { id: 103, title: "微服务的一致性困局：Saga 还是 TCC？", excerpt: "分布式事务没有银弹。", category: "Distributed Sys", parentCategory: "架构视角", tags: ["Microservices", "System Design"], color: "bg-[#00E096]", likes: 256, comments: 67, date: "2023-11-15", views: 890 }
  ];

  let posts = [...base];
  for (let i = 0; i < 15; i++) {
    posts.push({
      ...base[i % 3],
      id: 200 + i,
      title: `${base[i % 3].title} (Part ${i + 1})`,
      date: `2023-10-${10 + i}`
    });
  }
  return posts;
};

const MOCK_POSTS = GENERATE_POSTS();
const PAGE_SIZE = 5;

// Mock Data for Analytics
const MOCK_ANALYTICS = {
  totalViews: 158450,
  newUsers: 1200,
  avgTime: 3.5,
  bounceRate: 45,
  recentActivity: [
    { title: "The Future of AI in Web Development", ip: "192.168.1.1", time: "2025-11-21 15:30:12", referrer: "https://google.com", geo: "San Francisco, US" },
    { title: "A Guide to Modern CSS Layouts", ip: "10.0.0.5", time: "2025-11-21 15:28:45", referrer: "https://x.com/techfeed", geo: "Shanghai, CN" },
    { title: "My Favorite Productivity Apps", ip: "203.0.113.20", time: "2025-11-21 15:25:01", referrer: "(Direct)", geo: "London, UK" },
    { title: "SpringBoot 3.0: 原生编译的终极奥义", ip: "203.0.113.20", time: "2025-11-21 15:25:01", referrer: "(Direct)", geo: "London, UK" },
  ],
  trafficSources: [
    { label: "Search Engine", value: 45 },
    { label: "Direct", value: 30 },
    { label: "Social Media", value: 15 },
    { label: "Referrals", value: 10 },
  ]
};

// --- 2. 炫酷 UI 组件库 (不变) ---

const PopButton = ({ children, onClick, variant = "primary", className = "", icon: Icon, ...props }) => {
  const variants = {
    primary: "bg-[#1A1A1A] text-white hover:bg-[#6366F1]",
    secondary: "bg-white text-black hover:bg-[#FFD700]",
    accent: "bg-[#FF0080] text-white hover:bg-[#D10069]",
    ghost: "bg-transparent text-black border-transparent shadow-none hover:bg-black/5"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        relative px-6 py-3 font-black text-sm uppercase tracking-wider
        border-2 border-black transition-colors duration-200 flex items-center gap-2
        ${variants[variant] || variants.primary}
        ${variant !== 'ghost' ? 'shadow-[4px_4px_0px_0px_#000]' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {Icon && <Icon size={18} strokeWidth={3} />}
      {children}
    </motion.button>
  );
};

const TiltCard = ({ children, className = "", onClick }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [0, 1], [5, -5]);
  const rotateY = useTransform(x, [0, 1], [-5, 5]);

  function handleMouse(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width);
    y.set((event.clientY - rect.top) / rect.height);
  }

  return (
    <motion.div
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0.5); y.set(0.5); }}
      style={{ rotateX, rotateY }}
      onClick={onClick}
      className={`
        relative bg-white border-2 border-black p-0 
        shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000] 
        transition-shadow duration-300 cursor-pointer perspective-1000
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

const EmergencyBar = ({ isOpen, content, onClose }) => {
  // ... (EmergencyBar code is kept unchanged)
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-[#FF0080] border-b-4 border-black overflow-hidden relative z-[60]"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between text-white font-bold">
            <div className="flex items-center gap-3 animate-pulse">
              <AlertTriangle size={24} strokeWidth={3} className="text-[#FFD700]" />
              <span className="uppercase tracking-widest">紧急广播 // SYSTEM ALERT</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm hidden md:inline">{content}</span>
              <button onClick={onClose} className="bg-black p-1 hover:rotate-90 transition-transform border border-white"><X size={16} /></button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ErrorToast = ({ error, onClose }) => {
  useEffect(() => {
    if (error) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, onClose]);

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-24 right-4 z-[70] max-w-md"
        >
          <div className="bg-red-500 border-4 border-black shadow-[8px_8px_0px_0px_#000] p-4">
            <div className="flex items-start gap-3 text-white">
              <AlertTriangle size={24} strokeWidth={3} className="flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-black text-lg mb-1">错误 // ERROR</h4>
                <p className="font-bold text-sm">{error}</p>
              </div>
              <button
                onClick={onClose}
                className="bg-black p-1 hover:rotate-90 transition-transform border border-white flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ... (ClickRipple component is kept unchanged for brevity)
const ClickRipple = () => {
  const [ripples, setRipples] = useState([]);
  useEffect(() => {
    const handleClick = (e) => {
      const id = Date.now();
      setRipples(prev => [...prev, { x: e.clientX, y: e.clientY, id }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1000);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          initial={{ width: 0, height: 0, opacity: 0.8, borderWidth: 5 }}
          animate={{ width: 100, height: 100, opacity: 0, borderWidth: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            left: ripple.x,
            top: ripple.y,
            x: '-50%',
            y: '-50%',
            borderColor: ['#6366F1', '#FF0080', '#FFD700'][Math.floor(Math.random() * 3)]
          }}
          className="absolute rounded-full border-solid border-black"
        />
      ))}
    </div>
  );
};

// --- 3. 前台视图组件 (保持不变) ---
const Navigation = ({ user, setView, handleLogout, toggleMenu, isDarkMode, setIsDarkMode }) => {
  const roleInfo = user ? ROLES[user.role] : null;
  const isFrontNav = true; // Use a flag for front-end vs back-end styling

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-between px-4 md:px-8 
        ${isDarkMode ? 'bg-gray-900 border-b-4 border-[#FF0080] text-white' : 'bg-white border-b-4 border-black text-black'}
      `}
    >
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() => setView('home')}
      >
        <div className={`w-12 h-12 ${isDarkMode ? 'bg-[#FF0080] text-white' : 'bg-black text-white'} flex items-center justify-center border-2 border-black group-hover:bg-[#FFD700] group-hover:text-black transition-colors`}>
          <Code size={28} strokeWidth={3} />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tighter leading-none italic">SANGUI</span>
          <span className="text-xs font-bold tracking-widest bg-[#FF0080] text-white px-1">BLOG.OS</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-8">
        {['home', 'archive', 'about'].map((key) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`text-lg font-bold uppercase hover:bg-black hover:text-white px-2 py-1 transition-all decoration-4 underline-offset-4 hover:underline ${isDarkMode ? 'decoration-[#FF0080]' : 'decoration-[#FFD700]'}`}
          >
            {key === 'home' ? '首页' : key === 'archive' ? '归档' : '关于'}
          </button>
        ))}

        {user ? (
          <div className="flex items-center gap-4 pl-6 border-l-4 border-black h-12">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('profile')}>
              <div className="w-10 h-10 border-2 border-black overflow-hidden rounded-full bg-[#FFD700]">
                <img src={user.avatar?.startsWith('http') ? user.avatar : `http://localhost:8080${user.avatar}`} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-black text-sm leading-none">{user.username}</span>
                <span className={`text-[10px] ${roleInfo?.color} text-white px-1 w-max mt-1 font-bold`}>
                  {roleInfo?.label || "USER"}
                </span>
              </div>
            </div>
            {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
              <button onClick={() => setView('admin')} className="p-2 hover:bg-black hover:text-white border-2 border-transparent hover:border-black rounded-full transition-all"><Settings size={20} /></button>
            )}
            <button onClick={handleLogout} className="p-2 hover:text-[#FF0080] transition-colors"><LogOut size={20} /></button>
          </div>
        ) : (
          <PopButton onClick={() => setView('login')} icon={LogIn}>Login</PopButton>
        )}
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2 border-2 border-black rounded-full transition-colors ${isDarkMode ? 'bg-[#FFD700] text-black hover:bg-white' : 'bg-black text-white hover:bg-[#6366F1]'}`}
          title="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <button className="md:hidden p-2 border-2 border-black bg-[#FFD700] shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none" onClick={toggleMenu}>
        <Menu size={24} />
      </button>
    </motion.nav>
  );
};
// ... (Hero, StatsStrip, ArticleList, CommentsSection, ArticleDetail, LoginView components are kept unchanged in functionality, but are wrapped in the main App with the dark mode context.)
const Hero = ({ setView, isDarkMode }) => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const rotate = useTransform(scrollY, [0, 500], [0, 45]);

  const bgClass = isDarkMode ? THEME.colors.bgDark : THEME.colors.bgLight;
  const textClass = isDarkMode ? 'text-white' : 'text-black';
  const gridColor = isDarkMode ? '#374151' : '#000';

  return (
    <div className={`relative min-h-[90vh] flex flex-col justify-center items-center pt-20 overflow-hidden ${bgClass} ${textClass}`}>
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`, backgroundSize: '40px 40px' }}>
      </div>
      <motion.div style={{ y: y1, rotate }} className="absolute top-32 left-[10%] text-[#FFD700]">
        <Sparkles size={80} strokeWidth={1.5} className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] fill-current" />
      </motion.div>
      <motion.div style={{ y: y1, x: -50 }} className="absolute bottom-40 right-[10%] w-32 h-32 border-4 border-black bg-[#00E096] shadow-[8px_8px_0px_0px_#000] z-0 rounded-full flex items-center justify-center font-black text-2xl">
        CODE
      </motion.div>

      <div className="z-10 text-center max-w-5xl px-4 relative">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="inline-block mb-6 bg-black text-white px-6 py-2 text-xl font-mono font-bold transform -rotate-2 shadow-[4px_4px_0px_0px_#FF0080]"
        >
          SANGUI BLOG // V1.1.31
        </motion.div>

        <h1 className={`text-6xl md:text-9xl font-black mb-8 leading-[0.9] tracking-tighter drop-shadow-sm ${textClass}`}>
          <motion.span initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="block">
            用代码记录<span className="text-[#6366F1] underline decoration-8 decoration-black underline-offset-8 ml-4">探索</span>
          </motion.span>
          <motion.span initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="block">
            以分享照亮<span className="text-[#FF0080] bg-[#FFD700] px-2 ml-2 border-4 border-black skew-x-[-10deg] inline-block shadow-[6px_6px_0px_0px_#000]">成长</span>
          </motion.span>
        </h1>
        <p className={`text-xl md:text-2xl font-bold mb-12 max-w-2xl mx-auto border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-[#1f2937] text-gray-300' : 'bg-white text-gray-600'}`}>
          拒绝平庸，在 SpringBoot 与 React 的边缘狂试探。
          <br /><span className="text-sm font-mono text-[#FF0080]">{`>>`} PRESS START TO CONTINUE</span>
        </p>



        <div className="flex flex-wrap gap-6 justify-center">
          <PopButton onClick={() => document.getElementById('posts').scrollIntoView({ behavior: 'smooth' })} icon={ArrowUpRight} className="text-xl px-8 py-4 bg-[#FFD700] text-black">
            START READING
          </PopButton>
          <PopButton variant="secondary" icon={Github} onClick={() => window.open('https://github.com/Wusangui571')} className="text-xl px-8 py-4">
            GITHUB REPO
          </PopButton>
        </div>
      </div>
    </div>
  );
};
// StatsStrip, ArticleList, CommentsSection, ArticleDetail, LoginView are omitted for brevity in the component logic section, but included in the final file.

// --- 4. 后台管理组件 (Admin Panel) ---

// 4.1 Sub-Component: Dashboard View
const DashboardView = ({ isDarkMode }) => {
  const Card = ({ title, value, icon: Icon, color }) => {
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    const subText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

    return (
      <div className={`${surface} ${text} p-6 rounded-lg shadow-xl transition-all duration-300 ${isDarkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold uppercase ${subText}`}>{title}</p>
          <Icon size={24} className={color} />
        </div>
        <div className="mt-4 flex items-end">
          <h2 className="text-4xl font-extrabold">{value}</h2>
          {title === '总浏览量' && <span className="ml-2 text-sm text-green-500">+12% 环比</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card title="总浏览量" value={MOCK_ANALYTICS.totalViews.toLocaleString()} icon={BarChart3} color="text-indigo-500" />
        <Card title="文章总数" value={SITE_STATS.posts} icon={FileText} color="text-pink-500" />
        <Card title="评论总数" value={SITE_STATS.comments} icon={MessageSquare} color="text-green-500" />
        <Card title="活跃用户" value={MOCK_ANALYTICS.newUsers.toLocaleString()} icon={Users} color="text-yellow-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 ${isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight} p-6 rounded-lg shadow-xl ${isDarkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
          <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>近30天流量趋势</h3>
          <div className="h-64 flex items-center justify-center">
            {/* Placeholder for Line Chart */}
            <p className="text-gray-400 font-mono">折线图占位</p>
          </div>
        </div>
        <div className={`lg:col-span-1 ${isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight} p-6 rounded-lg shadow-xl ${isDarkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
          <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>流量来源</h3>
          <div className="space-y-3">
            {MOCK_ANALYTICS.trafficSources.map((source, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{source.label}</span>
                <span className={`font-bold ${index === 0 ? 'text-indigo-500' : 'text-gray-500'}`}>{source.value}%</span>
              </div>
            ))}
          </div>
          <div className="h-32 mt-4 flex items-center justify-center">
            {/* Placeholder for Donut Chart */}
            <p className="text-gray-400 font-mono">环形图占位</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4.2 Sub-Component: Analytics View (Detailed Data)
const AnalyticsView = ({ isDarkMode }) => {
  const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
  const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const headerBg = isDarkMode ? 'bg-gray-700' : 'bg-gray-100';
  const border = isDarkMode ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-indigo-500 flex items-center gap-2"><TrendingUp /> ????</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className={`${surface} p-4 rounded-lg shadow-lg ${border} border`}>
          <p className="text-sm text-gray-500">平均停留时间</p>
          <p className={`text-2xl font-bold ${text}`}>{MOCK_ANALYTICS.avgTime} 分钟</p>
        </div>
        <div className={`${surface} p-4 rounded-lg shadow-lg ${border} border`}>
          <p className="text-sm text-gray-500">跳出率</p>
          <p className={`text-2xl font-bold ${text} ${MOCK_ANALYTICS.bounceRate > 50 ? 'text-red-500' : 'text-green-500'}`}>{MOCK_ANALYTICS.bounceRate}%</p>
        </div>
        <div className={`${surface} p-4 rounded-lg shadow-lg ${border} border`}>
          <p className="text-sm text-gray-500">主要访客区域</p>
          <p className={`text-2xl font-bold ${text} flex items-center gap-2`}><Map size={24} /> USA</p>
        </div>
        <div className={`${surface} p-4 rounded-lg shadow-lg ${border} border`}>
          <p className="text-sm text-gray-500">转化率 (模拟)</p>
          <p className={`text-2xl font-bold ${text}`}>2.1%</p>
        </div>
      </div>

      <div className={`${surface} p-6 rounded-lg shadow-xl ${border} border overflow-x-auto`}>
        <h3 className={`text-xl font-bold mb-4 ${text}`}>近期文章访问日志</h3>
        <table className="min-w-full divide-y divide-gray-200 table-auto">
          <thead>
            <tr className={headerBg}>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${text}`}>文章标题</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${text}`}>访客 IP</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${text}`}>时间戳</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${text}`}>来源 URL</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${text}`}>地理位置</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'} `}>
            {MOCK_ANALYTICS.recentActivity.map((activity, index) => (
              <tr key={index} className={isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${text}`}>{activity.title.substring(0, 30)}...</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${text}`}>{activity.ip}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500`}>{activity.time.split(' ')[1]}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-blue-500`}>
                  <a href={activity.referrer.startsWith('http') ? activity.referrer : '#'} target="_blank" rel="noopener noreferrer">{activity.referrer}</a>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500`}>{activity.geo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 4.3 Sub-Component: Create New Post (The most important module)
const CreatePostView = ({ isDarkMode }) => {
  const [content, setContent] = useState('## Article Title\n\nThis is the content of the article, written in Markdown.');
  const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
  const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const inputClass = `w-full p-3 border-2 rounded-md transition-all ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' : 'bg-white border-gray-300 text-black focus:border-indigo-500'}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Left Column: Editor */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-3xl font-bold text-pink-500 flex items-center gap-2"><Edit /> 创建新文章</h2>

        <input type="text" placeholder="文章标题" className={`${inputClass} text-2xl font-bold`} defaultValue="The Future of Backend Development" />

        <div className={`${surface} p-6 rounded-lg shadow-xl ${isDarkMode ? 'border border-gray-700' : 'border border-gray-200'} space-y-4`}>
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h3 className={`font-semibold ${text}`}>Markdown 内容编辑器</h3>
            <button className="text-sm text-indigo-500 flex items-center hover:text-indigo-400"><Upload size={16} className="mr-1" /> 上传 .md 文件</button>
          </div>
          <textarea
            className={`${inputClass} min-h-[400px] font-mono`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <PopButton variant="primary" icon={Send} className="w-full">立即发布</PopButton>
      </div>
    </div>
  );
};


// 4.4 Sub-Component: Permissions View (Super Admin Only)
const PermissionsView = ({ isDarkMode, user }) => {
  const users = [
    { name: "AdminUser1", role: "ADMIN", lastLogin: "2025-11-20", id: 2 },
    { name: "EditorUser2", role: "USER", lastLogin: "2025-11-18", id: 3 },
    { name: "GuestUser3", role: "USER", lastLogin: "2025-11-15", id: 4 },
    { name: user.username, role: "SUPER_ADMIN", lastLogin: "2025-11-21", id: 1 }
  ];
  const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
  const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const headerBg = isDarkMode ? 'bg-gray-700' : 'bg-gray-100';

  const getRoleColor = (role) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-[#FF0080]';
      case 'ADMIN': return 'bg-[#6366F1]';
      case 'USER': return 'bg-[#00E096]';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-[#FF0080] flex items-center gap-2"><Shield /> 角色与权限管理</h2>
      <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>作为超级管理员，你可以管理其他角色（管理员/用户）的核心权限。用户列表：</p>

      <div className={`${surface} p-6 rounded-lg shadow-xl ${isDarkMode ? 'border border-gray-700' : 'border border-gray-200'} overflow-x-auto`}>
        <table className="min-w-full divide-y divide-gray-200 table-auto">
          <thead>
            <tr className={headerBg}>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${text}`}>用户名</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${text}`}>当前角色</th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${text}`}>最后登录</th>
              <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${text}`}>操作</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'} `}>
            {users.map((u) => (
              <tr key={u.id} className={isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${text}`}>{u.name}</td>
                <td className={`px-6 py-4 whitespace-nowrap`}>
                  <span className={`text-[10px] font-bold text-white px-2 py-1 rounded ${getRoleColor(u.role)}`}>{u.role}</span>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500`}>{u.lastLogin}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button disabled={u.role === 'SUPER_ADMIN'} className={`text-indigo-600 hover:text-indigo-900 disabled:opacity-50 ${isDarkMode ? 'text-indigo-400' : ''}`}>调整角色</button>
                  <button disabled={u.role === 'SUPER_ADMIN'} className={`text-red-600 hover:text-red-900 disabled:opacity-50 ${isDarkMode ? 'text-red-400' : ''}`}>停用</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// 4.5 The main Admin Panel structure
// 4.5 The main Admin Panel structure
const AdminPanel = ({ setView, notification, setNotification, user, isDarkMode, handleLogout }) => {
  const location = useLocation();
  const [broadcastSaving, setBroadcastSaving] = useState(false);

  // Extract the last part of the path to determine the active tab
  const currentPath = location.pathname.split('/').pop();
  // Default to 'dashboard' if path is just '/admin' or empty
  const activeTab = currentPath === 'admin' || currentPath === '' ? 'dashboard' : currentPath;

  const tabs = [
    { key: 'dashboard', label: '仪表盘', icon: Home, component: DashboardView },
    { key: 'create-post', label: '发布文章', icon: Edit, component: CreatePostView },
    { key: 'posts', label: '文章列表', icon: FileText, component: () => <div className="text-xl p-8 text-center">文章列表占位符</div> },
    { key: 'analytics', label: '数据分析', icon: BarChart3, component: AnalyticsView },
    { key: 'comments', label: '评论管理', icon: MessageCircle, component: () => <div className="text-xl p-8 text-center">评论审核占位符</div> },
    { key: 'taxonomy', label: '分类标签', icon: Tag, component: () => <div className="text-xl p-8 text-center">分类与标签占位符</div> },
    { key: 'permissions', label: '权限管理', icon: Shield, component: PermissionsView, superAdmin: true },
    { key: 'settings', label: '系统设置', icon: Settings, component: () => <div className="text-xl p-8 text-center">系统设置占位符</div> },
    { key: 'profile', label: '个人资料', icon: User, component: AdminProfile },
  ].filter(tab => !tab.superAdmin || user.role === 'SUPER_ADMIN');

  const activeLabel = tabs.find(t => t.key === activeTab)?.label || '仪表盘';

  const bgClass = isDarkMode ? THEME.colors.bgDark : 'bg-gray-100';
  const sidebarBg = isDarkMode ? 'bg-gray-900' : 'bg-white';
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-800';
  const sidebarBorder = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const topbarBg = isDarkMode ? 'bg-gray-900' : 'bg-white';

  const handleBroadcastToggle = async () => {
    if (broadcastSaving) return;
    const previousState = notification.isOpen;
    const nextState = !previousState;
    const payloadContent = notification.content;

    setNotification((prev) => ({ ...prev, isOpen: nextState }));
    setBroadcastSaving(true);
    try {
      await updateBroadcast({
        content: payloadContent,
        active: nextState,
      });
      alert(nextState ? "紧急广播已开启并保存" : "紧急广播已关闭并保存");
    } catch (error) {
      console.error("Failed to toggle broadcast", error);
      alert("同步广播状态失败，请稍后重试");
      setNotification((prev) => ({ ...prev, isOpen: previousState }));
    } finally {
      setBroadcastSaving(false);
    }
  };

  return (
    <div className={`min-h-screen flex ${bgClass} ${textClass}`}>
      {/* Sidebar */}
      <aside className={`w-64 flex-shrink-0 ${sidebarBg} border-r ${sidebarBorder} flex flex-col fixed h-full z-40 transition-colors`}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-bold text-lg flex items-center gap-2 text-indigo-500"><Terminal className="text-pink-500" /> SANGUI // ADMIN</h2>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              to={key === 'dashboard' ? '/admin' : `/admin/${key}`}
              className={`w-full text-left px-4 py-3 rounded text-sm font-medium flex items-center gap-3 transition-colors ${activeTab === key
                ? 'bg-indigo-500 text-white shadow-lg'
                : `hover:bg-indigo-100 hover:text-indigo-600 ${isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-800'}`
                }`}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={() => setView('home')} className="text-sm text-gray-500 hover:text-black flex items-center gap-2"><LogOut size={14} /> 返回前台</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Top Bar */}
        <header className={`sticky top-0 z-30 h-16 flex items-center justify-between px-8 ${topbarBg} border-b ${sidebarBorder} shadow-sm`}>
          <h1 className="text-xl font-bold">{activeLabel}</h1>
          <div className="flex items-center space-x-4">
            <span className={`text-xs px-3 py-1 rounded font-bold text-white ${ROLES[user.role].color}`}>
              {ROLES[user.role].label}
            </span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
              <LogOut size={16} /> 退出登录
            </button>
          </div>
        </header>

        <main className="flex-1 p-8">
          <Routes>
            <Route index element={<DashboardView isDarkMode={isDarkMode} user={user} />} />
            <Route path="dashboard" element={<DashboardView isDarkMode={isDarkMode} user={user} />} />
            <Route path="create-post" element={<CreatePostView isDarkMode={isDarkMode} user={user} />} />
            <Route path="analytics" element={<AnalyticsView isDarkMode={isDarkMode} user={user} />} />
            <Route path="permissions" element={<PermissionsView isDarkMode={isDarkMode} user={user} />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="*" element={<div className="text-xl p-8 text-center">功能开发中...</div>} />
          </Routes>

          {/* General Notification System for Super Admin */}
          {(activeTab === 'dashboard' || activeTab === 'settings') && user.role === 'SUPER_ADMIN' && (
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg border shadow-sm mt-8`}>
              <h3 className={`font-bold mb-4 text-sm uppercase tracking-wide text-gray-500`}>紧急广播设置</h3>
              <div className="flex gap-4">
                <input
                  className={`flex-1 border rounded px-3 py-2 text-sm outline-none focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                  value={notification.content}
                  onChange={(e) => setNotification({ ...notification, content: e.target.value })}
                />
                <button
                  onClick={handleBroadcastToggle}
                  disabled={broadcastSaving}
                  className={`px-4 py-2 rounded text-sm font-bold text-white transition-colors ${notification.isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} ${broadcastSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {notification.isOpen ? '关闭并保存' : '开启并保存'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};


// --- 6. Scroll To Top Component ---
const ScrollToTop = ({ isDarkMode }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed bottom-16 left-0 right-0 z-50 pointer-events-none">
          <div className="max-w-4xl mx-auto px-4 md:px-0 relative">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={scrollToTop}
              className={`pointer-events-auto absolute -right-6 md:-right-28 p-3 rounded-full shadow-lg transition-colors ${isDarkMode ? 'bg-[#FF0080] text-white hover:bg-[#D9006C]' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              <ArrowUp size={24} />
            </motion.button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- 5. Main App ---

export default function SanGuiBlog({ initialView = 'home', initialArticleId = null, onViewChange }) {
  const { meta, categories, posts, article, comments, loadPosts, loadArticle, submitComment, removeComment, editComment, doLogin, logout, user: blogUser } = useBlog();
  const [view, setView] = useState(initialView);
  const [user, setUser] = useState(null);
  const [articleId, setArticleId] = useState(initialArticleId);
  const [activeParent, setActiveParent] = useState("all");
  const [activeSub, setActiveSub] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, content: "系统将于今晚 00:00 停机维护" });
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sangui-theme') === 'dark';
    }
    return false;
  }); // Persisted dark mode state

  useEffect(() => {
    if (blogUser) setUser(blogUser);
  }, [blogUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sangui-theme', isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (meta?.stats) Object.assign(SITE_STATS, meta.stats);
    if (meta?.broadcast) {
      setNotification((prev) => ({
        isOpen: Boolean(meta.broadcast.active),
        content: meta.broadcast.content || prev.content,
      }));
    }
  }, [meta]);

  useEffect(() => {
    if (categories && categories.length) {
      CATEGORY_TREE.splice(0, CATEGORY_TREE.length, { id: "all", label: "全部", children: [] }, ...categories);
    }
  }, [categories]);

  useEffect(() => {
    if (posts && posts.length) {
      MOCK_POSTS.splice(
        0,
        MOCK_POSTS.length,
        ...posts.map((p) => ({
          ...p,
          color: p.color || "bg-[#6366F1]",
          likes: p.likes ?? 0,
          comments: p.comments ?? p.commentsCount ?? 0,
          views: p.views ?? 0,
        }))
      );
    }
  }, [posts]);

  useEffect(() => {
    onViewChange && onViewChange(view, articleId);
  }, [view, articleId]);

  useEffect(() => {
    if (view === 'home') {
      loadPosts && loadPosts();
      recordPageView({ page: "home" });
    }
    if (view === 'article' && articleId) {
      loadArticle && loadArticle(articleId);
      recordPageView({ page: "article", pageId: articleId });
    }
    if (view === 'admin') recordPageView({ page: "admin" });
  }, [view, articleId, loadPosts, loadArticle]);

  const handleLogout = () => {
    logout && logout();
    setUser(null);
    setView('home');
  };

  const handleCategoryClick = (parentLabel, subLabel) => {
    const categoriesList = categories && categories.length ? categories : CATEGORY_TREE;
    const parent = categoriesList.find(c => c.label === parentLabel);
    if (parent) {
      setActiveParent(parent.id);
      if (subLabel) {
        const sub = parent.children.find(s => s.label === subLabel);
        setActiveSub(sub ? sub.id : 'all');
      } else {
        setActiveSub('all');
      }
      setView('home');
    }
  };

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <>
            <Hero setView={setView} isDarkMode={isDarkMode} />
            <ArticleList
              setView={setView}
              setArticleId={setArticleId}
              isDarkMode={isDarkMode}
              postsData={posts}
              categoriesData={categories}
              stats={meta?.stats}
              author={meta?.author}
              activeParent={activeParent}
              setActiveParent={setActiveParent}
              activeSub={activeSub}
              setActiveSub={setActiveSub}
            />
            <footer className={`py-12 text-center mt-12 border-t-8 ${isDarkMode ? 'bg-gray-900 text-white border-[#FF0080]' : 'bg-black text-white border-[#FFD700]'}`}>
              <h2 className="text-3xl font-black italic tracking-tighter mb-2">SANGUI BLOG</h2>
              <p className="text-xs text-gray-500 font-mono">DESIGNED FOR THE BOLD · 2025</p>
            </footer>
          </>
        );
      case 'article': return (
        <ArticleDetail
          id={articleId}
          setView={setView}
          isDarkMode={isDarkMode}
          articleData={article}
          commentsData={comments}
          onSubmitComment={(payload) => submitComment && articleId && submitComment(articleId, payload)}
          onDeleteComment={(commentId) => removeComment && articleId && removeComment(articleId, commentId)}
          onUpdateComment={(commentId, content) => editComment && articleId && editComment(articleId, commentId, content)}
          currentUser={user}
          onCategoryClick={handleCategoryClick}
        />
      );
      case 'login': return <LoginView setView={setView} setUser={setUser} isDarkMode={isDarkMode} doLogin={doLogin} />;
      case 'admin':
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return <div className="p-20 text-center">Access Denied</div>;
        return <AdminPanel setView={setView} notification={notification} setNotification={setNotification} user={user} isDarkMode={isDarkMode} handleLogout={handleLogout} />;
      default: return <div className="pt-32 text-center">404</div>;
    }
  };

  const globalBg = isDarkMode ? THEME.colors.bgDark : THEME.colors.bgLight;

  return (
    <div className={`min-h-screen relative ${globalBg}`}>
      <ClickRipple />
      <ScrollToTop isDarkMode={isDarkMode} />
      <EmergencyBar isOpen={notification.isOpen} content={notification.content} onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))} />
      <ErrorToast error={error} onClose={() => setError(null)} />
      <Navigation user={user} setView={setView} handleLogout={handleLogout} toggleMenu={() => setMenuOpen(!menuOpen)} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      <AnimatePresence mode="wait">
        <motion.main key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {renderView()}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

// Below are the remaining Front-end components updated to respect Dark Mode state
const StatsStrip = ({ isDarkMode, stats }) => {
  const s = stats || SITE_STATS;
  const items = [
    { label: "文章", value: s.posts, icon: FileText, color: "text-[#6366F1]" },
    { label: "浏览", value: s.views, icon: Eye, color: "text-[#FF0080]" },
    { label: "评论", value: s.comments, icon: MessageSquare, color: "text-[#00E096]" },
    { label: "标签", value: s.tags, icon: Hash, color: "text-[#FFD700]" },
    {
      label: "最后更新",
      value: s.lastUpdated,
      fullValue: s.lastUpdatedFull,
      icon: Clock,
      color: "text-gray-500",
      isDate: true,
    },
  ];
  const bg = isDarkMode ? 'bg-gray-900' : 'bg-black';
  const text_cls = isDarkMode ? 'text-white' : 'text-white';
  const tooltipBg = isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-black text-black';
  const tooltipArrow = isDarkMode ? 'border-b-gray-800' : 'border-b-black';

  return (
    <div className={`sticky top-20 z-40 ${bg} ${text_cls} border-b-4 border-black`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-2 mr-8 flex-shrink-0">
          <Activity className="text-[#00E096] animate-pulse" />
          <span className="font-black tracking-widest uppercase">System Status</span>
        </div>

        <div className="flex items-center gap-8 md:gap-12 overflow-visible">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-shrink-0 group cursor-default relative">
              <item.icon size={16} className={`${item.color} group-hover:scale-125 transition-transform`} />

              {item.isDate ? (
                <div className="relative group/date">
                  <span className={`font-mono font-bold text-lg cursor-help border-b border-dashed ${isDarkMode ? 'border-gray-400' : 'border-gray-500'}`}>{item.value}</span>
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 ${tooltipBg} border-2 px-3 py-2 text-sm font-bold whitespace-nowrap opacity-0 group-hover/date:opacity-100 transition-opacity pointer-events-none z-[100] shadow-[4px_4px_0px_0px_#000]`}>
                    <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 ${tooltipArrow}`}></div>
                    {item.fullValue}
                  </div>
                </div>
              ) : (
                <span className="font-mono font-bold text-lg">{item.value}</span>
              )}

              <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ArticleList = ({ setView, setArticleId, isDarkMode, postsData, categoriesData, stats, author, activeParent, setActiveParent, activeSub, setActiveSub }) => {
  const [showWechat, setShowWechat] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [konamiActive, setKonamiActive] = useState(false);
  const konamiSequence = useRef([]);
  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const [avatarClicks, setAvatarClicks] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      konamiSequence.current = [...konamiSequence.current, e.key].slice(-10);
      if (JSON.stringify(konamiSequence.current) === JSON.stringify(KONAMI_CODE)) {
        setKonamiActive(true);
        alert("⚡️ 开发者模式已激活！系统过载中... ⚡️");
        setTimeout(() => setKonamiActive(false), 5000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = categoriesData && categoriesData.length
    ? (categoriesData.some((c) => c.id === "all") ? categoriesData : [{ id: "all", label: "全部", children: [] }, ...categoriesData])
    : CATEGORY_TREE;
  const currentParentObj = categories.find(c => c.id === activeParent);
  const subCategories = currentParentObj ? currentParentObj.children : [];
  const sourcePosts = postsData && postsData.length ? postsData : MOCK_POSTS;
  const filteredPosts = sourcePosts.filter(post => {
    if (activeParent !== "all" && post.parentCategory !== currentParentObj.label) return false;
    if (activeSub !== "all" && post.category !== subCategories.find(s => s.id === activeSub)?.label) return false;
    return true;
  });

  useEffect(() => { setCurrentPage(1); }, [activeParent, activeSub]);

  const totalPages = Math.ceil(filteredPosts.length / PAGE_SIZE);
  const displayPosts = filteredPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const socialButtonClass = isDarkMode
    ? '!text-white hover:!text-black hover:!bg-white'
    : 'hover:bg-black hover:text-white';
  const wechatButtonClass = isDarkMode
    ? (showWechat ? '!bg-white !text-black' : '!text-white hover:!text-black hover:!bg-white')
    : (showWechat ? 'bg-[#00E096] text-white' : 'hover:bg-[#00E096] hover:text-white');

  const sidebarBg = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const text = isDarkMode ? 'text-gray-100' : 'text-black';
  const subText = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const hoverBg = isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-[#FFFAF0]';

  // Use API author data if available, otherwise fallback to MOCK_USER
  const displayAuthor = author || MOCK_USER;
  const authorAvatar = displayAuthor.avatar?.startsWith('http')
    ? displayAuthor.avatar
    : displayAuthor.avatar
      ? `http://localhost:8080${displayAuthor.avatar}`
      : MOCK_USER.avatar;

  return (
    <>
      <StatsStrip isDarkMode={isDarkMode} stats={stats} />
      {konamiActive && (
        <div className="fixed inset-0 z-[100] bg-black mix-blend-difference pointer-events-none animate-pulse flex items-center justify-center">
          <h1 className="text-white font-black text-9xl -rotate-12">HACKED!!</h1>
        </div>
      )}

      <section id="posts" className="px-4 md:px-8 max-w-7xl mx-auto py-16 min-h-screen">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="w-full lg:w-1/4 space-y-8">
            <div className={`${sidebarBg} border-2 border-black p-6 shadow-[8px_8px_0px_0px_#000] text-center relative ${text}`}>
              <motion.div
                animate={{ rotate: avatarClicks * 360 }}
                transition={{ duration: 0.5 }}
                onClick={() => setAvatarClicks(p => p + 1)}
                className="absolute -top-6 left-1/2 -translate-x-1/2 w-20 h-20 bg-[#FFD700] rounded-full border-2 border-black flex items-center justify-center cursor-pointer"
              >
                <img src={authorAvatar} className="w-full h-full object-cover rounded-full" />
              </motion.div>
              <h3 className="mt-12 font-black text-2xl">{displayAuthor.displayName || displayAuthor.username}</h3>
              <p className={`text-sm font-bold mb-4 ${subText}`}>{displayAuthor.title}</p>
              <div className="flex justify-center gap-2">
                <PopButton variant="ghost" className={`!p-2 border-2 border-black ${socialButtonClass}`} onClick={() => window.open(displayAuthor.github || MOCK_USER.social.github)}><Github size={20} /></PopButton>

                <div
                  className="relative"
                  onMouseEnter={() => setShowWechat(true)}
                  onMouseLeave={() => setShowWechat(false)}
                >
                  <PopButton variant="ghost" className={`!p-2 border-2 border-black ${wechatButtonClass}`}>
                    <MessageCircle size={20} />
                  </PopButton>
                  <AnimatePresence>
                    {showWechat && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50"
                      >
                        <div className="bg-white p-2 border-4 border-black shadow-[4px_4px_0px_0px_#000] w-40 h-40 flex flex-col items-center justify-center">
                          <img src={displayAuthor.wechatQr?.startsWith('http') ? displayAuthor.wechatQr : (displayAuthor.wechatQr ? `http://localhost:8080${displayAuthor.wechatQr}` : MOCK_USER.social.wechatQr)} className="w-32 h-32 object-contain border border-gray-200 block" />
                          <p className="text-center text-[10px] font-bold mt-1 bg-black text-white w-full">SCAN ME</p>
                        </div>
                        <div className="w-4 h-4 bg-black rotate-45 absolute -bottom-2 left-1/2 -translate-x-1/2"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-black text-xl mb-4 flex items-center gap-2 bg-black text-white p-2 transform -rotate-1 w-max">
                <Filter size={20} /> NAVIGATOR
              </h4>
              <div className="flex flex-col gap-3">
                {categories.map(cat => (
                  <div key={cat.id} className="group">
                    <button
                      onClick={() => { setActiveParent(cat.id); setActiveSub('all') }}
                      className={`w-full text-left p-3 font-bold border-2 border-black transition-all flex justify-between items-center
                          ${activeParent === cat.id ? 'bg-[#6366F1] text-white shadow-[4px_4px_0px_0px_#000] -translate-y-1' : `${sidebarBg} ${text} hover:bg-gray-100`}
                        `}
                    >
                      {cat.label}
                      <ChevronRight size={16} className={`transition-transform ${activeParent === cat.id ? 'rotate-90' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {activeParent === cat.id && cat.children.length > 0 && (
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className={`overflow-hidden border-l-4 border-black ml-4 ${sidebarBg}`}
                        >
                          {cat.children.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => setActiveSub(sub.id)}
                              className={`block w-full text-left px-4 py-2 text-sm font-bold ${isDarkMode ? 'border-gray-700' : 'border-black'} border-b last:border-0
                                   ${activeSub === sub.id ? 'bg-[#FFD700] text-black' : `${subText} hover:bg-black/10`}
                                 `}
                            >
                              {sub.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="space-y-8 flex-1">
              {displayPosts.length > 0 ? (
                displayPosts.map((post, idx) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <TiltCard onClick={() => { setArticleId(post.id); setView('article'); }}>
                      <div className="flex flex-col md:flex-row">
                        <div className={`md:w-1/3 h-48 md:h-auto ${post.color} border-b-2 md:border-b-0 md:border-r-2 border-black p-6 flex flex-col justify-between text-white relative overflow-hidden group`}>
                          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity transform group-hover:scale-110 duration-500">
                            <Code size={120} />
                          </div>
                          <span className="relative z-10 font-black text-5xl opacity-50">
                            {(idx + 1 + (currentPage - 1) * PAGE_SIZE).toString().padStart(2, '0')}
                          </span>
                          <div className="relative z-10">
                            <span className="bg-black text-white px-2 py-1 text-xs font-bold uppercase mb-2 inline-block">{post.parentCategory}</span>
                            <h4 className="font-black text-2xl leading-none">{post.category}</h4>
                          </div>
                        </div>

                        <div className={`flex-1 p-6 md:p-8 ${cardBg} group ${hoverBg}`}>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.map(t => (
                              <span key={t} className={`px-2 py-1 border border-black text-xs font-bold ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white'} shadow-[2px_2px_0px_0px_#000]`}>#{t}</span>
                            ))}
                          </div>
                          <h2 className={`text-3xl font-black mb-4 group-hover:text-[#6366F1] transition-colors ${text}`}>{post.title}</h2>
                          <p className={`text-lg font-medium mb-6 border-l-4 border-gray-300 pl-4 ${subText}`}>{post.excerpt}</p>

                          <div className={`flex justify-between items-center border-t-2 ${isDarkMode ? 'border-gray-700' : 'border-black'} pt-4 border-dashed`}>
                            <span className="font-mono font-bold text-xs bg-black text-white px-2 py-1">{post.date}</span>
                            <div className={`flex gap-4 font-bold text-sm ${text}`}>
                              <span className="flex items-center gap-1 hover:text-[#FF0080]"><Heart size={18} /> {post.likes}</span>
                              <span className="flex items-center gap-1 hover:text-[#6366F1]"><MessageSquare size={18} /> {post.comments}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TiltCard>
                  </motion.div>
                ))
              ) : (
                <div className={`p-12 border-4 border-black border-dashed text-center ${cardBg}`}>
                  <p className={`text-2xl font-black ${subText}`}>NO DATA FOUND</p>
                  <PopButton variant="primary" className="mt-4" onClick={() => { setActiveParent('all'); setActiveSub('all') }}>RESET FILTERS</PopButton>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); document.getElementById('posts').scrollIntoView({ behavior: 'smooth' }); }}
                  className={`p-3 border-2 border-black ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white'} hover:bg-[#FFD700] disabled:opacity-50 disabled:hover:bg-white transition-colors shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none`}
                >
                  <ChevronLeft size={20} strokeWidth={3} />
                </button>

                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => { setCurrentPage(p); document.getElementById('posts').scrollIntoView({ behavior: 'smooth' }); }}
                      className={`w-10 h-10 border-2 border-black font-black transition-all shadow-[4px_4px_0px_0px_#000]
                          ${currentPage === p ? 'bg-black text-white -translate-y-1 shadow-[6px_6px_0px_0px_#FF0080]' : `${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white'} hover:bg-[#6366F1] hover:text-white`}
                        `}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); document.getElementById('posts').scrollIntoView({ behavior: 'smooth' }); }}
                  className={`p-3 border-2 border-black ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white'} hover:bg-[#FFD700] disabled:opacity-50 disabled:hover:bg-white transition-colors shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none`}
                >
                  <ChevronRight size={20} strokeWidth={3} />
                </button>
              </div>
            )}

            <div className="py-12 text-center mt-8">
              <div className="inline-block relative">
                <div className="absolute inset-0 bg-[#FFD700] transform translate-x-2 translate-y-2 border-2 border-black"></div>
                <div className={`relative border-2 border-black px-8 py-4 text-2xl font-black italic ${cardBg} ${text}`}>
                  "阻挡你的不是别人，而是你自己。"
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

const LoginView = ({ setView, setUser, isDarkMode, doLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (doLogin) {
        const res = await doLogin(username, password);
        if (res?.user) setUser(res.user);
      } else {
        setUser(MOCK_USER);
      }
      setView('home');
    } catch (err) {
      setError(err.message || "\u767b\u5f55\u5931\u8d25");
    } finally {
      setLoading(false);
    }
  };
  const bg = isDarkMode ? THEME.colors.bgDark : 'bg-gray-100';
  const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
  const text = isDarkMode ? 'text-gray-100' : 'text-gray-800';
  const inputBg = isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-black';

  return (
    <div className={`h-screen flex items-center justify-center ${bg} ${text}`}>
      <div className={`${surface} p-8 rounded-none border-4 border-black shadow-[8px_8px_0px_0px_#000] w-96`}>
        <h2 className="text-3xl font-black mb-6 text-center uppercase italic">System Access</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="font-bold text-sm uppercase">Username</label>
            <input
              className={`w-full border-2 border-black p-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>
          <div className="space-y-2">
            <label className="font-bold text-sm uppercase">Password</label>
            <input
              className={`w-full border-2 border-black p-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          {error && <div className="bg-red-500 text-white p-2 font-bold text-sm border-2 border-black">{error}</div>}
          <div className="flex gap-4">
            <PopButton variant="primary" className="w-full justify-center" disabled={loading}>{loading ? 'Accessing...' : 'Login'}</PopButton>
            <PopButton variant="ghost" type="button" onClick={() => setView('home')}>Cancel</PopButton>
          </div>
        </form>
      </div>
    </div>
  );
};
