import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import PopButton from "../components/common/PopButton.jsx";
import { useLayoutOffsets } from "../contexts/LayoutOffsetContext.jsx";
import { usePermissionContext } from "../contexts/PermissionContext.jsx";
import {
    adminFetchTags,
    fetchTags,
    adminCreateTag,
    adminUpdateTag,
    adminDeleteTag,
    adminFetchCategories,
    fetchCategories,
    adminCreateCategory,
    adminUpdateCategory,
    adminDeleteCategory,
    adminFetchPosts,
    adminFetchPostDetail,
    adminFetchPostSiblings,
    adminFetchUsers,
    adminFetchUserDetail,
    adminCreateUser,
    adminUpdateUser,
    adminDeleteUser,
    adminFetchRoles,
    adminFetchAnalyticsSummary,
    adminFetchPageViewLogs,
    adminDeletePageViewLog,
    adminDeletePageViewLogs,
    adminDeleteMyAnalyticsLogs,
    adminFetchAiAuditSessions,
    adminFetchAiAuditSessionDetail,
    adminFetchPermissionMatrix,
    adminUpdateRolePermissions,
    adminScanUnusedAssets,
    adminDeleteUnusedAssets,
    adminScanEmptyFolders,
    adminDeleteEmptyFolders,
    adminFetchSystemMonitor,
    adminFetchGames,
    adminCreateGame,
    adminUpdateGame,
    adminDeleteGame,
    adminFetchHomeBackgrounds,
    adminUploadHomeBackground,
    adminSetCurrentHomeBackground,
    adminDeleteHomeBackground,
    adminFetchKnowledgeDocuments,
    adminFetchKnowledgeDocumentDetail,
    adminCreateKnowledgeDocument,
    adminUpdateKnowledgeDocument,
    adminDeleteKnowledgeDocument,
    adminFetchAiAssistantSettings,
    adminUpdateAiAssistantSettings,
    adminCreateRegistrationInvite,
    adminFetchLatestRegistrationInvite,
    adminFetchAbout,
    adminSaveAbout,
    adminFetchComments,
    adminUpdateComment,
    adminDeleteComment,
    createComment,
    updateBroadcast,
    uploadAvatar,
    uploadPostAssets,
    uploadPostCover,
    reservePostAssetsFolder,
    createPost,
    updatePost
} from "../api";
import { buildAssetUrl } from "../utils/asset.js";
import { formatVisitDurationFromRecord } from "./public/articleVisitTracker.js";
import logger from "../utils/logger.js";
import { useBlog } from "../hooks/useBlogData";
import { motion, AnimatePresence } from 'framer-motion';
import AdminProfile from '../pages/admin/Profile';
import {
    Code, User, MessageSquare, Share2, X, Menu, ChevronRight,
    Search, LogIn, LogOut, Settings, Eye, EyeOff, Github, Twitter,
    BarChart3, Filter, Tag, AlertTriangle, MessageCircle,
    Layers, Hash, Clock, FileText, Terminal, Zap, Sparkles,
    ArrowUpRight, ArrowRight, Grid, List, Activity, ChevronLeft, Shield, Lock, Users, Mail, Megaphone,
    Home, TrendingUp, Edit, Send, Moon, Sun, Upload, ArrowUp, BookOpen, CheckCircle, PenTool, FolderPlus,
    RefreshCw, Plus, Trash2, Save, ImagePlus, ChevronsLeft, ChevronsRight, Copy, Calendar, Database, Ticket,
    Cpu, Gauge, HardDrive, MemoryStick, Server, Wifi
} from 'lucide-react';
import {
    THEME,
    ROLES,
    BROADCAST_STYLE_CONFIG,
    THEME_COLOR_PRESETS,
    DEFAULT_THEME_COLOR,
    countImagesInContent,
    extractHexFromBgClass
} from "./shared.js";
import { shouldShowInlineImageUpload } from "./createPostInlineImageVisibility.js";
import './public/homeRedesign.css';

const decodeMaybeUrlEncoded = (value) => {
    if (!value || typeof value !== 'string') return value;
    // 仅在看起来像 URL 编码串时才 decode，避免误伤包含 % 的普通文本
    if (!/%[0-9a-fA-F]{2}/.test(value)) return value;
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const formatBgClassFromHex = (hex) => {
    if (!hex) return DEFAULT_THEME_COLOR;
    const normalized = hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
    return `bg-[${normalized}]`;
};

const REGISTRATION_INVITE_DURATION_OPTIONS = [
    { code: 'MINUTES_5', label: '5分钟' },
    { code: 'HOURS_1', label: '1小时' },
    { code: 'DAYS_1', label: '1天' },
    { code: 'DAYS_10', label: '10天' }
];

const getAdminMarkdownScrollbarClass = (isDarkMode) => isDarkMode ? 'sg-scrollbar sg-scrollbar-dark' : 'sg-scrollbar sg-scrollbar-light';
const getAdminDarkScrollbarClass = (isDarkMode) => isDarkMode ? 'sg-scrollbar sg-scrollbar-dark' : '';

const ThemeColorSelector = ({ value, onChange, inputClass, isDarkMode }) => {
    const selectedHex = useMemo(() => extractHexFromBgClass(value, '#6366F1'), [value]);

    return (
        <div className="space-y-3">
            <label
                className={`text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>主题色（可选）</label>
            <input
                className={inputClass}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="bg-[#FF0080]"
            />
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={selectedHex}
                        onChange={(e) => onChange(formatBgClassFromHex(e.target.value))}
                        className="w-12 h-12 border-2 border-black rounded cursor-pointer"
                        title="自定义颜色"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">色盘会自动转换为 bg-[#HEX] 形式</span>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                {THEME_COLOR_PRESETS.map((preset) => {
                    const presetHex = extractHexFromBgClass(preset);
                    const isActive = preset === value;
                    return (
                        <button
                            type="button"
                            key={preset}
                            aria-label={`选择颜色 ${presetHex}`}
                            onClick={() => onChange(preset)}
                            className={`w-10 h-10 rounded-full border-2 ${isActive ? 'border-black scale-110' : 'border-transparent'} shadow-[2px_2px_0px_0px_#000] transition-transform`}
                            style={{ backgroundColor: presetHex }}
                        />
                    );
                })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">示例：bg-[#FF0080]；也可直接填写 Tailwind
                自定义类。</p>
        </div>
    );
};

const useTimedNotice = (duration = 4000) => {
    const [notice, setNotice] = useState({ visible: false, message: '', tone: 'success' });
    const timerRef = useRef(null);

    const showNotice = useCallback((message, tone = 'success') => {
        if (!message) return;
        setNotice({ visible: true, message, tone });
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setNotice((prev) => ({ ...prev, visible: false }));
        }, duration);
    }, [duration]);

    const hideNotice = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setNotice((prev) => ({ ...prev, visible: false }));
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return { notice, showNotice, hideNotice };
};

const AdminNoticeBar = ({ notice, onClose }) => {
    const { headerHeight } = useLayoutOffsets();
    if (!notice?.visible || !notice?.message) return null;
    const tone = notice.tone === 'error' ? 'error' : 'success';
    const toneStyles = tone === 'error'
        ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-[0_20px_45px_rgba(244,63,94,0.35)]'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-[0_20px_45px_rgba(16,185,129,0.35)]';
    const Icon = tone === 'error' ? AlertTriangle : CheckCircle;
    const safeTop = headerHeight + 16;

    return (
        <div
            className="fixed right-8 z-50 w-[min(360px,calc(100vw-32px))] transition-all duration-300"
            style={{ top: safeTop }}
        >
            <div className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${toneStyles}`}>
                <Icon size={20} />
                <div className="flex-1">
                    <p className="font-semibold text-sm leading-5">{notice.message}</p>
                    <p className="text-xs opacity-80 mt-1">提示栏会在 4 秒后自动收起。</p>
                </div>
                <button
                    type="button"
                    aria-label="关闭提示"
                    onClick={onClose}
                    className="text-xs text-current/70 hover:text-current transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

const AdminConfirmDialog = ({ isDarkMode, open, title, description, confirmText, cancelText, onCancel, onConfirm }) => {
    if (!open) return null;

    const surfaceClass = isDarkMode
        ? 'bg-gray-950 text-gray-100 border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.55)]'
        : 'bg-white text-gray-900 border border-black/10 shadow-[0_24px_80px_rgba(15,23,42,0.18)]';
    const subtleTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const panelClass = isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-black/10 bg-slate-50';
    const cancelButtonClass = isDarkMode
        ? 'border-white/12 bg-white/[0.05] text-gray-100 hover:bg-white/[0.09]'
        : 'border-black/10 bg-white text-slate-700 hover:bg-slate-100';
    const confirmButtonClass = isDarkMode
        ? 'border-white/12 bg-[linear-gradient(180deg,rgba(239,68,68,0.95),rgba(220,38,38,0.84))] text-white hover:bg-[#dc2626]'
        : 'border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(254,226,226,0.92))] text-[#b91c1c] hover:bg-white';

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]">
            <div className={`w-full max-w-md rounded-[28px] p-6 ${surfaceClass}`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-500">确认操作</p>
                        <h3 className="text-xl font-black">{title}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className={`h-9 w-9 rounded-full border text-sm transition-colors ${cancelButtonClass}`}
                        aria-label="关闭确认弹层"
                    >
                        <X size={16} className="mx-auto" />
                    </button>
                </div>
                <div className={`mt-4 rounded-[22px] border px-4 py-4 text-sm leading-6 ${panelClass}`}>
                    <p>{description}</p>
                    <p className={`mt-2 text-xs ${subtleTextClass}`}>这次操作将通过站内弹层确认，不会再触发浏览器原生阻塞弹窗。</p>
                </div>
                <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${cancelButtonClass}`}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const useAdminConfirmDialog = (isDarkMode) => {
    const resolverRef = useRef(null);
    const [dialogState, setDialogState] = useState({
        open: false,
        title: '请确认操作',
        description: '',
        confirmText: '确认',
        cancelText: '取消',
    });

    const resolveDialog = useCallback((result) => {
        if (resolverRef.current) {
            resolverRef.current(result);
            resolverRef.current = null;
        }
    }, []);

    const closeDialog = useCallback((result) => {
        setDialogState((prev) => ({ ...prev, open: false }));
        resolveDialog(result);
    }, [resolveDialog]);

    const confirm = useCallback((options = {}) => new Promise((resolve) => {
        resolverRef.current = resolve;
        setDialogState({
            open: true,
            title: options.title || '请确认操作',
            description: options.description || options.message || '确认继续执行当前操作吗？',
            confirmText: options.confirmText || '确认',
            cancelText: options.cancelText || '取消',
        });
    }), []);

    useEffect(() => () => {
        resolveDialog(false);
    }, [resolveDialog]);

    const confirmDialog = (
        <AdminConfirmDialog
            isDarkMode={isDarkMode}
            open={dialogState.open}
            title={dialogState.title}
            description={dialogState.description}
            confirmText={dialogState.confirmText}
            cancelText={dialogState.cancelText}
            onCancel={() => closeDialog(false)}
            onConfirm={() => closeDialog(true)}
        />
    );

    return { confirm, confirmDialog };
};

export const AnalyticsSummaryContext = React.createContext({
    summary: null,
    loading: false,
    error: '',
    rangeDays: 7,
    reload: () => {
    }
});

const useAdminAnalytics = () => useContext(AnalyticsSummaryContext);

const PermissionNotice = ({ title = '权限不足', description = '请联系超级管理员分配权限' }) => (
    <div
        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-10 text-center space-y-3 bg-white/60 dark:bg-gray-900/40">
        <Lock size={32} className="mx-auto text-gray-400" />
        <h3 className="text-xl font-black">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-6">{description}</p>
    </div>
);
// --- 4. 后台管理组件 (Admin Panel) ---

// 4.1 Sub-Component: Dashboard View
const DashboardView = ({ isDarkMode }) => {
    const { summary, loading, error, reload, rangeDays } = useAdminAnalytics();
    const overview = summary?.overview;
    const rawDailyTrends = summary?.dailyTrends || [];
    const trafficSources = summary?.trafficSources || [];
    const normalizedRange = rangeDays === 0 ? -1 : (rangeDays || 7);
    const trendRangeDays = normalizedRange === -1 ? 30 : Math.max(7, Math.min(normalizedRange, 60));
    const rangeLabel = overview?.rangeLabel || (normalizedRange === -1 ? "全部历史" : `最近${normalizedRange}天`);
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const border = isDarkMode ? "border border-gray-700" : "border border-gray-200";
    const textPrimary = isDarkMode ? "text-gray-100" : "text-gray-900";
    const textMuted = isDarkMode ? "text-gray-400" : "text-gray-500";
    const rangeOptions = [
        { label: "7天", value: 7 },
        { label: "14天", value: 14 },
        { label: "30天", value: 30 },
        { label: "全部", value: -1 },
    ];
    const scrollBarClass = isDarkMode ? 'sg-scrollbar sg-scrollbar-dark' : 'sg-scrollbar';

    const [aggregatedTrends, setAggregatedTrends] = useState([]);
    const [aggregatedLoading, setAggregatedLoading] = useState(false);
    const [aggregatedError, setAggregatedError] = useState('');
    const trendCardRef = useRef(null);
    const [trendCardHeight, setTrendCardHeight] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const target = trendCardRef.current;
        if (!target) return;
        const updateHeight = () => {
            const rect = target.getBoundingClientRect();
            if (rect?.height) {
                setTrendCardHeight(Math.round(rect.height));
            }
        };
        updateHeight();
        let resizeObserver;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => updateHeight());
            resizeObserver.observe(target);
        } else {
            window.addEventListener('resize', updateHeight);
        }
        return () => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            } else {
                window.removeEventListener('resize', updateHeight);
            }
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadAggregated = async () => {
            setAggregatedLoading(true);
            setAggregatedError('');
            try {
                const byDate = new Map();

                const pad2 = (value) => String(value).padStart(2, '0');
                const isDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
                const parseDateKeyToUtcDate = (key) => {
                    if (!isDateKey(key)) return null;
                    const [y, m, d] = String(key).split('-').map((v) => Number(v));
                    return new Date(Date.UTC(y, m - 1, d));
                };
                const dateKeyFromUtcDate = (utcDate) => {
                    if (!(utcDate instanceof Date) || Number.isNaN(utcDate.getTime())) return '';
                    const y = utcDate.getUTCFullYear();
                    const m = pad2(utcDate.getUTCMonth() + 1);
                    const d = pad2(utcDate.getUTCDate());
                    return `${y}-${m}-${d}`;
                };
                const addDaysToDateKey = (key, days) => {
                    const d = parseDateKeyToUtcDate(key);
                    if (!d) return '';
                    d.setUTCDate(d.getUTCDate() + Number(days || 0));
                    return dateKeyFromUtcDate(d);
                };

                // 后端对 page-views 的 size 有上限（服务端会 cap 到 200），因此这里用分页补齐目标天数窗口，避免跨月/跨年只聚合到最近少量记录。
                const pageSize = 200;
                const maxPages = Math.max(5, Math.min(50, trendRangeDays * 3));
                let page = 1;
                let endKey = '';
                let startKey = '';

                while (page <= maxPages) {
                    const res = await adminFetchPageViewLogs({ page, size: pageSize });
                    const data = res.data || res;
                    const records = data.records || [];
                    if (!Array.isArray(records) || records.length === 0) break;

                    // 先确定窗口的结束日期（以服务端返回的日期为准）
                    if (!endKey) {
                        const candidate = records
                            .map((item) => (item?.time || item?.viewedAt || item?.viewed_at || '').slice(0, 10))
                            .filter((key) => isDateKey(key))
                            .reduce((max, key) => (max && max > key ? max : key), '');
                        endKey = candidate || '';
                        startKey = endKey ? addDaysToDateKey(endKey, -(trendRangeDays - 1)) : '';
                    }

                    records.forEach((item) => {
                        const dateStr = (item?.time || item?.viewedAt || item?.viewed_at || '').slice(0, 10);
                        if (!isDateKey(dateStr)) return;
                        if (startKey && dateStr < startKey) return;

                        const ip = item?.ip || item?.viewerIp || item?.viewer_ip || '';
                        const userId = item?.userId ?? item?.user_id ?? null;
                        const identity = userId ? `U#${userId}` : (ip ? `G#${ip}` : `G#${item?.id || dateStr}`);

                        const current = byDate.get(dateStr) || { views: 0, visitors: new Set() };
                        current.views += 1;
                        current.visitors.add(identity);
                        byDate.set(dateStr, current);
                    });

                    const oldestKey = (records[records.length - 1]?.time
                        || records[records.length - 1]?.viewedAt
                        || records[records.length - 1]?.viewed_at
                        || '').slice(0, 10);

                    if (startKey && isDateKey(oldestKey) && oldestKey <= startKey) break;
                    if (records.length < pageSize) break;
                    page += 1;
                }

                if (!endKey) {
                    const now = new Date();
                    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
                    endKey = dateKeyFromUtcDate(todayUtc);
                    startKey = addDaysToDateKey(endKey, -(trendRangeDays - 1));
                }

                const startDateUtc = parseDateKeyToUtcDate(startKey);
                const result = [];
                for (let i = 0; i < trendRangeDays; i += 1) {
                    const d = new Date(startDateUtc);
                    d.setUTCDate(startDateUtc.getUTCDate() + i);
                    const key = dateKeyFromUtcDate(d);
                    const entry = byDate.get(key);
                    result.push({
                        date: key,
                        views: entry ? entry.views : 0,
                        visitors: entry ? entry.visitors.size : 0
                    });
                }
                if (!cancelled) setAggregatedTrends(result);
            } catch (e) {
                if (!cancelled) setAggregatedError(e.message || '访问日志聚合失败');
            } finally {
                if (!cancelled) setAggregatedLoading(false);
            }
        };
        loadAggregated();
        return () => { cancelled = true; };
    }, [trendRangeDays]);

    const trendFromApi = rawDailyTrends.slice(-trendRangeDays);
    const hasAggData = aggregatedTrends.some((d) => Number(d?.views || 0) > 0 || Number(d?.visitors || 0) > 0);
    const dailyTrends = hasAggData ? aggregatedTrends : trendFromApi;
    const isUsingAggregated = hasAggData;

    const formatNumber = (value, fallback = "--") => {
        if (typeof value === "number") return value.toLocaleString();
        return fallback;
    };

    const handleRangeClick = (value) => {
        if (value === normalizedRange) return;
        reload?.(value);
    };

    const StatCard = ({ title, value, desc, icon: Icon, accent }) => (
        <div className={`${surface} ${border} rounded-2xl p-5 shadow-lg relative overflow-hidden`}>
            <div className="flex items-center justify-between">
                <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${textMuted}`}>{title}</p>
                {Icon && (
                    <span className={`p-2 rounded-full ${accent}`}>
                        <Icon size={16} className="text-white" />
                    </span>
                )}
            </div>
            <div className="mt-3 text-3xl font-black">{value}</div>
            {desc && <p className={`text-xs mt-1 ${textMuted}`}>{desc}</p>}
        </div>
    );

    const metrics = [
        {
            title: "累计浏览",
            value: formatNumber(overview?.totalViews),
            desc: "posts.views_count 汇总",
            icon: Activity,
            accent: "bg-gradient-to-br from-indigo-500 to-purple-500",
        },
        {
            title: "评论总数",
            value: formatNumber(overview?.commentCount),
            desc: "posts.comments_count 汇总",
            icon: MessageSquare,
            accent: "bg-gradient-to-br from-rose-500 to-orange-400",
        },
        {
            title: "区间 PV",
            value: formatNumber(overview?.periodViews),
            desc: rangeLabel,
            icon: BarChart3,
            accent: "bg-gradient-to-br from-pink-500 to-amber-400",
        },
        {
            title: "区间 UV",
            value: formatNumber(overview?.uniqueVisitors),
            desc: "登录优先，再按 IP 去重",
            icon: Users,
            accent: "bg-gradient-to-br from-emerald-500 to-lime-500",
        },
        {
            title: "文章总数",
            value: formatNumber(overview?.postCount),
            desc: "仅统计已发布文章",
            icon: FileText,
            accent: "bg-gradient-to-br from-slate-500 to-slate-700",
        },
        {
            title: "评论总数（实时）",
            value: formatNumber(overview?.commentEntries),
            desc: "comments 表实时计数",
            icon: MessageCircle,
            accent: "bg-gradient-to-br from-sky-500 to-indigo-500",
        },
    ];

    const peakViews = dailyTrends.length ? Math.max(...dailyTrends.map((d) => d.views || 0)) : 0;
    const peakVisitors = dailyTrends.length ? Math.max(...dailyTrends.map((d) => d.visitors || 0)) : 0;
    const lastPoint = dailyTrends[dailyTrends.length - 1] || {};

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-3xl font-black flex items-center gap-2">
                        <Activity /> 仪表盘概览
                    </h2>
                    <p className={`text-sm ${textMuted}`}>{rangeLabel} · 数据实时刷新</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className={`${surface} ${border} flex items-center gap-2 rounded-full px-2 py-1`}>
                        {rangeOptions.map((option) => {
                            const active = option.value === normalizedRange;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleRangeClick(option.value)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                                        active
                                            ? "bg-indigo-600 text-white"
                                            : `${isDarkMode ? "text-gray-300" : "text-gray-600"} hover:text-indigo-500`
                                    }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        onClick={() => reload?.()}
                        disabled={loading}
                        className="px-4 py-2 border-2 border-black text-sm font-bold bg-[#FFD700] rounded-full hover:-translate-y-0.5 transition disabled:opacity-50"
                    >
                        {loading ? "刷新中..." : "刷新数据"}
                    </button>
                </div>
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {metrics.map((metric) => (
                    <StatCard key={metric.title} {...metric} />
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div ref={trendCardRef} className={`xl:col-span-2 ${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className={`text-xl font-bold ${textPrimary}`}>访客走势图</h3>
                            <p className={`text-xs ${textMuted}`}>最近{trendRangeDays}天 PV & UV</p>
                            {isUsingAggregated && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                                    访问日志聚合
                                </span>
                            )}
                        </div>
                        <span className="text-xs font-mono">{dailyTrends.length} 天</span>
                    </div>
                    <TrendChart data={dailyTrends} isDarkMode={isDarkMode} />
                    {aggregatedLoading && <p className={`text-xs mt-2 ${textMuted}`}>正在从访问日志聚合趋势...</p>}
                    {aggregatedError && <p className="text-xs mt-2 text-red-500">{aggregatedError}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-4">
                        <div className={`p-3 rounded-xl ${surface}`}>最高日 PV：{formatNumber(peakViews, "0")}</div>
                        <div className={`p-3 rounded-xl ${surface}`}>最高日 UV：{formatNumber(peakVisitors, "0")}</div>
                        <div className={`p-3 rounded-xl ${surface}`}>
                            最近一日 PV/UV：{formatNumber(lastPoint.views, "0")}/{formatNumber(lastPoint.visitors, "0")}
                        </div>
                    </div>
                </div>
                <div
                    className={`${surface} ${border} rounded-2xl p-6 shadow-xl flex flex-col`}
                    style={trendCardHeight ? { height: `${trendCardHeight}px` } : undefined}
                >
                    <h3 className={`text-xl font-bold ${textPrimary}`}>流量来源</h3>
                    <p className={`text-xs ${textMuted} mb-4`}>analytics_traffic_sources 实时占比</p>
                    {trafficSources.length === 0 ? (
                        <p className={`text-sm ${textMuted}`}>暂无流量来源统计</p>
                    ) : (
                        <div className={`flex-1 min-h-0 overflow-y-auto pr-1 ${scrollBarClass}`}>
                            <div className="space-y-3">
                                {trafficSources.map((source, index) => (
                                    <div key={`${source.label}-${index}`}>
                                        <div className="flex items-center justify-between text-sm">
                                            <span>{decodeMaybeUrlEncoded(source.label)}</span>
                                            <span className="font-semibold">{Math.round(source.value * 10) / 10}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-[#FF0080] to-[#6366F1]"
                                                style={{ width: `${Math.min(source.value, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TrendChart = ({ data, isDarkMode }) => {
    const textMuted = isDarkMode ? "text-gray-400" : "text-gray-500";
    const chartWrapperRef = useRef(null);
    const tooltipRef = useRef(null);
    const [hoverIndex, setHoverIndex] = useState(null);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const [viewport, setViewport] = useState({
        width: 0,
        height: 0,
        contentW: 0,
        contentH: 0,
        offsetX: 0,
        offsetY: 0,
        viewBoxWidth: 100
    });
    const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

    const gridColor = isDarkMode ? "#2e3445" : "#E5E7EB";
    const accentPv = "#FF0080";
    const accentUv = "#16A34A";
    const surfaceBg = isDarkMode ? "#0b1220" : "#f8fafc";
    const safeData = Array.isArray(data) ? data.filter(Boolean) : [];

    const normalized = safeData.map((item, index) => ({
        views: Number(item?.views || 0),
        visitors: Number(item?.visitors || 0),
        dateKey: (item?.date || '').slice(0, 10),
        dateLabel: (item?.date || '').slice(5) || `D${index + 1}`,
    }));

    const maxValue = Math.max(...normalized.map((n) => Math.max(n.views, n.visitors)), 0);
    const niceMax = (() => {
        if (maxValue <= 5) return 5;
        if (maxValue <= 10) return 10;
        const pow = 10 ** Math.floor(Math.log10(maxValue || 1));
        const ceilings = [1, 2, 5, 10];
        for (const c of ceilings) {
            if (maxValue <= c * pow) return c * pow;
        }
        return 10 * pow;
    })();
    const hasNonZero = maxValue > 0;
    const paddingY = 10;
    const paddingLeft = 12;
    const paddingRight = 6;
    const viewBoxWidth = viewport.viewBoxWidth || 100;
    const chartHeight = 100 - paddingY * 2;
    const chartWidth = viewBoxWidth - paddingLeft - paddingRight;

    const count = Math.max(normalized.length, 1);
    const stepX = chartWidth / count;
    const barWidth = Math.max(stepX * 0.66, 0.9);
    const barOffset = (stepX - barWidth) / 2;
    const baseline = 100 - paddingY;

    const projectY = (value) => {
        if (!hasNonZero) {
            // 避免全 0 时折线贴底不可见
            return baseline - chartHeight * 0.12;
        }
        return baseline - (value / niceMax) * chartHeight;
    };

    const buildLinePoints = (key) =>
        normalized
            .map((item, index) => {
                const x = paddingLeft + index * stepX + stepX / 2;
                const y = projectY(item[key]);
                return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ");

    const uvPoints = buildLinePoints("visitors");

    const yTicks = 5;
    const yLabels = Array.from({ length: yTicks + 1 }, (_, idx) => {
        const v = Math.round((niceMax / yTicks) * idx);
        const y = 100 - paddingY - (v / niceMax) * chartHeight;
        return { v, y };
    });

    const formatNumber = (value) => {
        const n = Number(value || 0);
        return Number.isFinite(n) ? n.toLocaleString() : "0";
    };

    const computeViewport = useCallback(() => {
        const rect = chartWrapperRef.current?.getBoundingClientRect?.();
        if (!rect || rect.width === 0 || rect.height === 0) return;
        const ratio = rect.width / rect.height;
        const vbw = Math.max(1, ratio * 100);
        setViewport({
            width: rect.width,
            height: rect.height,
            contentW: rect.width,
            contentH: rect.height,
            offsetX: 0,
            offsetY: 0,
            viewBoxWidth: vbw
        });
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const schedule = () => computeViewport();
        const raf = window.requestAnimationFrame(schedule);
        const t1 = window.setTimeout(schedule, 0);
        const t2 = window.setTimeout(schedule, 120);
        const t3 = window.setTimeout(schedule, 320);
        let resizeObserver;
        if (typeof ResizeObserver !== 'undefined' && chartWrapperRef.current) {
            resizeObserver = new ResizeObserver(() => computeViewport());
            resizeObserver.observe(chartWrapperRef.current);
        } else {
            window.addEventListener('resize', computeViewport);
        }
        return () => {
            window.cancelAnimationFrame(raf);
            window.clearTimeout(t1);
            window.clearTimeout(t2);
            window.clearTimeout(t3);
            if (resizeObserver) {
                resizeObserver.disconnect();
            } else {
                window.removeEventListener('resize', computeViewport);
            }
        };
    }, [computeViewport, safeData.length]);

    const handleHoverMove = (index, e) => {
        setHoverIndex(index);
        const rect = chartWrapperRef.current?.getBoundingClientRect?.();
        if (!rect) return;
        setHoverPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const handleHoverLeave = () => {
        setHoverIndex(null);
    };

    const hoverItem = (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < normalized.length)
        ? normalized[hoverIndex]
        : null;

    useEffect(() => {
        if (!hoverItem || !tooltipRef.current) return;
        const rect = tooltipRef.current.getBoundingClientRect();
        setTooltipSize({ width: rect.width, height: rect.height });
    }, [hoverItem, hoverIndex, isDarkMode]);

    const hoverAnchor = hoverItem
        ? (paddingLeft + hoverIndex * stepX + stepX / 2)
        : 0;
    const anchorPx = viewport.contentW
        ? (hoverAnchor / viewBoxWidth) * viewport.contentW
        : hoverPos.x;
    const tooltipPadding = 8;
    const tooltipLeft = (() => {
        if (!hoverItem) return 0;
        const width = tooltipSize.width || 0;
        if (!viewport.width || width <= 0) {
            return Math.max(tooltipPadding, hoverPos.x + 12);
        }
        const minX = tooltipPadding;
        const maxX = Math.max(minX, viewport.width - width - tooltipPadding);
        const target = anchorPx - width / 2;
        return Math.min(Math.max(target, minX), maxX);
    })();
    const tooltipTop = (() => {
        if (!hoverItem) return 0;
        const height = tooltipSize.height || 0;
        const target = height > 0 ? (hoverPos.y - height - 12) : (hoverPos.y - 44);
        if (!viewport.height || height <= 0) {
            return Math.max(tooltipPadding, target);
        }
        const minY = tooltipPadding;
        const maxY = Math.max(minY, viewport.height - height - tooltipPadding);
        return Math.min(Math.max(target, minY), maxY);
    })();

    if (!safeData.length) {
        return <p className={`mt-6 text-sm ${textMuted}`}>暂无趋势数据</p>;
    }

    return (
        <div className="mt-6">
            <div className="relative" ref={chartWrapperRef}>
                <svg viewBox={`0 0 ${viewBoxWidth} 100`} className="w-full h-60" preserveAspectRatio="xMidYMid meet">
                    <rect x="0" y="0" width={viewBoxWidth} height="100" fill={surfaceBg} />
                    {yLabels.map((tick, idx) => (
                        <g key={`grid-${idx}`}>
                            <line
                                x1={paddingLeft}
                                x2={paddingLeft + chartWidth}
                                y1={tick.y}
                                y2={tick.y}
                                stroke={gridColor}
                                strokeWidth="0.35"
                                strokeDasharray="1.5 2.5"
                            />
                            <text
                                x={paddingLeft - 3}
                                y={tick.y + 2.5}
                                fontSize="4"
                                textAnchor="end"
                                fill={isDarkMode ? "#cbd5e1" : "#475569"}
                            >
                                {tick.v}
                            </text>
                        </g>
                    ))}

                    {/* PV：柱状 */}
                    {normalized.map((item, index) => {
                        const barX = paddingLeft + index * stepX + barOffset;
                        const barTop = projectY(item.views);
                        const barHeight = Math.max(baseline - barTop, 0);
                        const active = hoverIndex === index;
                        return (
                            <rect
                                key={`pv-bar-${index}`}
                                x={barX}
                                y={barTop}
                                width={barWidth}
                                height={barHeight}
                                rx="0.4"
                                fill={accentPv}
                                opacity={active ? 0.92 : (isDarkMode ? 0.55 : 0.42)}
                            />
                        );
                    })}

                    {/* UV：折线 */}
                    <polyline
                        fill="none"
                        stroke={accentUv}
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={uvPoints}
                    />
                    {normalized.map((item, index) => {
                        const x = paddingLeft + index * stepX + stepX / 2;
                        const y = projectY(item.visitors);
                        const active = hoverIndex === index;
                        return (
                            <circle
                                key={`uv-dot-${index}`}
                                cx={x}
                                cy={y}
                                r={active ? 2.1 : 1.45}
                                fill={accentUv}
                                stroke={isDarkMode ? "#0f172a" : "#fff"}
                                strokeWidth="0.6"
                            />
                        );
                    })}

                    {/* Hover：命中区域（按天覆盖整列） */}
                    {normalized.map((_, index) => {
                        const hitX = paddingLeft + index * stepX;
                        return (
                            <rect
                                key={`hit-${index}`}
                                x={hitX}
                                y={paddingY}
                                width={stepX}
                                height={chartHeight}
                                fill="transparent"
                                onMouseMove={(e) => handleHoverMove(index, e)}
                                onMouseEnter={(e) => handleHoverMove(index, e)}
                                onMouseLeave={handleHoverLeave}
                            />
                        );
                    })}

                    {/* Hover：竖向指示线 */}
                    {hoverItem && (
                        <line
                            x1={paddingLeft + hoverIndex * stepX + stepX / 2}
                            x2={paddingLeft + hoverIndex * stepX + stepX / 2}
                            y1={paddingY}
                            y2={baseline}
                            stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                            strokeWidth="0.35"
                            strokeDasharray="1.5 2.5"
                            opacity={0.8}
                            pointerEvents="none"
                        />
                    )}
                </svg>
                {!hasNonZero && (
                    <p className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-amber-600/80">
                        暂无有效访问，已展示占位折线
                    </p>
                )}
                {hoverItem && (
                    <div
                        ref={tooltipRef}
                        className={`absolute z-10 pointer-events-none px-3 py-2 rounded-lg text-xs font-medium shadow-xl border ${
                            isDarkMode
                                ? "bg-gray-900 text-gray-100 border-gray-700"
                                : "bg-white text-gray-900 border-gray-200"
                        }`}
                        style={{
                            left: tooltipLeft,
                            top: tooltipTop,
                        }}
                    >
                        <div className="font-mono">{hoverItem.dateKey || hoverItem.dateLabel}</div>
                        <div className="mt-0.5">PV：{formatNumber(hoverItem.views)} UV：{formatNumber(hoverItem.visitors)}</div>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4 text-xs mt-4">
                <span className="flex items-center gap-2 text-[#FF0080]">
                    <span className="w-3 h-3 rounded-sm bg-[#FF0080]" /> PV（柱）
                </span>
                <span className="flex items-center gap-2 text-emerald-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> UV（线）
                </span>
                <span className={`text-[11px] ${textMuted}`}>鼠标悬浮到某天即可查看 PV/UV</span>
            </div>
            <div className="relative mt-2 h-4 text-[10px] uppercase tracking-widest text-gray-400">
                {normalized.map((item, index) => {
                    const x = paddingLeft + index * stepX + stepX / 2;
                    const leftPx = viewport.contentW
                        ? (x / viewBoxWidth) * viewport.contentW
                        : null;
                    return (
                        <span
                            key={`${item.dateLabel}-${index}`}
                            className="absolute -translate-x-1/2 text-center pointer-events-none"
                            style={{ left: leftPx !== null ? `${leftPx}px` : `${x.toFixed(2)}%` }}
                        >
                            {item.dateLabel}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

// 4.2 Sub-Component: Analytics View (实时访问日志)
const AnalyticsView = ({ isDarkMode, user }) => {
    const { reload } = useAdminAnalytics();
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [clearing, setClearing] = useState(false);
    const [actionMessage, setActionMessage] = useState('');
    const [copyToast, setCopyToast] = useState('');
    const copyToastTimer = useRef(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [deleting, setDeleting] = useState(false);
    const [hideRobotsAndSitemap, setHideRobotsAndSitemap] = useState(true);
    const [filtersDraft, setFiltersDraft] = useState({
        keyword: '',
        ip: '',
        postId: '',
        pageType: 'all',
        loggedIn: 'all',
        start: '',
        end: ''
    });
    const [filtersApplied, setFiltersApplied] = useState({});
    const startDateInputRef = useRef(null);
    const endDateInputRef = useRef(null);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const { confirm, confirmDialog } = useAdminConfirmDialog(isDarkMode);

    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const border = isDarkMode ? 'border border-gray-700' : 'border border-gray-200';
    const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const refreshButtonClass = [
        'px-3 py-1 text-sm font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isDarkMode
            ? 'border border-gray-700 bg-gray-900 text-gray-100 hover:bg-gray-800 focus-visible:ring-indigo-400 focus-visible:ring-offset-gray-900'
            : 'bg-black text-white hover:bg-gray-800 focus-visible:ring-gray-700 focus-visible:ring-offset-white'
    ].join(' ');

    useEffect(() => {
        return () => {
            if (copyToastTimer.current) {
                clearTimeout(copyToastTimer.current);
            }
        };
    }, []);

    const renderReferrer = (referrer) => {
        if (!referrer) return '未知来源';
        const normalized = decodeMaybeUrlEncoded(referrer);
        if (/^(https?:)?\/\//i.test(normalized)) {
            let label = normalized;
            try {
                const parsed = new URL(normalized);
                label = `外部链接：${parsed.hostname}`;
            } catch {
                label = normalized;
            }
            return <a className="text-indigo-500 hover:underline" href={normalized} target="_blank"
                rel="noopener noreferrer">{label}</a>;
        }
        return normalized;
    };

    const normalizeVisitorAvatarPath = (rawValue) => {
        if (!rawValue || typeof rawValue !== 'string') return '';
        const trimmed = rawValue.trim();
        if (!trimmed) return '';
        if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;

        const uploadsPrefix = '/uploads/';
        let normalized = trimmed.replace(/\\/g, '/');
        if (!normalized.startsWith('/')) normalized = `/${normalized}`;

        if (normalized.startsWith('/avatar/')) {
            normalized = `${uploadsPrefix.slice(0, -1)}${normalized}`;
        } else if (normalized.startsWith(uploadsPrefix)) {
            const rest = normalized.slice(uploadsPrefix.length).replace(/^\/+/, '');
            if (!rest.startsWith('avatar/')) {
                normalized = `${uploadsPrefix}avatar/${rest}`;
            } else {
                normalized = `${uploadsPrefix}${rest}`;
            }
        } else {
            normalized = `${uploadsPrefix}avatar/${normalized.replace(/^\/+/, '')}`;
        }

        return normalized.replace(/\/{2,}/g, '/');
    };

    const resolveVisitorAvatar = (visit) => {
        const rawPath = visit?.avatar || visit?.avatarPath || visit?.avatarUrl || visit?.avatar_url;
        const normalized = normalizeVisitorAvatarPath(rawPath);
        if (!normalized) return '';
        return buildAssetUrl(normalized, '');
    };

    const renderUserBadge = (visit) => {
        if (!visit?.loggedIn) {
            return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">访客</span>;
        }

        const userId = visit.userId ?? visit.user_id ?? '-';
        const username = visit.username || visit.userName || visit.user_name || '-';
        const displayName = visit.displayName
            || visit.display_name
            || visit.userName
            || visit.nickName
            || visit.nickname
            || username
            || '-';
        const title = `${userId}-${username}-${displayName}`;
        const avatarSrc = resolveVisitorAvatar(visit);
        const initials = (displayName || 'U').slice(0, 1).toUpperCase();

        return (
            <div className="flex items-center gap-2" title={title}>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-pink-500 to-indigo-500 text-white flex items-center justify-center text-sm font-bold">
                    {avatarSrc
                        ? <img src={avatarSrc} alt={displayName || 'user'} className="w-full h-full object-cover" />
                        : initials}
                </div>
            </div>
        );
    };

    const loadLogs = useCallback(async (targetPage = 1, targetSize = 20, filters = {}, excludeSystemPagesOverride) => {
        setLoading(true);
        setError('');
        try {
            const excludeSystemPages = typeof excludeSystemPagesOverride === 'boolean'
                ? excludeSystemPagesOverride
                : hideRobotsAndSitemap === true;

            const normalizedFilters = (filters || {});
            const rawPageType = typeof normalizedFilters.pageType === 'string'
                ? normalizedFilters.pageType.trim().toLowerCase()
                : '';
            const pageType = rawPageType && rawPageType !== 'all'
                ? rawPageType.toUpperCase()
                : undefined;
            const effectiveExcludeSystemPages = (pageType === 'ROBOT' || pageType === 'SYSTEM')
                ? false
                : excludeSystemPages;

            const res = await adminFetchPageViewLogs({
                page: targetPage,
                size: targetSize,
                ...normalizedFilters,
                pageType,
                excludeSystemPages: effectiveExcludeSystemPages,
            });
            const data = res.data || res;
            const records = data.records || [];
            setLogs(records);
            setSelectedIds((prev) => {
                const available = new Set(records.map((item) => item.id));
                return prev.filter((id) => available.has(id));
            });
            setTotal(Number(data.total || 0));
            setPage(Number(data.page || targetPage));
            setSize(Number(data.size || targetSize));
        } catch (err) {
            setError(err.message || '加载访问日志失败');
        } finally {
            setLoading(false);
        }
    }, [hideRobotsAndSitemap]);

    const initLoadedRef = useRef(false);
    useEffect(() => {
        if (initLoadedRef.current) return;
        initLoadedRef.current = true;
        loadLogs(1, size, filtersApplied);
    }, [loadLogs, size, filtersApplied]);

    const totalPages = Math.max(1, Math.ceil((total || 0) / size) || 1);
    const allSelected = logs.length > 0 && selectedIds.length === logs.length;
    const hasSelection = selectedIds.length > 0;
    const paginationItems = useMemo(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const items = [1];
        const windowStart = Math.max(2, page - 1);
        const windowEnd = Math.min(totalPages - 1, page + 1);
        if (windowStart > 2) {
            items.push('ellipsis-left');
        }
        for (let p = windowStart; p <= windowEnd; p += 1) {
            items.push(p);
        }
        if (windowEnd < totalPages - 1) {
            items.push('ellipsis-right');
        }
        items.push(totalPages);
        return items;
    }, [page, totalPages]);

    const handlePageChange = (target) => {
        const safe = Math.min(Math.max(target, 1), totalPages);
        loadLogs(safe, size, filtersApplied);
    };

    const handleSizeChange = (nextSize) => {
        const parsed = Number(nextSize);
        if (!parsed || parsed < 1) return;
        loadLogs(1, parsed, filtersApplied);
    };

    const normalizeDateFilterValue = useCallback((rawValue) => {
        if (typeof rawValue !== 'string') return '';
        const normalized = rawValue.trim().replace(/[./]/g, '-');
        if (!normalized) return '';
        const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (!match) return '';
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';
        if (month < 1 || month > 12 || day < 1 || day > 31) return '';
        const candidate = new Date(Date.UTC(year, month - 1, day));
        if (
            candidate.getUTCFullYear() !== year
            || candidate.getUTCMonth() !== month - 1
            || candidate.getUTCDate() !== day
        ) {
            return '';
        }
        return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }, []);

    const formatDateFilterDisplay = useCallback((rawValue) => {
        const normalized = normalizeDateFilterValue(rawValue);
        return normalized ? normalized.replace(/-/g, '/') : '';
    }, [normalizeDateFilterValue]);

    const openNativeDatePicker = useCallback((inputRef) => {
        const input = inputRef?.current;
        if (!input) return;
        if (typeof input.showPicker === 'function') {
            input.showPicker();
            return;
        }
        input.focus();
        input.click();
    }, []);

    const normalizeFilters = useCallback((draft = {}) => {
        const keyword = typeof draft.keyword === 'string' ? draft.keyword.trim() : '';
        const ip = typeof draft.ip === 'string' ? draft.ip.trim() : '';
        const postIdRaw = typeof draft.postId === 'string' ? draft.postId.trim() : '';
        const postId = postIdRaw ? Number(postIdRaw) : null;
        const start = normalizeDateFilterValue(draft.start);
        const end = normalizeDateFilterValue(draft.end);
        const pageTypeRaw = typeof draft.pageType === 'string' ? draft.pageType.trim() : '';
        const loggedInRaw = draft.loggedIn;
        const loggedIn = loggedInRaw === 'true' ? true : (loggedInRaw === 'false' ? false : undefined);

        const next = {};
        if (keyword) next.keyword = keyword;
        if (ip) next.ip = ip;
        if (Number.isFinite(postId) && postId > 0) next.postId = postId;
        if (pageTypeRaw && pageTypeRaw !== 'all') next.pageType = pageTypeRaw;
        if (loggedIn !== undefined) next.loggedIn = loggedIn;
        if (start) next.start = start;
        if (end) next.end = end;
        return next;
    }, [normalizeDateFilterValue]);

    const applyFiltersFromDraft = useCallback((nextDraft) => {
        setFiltersDraft(nextDraft);
        const next = normalizeFilters(nextDraft);
        setFiltersApplied(next);
        loadLogs(1, size, next);
    }, [loadLogs, normalizeFilters, size]);

    const applyFilters = useCallback(() => {
        const next = normalizeFilters(filtersDraft);
        setFiltersApplied(next);
        loadLogs(1, size, next);
    }, [filtersDraft, loadLogs, normalizeFilters, size]);

    const resetFilters = useCallback(() => {
        const clearedDraft = { keyword: '', ip: '', postId: '', pageType: 'all', loggedIn: 'all', start: '', end: '' };
        setFiltersDraft(clearedDraft);
        setFiltersApplied({});
        setHideRobotsAndSitemap(false);
        loadLogs(1, size, {}, false);
    }, [loadLogs, size]);

    const handleClearLogs = async () => {
        if (!isSuperAdmin) return;
        const confirmed = await confirm({
            title: '清理我的访问日志',
            description: '确定要删除你在本站的所有访问日志吗？该操作仅影响当前登录账户，删除后不可恢复。',
            confirmText: '确认清理'
        });
        if (!confirmed) return;
        setClearing(true);
        setActionMessage('');
        try {
            await adminDeleteMyAnalyticsLogs();
            setActionMessage('已清理当前账户的访问日志。');
            await loadLogs(1, size, filtersApplied);
            if (reload) reload();
        } catch (err) {
            setActionMessage(err.message || '清理失败，请稍后重试。');
        } finally {
            setClearing(false);
        }
    };

    const toggleSelectAll = () => {
        if (!isSuperAdmin || !logs.length) return;
        const allIds = logs.map((item) => item.id).filter(Boolean);
        if (selectedIds.length === allIds.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(allIds);
        }
    };

    const toggleSelectOne = (id) => {
        if (!isSuperAdmin || !id) return;
        setSelectedIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((value) => value !== id);
            }
            return [...prev, id];
        });
    };

    const handleDeleteOne = async (id) => {
        if (!isSuperAdmin || !id) return;
        const confirmed = await confirm({
            title: '删除访问日志',
            description: '确认删除这条访问日志吗？删除后无法从后台恢复。',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        setDeleting(true);
        setActionMessage('');
        try {
            await adminDeletePageViewLog(id);
            setActionMessage('已删除 1 条访问日志。');
            const nextPage = logs.length === 1 && page > 1 ? page - 1 : page;
            await loadLogs(nextPage, size, filtersApplied);
            if (reload) reload();
        } catch (err) {
            setError(err.message || '删除失败，请稍后再试。');
        } finally {
            setDeleting(false);
        }
    };

    const handleBatchDelete = async () => {
        if (!isSuperAdmin || !selectedIds.length) return;
        const confirmed = await confirm({
            title: '批量删除访问日志',
            description: `确认删除选中的 ${selectedIds.length} 条访问日志吗？该批量操作不可恢复。`,
            confirmText: '确认批量删除'
        });
        if (!confirmed) return;
        setDeleting(true);
        setActionMessage('');
        try {
            await adminDeletePageViewLogs(selectedIds);
            setActionMessage(`已删除 ${selectedIds.length} 条访问日志。`);
            const nextPage = selectedIds.length >= logs.length && page > 1 ? page - 1 : page;
            setSelectedIds([]);
            await loadLogs(nextPage, size, filtersApplied);
            if (reload) reload();
        } catch (err) {
            setError(err.message || '批量删除失败，请稍后再试。');
        } finally {
            setDeleting(false);
        }
    };

    const handleCopyIp = async (ip) => {
        if (!ip) return;
        try {
            await navigator.clipboard.writeText(ip);
            setActionMessage('');
            setCopyToast(`已复制 IP：${ip}`);
        } catch {
            setCopyToast('复制失败，请手动复制该 IP。');
        } finally {
            if (copyToastTimer.current) {
                clearTimeout(copyToastTimer.current);
            }
            copyToastTimer.current = setTimeout(() => setCopyToast(''), 2500);
        }
    };

    return (
        <>
            {confirmDialog}
            <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-black flex items-center gap-2"><TrendingUp /> 实时访问日志</h2>
                    <p className={`text-sm ${textMuted}`}>按时间倒序展示 analytics_page_views 全量记录，含 IP / 用户 / 来源 / 地理位置。</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className={`${border} px-3 py-1 rounded-full text-sm`}>共 {total.toLocaleString()} 条</div>
                    <select
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors shadow-sm ${isDarkMode
                            ? 'bg-gray-900/70 border-gray-700 text-gray-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40'
                            : 'bg-white border-gray-200 text-gray-800 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/80'
                        }`}
                        value={size}
                        onChange={(e) => handleSizeChange(e.target.value)}
                    >
                        {[10, 20, 50, 100].map((opt) => (
                            <option key={opt} value={opt}>{opt} 条/页</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => loadLogs(page, size, filtersApplied)}
                        className={refreshButtonClass}
                    >
                        刷新
                    </button>
                    {isSuperAdmin && (
                        <button
                            type="button"
                            onClick={handleBatchDelete}
                            disabled={!hasSelection || deleting || loading}
                            className="px-3 py-1 text-sm font-semibold border-2 border-red-500 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50"
                        >
                            {deleting ? '删除中...' : `批量删除${hasSelection ? `(${selectedIds.length})` : ''}`}
                        </button>
                    )}
                    {isSuperAdmin && (
                        <button
                            type="button"
                            onClick={handleClearLogs}
                            disabled={clearing}
                            className="px-3 py-1 text-sm font-bold border-2 border-red-600 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50"
                        >
                            {clearing ? '清理中...' : '清理我的访问日志'}
                        </button>
                    )}
                </div>
            </div>

            <div className={`${surface} ${border} rounded-2xl p-4 shadow-md`}>
                <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
                    <div className="md:col-span-2">
                        <div className={`text-xs mb-1 ${textMuted}`}>关键词（标题/来源/地理/slug）</div>
                        <input
                            value={filtersDraft.keyword}
                            onChange={(e) => setFiltersDraft((prev) => ({ ...prev, keyword: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') applyFilters();
                            }}
                            placeholder="例如：home(1/16)、google、上海、mybatis..."
                            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${isDarkMode
                                ? 'bg-gray-900/60 border-gray-700 text-gray-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30'
                                : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/80'
                            }`}
                        />
                    </div>
                    <div>
                        <div className={`text-xs mb-1 ${textMuted}`}>访客 IP（精确匹配）</div>
                        <input
                            value={filtersDraft.ip}
                            onChange={(e) => setFiltersDraft((prev) => ({ ...prev, ip: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') applyFilters();
                            }}
                            placeholder="例如：1.2.3.4"
                            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${isDarkMode
                                ? 'bg-gray-900/60 border-gray-700 text-gray-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30'
                                : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/80'
                            }`}
                        />
                    </div>
                    <div>
                        <div className={`text-xs mb-1 ${textMuted}`}>文章 ID（可选）</div>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={filtersDraft.postId}
                            onChange={(e) => setFiltersDraft((prev) => ({ ...prev, postId: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') applyFilters();
                            }}
                            placeholder="例如：123"
                            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${isDarkMode
                                ? 'bg-gray-900/60 border-gray-700 text-gray-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30'
                                : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/80'
                            }`}
                        />
                    </div>
                    <div>
                        <div className={`text-xs mb-1 ${textMuted}`}>页面类型</div>
                        <select
                            value={filtersDraft.pageType}
                            onChange={(e) => {
                                const nextValue = e.target.value;
                                if (String(nextValue).toLowerCase() === 'robot') {
                                    setHideRobotsAndSitemap(false);
                                }
                                applyFiltersFromDraft({ ...filtersDraft, pageType: nextValue });
                            }}
                            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${isDarkMode
                                ? 'bg-gray-900/60 border-gray-700 text-gray-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30'
                                : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/80'
                            }`}
                        >
                            <option value="all">全部</option>
                            <option value="article">文章访问</option>
                            <option value="page">普通页面</option>
                            <option value="robot">机器页面（robots/sitemap）</option>
                        </select>
                    </div>
                    <div>
                        <div className={`text-xs mb-1 ${textMuted}`}>用户状态</div>
                        <select
                            value={filtersDraft.loggedIn}
                            onChange={(e) => {
                                const nextValue = e.target.value;
                                applyFiltersFromDraft({ ...filtersDraft, loggedIn: nextValue });
                            }}
                            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${isDarkMode
                                ? 'bg-gray-900/60 border-gray-700 text-gray-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30'
                                : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/80'
                            }`}
                        >
                            <option value="all">全部</option>
                            <option value="true">已登录</option>
                            <option value="false">访客</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <div className={`text-xs mb-1 ${textMuted}`}>起始日期</div>
                        <div className="relative w-full md:ml-auto md:max-w-[168px]">
                            <input
                                ref={startDateInputRef}
                                type="date"
                                tabIndex={-1}
                                aria-hidden="true"
                                value={normalizeDateFilterValue(filtersDraft.start)}
                                onChange={(e) => setFiltersDraft((prev) => ({ ...prev, start: e.target.value }))}
                                className="sg-date-input-picker"
                            />
                            <button
                                type="button"
                                onClick={() => openNativeDatePicker(startDateInputRef)}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${isDarkMode
                                    ? 'bg-gray-900/60 border-gray-700 text-gray-100 hover:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/30'
                                    : 'bg-white border-gray-200 text-gray-900 hover:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-200/80'
                                }`}
                            >
                                <span className={`min-w-0 truncate text-left ${filtersDraft.start ? '' : 'text-gray-400'}`}>
                                    {formatDateFilterDisplay(filtersDraft.start) || 'yyyy/mm/dd'}
                                </span>
                                <Calendar size={16} className="shrink-0" />
                            </button>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <div className={`text-xs mb-1 ${textMuted}`}>结束日期</div>
                        <div className="relative w-full md:ml-auto md:max-w-[168px]">
                            <input
                                ref={endDateInputRef}
                                type="date"
                                tabIndex={-1}
                                aria-hidden="true"
                                value={normalizeDateFilterValue(filtersDraft.end)}
                                onChange={(e) => setFiltersDraft((prev) => ({ ...prev, end: e.target.value }))}
                                className="sg-date-input-picker"
                            />
                            <button
                                type="button"
                                onClick={() => openNativeDatePicker(endDateInputRef)}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${isDarkMode
                                    ? 'bg-gray-900/60 border-gray-700 text-gray-100 hover:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/30'
                                    : 'bg-white border-gray-200 text-gray-900 hover:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-200/80'
                                }`}
                            >
                                <span className={`min-w-0 truncate text-left ${filtersDraft.end ? '' : 'text-gray-400'}`}>
                                    {formatDateFilterDisplay(filtersDraft.end) || 'yyyy/mm/dd'}
                                </span>
                                <Calendar size={16} className="shrink-0" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={applyFilters}
                        disabled={loading}
                        className={`px-4 py-2 text-sm font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-50 ${isDarkMode ? 'bg-[#FFD700] text-black' : 'bg-[#FFD700] text-black'}`}
                    >
                        查询
                    </button>
                    <button
                        type="button"
                        onClick={resetFilters}
                        disabled={loading}
                        className={`px-4 py-2 text-sm font-bold rounded-lg border disabled:opacity-50 ${isDarkMode ? 'bg-gray-900 text-gray-100 border-gray-700 hover:bg-gray-800' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
                    >
                        重置
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const next = !hideRobotsAndSitemap;
                            if (String(filtersDraft.pageType || '').toLowerCase() === 'robot') {
                                setHideRobotsAndSitemap(false);
                                loadLogs(1, size, filtersApplied, false);
                                return;
                            }
                            setHideRobotsAndSitemap(next);
                            loadLogs(1, size, filtersApplied, next);
                        }}
                        disabled={String(filtersDraft.pageType || '').toLowerCase() === 'robot'}
                        className={`px-4 py-2 text-sm font-bold rounded-lg border transition-colors disabled:opacity-50 ${
                            hideRobotsAndSitemap
                                ? (isDarkMode
                                    ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 hover:bg-indigo-500/30'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100')
                                : (isDarkMode
                                    ? 'bg-gray-900 text-gray-100 border-gray-700 hover:bg-gray-800'
                                    : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50')
                        }`}
                        title={String(filtersDraft.pageType || '').toLowerCase() === 'robot'
                            ? '当前已选择“机器页面”，无需再隐藏 robots/sitemap；如需使用隐藏开关，请先切换页面类型为“全部/文章访问/普通页面”。'
                            : '仅过滤显示，不会删除数据；点击“重置”可恢复显示'}
                    >
                        {hideRobotsAndSitemap ? '已隐藏 robots/sitemap（点击取消）' : '隐藏 robots/sitemap'}
                    </button>
                    <div className={`text-xs ${textMuted}`}>
                        提示：筛选条件仅影响列表；“条数/页”切换会自动回到第 1 页。
                    </div>
                </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {actionMessage && <p className="text-sm text-emerald-500">{actionMessage}</p>}
            {copyToast && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="px-5 py-3 rounded-lg shadow-2xl bg-emerald-500 text-white text-sm pointer-events-auto">
                        {copyToast}
                    </div>
                </div>
            )}

            <div className={`${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                {loading ? (
                    <p className={`text-sm ${textMuted}`}>数据加载中...</p>
                ) : logs.length === 0 ? (
                    <p className={`text-sm ${textMuted}`}>暂无访问记录</p>
                ) : (
                    <div className={`overflow-x-auto ${getAdminDarkScrollbarClass(isDarkMode)}`}>
                        <table className="min-w-full text-sm">
                            <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                                <tr>
                                    {isSuperAdmin && (
                                        <th className="px-4 py-3 text-left w-10">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={allSelected}
                                                onChange={toggleSelectAll}
                                                disabled={!logs.length}
                                            />
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-left">时间</th>
                                    <th className="px-4 py-3 text-left w-88">文章</th>
                                    <th className="px-4 py-3 text-left min-w-[150px]">访客 IP</th>
                                    <th className="px-4 py-3 text-left min-w-[120px]">用户</th>
                                    <th className="px-4 py-3 text-left min-w-[120px]">来源</th>
                                    <th className="px-4 py-3 text-left min-w-[48px]">地理</th>
                                    <th className="px-4 py-3 text-left min-w-[80px]">浏览时长</th>
                                    {isSuperAdmin && <th className="px-4 py-3 text-right">操作</th>}
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-200'}>
                                {logs.map((visit) => (
                                    <tr key={visit.id} className="align-top">
                                        {isSuperAdmin && (
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={selectedIds.includes(visit.id)}
                                                    onChange={() => toggleSelectOne(visit.id)}
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 font-mono whitespace-nowrap">{visit.time || '-'}</td>
                                        <td className="px-4 py-3 w-88">
                                            <p
                                                className="font-semibold truncate max-w-[352px]"
                                                title={visit.title || '未命名文章'}
                                            >
                                                {visit.title || '未命名文章'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 font-mono whitespace-nowrap min-w-[150px]">
                                            {visit.ip ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyIp(visit.ip)}
                                                    className="text-current hover:text-current focus:outline-none"
                                                    title="点击复制 IP"
                                                >
                                                    {visit.ip}
                                                </button>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 min-w-[120px]">
                                            {renderUserBadge(visit)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap min-w-[120px]">{renderReferrer(visit.referrer)}</td>
                                        <td className="px-4 py-3">{visit.geo || '未知'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap font-mono">{formatVisitDurationFromRecord(visit)}</td>
                                        {isSuperAdmin && (
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteOne(visit.id)}
                                                    disabled={deleting}
                                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold border border-red-500 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    <Trash2 size={14} />
                                                    删除
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <div className={`text-xs ${textMuted}`}>第 {page} / {totalPages} 页</div>
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                            className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"
                        >
                            上一页
                        </button>
                        {paginationItems.map((item) => {
                            if (typeof item === 'string') {
                                return (
                                    <span key={item} className={`px-1 text-sm ${textMuted}`}>
                                        ...
                                    </span>
                                );
                            }
                            const isActive = item === page;
                            return (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => handlePageChange(item)}
                                    disabled={isActive}
                                    className={[
                                        'px-3 py-1 text-sm rounded-md border disabled:opacity-60',
                                        isActive
                                            ? (isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                                            : (isDarkMode ? 'bg-gray-900 text-gray-100 border-gray-700 hover:bg-gray-800' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50')
                                    ].join(' ')}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {item}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages}
                            className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

// 4.3 Sub-Component: Create New Post (The most important module)
const CreatePostView = ({ isDarkMode }) => {
    const { categories } = useBlog();
    const { hasPermission, loading: permLoading } = usePermissionContext();
    const [tags, setTags] = useState([]);
    const [assetsFolder, setAssetsFolder] = useState("");
    const [title, setTitle] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [coverPreview, setCoverPreview] = useState("");
    const [coverUploading, setCoverUploading] = useState(false);
    const [mdContent, setMdContent] = useState("");
    const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
    const [hasManualThemeColor, setHasManualThemeColor] = useState(false);
    const mdHistoryRef = useRef([]);
    const mdFutureRef = useRef([]);
    const [markdownFileName, setMarkdownFileName] = useState("");
    const [selectedParentId, setSelectedParentId] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const [imageUploadMessage, setImageUploadMessage] = useState("");
    const [markdownMessage, setMarkdownMessage] = useState("");
    const [, setSubmitNotice] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [publishBanner, setPublishBanner] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [showInlineImageUpload, setShowInlineImageUpload] = useState(false);
    const { confirm, confirmDialog } = useAdminConfirmDialog(isDarkMode);
    const markdownFileInputRef = useRef(null);
    const markdownEditorRef = useRef(null);
    const inlineImageInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    const inputClass = `w-full p-3 border-2 rounded-md transition-all ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' : 'bg-white border-gray-300 text-black focus:border-indigo-500'}`;
    const markdownTextareaScrollbarClass = getAdminMarkdownScrollbarClass(isDarkMode);
    const adminDarkScrollbarClass = getAdminDarkScrollbarClass(isDarkMode);
    const normalizeCoverValue = useCallback((raw) => {
        if (!raw) return "";
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        const cleaned = raw.replace(/^\/+/, "");
        const prefixed = cleaned.startsWith("uploads/") ? cleaned : `uploads/${cleaned}`;
        return `/${prefixed}`;
    }, []);
    const updateCoverState = useCallback((raw) => {
        const normalized = normalizeCoverValue(raw);
        setCoverImage(normalized);
        setCoverPreview(normalized ? buildAssetUrl(normalized) : "");
    }, [normalizeCoverValue]);

    const ensureAssetsSlug = useCallback(async () => {
        if (assetsFolder) return assetsFolder;
        const res = await reservePostAssetsFolder();
        const data = res.data || res;
        if (!data?.folder) {
            throw new Error("未获取到资源标识");
        }
        setAssetsFolder(data.folder);
        return data.folder;
    }, [assetsFolder]);

    const handleCoverUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCoverUploading(true);
        setSubmitError("");
        try {
            const slug = await ensureAssetsSlug();
            const res = await uploadPostCover(file, slug);
            const data = res.data || res;
            const rawPath = data.path || data.url || data.filename || "";
            updateCoverState(rawPath);
            setSubmitNotice("封面已上传");
        } catch (error) {
            setSubmitError(error.message || "封面上传失败");
            setSubmitNotice("");
        } finally {
            setCoverUploading(false);
            if (event?.target) {
                event.target.value = null;
            }
        }
    };

    const handleRemoveCover = useCallback(() => {
        setCoverImage("");
        setCoverPreview("");
    }, []);

    const pushMdHistory = useCallback((value) => {
        mdHistoryRef.current.push(value);
        if (mdHistoryRef.current.length > 200) {
            mdHistoryRef.current.shift();
        }
    }, []);

    const applyMdContent = useCallback((next) => {
        pushMdHistory(mdContent);
        mdFutureRef.current = [];
        setMdContent(next);
    }, [mdContent, pushMdHistory]);

    useEffect(() => {
        const loadTags = async () => {
            try {
                const res = await fetchTags();
                const data = res.data || res;
                setTags(data || []);
            } catch (error) {
                setSubmitError(error.message || "标签加载失败");
                setSubmitNotice("");
            }
        };
        loadTags();
    }, []);

    const normalizedCategories = useMemo(() => {
        return (categories || []).filter((cat) => typeof cat.id === "number");
    }, [categories]);

    const activeParent = normalizedCategories.find((cat) => Number(cat.id) === selectedParentId) || normalizedCategories[0];
    useEffect(() => {
        if (activeParent) {
            const parentId = Number(activeParent.id);
            if (selectedParentId !== parentId) {
                setSelectedParentId(parentId);
                setSelectedCategoryId(null);
            }
        }
    }, [activeParent, selectedParentId]);

    const secondLevelCategories = activeParent?.children || [];

    const handleFolderReserve = async () => {
        try {
            const res = await reservePostAssetsFolder();
            const data = res.data || res;
            if (data?.folder) {
                setAssetsFolder(data.folder);
                setImageUploadMessage(`已生成资源 slug：${data.folder}`);
            }
        } catch (error) {
            setImageUploadMessage(error.message || "无法生成目录");
        }
    };

    const handleInlineImageUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        setUploadingImages(true);
        setImageUploadMessage("图片上传中...");
        try {
            const slug = await ensureAssetsSlug();
            const res = await uploadPostAssets(files, slug);
            const data = res.data || res;
            if (data?.folder && data.folder !== assetsFolder) setAssetsFolder(data.folder);
            const urls = data?.urls || [];

            const uploaded = urls.length;
            if (!uploaded) {
                setImageUploadMessage("上传成功");
            } else {
                const filenameToUrl = {};
                files.forEach((file, idx) => {
                    const url = urls[idx] || urls[urls.length - 1];
                    filenameToUrl[file.name] = url;
                });

                const beforeCount = countImagesInContent(mdContent);
                let replacedCount = 0;
                let nextContent = mdContent.replace(/!\[[^\]]*]\(([^)]+)\)/g, (full, path) => {
                    const filename = path.split(/[/\\\\]/).pop();
                    if (filename && filenameToUrl[filename]) {
                        const url = filenameToUrl[filename];
                        delete filenameToUrl[filename];
                        replacedCount += 1;
                        return full.replace(path, url);
                    }
                    return full;
                });

                const remainingUrls = Object.values(filenameToUrl);
                if (remainingUrls.length) {
                    const snippet = remainingUrls.map((url, index) => `![${files[index]?.name || `图片${index + 1}`}](${url})`).join("\n");
                    const prefix = nextContent.endsWith("\n") || nextContent.length === 0 ? "" : "\n";
                    nextContent = `${nextContent}${prefix}${snippet}\n`;
                }

                applyMdContent(nextContent);

                const message = `已上传 ${uploaded} 张，匹配替换 ${replacedCount} 张`;
                const totalDetected = beforeCount;
                const complete = totalDetected === 0 || replacedCount === totalDetected;
                setImageUploadMessage(`${message}，${complete ? '导入成功！' : '自动导入不全，请手动导入！'}`);
            }
        } catch (error) {
            setImageUploadMessage(error.message || "图片上传失败");
        } finally {
            setUploadingImages(false);
            if (event?.target) {
                event.target.value = null;
            }
        }
    };

    const handleMarkdownUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const extractTitleFromFilename = (filename) => {
            if (!filename) return "";
            const nameWithoutExt = filename.replace(/\.(md|markdown|txt)$/i, "");
            const dashIndex = nameWithoutExt.indexOf("-");
            if (dashIndex === -1) return nameWithoutExt.trim();
            return nameWithoutExt.slice(dashIndex + 1).trim();
        };

        const extractSummaryAndBody = (content) => {
            const lines = content.split(/\r?\n/);
            let summary = "";
            let summaryLineIndex = -1;
            for (let i = 0; i < lines.length; i += 1) {
                const match = lines[i].match(/^\s*>\s?(.*)$/);
                if (match && match[1]) {
                    summary = match[1].trim();
                    summaryLineIndex = i;
                    break;
                }
            }
            if (summaryLineIndex >= 0) {
                const bodyLines = lines.filter((_, idx) => idx !== summaryLineIndex);
                // 去掉摘要行后可能留下的首个空行
                while (bodyLines[0] !== undefined && bodyLines[0].trim() === "") {
                    bodyLines.shift();
                }
                return { summary, body: bodyLines.join("\n") };
            }
            return { summary: "", body: content };
        };

        try {
            const rawText = await file.text();
            const { summary, body } = extractSummaryAndBody(rawText);
            const imageCount = countImagesInContent(body);
            applyMdContent(body);
            setMarkdownFileName(file.name);
            setShowInlineImageUpload(shouldShowInlineImageUpload(imageCount));

            const baseMsg = summary ? `已解析摘要并加载 ${file.name}` : "未识别摘要格式，请手动填写摘要";
            const imageMsg = `📷 本文检测到 ${imageCount} 张图片`;
            setMarkdownMessage(`${baseMsg} · ${imageMsg}`);

            if (!title.trim()) {
                const inferredTitle = extractTitleFromFilename(file.name);
                setTitle(inferredTitle || file.name.replace(/\.(md|markdown|txt)$/i, ""));
            }

            if (summary) {
                setExcerpt(summary);
            } else if (!excerpt.trim()) {
                const plain = body.replace(/[#>*_`-]/g, "").replace(/\s+/g, " ").trim();
                setExcerpt(plain.slice(0, 160));
            }
        } catch (error) {
            setMarkdownMessage(error.message || "读取 Markdown 失败");
        } finally {
            event.target.value = null;
        }
    };

    const handleThemeColorChange = (value) => {
        setHasManualThemeColor(true);
        setThemeColor(value);
    };
    const toggleTag = (id) => {
        const tagId = Number(id);
        setSelectedTags((prev) =>
            prev.includes(tagId) ? prev.filter((value) => value !== tagId) : [...prev, tagId]
        );
    };

    useEffect(() => {
        if (!publishBanner) return;
        const timer = setTimeout(() => setPublishBanner(""), 4500);
        return () => clearTimeout(timer);
    }, [publishBanner]);

    const canPublish = Boolean(
        title.trim() &&
        mdContent.trim() &&
        selectedCategoryId &&
        selectedTags.length > 0 &&
        !coverUploading
    );

    if (permLoading) {
        return (
            <div className="p-10 text-center text-sm text-gray-500">权限信息加载中...</div>
        );
    }

    if (!hasPermission('POST_CREATE')) {
        return (
            <PermissionNotice
                title="无法访问发布文章功能"
                description="当前角色未被授予“新建文章”权限，请联系超级管理员在权限管理页开启。"
            />
        );
    }

    const handlePublish = async () => {
        if (!canPublish || submitting) return;
        setSubmitting(true);
        setSubmitNotice("");
        setSubmitError("");
        try {
            const slug = await ensureAssetsSlug();
            if (!slug) {
                throw new Error("未能生成资源目录");
            }
            const payload = {
                title: title.trim(),
                slug,
                contentMd: mdContent,
                excerpt: excerpt.trim() || mdContent.replace(/\s+/g, " ").slice(0, 160),
                coverImage: coverImage || undefined,
                categoryId: selectedCategoryId,
                tagIds: selectedTags,
                status: "PUBLISHED",
                themeColor: themeColor?.trim() || undefined,
            };
            const res = await createPost(payload);
            const data = res.data || res;
            setSubmitNotice(`发布成功（ID: ${data?.summary?.id || data?.id || "已创建"}）`);
            setPublishBanner(`发布成功（ID: ${data?.summary?.id || data?.id || "已创建"}）`);
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            setTitle("");
            setMdContent("");
            setMarkdownFileName("");
            setSelectedTags([]);
            setExcerpt("");
            setAssetsFolder("");
            setMarkdownMessage("");
            setImageUploadMessage("");
            setShowInlineImageUpload(false);
            setCoverImage("");
            setCoverPreview("");
            setThemeColor(DEFAULT_THEME_COLOR);
            setHasManualThemeColor(false);
        } catch (error) {
            setSubmitError(error.message || "发布失败");
            setSubmitNotice("");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetForm = async () => {
        const confirmed = await confirm({
            title: '清空发布表单',
            description: '确定要清空当前所有输入吗？草稿、封面、标签与资源目录信息都会被重置。',
            confirmText: '确认清空'
        });
        if (!confirmed) return;
        const firstParentId = normalizedCategories[0]?.id ?? null;
        const firstChildId = normalizedCategories[0]?.children?.[0]?.id ?? null;
        setTitle("");
        setMdContent("");
        setExcerpt("");
        setMarkdownFileName("");
        setMarkdownMessage("");
        setImageUploadMessage("");
        setShowInlineImageUpload(false);
        setCoverImage("");
        setCoverPreview("");
        setAssetsFolder("");
        setSelectedTags([]);
        setThemeColor(DEFAULT_THEME_COLOR);
        setHasManualThemeColor(false);
        setSelectedParentId(firstParentId);
        setSelectedCategoryId(firstChildId ? Number(firstChildId) : null);
        if (firstChildId !== null && typeof firstChildId !== "undefined") {
            const idx = 0;
            const presetColor = THEME_COLOR_PRESETS[idx];
            if (presetColor) {
                setThemeColor(presetColor);
            }
        }
        setSubmitError("");
        setSubmitNotice("");
    };

    const handleResetThemeColor = () => {
        setThemeColor(DEFAULT_THEME_COLOR);
        setHasManualThemeColor(false);
    };

    return (
        <>
            {confirmDialog}
            <div className="space-y-8">
            {publishBanner && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
                    <div className="px-6 py-3 rounded-2xl border-2 border-black bg-gradient-to-r from-emerald-400 to-amber-300 shadow-[6px_6px_0px_0px_#000] text-black text-lg font-extrabold tracking-tight">
                        🎉 {publishBanner}
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Admin</p>
                    <h2 className="text-3xl font-black italic text-pink-500 flex items-center gap-2">
                        <Edit /> 发布新文章
                    </h2>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        上传 Markdown + 资源图片，整理分类与标签后方可发布
                    </span>
                    <button
                        type="button"
                        onClick={handleResetForm}
                        className="px-3 py-1.5 text-sm font-semibold border-2 border-amber-500 text-amber-700 bg-amber-50 rounded-full hover:bg-amber-100 dark:border-amber-400 dark:text-amber-200 dark:bg-amber-900/40"
                    >
                        清空表单
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">文章标题</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="请输入文章标题"
                            className={`${inputClass} text-2xl font-bold`}
                        />
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <div
                            className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className={`font-semibold ${text}`}>Markdown 正文</h3>
                                <p className="text-xs text-gray-500">先上传 .md；若检测到文中存在图片，再显示“插入图片”按钮</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="text-sm text-indigo-500 flex items-center gap-1 hover:text-indigo-400"
                                    onClick={() => markdownFileInputRef.current?.click()}
                                >
                                    <Upload size={16} /> 上传 .md
                                </button>
                                {showInlineImageUpload && (
                                    <button
                                        type="button"
                                        disabled={uploadingImages}
                                        className={`text-sm flex items-center gap-1 ${uploadingImages ? 'text-gray-400 cursor-not-allowed' : 'text-pink-500 hover:text-pink-400'}`}
                                        onClick={() => inlineImageInputRef.current?.click()}
                                    >
                                        <ImagePlus size={16} /> {uploadingImages ? "插图上传中..." : "插入图片"}
                                    </button>
                                )}
                            </div>
                            <input
                                type="file"
                                accept=".md,.markdown,.txt"
                                ref={markdownFileInputRef}
                                className="hidden"
                                onChange={handleMarkdownUpload}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={inlineImageInputRef}
                                className="hidden"
                                onChange={handleInlineImageUpload}
                            />
                        </div>
                        {(markdownFileName || imageUploadMessage) && (
                            <div className="text-xs space-y-1">
                                {markdownFileName && (
                                    <div className="text-emerald-500 flex items-center gap-1">
                                        <CheckCircle size={14} /> {markdownMessage || markdownFileName}
                                    </div>
                                )}
                                {imageUploadMessage && (
                                    <div className="text-indigo-500 flex items-center gap-1">
                                        <ImagePlus size={14} /> {imageUploadMessage}
                                    </div>
                                )}
                            </div>
                        )}
                        <textarea
                            ref={markdownEditorRef}
                            className={`${inputClass} ${markdownTextareaScrollbarClass} min-h-[420px] font-mono text-sm overflow-y-auto`}
                            value={mdContent}
                            onChange={(e) => {
                                pushMdHistory(mdContent);
                                mdFutureRef.current = [];
                                setMdContent(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                                    e.preventDefault();
                                    if (mdHistoryRef.current.length) {
                                        const prev = mdHistoryRef.current.pop();
                                        mdFutureRef.current.push(mdContent);
                                        setMdContent(prev);
                                    }
                                }
                            }}
                            placeholder="在此粘贴 Markdown 内容"
                        />
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
                        <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">文章摘要（可选）</label>
                        <textarea
                            className={`${inputClass} ${adminDarkScrollbarClass} min-h-[120px]`}
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            placeholder="用于首页卡片展示，若留空则自动截取正文前 160 字"
                        />
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">文章封面（推荐）</label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">用于首页列表卡片展示，建议 16:9 或 4:3，JPG/PNG/WebP 均可。</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => coverInputRef.current?.click()}
                                    disabled={coverUploading}
                                    className={`px-3 py-1.5 text-xs font-bold border-2 rounded-full flex items-center gap-1 ${coverUploading ? 'border-gray-400 text-gray-400 cursor-not-allowed' : 'border-black bg-[#FFD700] text-black hover:-translate-y-0.5 transition-transform'}`}
                                >
                                    <ImagePlus size={14} /> {coverUploading ? '上传中...' : '上传封面'}
                                </button>
                                {coverImage && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveCover}
                                        className="px-3 py-1.5 text-xs font-bold border-2 border-black rounded-full bg-white text-black hover:bg-black hover:text-white transition-colors"
                                    >
                                        移除
                                    </button>
                                )}
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            ref={coverInputRef}
                            className="hidden"
                            onChange={handleCoverUpload}
                        />
                        <div className={`relative w-full h-56 rounded-xl overflow-hidden border-2 ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-black bg-gray-50'}`}>
                            {coverPreview ? (
                                <>
                                    <img src={coverPreview} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background: `linear-gradient(120deg, ${extractHexFromBgClass(themeColor, '#6366F1')}88, rgba(0,0,0,0.45))`
                                        }}
                                    />
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-500 gap-2">
                                    <span className="font-bold text-sm">暂无封面</span>
                                    <span>支持 png / jpg / webp，最大 5MB</span>
                                </div>
                            )}
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                <span className="text-[11px] font-mono px-2 py-1 rounded-full bg-black text-white shadow-lg">
                                    {coverImage ? '已绑定封面' : '未设置封面'}
                                </span>
                                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-white/80 backdrop-blur text-gray-700 border border-black/10">
                                    {themeColor || '默认色'}
                                </span>
                            </div>
                        </div>
                        {coverImage && (
                            <p className="text-xs text-gray-500 break-all">
                                路径：{coverImage}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 1</p>
                        <h3 className="font-semibold flex items-center gap-2"><Layers size={16} /> 选择二级分类</h3>
                        <div className="flex flex-wrap gap-2">
                            {normalizedCategories.map((cat) => {
                                const catId = Number(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setSelectedParentId(catId);
                                            setSelectedCategoryId(null);
                                        }}
                                        className={`px-3 py-1 text-xs rounded-full border ${selectedParentId === catId ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-600'}`}
                                    >
                                        {cat.label}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {secondLevelCategories.map((child, idx) => {
                                const childId = Number(child.id);
                                const presetColor = THEME_COLOR_PRESETS[idx];
                                return (
                                    <button
                                        key={child.id}
                                        onClick={() => {
                                            setSelectedCategoryId(childId);
                                            if (presetColor && !hasManualThemeColor) {
                                                setThemeColor(presetColor);
                                            }
                                        }}
                                        className={`p-3 rounded-xl border text-left text-sm ${selectedCategoryId === childId ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 text-pink-500' : 'border-gray-200 dark:border-gray-700'}`}
                                    >
                                        {child.label}
                                    </button>
                                )
                            })}
                        </div>
                        {!secondLevelCategories.length && (
                            <p className="text-xs text-amber-500 flex items-center gap-1">
                                <AlertTriangle size={14} /> 当前父级暂无二级分类，请先到分类管理中创建。
                            </p>
                        )}
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 2</p>
                        <h3 className="font-semibold flex items-center gap-2"><Tag size={16} /> 选择标签</h3>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.id)}
                                    className={`px-3 py-1 text-xs rounded-full border ${selectedTags.includes(tag.id) ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                        {selectedTags.length === 0 && (
                            <p className="text-xs text-amber-500 flex items-center gap-1">
                                <AlertTriangle size={14} /> 至少选择一个标签，用于站内检索。
                            </p>
                        )}
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 3</p>
                                <h3 className="font-semibold flex items-center gap-2"><FolderPlus size={16} /> 资源标识
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={handleFolderReserve}
                                className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                            >
                                <RefreshCw size={14} /> 重新生成（不改颜色）
                            </button>
                            <button
                                type="button"
                                onClick={handleResetThemeColor}
                                className="text-xs text-amber-600 hover:text-amber-500 flex items-center gap-1"
                            >
                                <RefreshCw size={14} /> 重置为默认色
                            </button>
                        </div>
                        <div className="text-xs text-gray-500 space-y-2">
                            <p>当前 slug：<code
                                className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 break-all">{assetsFolder ? `/uploads/${assetsFolder}` : "尚未生成"}</code>
                            </p>
                            <p>所有插入的图片文件都会写入该目录，Markdown 将直接引用 `/uploads/&lt;slug&gt;/xxx.png`。</p>
                            <p>每次上传成功后接口会返回以分号拼接的图片地址串，可直接贴入需要存储地址的数据库字段。</p>
                        </div>
                        <ThemeColorSelector
                            value={themeColor}
                            onChange={handleThemeColorChange}
                            inputClass={inputClass}
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <div className="flex items-center gap-2">
                            <Send /> <span>发布设置</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            填写完成并确认分类/标签后可立即发布到线上。
                        </p>
                        <PopButton
                            variant={canPublish ? "primary" : "ghost"}
                            icon={Send}
                            className="w-full justify-center"
                            disabled={!canPublish || submitting || coverUploading}
                            onClick={handlePublish}
                        >
                            {coverUploading ? '封面上传中...' : submitting ? "发布中..." : "发布文章"}
                        </PopButton>
                        {submitError && (
                            <p className="text-xs text-rose-500">
                                {submitError}
                            </p>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </>
    );
};


const TaxonomyView = ({ isDarkMode }) => {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({ name: "", slug: "", description: "" });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", slug: "", description: "" });
    const [saving, setSaving] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [total, setTotal] = useState(0);
    const { notice, showNotice, hideNotice } = useTimedNotice(4200);
    const { confirm, confirmDialog } = useAdminConfirmDialog(isDarkMode);

    const loadTags = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminFetchTags({ keyword, page, size });
            const data = res.data || res;
            setTags(data?.records || []);
            setTotal(data?.total || 0);
        } catch (err) {
            setError(err.message || "加载标签失败");
        } finally {
            setLoading(false);
        }
    }, [keyword, page, size]);

    useEffect(() => {
        loadTags();
    }, [loadTags]);

    const normalizePayload = (payload) => ({
        name: payload.name.trim(),
        slug: payload.slug.trim() || undefined,
        description: payload.description.trim() || undefined,
    });

    const handleCreate = async () => {
        if (!form.name.trim()) {
            showNotice("请输入标签名称", "error");
            return;
        }
        setSaving(true);
        try {
            await adminCreateTag(normalizePayload(form));
            setForm({ name: "", slug: "", description: "" });
            setPage(1);
            await loadTags();
            showNotice("标签创建成功", "success");
        } catch (err) {
            showNotice(err.message || "创建失败", "error");
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (tag) => {
        setEditingId(tag.id);
        setEditForm({
            name: tag.name || "",
            slug: tag.slug || "",
            description: tag.description || "",
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: "", slug: "", description: "" });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        if (!editForm.name.trim()) {
            showNotice("请输入标签名称", "error");
            return;
        }
        setSaving(true);
        try {
            await adminUpdateTag(editingId, normalizePayload(editForm));
            cancelEdit();
            await loadTags();
            showNotice("标签已更新", "success");
        } catch (err) {
            showNotice(err.message || "更新失败", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (tagId) => {
        const confirmed = await confirm({
            title: '删除标签',
            description: '确定要删除该标签吗？请先确认没有文章仍在依赖它，删除后不可恢复。',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        try {
            await adminDeleteTag(tagId);
            if (editingId === tagId) cancelEdit();
            const newTotal = Math.max(total - 1, 0);
            const maxPage = Math.max(Math.ceil(newTotal / size), 1);
            if (page > maxPage) {
                setPage(maxPage);
            }
            await loadTags();
        } catch (err) {
            showNotice(err.message || "删除失败", "error");
        }
    };

    const cardBg = isDarkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200";
    const inputClass = `border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`;
    const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

    const totalPages = Math.max(Math.ceil(total / size), 1);

    return (
        <>
            {confirmDialog}
            <AdminNoticeBar notice={notice} onClose={hideNotice} />
            <div className="space-y-8">
            <div className={`${cardBg} p-6 rounded-lg shadow-lg`}>
                <div className="flex items-center gap-3 mb-4">
                    <Tag className="text-[#FF0080]" />
                    <h2 className="text-2xl font-bold">新增标签</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">名称</label>
                        <input
                            className={inputClass}
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="例如：Spring Cloud"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-1">
                            别名 / Slug <span className="text-gray-400">(可选)</span>
                        </label>
                        <input
                            className={inputClass}
                            value={form.slug}
                            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                            placeholder="例如：spring-cloud"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">描述</label>
                        <input
                            className={inputClass}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="一句话说明用途"
                        />
                    </div>
                </div>
                <PopButton onClick={handleCreate} icon={Plus} disabled={saving} className="px-6">
                    {saving ? "保存中..." : "保存标签"}
                </PopButton>
            </div>

            <div className={`${cardBg} p-6 rounded-lg shadow-lg`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">标签列表</h2>
                        <p className="text-sm text-gray-500 mt-1">共 {total} 个标签</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                className={inputClass}
                                placeholder="输入关键词搜索"
                                value={keyword}
                                onChange={(e) => {
                                    setKeyword(e.target.value);
                                    setPage(1);
                                }}
                            />
                            <button
                                onClick={loadTags}
                                className="flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-400"
                            >
                                <RefreshCw size={16} /> 查询
                            </button>
                        </div>
                        <select
                            className={inputClass}
                            value={size}
                            onChange={(e) => {
                                setSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {[5, 10, 20, 50].map((option) => (
                                <option key={option} value={option}>
                                    每页 {option} 条
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                {loading ? (
                    <p className="text-center py-10 text-gray-500">加载中...</p>
                ) : tags.length === 0 ? (
                    <p className="text-center py-10 text-gray-500">暂无标签</p>
                ) : (
                    <div className={`overflow-x-auto ${getAdminDarkScrollbarClass(isDarkMode)}`}>
                        <table className="min-w-full table-auto text-sm">
                            <thead>
                                <tr className={isDarkMode ? "bg-gray-800" : "bg-gray-100"}>
                                    <th className="px-4 py-2 text-left font-semibold">名称</th>
                                    <th className="px-4 py-2 text-left font-semibold">别名</th>
                                    <th className="px-4 py-2 text-left font-semibold">描述</th>
                                    <th className="px-4 py-2 text-left font-semibold">更新时间</th>
                                    <th className="px-4 py-2 text-right font-semibold">操作</th>
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? "divide-y divide-gray-800" : "divide-y divide-gray-200"}>
                                {tags.map((tag) => (
                                    <tr key={tag.id} className={isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"}>
                                        <td className="px-4 py-3 font-semibold">
                                            {editingId === tag.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        name: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                tag.name
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === tag.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.slug}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        slug: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                <code
                                                    className="px-2 py-1 text-xs bg-black/5 dark:bg-white/10 rounded">{tag.slug}</code>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === tag.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.description}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        description: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                tag.description || "—"
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{formatDate(tag.updatedAt || tag.createdAt)}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            {editingId === tag.id ? (
                                                <>
                                                    <button
                                                        onClick={handleUpdate}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-green-500 text-green-600 font-bold text-xs"
                                                        disabled={saving}
                                                    >
                                                        <Save size={14} /> 保存
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-gray-400 text-gray-500 font-bold text-xs"
                                                    >
                                                        取消
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(tag)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-indigo-500 text-indigo-600 font-bold text-xs"
                                                    >
                                                        <Edit size={14} /> 编辑
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tag.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-red-500 text-red-600 font-bold text-xs"
                                                    >
                                                        <Trash2 size={14} /> 删除
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-3">
                    <p className="text-sm text-gray-500">
                        第 {page} / {totalPages} 页（共 {total} 条）
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                            disabled={page >= totalPages}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </>
    );
};

const CategoriesView = ({ isDarkMode }) => {
    const [categories, setCategories] = useState([]);
    const [parentOptions, setParentOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({ name: "", slug: "", description: "", parentId: "", sortOrder: "" });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", slug: "", description: "", parentId: "", sortOrder: "" });
    const [saving, setSaving] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [parentFilter, setParentFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [total, setTotal] = useState(0);
    const { notice, showNotice, hideNotice } = useTimedNotice(4200);
    const { confirm, confirmDialog } = useAdminConfirmDialog(isDarkMode);

    const loadParentOptions = useCallback(async () => {
        try {
            const res = await fetchCategories();
            const data = res.data || res || [];
            setParentOptions(data.map((item) => ({ id: item.id, label: item.label })));
        } catch (err) {
            logger.warn("load parent categories failed", err);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { keyword, page, size };
            if (parentFilter === "root") params.parentId = 0;
            else if (parentFilter !== "all") params.parentId = parentFilter;
            const res = await adminFetchCategories(params);
            const data = res.data || res;
            setCategories(data?.records || []);
            setTotal(data?.total || 0);
        } catch (err) {
            setError(err.message || "加载分类失败");
        } finally {
            setLoading(false);
        }
    }, [keyword, page, size, parentFilter]);

    useEffect(() => {
        loadParentOptions();
    }, [loadParentOptions]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const normalizePayload = (payload) => ({
        name: payload.name.trim(),
        slug: payload.slug.trim() || undefined,
        description: payload.description.trim() || undefined,
        parentId: payload.parentId === "" ? null : Number(payload.parentId),
        sortOrder: payload.sortOrder === "" ? undefined : Number(payload.sortOrder),
    });

    const handleCreate = async () => {
        if (!form.name.trim()) {
            showNotice("请输入分类名称", "error");
            return;
        }
        setSaving(true);
        try {
            await adminCreateCategory(normalizePayload(form));
            setForm({ name: "", slug: "", description: "", parentId: "", sortOrder: "" });
            setPage(1);
            await loadParentOptions();
            await loadCategories();
            showNotice("分类创建成功", "success");
        } catch (err) {
            showNotice(err.message || "创建失败", "error");
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (category) => {
        setEditingId(category.id);
        setEditForm({
            name: category.name || "",
            slug: category.slug || "",
            description: category.description || "",
            parentId: category.parentId ?? "",
            sortOrder: category.sortOrder ?? "",
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: "", slug: "", description: "", parentId: "", sortOrder: "" });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        if (!editForm.name.trim()) {
            showNotice("请输入分类名称", "error");
            return;
        }
        setSaving(true);
        try {
            await adminUpdateCategory(editingId, normalizePayload(editForm));
            cancelEdit();
            await loadParentOptions();
            await loadCategories();
            showNotice("分类已更新", "success");
        } catch (err) {
            showNotice(err.message || "更新失败", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (categoryId) => {
        const confirmed = await confirm({
            title: '删除分类',
            description: '确定要删除该分类吗？删除前请确保它没有子分类，也没有文章仍在引用。',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        try {
            await adminDeleteCategory(categoryId);
            if (editingId === categoryId) cancelEdit();
            const newTotal = Math.max(total - 1, 0);
            const maxPage = Math.max(Math.ceil(newTotal / size), 1);
            if (page > maxPage) {
                setPage(maxPage);
            }
            await loadCategories();
        } catch (err) {
            showNotice(err.message || "删除失败", "error");
        }
    };

    const totalPages = Math.max(Math.ceil(total / size), 1);
    const cardBg = isDarkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200";
    const inputClass = `border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`;
    const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

    return (
        <>
            {confirmDialog}
            <AdminNoticeBar notice={notice} onClose={hideNotice} />
            <div className="space-y-8">
            <div className={`${cardBg} p-6 rounded-lg shadow-lg`}>
                <div className="flex items-center gap-3 mb-4">
                    <Layers className="text-[#6366F1]" />
                    <div>
                        <h2 className="text-2xl font-bold">新增/编辑分类</h2>
                        <p className="text-sm text-gray-500">支持两级分类，选择父级时仅可选择一级分类。</p>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">名称</label>
                        <input
                            className={inputClass}
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="例如：硬核编程"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">别名 / Slug (可选)</label>
                        <input
                            className={inputClass}
                            value={form.slug}
                            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                            placeholder="例如：hardcore-dev"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">父级分类</label>
                        <select
                            className={inputClass}
                            value={form.parentId}
                            onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                        >
                            <option value="">一级分类（无父级）</option>
                            {parentOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">排序值 (可选)</label>
                        <input
                            className={inputClass}
                            value={form.sortOrder}
                            onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                            placeholder="数字越小越靠前"
                        />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
                        <label className="text-xs uppercase tracking-wide text-gray-500">描述</label>
                        <input
                            className={inputClass}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="一句话说明分类用途"
                        />
                    </div>
                </div>
                <PopButton onClick={handleCreate} icon={Plus} disabled={saving} className="px-6">
                    {saving ? "保存中..." : "保存分类"}
                </PopButton>
            </div>

            <div className={`${cardBg} p-6 rounded-lg shadow-lg`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">分类列表</h2>
                        <p className="text-sm text-gray-500 mt-1">共 {total} 个分类</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                className={inputClass}
                                placeholder="输入关键词搜索"
                                value={keyword}
                                onChange={(e) => {
                                    setKeyword(e.target.value);
                                    setPage(1);
                                }}
                            />
                            <button
                                onClick={loadCategories}
                                className="flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-400"
                            >
                                <RefreshCw size={16} /> 查询
                            </button>
                        </div>
                        <select
                            className={inputClass}
                            value={parentFilter}
                            onChange={(e) => {
                                setParentFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">全部分类</option>
                            <option value="root">仅一级分类</option>
                            {parentOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>仅查看 {opt.label} 下的子分类</option>
                            ))}
                        </select>
                        <select
                            className={inputClass}
                            value={size}
                            onChange={(e) => {
                                setSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {[5, 10, 20, 50].map((option) => (
                                <option key={option} value={option}>
                                    每页 {option} 条
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                {loading ? (
                    <p className="text-center py-10 text-gray-500">加载中...</p>
                ) : categories.length === 0 ? (
                    <p className="text-center py-10 text-gray-500">暂无分类</p>
                ) : (
                    <div className={`overflow-x-auto ${getAdminDarkScrollbarClass(isDarkMode)}`}>
                        <table className="min-w-full table-auto text-sm">
                            <thead>
                                <tr className={isDarkMode ? "bg-gray-800" : "bg-gray-100"}>
                                    <th className="px-4 py-2 text-left font-semibold">名称</th>
                                    <th className="px-4 py-2 text-left font-semibold">别名</th>
                                    <th className="px-4 py-2 text-left font-semibold">父级</th>
                                    <th className="px-4 py-2 text-left font-semibold">排序</th>
                                    <th className="px-4 py-2 text-left font-semibold">描述</th>
                                    <th className="px-4 py-2 text-left font-semibold">更新时间</th>
                                    <th className="px-4 py-2 text-right font-semibold">操作</th>
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? "divide-y divide-gray-800" : "divide-y divide-gray-200"}>
                                {categories.map((category) => (
                                    <tr key={category.id} className={isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-50"}>
                                        <td className="px-4 py-3 font-semibold">
                                            {editingId === category.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        name: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                category.name
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === category.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.slug}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        slug: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                <code
                                                    className="px-2 py-1 text-xs bg-black/5 dark:bg-white/10 rounded">{category.slug}</code>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === category.id ? (
                                                <select
                                                    className={inputClass}
                                                    value={editForm.parentId}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        parentId: e.target.value
                                                    }))}
                                                >
                                                    <option value="">一级分类（无父级）</option>
                                                    {parentOptions.map((opt) => (
                                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                category.parentName || "一级分类"
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === category.id ? (
                                                <input
                                                    className={inputClass}
                                                    value={editForm.sortOrder}
                                                    onChange={(e) => setEditForm((prev) => ({
                                                        ...prev,
                                                        sortOrder: e.target.value
                                                    }))}
                                                />
                                            ) : (
                                                category.sortOrder ?? "—"
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{editingId === category.id ? (
                                            <input
                                                className={inputClass}
                                                value={editForm.description}
                                                onChange={(e) => setEditForm((prev) => ({
                                                    ...prev,
                                                    description: e.target.value
                                                }))}
                                            />
                                        ) : (
                                            category.description || "—"
                                        )}</td>
                                        <td className="px-4 py-3 text-gray-500">{formatDate(category.updatedAt || category.createdAt)}</td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            {editingId === category.id ? (
                                                <>
                                                    <button
                                                        onClick={handleUpdate}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-green-500 text-green-600 font-bold text-xs"
                                                        disabled={saving}
                                                    >
                                                        <Save size={14} /> 保存
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-gray-400 text-gray-500 font-bold text-xs"
                                                    >
                                                        取消
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(category)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-indigo-500 text-indigo-600 font-bold text-xs"
                                                    >
                                                        <Edit size={14} /> 编辑
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(category.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 border-2 border-red-500 text-red-600 font-bold text-xs"
                                                    >
                                                        <Trash2 size={14} /> 删除
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-3">
                    <p className="text-sm text-gray-500">
                        第 {page} / {totalPages} 页（共 {total} 条）
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                            disabled={page >= totalPages}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </>
    );
};


const EditPostView = ({ isDarkMode }) => {
    const navigate = useNavigate();
    const { categories } = useBlog();
    const { hasPermission, loading: permLoading } = usePermissionContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialId = searchParams.get('postId');
    const normalizedInitialId = initialId && !Number.isNaN(Number(initialId)) ? Number(initialId) : null;
    const [selectedPostId, setSelectedPostId] = useState(normalizedInitialId);
    const [selectorKeyword, setSelectorKeyword] = useState('');
    const [selectorPage, setSelectorPage] = useState(1);
    const [selectorTotal, setSelectorTotal] = useState(0);
    const [selectorPosts, setSelectorPosts] = useState([]);
    const [selectorLoading, setSelectorLoading] = useState(false);
    const [selectorError, setSelectorError] = useState('');
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [tags, setTags] = useState([]);
    const [form, setForm] = useState({
        title: '',
        slug: '',
        excerpt: '',
        coverImage: '',
        mdContent: '',
        themeColor: '',
        status: 'DRAFT'
    });
    const [selectedParentId, setSelectedParentId] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const [markdownFileName, setMarkdownFileName] = useState('');
    const [markdownMessage, setMarkdownMessage] = useState('');
    const [imageUploadMessage, setImageUploadMessage] = useState('');
    const [uploadingImages, setUploadingImages] = useState(false);
    const [coverPreview, setCoverPreview] = useState('');
    const [coverUploading, setCoverUploading] = useState(false);
    const [assetsFolder, setAssetsFolder] = useState('');
    const [hasManualThemeColorEdit, setHasManualThemeColorEdit] = useState(false);
    const [saving, setSaving] = useState(false);
    const [submitNotice, setSubmitNotice] = useState('');
    const [submitError, setSubmitError] = useState('');
    const markdownEditorRef = useRef(null);
    const markdownFileInputRef = useRef(null);
    const inlineImageInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const [postMeta, setPostMeta] = useState({ publishedAt: null });
    const [prevPostId, setPrevPostId] = useState(null);
    const [nextPostId, setNextPostId] = useState(null);
    const [siblingsLoading, setSiblingsLoading] = useState(false);
    const [siblingError, setSiblingError] = useState('');
    const selectorPageSize = 8;
    const {
        notice: editNotice,
        showNotice: showEditNotice,
        hideNotice: hideEditNotice
    } = useTimedNotice(4200);

    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    const inputClass = `w-full p-3 border-2 rounded-md transition-all ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' : 'bg-white border-gray-300 text-black focus:border-indigo-500'}`;
    const markdownTextareaScrollbarClass = getAdminMarkdownScrollbarClass(isDarkMode);
    const adminDarkScrollbarClass = getAdminDarkScrollbarClass(isDarkMode);
    const normalizeCoverValue = useCallback((raw) => {
        if (!raw) return "";
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        const cleaned = raw.replace(/^\/+/, "");
        const prefixed = cleaned.startsWith("uploads/") ? cleaned : `uploads/${cleaned}`;
        return `/${prefixed}`;
    }, []);
    const updateCoverState = useCallback((raw) => {
        const normalized = normalizeCoverValue(raw);
        setForm((prev) => ({ ...prev, coverImage: normalized }));
        setCoverPreview(normalized ? buildAssetUrl(normalized) : '');
    }, [normalizeCoverValue]);
    const statusOptions = [
        { value: 'DRAFT', label: '草稿' },
        { value: 'PUBLISHED', label: '已发布' },
        { value: 'ARCHIVED', label: '已归档' },
    ];

    useEffect(() => {
        const paramId = searchParams.get('postId');
        if (paramId) {
            const numeric = Number(paramId);
            if (!Number.isNaN(numeric) && numeric !== selectedPostId) {
                setSelectedPostId(numeric);
            }
        }
        // 仅响应 URL 变化，不因 selectedPostId 变化而回写，避免“闪回”
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    useEffect(() => {
        const loadTags = async () => {
            try {
                const res = await fetchTags();
                const data = res.data || res;
                setTags(data || []);
            } catch (error) {
                logger.warn('load tags failed', error);
            }
        };
        loadTags();
    }, []);

    const normalizedCategories = useMemo(() => (categories || []).filter((cat) => typeof cat.id === 'number'), [categories]);
    const activeParent = normalizedCategories.find((cat) => Number(cat.id) === Number(selectedParentId)) || normalizedCategories[0];

    useEffect(() => {
        if (!selectedParentId && activeParent) {
            setSelectedParentId(Number(activeParent.id));
        }
    }, [activeParent, selectedParentId]);

    const secondLevelCategories = activeParent?.children || [];
    const selectorTotalPages = Math.max(Math.ceil(selectorTotal / selectorPageSize), 1);

    const loadSelectorPosts = useCallback(async () => {
        if (selectedPostId) return;
        setSelectorLoading(true);
        setSelectorError('');
        try {
            const res = await adminFetchPosts({ keyword: selectorKeyword, page: selectorPage, size: selectorPageSize });
            const data = res.data || res;
            setSelectorPosts(data?.records || []);
            setSelectorTotal(data?.total || 0);
        } catch (err) {
            setSelectorError(err.message || '获取文章失败');
        } finally {
            setSelectorLoading(false);
        }
    }, [selectedPostId, selectorKeyword, selectorPage]);

    useEffect(() => {
        if (!selectedPostId) {
            loadSelectorPosts();
        }
    }, [selectedPostId, loadSelectorPosts]);

    useEffect(() => {
        if (form.slug && assetsFolder !== form.slug) {
            setAssetsFolder(form.slug);
        }
    }, [form.slug, assetsFolder]);

    const loadPostDetail = useCallback(async (id) => {
        if (!id) return;
        setDetailLoading(true);
        setDetailError('');
        try {
            const res = await adminFetchPostDetail(id);
            const data = res.data || res;
            const normalizedCover = normalizeCoverValue(data.coverImage || '');
            setForm({
                title: data.title || '',
                slug: data.slug || '',
                excerpt: data.excerpt || '',
                coverImage: normalizedCover,
                mdContent: data.contentMd || '',
                themeColor: data.themeColor || '',
                status: data.status || 'DRAFT'
            });
            setSelectedCategoryId(data.categoryId ? Number(data.categoryId) : null);
            setSelectedParentId(data.parentCategoryId ? Number(data.parentCategoryId) : null);
            setSelectedTags((data.tagIds || []).map((tid) => Number(tid)));
            setAssetsFolder(data.slug || '');
            setCoverPreview(normalizedCover ? buildAssetUrl(normalizedCover) : '');
            setHasManualThemeColorEdit(false);
            setPostMeta({ publishedAt: data.publishedAt || null });
            setSubmitNotice('');
            setSubmitError('');
            setMarkdownFileName('');
            setMarkdownMessage('');
            setImageUploadMessage('');
        } catch (err) {
            setDetailError(err.message || '加载文章详情失败');
        } finally {
            setDetailLoading(false);
        }
    }, [normalizeCoverValue]);

    const loadPostSiblings = useCallback(async (id) => {
        if (!id) return;
        setSiblingsLoading(true);
        setSiblingError('');
        try {
            const res = await adminFetchPostSiblings(id);
            const data = res?.data || res;
            setPrevPostId(data?.prevId || null);
            setNextPostId(data?.nextId || null);
        } catch (err) {
            setSiblingError(err?.message || '获取上一篇/下一篇失败');
            setPrevPostId(null);
            setNextPostId(null);
        } finally {
            setSiblingsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedPostId) {
            loadPostDetail(selectedPostId);
            loadPostSiblings(selectedPostId);
        }
    }, [selectedPostId, loadPostDetail, loadPostSiblings]);

    useEffect(() => {
        if (!selectedPostId) return;
        const search = `?postId=${selectedPostId}`;
        navigate({ pathname: '/admin/posts/edit', search }, { replace: false });
    }, [selectedPostId, navigate]);

    useEffect(() => {
        if (!submitNotice) return;
        showEditNotice(submitNotice);
    }, [submitNotice, showEditNotice]);

    const ensureAssetsFolder = useCallback(async () => {
        if (assetsFolder) {
            return assetsFolder;
        }
        const seed = form.slug || undefined;
        const res = await reservePostAssetsFolder(seed);
        const folder = res?.data?.folder || res?.folder || seed;
        if (!folder) {
            throw new Error('未能获取资源目录');
        }
        setAssetsFolder(folder);
        return folder;
    }, [assetsFolder, form.slug]);

    const handleCoverUploadEdit = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCoverUploading(true);
        setSubmitError('');
        try {
            const folder = await ensureAssetsFolder();
            const res = await uploadPostCover(file, folder);
            const data = res.data || res;
            const raw = data.path || data.url || data.filename || '';
            updateCoverState(raw);
            setSubmitNotice('封面已更新');
        } catch (error) {
            setSubmitError(error.message || '封面上传失败');
        } finally {
            setCoverUploading(false);
            if (event?.target) {
                event.target.value = null;
            }
        }
    };

    const handleRemoveCoverEdit = useCallback(() => {
        updateCoverState('');
        setCoverPreview('');
    }, [updateCoverState]);

    const handleMarkdownUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const textContent = await file.text();
            setForm((prev) => ({ ...prev, mdContent: textContent }));
            setMarkdownFileName(file.name);
            setMarkdownMessage(`已加载 ${file.name}`);
            if (!form.title.trim()) {
                const inferred = file.name.replace(/\.(md|markdown|txt)$/i, '');
                setForm((prev) => ({ ...prev, title: prev.title || inferred }));
            }
            if (!form.excerpt.trim()) {
                const plain = textContent.replace(/[#>*_`-]/g, '').replace(/\s+/g, ' ').trim();
                setForm((prev) => ({ ...prev, excerpt: prev.excerpt || plain.slice(0, 160) }));
            }
        } catch (error) {
            setMarkdownMessage(error.message || '读取 Markdown 失败');
        } finally {
            event.target.value = null;
        }
    };

    const toggleTag = (id) => {
        const tagId = Number(id);
        setSelectedTags((prev) => (prev.includes(tagId) ? prev.filter((value) => value !== tagId) : [...prev, tagId]));
    };

    const canSave = Boolean(
        selectedPostId &&
        form.title.trim() &&
        form.slug.trim() &&
        form.mdContent.trim() &&
        selectedCategoryId &&
        selectedTags.length > 0 &&
        form.status &&
        !coverUploading
    );

    const handleSave = async () => {
        if (!canSave || saving || !selectedPostId) return;
        setSaving(true);
        setSubmitNotice('');
        setSubmitError('');
        try {
            const payload = {
                title: form.title.trim(),
                slug: form.slug.trim(),
                excerpt: form.excerpt?.trim() || form.mdContent.replace(/\s+/g, ' ').slice(0, 160),
                coverImage: form.coverImage || undefined,
                contentMd: form.mdContent,
                themeColor: form.themeColor?.trim() || undefined,
                categoryId: selectedCategoryId,
                tagIds: selectedTags,
                status: form.status,
            };
            const res = await updatePost(selectedPostId, payload);
            const data = res.data || res;
            setSubmitNotice(`已保存（ID: ${data?.summary?.id || selectedPostId}）`);
            setPostMeta((prev) => ({ ...prev, publishedAt: data?.summary?.date || prev.publishedAt }));
        } catch (error) {
            setSubmitError(error.message || '保存失败');
        } finally {
            setSaving(false);
        }
    };

    const switchToPost = (id) => {
        if (!id) return;
        const numericId = Number(id);
        if (Number.isNaN(numericId)) return;
        setSelectedPostId(numericId);
    };

    const resetSelection = () => {
        setSelectedPostId(null);
        setSearchParams({});
        setForm({ title: '', slug: '', excerpt: '', coverImage: '', mdContent: '', themeColor: '', status: 'DRAFT' });
        setSelectedCategoryId(null);
        setSelectedParentId(null);
        setSelectedTags([]);
        setAssetsFolder('');
        setCoverPreview('');
        setSubmitNotice('');
        setSubmitError('');
        setPrevPostId(null);
        setNextPostId(null);
        setSiblingError('');
        setSiblingsLoading(false);
    };

    const handleInlineImageUploadEdit = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        setUploadingImages(true);
        setImageUploadMessage('图片上传中...');
        try {
            const slug = await ensureAssetsFolder();
            const res = await uploadPostAssets(files, slug);
            const data = res.data || res;
            if (data?.folder && data.folder !== assetsFolder) setAssetsFolder(data.folder);
            const urls = data?.urls || [];
            const uploaded = urls.length;
            if (!uploaded) {
                setImageUploadMessage('上传成功');
            } else {
                const filenameToUrl = {};
                files.forEach((file, idx) => {
                    const url = urls[idx] || urls[urls.length - 1];
                    filenameToUrl[file.name] = url;
                });

                const beforeCount = countImagesInContent(form.mdContent);
                let replacedCount = 0;
                let nextContent = (form.mdContent || '').replace(/!\[[^\]]*]\(([^)]+)\)/g, (full, path) => {
                    const filename = path.split(/[/\\\\]/).pop();
                    if (filename && filenameToUrl[filename]) {
                        const url = filenameToUrl[filename];
                        delete filenameToUrl[filename];
                        replacedCount += 1;
                        return full.replace(path, url);
                    }
                    return full;
                });

                const remainingUrls = Object.values(filenameToUrl);
                if (remainingUrls.length) {
                    const snippet = remainingUrls.map((url, index) => `![${files[index]?.name || `图片${index + 1}`}](${url})`).join("\n");
                    const prefix = nextContent.endsWith("\n") || nextContent.length === 0 ? "" : "\n";
                    nextContent = `${nextContent}${prefix}${snippet}\n`;
                }

                setForm((prev) => ({ ...prev, mdContent: nextContent }));

                const message = `已上传 ${uploaded} 张，匹配替换 ${replacedCount} 张`;
                const totalDetected = beforeCount;
                const complete = totalDetected === 0 || replacedCount === totalDetected;
                setImageUploadMessage(`${message}，${complete ? '导入成功！' : '自动导入不全，请手动导入！'}`);
            }
        } catch (error) {
            setImageUploadMessage(error.message || '图片上传失败');
        } finally {
            setUploadingImages(false);
            if (event?.target) event.target.value = null;
        }
    };

    if (permLoading) {
        return <div className="p-10 text-center text-sm text-gray-500">权限信息加载中...</div>;
    }

    if (!hasPermission('POST_EDIT')) {
        return (
            <PermissionNotice
                title="无法访问文章编辑"
                description="当前账号未被授予“编辑文章”权限，请联系超级管理员在权限管理页开启。"
            />
        );
    }

    if (!selectedPostId) {
        return (
            <div className="space-y-6">
                <AdminNoticeBar notice={editNotice} onClose={hideEditNotice} />
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Admin</p>
                        <h2 className="text-3xl font-black text-pink-500">选择要编辑的文章</h2>
                    </div>
                    <button
                        className="text-sm text-indigo-500 hover:text-indigo-400"
                        onClick={() => navigate('/admin/posts')}
                    >
                        返回文章列表
                    </button>
                </div>
                <div
                    className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <h3 className={`text-xl font-semibold ${text}`}>从列表选择文章</h3>
                            <p className="text-sm text-gray-500">未携带 postId 时，需要在此选定目标文章。</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                className="px-3 py-2 border border-black rounded text-sm"
                                placeholder="搜索标题或 Slug"
                                value={selectorKeyword}
                                onChange={(e) => {
                                    setSelectorKeyword(e.target.value);
                                    setSelectorPage(1);
                                }}
                            />
                            <button
                                className="px-4 py-2 border-2 border-black font-bold"
                                onClick={loadSelectorPosts}
                            >
                                搜索
                            </button>
                        </div>
                    </div>
                    {selectorError && <div className="text-sm text-red-500">{selectorError}</div>}
                    {selectorLoading ? (
                        <p className="text-gray-500">加载文章中...</p>
                    ) : (
                        <div className="space-y-2">
                            {selectorPosts.map((post) => (
                                <div
                                    key={post.id}
                                    className={`p-4 border rounded-xl cursor-pointer flex items-center justify-between ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-100'}`}
                                    onClick={() => setSelectedPostId(post.id)}
                                >
                                    <div>
                                        <p className="font-semibold">{post.title}</p>
                                        <p className="text-xs text-gray-500">Slug：{post.slug}</p>
                                    </div>
                                    <div
                                        className="text-xs text-gray-500">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '未发布'}</div>
                                </div>
                            ))}
                            {selectorPosts.length === 0 && <p className="text-gray-500">未找到文章</p>}
                        </div>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>第 {selectorPage} / {selectorTotalPages} 页</span>
                        <div className="space-x-2">
                            <button
                                onClick={() => setSelectorPage((p) => Math.max(p - 1, 1))}
                                disabled={selectorPage === 1}
                                className="px-3 py-1 border border-black disabled:opacity-50"
                            >
                                上一页
                            </button>
                            <button
                                onClick={() => setSelectorPage((p) => Math.min(p + 1, selectorTotalPages))}
                                disabled={selectorPage >= selectorTotalPages}
                                className="px-3 py-1 border border-black disabled:opacity-50"
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <AdminNoticeBar notice={editNotice} onClose={hideEditNotice} />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Admin</p>
                    <h2 className="text-3xl font-black italic text-pink-500">编辑文章</h2>
                    <p className="text-sm text-gray-500 mt-1">ID：{selectedPostId}，上次发布时间：{postMeta.publishedAt ? new Date(postMeta.publishedAt).toLocaleString() : '未发布'}</p>
                </div>
                <div className="flex gap-3 flex-wrap items-center justify-end">
                    <button
                        type="button"
                        className="text-sm px-3 py-2 border-2 border-black rounded-full font-bold bg-white text-black shadow-[3px_3px_0px_0px_#000] disabled:opacity-50 flex items-center gap-1"
                        onClick={() => switchToPost(prevPostId)}
                        disabled={!prevPostId || detailLoading || siblingsLoading}
                        title="按首页顺序跳转到上一篇"
                    >
                        <ChevronLeft size={14} /> 编辑上一篇
                    </button>
                    <button
                        type="button"
                        className="text-sm px-3 py-2 border-2 border-black rounded-full font-bold bg-white text-black shadow-[3px_3px_0px_0px_#000] disabled:opacity-50 flex items-center gap-1"
                        onClick={() => switchToPost(nextPostId)}
                        disabled={!nextPostId || detailLoading || siblingsLoading}
                        title="按首页顺序跳转到下一篇"
                    >
                        编辑下一篇 <ChevronRight size={14} />
                    </button>
                    <button
                        className="text-sm text-indigo-500 hover:text-indigo-400"
                        onClick={() => navigate('/admin/posts')}
                    >
                        返回文章列表
                    </button>
                    <button
                        className="text-sm text-gray-500 hover:text-gray-700"
                        onClick={resetSelection}
                    >
                        切换文章
                    </button>
                </div>
            </div>

            {detailError && <div className="text-sm text-red-500">{detailError}</div>}
            {siblingError && selectedPostId && <div className="text-sm text-amber-600">{siblingError}</div>}
            {detailLoading ? (
                <div
                    className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-gray-500`}>
                    正在加载文章详情...
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-6">
                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">文章标题</label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="请输入文章标题"
                                className={`${inputClass} text-2xl font-bold`}
                            />
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <div
                                className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className={`font-semibold ${text}`}>Markdown 正文</h3>
                                    <p className="text-xs text-gray-500">在当前光标插入图片或重新上传 Markdown 文件。</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="text-sm text-indigo-500 flex items-center gap-1 hover:text-indigo-400"
                                        onClick={() => markdownFileInputRef.current?.click()}
                                    >
                                        <Upload size={16} /> 上传 .md
                                    </button>
                                    <button
                                        type="button"
                                        disabled={uploadingImages}
                                        className={`text-sm flex items-center gap-1 ${uploadingImages ? 'text-gray-400 cursor-not-allowed' : 'text-pink-500 hover:text-pink-400'}`}
                                        onClick={() => inlineImageInputRef.current?.click()}
                                    >
                                        <ImagePlus size={16} /> {uploadingImages ? '插图处理中' : '插入图片'}
                                    </button>
                                </div>
                                <input
                                    type="file"
                                    accept=".md,.markdown,.txt"
                                    ref={markdownFileInputRef}
                                    className="hidden"
                                    onChange={handleMarkdownUpload}
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    ref={inlineImageInputRef}
                                    className="hidden"
                                    onChange={handleInlineImageUploadEdit}
                                />
                            </div>
                            {(markdownFileName || imageUploadMessage) && (
                                <div className="text-xs space-y-1">
                                    {markdownFileName && (
                                        <div className="text-emerald-500 flex items-center gap-1">
                                            <CheckCircle size={14} /> {markdownMessage || markdownFileName}
                                        </div>
                                    )}
                                    {imageUploadMessage && (
                                        <div className="text-indigo-500 flex items-center gap-1">
                                            <ImagePlus size={14} /> {imageUploadMessage}
                                        </div>
                                    )}
                                </div>
                            )}
                            <textarea
                                ref={markdownEditorRef}
                                className={`${inputClass} ${markdownTextareaScrollbarClass} min-h-[420px] font-mono text-sm overflow-y-auto`}
                                value={form.mdContent}
                                onChange={(e) => setForm((prev) => ({ ...prev, mdContent: e.target.value }))}
                                placeholder="在此粘贴或编写 Markdown 内容"
                            />
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
                            <label
                                className="text-sm font-semibold text-gray-500 dark:text-gray-400">文章摘要（可选）</label>
                            <textarea
                                className={`${inputClass} ${adminDarkScrollbarClass} min-h-[120px]`}
                                value={form.excerpt}
                                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                                placeholder="用于首页卡片展示，若留空则自动截取正文"
                            />
                        </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">文章封面</label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">用于首页列表卡片展示，上传后可随时替换或移除。</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => coverInputRef.current?.click()}
                                    disabled={coverUploading}
                                    className={`px-3 py-1.5 text-xs font-bold border-2 rounded-full flex items-center gap-1 ${coverUploading ? 'border-gray-400 text-gray-400 cursor-not-allowed' : 'border-black bg-[#FFD700] text-black hover:-translate-y-0.5 transition-transform'}`}
                                >
                                    <ImagePlus size={14} /> {coverUploading ? '上传中...' : '上传封面'}
                                </button>
                                {form.coverImage && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveCoverEdit}
                                        className="px-3 py-1.5 text-xs font-bold border-2 border-black rounded-full bg-white text-black hover:bg-black hover:text-white transition-colors"
                                    >
                                        移除
                                    </button>
                                )}
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            ref={coverInputRef}
                            className="hidden"
                            onChange={handleCoverUploadEdit}
                        />
                        <div className={`relative w-full h-56 rounded-xl overflow-hidden border-2 ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-black bg-gray-50'}`}>
                            {coverPreview ? (
                                <>
                                    <img src={coverPreview} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background: `linear-gradient(150deg, rgba(0,0,0,0.6), rgba(0,0,0,0.35))`
                                        }}
                                    />
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-500 gap-2">
                                    <span className="font-bold text-sm">暂无封面</span>
                                    <span>支持 png / jpg / webp，最大 5MB</span>
                                </div>
                            )}
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                <span className="text-[11px] font-mono px-2 py-1 rounded-full bg-black text-white shadow-lg">
                                    {form.coverImage ? '已绑定封面' : '未设置封面'}
                                </span>
                                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-white/80 backdrop-blur text-gray-700 border border-black/10">
                                    {form.themeColor || '默认色'}
                                </span>
                            </div>
                        </div>
                        {form.coverImage && (
                            <p className="text-xs text-gray-500 break-all">
                                路径：{form.coverImage}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 1</p>
                            <h3 className="font-semibold flex items-center gap-2"><FolderPlus size={16} /> 选择二级分类
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {normalizedCategories.map((cat) => {
                                    const catId = Number(cat.id);
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setSelectedParentId(catId);
                                                setSelectedCategoryId(null);
                                            }}
                                            className={`px-3 py-1 text-xs rounded-full border ${selectedParentId === catId ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 dark:border-gray-600'}`}
                                        >
                                            {cat.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {secondLevelCategories.map((child, idx) => {
                                    const childId = Number(child.id);
                                    const presetColor = THEME_COLOR_PRESETS[idx];
                                    return (
                                        <button
                                            key={child.id}
                                            onClick={() => {
                                                setSelectedCategoryId(childId);
                                                if (presetColor && !hasManualThemeColorEdit) {
                                                    setForm((prev) => ({ ...prev, themeColor: presetColor }));
                                                }
                                            }}
                                            className={`p-3 rounded-xl border text-left text-sm ${selectedCategoryId === childId ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 text-pink-500' : 'border-gray-200 dark:border-gray-700'}`}
                                        >
                                            {child.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {!secondLevelCategories.length && (
                                <p className="text-xs text-amber-500 flex items-center gap-1">
                                    <AlertTriangle size={14} /> 当前父级暂无二级分类，请先到分类管理中创建。
                                </p>
                            )}
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 2</p>
                            <h3 className="font-semibold flex items-center gap-2"><Tag size={16} /> 选择标签</h3>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleTag(tag.id)}
                                        className={`px-3 py-1 text-xs rounded-full border ${selectedTags.includes(tag.id) ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                            {!tags.length && <p className="text-xs text-gray-500">还没有标签，请先到标签管理页创建。</p>}
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 3</p>
                            <h3 className="font-semibold flex items-center gap-2"><FolderPlus size={16} /> 资源标识 / 颜色 / 状态</h3>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Slug / 资源目录</label>
                                <input
                                    className={inputClass}
                                    value={form.slug}
                                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                                    placeholder="文章 slug"
                                />
                                <ThemeColorSelector
                                    value={form.themeColor || ''}
                                    onChange={(next) => {
                                        setHasManualThemeColorEdit(true);
                                        setForm((prev) => ({ ...prev, themeColor: next }));
                                    }}
                                    inputClass={inputClass}
                                    isDarkMode={isDarkMode}
                                />
                                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">状态</label>
                                <select
                                    className={inputClass}
                                    value={form.status}
                                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                                >
                                    {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
                            {submitError && <div className="text-sm text-red-500">{submitError}</div>}
                            <button
                                onClick={handleSave}
                                disabled={!canSave || saving || coverUploading}
                                className={`w-full px-4 py-3 font-bold border-2 border-black ${canSave ? 'bg-[#FFD700] text-black hover:translate-y-0.5 transition-transform' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                            >
                                {coverUploading ? '封面上传中...' : saving ? '保存中...' : '保存修改'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const PostsView = ({ isDarkMode }) => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissionContext();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [keyword, setKeyword] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [categoryOptions, setCategoryOptions] = useState([]);

    const cardBg = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';
    const inputClass = `border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`;

    const buildSecondLevelOptions = (tree) => {
        const result = [];
        tree.forEach((root) => {
            (root.children || []).forEach((child) => {
                result.push({ id: child.id, label: `${root.label}/${child.label}` });
            });
        });
        return result;
    };

    const loadCategoryOptions = useCallback(async () => {
        try {
            const res = await fetchCategories();
            const data = res.data || res || [];
            setCategoryOptions(buildSecondLevelOptions(data));
        } catch (err) {
            logger.warn('load categories failed', err);
        }
    }, []);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { keyword, page, size };
            if (categoryFilter !== 'all') params.categoryId = categoryFilter;
            const res = await adminFetchPosts(params);
            const data = res.data || res;
            setPosts(data?.records || []);
            setTotal(data?.total || 0);
        } catch (err) {
            setError(err.message || '加载文章失败');
        } finally {
            setLoading(false);
        }
    }, [keyword, page, size, categoryFilter]);

    useEffect(() => {
        loadCategoryOptions();
    }, [loadCategoryOptions]);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const STATUS_LABELS = { DRAFT: '草稿', PUBLISHED: '已发布', ARCHIVED: '已归档' };
    const totalPages = Math.max(Math.ceil(total / size), 1);
    const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');
    const rowHoverClass = isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50';
    const statusRowTintClass = (status) => {
        const darkPalette = {
            PUBLISHED: 'bg-[rgba(16,185,129,0.22)]',
            DRAFT: 'bg-[rgba(251,191,36,0.2)]',
            ARCHIVED: 'bg-[rgba(148,163,184,0.2)]',
        };
        const lightPalette = {
            PUBLISHED: 'bg-[rgba(16,185,129,0.12)]',
            DRAFT: 'bg-[rgba(251,191,36,0.15)]',
            ARCHIVED: 'bg-[rgba(148,163,184,0.15)]',
        };
        const palette = isDarkMode ? darkPalette : lightPalette;
        return palette[status] || '';
    };

    const goEdit = (id) => {
        navigate(`/admin/posts/edit?postId=${id}`);
    };

    const goArticle = (id) => {
        if (!id) return;
        const url = `/article/${id}`;
        window.open(url, '_blank', 'noopener');
    };

    const canEditPosts = hasPermission('POST_EDIT');

    return (
        <div className="space-y-8">
            <div className={`${cardBg} p-6 rounded-lg shadow-lg`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">文章列表</h2>
                        <p className="text-sm text-gray-500 mt-1">共 {total} 篇文章，可筛选后跳转新的编辑页修改正文与元信息。</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            className={inputClass}
                            placeholder="输入关键词（标题/Slug）"
                            value={keyword}
                            onChange={(e) => {
                                setKeyword(e.target.value);
                                setPage(1);
                            }}
                        />
                        <select
                            className={inputClass}
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">所有分类</option>
                            {categoryOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                        <select
                            className={inputClass}
                            value={size}
                            onChange={(e) => {
                                setSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {[5, 10, 20, 50].map((option) => (
                                <option key={option} value={option}>
                                    每页 {option} 条
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={loadPosts}
                            className="flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-400"
                        >
                            <RefreshCw size={16} /> 刷新
                        </button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                {loading ? (
                    <p className="text-center py-10 text-gray-500">加载中...</p>
                ) : posts.length === 0 ? (
                    <p className="text-center py-10 text-gray-500">暂无文章</p>
                ) : (
                    <div className={`overflow-x-auto ${getAdminDarkScrollbarClass(isDarkMode)}`}>
                        <table className="min-w-full table-auto text-sm">
                            <thead>
                                <tr className={isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                                    <th className="px-4 py-2 text-left font-semibold">标题</th>
                                    <th className="px-4 py-2 text-left font-semibold">摘要</th>
                                    <th className="px-4 py-2 text-left font-semibold">分类</th>
                                    <th className="px-4 py-2 text-left font-semibold">标签</th>
                                    <th className="px-4 py-2 text-left font-semibold w-24">状态</th>
                                    <th className="px-4 py-2 text-left font-semibold">发布时间</th>
                                    {canEditPosts && <th className="px-4 py-2 text-right font-semibold">操作</th>}
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-200'}>
                                {posts.map((post) => (
                                    <tr key={post.id}
                                        className={`${statusRowTintClass(post.status)} ${rowHoverClass} transition-colors`}>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => goArticle(post.id)}
                                                className="font-semibold text-left text-indigo-500 hover:underline"
                                            >
                                                {post.title}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="text-sm text-gray-600 dark:text-gray-300">{post.excerpt || '无摘要'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {post.parentCategoryName && post.categoryName && post.parentCategoryName !== post.categoryName
                                                ? `${post.parentCategoryName}/${post.categoryName}`
                                                : (post.categoryName || '未分类')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(post.tags || []).map((tag) => (
                                                    <span key={tag.id}
                                                        className="px-2 py-0.5 text-xs border border-black">{tag.name}</span>
                                                ))}
                                                {(!post.tags || post.tags.length === 0) &&
                                                    <span className="text-gray-400">无标签</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 w-24">{STATUS_LABELS[post.status] || '未知'}</td>
                                        <td className="px-4 py-3 text-gray-500">{formatDate(post.publishedAt)}</td>
                                        {canEditPosts && (
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => goEdit(post.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1 border-2 border-indigo-500 text-indigo-600 font-bold text-xs"
                                                >
                                                    <Edit size={14} /> 打开编辑页
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-3">
                    <p className="text-sm text-gray-500">第 {page} / {totalPages} 页（共 {total} 篇）</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                            disabled={page >= totalPages}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const COMMENT_STATUS_OPTIONS = [
    { value: 'ALL', label: '全部状态' },
    { value: 'APPROVED', label: '已通过' },
    { value: 'PENDING', label: '待审核' },
    { value: 'REJECTED', label: '已拒绝' },
    { value: 'SPAM', label: '垃圾' },
];
const REVIEW_STATUS_OPTIONS = COMMENT_STATUS_OPTIONS.filter((item) => item.value !== 'ALL');

const AiAdminAuditView = ({ isDarkMode, user }) => {
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [sessionsError, setSessionsError] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState('ALL');
    const [authFilter, setAuthFilter] = useState('ALL');
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [sessionDetail, setSessionDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    const cardBg = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';
    const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const bodyText = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const chipBg = isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700';
    const visibleStatusClass = isDarkMode ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-700/50' : 'bg-emerald-100 text-emerald-700 border border-emerald-300';
    const hiddenStatusClass = isDarkMode ? 'bg-red-950/60 text-red-200 border border-red-700/50' : 'bg-red-100 text-red-700 border border-red-300';
    const anomalyStatusClass = isDarkMode ? 'bg-orange-950/60 text-orange-200 border border-orange-700/50' : 'bg-orange-100 text-orange-700 border border-orange-300';
    const messageBg = isDarkMode ? 'bg-gray-950 border border-gray-800' : 'bg-gray-50 border border-gray-200';
    const assistantBg = isDarkMode ? 'bg-amber-950/30 border-amber-700/40' : 'bg-amber-50 border-amber-200';
    const userBg = isDarkMode ? 'bg-sky-950/30 border-sky-700/40' : 'bg-sky-50 border-sky-200';
    const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '--');
    const panelHeightClass = 'h-[72vh]';
    const getVisibilityMeta = (session) => {
        if (session?.guest) {
            return { label: '访客临时会话', className: hiddenStatusClass };
        }
        const visible = session?.userVisible !== false;
        return visible
            ? { label: '用户侧可见', className: visibleStatusClass }
            : { label: '用户侧已隐藏', className: hiddenStatusClass };
    };
    const filterButtonClass = (active) => {
        if (active) {
            return 'bg-black text-white';
        }
        return isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100';
    };
    const getIdentityMeta = (session) => {
        if (session?.guest) {
            const startIp = session.sessionStartIp || session.latestIp || '--';
            const latestIp = session.latestIp || startIp || '--';
            return {
                primary: `${startIp} · 访客`,
                secondary: session.ipChanged ? `IP 异常：当前 IP ${latestIp}` : `当前 IP：${latestIp}`
            };
        }
        return {
            primary: `${session?.displayName || session?.username || '未知用户'} · ${session?.roleName || session?.roleCode || '未知角色'}`,
            secondary: ''
        };
    };

    const loadSessions = useCallback(async () => {
        setSessionsLoading(true);
        setSessionsError('');
        try {
            const res = await adminFetchAiAuditSessions();
            const data = res?.data || res || [];
            setSessions(Array.isArray(data) ? data : []);
            setActiveSessionId((prev) => {
                if (prev && data.some((item) => item.id === prev)) return prev;
                return data[0]?.id || null;
            });
        } catch (err) {
            setSessionsError(err?.message || '加载 AI 会话失败');
            setSessions([]);
            setActiveSessionId(null);
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    const loadSessionDetail = useCallback(async (sessionId) => {
        if (!sessionId) {
            setSessionDetail(null);
            return;
        }
        setDetailLoading(true);
        setDetailError('');
        try {
            const res = await adminFetchAiAuditSessionDetail(sessionId);
            const data = res?.data || res || null;
            setSessionDetail(data);
        } catch (err) {
            setDetailError(err?.message || '加载会话详情失败');
            setSessionDetail(null);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    useEffect(() => {
        loadSessionDetail(activeSessionId);
    }, [activeSessionId, loadSessionDetail]);

    const filteredSessions = sessions.filter((session) => {
        if (visibilityFilter === 'VISIBLE') {
            if (session.guest) return false;
            if (session.userVisible === false) return false;
        }
        if (visibilityFilter === 'HIDDEN') {
            if (!session.guest && session.userVisible !== false) return false;
        }
        if (authFilter === 'LOGGED_IN') {
            return session.guest !== true;
        }
        if (authFilter === 'GUEST') {
            return session.guest === true;
        }
        return true;
    });

    useEffect(() => {
        if (filteredSessions.length === 0) {
            setActiveSessionId(null);
            return;
        }
        if (!filteredSessions.some((item) => item.id === activeSessionId)) {
            setActiveSessionId(filteredSessions[0].id);
        }
    }, [activeSessionId, filteredSessions]);

    if (!user || user.role !== 'SUPER_ADMIN') {
        return <PermissionNotice title="无权限" description="仅超级管理员可以查看全站 AI 聊天审计记录。" />;
    }

    const activeSession = sessionDetail?.session && filteredSessions.some((item) => item.id === sessionDetail.session.id)
        ? sessionDetail.session
        : filteredSessions.find((item) => item.id === activeSessionId) || null;
    const activeIdentityMeta = activeSession ? getIdentityMeta(activeSession) : null;
    const messages = sessionDetail?.messages || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#FF0080]">AI Audit</p>
                    <h2 className="text-3xl font-black flex items-center gap-2"><Sparkles /> AI 会话</h2>
                    <p className={`text-sm mt-1 ${mutedText}`}>查看已登录用户与未登录访客的 AI 会话、消息时间线与归属信息，仅超级管理员可见。</p>
                </div>
                <button
                    onClick={loadSessions}
                    className={`px-4 py-2 border-2 border-black rounded-full text-sm font-bold shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                    刷新会话
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
                <section className={`${cardBg} ${panelHeightClass} rounded-2xl p-5 shadow-[8px_8px_0px_0px_#000] flex flex-col`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black">会话列表</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${chipBg}`}>{filteredSessions.length} / {sessions.length} 条</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setVisibilityFilter('ALL')}
                            className={`px-3 py-1.5 rounded-full border-2 border-black text-xs font-bold transition ${filterButtonClass(visibilityFilter === 'ALL')}`}
                        >
                            全部
                        </button>
                        <button
                            type="button"
                            onClick={() => setVisibilityFilter('VISIBLE')}
                            className={`px-3 py-1.5 rounded-full border-2 border-black text-xs font-bold transition ${filterButtonClass(visibilityFilter === 'VISIBLE')}`}
                        >
                            用户侧可见
                        </button>
                        <button
                            type="button"
                            onClick={() => setVisibilityFilter('HIDDEN')}
                            className={`px-3 py-1.5 rounded-full border-2 border-black text-xs font-bold transition ${filterButtonClass(visibilityFilter === 'HIDDEN')}`}
                        >
                            用户侧已隐藏
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setAuthFilter('ALL')}
                            className={`px-3 py-1.5 rounded-full border-2 border-black text-xs font-bold transition ${filterButtonClass(authFilter === 'ALL')}`}
                        >
                            全部身份
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthFilter('LOGGED_IN')}
                            className={`px-3 py-1.5 rounded-full border-2 border-black text-xs font-bold transition ${filterButtonClass(authFilter === 'LOGGED_IN')}`}
                        >
                            已登录
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthFilter('GUEST')}
                            className={`px-3 py-1.5 rounded-full border-2 border-black text-xs font-bold transition ${filterButtonClass(authFilter === 'GUEST')}`}
                        >
                            未登录
                        </button>
                    </div>
                    {sessionsLoading && <p className={`text-sm ${mutedText}`}>正在加载 AI 会话...</p>}
                    {sessionsError && <p className="text-sm text-red-500">{sessionsError}</p>}
                    {!sessionsLoading && !sessionsError && filteredSessions.length === 0 && (
                        <p className={`text-sm ${mutedText}`}>当前还没有任何 AI 会话记录。</p>
                    )}
                    <div className={`mt-4 flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 ${isDarkMode ? 'sg-scrollbar sg-scrollbar-dark' : 'sg-scrollbar'}`}>
                        {filteredSessions.map((session) => {
                            const active = session.id === activeSessionId;
                            const visibilityMeta = getVisibilityMeta(session);
                            const identityMeta = getIdentityMeta(session);
                            return (
                                <button
                                    key={session.id}
                                    type="button"
                                    onClick={() => setActiveSessionId(session.id)}
                                    className={`w-full text-left rounded-2xl border-2 px-4 py-4 transition ${active
                                        ? 'border-black bg-[#FFD54F] text-black shadow-[6px_6px_0px_0px_#000]'
                                        : (isDarkMode ? 'border-gray-700 bg-gray-950 hover:border-gray-500' : 'border-gray-200 bg-gray-50 hover:border-gray-400')
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-black truncate">{session.title || '未命名会话'}</p>
                                            <p className={`text-xs mt-1 truncate ${active ? 'text-black/70' : mutedText}`}>
                                                {identityMeta.primary}
                                            </p>
                                            {identityMeta.secondary && (
                                                <p className={`text-[11px] mt-1 truncate ${session.ipChanged ? 'text-red-600 dark:text-red-300' : (active ? 'text-black/60' : mutedText)}`}>
                                                    {identityMeta.secondary}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`shrink-0 text-[11px] px-2 py-1 rounded-full font-bold ${active ? 'bg-black text-white' : chipBg}`}>
                                            #{session.id}
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${visibilityMeta.className}`}>
                                            {visibilityMeta.label}
                                        </span>
                                        {session.guest === true && session.ipChanged && (
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 ml-2 text-[11px] font-bold ${anomalyStatusClass}`}>
                                                IP 异常
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs mt-3 line-clamp-2 ${active ? 'text-black/80' : mutedText}`}>
                                        {session.lastMessagePreview || '暂无预览'}
                                    </p>
                                    <div className={`mt-3 text-[11px] space-y-1 ${active ? 'text-black/70' : mutedText}`}>
                                        <p>创建：{formatDateTime(session.createdAt)}</p>
                                        <p>更新：{formatDateTime(session.updatedAt)}</p>
                                        {session.userVisible === false && (
                                            <p>隐藏：{formatDateTime(session.userHiddenAt)}</p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className={`${cardBg} ${panelHeightClass} rounded-2xl p-5 shadow-[8px_8px_0px_0px_#000] flex flex-col overflow-hidden`}>
                    <div className="flex items-start justify-between gap-4 border-b border-dashed border-gray-300 dark:border-gray-700 pb-4">
                        <div className="min-w-0">
                            <h3 className="text-xl font-black truncate">{activeSession?.title || '请选择一条 AI 会话'}</h3>
                            {activeSession && (
                                <>
                                    <p className={`text-sm mt-1 ${mutedText}`}>
                                        {activeSession.guest ? '会话身份' : '用户'}：{activeIdentityMeta.primary}
                                    </p>
                                    {activeIdentityMeta.secondary && (
                                        <p className={`text-xs mt-1 ${activeSession.ipChanged ? 'text-red-600 dark:text-red-300' : mutedText}`}>
                                            {activeIdentityMeta.secondary}
                                        </p>
                                    )}
                                    <p className={`text-xs mt-1 ${mutedText}`}>
                                        会话 #{activeSession.id} · 创建于 {formatDateTime(activeSession.createdAt)} · 最后更新于 {formatDateTime(activeSession.updatedAt)}
                                    </p>
                                    {activeSession.guest && (
                                        <p className={`text-xs mt-1 ${mutedText}`}>
                                            起始 IP：{activeSession.sessionStartIp || '--'} · 当前 IP：{activeSession.latestIp || activeSession.sessionStartIp || '--'}
                                        </p>
                                    )}
                                    {activeSession.userVisible === false && (
                                        <p className={`text-xs mt-1 ${mutedText}`}>
                                            {activeSession.guest ? '访客会话默认不提供历史回看入口' : `用户侧隐藏于 ${formatDateTime(activeSession.userHiddenAt)}`}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                        {activeSession && (
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${chipBg}`}>
                                    {messages.length} 条消息
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getVisibilityMeta(activeSession).className}`}>
                                    {getVisibilityMeta(activeSession).label}
                                </span>
                                {activeSession.guest === true && activeSession.ipChanged && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${anomalyStatusClass}`}>
                                        IP 异常
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {detailLoading && <p className={`text-sm mt-4 ${mutedText}`}>正在加载会话消息...</p>}
                    {detailError && <p className="text-sm text-red-500 mt-4">{detailError}</p>}
                    {!detailLoading && !detailError && !activeSession && (
                        <div className="flex-1 flex items-center justify-center">
                            <p className={`text-sm ${mutedText}`}>从左侧选择一条会话后，这里会显示完整消息时间线。</p>
                        </div>
                    )}

                    {!detailLoading && !detailError && activeSession && (
                        <div className={`mt-5 flex-1 overflow-y-auto pr-1 space-y-4 ${isDarkMode ? 'sg-scrollbar sg-scrollbar-dark' : 'sg-scrollbar'}`}>
                            {messages.length === 0 ? (
                                <p className={`text-sm ${mutedText}`}>这条会话当前还没有消息记录。</p>
                            ) : messages.map((message) => {
                                const bubbleClass = message.role === 'assistant' ? assistantBg : userBg;
                                return (
                                    <div key={message.id} className={`${messageBg} ${bubbleClass} rounded-2xl p-4`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${chipBg}`}>
                                                    {message.role === 'assistant' ? 'AI 回复' : message.role === 'system' ? '系统消息' : '用户消息'}
                                                </span>
                                                <span className={`text-xs ${mutedText}`}>会话 #{message.sessionId}</span>
                                            </div>
                                            <span className={`text-xs ${mutedText}`}>{formatDateTime(message.createdAt)}</span>
                                        </div>
                                        <pre className={`mt-3 whitespace-pre-wrap break-words text-sm leading-7 font-sans ${bodyText}`}>{message.content || '（空消息）'}</pre>
                                        {message.modelName && (
                                            <p className={`text-xs mt-3 ${mutedText}`}>模型：{message.modelName}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
            </div>
    );
};

const CommentsAdminView = ({ isDarkMode }) => {
    const cardBg = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';
    const inputClass = `w-full px-3 py-2 border-2 rounded-md text-sm outline-none transition ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white focus:border-indigo-400' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
    const statsBg = isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-800';
    const { hasPermission, loading: permLoading } = usePermissionContext();
    const canView = hasPermission('COMMENT_VIEW');
    const canCreate = hasPermission('COMMENT_CREATE');
    const canReply = hasPermission('COMMENT_REPLY');
    const canReview = hasPermission('COMMENT_REVIEW');
    const canDelete = hasPermission('COMMENT_DELETE');

    const [postKeywordInput, setPostKeywordInput] = useState('');
    const [postPage, setPostPage] = useState(1);
    const postPageSize = 8;
    const [postTotal, setPostTotal] = useState(0);
    const [postOptions, setPostOptions] = useState([]);
    const [postLoading, setPostLoading] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState('all');

    const [commentKeywordInput, setCommentKeywordInput] = useState('');
    const [commentKeyword, setCommentKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [total, setTotal] = useState(0);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentsError, setCommentsError] = useState('');

    const [form, setForm] = useState({ postId: '', authorName: '', content: '', parentId: '' });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { confirm, confirmDialog } = useAdminConfirmDialog(isDarkMode);
    const [replyTarget, setReplyTarget] = useState(null);

    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [editStatus, setEditStatus] = useState('APPROVED');
    const [editError, setEditError] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const normalizedPostId = selectedPostId === 'all' ? null : Number(selectedPostId) || null;
    const totalPostPages = Math.max(Math.ceil(postTotal / postPageSize), 1);
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    const loadPosts = useCallback(async () => {
        setPostLoading(true);
        try {
            const res = await adminFetchPosts({
                keyword: postKeywordInput.trim() || undefined,
                page: postPage,
                size: postPageSize
            });
            const data = res.data || res;
            setPostOptions(data?.records || []);
            setPostTotal(data?.total || 0);
        } catch (error) {
            logger.warn('load posts failed', error);
        } finally {
            setPostLoading(false);
        }
    }, [postKeywordInput, postPage, postPageSize]);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    useEffect(() => {
        if (!form.postId && postOptions.length) {
            setForm((prev) => ({ ...prev, postId: prev.postId || String(postOptions[0].id) }));
        }
    }, [postOptions, form.postId]);

    useEffect(() => {
        if (selectedPostId !== 'all') {
            setForm((prev) => ({ ...prev, postId: String(selectedPostId) }));
        }
    }, [selectedPostId]);

    useEffect(() => {
        if (replyTarget && form.postId && Number(form.postId) !== replyTarget.postId) {
            setReplyTarget(null);
            setForm((prev) => ({ ...prev, parentId: '' }));
        }
    }, [form.postId, replyTarget]);

    const loadComments = useCallback(async () => {
        if (!canView) return;
        setLoadingComments(true);
        setCommentsError('');
        try {
            const res = await adminFetchComments({
                postId: normalizedPostId || undefined,
                keyword: commentKeyword || undefined,
                status: statusFilter,
                page,
                size: pageSize
            });
            const data = res.data || res;
            setComments(data?.records || []);
            setTotal(data?.total || 0);
        } catch (error) {
            setComments([]);
            setCommentsError(error.message || '加载评论失败');
        } finally {
            setLoadingComments(false);
        }
    }, [canView, normalizedPostId, commentKeyword, statusFilter, page, pageSize]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, normalizedPostId]);

    const scopeSummary = useMemo(() => {
        const scope = normalizedPostId ? `文章 #${normalizedPostId}` : '全部文章';
        const status = COMMENT_STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label || '全部状态';
        return { scope, status };
    }, [normalizedPostId, statusFilter]);

    const renderStatusBadge = (status) => {
        const map = {
            APPROVED: { label: '已通过', className: 'bg-emerald-100 text-emerald-700' },
            PENDING: { label: '待审核', className: 'bg-amber-100 text-amber-700' },
            REJECTED: { label: '已拒绝', className: 'bg-red-100 text-red-600' },
            SPAM: { label: '垃圾', className: 'bg-gray-200 text-gray-700' },
        };
        const info = map[status] || { label: status || '未知', className: 'bg-gray-200 text-gray-700' };
        return <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${info.className}`}>{info.label}</span>;
    };

    const handleCommentSearch = () => {
        setCommentKeyword(commentKeywordInput.trim());
        setPage(1);
    };

    const handleSubmitForm = async (event) => {
        event.preventDefault();
        setFormError('');
        setFormSuccess('');
        if (!canCreate) {
            setFormError('当前账号无权发布后台评论');
            return;
        }
        const postId = Number(form.postId || normalizedPostId);
        if (!postId) {
            setFormError('请先选择文章');
            return;
        }
        if (!form.content.trim()) {
            setFormError('请输入评论内容');
            return;
        }
        setSubmitting(true);
        try {
            await createComment(postId, {
                authorName: form.authorName.trim() || undefined,
                content: form.content.trim(),
                parentId: form.parentId ? Number(form.parentId) : undefined,
            });
            setForm((prev) => ({ ...prev, content: '', parentId: '' }));
            setReplyTarget(null);
            setFormSuccess('评论已提交');
            loadComments();
        } catch (error) {
            setFormError(error.message || '提交失败');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePickReply = (comment) => {
        if (!canReply) return;
        setReplyTarget(comment);
        setForm((prev) => ({ ...prev, postId: String(comment.postId), parentId: String(comment.id) }));
    };

    const handleSaveEdit = async () => {
        if (!editingId || !canReview) return;
        if (!editContent.trim()) {
            setEditError('内容不能为空');
            return;
        }
        setSavingEdit(true);
        setEditError('');
        try {
            await adminUpdateComment(editingId, {
                content: editContent.trim(),
                status: editStatus
            });
            setEditingId(null);
            setEditContent('');
            loadComments();
        } catch (error) {
            setEditError(error.message || '更新失败');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteComment = async (comment) => {
        if (!canDelete) return;
        const confirmed = await confirm({
            title: '删除评论',
            description: `确认删除评论 #${comment.id} 吗？该评论删除后将无法恢复。`,
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        setDeletingId(comment.id);
        try {
            await adminDeleteComment(comment.id);
            loadComments();
        } catch (error) {
            setCommentsError(error.message || '删除失败');
        } finally {
            setDeletingId(null);
        }
    };

    if (permLoading) {
        return <div className="p-10 text-center text-sm text-gray-500">权限信息加载中...</div>;
    }

    if (!canView) {
        return (
            <PermissionNotice
                title="无法访问评论管理"
                description="当前账号未被授予“评论管理”权限，请联系超级管理员调整权限配置。"
            />
        );
    }

    return (
        <>
            {confirmDialog}
            <div className="space-y-8">
            <div className={`${cardBg} p-6 rounded-2xl shadow-lg space-y-4`}>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.3em] text-gray-400">评论来源</label>
                        <select
                            className={inputClass}
                            value={selectedPostId}
                            onChange={(e) => setSelectedPostId(e.target.value)}
                        >
                            <option value="all">全部文章</option>
                            {postOptions.map((post) => (
                                <option key={post.id} value={post.id}>{post.title}</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-gray-500">可通过下方列表加载更多文章后再刷新评论。</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.3em] text-gray-400">状态筛选</label>
                        <select
                            className={inputClass}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            {COMMENT_STATUS_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[2fr_1fr] items-end">
                    <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-gray-400">关键字</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                className={inputClass}
                                placeholder="按内容或作者搜索"
                                value={commentKeywordInput}
                                onChange={(e) => setCommentKeywordInput(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={handleCommentSearch}
                                className="px-4 py-2 border-2 border-black font-bold text-sm hover:-translate-y-0.5 transition"
                            >
                                搜索
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadComments()}
                        className="w-full md:w-auto px-4 py-2 border-2 border-black font-bold bg-[#FFD700] text-black rounded-full flex items-center justify-center gap-2 hover:-translate-y-0.5 transition"
                    >
                        <RefreshCw size={14} /> 刷新
                    </button>
                </div>
            </div>

            <div className={`${cardBg} p-6 rounded-2xl shadow-lg space-y-3`}>
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>文章共 {postTotal} 篇 · 第 {postPage} / {totalPostPages} 页</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPostPage((prev) => Math.max(prev - 1, 1))}
                            disabled={postPage === 1 || postLoading}
                            className="px-3 py-1 border border-black rounded disabled:opacity-40"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPostPage((prev) => Math.min(prev + 1, totalPostPages))}
                            disabled={postPage >= totalPostPages || postLoading}
                            className="px-3 py-1 border border-black rounded disabled:opacity-40"
                        >
                            下一页
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input
                        className={inputClass}
                        placeholder="输入标题或 Slug"
                        value={postKeywordInput}
                        onChange={(e) => setPostKeywordInput(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setPostPage(1);
                            loadPosts();
                        }}
                        className="px-4 py-2 border-2 border-black font-bold text-sm hover:-translate-y-0.5 transition"
                    >
                        查询文章
                    </button>
                </div>
                {postLoading && <p className="text-xs text-gray-500">文章列表加载中...</p>}
            </div>

            <div className={`${cardBg} p-6 rounded-2xl shadow-lg space-y-4`}>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className={`${statsBg} rounded-xl p-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">当前范围</p>
                        <p className="text-lg font-black mt-1">{scopeSummary.scope}</p>
                    </div>
                    <div className={`${statsBg} rounded-xl p-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">筛选状态</p>
                        <p className="text-lg font-black mt-1">{scopeSummary.status}</p>
                    </div>
                    <div className={`${statsBg} rounded-xl p-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">符合条件</p>
                        <p className="text-lg font-black mt-1">{total}</p>
                    </div>
                </div>
                {commentsError && (
                    <div className="text-sm text-red-500 border-l-4 border-red-500 pl-3">
                        {commentsError}
                    </div>
                )}
                {loadingComments ? (
                    <p className="text-center py-10 text-sm text-gray-500">评论加载中...</p>
                ) : comments.length === 0 ? (
                    <p className="text-center py-10 text-sm text-gray-500">暂无符合条件的评论</p>
                ) : (
                    <div className={`overflow-x-auto ${getAdminDarkScrollbarClass(isDarkMode)}`}>
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className={isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-600'}>
                                    <th className="px-4 py-2 text-left">ID</th>
                                    <th className="px-4 py-2 text-left">所属文章</th>
                                    <th className="px-4 py-2 text-left">作者 / IP</th>
                                    <th className="px-4 py-2 text-left w-1/3">内容</th>
                                    <th className="px-4 py-2 text-left">状态</th>
                                    <th className="px-4 py-2 text-left w-48">操作</th>
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? 'divide-y divide-gray-800 text-gray-100' : 'divide-y divide-gray-200 text-gray-800'}>
                                {comments.map((comment) => (
                                    <tr key={comment.id} className="align-top">
                                        <td className="px-4 py-3 font-mono text-xs">#{comment.id}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold">{comment.postTitle || '未关联文章'}</p>
                                            {comment.postSlug && (
                                                <p className="text-xs text-gray-500">/{comment.postSlug}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold">{comment.authorName || '访客'}</p>
                                            <p className="text-xs text-gray-500">{comment.authorIp || '未知 IP'}</p>
                                            <p className="text-xs text-gray-400 mt-1">{comment.createdAt || ''}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === comment.id ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        className={`${inputClass} font-medium`}
                                                        rows={4}
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                    />
                                                    <select
                                                        className={inputClass}
                                                        value={editStatus}
                                                        onChange={(e) => setEditStatus(e.target.value)}
                                                    >
                                                        {REVIEW_STATUS_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                    {editError && <p className="text-xs text-red-500">{editError}</p>}
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveEdit}
                                                            disabled={savingEdit}
                                                            className="px-4 py-2 border-2 border-black font-bold bg-[#00E096] text-black rounded-full text-xs disabled:opacity-50"
                                                        >
                                                            {savingEdit ? '保存中...' : '保存审核'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingId(null);
                                                                setEditContent('');
                                                                setEditStatus('APPROVED');
                                                                setEditError('');
                                                            }}
                                                            className="px-4 py-2 border-2 border-black font-bold rounded-full text-xs"
                                                        >
                                                            取消
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="whitespace-pre-line break-words">{comment.content || '-'}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {renderStatusBadge(comment.status)}
                                            {comment.parentId && (
                                                <p className="text-[11px] text-gray-500 mt-1">回复 #{comment.parentId}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 space-y-2">
                                            {editingId !== comment.id && (
                                                <>
                                                    {canReview && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingId(comment.id);
                                                                setEditContent(comment.content || '');
                                                                setEditStatus(comment.status || 'APPROVED');
                                                                setEditError('');
                                                            }}
                                                            className="w-full px-3 py-1 border-2 border-indigo-500 text-indigo-600 font-bold text-xs rounded"
                                                        >
                                                            审核/编辑
                                                        </button>
                                                    )}
                                                    {canReply && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePickReply(comment)}
                                                            className="w-full px-3 py-1 border-2 border-purple-500 text-purple-600 font-bold text-xs rounded"
                                                        >
                                                            回复
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteComment(comment)}
                                                            disabled={deletingId === comment.id}
                                                            className="w-full px-3 py-1 border-2 border-red-500 text-red-600 font-bold text-xs rounded disabled:opacity-50"
                                                        >
                                                            {deletingId === comment.id ? '删除中...' : '删除'}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-between mt-2 gap-3">
                    <p className="text-sm text-gray-500">第 {page} / {totalPages} 页（共 {total} 条）</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                            disabled={page === 1 || loadingComments}
                            className="px-4 py-1 border-2 border-black font-bold rounded disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={page >= totalPages || loadingComments}
                            className="px-4 py-1 border-2 border-black font-bold rounded disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>

            {canCreate && (
                <div className={`${cardBg} p-6 rounded-2xl shadow-lg space-y-4`}>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <MessageSquare size={18} /> 发布后台回复
                    </h3>
                    {formError && <div className="text-sm text-red-500">{formError}</div>}
                    {formSuccess && <div className="text-sm text-emerald-500">{formSuccess}</div>}
                    <form onSubmit={handleSubmitForm} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-xs uppercase tracking-[0.3em] text-gray-400">文章</label>
                                <select
                                    className={inputClass}
                                    value={form.postId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, postId: e.target.value }))}
                                >
                                    <option value="">请选择文章</option>
                                    {postOptions.map((post) => (
                                        <option key={post.id} value={post.id}>{post.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-[0.3em] text-gray-400">显示作者</label>
                                <input
                                    className={inputClass}
                                    placeholder="默认使用账号昵称"
                                    value={form.authorName}
                                    onChange={(e) => setForm((prev) => ({ ...prev, authorName: e.target.value }))}
                                />
                            </div>
                        </div>
                        {replyTarget && (
                            <div className="flex items-center justify-between text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                <span>将回复 #{replyTarget.id} · {replyTarget.authorName || '访客'}</span>
                                <button
                                    type="button"
                                    className="font-bold underline"
                                    onClick={() => {
                                        setReplyTarget(null);
                                        setForm((prev) => ({ ...prev, parentId: '' }));
                                    }}
                                >
                                    取消
                                </button>
                            </div>
                        )}
                        <div>
                            <label className="text-xs uppercase tracking-[0.3em] text-gray-400">回复内容</label>
                            <textarea
                                className={`${inputClass} mt-2`}
                                rows={4}
                                value={form.content}
                                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                                placeholder="请输入要发布的评论内容..."
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setForm({ postId: '', authorName: '', content: '', parentId: '' });
                                    setReplyTarget(null);
                                    setFormError('');
                                    setFormSuccess('');
                                }}
                                className="px-5 py-2 border-2 border-black font-bold rounded-full text-sm"
                            >
                                重置
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2 border-2 border-black font-bold bg-[#FFD700] text-black rounded-full text-sm disabled:opacity-60"
                            >
                                {submitting ? '提交中...' : '发布评论'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            </div>
        </>
    );
};

const UserManagementView = ({ isDarkMode }) => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [formMode, setFormMode] = useState("create");
    const [selectedUserId, setSelectedUserId] = useState(null);
    const emptyForm = useMemo(() => ({
        username: "",
        displayName: "",
        email: "",
        title: "",
        bio: "",
        githubUrl: "",
        wechatQrUrl: "",
        status: "ACTIVE",
        roleCode: "USER",
        password: "",
        avatarUrl: "",
    }), []);
    const [form, setForm] = useState(emptyForm);
    const [meta, setMeta] = useState({ id: null, createdAt: null, lastLoginAt: null });
    const [saving, setSaving] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const formRef = useRef(null);
    const avatarInputRef = useRef(null);
    const usersFetchTokenRef = useRef(0);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const { confirm, confirmDialog } = useAdminConfirmDialog(isDarkMode);
    const scrollFormIntoView = useCallback(() => {
        requestAnimationFrame(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);

    const cardBg = isDarkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200";
    const inputClass = `w-full px-3 py-2 border-2 rounded font-medium outline-none transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white focus:border-indigo-400' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
    const STATUS_OPTIONS = [
        { value: 'ACTIVE', label: '正常' },
        { value: 'DISABLED', label: '已禁用' },
    ];

    const getDefaultRoleCode = (roleList) => {
        if (!Array.isArray(roleList) || roleList.length === 0) return 'USER';
        const preferred = roleList.find((role) => (role.code || '').toUpperCase() === 'USER');
        return preferred?.code || roleList[0].code;
    };

    const resolveMediaUrl = (path) => buildAssetUrl(path, '');
    const resolveUserAvatar = (user) => resolveMediaUrl(user?.avatar || user?.avatarUrl || user?.avatar_url);

    const loadRoles = useCallback(async () => {
        try {
            const res = await adminFetchRoles();
            const data = res.data || res || [];
            setRoles(data);
            const defaultRole = getDefaultRoleCode(data);
            setForm((prev) => ({ ...prev, roleCode: prev.roleCode || defaultRole }));
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || '无法加载角色列表' });
        }
    }, []);

    const loadUsers = useCallback(async () => {
        const token = ++usersFetchTokenRef.current;
        setLoading(true);
        try {
            const params = { page, size };
            if (roleFilter !== 'all') params.role = roleFilter;
            const trimmedKeyword = keyword.trim();
            if (trimmedKeyword) params.keyword = trimmedKeyword;
            const res = await adminFetchUsers(params);
            const data = res.data || res;
            if (usersFetchTokenRef.current !== token) {
                return;
            }
            setUsers(data?.records || []);
            setTotal(data?.total || 0);
        } catch (err) {
            if (usersFetchTokenRef.current === token) {
                setFeedback({ type: 'error', text: err.message || '加载用户失败' });
            }
        } finally {
            if (usersFetchTokenRef.current === token) {
                setLoading(false);
            }
        }
    }, [keyword, page, size, roleFilter]);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const resetForm = useCallback(() => {
        const defaultRole = getDefaultRoleCode(roles);
        setForm({
            ...emptyForm,
            roleCode: defaultRole,
        });
        setMeta({ id: null, createdAt: null, lastLoginAt: null });
        setSelectedUserId(null);
        setFormMode('create');
        setFeedback(null);
        scrollFormIntoView();
    }, [roles, scrollFormIntoView, emptyForm]);

    const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setFeedback({ type: 'error', text: '请上传图片文件' });
            event.target.value = '';
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setFeedback({ type: 'error', text: '头像需小于 2MB' });
            event.target.value = '';
            return;
        }
        setAvatarUploading(true);
        try {
            const response = await uploadAvatar(file);
            const newPath = response?.data?.url
                || response?.url
                || response?.avatar
                || response?.avatarUrl
                || response?.avatar_url
                || response?.path;
            if (!newPath) {
                throw new Error('上传结果为空');
            }
            setForm((prev) => ({ ...prev, avatarUrl: newPath }));
            setFeedback({ type: 'success', text: '头像已更新' });
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || '头像上传失败' });
        } finally {
            setAvatarUploading(false);
            event.target.value = '';
        }
    };

    const handleEdit = async (id) => {
        setFormMode('edit');
        setSelectedUserId(id);
        setFormLoading(true);
        try {
            const res = await adminFetchUserDetail(id);
            const data = res.data || res;
            setForm({
                username: data.username || '',
                displayName: data.displayName || '',
                email: data.email || '',
                title: data.title || '',
                bio: data.bio || '',
                githubUrl: data.githubUrl || '',
                wechatQrUrl: data.wechatQrUrl || '',
                status: data.status || 'ACTIVE',
                roleCode: data.roleCode || getDefaultRoleCode(roles),
                password: '',
                avatarUrl: data.avatar || data.avatarUrl || data.avatar_url || '',
            });
            setMeta({ id: data.id, createdAt: data.createdAt, lastLoginAt: data.lastLoginAt });
            setFeedback(null);
            requestAnimationFrame(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || '加载用户详情失败' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (user) => {
        const confirmed = await confirm({
            title: '删除用户',
            description: `确认删除 ${user.username} 吗？删除账号后，该用户将无法再登录后台。`,
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        try {
            await adminDeleteUser(user.id);
            if (selectedUserId === user.id) {
                resetForm();
            }
            setFeedback({ type: 'success', text: '用户已删除' });
            loadUsers();
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || '删除失败' });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                username: form.username.trim(),
                displayName: form.displayName.trim(),
                email: form.email?.trim() || null,
                title: form.title?.trim() || null,
                bio: form.bio?.trim() || null,
                githubUrl: form.githubUrl?.trim() || null,
                wechatQrUrl: form.wechatQrUrl?.trim() || null,
                status: form.status,
                roleCode: form.roleCode,
                avatarUrl: form.avatarUrl || null,
            };
            if (form.password?.trim()) {
                payload.password = form.password.trim();
            }
            let result;
            if (formMode === 'create') {
                if (!payload.password) {
                    throw new Error('请先设置初始密码');
                }
                result = await adminCreateUser(payload);
                setFeedback({ type: 'success', text: '新用户已创建' });
                resetForm();
            } else if (selectedUserId) {
                result = await adminUpdateUser(selectedUserId, payload);
                const data = result.data || result;
                setFeedback({ type: 'success', text: '用户资料已更新' });
                setMeta({ id: data.id, createdAt: data.createdAt, lastLoginAt: data.lastLoginAt });
                setForm((prev) => ({ ...prev, password: '' }));
            }
            loadUsers();
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || '保存失败' });
        } finally {
            setSaving(false);
        }
    };

    const InfoBadge = ({ label, value }) => (
        <div
            className={`p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-mono">{value || '—'}</p>
        </div>
    );
    const avatarPreviewSrc = resolveMediaUrl(form.avatarUrl);

    return (
        <>
            {confirmDialog}
            <div className="space-y-8">
            <div className={`${cardBg} rounded-xl p-6 shadow-lg`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Users size={20} /> 用户列表</h2>
                        <p className="text-sm text-gray-500 mt-1">可筛选查看所有后台账号，对敏感操作前请仔细核对。</p>
                    </div>
                    <button
                        onClick={resetForm}
                        className="px-4 py-2 border-2 border-black font-bold text-sm bg-[#FFD700] text-black hover:-translate-y-0.5 transition"
                    >
                        新建用户
                    </button>
                </div>
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <input
                        className={inputClass}
                        placeholder="搜索用户名或邮箱"
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                    />
                    <select
                        className={inputClass}
                        value={roleFilter}
                        onChange={(e) => {
                            setRoleFilter(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="all">所有角色</option>
                        {roles.map((role) => (
                            <option key={role.code} value={role.code}>{role.name}</option>
                        ))}
                    </select>
                    <select
                        className={inputClass}
                        value={size}
                        onChange={(e) => {
                            setSize(Number(e.target.value));
                            setPage(1);
                        }}
                    >
                        {[5, 10, 20].map((option) => (
                            <option key={option} value={option}>每页 {option} 条</option>
                        ))}
                    </select>
                </div>
                {loading ? (
                    <p className="text-center py-10 text-gray-500">数据加载中...</p>
                ) : users.length === 0 ? (
                    <p className="text-center py-10 text-gray-500">暂无用户</p>
                ) : (
                    <div className={`overflow-x-auto ${getAdminDarkScrollbarClass(isDarkMode)}`}>
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className={isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-600'}>
                                    <th className="px-4 py-2 text-left">头像</th>
                                    <th className="px-4 py-2 text-left">用户名</th>
                                    <th className="px-4 py-2 text-left">显示名</th>
                                    <th className="px-4 py-2 text-left">邮箱</th>
                                    <th className="px-4 py-2 text-left">角色</th>
                                    <th className="px-4 py-2 text-left">状态</th>
                                    <th className="px-4 py-2 text-left">最近登录</th>
                                    <th className="px-4 py-2 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody
                                className={isDarkMode ? 'divide-y divide-gray-800 text-gray-100' : 'divide-y divide-gray-200 text-gray-700'}>
                                {users.map((user) => {
                                    const avatarSrc = resolveUserAvatar(user);
                                    const avatarFallback = (user.displayName || user.username || 'U').charAt(0).toUpperCase();
                                    return (
                                        <tr
                                            key={user.id}
                                            className={`${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} ${selectedUserId === user.id ? (isDarkMode ? 'bg-gray-800/60' : 'bg-indigo-50') : ''}`}
                                        >
                                            <td className="px-4 py-3">
                                                <div
                                                    className={`w-12 h-12 rounded-full border-2 border-black overflow-hidden flex items-center justify-center text-sm font-bold ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                                                    {avatarSrc ? (
                                                        <img src={avatarSrc} alt={`${user.username} avatar`}
                                                            className="w-full h-full object-cover" />
                                                    ) : (
                                                        avatarFallback
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{user.username}</td>
                                            <td className="px-4 py-3">{user.displayName || '—'}</td>
                                            <td className="px-4 py-3">{user.email || '—'}</td>
                                            <td className="px-4 py-3">{user.roleName || user.roleCode}</td>
                                            <td className="px-4 py-3">{STATUS_OPTIONS.find((s) => s.value === user.status)?.label || '—'}</td>
                                            <td className="px-4 py-3 text-gray-500">{formatDate(user.lastLoginAt)}</td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <button
                                                    onClick={() => handleEdit(user.id)}
                                                    className="px-3 py-1 border-2 border-indigo-500 text-indigo-600 font-bold text-xs"
                                                >
                                                    编辑
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="px-3 py-1 border-2 border-red-500 text-red-600 font-bold text-xs"
                                                >
                                                    删除
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-3">
                    <p className="text-sm text-gray-500">第 {page} / {Math.max(Math.ceil(total / size), 1)} 页（共 {total} 个账号）</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(p + 1, Math.max(Math.ceil(total / size), 1)))}
                            disabled={page >= Math.max(Math.ceil(total / size), 1)}
                            className="px-3 py-1 border-2 border-black font-bold disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>

            <div className={`${cardBg} rounded-xl p-6 shadow-lg`} ref={formRef}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">{formMode === 'create' ? '创建新用户' : '编辑用户'}</h2>
                        <p className="text-sm text-gray-500">参照个人资料页，可直接修改角色与密码。</p>
                    </div>
                    {formMode === 'edit' && (
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 border-2 border-black font-bold text-sm bg-white text-black hover:-translate-y-0.5 transition"
                        >
                            切换到创建模式
                        </button>
                    )}
                </div>
                {feedback?.text && (
                    <div
                        className={`mb-4 border-l-4 p-4 ${feedback.type === 'error' ? 'border-red-500 bg-red-50 text-red-600' : 'border-emerald-500 bg-emerald-50 text-emerald-600'}`}>
                        {feedback.text}
                    </div>
                )}
                {formLoading && <p className="mb-4 text-sm text-gray-500">正在加载用户详情...</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">用户头像</label>
                        <div className="flex items-center gap-4 mt-3">
                            <div
                                className={`w-20 h-20 rounded-full border-2 border-black overflow-hidden flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                                {avatarPreviewSrc ? (
                                    <img src={avatarPreviewSrc} alt="avatar preview"
                                        className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} />
                                )}
                            </div>
                            <div className="space-y-2">
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={avatarUploading}
                                    className="px-4 py-2 border-2 border-black font-bold text-sm bg-[#6366F1] text-white rounded-full disabled:opacity-50"
                                >
                                    {avatarUploading ? '上传中...' : '上传头像'}
                                </button>
                                <p className="text-xs text-gray-500 dark:text-gray-400">支持 JPG/PNG，大小不超过 2MB。</p>
                                {form.avatarUrl && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 break-all">当前路径：{form.avatarUrl}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">用户名</label>
                            <input className={inputClass} name="username" value={form.username}
                                onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">显示名</label>
                            <input className={inputClass} name="displayName" value={form.displayName}
                                onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">邮箱</label>
                            <input className={inputClass} name="email" value={form.email} onChange={handleInputChange}
                                type="email" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">头衔</label>
                            <input className={inputClass} name="title" value={form.title} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">GitHub</label>
                            <input className={inputClass} name="githubUrl" value={form.githubUrl}
                                onChange={handleInputChange} />
                        </div>
                        <div>
                            <label
                                className="text-xs font-semibold text-gray-500 dark:text-gray-400">微信二维码地址</label>
                            <input className={inputClass} name="wechatQrUrl" value={form.wechatQrUrl}
                                autoComplete="url"
                                onChange={handleInputChange} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">个人简介</label>
                        <textarea className={`${inputClass} mt-2`} rows={3} name="bio" value={form.bio}
                            onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">角色</label>
                            <select className={`${inputClass} mt-2`} name="roleCode" value={form.roleCode}
                                onChange={handleInputChange}>
                                {roles.map((role) => (
                                    <option key={role.code} value={role.code}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">状态</label>
                            <select className={`${inputClass} mt-2`} name="status" value={form.status}
                                onChange={handleInputChange}>
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label
                            className="text-xs font-semibold text-gray-500 dark:text-gray-400">{formMode === 'create' ? '初始密码' : '重置密码（留空不改）'}</label>
                        <input
                            className={`${inputClass} mt-2`}
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={handleInputChange}
                            placeholder={formMode === 'create' ? '请设置初始密码' : '若需要重置请输入新密码'}
                        />
                    </div>
                    {formMode === 'edit' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InfoBadge label="用户 ID" value={meta.id} />
                            <InfoBadge label="创建时间" value={formatDate(meta.createdAt)} />
                            <InfoBadge label="最近登录" value={formatDate(meta.lastLoginAt)} />
                        </div>
                    )}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={saving || formLoading}
                            className="px-6 py-2 border-2 border-black font-bold bg-[#00E096] text-black rounded-full hover:-translate-y-0.5 transition disabled:opacity-50"
                        >
                            {saving ? '保存中...' : '保存设置'}
                        </button>
                    </div>
                </form>
            </div>
            </div>
        </>
    );
};

// 4.4 Sub-Component: Permissions View (Super Admin Only)
const PermissionsView = ({ isDarkMode }) => {
    const surface = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';
    const [matrix, setMatrix] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [roleSelections, setRoleSelections] = useState({
        ADMIN: new Set(),
        USER: new Set()
    });
    const [savingRole, setSavingRole] = useState(null);
    const { notice, showNotice, hideNotice } = useTimedNotice();
    const { hasPermission } = usePermissionContext();

    const fetchMatrix = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await adminFetchPermissionMatrix();
            const data = res.data || res;
            setMatrix(data?.modules || []);
            const adminSet = new Set();
            const userSet = new Set();
            (data?.modules || []).forEach((module) => {
                module.actions.forEach((action) => {
                    if (action.admin) adminSet.add(action.code);
                    if (action.user) userSet.add(action.code);
                });
            });
            setRoleSelections({ ADMIN: adminSet, USER: userSet });
        } catch (err) {
            setError(err.message || '加载权限矩阵失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMatrix();
    }, [fetchMatrix]);

    const togglePermission = (role, code) => {
        setRoleSelections((prev) => {
            const next = new Set(prev[role]);
            if (next.has(code)) {
                next.delete(code);
            } else {
                next.add(code);
            }
            return { ...prev, [role]: next };
        });
    };

    const handleSaveRole = async (role) => {
        setSavingRole(role);
        setError('');
        try {
            await adminUpdateRolePermissions(role, Array.from(roleSelections[role]));
            showNotice(`${role === 'ADMIN' ? '管理员' : '用户'}权限已更新`);
        } catch (err) {
            setError(err.message || '保存失败');
        } finally {
            setSavingRole(null);
        }
    };

    const roleCards = [
        { role: 'SUPER_ADMIN', label: '超级管理员', description: '拥有所有模块的最高权限，可配置其余角色权限。' },
        { role: 'ADMIN', label: '管理员', description: '负责内容与互动管理，可通过矩阵勾选需要开放的模块动作。' },
        { role: 'USER', label: '用户', description: '普通登录用户，通常仅开放浏览与发表评论。' }
    ];

    if (!hasPermission('PERMISSION_MANAGE')) {
        return (
            <PermissionNotice
                title="仅超级管理员可访问"
                description="只有超级管理员才能调整权限矩阵，请使用拥有最高权限的账号登录。"
            />
        );
    }

    // 权限矩阵页面只负责权限配置，系统维护/游戏管理已迁移到 SystemSettingsView（/admin/settings）。
    return (
        <div className="space-y-8">
            <AdminNoticeBar notice={notice} onClose={hideNotice} />
            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-6`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-2xl font-bold">权限矩阵</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            勾选后保存即可生效，超级管理员默认拥有全部权限。
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchMatrix}
                        disabled={loading}
                        className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                    >
                        {loading ? '刷新中...' : '刷新矩阵'}
                    </button>
                </div>

                {error && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="p-8 text-center text-sm text-gray-500">加载中，请稍候...</div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-4">
                            {roleCards.map((card) => (
                                <div
                                    key={card.role}
                                    className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-black'} border-2 rounded-xl p-4 shadow-[4px_6px_0px_rgba(0,0,0,0.25)] space-y-2`}
                                >
                                    <h4 className="text-lg font-bold">{card.label}</h4>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{card.description}</p>
                                    {card.role === 'SUPER_ADMIN' ? (
                                        <div className={`text-xs font-semibold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                            默认全选，不可修改
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSaveRole(card.role)}
                                            disabled={savingRole === card.role}
                                            className="mt-2 px-4 py-1.5 border-2 border-black rounded-full text-xs font-bold bg-black text-white shadow-[3px_3px_0px_0px_#000] disabled:opacity-60"
                                        >
                                            {savingRole === card.role ? '保存中...' : '保存该角色'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {matrix.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">暂无可配置权限。</div>
                        ) : (
                            <div className="space-y-5">
                                {matrix.map((module) => (
                                    <div key={module.module} className={`${surface} rounded-xl p-4 space-y-3`}>
                                        <div>
                                            <h5 className="text-lg font-bold">{module.label || module.module}</h5>
                                            {module.description && (
                                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                                    {module.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className={`overflow-x-auto ${getAdminDarkScrollbarClass(isDarkMode)}`}>
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        <th className="text-left py-2 pr-3">动作</th>
                                                        <th className="text-center py-2 px-3">管理员</th>
                                                        <th className="text-center py-2 px-3">用户</th>
                                                        <th className="text-left py-2 pl-3">说明</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(module.actions || []).map((action) => {
                                                        const code = action.code;
                                                        return (
                                                            <tr
                                                                key={code}
                                                                className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                                                            >
                                                                <td className="py-2 pr-3 font-semibold">{action.label || code}</td>
                                                                <td className="py-2 px-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4 h-4 accent-black"
                                                                        checked={roleSelections.ADMIN.has(code)}
                                                                        onChange={() => togglePermission('ADMIN', code)}
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4 h-4 accent-black"
                                                                        checked={roleSelections.USER.has(code)}
                                                                        onChange={() => togglePermission('USER', code)}
                                                                    />
                                                                </td>
                                                                <td className={`py-2 pl-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                    {action.description || '--'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // 旧版系统维护 UI（已迁移到 /admin/settings），保留但不再执行。
};


// 4.5 Sub-Component: System Settings (Super Admin) — 仅游戏管理精简版
const SystemSettingsView = ({ isDarkMode, user, notification, setNotification, onGameChanged, onAiAssistantChanged, onHomeBackgroundChanged }) => {
    const MAX_BROADCAST_LEN = 180;
    const SETTINGS_TABS = [
        { key: 'system-monitor', label: '系统监控' },
        { key: 'broadcast', label: '广播管理' },
        { key: 'home-background', label: '首页背景' },
        { key: 'knowledge', label: 'AI助理' },
        { key: 'registration', label: '注册邀请码' },
        { key: 'games', label: '游戏管理' },
        { key: 'cleanup', label: '存储清理' }
    ];
    const [activeSettingsTab, setActiveSettingsTab] = useState('system-monitor');
    const [broadcastDraft, setBroadcastDraft] = useState({
        content: notification?.content || '',
        style: (notification?.style || 'ALERT').toUpperCase(),
        active: Boolean(notification?.isOpen)
    });
    const [broadcastSaving, setBroadcastSaving] = useState(false);
    const [broadcastError, setBroadcastError] = useState('');
    const [systemMonitor, setSystemMonitor] = useState(null);
    const [systemMonitorLoading, setSystemMonitorLoading] = useState(false);
    const [systemMonitorError, setSystemMonitorError] = useState('');

    const [gameList, setGameList] = useState([]);
    const [gameLoading, setGameLoading] = useState(false);
    const [gameError, setGameError] = useState('');
    const [gameForm, setGameForm] = useState({ title: '', description: '', status: 'ACTIVE', sortOrder: 0, file: null });
    const [gameEditingId, setGameEditingId] = useState(null);
    const [gameSaving, setGameSaving] = useState(false);
    const [gameDeletingId, setGameDeletingId] = useState(null);

    const [homeBackgrounds, setHomeBackgrounds] = useState([]);
    const [homeBackgroundLoading, setHomeBackgroundLoading] = useState(false);
    const [homeBackgroundUploading, setHomeBackgroundUploading] = useState(false);
    const [homeBackgroundSelectingId, setHomeBackgroundSelectingId] = useState(null);
    const [homeBackgroundDeletingId, setHomeBackgroundDeletingId] = useState(null);
    const [homeBackgroundError, setHomeBackgroundError] = useState('');
    const [homeBackgroundFile, setHomeBackgroundFile] = useState(null);

    const [knowledgeList, setKnowledgeList] = useState([]);
    const [knowledgeLoading, setKnowledgeLoading] = useState(false);
    const [knowledgeError, setKnowledgeError] = useState('');
    const [knowledgeForm, setKnowledgeForm] = useState({ title: '', enabled: true, file: null, contentText: '' });
    const [knowledgeEditingId, setKnowledgeEditingId] = useState(null);
    const [knowledgeSaving, setKnowledgeSaving] = useState(false);
    const [knowledgeDeletingId, setKnowledgeDeletingId] = useState(null);
    const [knowledgeKeyword, setKnowledgeKeyword] = useState('');
    const [aiChatAdminEnabled, setAiChatAdminEnabled] = useState(true);
    const [aiRagAdminEnabled, setAiRagAdminEnabled] = useState(false);
    const [aiChatCapable, setAiChatCapable] = useState(true);
    const [aiRagCapable, setAiRagCapable] = useState(false);
    const [aiChatEffectiveEnabled, setAiChatEffectiveEnabled] = useState(true);
    const [aiRagEffectiveEnabled, setAiRagEffectiveEnabled] = useState(false);
    const [aiChatDisabledReason, setAiChatDisabledReason] = useState(null);
    const [aiRagDisabledReason, setAiRagDisabledReason] = useState(null);
    const [aiAssistantLoading, setAiAssistantLoading] = useState(false);
    const [aiAssistantSaving, setAiAssistantSaving] = useState(false);
    const [aiAssistantError, setAiAssistantError] = useState('');
    const [inviteDurationCode, setInviteDurationCode] = useState('MINUTES_5');
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteGenerating, setInviteGenerating] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [latestInvite, setLatestInvite] = useState(null);
    const { hasPermission } = usePermissionContext();
    const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '--');
    const { notice, showNotice, hideNotice } = useTimedNotice(4200);
    const { confirm, confirmDialog } = useAdminConfirmDialog(isDarkMode);

    useEffect(() => {
        setBroadcastDraft({
            content: notification?.content || '',
            style: (notification?.style || 'ALERT').toUpperCase(),
            active: Boolean(notification?.isOpen)
        });
    }, [notification?.content, notification?.style, notification?.isOpen]);
    const handleBroadcastContentChange = useCallback((value) => {
        const next = (value || '').slice(0, MAX_BROADCAST_LEN);
        setBroadcastDraft((prev) => ({ ...prev, content: next }));
    }, []);
    const broadcastContentLength = (broadcastDraft.content || '').length;

    const loadSystemMonitor = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setSystemMonitorLoading(true);
        }
        setSystemMonitorError('');
        try {
            const res = await adminFetchSystemMonitor();
            const data = res?.data || res;
            setSystemMonitor(data || null);
        } catch (err) {
            setSystemMonitorError(err?.message || '加载系统监控失败');
        } finally {
            if (!silent) {
                setSystemMonitorLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (activeSettingsTab !== 'system-monitor') return undefined;
        loadSystemMonitor();
        const timer = setInterval(() => {
            loadSystemMonitor({ silent: true });
        }, 15000);
        return () => clearInterval(timer);
    }, [activeSettingsTab, loadSystemMonitor]);

    const loadAiAssistantSettings = useCallback(async () => {
        setAiAssistantLoading(true);
        setAiAssistantError('');
        try {
            const res = await adminFetchAiAssistantSettings();
            const data = res?.data || res;
            setAiChatAdminEnabled(data?.aiChatAdminEnabled !== false);
            setAiRagAdminEnabled(data?.aiRagAdminEnabled === true);
            setAiChatCapable(data?.aiChatCapable === true);
            setAiRagCapable(data?.aiRagCapable === true);
            setAiChatEffectiveEnabled(data?.aiChatEffectiveEnabled !== false);
            setAiRagEffectiveEnabled(data?.aiRagEffectiveEnabled === true);
            setAiChatDisabledReason(typeof data?.aiChatDisabledReason === 'string' ? data.aiChatDisabledReason : null);
            setAiRagDisabledReason(typeof data?.aiRagDisabledReason === 'string' ? data.aiRagDisabledReason : null);
        } catch (err) {
            setAiAssistantError(err?.message || '加载 AI 助理设置失败');
        } finally {
            setAiAssistantLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAiAssistantSettings();
    }, [loadAiAssistantSettings]);

    const loadGames = useCallback(async () => {
        setGameLoading(true);
        setGameError('');
        try {
            const res = await adminFetchGames({ page: 1, size: 200 });
            const data = res?.data || res;
            setGameList((data && data.records) ? data.records : (data || []));
        } catch (err) {
            setGameError(err?.message || '加载页面列表失败');
        } finally {
            setGameLoading(false);
        }
    }, []);

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    const resetGameForm = useCallback((defaults = {}, clearEditing = true) => {
        setGameForm({
            title: '',
            description: '',
            status: 'ACTIVE',
            sortOrder: 0,
            file: null,
            ...defaults
        });
        if (clearEditing) setGameEditingId(null);
    }, []);

    const handleGameSubmit = useCallback(async () => {
        if (!gameForm.title) {
            setGameError('请填写标题');
            return;
        }
        if (!gameEditingId && !gameForm.file) {
            setGameError('请先选择要上传的 HTML 文件');
            return;
        }
        setGameSaving(true);
        setGameError('');
        try {
            let res = null;
            if (gameEditingId) {
                res = await adminUpdateGame(gameEditingId, gameForm);
            } else {
                res = await adminCreateGame(gameForm);
            }
            const msg = res?.message;
            if (msg && msg !== 'ok') {
                showNotice(msg, 'success');
            }
            await loadGames();
            resetGameForm({}, true);
            onGameChanged && onGameChanged();
        } catch (err) {
            setGameError(err?.message || '保存失败');
        } finally {
            setGameSaving(false);
        }
    }, [gameForm, gameEditingId, loadGames, resetGameForm, onGameChanged, showNotice]);

    const handleGameEdit = useCallback((game) => {
        if (!game) return;
        resetGameForm({
            title: game.title || '',
            description: game.description || '',
            status: game.status || 'ACTIVE',
            sortOrder: game.sortOrder ?? 0,
        }, false);
        setGameEditingId(game.id);
    }, [resetGameForm]);

    const handleGameDelete = useCallback(async (id) => {
        if (!id) return;
        const confirmed = await confirm({
            title: '删除 HTML 页面',
            description: '确认删除该 HTML 页面吗？删除后静态资源入口会立即失效，且操作不可恢复。',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        setGameDeletingId(id);
        setGameError('');
        try {
            await adminDeleteGame(id);
            await loadGames();
            if (gameEditingId === id) resetGameForm({}, true);
            onGameChanged && onGameChanged();
        } catch (err) {
            setGameError(err?.message || '删除失败');
        } finally {
            setGameDeletingId(null);
        }
    }, [confirm, loadGames, onGameChanged, gameEditingId, resetGameForm]);

    const handleGameOpen = useCallback((game) => {
        if (!game) return;
        const targetUrl = game.url ? buildAssetUrl(game.url) : '';
        if (targetUrl && typeof window !== 'undefined') {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }
    }, []);

    const loadHomeBackgrounds = useCallback(async () => {
        setHomeBackgroundLoading(true);
        setHomeBackgroundError('');
        try {
            const res = await adminFetchHomeBackgrounds();
            const data = res?.data || res;
            setHomeBackgrounds(Array.isArray(data) ? data : []);
        } catch (err) {
            setHomeBackgroundError(err?.message || '加载首页背景列表失败');
        } finally {
            setHomeBackgroundLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHomeBackgrounds();
    }, [loadHomeBackgrounds]);

    const handleUploadHomeBackground = useCallback(async () => {
        if (!homeBackgroundFile) {
            setHomeBackgroundError('请先选择一张首页背景图');
            return;
        }
        setHomeBackgroundUploading(true);
        setHomeBackgroundError('');
        try {
            await adminUploadHomeBackground(homeBackgroundFile);
            setHomeBackgroundFile(null);
            await loadHomeBackgrounds();
            onHomeBackgroundChanged && await onHomeBackgroundChanged();
            showNotice('首页背景图已上传，并已切换为当前背景', 'success');
        } catch (err) {
            setHomeBackgroundError(err?.message || '上传首页背景图失败');
        } finally {
            setHomeBackgroundUploading(false);
        }
    }, [homeBackgroundFile, loadHomeBackgrounds, onHomeBackgroundChanged, showNotice]);

    const handleSelectCurrentHomeBackground = useCallback(async (id) => {
        if (!id) return;
        setHomeBackgroundSelectingId(id);
        setHomeBackgroundError('');
        try {
            await adminSetCurrentHomeBackground(id);
            await loadHomeBackgrounds();
            onHomeBackgroundChanged && await onHomeBackgroundChanged();
            showNotice('已切换当前首页背景图', 'success');
        } catch (err) {
            setHomeBackgroundError(err?.message || '切换首页背景图失败');
        } finally {
            setHomeBackgroundSelectingId(null);
        }
    }, [loadHomeBackgrounds, onHomeBackgroundChanged, showNotice]);

    const handleDeleteHomeBackground = useCallback(async (item) => {
        if (!item?.id) return;
        const confirmed = await confirm({
            title: item.current ? '删除当前首页背景图' : '删除历史首页背景图',
            description: item.current
                ? '确认删除当前首页背景图吗？删除后会自动回退到上一张可用背景或默认背景。'
                : '确认删除这张历史首页背景图吗？删除后将无法恢复。',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        setHomeBackgroundDeletingId(item.id);
        setHomeBackgroundError('');
        try {
            await adminDeleteHomeBackground(item.id);
            await loadHomeBackgrounds();
            onHomeBackgroundChanged && await onHomeBackgroundChanged();
            showNotice(item.current ? '当前首页背景图已删除，已自动回退背景' : '历史首页背景图已删除', 'success');
        } catch (err) {
            setHomeBackgroundError(err?.message || '删除首页背景图失败');
        } finally {
            setHomeBackgroundDeletingId(null);
        }
    }, [confirm, loadHomeBackgrounds, onHomeBackgroundChanged, showNotice]);

    const loadKnowledgeDocuments = useCallback(async (keyword = '') => {
        setKnowledgeLoading(true);
        setKnowledgeError('');
        try {
            const res = await adminFetchKnowledgeDocuments({ page: 1, size: 200, keyword: keyword || undefined });
            const data = res?.data || res;
            setKnowledgeList((data && data.records) ? data.records : (data || []));
        } catch (err) {
            setKnowledgeError(err?.message || '加载知识库列表失败');
        } finally {
            setKnowledgeLoading(false);
        }
    }, []);

    useEffect(() => {
        loadKnowledgeDocuments();
    }, [loadKnowledgeDocuments]);

    const resetKnowledgeForm = useCallback((defaults = {}, clearEditing = true) => {
        setKnowledgeForm({
            title: '',
            enabled: true,
            file: null,
            contentText: '',
            ...defaults
        });
        if (clearEditing) setKnowledgeEditingId(null);
    }, []);

    const handleKnowledgeSubmit = useCallback(async () => {
        setKnowledgeSaving(true);
        setKnowledgeError('');
        try {
            if (knowledgeEditingId) {
                await adminUpdateKnowledgeDocument(knowledgeEditingId, {
                    title: knowledgeForm.title,
                    enabled: knowledgeForm.enabled,
                    contentText: knowledgeForm.contentText
                });
                showNotice('知识库已更新，并已重新同步到 AI 检索库', 'success');
            } else {
                if (!knowledgeForm.file) {
                    setKnowledgeError('请先选择要导入的文本知识库文件');
                    setKnowledgeSaving(false);
                    return;
                }
                await adminCreateKnowledgeDocument({
                    title: knowledgeForm.title,
                    enabled: knowledgeForm.enabled,
                    file: knowledgeForm.file
                });
                showNotice('知识库导入成功，并已提交同步到 AI 检索库', 'success');
            }
            await loadKnowledgeDocuments();
            resetKnowledgeForm({}, true);
        } catch (err) {
            setKnowledgeError(err?.message || '保存知识库失败');
        } finally {
            setKnowledgeSaving(false);
        }
    }, [knowledgeEditingId, knowledgeForm, loadKnowledgeDocuments, resetKnowledgeForm, showNotice]);

    const handleKnowledgeEdit = useCallback(async (item) => {
        if (!item?.id) return;
        setKnowledgeSaving(true);
        setKnowledgeError('');
        try {
            const res = await adminFetchKnowledgeDocumentDetail(item.id);
            const data = res?.data || res;
            resetKnowledgeForm({
                title: data?.title || '',
                enabled: data?.enabled !== false,
                contentText: data?.contentText || '',
                file: null
            }, false);
            setKnowledgeEditingId(item.id);
        } catch (err) {
            setKnowledgeError(err?.message || '加载知识库详情失败');
        } finally {
            setKnowledgeSaving(false);
        }
    }, [resetKnowledgeForm]);

    const handleKnowledgeDelete = useCallback(async (id) => {
        if (!id) return;
        const confirmed = await confirm({
            title: '删除知识库',
            description: '确认删除该知识库吗？删除后会同时移除对应的 AI 检索向量索引。',
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        setKnowledgeDeletingId(id);
        setKnowledgeError('');
        try {
            await adminDeleteKnowledgeDocument(id);
            await loadKnowledgeDocuments();
            if (knowledgeEditingId === id) resetKnowledgeForm({}, true);
            showNotice('知识库已删除，对应 AI 检索索引也已移除', 'success');
        } catch (err) {
            setKnowledgeError(err?.message || '删除知识库失败');
        } finally {
            setKnowledgeDeletingId(null);
        }
    }, [confirm, knowledgeEditingId, loadKnowledgeDocuments, resetKnowledgeForm, showNotice]);

    const handleAiAssistantToggleSave = useCallback(async ({ aiChatAdminEnabled: chatEnabled, aiRagAdminEnabled: ragEnabled }) => {
        setAiAssistantSaving(true);
        setAiAssistantError('');
        try {
            const payload = {};
            if (typeof chatEnabled === 'boolean') payload.aiChatAdminEnabled = chatEnabled;
            if (typeof ragEnabled === 'boolean') payload.aiRagAdminEnabled = ragEnabled;
            const res = await adminUpdateAiAssistantSettings(payload);
            const data = res?.data || res;
            setAiChatAdminEnabled(data?.aiChatAdminEnabled !== false);
            setAiRagAdminEnabled(data?.aiRagAdminEnabled === true);
            setAiChatCapable(data?.aiChatCapable === true);
            setAiRagCapable(data?.aiRagCapable === true);
            setAiChatEffectiveEnabled(data?.aiChatEffectiveEnabled !== false);
            setAiRagEffectiveEnabled(data?.aiRagEffectiveEnabled === true);
            setAiChatDisabledReason(typeof data?.aiChatDisabledReason === 'string' ? data.aiChatDisabledReason : null);
            setAiRagDisabledReason(typeof data?.aiRagDisabledReason === 'string' ? data.aiRagDisabledReason : null);
            onAiAssistantChanged && await onAiAssistantChanged();
            showNotice('AI 助理设置已保存', 'success');
        } catch (err) {
            setAiAssistantError(err?.message || '保存 AI 助理设置失败');
        } finally {
            setAiAssistantSaving(false);
        }
    }, [onAiAssistantChanged, showNotice]);

    const selectedInviteDuration = useMemo(
        () => REGISTRATION_INVITE_DURATION_OPTIONS.find((item) => item.code === inviteDurationCode) || REGISTRATION_INVITE_DURATION_OPTIONS[0],
        [inviteDurationCode]
    );

    const handleOpenInviteDialog = useCallback(() => {
        setInviteError('');
        setInviteDialogOpen(true);
    }, []);

    const handleCloseInviteDialog = useCallback(() => {
        if (inviteGenerating) return;
        setInviteDialogOpen(false);
    }, [inviteGenerating]);

    const handleCreateRegistrationInvite = useCallback(async () => {
        setInviteGenerating(true);
        setInviteError('');
        try {
            const res = await adminCreateRegistrationInvite({ durationCode: inviteDurationCode });
            const data = res?.data || res;
            setLatestInvite(data || null);
            setInviteDialogOpen(false);
            if (data?.inviteCode && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                try {
                    await navigator.clipboard.writeText(data.inviteCode);
                    showNotice(`邀请码已生成并复制到剪贴板，有效期：${data.durationLabel || selectedInviteDuration.label}`, 'success');
                } catch {
                    showNotice(`邀请码已生成：${data.inviteCode}`, 'success');
                }
            } else {
                showNotice(`邀请码已生成：${data?.inviteCode || '--'}`, 'success');
            }
        } catch (err) {
            setInviteError(err?.message || '生成邀请码失败');
        } finally {
            setInviteGenerating(false);
        }
    }, [inviteDurationCode, selectedInviteDuration.label, showNotice]);

    const loadLatestRegistrationInvite = useCallback(async () => {
        try {
            const res = await adminFetchLatestRegistrationInvite();
            const data = res?.data || res || null;
            setLatestInvite(data || null);
        } catch (err) {
            if (err?.status === 404) {
                setLatestInvite(null);
                return;
            }
            setInviteError(err?.message || '加载最近邀请码失败');
        }
    }, []);

    useEffect(() => {
        loadLatestRegistrationInvite();
    }, [loadLatestRegistrationInvite]);

    const formatKnowledgeStatus = useCallback((value) => {
        switch ((value || '').toUpperCase()) {
            case 'READY':
                return '已同步';
            case 'FAILED':
                return '同步失败';
            case 'DISABLED':
                return '已停用';
            case 'PENDING':
                return '待同步';
            default:
                return value || '--';
        }
    }, []);

    // --- 维护模块：未引用图片清理（SUPER_ADMIN） ---
    const [assets, setAssets] = useState([]);
    const [assetLoading, setAssetLoading] = useState(false);
    const [assetError, setAssetError] = useState('');
    const [assetTotalSize, setAssetTotalSize] = useState(0);
    const [selectedAssets, setSelectedAssets] = useState(new Set());
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmChecked, setConfirmChecked] = useState(false);
    const [assetDeleting, setAssetDeleting] = useState(false);
    const [previewSrc, setPreviewSrc] = useState('');

    const scanUnusedAssets = useCallback(async () => {
        setAssetLoading(true);
        setAssetError('');
        setSelectedAssets(new Set());
        try {
            const res = await adminScanUnusedAssets();
            const data = res?.data || res;
            const list = data?.unused || [];
            setAssets(list);
            setAssetTotalSize(data?.totalSize || 0);
        } catch (err) {
            setAssetError(err?.message || '扫描未引用图片失败');
        } finally {
            setAssetLoading(false);
        }
    }, []);

    const toggleSelectAsset = useCallback((path) => {
        if (!path) return;
        setSelectedAssets((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }, []);

    const toggleSelectAllAssets = useCallback(() => {
        setSelectedAssets((prev) => {
            if (assets.length === 0) return prev;
            if (prev.size === assets.length) return new Set();
            return new Set(assets.map((a) => a.path));
        });
    }, [assets]);

    const handleDeleteSelectedAssets = useCallback(() => {
        if (!selectedAssets.size) return;
        setConfirmChecked(false);
        setConfirmOpen(true);
    }, [selectedAssets]);

    const handleConfirmDeleteAssets = useCallback(async () => {
        if (!selectedAssets.size) return;
        setAssetDeleting(true);
        setAssetError('');
        try {
            await adminDeleteUnusedAssets(Array.from(selectedAssets));
            setConfirmOpen(false);
            setConfirmChecked(false);
            await scanUnusedAssets();
        } catch (err) {
            setAssetError(err?.message || '删除未引用图片失败');
        } finally {
            setAssetDeleting(false);
        }
    }, [selectedAssets, scanUnusedAssets]);

    // --- 维护模块：空目录清理（SUPER_ADMIN） ---
    const [emptyFolders, setEmptyFolders] = useState([]);
    const [emptyLoading, setEmptyLoading] = useState(false);
    const [emptyError, setEmptyError] = useState('');
    const [emptySelected, setEmptySelected] = useState(new Set());
    const [, setEmptyDeleting] = useState(false);

    const loadEmptyFolders = useCallback(async () => {
        setEmptyLoading(true);
        setEmptyError('');
        setEmptySelected(new Set());
        try {
            const res = await adminScanEmptyFolders();
            const data = res?.data || res;
            setEmptyFolders(data?.emptyFolders || []);
        } catch (err) {
            setEmptyError(err?.message || '扫描空目录失败');
        } finally {
            setEmptyLoading(false);
        }
    }, []);

    const toggleSelectEmpty = useCallback((path) => {
        if (!path) return;
        setEmptySelected((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }, []);

    const toggleSelectAllEmpty = useCallback(() => {
        setEmptySelected((prev) => {
            if (emptyFolders.length === 0) return prev;
            if (prev.size === emptyFolders.length) return new Set();
            return new Set(emptyFolders);
        });
    }, [emptyFolders]);

    const handleDeleteEmptyFolders = useCallback(async () => {
        if (!emptySelected.size) return;
        const confirmed = await confirm({
            title: '删除空目录',
            description: `确认删除选中的 ${emptySelected.size} 个空目录吗？这些目录会从存储中永久清除，操作不可恢复。`,
            confirmText: '确认删除'
        });
        if (!confirmed) return;
        setEmptyDeleting(true);
        setEmptyError('');
        try {
            await adminDeleteEmptyFolders(Array.from(emptySelected));
            await loadEmptyFolders();
        } catch (err) {
            setEmptyError(err?.message || '删除空目录失败');
        } finally {
            setEmptyDeleting(false);
        }
    }, [confirm, emptySelected, loadEmptyFolders]);

    useEffect(() => {
        scanUnusedAssets();
        loadEmptyFolders();
    }, [scanUnusedAssets, loadEmptyFolders]);

    const surface = `home-ios-card home-ios-card--static ${isDarkMode ? 'home-ios-card--dark text-gray-100 shadow-[0_18px_44px_rgba(0,0,0,0.32)]' : 'text-slate-900 shadow-[0_16px_38px_rgba(148,163,184,0.14)]'}`;
    const tabWrapClass = `${surface} rounded-[28px] px-4 py-3 flex flex-wrap items-center gap-2`;
    const tabButtonClass = (active) => `px-4 py-2 rounded-full text-sm font-semibold border backdrop-blur-xl transition-all duration-300 ${
        active
            ? (isDarkMode
                ? 'bg-white/[0.14] text-white border-white/14 shadow-[0_12px_28px_rgba(0,0,0,0.28)]'
                : 'bg-white/85 text-slate-900 border-white/80 shadow-[0_12px_28px_rgba(99,102,241,0.14)]')
            : (isDarkMode
                ? 'bg-white/[0.04] text-gray-200 border-white/10 hover:bg-white/[0.08] hover:text-white'
                : 'bg-white/60 text-slate-700 border-white/75 hover:bg-white/80 hover:text-slate-900')
    }`;
    const chipClass = `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-xl ${
        isDarkMode ? 'border-white/12 bg-white/[0.06] text-gray-100' : 'border-white/75 bg-white/80 text-slate-700'
    }`;
    const softPanelClass = `home-ios-inner-card rounded-[24px] border px-4 py-4 ${
        isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-white/80 bg-white/75'
    }`;
    const formPanelClass = `rounded-[24px] border p-5 space-y-4 backdrop-blur-2xl ${
        isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-white/70 bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)]'
    }`;
    const dashedPanelClass = `rounded-[24px] border border-dashed overflow-hidden ${
        isDarkMode ? 'border-white/12 bg-white/[0.03]' : 'border-white/70 bg-white/50'
    }`;
    const inputClass = `w-full rounded-2xl border px-3 py-2.5 text-sm outline-none backdrop-blur-xl transition ${
        isDarkMode
            ? 'border-white/10 bg-white/[0.05] text-gray-100 placeholder:text-gray-500 focus:border-sky-400/40 focus:bg-white/[0.07]'
            : 'border-white/80 bg-white/80 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white/90'
    }`;
    const adminDarkScrollbarClass = getAdminDarkScrollbarClass(isDarkMode);
    const fileInputClass = `w-full rounded-2xl border px-3 py-2.5 text-sm backdrop-blur-xl file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-full ${
        isDarkMode
            ? 'border-white/10 bg-white/[0.05] text-gray-100 file:bg-white/[0.1] file:text-white'
            : 'border-white/80 bg-white/80 text-slate-900 file:bg-slate-900 file:text-white'
    }`;
    const checkboxClass = `h-4 w-4 rounded accent-indigo-500 ${isDarkMode ? 'border-white/20 bg-white/[0.06]' : 'border-white/70 bg-white/90'}`;
    const buttonBaseClass = 'inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed';
    const primaryButtonClass = `${buttonBaseClass} ${isDarkMode ? 'border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.1]' : 'border-white/80 bg-white/80 text-slate-900 hover:bg-white'}`;
    const accentButtonClass = `${buttonBaseClass} ${isDarkMode ? 'border-sky-400/30 bg-sky-400/18 text-sky-100 hover:bg-sky-400/24' : 'border-indigo-200 bg-indigo-500/12 text-indigo-700 hover:bg-indigo-500/18'}`;
    const successButtonClass = `${buttonBaseClass} ${isDarkMode ? 'border-emerald-400/28 bg-emerald-400/18 text-emerald-100 hover:bg-emerald-400/24' : 'border-emerald-200 bg-emerald-500/14 text-emerald-700 hover:bg-emerald-500/20'}`;
    const warningButtonClass = `${buttonBaseClass} ${isDarkMode ? 'border-amber-400/28 bg-amber-400/18 text-amber-100 hover:bg-amber-400/24' : 'border-amber-200 bg-amber-400/18 text-amber-700 hover:bg-amber-400/24'}`;
    const dangerButtonClass = `${buttonBaseClass} ${isDarkMode ? 'border-red-400/24 bg-red-500/18 text-red-100 hover:bg-red-500/24' : 'border-red-200 bg-red-500/14 text-red-700 hover:bg-red-500/20'}`;

    const formatBytes = useCallback((bytes) => {
        if (!bytes || Number.isNaN(bytes)) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let value = bytes;
        let idx = 0;
        while (value >= 1024 && idx < units.length - 1) {
            value /= 1024;
            idx += 1;
        }
        return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[idx]}`;
    }, []);
    const formatBytesPerSecond = useCallback((bytes) => `${formatBytes(bytes)}/s`, [formatBytes]);
    const formatPercent = useCallback((value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '--';
        return `${numeric >= 10 || numeric === 0 ? numeric.toFixed(0) : numeric.toFixed(1)}%`;
    }, []);
    const formatDuration = useCallback((seconds) => {
        const totalSeconds = Math.max(0, Number(seconds || 0));
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        if (days > 0) return `${days}天 ${hours}小时`;
        if (hours > 0) return `${hours}小时 ${minutes}分钟`;
        return `${minutes}分钟`;
    }, []);
    const scoreToneClass = useCallback((value) => {
        if (value >= 85) return isDarkMode ? 'text-emerald-200' : 'text-emerald-700';
        if (value >= 70) return isDarkMode ? 'text-sky-200' : 'text-sky-700';
        if (value >= 55) return isDarkMode ? 'text-amber-200' : 'text-amber-700';
        return isDarkMode ? 'text-red-200' : 'text-red-700';
    }, [isDarkMode]);
    const pressureBarClass = useCallback((percent) => {
        const value = Number(percent || 0);
        if (value >= 85) return 'bg-red-500';
        if (value >= 70) return 'bg-amber-500';
        if (value >= 45) return 'bg-sky-500';
        return 'bg-emerald-500';
    }, []);

    const handleBroadcastSave = useCallback(async (forceActive) => {
        const content = (broadcastDraft.content || '').trim();
        const targetActive = typeof forceActive === 'boolean' ? forceActive : broadcastDraft.active;
        const style = (broadcastDraft.style || 'ALERT').toUpperCase();

        if (!content) {
            setBroadcastError('请填写广播文案');
            return;
        }

        setBroadcastSaving(true);
        setBroadcastError('');
        try {
            await updateBroadcast({ content, active: targetActive, style });
            setNotification((prev) => ({
                ...prev,
                isOpen: targetActive,
                content,
                style
            }));
            setBroadcastDraft((prev) => ({ ...prev, active: targetActive, content, style }));
            showNotice(targetActive ? '广播已发布，前台顶部已同步' : '广播已停用，最新文案已保存', 'success');
        } catch (err) {
            setBroadcastError(err?.message || '同步广播失败，请稍后重试');
        } finally {
            setBroadcastSaving(false);
        }
    }, [broadcastDraft, setNotification, showNotice]);

    const systemMonitorHost = systemMonitor?.host || {};
    const systemMonitorCpu = systemMonitor?.cpu || {};
    const systemMonitorMemory = systemMonitor?.memory || {};
    const systemMonitorDisk = systemMonitor?.disk || {};
    const systemMonitorNetwork = systemMonitor?.network || {};
    const systemMonitorThroughput = systemMonitor?.throughput || {};
    const systemMonitorScore = systemMonitor?.score || {};
    const systemMonitorRanges = Array.isArray(systemMonitor?.trafficRanges) ? systemMonitor.trafficRanges : [];
    const systemMonitorInterfaces = Array.isArray(systemMonitorNetwork?.interfaces) ? systemMonitorNetwork.interfaces.slice(0, 4) : [];

    const systemMonitorMetricCards = [
        {
            key: 'score',
            label: '综合评分',
            value: `${systemMonitorScore?.value ?? '--'} 分`,
            detail: systemMonitorScore?.label || '等待采样',
            icon: Gauge,
            percent: Math.max(0, Math.min(100, Number(systemMonitorScore?.value || 0)))
        },
        {
            key: 'cpu',
            label: 'CPU',
            value: formatPercent(systemMonitorCpu?.percent),
            detail: systemMonitorCpu?.description || '系统负载',
            icon: Cpu,
            percent: Math.max(0, Math.min(100, Number(systemMonitorCpu?.percent || 0)))
        },
        {
            key: 'memory',
            label: '系统内存',
            value: formatPercent(systemMonitorMemory?.percent),
            detail: `${formatBytes(systemMonitorMemory?.usedBytes)} / ${formatBytes(systemMonitorMemory?.totalBytes)}`,
            icon: MemoryStick,
            percent: Math.max(0, Math.min(100, Number(systemMonitorMemory?.percent || 0)))
        },
        {
            key: 'disk',
            label: '磁盘',
            value: formatPercent(systemMonitorDisk?.percent),
            detail: `${formatBytes(systemMonitorDisk?.usedBytes)} / ${formatBytes(systemMonitorDisk?.totalBytes)}`,
            icon: HardDrive,
            percent: Math.max(0, Math.min(100, Number(systemMonitorDisk?.percent || 0)))
        },
        {
            key: 'throughput',
            label: '实时吞吐量',
            value: formatBytesPerSecond(systemMonitorThroughput?.totalBytesPerSecond),
            detail: `↓ ${formatBytesPerSecond(systemMonitorThroughput?.receivedBytesPerSecond)} · ↑ ${formatBytesPerSecond(systemMonitorThroughput?.sentBytesPerSecond)}`,
            icon: Wifi,
            percent: Math.max(0, Math.min(100, Number(systemMonitorScore?.value || 0)))
        },
        {
            key: 'uptime',
            label: '项目运行时长',
            value: formatDuration(systemMonitorHost?.uptimeSeconds),
            detail: systemMonitorHost?.displayName || '服务器系统',
            icon: Server,
            percent: 100
        }
    ];

    if (!hasPermission('SYSTEM_CLEAN_STORAGE') || user?.role !== 'SUPER_ADMIN') {
        return <PermissionNotice title="仅超级管理员可用" description="系统设置仅限超级管理员访问。" />;
    }

    return (
        <>
            {confirmDialog}
            <AdminNoticeBar notice={notice} onClose={hideNotice} />
            <div className={`space-y-6 home-redesign-surface ${isDarkMode ? 'is-dark' : ''}`}>
            {/* 顶部子页切换 */}
            <div className={tabWrapClass}>
                <span className="text-sm font-semibold mr-2">设置分组：</span>
                <div className="flex flex-wrap gap-2">
                    {SETTINGS_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveSettingsTab(tab.key)}
                            className={tabButtonClass(activeSettingsTab === tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 系统监控 */}
            <div className={`${surface} rounded-[30px] overflow-hidden ${activeSettingsTab === 'system-monitor' ? '' : 'hidden'}`}>
                <div className="p-6 pb-4 flex flex-wrap items-start gap-4 justify-between">
                    <div className="flex items-start gap-3">
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border backdrop-blur-xl ${
                            isDarkMode
                                ? 'border-emerald-300/20 bg-emerald-300/12 text-emerald-100'
                                : 'border-white/80 bg-white/90 text-emerald-700'
                        }`}>
                            <Activity size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">系统监控 · 服务器运行态</h3>
                            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                基于 OSHI 读取部署服务器系统数据，覆盖 Linux，并兼容 Windows 本地测试。
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={chipClass}>仅 SUPER_ADMIN</span>
                        <span className={chipClass}>{systemMonitor?.sampledAt ? `采样：${formatDateTime(systemMonitor.sampledAt)}` : '等待采样'}</span>
                        <button
                            type="button"
                            onClick={() => loadSystemMonitor()}
                            disabled={systemMonitorLoading}
                            className={primaryButtonClass}
                        >
                            <RefreshCw size={15} className={systemMonitorLoading ? 'animate-spin' : ''} />
                            {systemMonitorLoading ? '刷新中...' : '刷新监控'}
                        </button>
                    </div>
                </div>

                {systemMonitorError && (
                    <div className={`mx-6 mb-0 px-4 py-3 border-2 font-semibold rounded-xl ${
                        isDarkMode
                            ? 'border-red-500/70 bg-red-500/10 text-red-200'
                            : 'border-red-400 bg-red-50 text-red-700'
                    }`}>
                        {systemMonitorError}
                    </div>
                )}

                <div className="p-6 pt-4 space-y-6">
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {systemMonitorMetricCards.map((metric) => {
                            const MetricIcon = metric.icon;
                            const isScore = metric.key === 'score';
                            return (
                                <div key={metric.key} className={`${softPanelClass} space-y-4`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center border ${
                                                isDarkMode ? 'border-white/10 bg-white/[0.07]' : 'border-white/80 bg-white/85'
                                            }`}>
                                                <MetricIcon size={18} />
                                            </div>
                                            <div>
                                                <div className={`text-xs font-black uppercase tracking-[0.22em] ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                                    {metric.label}
                                                </div>
                                                <div className={`text-2xl font-black mt-1 ${isScore ? scoreToneClass(metric.percent) : ''}`}>
                                                    {metric.value}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/[0.07]' : 'bg-slate-200/70'}`}>
                                            <div
                                                className={`h-full rounded-full ${isScore ? 'bg-emerald-500' : pressureBarClass(metric.percent)}`}
                                                style={{ width: `${Math.max(0, Math.min(100, metric.percent || 0))}%` }}
                                            ></div>
                                        </div>
                                        <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                            {metric.detail}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-5">
                        <div className={formPanelClass}>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-base font-bold">网络总流量</h4>
                                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        今天、近 7 天和全部记录依赖历史快照；本次开机读取系统网卡累计计数。
                                    </p>
                                </div>
                                <BarChart3 size={20} className={isDarkMode ? 'text-sky-200' : 'text-sky-700'} />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {systemMonitorRanges.map((range) => (
                                    <div key={range.key} className={softPanelClass}>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-bold">{range.label}</span>
                                            <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                                {formatBytes(range.totalBytes)}
                                            </span>
                                        </div>
                                        <div className={`mt-3 text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                            下载 {formatBytes(range.receivedBytes)} · 上传 {formatBytes(range.sentBytes)}
                                        </div>
                                    </div>
                                ))}
                                {systemMonitorRanges.length === 0 && (
                                    <div className={`sm:col-span-2 ${dashedPanelClass} p-6 text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        暂无网络历史采样，点击“刷新监控”后会先展示本次开机累计流量。
                                    </div>
                                )}
                            </div>
                            {systemMonitor?.historyNote && (
                                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                    {systemMonitor.historyNote}
                                </p>
                            )}
                        </div>

                        <div className={formPanelClass}>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-base font-bold">系统与网卡明细</h4>
                                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        OS、CPU 核心数与前 4 个网卡接口的吞吐明细。
                                    </p>
                                </div>
                                <Terminal size={20} className={isDarkMode ? 'text-emerald-200' : 'text-emerald-700'} />
                            </div>
                            <div className={softPanelClass}>
                                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>系统</div>
                                        <div className="font-bold mt-1">{systemMonitorHost?.displayName || '--'}</div>
                                    </div>
                                    <div>
                                        <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>CPU</div>
                                        <div className="font-bold mt-1">{systemMonitorHost?.processorName || '--'}</div>
                                    </div>
                                    <div>
                                        <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>核心</div>
                                        <div className="font-bold mt-1">{systemMonitorHost?.physicalCores ?? '--'} 核 / {systemMonitorHost?.logicalCores ?? '--'} 线程</div>
                                    </div>
                                    <div>
                                        <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>总流量</div>
                                        <div className="font-bold mt-1">↓ {formatBytes(systemMonitorNetwork?.receivedBytes)} · ↑ {formatBytes(systemMonitorNetwork?.sentBytes)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {systemMonitorInterfaces.map((item) => (
                                    <div key={`${item.name}-${item.macAddress || ''}`} className={softPanelClass}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="font-bold truncate">{item.displayName || item.name || '网卡接口'}</div>
                                                <div className={`text-xs mt-1 truncate ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                                    {item.name || '--'} · {item.macAddress || '无 MAC'}
                                                </div>
                                            </div>
                                            <span className={chipClass}>{item.speedBitsPerSecond ? `${(item.speedBitsPerSecond / 1000 / 1000).toFixed(0)} Mbps` : '未知速率'}</span>
                                        </div>
                                        <div className={`mt-3 text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                            实时 ↓ {formatBytesPerSecond(item.throughputReceivedBytesPerSecond)} · ↑ {formatBytesPerSecond(item.throughputSentBytesPerSecond)}
                                        </div>
                                    </div>
                                ))}
                                {systemMonitorInterfaces.length === 0 && (
                                    <div className={`${dashedPanelClass} p-6 text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        暂未读取到活动网卡接口，可能是系统权限、容器网络或采样间隔导致。
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {systemMonitorScore?.summary && (
                        <div className={`${softPanelClass} flex flex-wrap items-center gap-3 justify-between`}>
                            <div>
                                <div className="text-sm font-bold">系统评分说明</div>
                                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{systemMonitorScore.summary}</p>
                            </div>
                            <span className={`${chipClass} ${scoreToneClass(systemMonitorScore.value)}`}>当前：{systemMonitorScore.label || '--'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 广播管理 */}
            <div
                className={`${surface} rounded-[30px] overflow-hidden ${activeSettingsTab === 'broadcast' ? '' : 'hidden'}`}
            >
                <div className="p-6 pb-4 flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center border backdrop-blur-xl ${
                            isDarkMode
                                ? 'border-white/12 bg-white/[0.08] text-amber-200'
                                : 'border-white/80 bg-white/90 text-slate-900'
                        }`}>
                            <Megaphone size={18} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">紧急广播 · 顶部全局条</h3>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>紧急/庆典双样式，保存即刻同步首页顶部。</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={chipClass}>仅 SUPER_ADMIN</span>
                        <label className="flex items-center gap-2 text-sm font-semibold">
                            <input
                                type="checkbox"
                                className={checkboxClass}
                                checked={broadcastDraft.active}
                                onChange={(e) => setBroadcastDraft((prev) => ({ ...prev, active: e.target.checked }))}
                            />
                            <span>开启广播</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => handleBroadcastSave(broadcastDraft.active)}
                            disabled={broadcastSaving}
                            className={successButtonClass}
                        >
                            {broadcastSaving ? '保存中…' : '保存设置'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBroadcastSave(false)}
                            disabled={broadcastSaving}
                            className={primaryButtonClass}
                        >
                            停用广播
                        </button>
                    </div>
                </div>

                {broadcastError && (
                    <div className={`mx-6 mb-0 px-4 py-3 border-2 font-semibold rounded-xl ${
                        isDarkMode
                            ? 'border-red-500/70 bg-red-500/10 text-red-200'
                            : 'border-red-400 bg-red-50 text-red-700'
                    }`}>
                        {broadcastError}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 p-6 pt-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold">广播文案</label>
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{broadcastContentLength}/{MAX_BROADCAST_LEN}</span>
                        </div>
                        <div className="relative">
                            <textarea
                                value={broadcastDraft.content}
                                onChange={(e) => handleBroadcastContentChange(e.target.value)}
                                rows={5}
                                className={`${inputClass} ${adminDarkScrollbarClass} min-h-[140px] px-3 py-3 rounded-2xl focus:ring-4 ${isDarkMode ? 'focus:ring-sky-400/12' : 'focus:ring-indigo-200/60'}`}
                                placeholder="例如：系统将在今晚 23:30 维护；或“祝大家节日快乐，福利已上线！”"
                            />
                            <div className={`pointer-events-none absolute inset-0 rounded-xl border ${isDarkMode ? 'border-white/5' : 'border-black/10'}`}></div>
                        </div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            保存立即推送到全站顶部；停用时会保留最新文案与样式，便于随时重启。
                        </p>
                    </div>
                    <div className="space-y-4">
                        <label className="text-sm font-semibold">展示样式</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['ALERT', 'ANNOUNCE'].map((style) => {
                                const config = BROADCAST_STYLE_CONFIG[style] || BROADCAST_STYLE_CONFIG.ALERT;
                                const active = (broadcastDraft.style || 'ALERT').toUpperCase() === style;
                                const StyleIcon = config.icon;
                                return (
                                    <button
                                        key={style}
                                        type="button"
                                        onClick={() => setBroadcastDraft((prev) => ({ ...prev, style }))}
                                        className={`relative text-left px-3 py-2 border-2 rounded-xl transition-all ${
                                            active ? 'ring-2 ring-black scale-[1.01]' : ''
                                        } ${isDarkMode
                                            ? 'bg-gray-800 border-gray-700 text-gray-100 hover:border-gray-600'
                                            : 'bg-white border-gray-900 text-gray-900 hover:-translate-y-0.5'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <StyleIcon size={18} className={config.iconClass || 'text-[#FF0080]'} />
                                            <div>
                                                <div className="font-bold">{config.label}</div>
                                                <div className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {style === 'ALERT' ? '紧急告警 · 红色闪烁' : '庆典公告 · 红金香槟'}
                                                </div>
                                            </div>
                                        </div>
                                        {active && <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full ${chipClass}`}>当前</span>}
                                    </button>
                                );
                            })}
                        </div>
                        <div className={`rounded-2xl border-2 border-dashed p-4 space-y-2 ${
                            isDarkMode
                                ? 'border-gray-700 bg-gray-900/70'
                                : 'border-gray-300 bg-white/80'
                        }`}>
                            <div className="text-xs font-semibold flex items-center gap-2">
                                <Sparkles size={14} /> 预览
                            </div>
                            {(() => {
                                const previewStyle = (broadcastDraft.style || 'ALERT').toUpperCase();
                                const previewConfig = BROADCAST_STYLE_CONFIG[previewStyle] || BROADCAST_STYLE_CONFIG.ALERT;
                                const isCelebration = previewStyle === 'ANNOUNCE';
                                const StyleIcon = previewConfig.icon;
                                return (
                                    <div className={`${previewConfig.containerClass} rounded-lg border border-black/20 overflow-hidden`}>
                                        {isCelebration ? (
                                            <div className="px-3 py-2">
                                                <span className={`flex items-center justify-center gap-1 text-xs font-bold tracking-wide text-center ${previewConfig.textClass}`}>
                                                    {StyleIcon && <StyleIcon size={12} className={previewConfig.iconClass} />}
                                                    {broadcastDraft.content.trim() || '尚未填写广播文案'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="px-3 py-2 flex items-center justify-between gap-3">
                                                <span className={`text-xs font-bold uppercase tracking-widest ${previewConfig.textClass}`}>
                                                    {previewConfig.label}
                                                </span>
                                                <span className={`text-xs ${previewConfig.textClass}`}>
                                                    {broadcastDraft.content.trim() || '尚未填写广播文案'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-4 ${activeSettingsTab === 'home-background' ? '' : 'hidden'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold">首页背景</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            在这里统一管理首页 Hero 背景图。上传新图后会自动设为当前背景，也可以从历史背景中随时切换。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={loadHomeBackgrounds}
                            disabled={homeBackgroundLoading}
                            className={primaryButtonClass}
                        >
                            {homeBackgroundLoading ? '刷新中...' : '刷新列表'}
                        </button>
                    </div>
                </div>

                {homeBackgroundError && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {homeBackgroundError}
                    </div>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="text-base font-bold">上传新背景图</h4>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                支持 `.png`、`.jpg`、`.jpeg`、`.webp`、`.gif`、`.avif`，单张最大 20MB。上传成功后会立即生效。
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold">选择背景图文件</label>
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.webp,.gif,.avif,image/png,image/jpeg,image/webp,image/gif,image/avif"
                                onChange={(e) => setHomeBackgroundFile(e.target.files?.[0] || null)}
                                className={fileInputClass}
                            />
                        </div>

                        {homeBackgroundFile && (
                            <div className={softPanelClass}>
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">待上传文件</div>
                                <div className="mt-2 text-sm font-semibold break-all">{homeBackgroundFile.name}</div>
                                <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    文件大小：{formatBytes(homeBackgroundFile.size)}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={handleUploadHomeBackground}
                                disabled={homeBackgroundUploading}
                                className={accentButtonClass}
                            >
                                {homeBackgroundUploading ? '上传中...' : '上传并设为当前背景'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setHomeBackgroundFile(null)}
                                className={primaryButtonClass}
                            >
                                清空选择
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <ImagePlus size={16} />
                            <span className="text-sm font-semibold">历史背景图</span>
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>共 {homeBackgrounds.length} 张</span>
                        </div>

                        <div className={dashedPanelClass}>
                            {homeBackgroundLoading ? (
                                <div className="p-6 text-sm text-gray-500">加载中，请稍候...</div>
                            ) : homeBackgrounds.length === 0 ? (
                                <div className="p-6 text-sm text-gray-500">
                                    暂无已上传首页背景图，当前仍使用默认 `/static/home/bg.jpg`。
                                </div>
                            ) : (
                                <div className={`divide-y divide-gray-200 dark:divide-gray-700 max-h-[760px] overflow-auto ${adminDarkScrollbarClass}`}>
                                    {homeBackgrounds.map((item) => {
                                        const target = item.url ? buildAssetUrl(item.url) : '';
                                        return (
                                            <div key={item.id} className="p-4 space-y-3">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        {target ? (
                                                            <img
                                                                src={target}
                                                                alt={item.originalFilename}
                                                                className="w-28 h-20 rounded-2xl object-cover border border-white/20 bg-gray-100 cursor-zoom-in"
                                                                loading="lazy"
                                                                onClick={() => setPreviewSrc(target)}
                                                            />
                                                        ) : (
                                                            <div className="w-28 h-20 rounded-2xl border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                                                                无预览
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-sm font-bold break-all">{item.originalFilename}</span>
                                                                {item.current && <span className={chipClass}>当前背景</span>}
                                                            </div>
                                                            <p className={`text-xs break-all ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                路径：{item.url || '--'}
                                                            </p>
                                                            <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                大小：{formatBytes(item.fileSize)} · 更新时间：{formatDateTime(item.updatedAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectCurrentHomeBackground(item.id)}
                                                            disabled={item.current || homeBackgroundSelectingId === item.id}
                                                            className={`${item.current ? successButtonClass : primaryButtonClass} px-3 py-1 text-xs`}
                                                        >
                                                            {item.current ? '正在使用' : (homeBackgroundSelectingId === item.id ? '切换中...' : '设为当前')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteHomeBackground(item)}
                                                            disabled={homeBackgroundDeletingId === item.id}
                                                            className={`${dangerButtonClass} px-3 py-1 text-xs`}
                                                        >
                                                            {homeBackgroundDeletingId === item.id ? '删除中...' : '删除'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-4 ${activeSettingsTab === 'knowledge' ? '' : 'hidden'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold">AI助理</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            在这里统一管理 AI 助理总开关和导入知识库。关闭 AI 后，首页入口会消失，后端聊天接口也会停止提供服务。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => loadKnowledgeDocuments()}
                            disabled={knowledgeLoading}
                            className={primaryButtonClass}
                        >
                            {knowledgeLoading ? '刷新中...' : '刷新列表'}
                        </button>
                        <button
                            type="button"
                            onClick={() => resetKnowledgeForm()}
                            className={successButtonClass}
                        >
                            {knowledgeEditingId ? '退出编辑' : '新建导入'}
                        </button>
                    </div>
                </div>

                {knowledgeError && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {knowledgeError}
                    </div>
                )}

                {aiAssistantError && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {aiAssistantError}
                    </div>
                )}

                {/* AI 聊天开关 */}
                <div className={formPanelClass}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} />
                                <span className="text-lg font-bold">AI 聊天</span>
                            </div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                控制前台 AI 聊天入口和后端聊天接口的可用性。
                            </p>
                            {!aiChatCapable && aiChatDisabledReason && (
                                <p className="text-sm text-amber-600 font-medium">
                                    不可用原因：{aiChatDisabledReason}
                                </p>
                            )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            aiChatEffectiveEnabled
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-gray-400 bg-gray-100 text-gray-600'
                        }`}>
                            {aiAssistantLoading ? '读取中...' : (aiChatEffectiveEnabled ? '当前可用' : (aiChatCapable ? '管理员已关闭' : '能力不可用'))}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-3 text-sm font-medium">
                            <input
                                type="checkbox"
                                className={checkboxClass}
                                checked={aiChatAdminEnabled}
                                disabled={aiAssistantLoading || aiAssistantSaving || !aiChatCapable}
                                onChange={(e) => setAiChatAdminEnabled(e.target.checked)}
                            />
                            <span>启用 AI 聊天</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => handleAiAssistantToggleSave({ aiChatAdminEnabled })}
                            disabled={aiAssistantLoading || aiAssistantSaving}
                            className={accentButtonClass}
                        >
                            {aiAssistantSaving ? '保存中...' : '保存聊天开关'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAiAssistantToggleSave({ aiChatAdminEnabled: false })}
                            disabled={aiAssistantLoading || aiAssistantSaving || !aiChatAdminEnabled}
                            className={primaryButtonClass}
                        >
                            关闭聊天
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAiAssistantToggleSave({ aiChatAdminEnabled: true })}
                            disabled={aiAssistantLoading || aiAssistantSaving || aiChatAdminEnabled || !aiChatCapable}
                            className={successButtonClass}
                        >
                            开启聊天
                        </button>
                    </div>
                </div>

                {/* RAG 检索开关 */}
                <div className={formPanelClass}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Database size={18} />
                                <span className="text-lg font-bold">RAG 检索</span>
                            </div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                控制 AI 聊天时是否使用博客知识库进行向量检索增强回答。
                            </p>
                            {!aiRagEffectiveEnabled && aiRagDisabledReason && (
                                <p className="text-sm text-amber-600 font-medium">
                                    不可用原因：{aiRagDisabledReason}
                                </p>
                            )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            aiRagEffectiveEnabled
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-gray-400 bg-gray-100 text-gray-600'
                        }`}>
                            {aiAssistantLoading ? '读取中...' : (aiRagEffectiveEnabled ? '当前启用' : (aiRagCapable && aiChatEffectiveEnabled ? '管理员已关闭' : '能力不可用'))}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-3 text-sm font-medium">
                            <input
                                type="checkbox"
                                className={checkboxClass}
                                checked={aiRagAdminEnabled}
                                disabled={aiAssistantLoading || aiAssistantSaving || !aiRagCapable || !aiChatEffectiveEnabled}
                                onChange={(e) => setAiRagAdminEnabled(e.target.checked)}
                            />
                            <span>启用 RAG 检索</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => handleAiAssistantToggleSave({ aiRagAdminEnabled })}
                            disabled={aiAssistantLoading || aiAssistantSaving}
                            className={accentButtonClass}
                        >
                            {aiAssistantSaving ? '保存中...' : '保存 RAG 开关'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAiAssistantToggleSave({ aiRagAdminEnabled: false })}
                            disabled={aiAssistantLoading || aiAssistantSaving || !aiRagAdminEnabled}
                            className={primaryButtonClass}
                        >
                            关闭 RAG
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAiAssistantToggleSave({ aiRagAdminEnabled: true })}
                            disabled={aiAssistantLoading || aiAssistantSaving || aiRagAdminEnabled || !aiChatEffectiveEnabled || !aiRagCapable}
                            className={successButtonClass}
                        >
                            开启 RAG
                        </button>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="text-base font-bold">导入知识库</h4>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                仅超级管理员可导入 `.txt` / `.md` / `.markdown` 文本知识库。导入后会自动同步到 AI 检索库，可随时增删改查。
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">知识库标题</label>
                            <input
                                value={knowledgeForm.title}
                                onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, title: e.target.value }))}
                                className={inputClass}
                                placeholder="可选，不填则默认使用文件名"
                            />
                        </div>

                        {!knowledgeEditingId && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">导入文本文件</label>
                                <input
                                    type="file"
                                    accept=".txt,.md,.markdown,text/plain,text/markdown"
                                    onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                                    className={fileInputClass}
                                />
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    支持 `.txt`、`.md`、`.markdown`，最大 2MB。
                                </p>
                            </div>
                        )}

                        <label className="flex items-center gap-3 text-sm font-medium">
                            <input
                                type="checkbox"
                                className={checkboxClass}
                                checked={knowledgeForm.enabled}
                                onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                            />
                            <span>启用后参与 AI 检索增强</span>
                        </label>

                        {knowledgeEditingId && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">知识库正文</label>
                                <textarea
                                    value={knowledgeForm.contentText}
                                    onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, contentText: e.target.value }))}
                                    rows={14}
                                    className={`${inputClass} ${adminDarkScrollbarClass} min-h-[280px] px-3 py-3`}
                                    placeholder="编辑知识库正文后，保存会自动重建向量索引"
                                />
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={handleKnowledgeSubmit}
                                disabled={knowledgeSaving}
                                className={accentButtonClass}
                            >
                                {knowledgeSaving ? '保存中...' : (knowledgeEditingId ? '保存知识库' : '导入知识库')}
                            </button>
                            <button
                                type="button"
                                onClick={() => resetKnowledgeForm()}
                                className={primaryButtonClass}
                            >
                                重置
                            </button>
                            {knowledgeEditingId && <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs`}>当前编辑 ID：{knowledgeEditingId}</span>}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Database size={16} />
                                <span className="text-sm font-semibold">已导入知识库</span>
                                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>共 {knowledgeList.length} 项</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    value={knowledgeKeyword}
                                    onChange={(e) => setKnowledgeKeyword(e.target.value)}
                                    className={`${inputClass} min-w-[220px] rounded-full py-2`}
                                    placeholder="按标题或文件名搜索"
                                />
                                <button
                                    type="button"
                                    onClick={() => loadKnowledgeDocuments(knowledgeKeyword)}
                                    className={warningButtonClass}
                                >
                                    搜索
                                </button>
                            </div>
                        </div>

                        <div className={dashedPanelClass}>
                            {knowledgeLoading ? (
                                <div className="p-6 text-sm text-gray-500">加载中，请稍候...</div>
                            ) : knowledgeList.length === 0 ? (
                                <div className="p-6 text-sm text-gray-500">暂无已导入知识库，先导入一份文本吧。</div>
                            ) : (
                                <div className={`divide-y divide-gray-200 dark:divide-gray-700 max-h-[760px] overflow-auto ${adminDarkScrollbarClass}`}>
                                    {knowledgeList.map((item) => (
                                        <div key={item.id} className="p-4 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-bold break-all">{item.title}</span>
                                                        <span className={chipClass}>
                                                            {formatKnowledgeStatus(item.syncStatus)}
                                                        </span>
                                                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${item.enabled ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-gray-400 text-gray-500 bg-gray-100'}`}>
                                                            {item.enabled ? '启用中' : '已停用'}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs break-all ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>源文件：{item.originalFilename}</p>
                                                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.contentPreview || '暂无预览'}</p>
                                                    <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        最近同步：{formatDateTime(item.lastSyncedAt)} · 更新时间：{formatDateTime(item.updatedAt)}
                                                    </p>
                                                    {item.lastError && (
                                                        <p className="text-xs text-red-500 break-all">最近错误：{item.lastError}</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleKnowledgeEdit(item)}
                                                        className={`${primaryButtonClass} px-3 py-1 text-xs`}
                                                    >
                                                        编辑
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleKnowledgeDelete(item.id)}
                                                        disabled={knowledgeDeletingId === item.id}
                                                        className={`${dangerButtonClass} px-3 py-1 text-xs`}
                                                    >
                                                        {knowledgeDeletingId === item.id ? '删除中...' : '删除'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-4 ${activeSettingsTab === 'registration' ? '' : 'hidden'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold">注册邀请码</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            仅超级管理员可生成一次性注册邀请码。邀请码会在指定时效后失效，且只能成功注册一个新账号。
                        </p>
                    </div>
                    <span className={chipClass}>仅 SUPER_ADMIN</span>
                </div>

                {inviteError && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {inviteError}
                    </div>
                )}

                <div className={formPanelClass}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Ticket size={18} />
                                <span className="text-lg font-bold">生成注册邀请码</span>
                            </div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                默认时效为 5 分钟；点击生成时会先弹出确认框，再根据所选时效创建邀请码。
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenInviteDialog}
                            className={warningButtonClass}
                        >
                            生成邀请码
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className={softPanelClass}>
                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">默认时效</div>
                            <div className="mt-2 text-2xl font-black">{selectedInviteDuration.label}</div>
                            <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                可在确认框中切换为 1 小时、1 天或 10 天。
                            </div>
                        </div>
                        <div className={softPanelClass}>
                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">使用规则</div>
                            <ul className={`mt-2 space-y-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <li>邀请码过期后不可再验证或注册。</li>
                                <li>每个邀请码只能成功注册 1 个账号。</li>
                                <li>生成成功后会自动尝试复制到剪贴板。</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className={formPanelClass}>
                    <div className="flex items-center gap-2">
                        <Copy size={18} />
                        <span className="text-lg font-bold">最近生成结果</span>
                    </div>
                    {!latestInvite ? (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            暂无最近生成的邀请码。生成成功后，邀请码与失效时间会显示在这里。
                        </p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className={softPanelClass}>
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">邀请码</div>
                                <div className="mt-2 font-mono text-lg font-black break-all">{latestInvite.inviteCode}</div>
                            </div>
                            <div className={softPanelClass}>
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">时效</div>
                                <div className="mt-2 text-lg font-black">{latestInvite.durationLabel || '--'}</div>
                            </div>
                            <div className={softPanelClass}>
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">失效时间</div>
                                <div className="mt-2 text-base font-bold">{latestInvite.expiresAtLabel || formatDateTime(latestInvite.expiresAt)}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-4 ${activeSettingsTab === 'games' ? '' : 'hidden'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold">游戏页面管理（game_pages）</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>上传、替换或下线独立 HTML 页面，前台 /tools 仅展示 ACTIVE 项（/games 仍兼容）。</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={loadGames}
                            disabled={gameLoading}
                            className={primaryButtonClass}
                        >
                            {gameLoading ? '刷新中...' : '刷新列表'}
                        </button>
                        <button
                            type="button"
                            onClick={() => resetGameForm()}
                            className={warningButtonClass}
                        >
                            {gameEditingId ? '退出编辑' : '新建页面'}
                        </button>
                    </div>
                </div>

                {gameError && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {gameError}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">标题</label>
                            <input
                                value={gameForm.title}
                                onChange={(e) => setGameForm((prev) => ({ ...prev, title: e.target.value }))}
                                className={inputClass}
                                placeholder="例如：像素跑酷 / H5 Demo"
                            />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">状态</label>
                        <select
                            value={gameForm.status}
                            onChange={(e) => setGameForm((prev) => ({ ...prev, status: e.target.value }))}
                            className={inputClass}
                        >
                            <option value="ACTIVE">ACTIVE - 对所有人可见</option>
                            <option value="DISABLED">DISABLED - 仅管理端可见</option>
                            <option value="DRAFT">DRAFT - 草稿</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-sm font-semibold">描述（可选）</label>
                        <textarea
                            value={gameForm.description}
                            onChange={(e) => setGameForm((prev) => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className={`${inputClass} px-3 py-2`}
                            placeholder="一句话给运营或访客的提示"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">排序权重（小在前）</label>
                        <input
                            type="number"
                            value={gameForm.sortOrder ?? 0}
                            onChange={(e) => setGameForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
                            className={inputClass}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">HTML 文件 {gameEditingId ? '（不更换可留空）' : ''}</label>
                        <input
                            key={gameEditingId ? `edit-${gameEditingId}` : 'new-game'}
                            type="file"
                            accept=".html,.htm,text/html"
                            onChange={(e) => setGameForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                            className={fileInputClass}
                        />
                        {gameForm.file && <span className="text-xs text-gray-500">已选择：{gameForm.file.name}</span>}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleGameSubmit}
                        disabled={gameSaving}
                        className={accentButtonClass}
                    >
                        {gameSaving ? '保存中...' : (gameEditingId ? '保存修改' : '上传页面')}
                    </button>
                    <button
                        type="button"
                        onClick={() => resetGameForm()}
                        className={primaryButtonClass}
                    >
                        重置表单
                    </button>
                    {gameEditingId && <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs`}>当前编辑 ID：{gameEditingId}</span>}
                </div>

                <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>共 {gameList.length} 个页面</span>
                    </div>
                    {gameLoading ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {Array.from({ length: 2 }).map((_, idx) => (
                                <div key={`game-skeleton-${idx}`} className="border-2 border-dashed border-gray-400/70 rounded-xl p-4 animate-pulse">
                                    <div className="h-4 bg-gray-300/70 rounded w-2/3 mb-3"></div>
                                    <div className="h-3 bg-gray-200/70 rounded w-5/6 mb-2"></div>
                                    <div className="h-3 bg-gray-200/50 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    ) : gameList.length === 0 ? (
                        <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>暂无数据，先上传一个吧。</div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {gameList.map((game) => (
                                <div
                                    key={game.id}
                                    className={softPanelClass}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>ID #{game.id}</div>
                                            <h4 className="text-lg font-bold leading-tight">{game.title}</h4>
                                            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm line-clamp-2`}>{game.description || '暂无描述'}</p>
                                            <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>状态：{game.status || '--'} · 更新：{formatDateTime(game.updatedAt || game.createdAt)}</p>
                                        </div>
                                        <span className={chipClass}>{game.status || '--'}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleGameOpen(game)}
                                            className={`${warningButtonClass} px-3 py-1 text-xs`}
                                        >
                                            预览
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleGameEdit(game)}
                                            className={`${primaryButtonClass} px-3 py-1 text-xs`}
                                        >
                                            编辑
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleGameDelete(game.id)}
                                            disabled={gameDeletingId === game.id}
                                            className={`${dangerButtonClass} px-3 py-1 text-xs`}
                                        >
                                            {gameDeletingId === game.id ? '删除中...' : '删除'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-4 ${activeSettingsTab === 'cleanup' ? '' : 'hidden'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold">存储清理 · 未引用图片</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            扫描文章与关于页引用的图片，找出上传目录中未被引用的文件，仅超级管理员可删除。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={scanUnusedAssets}
                            disabled={assetLoading}
                            className={primaryButtonClass}
                        >
                            {assetLoading ? '扫描中...' : '重新扫描'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleSelectAllAssets}
                            disabled={!assets.length}
                            className={successButtonClass}
                        >
                            {selectedAssets.size === assets.length && assets.length ? '取消全选' : '全选'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteSelectedAssets}
                            disabled={!selectedAssets.size}
                            className={dangerButtonClass}
                        >
                            {selectedAssets.size ? `删除选中（${selectedAssets.size}）` : '删除选中'}
                        </button>
                    </div>
                </div>

                {assetError && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {assetError}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>找到 {assets.length} 张未引用图片</span>
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>预计可释放 {formatBytes(assetTotalSize)}</span>
                </div>

                <div className={dashedPanelClass}>
                    {assetLoading ? (
                        <div className="p-6 text-sm text-gray-500">扫描中，请稍候...</div>
                    ) : assets.length === 0 ? (
                        <div className="p-6 text-sm text-gray-500">暂无未引用图片，保持良好。</div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {assets.map((asset) => (
                                <div key={asset.path} className="flex items-center justify-between gap-4 p-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {asset.url || asset.path ? (
                                            <img
                                                src={buildAssetUrl(asset.url || asset.path)}
                                                alt={asset.path}
                                                className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-gray-700 bg-gray-50 cursor-zoom-in"
                                                loading="lazy"
                                                onClick={() => {
                                                    const target = buildAssetUrl(asset.url || asset.path);
                                                    if (target) setPreviewSrc(target);
                                                }}
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">
                                                无预览
                                            </div>
                                        )}
                                        <input
                                            type="checkbox"
                                            className={checkboxClass}
                                            checked={selectedAssets.has(asset.path)}
                                            onChange={() => toggleSelectAsset(asset.path)}
                                        />
                                        <div className="min-w-0">
                                    <div className="font-mono text-sm break-all">{asset.path}</div>
                                    <div className="flex items-center gap-3 text-xs text-indigo-600 dark:text-indigo-300">
                                        <a
                                            href={buildAssetUrl(asset.url || asset.path)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline"
                                        >
                                            在新标签中查看
                                        </a>
                                    </div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-100">{formatBytes(asset.size)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-lg p-6 space-y-4 ${activeSettingsTab === 'cleanup' ? '' : 'hidden'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold">存储清理 · 空目录</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            扫描上传目录下的空文件夹，可批量删除以保持目录整洁。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={loadEmptyFolders}
                            disabled={emptyLoading}
                            className={primaryButtonClass}
                        >
                            {emptyLoading ? '扫描中...' : '重新扫描'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleSelectAllEmpty}
                            disabled={!emptyFolders.length}
                            className={successButtonClass}
                        >
                            {emptySelected.size === emptyFolders.length && emptyFolders.length ? '取消全选' : '全选'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteEmptyFolders}
                            disabled={!emptySelected.size}
                            className={dangerButtonClass}
                        >
                            {emptySelected.size ? `删除选中（${emptySelected.size}）` : '删除选中'}
                        </button>
                    </div>
                </div>

                {emptyError && (
                    <div className="px-4 py-3 border-2 border-red-400 bg-red-50 text-red-700 font-semibold rounded-xl">
                        {emptyError}
                    </div>
                )}

                <div className={dashedPanelClass}>
                    {emptyLoading ? (
                        <div className="p-6 text-sm text-gray-500">扫描中，请稍候...</div>
                    ) : emptyFolders.length === 0 ? (
                        <div className="p-6 text-sm text-gray-500">暂无空目录，状态良好。</div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {emptyFolders.map((path) => (
                                <label key={path} className="flex items-center justify-between gap-4 p-4 cursor-pointer">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <input
                                            type="checkbox"
                                            className={checkboxClass}
                                            checked={emptySelected.has(path)}
                                            onChange={() => toggleSelectEmpty(path)}
                                        />
                                        <div className="font-mono text-sm break-all">{path}</div>
                                    </div>
                                    <span className={chipClass}>
                                        空目录
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {inviteDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className={`${surface} max-w-lg w-full rounded-2xl shadow-2xl p-6 space-y-5`}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="text-lg font-bold">确认生成注册邀请码</h4>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                    请选择邀请码时效。生成后会立即复制到剪贴板，并可供新用户在时效内注册。
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseInviteDialog}
                                className="text-gray-500 hover:text-black"
                                aria-label="关闭"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold">邀请码时效</label>
                            <select
                                value={inviteDurationCode}
                                onChange={(e) => setInviteDurationCode(e.target.value)}
                                className={`${inputClass} px-3 py-3`}
                            >
                                {REGISTRATION_INVITE_DURATION_OPTIONS.map((option) => (
                                    <option key={option.code} value={option.code}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className={softPanelClass}>
                            <div className="text-sm font-bold">即将生成</div>
                            <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                一次性注册邀请码，默认角色为普通用户，当前时效：{selectedInviteDuration.label}。
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleCloseInviteDialog}
                                className={primaryButtonClass}
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateRegistrationInvite}
                                disabled={inviteGenerating}
                                className={warningButtonClass}
                            >
                                {inviteGenerating ? '生成中...' : '确认生成'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className={`${surface} max-w-lg w-full rounded-2xl shadow-2xl p-6 space-y-4`}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="text-lg font-bold">确认删除未引用图片</h4>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                    共 {selectedAssets.size} 项，将从存储中彻底移除，操作不可恢复。
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                className="text-gray-500 hover:text-black"
                                aria-label="关闭"
                            >
                                ✕
                            </button>
                        </div>

                        <label className="flex items-center gap-3 text-sm font-medium">
                            <input
                                type="checkbox"
                                className={checkboxClass}
                                checked={confirmChecked}
                                onChange={(e) => setConfirmChecked(e.target.checked)}
                            />
                            <span>我已确认备份必要图片，删除后无需恢复。</span>
                        </label>

                        <div className={`grid gap-3 md:grid-cols-3 max-h-[50vh] overflow-auto pr-1 ${adminDarkScrollbarClass}`}>
                            {Array.from(selectedAssets).map((path) => {
                                const item = assets.find((a) => a.path === path);
                                const target = item ? buildAssetUrl(item.url || item.path) : '';
                                return (
                                    <div key={path} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white">
                                        {target && (
                                            <img
                                                src={target}
                                                alt={path}
                                                className="w-full h-32 object-cover bg-gray-100 cursor-zoom-in"
                                                onClick={() => setPreviewSrc(target)}
                                            />
                                        )}
                                        <div className="p-2 text-xs font-mono break-all">{path}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                className={primaryButtonClass}
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                disabled={!confirmChecked || assetDeleting}
                                onClick={handleConfirmDeleteAssets}
                                className={dangerButtonClass}
                            >
                                {assetDeleting ? '删除中...' : '确认删除'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {previewSrc && (
                <div
                    className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setPreviewSrc('')}
                >
                    <img
                        src={previewSrc}
                        alt="preview"
                        className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
            </div>
        </>
    );
};

// 4.5 The main Admin Panel structure
// 4.5 The main Admin Panel structure
const AdminPanel = ({ setView, notification, setNotification, user, isDarkMode, handleLogout, onAboutSaved, loadGameList, onAiAssistantChanged, onHomeBackgroundChanged }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const adminDarkScrollbarClass = getAdminDarkScrollbarClass(isDarkMode);
    const BROADCAST_STYLES = [
        { value: "ALERT", label: "紧急红色告警" },
        { value: "ANNOUNCE", label: "温和庆典公告" }
    ];
    const [analyticsSummary, setAnalyticsSummary] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState('');
    const [analyticsRange, setAnalyticsRange] = useState(7);
    const { loading: permissionLoading, error: permissionError, hasPermission } = usePermissionContext();
    const [adminNavOpen, setAdminNavOpen] = useState(false);
    const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || 'dashboard';
    let activeTab = lastSegment === 'admin' ? 'dashboard' : lastSegment;
    if (pathSegments.includes('posts')) {
        activeTab = 'posts';
    }

    const tabDefinitions = useMemo(() => ([
        { key: 'dashboard', label: '仪表盘', icon: Home, permissions: ['ANALYTICS_VIEW'] },
        { key: 'create-post', label: '发布文章', icon: Edit, permissions: ['POST_CREATE'] },
        { key: 'posts', label: '文章列表', icon: FileText, permissions: ['POST_VIEW'] },
        { key: 'analytics', label: '访问日志', icon: BarChart3, permissions: ['ANALYTICS_VIEW'] },
        { key: 'ai-management', label: 'AI 会话', icon: Sparkles, permissions: [], role: 'SUPER_ADMIN' },
        { key: 'comments', label: '评论管理', icon: MessageCircle, permissions: ['COMMENT_VIEW'] },
        { key: 'categories', label: '二级分类', icon: Layers, permissions: ['CATEGORY_MANAGE'] },
        { key: 'taxonomy', label: '标签管理', icon: Tag, permissions: ['TAG_MANAGE'] },
        { key: 'about', label: '关于站点', icon: BookOpen, permissions: [], role: 'SUPER_ADMIN' },
        { key: 'users', label: '用户管理', icon: Users, permissions: ['USER_MANAGE'] },
        { key: 'permissions', label: '权限管理', icon: Shield, permissions: ['PERMISSION_MANAGE'] },
        { key: 'settings', label: '系统设置', icon: Settings, permissions: ['SYSTEM_CLEAN_STORAGE'] },
        { key: 'profile', label: '个人资料', icon: User, permissions: ['PROFILE_UPDATE'] },
    ]), []);

    const tabs = useMemo(() => {
        if (permissionLoading) {
            return tabDefinitions;
        }
        return tabDefinitions.filter((tab) => {
            if (tab.role && user?.role !== tab.role) return false;
            if (!tab.permissions || tab.permissions.length === 0) return true;
            return tab.permissions.some((code) => hasPermission(code));
        });
    }, [tabDefinitions, permissionLoading, hasPermission, user]);

    const navSections = useMemo(() => {
        const groups = [
            { title: '创作管理', keys: ['create-post', 'posts'] },
            { title: '内容体系', keys: ['categories', 'taxonomy', 'about'] },
            { title: '运营互动', keys: ['analytics', 'ai-management', 'comments'] },
            { title: '用户与权限', keys: ['users', 'permissions'] },
            { title: '个人与系统', keys: ['profile', 'settings'] },
        ];

        const groupedSections = groups
            .map((group) => ({
                ...group,
                items: group.keys
                    .map((key) => tabs.find((tab) => tab.key === key))
                    .filter(Boolean)
            }))
            .filter((group) => group.items.length > 0);

        const dashboardSection = tabs.find((tab) => tab.key === 'dashboard')
            ? [{ title: null, items: tabs.filter((tab) => tab.key === 'dashboard') }]
            : [];

        return [...dashboardSection, ...groupedSections];
    }, [tabs]);

    useEffect(() => {
        if (permissionLoading) return;
        if (!tabs.length) return;
        if (!tabs.some((tab) => tab.key === activeTab)) {
            const fallback = tabs.find((tab) => tab.key === 'profile') || tabs[0];
            if (!fallback) return;
            const target = fallback.key === 'dashboard' ? '/admin' : `/admin/${fallback.key}`;
            navigate(target, { replace: true });
        }
    }, [permissionLoading, tabs, activeTab, navigate]);

    const activeLabel = tabs.find(t => t.key === activeTab)?.label || tabs[0]?.label || '仪表盘';

    const bgClass = isDarkMode
        ? 'bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_rgba(10,15,30,0.98)_42%,_rgba(3,6,18,1)_100%)]'
        : 'bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.18),_rgba(249,251,255,0.98)_38%,_rgba(232,238,252,0.96)_100%)]';
    const textClass = isDarkMode ? 'text-gray-100' : 'text-slate-800';
    const sidebarBorder = isDarkMode ? 'border-white/10' : 'border-white/70';
    const adminSurfaceClass = `home-redesign-surface ${isDarkMode ? 'is-dark' : ''}`;
    const sidebarBg = `backdrop-blur-2xl ${
        isDarkMode
            ? 'bg-[linear-gradient(180deg,rgba(13,17,30,0.9),rgba(9,12,24,0.82))] text-gray-100 shadow-[0_20px_46px_rgba(0,0,0,0.32)]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(245,248,255,0.72))] text-slate-800 shadow-[0_18px_42px_rgba(148,163,184,0.18)]'
    } border-r ${sidebarBorder}`;
    const topbarBg = `backdrop-blur-2xl ${
        isDarkMode
            ? 'bg-[linear-gradient(180deg,rgba(13,17,30,0.88),rgba(10,14,26,0.78))] shadow-[0_12px_28px_rgba(0,0,0,0.22)]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(245,248,255,0.66))] shadow-[0_12px_28px_rgba(148,163,184,0.14)]'
    } border-b ${sidebarBorder}`;
    const panelTitleClass = isDarkMode ? 'text-gray-400' : 'text-slate-500';
    const panelGroupClass = isDarkMode ? 'pl-3 border-l border-white/10' : 'pl-3 border-l border-white/60';
    const navItemBaseClass = 'group w-full text-left rounded-2xl text-sm font-medium flex items-center transition-all duration-300 border backdrop-blur-xl';
    const activeNavItemClass = isDarkMode
        ? `${navItemBaseClass} bg-white/[0.14] text-white border-white/14 shadow-[0_14px_32px_rgba(0,0,0,0.28)]`
        : `${navItemBaseClass} bg-white/85 text-slate-900 border-white/80 shadow-[0_14px_32px_rgba(99,102,241,0.14)]`;
    const inactiveNavItemClass = isDarkMode
        ? `${navItemBaseClass} text-gray-300 border-transparent hover:bg-white/[0.06] hover:border-white/10 hover:text-white`
        : `${navItemBaseClass} text-slate-700 border-transparent hover:bg-white/60 hover:border-white/70 hover:text-slate-900`;
    const desktopSidebarWidthClass = adminSidebarCollapsed ? 'md:w-20' : 'md:w-64';
    const desktopContentOffsetClass = adminSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';
    const ghostButtonClass = `items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold backdrop-blur-xl transition-all duration-300 ${
        isDarkMode
            ? 'border-white/10 bg-white/[0.04] text-gray-100 hover:bg-white/[0.08]'
            : 'border-white/70 bg-white/70 text-slate-800 hover:bg-white/85'
    }`;
    const roleBadgeClass = isDarkMode
        ? 'border border-white/12 bg-white/[0.08] text-white'
        : 'border border-white/75 bg-white/80 text-slate-800';
    const handleToggleAdminNav = useCallback(() => {
        setAdminNavOpen((prev) => !prev);
    }, []);
    const handleToggleAdminSidebar = useCallback(() => {
        setAdminSidebarCollapsed((prev) => !prev);
    }, []);
    const handleCloseAdminNav = useCallback(() => {
        setAdminNavOpen(false);
    }, []);

    const fetchAnalyticsSummary = useCallback(async (daysValue) => {
        const targetDays = daysValue || analyticsRange;
        setAnalyticsLoading(true);
        setAnalyticsError('');
        try {
            const res = await adminFetchAnalyticsSummary({ days: targetDays });
            const data = res.data || res;
            setAnalyticsSummary(data);
        } catch (error) {
            setAnalyticsError(error.message || '获取分析数据失败');
        } finally {
            setAnalyticsLoading(false);
        }
    }, [analyticsRange]);

    useEffect(() => {
        fetchAnalyticsSummary(analyticsRange);
    }, [analyticsRange, fetchAnalyticsSummary]);

    useEffect(() => {
        setAdminNavOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!adminNavOpen || typeof document === 'undefined') return undefined;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [adminNavOpen]);

    const reloadAnalytics = useCallback((daysValue) => {
        if (daysValue && daysValue !== analyticsRange) {
            setAnalyticsRange(daysValue);
        } else {
            fetchAnalyticsSummary(daysValue || analyticsRange);
        }
    }, [analyticsRange, fetchAnalyticsSummary]);

    const analyticsRangeValue = typeof analyticsSummary?.overview?.rangeDays === 'number'
        ? analyticsSummary.overview.rangeDays
        : analyticsRange;

    const analyticsContextValue = useMemo(() => ({
        summary: analyticsSummary,
        loading: analyticsLoading,
        error: analyticsError,
        rangeDays: analyticsRangeValue,
        reload: reloadAnalytics
    }), [analyticsSummary, analyticsLoading, analyticsError, analyticsRangeValue, reloadAnalytics]);

    const adminNavContent = (forceLabels = false) => {
        const showNavLabels = forceLabels || !adminSidebarCollapsed;
        const navPaddingClass = showNavLabels ? 'p-4 pt-6 space-y-6' : 'px-3 py-5 space-y-4';
        const navItemSizingClass = showNavLabels ? 'pl-3.5 pr-3.5 py-2.5 gap-3' : 'justify-center px-0 py-3';
        const footerPaddingClass = showNavLabels ? 'p-4' : 'p-3';

        return (
        <>
            <nav className={`flex-1 ${navPaddingClass} overflow-y-auto ${adminDarkScrollbarClass}`}>
                {navSections.map((section, idx) => (
                    <div key={section.title || `section-${idx}`} className="space-y-2">
                        {section.title && showNavLabels && (
                            <div className={`px-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${panelTitleClass}`}>
                                {section.title}
                            </div>
                        )}
                        <div className={`space-y-1 ${section.title && showNavLabels ? panelGroupClass : ''}`}>
                            {section.items.map(({ key, label, icon: Icon }) => (
                                <Link
                                    key={key}
                                    to={key === 'dashboard' ? '/admin' : `/admin/${key}`}
                                    onClick={handleCloseAdminNav}
                                    title={label}
                                    className={`${activeTab === key ? activeNavItemClass : inactiveNavItemClass} ${navItemSizingClass}`}
                                >
                                    <Icon size={18} className="shrink-0" />
                                    {showNavLabels && (<span>{label}</span>)}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
            <div className={`${footerPaddingClass} border-t ${sidebarBorder}`}>
                <button
                    onClick={() => {
                        setView('home');
                        handleCloseAdminNav();
                    }}
                    title="返回前台"
                    className={`inline-flex ${ghostButtonClass} w-full justify-center`}
                >
                    <LogOut size={14} /> {showNavLabels && <span>返回前台</span>}
                </button>
            </div>
        </>
        );
    };

    return (
        <div className={`min-h-screen flex ${adminSurfaceClass} ${bgClass} ${textClass}`}>
            {/* Sidebar (Desktop) */}
            <aside
                className={`hidden md:flex ${desktopSidebarWidthClass} flex-shrink-0 ${sidebarBg} flex-col fixed h-full z-40 transition-all duration-300 ease-out`}>
                {adminNavContent()}
            </aside>

            {/* Sidebar (Mobile Drawer) */}
            <AnimatePresence>
                {adminNavOpen && (
                    <motion.div
                        className="fixed inset-0 z-[120] md:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseAdminNav}
                            aria-label="关闭后台菜单遮罩"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                            className={`absolute left-0 top-0 h-full w-[78vw] max-w-xs flex flex-col ${sidebarBg} rounded-r-[28px]`}
                        >
                            <div className={`flex items-center justify-between px-4 py-3 border-b ${sidebarBorder}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-9 h-9 rounded-2xl border flex items-center justify-center backdrop-blur-xl ${isDarkMode ? 'border-white/12 bg-white/[0.1] text-white' : 'border-white/75 bg-white/80 text-slate-900'}`}>
                                        <Shield size={16} />
                                    </div>
                                    <div className="font-black">后台菜单</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseAdminNav}
                                    className={`inline-flex ${ghostButtonClass} p-2`}
                                    aria-label="关闭后台菜单"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            {adminNavContent(true)}
                        </motion.aside>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className={`flex-1 ${desktopContentOffsetClass} ml-0 flex flex-col min-w-0 transition-all duration-300 ease-out`}>
                {/* Top Bar */}
                <header
                    className={`relative z-20 h-16 flex items-center justify-between px-4 md:px-8 ${topbarBg} mb-4`}>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleToggleAdminNav}
                            className={`inline-flex md:hidden ${ghostButtonClass} p-2`}
                            aria-label="打开后台菜单"
                        >
                            <Menu size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleAdminSidebar}
                            className={`hidden md:inline-flex ${ghostButtonClass} p-2`}
                            aria-label={adminSidebarCollapsed ? '展开后台导航' : '收起后台导航'}
                            aria-expanded={!adminSidebarCollapsed}
                            title={adminSidebarCollapsed ? '展开后台导航' : '收起后台导航'}
                        >
                            {adminSidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                        </button>
                        <h1 className="text-lg md:text-xl font-bold">{activeLabel}</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${roleBadgeClass}`}>
                            {ROLES[user.role].label}
                        </span>
                        <button onClick={handleLogout}
                            className={`inline-flex ${ghostButtonClass}`}>
                            <LogOut size={16} /> 退出登录
                        </button>
                    </div>
                </header>

                <main className={`flex-1 p-4 md:p-8 overflow-x-auto ${adminDarkScrollbarClass}`}>
                    <AnalyticsSummaryContext.Provider value={analyticsContextValue}>
                        {permissionError && (
                            <div
                                className="mb-4 border-l-4 border-amber-500 bg-amber-50 text-amber-700 px-4 py-3 text-sm">
                                权限数据加载失败：{permissionError}
                            </div>
                        )}
                        {permissionLoading && (
                            <div className="mb-4 text-sm text-gray-500">权限信息加载中，请稍候...</div>
                        )}
                        {!permissionLoading && tabs.length === 0 && (
                            <PermissionNotice
                                title="暂无可访问模块"
                                description="当前账号尚未被授予任何后台权限，请联系超级管理员配置。"
                            />
                        )}
                        <Routes>
                            <Route index element={<DashboardView isDarkMode={isDarkMode} user={user} />} />
                            <Route path="dashboard" element={<DashboardView isDarkMode={isDarkMode} user={user} />} />
                            <Route path="create-post" element={<CreatePostView isDarkMode={isDarkMode} user={user} />} />
                            <Route path="analytics" element={<AnalyticsView isDarkMode={isDarkMode} user={user} />} />
                            <Route path="ai-management" element={<AiAdminAuditView isDarkMode={isDarkMode} user={user} />} />
                            <Route path="comments" element={<CommentsAdminView isDarkMode={isDarkMode} />} />
                            <Route path="categories" element={<CategoriesView isDarkMode={isDarkMode} />} />
                            <Route path="taxonomy" element={<TaxonomyView isDarkMode={isDarkMode} />} />
                            <Route path="about" element={<AboutAdminView isDarkMode={isDarkMode} user={user} onSaved={onAboutSaved} />} />
                            <Route path="posts" element={<PostsView isDarkMode={isDarkMode} />} />
                            <Route path="posts/edit" element={<EditPostView isDarkMode={isDarkMode} />} />
                            <Route path="users" element={<UserManagementView isDarkMode={isDarkMode} />} />
                            <Route path="permissions" element={<PermissionsView isDarkMode={isDarkMode} />} />
                            <Route path="settings" element={<SystemSettingsView isDarkMode={isDarkMode} user={user} notification={notification} setNotification={setNotification} onGameChanged={loadGameList} onAiAssistantChanged={onAiAssistantChanged} onHomeBackgroundChanged={onHomeBackgroundChanged} />} />
                            <Route path="profile" element={<AdminProfile isDarkMode={isDarkMode} />} />
                            <Route path="*" element={<div className="text-xl p-8 text-center">功能开发中...</div>} />
                        </Routes>
                    </AnalyticsSummaryContext.Provider>

                </main>
            </div>
        </div>
    );
};

function AboutAdminView({ isDarkMode, user, onSaved }) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [assetsFolder, setAssetsFolder] = useState('');
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);

    const loadAboutAdmin = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await adminFetchAbout();
            const data = res.data || res;
            setContent(data?.contentMd || '');
        } catch (e) {
            setError(e.message || '加载关于页失败');
            setContent('');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAboutAdmin();
    }, [loadAboutAdmin]);

    const ensureAssetsSlug = useCallback(async () => {
        if (assetsFolder) return assetsFolder;
        const res = await reservePostAssetsFolder();
        const data = res.data || res;
        if (!data?.folder) throw new Error('未获取到资源目录');
        setAssetsFolder(data.folder);
        return data.folder;
    }, [assetsFolder]);

    const insertImagesAtCursor = (urls = []) => {
        if (!urls.length) return;
        const snippet = urls.map((url, idx) => `![about-${idx + 1}](${url})`).join('\n') + '\n';
        setContent((prev) => {
            const textarea = document.getElementById('about-md-editor');
            if (!textarea) return `${prev}${prev.endsWith('\n') ? '' : '\n'}${snippet}`;
            const start = textarea.selectionStart ?? prev.length;
            const end = textarea.selectionEnd ?? start;
            const before = prev.slice(0, start);
            const after = prev.slice(end);
            return `${before}${snippet}${after}`;
        });
    };

    const handleInlineImageUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        setMessage('图片上传中…');
        setError('');
        try {
            const slug = await ensureAssetsSlug();
            const res = await uploadPostAssets(files, slug);
            const data = res.data || res;
            const urls = data?.urls || [];
            if (urls.length) {
                insertImagesAtCursor(urls);
                setMessage('图片已上传并插入 Markdown');
            } else {
                setMessage('图片上传完成');
            }
        } catch (err) {
            setError(err.message || '图片上传失败');
        } finally {
            event.target.value = null;
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            setContent(text);
            setMessage(`已载入文件：${file.name}`);
        } catch (e) {
            setError(e.message || '读取文件失败');
        } finally {
            event.target.value = null;
        }
    };

    const handleSave = async () => {
        if (!content.trim()) {
            setError('正文不能为空');
            setMessage('');
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            await adminSaveAbout({ contentMd: content });
            setMessage('已保存');
            if (typeof onSaved === 'function') {
                onSaved();
            }
            await loadAboutAdmin();
        } catch (e) {
            setError(e.message || '保存失败');
        } finally {
            setSaving(false);
        }
    };

    if (!user || user.role !== 'SUPER_ADMIN') {
        return <PermissionNotice title="无权限" description="仅超级管理员可以编辑“关于本站”页面" />;
    }

    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const inputClass = `w-full p-3 border-2 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'} focus:border-indigo-500 outline-none`;
    const adminDarkScrollbarClass = getAdminDarkScrollbarClass(isDarkMode);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#FF0080]">About Page</p>
                    <h2 className="text-3xl font-black">关于本站单页</h2>
                    <p className="text-sm text-gray-500 mt-1">只需填写 Markdown 正文或上传 .md 文件，其余元信息全部省略。</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadAboutAdmin}
                        className={`px-4 py-2 border-2 border-black rounded-full text-sm font-bold shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-100'}`}
                    >刷新</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-4 py-2 border-2 border-black rounded-full text-sm font-bold shadow-[4px_4px_0px_0px_#000] ${saving ? 'opacity-60 cursor-not-allowed' : 'bg-[#00E096] hover:-translate-y-0.5'} `}
                    >{saving ? '保存中…' : '保存'}</button>
                </div>
            </div>

            {(loading || error || message) && (
                <div className="flex gap-3 items-center text-sm">
                    {loading && <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold">加载中…</span>}
                    {message && <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">{message}</span>}
                    {error && <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold">{error}</span>}
                </div>
            )}

            <div className={`${surface} ${text} border-2 border-black rounded-2xl p-4 space-y-4 shadow-[8px_8px_0px_0px_#000]`}>
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black">Markdown 正文</h3>
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".md,.markdown,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleInlineImageUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1 border-2 border-black rounded-full text-xs font-bold bg-white text-black shadow-[3px_3px_0px_0px_#000]"
                        >上传 MD</button>
                        <button
                            onClick={() => imageInputRef.current?.click()}
                            className="px-3 py-1 border-2 border-black rounded-full text-xs font-bold bg-white text-black shadow-[3px_3px_0px_0px_#000]"
                        >上传图片</button>
                    </div>
                </div>
                <textarea
                    id="about-md-editor"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={28}
                    className={`${inputClass} ${adminDarkScrollbarClass} font-mono text-sm leading-6 min-h-[520px]`}
                    placeholder="在此粘贴或输入 Markdown 内容…"
                />
                <div className="text-xs text-gray-500">提示：图片上传会自动将 Markdown 链接插入光标处，资源目录自动生成。</div>
            </div>
        </div>
    );
}

export { AdminPanel };
