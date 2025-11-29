import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link, Routes, Route, useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {
    Code, User, MessageSquare, Share2, X, Menu, ChevronRight,
    Search, LogIn, LogOut, Settings, Eye, Github, Twitter,
    BarChart3, Filter, Tag, AlertTriangle, MessageCircle,
    Layers, Hash, Clock, FileText, Terminal, Zap, Sparkles,
    ArrowUpRight, Grid, List, Activity, ChevronLeft, Shield, Lock, Users,
    Home, TrendingUp, Edit, Send, Moon, Sun, Upload, ArrowUp, BookOpen, CheckCircle, PenTool, FolderPlus,
    RefreshCw, Plus, Trash2, Save, ImagePlus
} from 'lucide-react';
import {
    updateBroadcast,
    adminFetchTags,
    adminCreateTag,
    adminUpdateTag,
    adminDeleteTag,
    adminFetchCategories,
    adminCreateCategory,
    adminUpdateCategory,
    adminDeleteCategory,
    adminFetchPosts,
    adminFetchPostDetail,
    adminFetchUsers,
    adminFetchUserDetail,
    adminCreateUser,
    adminUpdateUser,
    adminDeleteUser,
    adminFetchRoles,
    adminFetchAnalyticsSummary,
    adminDeleteMyAnalyticsLogs,
    adminFetchPermissionMatrix,
    adminUpdateRolePermissions,
    fetchCategories,
    fetchTags,
    createComment,
    adminFetchComments,
    adminUpdateComment,
    adminDeleteComment,
    uploadAvatar,
    uploadPostAssets,
    reservePostAssetsFolder,
    createPost,
    updatePost
} from '../../api';
import PopButton from '../../components/common/PopButton.jsx';
import {useLayoutOffsets} from '../../contexts/LayoutOffsetContext.jsx';
import {usePermissionContext} from '../../contexts/PermissionContext.jsx';
import ThemeColorSelector, {DEFAULT_THEME_COLOR} from '../common/ThemeColorSelector.jsx';
import {useTimedNotice, AdminNoticeBar} from '../common/notices.jsx';
import AdminProfile from '../../pages/admin/Profile';
import {
    THEME,
    ROLES,
    SITE_STATS,
    MOCK_USER,
    PAGE_SIZE,
    TAG_PREVIEW_COUNT,
    AnalyticsSummaryContext,
    useAdminAnalytics,
    PermissionNotice
} from '../shared/designSystem.jsx';
import {useBlog} from "../../hooks/useBlogData.jsx";

// 4.1 Sub-Component: Dashboard View
const DashboardView = ({isDarkMode, user}) => {
    const {summary, loading, error, reload} = useAdminAnalytics();
    const overview = summary?.overview;
    const dailyTrends = summary?.dailyTrends || [];
    const trafficSources = summary?.trafficSources || [];
    const topPosts = (summary?.topPosts || []).slice(0, 5);
    const recentVisits = (summary?.recentVisits || []).slice(0, 6);
    const rangeLabel = overview?.rangeLabel || '最近14天';
    const rangeOptions = [7, 14, 30];
    const logRangePresets = [7, 14, 30];
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const [visitLogs, setVisitLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState('');
    const [logPage, setLogPage] = useState(1);
    const [logSize, setLogSize] = useState(10);
    const [logTotal, setLogTotal] = useState(0);
    const [startInput, setStartInput] = useState('');
    const [endInput, setEndInput] = useState('');
    const [selectedLogDays, setSelectedLogDays] = useState(7);
    const [activeLogRange, setActiveLogRange] = useState({start: '', end: '', days: 7});
    const [clearing, setClearing] = useState(false);
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const border = isDarkMode ? 'border border-gray-700' : 'border border-gray-200';
    const textPrimary = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';

    const formatNumber = (value, fallback = '--') => {
        if (typeof value === 'number') return value.toLocaleString();
        return fallback;
    };

    const Card = ({title, value, icon: Icon, color, desc}) => (
        <div className={`${surface} ${border} p-5 rounded-xl shadow-lg`}>
            <div className="flex items-center justify-between">
                <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${textMuted}`}>{title}</p>
                {Icon && <Icon size={20} className={color}/>}
            </div>
            <div className="mt-3 text-3xl font-black">{value}</div>
            {desc && <p className={`text-xs mt-1 ${textMuted}`}>{desc}</p>}
        </div>
    );

    const Sparkline = ({data}) => {
        if (!data.length) {
            return <p className={`text-sm ${textMuted}`}>暂无数据</p>;
        }
        const max = Math.max(...data.map((item) => item.views), 1);
        const points = data.map((item, index) => {
            const x = (index / Math.max(data.length - 1, 1)) * 100;
            const y = 100 - (item.views / max) * 100;
            return `${x},${y}`;
        }).join(' ');
        return (
            <svg viewBox="0 0 100 100" className="w-full h-32">
                <polyline
                    fill="none"
                    stroke={isDarkMode ? '#FFD700' : '#FF0080'}
                    strokeWidth="3"
                    points={points}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>
        );
    };

    const fetchVisitLogs = useCallback(async () => {
        setLogsLoading(true);
        setLogsError('');
        try {
            const params = {page: logPage, size: logSize};
            if (activeLogRange.start) params.startDate = activeLogRange.start;
            if (activeLogRange.end) params.endDate = activeLogRange.end;
            if (!activeLogRange.start && !activeLogRange.end && activeLogRange.days) {
                params.days = activeLogRange.days;
            }
            const res = await adminFetchVisitLogs(params);
            const data = res.data || res;
            setVisitLogs(data.records || []);
            setLogTotal(data.total || 0);
        } catch (err) {
            setLogsError(err.message || '加载访问日志失败');
        } finally {
            setLogsLoading(false);
        }
    }, [logPage, logSize, activeLogRange]);

    useEffect(() => {
        fetchVisitLogs();
    }, [fetchVisitLogs]);

    const totalLogPages = Math.max(1, Math.ceil((logTotal || 0) / logSize));

    const handleQuickLogRange = (days) => {
        setSelectedLogDays(days);
        setStartInput('');
        setEndInput('');
        setActiveLogRange({start: '', end: '', days});
        setLogPage(1);
    };

    const handleApplyCustomRange = () => {
        const nextStart = startInput;
        const nextEnd = endInput;
        if (!nextStart && !nextEnd) {
            const fallback = selectedLogDays || 7;
            setActiveLogRange({start: '', end: '', days: fallback});
            setSelectedLogDays(fallback);
        } else {
            setActiveLogRange({start: nextStart, end: nextEnd, days: null});
            setSelectedLogDays(null);
        }
        setLogPage(1);
    };

    const handleClearLogs = async () => {
        if (!isSuperAdmin) return;
        if (!window.confirm('确定要删除你在本站的所有访问日志吗？')) return;
        setClearing(true);
        try {
            await adminDeleteMyAnalyticsLogs();
            fetchVisitLogs();
        } catch (err) {
            alert(err.message || '清理失败，请稍后重试');
        } finally {
            setClearing(false);
        }
    };

    const renderLogReferrer = (referrer) => {
        if (!referrer) return 'Direct / None';
        if (/^https?:/i.test(referrer)) {
            return (
                <a className="text-indigo-500 hover:underline" href={referrer} target="_blank" rel="noopener noreferrer">
                    {referrer}
                </a>
            );
        }
        return referrer;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2">
                        <Activity/> 仪表盘概览
                    </h2>
                    <p className={`text-sm ${textMuted}`}>{rangeLabel}，实时同步访客、文章与评论概况</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {rangeOptions.map((size) => (
                        <button
                            key={`range-${size}`}
                            type="button"
                            onClick={() => reload(size)}
                            className={`px-3 py-1 text-sm font-bold border-2 border-black rounded-full transition ${rangeDays === size ? 'bg-[#FF0080] text-white' : 'bg-white text-black hover:bg-[#FFD700]'}`}
                        >
                            最近{size}天
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => reload(rangeDays)}
                        className="px-3 py-1 text-sm font-bold border-2 border-black rounded-full hover:bg-black hover:text-white transition"
                    >
                        手动刷新
                    </button>
                    {error && <span className="text-sm text-red-500">{error}</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card title="累计浏览" value={formatNumber(overview?.totalViews)} icon={BarChart3} color="text-indigo-500"
                      desc="含所有文章与页面"/>
                <Card title="区间 PV" value={formatNumber(overview?.periodViews)} icon={Activity}
                      color="text-pink-500" desc={rangeLabel}/>
                <Card title="独立访客" value={formatNumber(overview?.uniqueVisitors)} icon={Users}
                      color="text-green-500"
                      desc="按 IP 去重"/>
                <Card title="登录访问" value={formatNumber(overview?.loggedInViews)} icon={Shield}
                      color="text-yellow-500"
                      desc="含后台/前台已登录用户"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card title="文章总数" value={SITE_STATS.posts} icon={FileText} color="text-slate-500"
                      desc={`最后更新：${SITE_STATS.lastUpdated || '—'}`}/>
                <Card title="评论总数" value={SITE_STATS.comments} icon={MessageSquare} color="text-emerald-500"
                      desc="包含前台所有回复"/>
                <Card title="日均 PV" value={overview ? (overview.avgViewsPerDay?.toFixed(1) || '0.0') : '--'}
                      icon={TrendingUp} color="text-purple-500" desc={rangeLabel}/>
                <Card title="区间评论" value={formatNumber(SITE_STATS.comments)} icon={MessageCircle}
                      color="text-orange-500"
                      desc="历史累计"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-2 ${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className={`text-xl font-bold ${textPrimary}`}>访客走势</h3>
                            <p className={`text-xs ${textMuted}`}>{rangeLabel} PV & UV</p>
                        </div>
                        <span className="text-xs font-mono">{dailyTrends.length} 天</span>
                    </div>
                    <div className="mt-4">
                        <Sparkline data={dailyTrends}/>
                    </div>
                    {dailyTrends.length > 0 && (
                        <div className="flex flex-wrap gap-4 text-xs mt-2">
                            <span>最高日 PV：{formatNumber(Math.max(...dailyTrends.map(d => d.views), 0))}</span>
                            <span>最近一天 UV：{formatNumber(dailyTrends[dailyTrends.length - 1].visitors)}</span>
                        </div>
                    )}
                </div>
                <div className={`${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                    <h3 className={`text-xl font-bold ${textPrimary}`}>流量来源</h3>
                    <p className={`text-xs ${textMuted} mb-4`}>来自 `analytics_traffic_sources`</p>
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
                                            style={{width: `${Math.min(source.value, 100)}%`}}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                    <div className="flex items-center justify-between">
                        <h3 className={`text-xl font-bold ${textPrimary}`}>热门文章</h3>
                        <span className={`text-xs ${textMuted}`}>{rangeLabel}</span>
                    </div>
                    {topPosts.length === 0 ? (
                        <p className={`text-sm mt-3 ${textMuted}`}>暂无文章访问记录</p>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {topPosts.map((post, index) => (
                                <div key={post.postId || index}
                                     className="flex items-center justify-between text-sm border-b border-dashed border-gray-200 dark:border-gray-700 pb-2 last:border-none last:pb-0">
                                    <div>
                                        <p className="font-semibold">{post.title || '未命名文章'}</p>
                                        {post.slug && (
                                            <p className={`text-xs ${textMuted}`}>Slug：{post.slug}</p>
                                        )}
                                    </div>
                                    <span className="text-lg font-black">{formatNumber(post.views)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className={`${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                    <div className="flex items-center justify-between">
                        <h3 className={`text-xl font-bold ${textPrimary}`}>最新访问</h3>
                        <span className={`text-xs ${textMuted}`}>展示最近 6 条 PV</span>
                    </div>
                    {recentVisits.length === 0 ? (
                        <p className={`text-sm mt-3 ${textMuted}`}>暂无访问记录</p>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {recentVisits.map((visit) => (
                                <div key={visit.id} className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between text-sm">
                                        <p className="font-semibold">{visit.title || '未命名页面'}</p>
                                        {visit.loggedIn ? (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-600">已登录</span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">访客</span>
                                        )}
                                    </div>
                                    <div className={`text-xs mt-2 ${textMuted} flex flex-wrap gap-3`}>
                                        <span>IP：{visit.ip || '-'}</span>
                                        <span>时间：{visit.time || '-'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={`${surface} ${border} rounded-2xl p-6 shadow-xl`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className={`text-xl font-bold ${textPrimary}`}>实时访问日志</h3>
                        <p className={`text-xs ${textMuted}`}>可选择最近区间或自定义日期，查看全部访客轨迹</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {logRangePresets.map((size) => (
                            <button
                                key={`log-range-${size}`}
                                type="button"
                                onClick={() => handleQuickLogRange(size)}
                                className={`px-3 py-1 text-xs font-bold border rounded-full ${!activeLogRange.start && !activeLogRange.end && selectedLogDays === size ? 'bg-[#FF0080] text-white border-[#FF0080]' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                            >
                                最近{size}天
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => fetchVisitLogs()}
                            className="px-3 py-1 text-xs font-bold border border-black rounded-full hover:bg-[#FFD700]"
                        >
                            刷新日志
                        </button>
                        {isSuperAdmin && (
                            <button
                                type="button"
                                onClick={handleClearLogs}
                                disabled={clearing}
                                className="px-3 py-1 text-xs font-bold border-2 border-red-600 text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50"
                            >
                                {clearing ? '清理中...' : '清理我的日志'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                    <label className="flex items-center gap-2">
                        <span>开始日期</span>
                        <input
                            type="date"
                            value={startInput}
                            onChange={(e) => setStartInput(e.target.value)}
                            className={`border rounded px-2 py-1 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                        />
                    </label>
                    <label className="flex items-center gap-2">
                        <span>结束日期</span>
                        <input
                            type="date"
                            value={endInput}
                            onChange={(e) => setEndInput(e.target.value)}
                            className={`border rounded px-2 py-1 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                        />
                    </label>
                    <button
                        type="button"
                        onClick={handleApplyCustomRange}
                        className="px-3 py-1 font-bold border border-black rounded-full hover:bg-black hover:text-white transition"
                    >
                        应用筛选
                    </button>
                    <select
                        value={logSize}
                        onChange={(e) => {
                            setLogSize(Number(e.target.value));
                            setLogPage(1);
                        }}
                        className={`px-2 py-1 border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                    >
                        {[10, 20, 30, 50].map((size) => (
                            <option key={`log-size-${size}`} value={size}>{size} 条/页</option>
                        ))}
                    </select>
                </div>
                {logsError && <p className="text-sm text-red-500 mt-2">{logsError}</p>}
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-700">
                            <th className="py-2 pr-4">访客</th>
                            <th className="py-2 pr-4">IP</th>
                            <th className="py-2 pr-4">地域</th>
                            <th className="py-2 pr-4">页面</th>
                            <th className="py-2 pr-4">来源</th>
                            <th className="py-2 pr-4">时间</th>
                            <th className="py-2 pr-4">终端</th>
                        </tr>
                        </thead>
                        <tbody>
                        {logsLoading ? (
                            <tr>
                                <td colSpan={7} className="py-6 text-center text-gray-500">日志加载中...</td>
                            </tr>
                        ) : visitLogs.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-6 text-center text-gray-500">暂无日志</td>
                            </tr>
                        ) : (
                            visitLogs.map((visit) => (
                                <tr key={`visit-${visit.id || visit.time}`} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-3 pr-4 font-semibold">
                                        {visit.loggedIn ? (visit.userName || '已登录用户') : '访客'}
                                    </td>
                                    <td className="py-3 pr-4">{visit.ip || '-'}</td>
                                    <td className="py-3 pr-4">{visit.geo || '未知'}</td>
                                    <td className="py-3 pr-4">
                                        {visit.slug ? (
                                            <a className="text-indigo-500 hover:underline" href={`/article/${visit.slug}`} target="_blank" rel="noopener noreferrer">
                                                {visit.title || visit.slug}
                                            </a>
                                        ) : (
                                            visit.title || '未命名页面'
                                        )}
                                    </td>
                                    <td className="py-3 pr-4">{renderLogReferrer(visit.referrer)}</td>
                                    <td className="py-3 pr-4">{visit.time || '-'}</td>
                                    <td className="py-3 pr-4 truncate max-w-[180px]" title={visit.userAgent || ''}>
                                        {visit.userAgent || '--'}
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <div>共 {logTotal || 0} 条 · 第 {logPage}/{totalLogPages} 页</div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                            disabled={logPage === 1}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            type="button"
                            onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                            disabled={logPage === totalLogPages}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4.3 Sub-Component: Create New Post
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
                                        <CheckCircle size={14}/> {markdownMessage || markdownFileName}
                                    </div>
                                )}
                                {imageUploadMessage && (
                                    <div className="text-indigo-500 flex items-center gap-1">
                                        <ImagePlus size={14}/> {imageUploadMessage}
                                    </div>
                                )}
                            </div>
                        )}
                        <textarea
                            ref={markdownEditorRef}
                            className={`${inputClass} min-h-[420px] font-mono text-sm`}
                            value={mdContent}
                            onChange={(e) => setMdContent(e.target.value)}
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
                </div>

                <div className="space-y-6">
                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 1</p>
                                <h3 className="font-semibold flex items-center gap-2"><FolderPlus size={16}/> 资源标识
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={handleFolderReserve}
                                className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                            >
                                <RefreshCw size={14}/> 重新生成
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
                            onChange={setThemeColor}
                            inputClass={inputClass}
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 2</p>
                        <h3 className="font-semibold flex items-center gap-2"><Layers size={16}/> 选择二级分类</h3>
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
                            {secondLevelCategories.map((child) => {
                                const childId = Number(child.id);
                                return (
                                    <button
                                        key={child.id}
                                        onClick={() => setSelectedCategoryId(childId)}
                                        className={`p-3 rounded-xl border text-left text-sm ${selectedCategoryId === childId ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 text-pink-500' : 'border-gray-200 dark:border-gray-700'}`}
                                    >
                                        {child.label}
                                    </button>
                                )
                            })}
                        </div>
                        {!secondLevelCategories.length && (
                            <p className="text-xs text-amber-500 flex items-center gap-1">
                                <AlertTriangle size={14}/> 当前父级暂无二级分类，请先到分类管理中创建。
                            </p>
                        )}
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 3</p>
                        <h3 className="font-semibold flex items-center gap-2"><Tag size={16}/> 选择标签</h3>
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
                                <AlertTriangle size={14}/> 至少选择一个标签，用于站内检索。
                            </p>
                        )}
                    </div>

                    <div
                        className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                        <div className="flex items-center gap-2">
                            <Send/> <span>发布设置</span>
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


const TaxonomyView = ({isDarkMode}) => {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({name: "", slug: "", description: ""});
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({name: "", slug: "", description: ""});
    const [saving, setSaving] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [total, setTotal] = useState(0);

    const loadTags = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminFetchTags({keyword, page, size});
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
            setForm({name: "", slug: "", description: ""});
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
        setEditForm({name: "", slug: "", description: ""});
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
                    <Tag className="text-[#FF0080]"/>
                    <h2 className="text-2xl font-bold">新增标签</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">名称</label>
                        <input
                            className={inputClass}
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({...prev, name: e.target.value}))}
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
                            onChange={(e) => setForm((prev) => ({...prev, slug: e.target.value}))}
                            placeholder="例如：spring-cloud"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">描述</label>
                        <input
                            className={inputClass}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({...prev, description: e.target.value}))}
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
                                <RefreshCw size={16}/> 查询
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
                                                    <Save size={14}/> 保存
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
                                                    <Edit size={14}/> 编辑
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tag.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1 border-2 border-red-500 text-red-600 font-bold text-xs"
                                                >
                                                    <Trash2 size={14}/> 删除
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

const CategoriesView = ({isDarkMode}) => {
    const [categories, setCategories] = useState([]);
    const [parentOptions, setParentOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({name: "", slug: "", description: "", parentId: "", sortOrder: ""});
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({name: "", slug: "", description: "", parentId: "", sortOrder: ""});
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
            setParentOptions(data.map((item) => ({id: item.id, label: item.label})));
        } catch (err) {
            console.warn("load parent categories failed", err);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {keyword, page, size};
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
            setForm({name: "", slug: "", description: "", parentId: "", sortOrder: ""});
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
        setEditForm({name: "", slug: "", description: "", parentId: "", sortOrder: ""});
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
                    <Layers className="text-[#6366F1]"/>
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
                            onChange={(e) => setForm((prev) => ({...prev, name: e.target.value}))}
                            placeholder="例如：硬核编程"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">别名 / Slug (可选)</label>
                        <input
                            className={inputClass}
                            value={form.slug}
                            onChange={(e) => setForm((prev) => ({...prev, slug: e.target.value}))}
                            placeholder="例如：hardcore-dev"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wide text-gray-500">父级分类</label>
                        <select
                            className={inputClass}
                            value={form.parentId}
                            onChange={(e) => setForm((prev) => ({...prev, parentId: e.target.value}))}
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
                            onChange={(e) => setForm((prev) => ({...prev, sortOrder: e.target.value}))}
                            placeholder="数字越小越靠前"
                        />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
                        <label className="text-xs uppercase tracking-wide text-gray-500">描述</label>
                        <input
                            className={inputClass}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({...prev, description: e.target.value}))}
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
                                <RefreshCw size={16}/> 查询
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
                                                    <Save size={14}/> 保存
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
                                                    <Edit size={14}/> 编辑
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(category.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1 border-2 border-red-500 text-red-600 font-bold text-xs"
                                                >
                                                    <Trash2 size={14}/> 删除
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


const EditPostView = ({isDarkMode}) => {
    const navigate = useNavigate();
    const {categories} = useBlog();
    const {hasPermission, loading: permLoading} = usePermissionContext();
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
    const [assetsFolder, setAssetsFolder] = useState('');
    const [saving, setSaving] = useState(false);
    const [submitNotice, setSubmitNotice] = useState('');
    const [submitError, setSubmitError] = useState('');
    const markdownEditorRef = useRef(null);
    const markdownFileInputRef = useRef(null);
    const inlineImageInputRef = useRef(null);
    const [postMeta, setPostMeta] = useState({publishedAt: null});
    const selectorPageSize = 8;
    const {
        notice: editNotice,
        showNotice: showEditNotice,
        hideNotice: hideEditNotice
    } = useTimedNotice(4200);

    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    const inputClass = `w-full p-3 border-2 rounded-md transition-all ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' : 'bg-white border-gray-300 text-black focus:border-indigo-500'}`;
    const statusOptions = [
        {value: 'DRAFT', label: '草稿'},
        {value: 'PUBLISHED', label: '已发布'},
        {value: 'ARCHIVED', label: '已归档'},
    ];

    useEffect(() => {
        const paramId = searchParams.get('postId');
        if (paramId) {
            const numeric = Number(paramId);
            if (!Number.isNaN(numeric) && numeric !== selectedPostId) {
                setSelectedPostId(numeric);
            }
        }
    }, [searchParams, selectedPostId]);

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
            const res = await adminFetchPosts({keyword: selectorKeyword, page: selectorPage, size: selectorPageSize});
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
            setForm({
                title: data.title || '',
                slug: data.slug || '',
                excerpt: data.excerpt || '',
                mdContent: data.contentMd || '',
                themeColor: data.themeColor || '',
                status: data.status || 'DRAFT'
            });
            setSelectedCategoryId(data.categoryId ? Number(data.categoryId) : null);
            setSelectedParentId(data.parentCategoryId ? Number(data.parentCategoryId) : null);
            setSelectedTags((data.tagIds || []).map((tid) => Number(tid)));
            setAssetsFolder(data.slug || '');
            setPostMeta({publishedAt: data.publishedAt || null});
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
    }, []);

    useEffect(() => {
        if (selectedPostId) {
            loadPostDetail(selectedPostId);
            setSearchParams({postId: selectedPostId});
        }
    }, [selectedPostId, loadPostDetail, setSearchParams]);

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

    const insertImagesAtCursor = useCallback((urls = []) => {
        if (!urls.length) return;
        const snippet =
            urls.map((url, index) => `![${form.title || `图片${index + 1}`}](${url})`).join('\n') + '\n';
        setForm((prev) => {
            const current = prev.mdContent || '';
            const textarea = markdownEditorRef.current;
            if (!textarea) {
                const prefix = current.endsWith('\n') || current.length === 0 ? current : `${current}\n`;
                return {...prev, mdContent: `${prefix}${snippet}`};
            }
            const start = textarea.selectionStart ?? current.length;
            const end = textarea.selectionEnd ?? start;
            const before = current.slice(0, start);
            const after = current.slice(end);
            const normalizedBefore = before && !before.endsWith('\n') ? `${before}\n` : before;
            const normalizedAfter = after.startsWith('\n') || after.length === 0 ? after : `\n${after}`;
            const nextContent = `${normalizedBefore}${snippet}${normalizedAfter}`;
            const cursorPos = (normalizedBefore + snippet).length;
            requestAnimationFrame(() => {
                const el = markdownEditorRef.current;
                if (el) {
                    el.focus();
                    el.selectionStart = cursorPos;
                    el.selectionEnd = cursorPos;
                }
            });
            return {...prev, mdContent: nextContent};
        });
    }, [form.title]);

    const handleMarkdownUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const textContent = await file.text();
            setForm((prev) => ({...prev, mdContent: textContent}));
            setMarkdownFileName(file.name);
            setMarkdownMessage(`已加载 ${file.name}`);
            if (!form.title.trim()) {
                const inferred = file.name.replace(/\.(md|markdown|txt)$/i, '');
                setForm((prev) => ({...prev, title: prev.title || inferred}));
            }
            if (!form.excerpt.trim()) {
                const plain = textContent.replace(/[#>*_`-]/g, '').replace(/\s+/g, ' ').trim();
                setForm((prev) => ({...prev, excerpt: prev.excerpt || plain.slice(0, 160)}));
            }
        } catch (error) {
            setMarkdownMessage(error.message || '读取 Markdown 失败');
        } finally {
            event.target.value = null;
        }
    };

    const handleInlineImageUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        setUploadingImages(true);
        setImageUploadMessage('图片上传中...');
        try {
            const folder = await ensureAssetsFolder();
            const res = await uploadPostAssets(files, folder);
            const data = res.data || res;
            const urls = data?.urls || [];
            if (urls.length) {
                insertImagesAtCursor(urls);
                setImageUploadMessage('已插入图片链接');
            } else {
                setImageUploadMessage('上传成功');
            }
        } catch (error) {
            setImageUploadMessage(error.message || '图片上传失败');
        } finally {
            setUploadingImages(false);
            if (event?.target) {
                event.target.value = null;
            }
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
                contentMd: form.mdContent,
                themeColor: form.themeColor?.trim() || undefined,
                categoryId: selectedCategoryId,
                tagIds: selectedTags,
                status: form.status,
            };
            const res = await updatePost(selectedPostId, payload);
            const data = res.data || res;
            setSubmitNotice(`已保存（ID: ${data?.summary?.id || selectedPostId}）`);
            setPostMeta((prev) => ({...prev, publishedAt: data?.summary?.date || prev.publishedAt}));
        } catch (error) {
            setSubmitError(error.message || '保存失败');
        } finally {
            setSaving(false);
        }
    };

    const resetSelection = () => {
        setSelectedPostId(null);
        setSearchParams({});
        setForm({title: '', slug: '', excerpt: '', mdContent: '', themeColor: '', status: 'DRAFT'});
        setSelectedCategoryId(null);
        setSelectedParentId(null);
        setSelectedTags([]);
        setAssetsFolder('');
        setSubmitNotice('');
        setSubmitError('');
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
                <AdminNoticeBar notice={editNotice} onClose={hideEditNotice}/>
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
            <AdminNoticeBar notice={editNotice} onClose={hideEditNotice}/>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Admin</p>
                    <h2 className="text-3xl font-black italic text-pink-500">编辑文章</h2>
                    <p className="text-sm text-gray-500 mt-1">ID：{selectedPostId}，上次发布时间：{postMeta.publishedAt ? new Date(postMeta.publishedAt).toLocaleString() : '未发布'}</p>
                </div>
                <div className="flex gap-3">
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
                                onChange={(e) => setForm((prev) => ({...prev, title: e.target.value}))}
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
                                        <Upload size={16}/> 上传 .md
                                    </button>
                                    <button
                                        type="button"
                                        disabled={uploadingImages}
                                        className={`text-sm flex items-center gap-1 ${uploadingImages ? 'text-gray-400 cursor-not-allowed' : 'text-pink-500 hover:text-pink-400'}`}
                                        onClick={() => inlineImageInputRef.current?.click()}
                                    >
                                        <ImagePlus size={16}/> {uploadingImages ? '插图处理中' : '插入图片'}
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
                                            <CheckCircle size={14}/> {markdownMessage || markdownFileName}
                                        </div>
                                    )}
                                    {imageUploadMessage && (
                                        <div className="text-indigo-500 flex items-center gap-1">
                                            <ImagePlus size={14}/> {imageUploadMessage}
                                        </div>
                                    )}
                                </div>
                            )}
                            <textarea
                                ref={markdownEditorRef}
                                className={`${inputClass} min-h-[420px] font-mono text-sm`}
                                value={form.mdContent}
                                onChange={(e) => setForm((prev) => ({...prev, mdContent: e.target.value}))}
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
                                onChange={(e) => setForm((prev) => ({...prev, excerpt: e.target.value}))}
                                placeholder="用于首页卡片展示，若留空则自动截取正文"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">Slug /
                                    资源目录</label>
                                <input
                                    className={inputClass}
                                    value={form.slug}
                                    onChange={(e) => setForm((prev) => ({...prev, slug: e.target.value}))}
                                    placeholder="文章 slug"
                                />
                                <ThemeColorSelector
                                    value={form.themeColor || ''}
                                    onChange={(next) => setForm((prev) => ({...prev, themeColor: next}))}
                                    inputClass={inputClass}
                                    isDarkMode={isDarkMode}
                                />
                                <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">状态</label>
                                <select
                                    className={inputClass}
                                    value={form.status}
                                    onChange={(e) => setForm((prev) => ({...prev, status: e.target.value}))}
                                >
                                    {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 1</p>
                            <h3 className="font-semibold flex items-center gap-2"><FolderPlus size={16}/> 选择二级分类
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
                                {secondLevelCategories.map((child) => {
                                    const childId = Number(child.id);
                                    return (
                                        <button
                                            key={child.id}
                                            onClick={() => setSelectedCategoryId(childId)}
                                            className={`p-3 rounded-xl border text-left text-sm ${selectedCategoryId === childId ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 text-pink-500' : 'border-gray-200 dark:border-gray-700'}`}
                                        >
                                            {child.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {!secondLevelCategories.length && (
                                <p className="text-xs text-amber-500 flex items-center gap-1">
                                    <AlertTriangle size={14}/> 当前父级暂无二级分类，请先到分类管理中创建。
                                </p>
                            )}
                        </div>

                        <div
                            className={`${surface} p-6 rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4`}>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Step 2</p>
                            <h3 className="font-semibold flex items-center gap-2"><Tag size={16}/> 选择标签</h3>
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


const PostsView = ({isDarkMode}) => {
    const navigate = useNavigate();
    const {hasPermission} = usePermissionContext();
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
                result.push({id: child.id, label: `${root.label}/${child.label}`});
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
            const params = {keyword, page, size};
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

    const STATUS_LABELS = {DRAFT: '草稿', PUBLISHED: '已发布', ARCHIVED: '已归档'};
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
                            <RefreshCw size={16}/> 刷新
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
                                                <Edit size={14}/> 打开编辑页
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
    {value: 'ALL', label: '全部状态'},
    {value: 'APPROVED', label: '已通过'},
    {value: 'PENDING', label: '待审核'},
    {value: 'REJECTED', label: '已拒绝'},
    {value: 'SPAM', label: '垃圾'},
];
const REVIEW_STATUS_OPTIONS = COMMENT_STATUS_OPTIONS.filter((item) => item.value !== 'ALL');

const CommentsAdminView = ({isDarkMode}) => {
    const cardBg = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';
    const inputClass = `w-full px-3 py-2 border-2 rounded-md text-sm outline-none transition ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white focus:border-indigo-400' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
    const statsBg = isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-800';
    const {hasPermission, loading: permLoading} = usePermissionContext();
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

    const [form, setForm] = useState({postId: '', authorName: '', content: '', parentId: ''});
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
            setForm((prev) => ({...prev, postId: prev.postId || String(postOptions[0].id)}));
        }
    }, [postOptions, form.postId]);

    useEffect(() => {
        if (selectedPostId !== 'all') {
            setForm((prev) => ({...prev, postId: String(selectedPostId)}));
        }
    }, [selectedPostId]);

    useEffect(() => {
        if (replyTarget && form.postId && Number(form.postId) !== replyTarget.postId) {
            setReplyTarget(null);
            setForm((prev) => ({...prev, parentId: ''}));
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
        return {scope, status};
    }, [normalizedPostId, statusFilter]);

    const renderStatusBadge = (status) => {
        const map = {
            APPROVED: {label: '已通过', className: 'bg-emerald-100 text-emerald-700'},
            PENDING: {label: '待审核', className: 'bg-amber-100 text-amber-700'},
            REJECTED: {label: '已拒绝', className: 'bg-red-100 text-red-600'},
            SPAM: {label: '垃圾', className: 'bg-gray-200 text-gray-700'},
        };
        const info = map[status] || {label: status || '未知', className: 'bg-gray-200 text-gray-700'};
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
            setForm((prev) => ({...prev, content: '', parentId: ''}));
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
        setForm((prev) => ({...prev, postId: String(comment.postId), parentId: String(comment.id)}));
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
                        <RefreshCw size={14}/> 刷新
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
                        <MessageSquare size={18}/> 发布后台回复
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
                                    onChange={(e) => setForm((prev) => ({...prev, postId: e.target.value}))}
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
                                    onChange={(e) => setForm((prev) => ({...prev, authorName: e.target.value}))}
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
                                        setForm((prev) => ({...prev, parentId: ''}));
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
                                onChange={(e) => setForm((prev) => ({...prev, content: e.target.value}))}
                                placeholder="请输入要发布的评论内容..."
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setForm({postId: '', authorName: '', content: '', parentId: ''});
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

const UserManagementView = ({isDarkMode}) => {
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
    const emptyForm = {
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
    };
    const [form, setForm] = useState(emptyForm);
    const [meta, setMeta] = useState({id: null, createdAt: null, lastLoginAt: null});
    const [saving, setSaving] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const formRef = useRef(null);
    const avatarInputRef = useRef(null);
    const usersFetchTokenRef = useRef(0);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const scrollFormIntoView = useCallback(() => {
        requestAnimationFrame(() => {
            formRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
        });
    }, []);

    const cardBg = isDarkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200";
    const inputClass = `w-full px-3 py-2 border-2 rounded font-medium outline-none transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white focus:border-indigo-400' : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'}`;
    const STATUS_OPTIONS = [
        {value: 'ACTIVE', label: '正常'},
        {value: 'DISABLED', label: '已禁用'},
    ];

    const getDefaultRoleCode = (roleList) => {
        if (!Array.isArray(roleList) || roleList.length === 0) return 'USER';
        const preferred = roleList.find((role) => (role.code || '').toUpperCase() === 'USER');
        return preferred?.code || roleList[0].code;
    };

    const resolveMediaUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        if (!path.startsWith('/')) return `http://localhost:8080/${path}`;
        return `http://localhost:8080${path}`;
    };
    const resolveUserAvatar = (user) => resolveMediaUrl(user?.avatar || user?.avatarUrl || user?.avatar_url);

    const loadRoles = useCallback(async () => {
        try {
            const res = await adminFetchRoles();
            const data = res.data || res || [];
            setRoles(data);
            const defaultRole = getDefaultRoleCode(data);
            setForm((prev) => ({...prev, roleCode: prev.roleCode || defaultRole}));
        } catch (err) {
            setFeedback({type: 'error', text: err.message || '无法加载角色列表'});
        }
    }, []);

    const loadUsers = useCallback(async () => {
        const token = ++usersFetchTokenRef.current;
        setLoading(true);
        try {
            const params = {page, size};
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
                setFeedback({type: 'error', text: err.message || '加载用户失败'});
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
        setMeta({id: null, createdAt: null, lastLoginAt: null});
        setSelectedUserId(null);
        setFormMode('create');
        setFeedback(null);
        scrollFormIntoView();
    }, [roles, scrollFormIntoView]);

    const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setForm((prev) => ({...prev, [name]: value}));
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setFeedback({type: 'error', text: '请上传图片文件'});
            event.target.value = '';
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setFeedback({type: 'error', text: '头像需小于 2MB'});
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
            setForm((prev) => ({...prev, avatarUrl: newPath}));
            setFeedback({type: 'success', text: '头像已更新'});
        } catch (err) {
            setFeedback({type: 'error', text: err.message || '头像上传失败'});
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
            setMeta({id: data.id, createdAt: data.createdAt, lastLoginAt: data.lastLoginAt});
            setFeedback(null);
            requestAnimationFrame(() => {
                formRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
            });
        } catch (err) {
            setFeedback({type: 'error', text: err.message || '加载用户详情失败'});
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
            setFeedback({type: 'success', text: '用户已删除'});
            loadUsers();
        } catch (err) {
            setFeedback({type: 'error', text: err.message || '删除失败'});
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
                setFeedback({type: 'success', text: '新用户已创建'});
                resetForm();
            } else if (selectedUserId) {
                result = await adminUpdateUser(selectedUserId, payload);
                const data = result.data || result;
                setFeedback({type: 'success', text: '用户资料已更新'});
                setMeta({id: data.id, createdAt: data.createdAt, lastLoginAt: data.lastLoginAt});
                setForm((prev) => ({...prev, password: ''}));
            }
            loadUsers();
        } catch (err) {
            setFeedback({type: 'error', text: err.message || '保存失败'});
        } finally {
            setSaving(false);
        }
    };

    const InfoBadge = ({label, value}) => (
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
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Users size={20}/> 用户列表</h2>
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
                                                         className="w-full h-full object-cover"/>
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
                                         className="w-full h-full object-cover"/>
                                ) : (
                                    <User size={24}/>
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
                                   onChange={handleInputChange} required/>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">显示名</label>
                            <input className={inputClass} name="displayName" value={form.displayName}
                                   onChange={handleInputChange} required/>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">邮箱</label>
                            <input className={inputClass} name="email" value={form.email} onChange={handleInputChange}
                                   type="email"/>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">头衔</label>
                            <input className={inputClass} name="title" value={form.title} onChange={handleInputChange}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">GitHub</label>
                            <input className={inputClass} name="githubUrl" value={form.githubUrl}
                                   onChange={handleInputChange}/>
                        </div>
                        <div>
                            <label
                                className="text-xs font-semibold text-gray-500 dark:text-gray-400">微信二维码地址</label>
                            <input className={inputClass} name="wechatQrUrl" value={form.wechatQrUrl}
                                   onChange={handleInputChange}/>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">个人简介</label>
                        <textarea className={`${inputClass} mt-2`} rows={3} name="bio" value={form.bio}
                                  onChange={handleInputChange}/>
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
                            value={form.password}
                            onChange={handleInputChange}
                            placeholder={formMode === 'create' ? '请设置初始密码' : '若需要重置请输入新密码'}
                        />
                    </div>
                    {formMode === 'edit' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InfoBadge label="用户 ID" value={meta.id}/>
                            <InfoBadge label="创建时间" value={formatDate(meta.createdAt)}/>
                            <InfoBadge label="最近登录" value={formatDate(meta.lastLoginAt)}/>
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
const PermissionsView = ({isDarkMode}) => {
    const surface = isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200';
    const text = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    const [matrix, setMatrix] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [roleSelections, setRoleSelections] = useState({
        ADMIN: new Set(),
        USER: new Set()
    });
    const [savingRole, setSavingRole] = useState(null);
    const {notice, showNotice, hideNotice} = useTimedNotice();
    const {hasPermission} = usePermissionContext();

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
            setRoleSelections({ADMIN: adminSet, USER: userSet});
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
            return {...prev, [role]: next};
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
        {role: 'SUPER_ADMIN', label: '超级管理员', description: '拥有所有模块的最高权限，可配置其余角色权限。'},
        {role: 'ADMIN', label: '管理员', description: '负责内容与互动管理，可通过矩阵勾选需要开放的模块动作。'},
        {role: 'USER', label: '用户', description: '普通登录用户，通常仅开放浏览与发表评论。'}
    ];

    if (!hasPermission('PERMISSION_MANAGE')) {
        return (
            <PermissionNotice
                title="仅超级管理员可访问"
                description="只有超级管理员才能调整权限矩阵，请使用拥有最高权限的账号登录。"
            />
        );
    }

    return (
        <div className="space-y-8">
            <AdminNoticeBar notice={notice} onClose={hideNotice}/>
            <div className="grid gap-4 md:grid-cols-3">
                {roleCards.map((item) => (
                    <div key={item.role} className={`${surface} rounded-2xl shadow-lg p-5`}>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{item.role}</p>
                        <h3 className="text-xl font-bold mt-1">{item.label}</h3>
                        <p className="text-sm text-gray-500 mt-2 leading-6">{item.description}</p>
                    </div>
                ))}
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}
            {loading ? (
                <div className="p-10 text-center text-sm text-gray-500">权限矩阵加载中...</div>
            ) : (
                <div className="space-y-6">
                    {matrix.map((module) => (
                        <div key={module.module} className={`${surface} rounded-2xl shadow-lg`}>
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">{module.label}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{module.description}</p>
                                </div>
                                <div className="text-xs text-gray-500">
                                    可配置：管理员 / 用户
                                </div>
                            </div>
                            <div className="divide-y divide-gray-200 dark:divide-gray-800">
                                {module.actions.map((action) => (
                                    <div key={action.code} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-4 px-6 py-4 text-sm">
                                        <div>
                                            <p className="font-semibold">{action.label}</p>
                                            <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                                        </div>
                                        <label className="flex items-center justify-center gap-2 font-mono text-xs">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 accent-indigo-500"
                                                checked={roleSelections.ADMIN.has(action.code)}
                                                onChange={() => togglePermission('ADMIN', action.code)}
                                            />
                                            管理员
                                        </label>
                                        <label className="flex items-center justify-center gap-2 font-mono text-xs">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 accent-emerald-500"
                                                checked={roleSelections.USER.has(action.code)}
                                                onChange={() => togglePermission('USER', action.code)}
                                            />
                                            用户
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-4">
                <button
                    type="button"
                    onClick={() => handleSaveRole('ADMIN')}
                    disabled={savingRole === 'ADMIN'}
                    className="px-6 py-2 border-2 border-black font-bold bg-[#6366F1] text-white rounded-full hover:-translate-y-0.5 transition disabled:opacity-50"
                >
                    {savingRole === 'ADMIN' ? '保存中...' : '保存管理员权限'}
                </button>
                <button
                    type="button"
                    onClick={() => handleSaveRole('USER')}
                    disabled={savingRole === 'USER'}
                    className="px-6 py-2 border-2 border-black font-bold bg-[#00E096] text-black rounded-full hover:-translate-y-0.5 transition disabled:opacity-50"
                >
                    {savingRole === 'USER' ? '保存中...' : '保存用户权限'}
                </button>
            </div>
        </div>
    );
};


// 4.5 The main Admin Panel structure
// 4.5 The main Admin Panel structure
const AdminPanel = ({setView, notification, setNotification, user, isDarkMode, handleLogout}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [broadcastSaving, setBroadcastSaving] = useState(false);
    const BROADCAST_STYLES = [
        {value: "ALERT", label: "紧急红色告警"},
        {value: "ANNOUNCE", label: "温和庆典公告"}
    ];
    const [analyticsSummary, setAnalyticsSummary] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState('');
    const [analyticsRange, setAnalyticsRange] = useState(14);
    const {loading: permissionLoading, error: permissionError, hasPermission} = usePermissionContext();
    const {headerHeight} = useLayoutOffsets();

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || 'dashboard';
    let activeTab = lastSegment === 'admin' ? 'dashboard' : lastSegment;
    if (pathSegments.includes('posts')) {
        activeTab = 'posts';
    }

    const tabDefinitions = useMemo(() => ([
        {key: 'dashboard', label: '仪表盘', icon: Home, permissions: ['ANALYTICS_VIEW']},
        {key: 'create-post', label: '发布文章', icon: Edit, permissions: ['POST_CREATE']},
        {key: 'posts', label: '文章列表', icon: FileText, permissions: ['POST_VIEW']},
        {key: 'comments', label: '评论管理', icon: MessageCircle, permissions: ['COMMENT_VIEW']},
        {key: 'categories', label: '二级分类', icon: Layers, permissions: ['CATEGORY_MANAGE']},
        {key: 'taxonomy', label: '标签管理', icon: Tag, permissions: ['TAG_MANAGE']},
        {key: 'users', label: '用户管理', icon: Users, permissions: ['USER_MANAGE']},
        {key: 'permissions', label: '权限管理', icon: Shield, permissions: ['PERMISSION_MANAGE']},
        {key: 'settings', label: '系统设置', icon: Settings, permissions: ['PERMISSION_MANAGE']},
        {key: 'profile', label: '个人资料', icon: User, permissions: ['PROFILE_UPDATE']},
    ]), []);

    const tabs = useMemo(() => {
        if (permissionLoading) {
            return tabDefinitions;
        }
        return tabDefinitions.filter((tab) => {
            if (!tab.permissions || tab.permissions.length === 0) return true;
            return tab.permissions.some((code) => hasPermission(code));
        });
    }, [tabDefinitions, permissionLoading, hasPermission]);

    const groupedNav = useMemo(() => {
        const groupDefinitions = [
            {title: '概览与洞察', items: ['dashboard']},
            {title: '内容运营', items: ['create-post', 'posts', 'comments', 'categories', 'taxonomy']},
            {title: '账号与权限', items: ['users', 'permissions', 'profile']},
            {title: '系统配置', items: ['settings']},
        ];
        return groupDefinitions
                .map(group => ({
                    title: group.title,
                    items: group.items
                            .map(key => tabs.find(tab => tab.key === key))
                            .filter(Boolean),
                }))
                .filter(group => group.items.length > 0);
    }, [tabs]);

    useEffect(() => {
        if (permissionLoading) return;
        if (!tabs.length) return;
        if (!tabs.some((tab) => tab.key === activeTab)) {
            const fallback = tabs.find((tab) => tab.key === 'profile') || tabs[0];
            if (!fallback) return;
            const target = fallback.key === 'dashboard' ? '/admin' : `/admin/${fallback.key}`;
            navigate(target, {replace: true});
        }
    }, [permissionLoading, tabs, activeTab, navigate]);

    const activeLabel = tabs.find(t => t.key === activeTab)?.label || tabs[0]?.label || '仪表盘';

    const bgClass = isDarkMode ? THEME.colors.bgDark : 'bg-gray-100';
    const sidebarBg = isDarkMode ? 'bg-gray-900' : 'bg-white';
    const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-800';
    const sidebarBorder = isDarkMode ? 'border-gray-700' : 'border-gray-200';
    const topbarBg = isDarkMode ? 'bg-gray-900' : 'bg-white';

    const fetchAnalyticsSummary = useCallback(async (daysValue) => {
        const targetDays = daysValue || analyticsRange;
        setAnalyticsLoading(true);
        setAnalyticsError('');
        try {
            const res = await adminFetchAnalyticsSummary({days: targetDays});
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

    const reloadAnalytics = useCallback((daysValue) => {
        if (daysValue && daysValue !== analyticsRange) {
            setAnalyticsRange(daysValue);
        } else {
            fetchAnalyticsSummary(daysValue || analyticsRange);
        }
    }, [analyticsRange, fetchAnalyticsSummary]);

    const analyticsContextValue = useMemo(() => ({
        summary: analyticsSummary,
        loading: analyticsLoading,
        error: analyticsError,
        rangeDays: analyticsRange,
        reload: reloadAnalytics
    }), [analyticsSummary, analyticsLoading, analyticsError, analyticsRange, reloadAnalytics]);

    const handleBroadcastToggle = async () => {
        if (broadcastSaving) return;
        const previousState = notification.isOpen;
        const nextState = !previousState;
        const payloadContent = notification.content;

        setNotification((prev) => ({...prev, isOpen: nextState}));
        setBroadcastSaving(true);
        try {
            await updateBroadcast({
                content: payloadContent,
                active: nextState,
                style: notification.style || "ALERT"
            });
            alert(nextState ? "紧急广播已开启并保存" : "紧急广播已关闭并保存");
        } catch (error) {
            console.error("Failed to toggle broadcast", error);
            alert("同步广播状态失败，请稍后重试");
            setNotification((prev) => ({...prev, isOpen: previousState}));
        } finally {
            setBroadcastSaving(false);
        }
    };

    return (
        <div className={`min-h-screen flex ${bgClass} ${textClass}`}>
            {/* Sidebar */}
            <aside
                className={`w-64 flex-shrink-0 ${sidebarBg} border-r ${sidebarBorder} flex flex-col fixed h-full z-40 transition-colors`}>
                <div className="p-6 border-b border-gray-100">
                    <h2 className="font-bold text-lg flex items-center gap-2 text-indigo-500"><Terminal
                        className="text-pink-500"/> SANGUI // ADMIN</h2>
                </div>
                <nav className="flex-1 min-h-0 p-4 space-y-5 overflow-y-auto">
                    {groupedNav.map(({title, items}) => (
                        <div key={title}>
                            <p className={`px-4 pb-2 text-xs font-semibold tracking-[0.2em] uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                {title}
                            </p>
                            <div className="space-y-1">
                                {items.map(({key, label, icon: Icon}) => (
                                    <Link
                                        key={key}
                                        to={key === 'dashboard' ? '/admin' : `/admin/${key}`}
                                        className={`w-full text-left px-4 py-3 rounded text-sm font-medium flex items-center gap-3 transition-colors ${activeTab === key
                                            ? 'bg-indigo-500 text-white shadow-lg'
                                            : `hover:bg-indigo-100 hover:text-indigo-600 ${isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-800'}`
                                        }`}
                                    >
                                        <Icon size={18}/> {label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <button onClick={() => setView('home')}
                            className="text-sm text-gray-500 hover:text-black flex items-center gap-2"><LogOut
                        size={14}/> 返回前台
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 ml-64 flex flex-col">
                {/* Top Bar */}
                <header
                    className={`sticky z-30 h-16 flex items-center justify-between px-8 ${topbarBg} border-b ${sidebarBorder} shadow-sm`}
                    style={{top: headerHeight}}>
                    <h1 className="text-xl font-bold">{activeLabel}</h1>
                    <div className="flex items-center space-x-4">
            <span className={`text-xs px-3 py-1 rounded font-bold text-white ${ROLES[user.role].color}`}>
              {ROLES[user.role].label}
            </span>
                        <button onClick={handleLogout}
                                className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
                            <LogOut size={16}/> 退出登录
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-8">
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
                            <Route index element={<DashboardView isDarkMode={isDarkMode} user={user}/>}/>
                            <Route path="dashboard" element={<DashboardView isDarkMode={isDarkMode} user={user}/>}/>
                            <Route path="create-post" element={<CreatePostView isDarkMode={isDarkMode} user={user}/>}/>
                            <Route path="comments" element={<CommentsAdminView isDarkMode={isDarkMode}/>}/>
                            <Route path="categories" element={<CategoriesView isDarkMode={isDarkMode}/>}/>
                            <Route path="taxonomy" element={<TaxonomyView isDarkMode={isDarkMode}/>}/>
                            <Route path="posts" element={<PostsView isDarkMode={isDarkMode}/>}/>
                            <Route path="posts/edit" element={<EditPostView isDarkMode={isDarkMode}/>}/>
                            <Route path="users" element={<UserManagementView isDarkMode={isDarkMode}/>}/>
                            <Route path="permissions" element={<PermissionsView isDarkMode={isDarkMode}/>}/>
                            <Route path="profile" element={<AdminProfile isDarkMode={isDarkMode}/>}/>
                            <Route path="*" element={<div className="text-xl p-8 text-center">功能开发中...</div>}/>
                        </Routes>
                    </AnalyticsSummaryContext.Provider>

                    {/* General Notification System for Super Admin */}
                    {activeTab === 'settings' && user.role === 'SUPER_ADMIN' && (
                        <div
                            className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg border shadow-sm mt-8`}>
                            <h3 className={`font-bold mb-4 text-sm uppercase tracking-wide text-gray-500`}>紧急广播设置</h3>
                    <div className="flex flex-col gap-4">
                        <input
                            className={`flex-1 border rounded px-3 py-2 text-sm outline-none focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                            value={notification.content}
                            onChange={(e) => setNotification({...notification, content: e.target.value})}
                            placeholder="请输入广播内容，如“热烈庆祝五一国际劳工节成立100周年！”"
                        />
                        <div className="flex flex-wrap gap-3 items-center">
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">显示样式</span>
                            <div className="flex gap-2">
                                {BROADCAST_STYLES.map((style) => (
                                    <button
                                        key={style.value}
                                        type="button"
                                        onClick={() => setNotification(prev => ({
                                            ...prev,
                                            style: style.value
                                        }))}
                                        className={`px-3 py-1 text-xs font-bold border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] transition-colors ${notification.style === style.value ? 'bg-black text-white' : (style.value === 'ANNOUNCE' ? 'bg-[#FFF7CC] text-black' : 'bg-[#FF0080] text-white')}`}
                                    >
                                        {style.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <select
                                className={`w-48 border rounded px-3 py-2 text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                                value={notification.style}
                                onChange={(e) => setNotification({...notification, style: e.target.value})}
                            >
                                {BROADCAST_STYLES.map((style) => (
                                    <option key={style.value} value={style.value}>{style.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleBroadcastToggle}
                                disabled={broadcastSaving}
                                className={`px-4 py-2 rounded text-sm font-bold text-white transition-colors ${notification.isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} ${broadcastSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {notification.isOpen ? '关闭并保存' : '开启并保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
            </div>
        </div>
    );
};

export default AdminPanel;


