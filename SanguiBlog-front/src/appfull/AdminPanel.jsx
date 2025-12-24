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
    adminFetchPermissionMatrix,
    adminUpdateRolePermissions,
    adminScanUnusedAssets,
    adminDeleteUnusedAssets,
    adminScanEmptyFolders,
    adminDeleteEmptyFolders,
    adminFetchGames,
    adminCreateGame,
    adminUpdateGame,
    adminDeleteGame,
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
    RefreshCw, Plus, Trash2, Save, ImagePlus, ChevronsLeft, ChevronsRight, Copy
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

const formatBgClassFromHex = (hex) => {
    if (!hex) return DEFAULT_THEME_COLOR;
    const normalized = hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
    return `bg-[${normalized}]`;
};

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

    const [aggregatedTrends, setAggregatedTrends] = useState([]);
    const [aggregatedLoading, setAggregatedLoading] = useState(false);
    const [aggregatedError, setAggregatedError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const loadAggregated = async () => {
            setAggregatedLoading(true);
            setAggregatedError('');
            try {
                // 拉取足够覆盖 60 天的访问日志
                const res = await adminFetchPageViewLogs({ page: 1, size: 1500 });
                const data = res.data || res;
                const records = data.records || [];
                const today = new Date();
                const start = new Date(today);
                start.setDate(today.getDate() - (trendRangeDays - 1));

                const byDate = new Map();
                records.forEach((item) => {
                    const dateStr = (item.time || item.viewedAt || item.viewed_at || '').slice(0, 10);
                    if (!dateStr) return;
                    const dateObj = new Date(dateStr);
                    if (Number.isNaN(dateObj.getTime()) || dateObj < start) return;

                    const key = dateStr;
                    const ip = item.ip || item.viewerIp || item.viewer_ip || '';
                    const userId = item.userId ?? item.user_id ?? null;
                    const identity = userId ? `U#${userId}` : (ip ? `G#${ip}` : `G#${item.id || dateStr}`);

                    const current = byDate.get(key) || { views: 0, visitors: new Set() };
                    current.views += 1;
                    current.visitors.add(identity);
                    byDate.set(key, current);
                });

                const result = [];
                for (let i = 0; i < trendRangeDays; i += 1) {
                    const d = new Date(start);
                    d.setDate(start.getDate() + i);
                    const key = d.toISOString().slice(0, 10);
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
                <div className={`xl:col-span-2 ${surface} ${border} rounded-2xl p-6 shadow-xl`}>
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
                <div className={`${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                    <h3 className={`text-xl font-bold ${textPrimary}`}>流量来源</h3>
                    <p className={`text-xs ${textMuted} mb-4`}>analytics_traffic_sources 实时占比</p>
                    {trafficSources.length === 0 ? (
                        <p className={`text-sm ${textMuted}`}>暂无流量来源统计</p>
                    ) : (
                        <div className="space-y-3">
                            {trafficSources.map((source, index) => (
                                <div key={`${source.label}-${index}`}>
                                    <div className="flex items-center justify-between text-sm">
                                        <span>{source.label}</span>
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
                    )}
                </div>
            </div>
        </div>
    );
};

const TrendChart = ({ data, isDarkMode }) => {
    const textMuted = isDarkMode ? "text-gray-400" : "text-gray-500";
    if (!data.length) {
        return <p className={`mt-6 text-sm ${textMuted}`}>暂无趋势数据</p>;
    }
    const gridColor = isDarkMode ? "#2e3445" : "#E5E7EB";
    const accentPv = "#FF0080";
    const accentUv = "#16A34A";
    const surfaceBg = isDarkMode ? "#0b1220" : "#f8fafc";
    const safeData = Array.isArray(data) ? data.filter(Boolean) : [];

    const normalized = safeData.map((item, index) => ({
        views: Number(item?.views || 0),
        visitors: Number(item?.visitors || 0),
        dateLabel: (item?.date || '').slice(5) || `D${index + 1}`
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
    const paddingX = 8;
    const chartHeight = 100 - paddingY * 2;
    const chartWidth = 100 - paddingX * 2;
    const lastIndex = Math.max(normalized.length - 1, 1);

    const projectX = (index) => paddingX + (index / lastIndex) * chartWidth;
    const projectY = (value) => {
        if (!hasNonZero) {
            // 避免全 0 时折线贴底不可见
            return 100 - paddingY - chartHeight * 0.12;
        }
        return 100 - paddingY - (value / niceMax) * chartHeight;
    };

    const buildPoints = (key) =>
        normalized
            .map((item, index) => {
                const x = projectX(index);
                const y = projectY(item[key]);
                return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ");

    const pvPoints = buildPoints("views");
    const uvPoints = buildPoints("visitors");
    const baseline = 100 - paddingY;

    const renderDots = (key, color) =>
        normalized.map((item, index) => {
            const x = projectX(index);
            const y = projectY(item[key]);
            return (
                <circle
                    key={`${key}-${index}`}
                    cx={x}
                    cy={y}
                    r={1.4}
                    fill={color}
                    stroke={isDarkMode ? "#0f172a" : "#fff"}
                    strokeWidth="0.6"
                />
            );
        });

    const yTicks = 5;
    const yLabels = Array.from({ length: yTicks + 1 }, (_, idx) => {
        const v = Math.round((niceMax / yTicks) * idx);
        const y = 100 - paddingY - (v / niceMax) * chartHeight;
        return { v, y };
    });

    return (
        <div className="mt-6">
            <div className="relative">
                <svg viewBox="0 0 100 100" className="w-full h-60" preserveAspectRatio="none">
                    <rect x="0" y="0" width="100" height="100" fill={surfaceBg} />
                    {yLabels.map((tick, idx) => (
                        <g key={`grid-${idx}`}>
                            <line
                                x1={paddingX}
                                x2={paddingX + chartWidth}
                                y1={tick.y}
                                y2={tick.y}
                                stroke={gridColor}
                                strokeWidth="0.35"
                                strokeDasharray="1.5 2.5"
                            />
                            <text
                                x={paddingX - 2}
                                y={tick.y + 2.5}
                                fontSize="4"
                                textAnchor="end"
                                fill={isDarkMode ? "#cbd5e1" : "#475569"}
                            >
                                {tick.v}
                            </text>
                        </g>
                    ))}
                    <polygon
                        points={`${paddingX},${baseline} ${pvPoints} ${paddingX + chartWidth},${baseline}`}
                        fill={`${accentPv}1a`}
                        stroke="none"
                    />
                    <polygon
                        points={`${paddingX},${baseline} ${uvPoints} ${paddingX + chartWidth},${baseline}`}
                        fill={`${accentUv}1a`}
                        stroke="none"
                    />
                    <polyline
                        fill="none"
                        stroke={accentPv}
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={pvPoints}
                    />
                    <polyline
                        fill="none"
                        stroke={accentUv}
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={uvPoints}
                    />
                    {renderDots("views", accentPv)}
                    {renderDots("visitors", accentUv)}
                </svg>
                {!hasNonZero && (
                    <p className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-amber-600/80">
                        暂无有效访问，已展示占位折线
                    </p>
                )}
            </div>
            <div className="flex items-center gap-4 text-xs mt-4">
                <span className="flex items-center gap-2 text-[#FF0080]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF0080]" /> PV
                </span>
                <span className="flex items-center gap-2 text-emerald-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> UV
                </span>
                <span className={`text-[11px] ${textMuted}`}>横轴：日期（MM-DD），自动拉伸</span>
            </div>
            <div className="flex flex-wrap justify-between text-[10px] uppercase tracking-widest text-gray-400 mt-2 gap-y-1">
                {normalized.map((item, index) => (
                    <span key={`${item.dateLabel}-${index}`} className="text-center min-w-[32px]">
                        {item.dateLabel}
                    </span>
                ))}
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
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
        if (/^(https?:)?\/\//i.test(referrer)) {
            let label = referrer;
            try {
                const parsed = new URL(referrer);
                label = `外部链接：${parsed.hostname}`;
            } catch {
                label = referrer;
            }
            return <a className="text-indigo-500 hover:underline" href={referrer} target="_blank"
                rel="noopener noreferrer">{label}</a>;
        }
        return referrer;
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

    const loadLogs = useCallback(async (targetPage = 1, targetSize = 20) => {
        setLoading(true);
        setError('');
        try {
            const res = await adminFetchPageViewLogs({ page: targetPage, size: targetSize });
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
    }, []);

    useEffect(() => {
        loadLogs(1, size);
    }, [loadLogs, size]);

    const totalPages = Math.max(1, Math.ceil((total || 0) / size) || 1);
    const allSelected = logs.length > 0 && selectedIds.length === logs.length;
    const hasSelection = selectedIds.length > 0;

    const handlePageChange = (target) => {
        const safe = Math.min(Math.max(target, 1), totalPages);
        loadLogs(safe, size);
    };

    const handleSizeChange = (nextSize) => {
        const parsed = Number(nextSize);
        if (!parsed || parsed < 1) return;
        loadLogs(1, parsed);
    };

    const handleClearLogs = async () => {
        if (!isSuperAdmin) return;
        if (!window.confirm('确定要删除你在本站的所有访问日志吗？')) return;
        setClearing(true);
        setActionMessage('');
        try {
            await adminDeleteMyAnalyticsLogs();
            setActionMessage('已清理当前账户的访问日志。');
            await loadLogs(1, size);
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
        if (!window.confirm('确认删除这条访问日志吗？')) return;
        setDeleting(true);
        setActionMessage('');
        try {
            await adminDeletePageViewLog(id);
            setActionMessage('已删除 1 条访问日志。');
            const nextPage = logs.length === 1 && page > 1 ? page - 1 : page;
            await loadLogs(nextPage, size);
            if (reload) reload();
        } catch (err) {
            setError(err.message || '删除失败，请稍后再试。');
        } finally {
            setDeleting(false);
        }
    };

    const handleBatchDelete = async () => {
        if (!isSuperAdmin || !selectedIds.length) return;
        if (!window.confirm(`确认删除选中的 ${selectedIds.length} 条访问日志吗？`)) return;
        setDeleting(true);
        setActionMessage('');
        try {
            await adminDeletePageViewLogs(selectedIds);
            setActionMessage(`已删除 ${selectedIds.length} 条访问日志。`);
            const nextPage = selectedIds.length >= logs.length && page > 1 ? page - 1 : page;
            setSelectedIds([]);
            await loadLogs(nextPage, size);
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
                        onClick={() => loadLogs(page, size)}
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
                    <div className="overflow-x-auto">
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
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                            className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"
                        >
                            上一页
                        </button>
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
    const markdownFileInputRef = useRef(null);
    const markdownEditorRef = useRef(null);
    const inlineImageInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    const inputClass = `w-full p-3 border-2 rounded-md transition-all ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' : 'bg-white border-gray-300 text-black focus:border-indigo-500'}`;
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
        selectedTags.length > 0
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

    const handleResetForm = () => {
        if (!window.confirm("确定要清空当前所有输入吗？此操作不可撤销。")) return;
        const firstParentId = normalizedCategories[0]?.id ?? null;
        const firstChildId = normalizedCategories[0]?.children?.[0]?.id ?? null;
        setTitle("");
        setMdContent("");
        setExcerpt("");
        setMarkdownFileName("");
        setMarkdownMessage("");
        setImageUploadMessage("");
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
                                <p className="text-xs text-gray-500">上传 .md、粘贴内容，或在当前光标处插入图片</p>
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
                                    <ImagePlus size={16} /> {uploadingImages ? "插图上传中..." : "插入图片"}
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
                            className={`${inputClass} min-h-[420px] font-mono text-sm`}
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
                            className={`${inputClass} min-h-[120px]`}
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
                            disabled={!canPublish || submitting}
                            onClick={handlePublish}
                        >
                            {submitting ? "发布中..." : "立即发布"}
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
            alert("请输入标签名称");
            return;
        }
        setSaving(true);
        try {
            await adminCreateTag(normalizePayload(form));
            setForm({ name: "", slug: "", description: "" });
            setPage(1);
            await loadTags();
            alert("标签创建成功");
        } catch (err) {
            alert(err.message || "创建失败");
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
            alert("请输入标签名称");
            return;
        }
        setSaving(true);
        try {
            await adminUpdateTag(editingId, normalizePayload(editForm));
            cancelEdit();
            await loadTags();
            alert("标签已更新");
        } catch (err) {
            alert(err.message || "更新失败");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (tagId) => {
        if (!window.confirm("确定要删除该标签吗？")) return;
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
            alert(err.message || "删除失败");
        }
    };

    const cardBg = isDarkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200";
    const inputClass = `border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`;
    const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

    const totalPages = Math.max(Math.ceil(total / size), 1);

    return (
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
                    <div className="overflow-x-auto">
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

    const loadParentOptions = useCallback(async () => {
        try {
            const res = await fetchCategories();
            const data = res.data || res || [];
            setParentOptions(data.map((item) => ({ id: item.id, label: item.label })));
        } catch (err) {
            console.warn("load parent categories failed", err);
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
            alert("请输入分类名称");
            return;
        }
        setSaving(true);
        try {
            await adminCreateCategory(normalizePayload(form));
            setForm({ name: "", slug: "", description: "", parentId: "", sortOrder: "" });
            setPage(1);
            await loadParentOptions();
            await loadCategories();
            alert("分类创建成功");
        } catch (err) {
            alert(err.message || "创建失败");
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
            alert("请输入分类名称");
            return;
        }
        setSaving(true);
        try {
            await adminUpdateCategory(editingId, normalizePayload(editForm));
            cancelEdit();
            await loadParentOptions();
            await loadCategories();
            alert("分类已更新");
        } catch (err) {
            alert(err.message || "更新失败");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (categoryId) => {
        if (!window.confirm("确定要删除该分类吗？删除前请确保没有子分类。")) return;
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
            alert(err.message || "删除失败");
        }
    };

    const totalPages = Math.max(Math.ceil(total / size), 1);
    const cardBg = isDarkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200";
    const inputClass = `border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`;
    const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

    return (
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
                    <div className="overflow-x-auto">
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
                console.warn('load tags failed', error);
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
        form.status
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
                                className={`${inputClass} min-h-[420px] font-mono text-sm`}
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
                            className={`${inputClass} min-h-[120px]`}
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
                                disabled={!canSave || saving}
                                className={`w-full px-4 py-3 font-bold border-2 border-black ${canSave ? 'bg-[#FFD700] text-black hover:translate-y-0.5 transition-transform' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                            >
                                {saving ? '保存中...' : '保存修改'}
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
            console.warn('load categories failed', err);
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
                    <div className="overflow-x-auto">
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
            console.warn('load posts failed', error);
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
        if (!window.confirm(`确认删除评论 #${comment.id} 吗？`)) return;
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
                    <div className="overflow-x-auto">
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
        if (!window.confirm(`确认删除 ${user.username} 吗？`)) return;
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
                    <div className="overflow-x-auto">
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

                                        <div className="overflow-x-auto">
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
const SystemSettingsView = ({ isDarkMode, user, notification, setNotification, onGameChanged }) => {
    const MAX_BROADCAST_LEN = 180;
    const SETTINGS_TABS = [
        { key: 'broadcast', label: '广播管理' },
        { key: 'games', label: '游戏管理' },
        { key: 'cleanup', label: '存储清理' }
    ];
    const [activeSettingsTab, setActiveSettingsTab] = useState('broadcast');
    const [broadcastDraft, setBroadcastDraft] = useState({
        content: notification?.content || '',
        style: (notification?.style || 'ALERT').toUpperCase(),
        active: Boolean(notification?.isOpen)
    });
    const [broadcastSaving, setBroadcastSaving] = useState(false);
    const [broadcastError, setBroadcastError] = useState('');

    const [gameList, setGameList] = useState([]);
    const [gameLoading, setGameLoading] = useState(false);
    const [gameError, setGameError] = useState('');
    const [gameForm, setGameForm] = useState({ title: '', description: '', status: 'ACTIVE', sortOrder: 0, file: null });
    const [gameEditingId, setGameEditingId] = useState(null);
    const [gameSaving, setGameSaving] = useState(false);
    const [gameDeletingId, setGameDeletingId] = useState(null);
    const { hasPermission } = usePermissionContext();
    const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '--');

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
            if (gameEditingId) {
                await adminUpdateGame(gameEditingId, gameForm);
            } else {
                await adminCreateGame(gameForm);
            }
            await loadGames();
            resetGameForm({}, true);
            onGameChanged && onGameChanged();
        } catch (err) {
            setGameError(err?.message || '保存失败');
        } finally {
            setGameSaving(false);
        }
    }, [gameForm, gameEditingId, loadGames, resetGameForm, onGameChanged]);

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
        const ok = typeof window !== 'undefined' ? window.confirm('确认删除该 HTML 页面吗？此操作不可恢复。') : true;
        if (!ok) return;
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
    }, [loadGames, onGameChanged, gameEditingId, resetGameForm]);

    const handleGameOpen = useCallback((game) => {
        if (!game) return;
        const targetUrl = game.url ? buildAssetUrl(game.url) : '';
        if (targetUrl && typeof window !== 'undefined') {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
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
        const ok = typeof window !== 'undefined'
            ? window.confirm(`确认删除选中的 ${emptySelected.size} 个空目录吗？此操作不可恢复。`)
            : true;
        if (!ok) return;
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
    }, [emptySelected, loadEmptyFolders]);

    useEffect(() => {
        scanUnusedAssets();
        loadEmptyFolders();
    }, [scanUnusedAssets, loadEmptyFolders]);

    const surface = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';

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
            alert(targetActive ? '广播已发布，前台顶部已同步' : '广播已停用，最新文案已保存');
        } catch (err) {
            setBroadcastError(err?.message || '同步广播失败，请稍后重试');
        } finally {
            setBroadcastSaving(false);
        }
    }, [broadcastDraft, setNotification]);

    if (!hasPermission('SYSTEM_CLEAN_STORAGE') || user?.role !== 'SUPER_ADMIN') {
        return <PermissionNotice title="仅超级管理员可用" description="系统设置仅限超级管理员访问。" />;
    }

    return (
        <div className="space-y-6">
            {/* 顶部子页切换 */}
            <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} rounded-2xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-2`}>
                <span className="text-sm font-semibold mr-2">设置分组：</span>
                <div className="flex flex-wrap gap-2">
                    {SETTINGS_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveSettingsTab(tab.key)}
                            className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                                activeSettingsTab === tab.key
                                    ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_#000]'
                                    : `${isDarkMode ? 'bg-gray-800 text-gray-200 border-gray-700 hover:border-gray-500' : 'bg-white text-gray-800 border-black hover:-translate-y-0.5'}`
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 广播管理 */}
            <div
                className={`rounded-2xl border-2 shadow-xl overflow-hidden ${
                    isDarkMode
                        ? 'bg-gray-950 border-gray-700 text-gray-50'
                        : 'bg-white border-gray-200 text-gray-900'
                } ${activeSettingsTab === 'broadcast' ? '' : 'hidden'}`}
            >
                <div className="p-6 pb-4 flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            isDarkMode
                                ? 'bg-gray-800 text-amber-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.45)]'
                                : 'bg-black text-white shadow-[4px_4px_0px_0px_#000]'
                        }`}>
                            <Megaphone size={18} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">紧急广播 · 顶部全局条</h3>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>紧急/庆典双样式，保存即刻同步首页顶部。</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                            isDarkMode
                                ? 'border-gray-600 bg-gray-800 text-gray-100'
                                : 'border-black/30 bg-white text-gray-800'
                        }`}>仅 SUPER_ADMIN</span>
                        <label className="flex items-center gap-2 text-sm font-semibold">
                            <input
                                type="checkbox"
                                className="h-4 w-4 border-2 border-black rounded"
                                checked={broadcastDraft.active}
                                onChange={(e) => setBroadcastDraft((prev) => ({ ...prev, active: e.target.checked }))}
                            />
                            <span>开启广播</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => handleBroadcastSave(broadcastDraft.active)}
                            disabled={broadcastSaving}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-[#C7F36B] text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {broadcastSaving ? '保存中…' : '保存设置'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBroadcastSave(false)}
                            disabled={broadcastSaving}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
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
                                className={`w-full border-2 px-3 py-3 rounded-xl focus:outline-none focus:ring-4 ${
                                    isDarkMode
                                        ? 'border-gray-700 bg-gray-900/80 text-gray-100 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.45)] focus:ring-indigo-300/40'
                                        : 'border-gray-900 bg-white text-gray-900 shadow-[6px_6px_0px_0px_#000] focus:ring-amber-200/80'
                                }`}
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
                                        {active && <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-black text-white">当前</span>}
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
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {gameLoading ? '刷新中...' : '刷新列表'}
                        </button>
                        <button
                            type="button"
                            onClick={() => resetGameForm()}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-[#FFD700] text-black shadow-[4px_4px_0px_0px_#000]"
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
                            className="border-2 border-black px-3 py-2 rounded"
                            placeholder="例如：像素跑酷 / H5 Demo"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">状态</label>
                        <select
                            value={gameForm.status}
                            onChange={(e) => setGameForm((prev) => ({ ...prev, status: e.target.value }))}
                            className="border-2 border-black px-3 py-2 rounded"
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
                            className="border-2 border-black px-3 py-2 rounded"
                            placeholder="一句话给运营或访客的提示"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">排序权重（小在前）</label>
                        <input
                            type="number"
                            value={gameForm.sortOrder ?? 0}
                            onChange={(e) => setGameForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
                            className="border-2 border-black px-3 py-2 rounded"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">HTML 文件 {gameEditingId ? '（不更换可留空）' : ''}</label>
                        <input
                            key={gameEditingId ? `edit-${gameEditingId}` : 'new-game'}
                            type="file"
                            accept=".html,.htm,text/html"
                            onChange={(e) => setGameForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                            className={`px-3 py-2 rounded text-sm ${
                                isDarkMode
                                    ? 'border-2 border-gray-700 bg-gray-800 text-gray-100 file:text-gray-100 file:bg-gray-800 file:border-0'
                                    : 'border-2 border-black bg-white text-gray-900 file:text-gray-900 file:bg-white file:border-0'
                            }`}
                        />
                        {gameForm.file && <span className="text-xs text-gray-500">已选择：{gameForm.file.name}</span>}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleGameSubmit}
                        disabled={gameSaving}
                        className="px-5 py-2 border-2 border-black rounded-full text-sm font-bold bg-black text-white shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                    >
                        {gameSaving ? '保存中...' : (gameEditingId ? '保存修改' : '上传页面')}
                    </button>
                    <button
                        type="button"
                        onClick={() => resetGameForm()}
                        className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[3px_3px_0px_0px_#000]"
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
                                    className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-black'} border-2 rounded-xl p-4 space-y-3 shadow-[4px_6px_0px_rgba(0,0,0,0.25)]`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>ID #{game.id}</div>
                                            <h4 className="text-lg font-bold leading-tight">{game.title}</h4>
                                            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm line-clamp-2`}>{game.description || '暂无描述'}</p>
                                            <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>状态：{game.status || '--'} · 更新：{formatDateTime(game.updatedAt || game.createdAt)}</p>
                                        </div>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-black/40 bg-white/70 text-black font-bold">{game.status || '--'}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleGameOpen(game)}
                                            className="px-3 py-1 border-2 border-black rounded-full text-xs font-bold bg-[#FFD700] text-black hover:-translate-y-0.5 transition-transform"
                                        >
                                            预览
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleGameEdit(game)}
                                            className="px-3 py-1 border-2 border-black rounded-full text-xs font-bold bg-white text-black hover:-translate-y-0.5 transition-transform"
                                        >
                                            编辑
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleGameDelete(game.id)}
                                            disabled={gameDeletingId === game.id}
                                            className="px-3 py-1 border-2 border-black rounded-full text-xs font-bold bg-red-500 text-white hover:-translate-y-0.5 transition-transform disabled:opacity-60"
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
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {assetLoading ? '扫描中...' : '重新扫描'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleSelectAllAssets}
                            disabled={!assets.length}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-[#C7F36B] text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {selectedAssets.size === assets.length && assets.length ? '取消全选' : '全选'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteSelectedAssets}
                            disabled={!selectedAssets.size}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-red-500 text-white shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
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

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
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
                                            className="h-4 w-4 border-2 border-black rounded"
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
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {emptyLoading ? '扫描中...' : '重新扫描'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleSelectAllEmpty}
                            disabled={!emptyFolders.length}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-[#C7F36B] text-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
                        >
                            {emptySelected.size === emptyFolders.length && emptyFolders.length ? '取消全选' : '全选'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteEmptyFolders}
                            disabled={!emptySelected.size}
                            className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-red-500 text-white shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
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

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
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
                                            className="h-4 w-4 border-2 border-black rounded"
                                            checked={emptySelected.has(path)}
                                            onChange={() => toggleSelectEmpty(path)}
                                        />
                                        <div className="font-mono text-sm break-all">{path}</div>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full border border-black/30 bg-white text-gray-700 dark:text-gray-100">
                                        空目录
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
                                className="h-4 w-4 border-2 border-black rounded"
                                checked={confirmChecked}
                                onChange={(e) => setConfirmChecked(e.target.checked)}
                            />
                            <span>我已确认备份必要图片，删除后无需恢复。</span>
                        </label>

                        <div className="grid gap-3 md:grid-cols-3 max-h-[50vh] overflow-auto pr-1">
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
                                className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white text-black shadow-[3px_3px_0px_0px_#000]"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                disabled={!confirmChecked || assetDeleting}
                                onClick={handleConfirmDeleteAssets}
                                className="px-5 py-2 border-2 border-black rounded-full text-sm font-bold bg-red-500 text-white shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
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
    );
};

// 4.5 The main Admin Panel structure
// 4.5 The main Admin Panel structure
const AdminPanel = ({ setView, notification, setNotification, user, isDarkMode, handleLogout, onAboutSaved, loadGameList }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const BROADCAST_STYLES = [
        { value: "ALERT", label: "紧急红色告警" },
        { value: "ANNOUNCE", label: "温和庆典公告" }
    ];
    const [analyticsSummary, setAnalyticsSummary] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState('');
    const [analyticsRange, setAnalyticsRange] = useState(7);
    const { loading: permissionLoading, error: permissionError, hasPermission } = usePermissionContext();
    const { headerHeight } = useLayoutOffsets();
    const [adminNavOpen, setAdminNavOpen] = useState(false);

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
            { title: '运营互动', keys: ['analytics', 'comments'] },
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

    const bgClass = isDarkMode ? THEME.colors.bgDark : 'bg-gray-100';
    const sidebarBg = isDarkMode ? 'bg-gray-900' : 'bg-white';
    const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-800';
    const sidebarBorder = isDarkMode ? 'border-gray-700' : 'border-gray-200';
    const topbarBg = isDarkMode ? 'bg-gray-900' : 'bg-white';
    const handleToggleAdminNav = useCallback(() => {
        setAdminNavOpen((prev) => !prev);
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

    const adminNavContent = (
        <>
            <nav className="flex-1 p-4 pt-6 space-y-6 overflow-y-auto">
                {navSections.map((section, idx) => (
                    <div key={section.title || `section-${idx}`} className="space-y-2">
                        {section.title && (
                            <div className={`px-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {section.title}
                            </div>
                        )}
                        <div className={`space-y-1 ${section.title ? (isDarkMode ? 'pl-2 border-l border-gray-800' : 'pl-2 border-l border-gray-200') : ''}`}>
                            {section.items.map(({ key, label, icon: Icon }) => (
                                <Link
                                    key={key}
                                    to={key === 'dashboard' ? '/admin' : `/admin/${key}`}
                                    onClick={handleCloseAdminNav}
                                    className={`group w-full text-left pl-3 pr-3 py-2 rounded text-sm font-medium flex items-center gap-3 transition-colors ${activeTab === key
                                        ? 'bg-indigo-500 text-white shadow-lg'
                                        : `hover:bg-indigo-100 hover:text-indigo-600 ${isDarkMode ? 'text-gray-300 hover:bg-gray-800 hover:text-white' : 'text-gray-800'}`
                                        }`}
                                >
                                    <Icon size={18} className="shrink-0" />
                                    <span>{label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
            <div className={`p-4 border-t ${sidebarBorder}`}>
                <button
                    onClick={() => {
                        setView('home');
                        handleCloseAdminNav();
                    }}
                    className="text-sm text-gray-500 hover:text-black flex items-center gap-2"
                >
                    <LogOut size={14} /> 返回前台
                </button>
            </div>
        </>
    );

    return (
        <div className={`min-h-screen flex ${bgClass} ${textClass}`}>
            {/* Sidebar (Desktop) */}
            <aside
                className={`hidden md:flex w-64 flex-shrink-0 ${sidebarBg} border-r ${sidebarBorder} flex-col fixed h-full z-40 transition-colors`}>
                {adminNavContent}
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
                            className={`absolute left-0 top-0 h-full w-[78vw] max-w-xs flex flex-col ${sidebarBg} border-r ${sidebarBorder} shadow-[8px_0_0_0_#000]`}
                        >
                            <div className={`flex items-center justify-between px-4 py-3 border-b ${sidebarBorder}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-9 h-9 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'} flex items-center justify-center border-2 border-black`}>
                                        <Shield size={16} />
                                    </div>
                                    <div className="font-black">后台菜单</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseAdminNav}
                                    className={`p-2 border-2 border-black rounded-full ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}`}
                                    aria-label="关闭后台菜单"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            {adminNavContent}
                        </motion.aside>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 md:ml-64 ml-0 flex flex-col min-w-0">
                {/* Top Bar */}
                <header
                    className={`sticky z-30 h-16 flex items-center justify-between px-4 md:px-8 ${topbarBg} border-b ${sidebarBorder} shadow-sm`}
                    style={{ top: headerHeight }}>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleToggleAdminNav}
                            className={`md:hidden p-2 border-2 border-black rounded-full shadow-[3px_3px_0px_0px_#000] ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
                            aria-label="打开后台菜单"
                        >
                            <Menu size={18} />
                        </button>
                        <h1 className="text-lg md:text-xl font-bold">{activeLabel}</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className={`text-xs px-3 py-1 rounded font-bold text-white ${ROLES[user.role].color}`}>
                            {ROLES[user.role].label}
                        </span>
                        <button onClick={handleLogout}
                            className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
                            <LogOut size={16} /> 退出登录
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-x-auto">
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
                            <Route path="comments" element={<CommentsAdminView isDarkMode={isDarkMode} />} />
                            <Route path="categories" element={<CategoriesView isDarkMode={isDarkMode} />} />
                            <Route path="taxonomy" element={<TaxonomyView isDarkMode={isDarkMode} />} />
                            <Route path="about" element={<AboutAdminView isDarkMode={isDarkMode} user={user} onSaved={onAboutSaved} />} />
                            <Route path="posts" element={<PostsView isDarkMode={isDarkMode} />} />
                            <Route path="posts/edit" element={<EditPostView isDarkMode={isDarkMode} />} />
                            <Route path="users" element={<UserManagementView isDarkMode={isDarkMode} />} />
                            <Route path="permissions" element={<PermissionsView isDarkMode={isDarkMode} />} />
                            <Route path="settings" element={<SystemSettingsView isDarkMode={isDarkMode} user={user} notification={notification} setNotification={setNotification} onGameChanged={loadGameList} />} />
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
                    className={`${inputClass} font-mono text-sm leading-6 min-h-[520px]`}
                    placeholder="在此粘贴或输入 Markdown 内容…"
                />
                <div className="text-xs text-gray-500">提示：图片上传会自动将 Markdown 链接插入光标处，资源目录自动生成。</div>
            </div>
        </div>
    );
}

export { AdminPanel };
