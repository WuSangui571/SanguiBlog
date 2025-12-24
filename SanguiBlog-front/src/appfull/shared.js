import { visit } from 'unist-util-visit';
import { AlertTriangle, Sparkles } from 'lucide-react';

export const THEME_COLOR_PRESETS = [
    'bg-[#00E096]',
    'bg-[#6366F1]',
    'bg-[#FF0080]',
    'bg-[#FFD700]',
    'bg-[#0EA5E9]',
    'bg-[#F97316]'
];
export const DEFAULT_THEME_COLOR = 'bg-[#6366F1]';
export const HERO_NOISE_TEXTURE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMjAnIGhlaWdodD0nMTIwJyB2aWV3Qm94PScwIDAgMTIwIDEyMCc+PGZpbHRlciBpZD0nbicgeD0nMCcgeT0nMCc+PGZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9JzAuOCcgbnVtT2N0YXZlcz0nMycgc3RpdGNoVGlsZXM9J3N0aXRjaCcvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPScxMjAnIGhlaWdodD0nMTIwJyBmaWx0ZXI9J3VybCgjbiknIG9wYWNpdHk9JzAuNCcvPjwvc3ZnPg==";
export const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" fill="none"><rect width="160" height="160" rx="28" fill="%23f8fafc"/><circle cx="80" cy="74" r="34" stroke="%2394a3b8" stroke-width="8" stroke-linecap="round" stroke-dasharray="60 32"><animateTransform attributeName="transform" type="rotate" from="0 80 80" to="360 80 80" dur="1s" repeatCount="indefinite"/></circle><rect x="40" y="116" width="80" height="18" rx="9" fill="%2394a3b8" opacity="0.28"/><text x="80" y="129" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="12" fill="%236b7280">加载中...</text></svg>';
export const PUBLIC_IP_ENDPOINT = import.meta.env.VITE_PUBLIC_IP_ENDPOINT || 'https://api.ipify.org?format=json';
export const ENABLE_PUBLIC_IP_FALLBACK = import.meta.env.VITE_ENABLE_PUBLIC_IP_FETCH === 'true';

export const randomAngle = () => Math.round(Math.random() * 360);
export const randomSprayPolygon = () => {
    const count = 8 + Math.floor(Math.random() * 4);
    const points = [];
    for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.35);
        const radius = 35 + Math.random() * 25;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        points.push(`${Math.min(100, Math.max(0, x)).toFixed(1)}% ${Math.min(100, Math.max(0, y)).toFixed(1)}%`);
    }
    return `polygon(${points.join(',')})`;
};
export const createTendrils = (toDark) => {
    if (!toDark) return [];
    const palette = ['rgba(255,215,0,0.65)', 'rgba(99,102,241,0.45)', 'rgba(245,56,136,0.5)'];
    const count = 2 + Math.floor(Math.random() * 2);
    return Array.from({ length: count }, () => ({
        angle: Math.random() * 360,
        length: 0.4 + Math.random() * 0.3,
        width: 10 + Math.random() * 10,
        delay: Math.random() * 0.1,
        color: palette[Math.floor(Math.random() * palette.length)]
    }));
};
export const countImagesInContent = (content = "") => {
    if (!content) return 0;
    const matches = content.match(/!\[[^\]]*]\([^)]+\)/g);
    return matches ? matches.length : 0;
};

export const extractHexFromBgClass = (value = '', fallback = '#6366F1') => {
    if (typeof value !== 'string') return fallback;
    const match = value.match(/#([0-9a-fA-F]{6})/);
    return match ? `#${match[1].toUpperCase()}` : fallback;
};

const escapeHtml = (value = "") =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

export const remarkHighlight = () => (tree) => {
    visit(tree, 'text', (node, index, parent) => {
        if (!parent || typeof node.value !== 'string') return;
        if (!node.value.includes('==')) return;
        const regex = /==([^=]+)==/g;
        const newNodes = [];
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(node.value)) !== null) {
            if (match.index > lastIndex) {
                newNodes.push({
                    type: 'text',
                    value: node.value.slice(lastIndex, match.index),
                });
            }
            newNodes.push({
                type: 'html',
                value: `<mark>${escapeHtml(match[1])}</mark>`,
            });
            lastIndex = match.index + match[0].length;
        }
        if (!newNodes.length) return;
        if (lastIndex < node.value.length) {
            newNodes.push({
                type: 'text',
                value: node.value.slice(lastIndex),
            });
        }
        parent.children.splice(index, 1, ...newNodes);
        return [visit.SKIP, index + newNodes.length];
    });
};

export const THEME = {
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

export const ROLES = {
    SUPER_ADMIN: { label: "超级管理员", color: "bg-[#FF0080]" },
    ADMIN: { label: "管理员", color: "bg-[#6366F1]" },
    USER: { label: "用户", color: "bg-[#00E096]" }
};

export const BROADCAST_STYLE_CONFIG = {
    ALERT: {
        label: "紧急广播 // SYSTEM ALERT",
        containerClass: "bg-[#FF0080] text-white",
        textClass: "text-white",
        icon: AlertTriangle,
        iconClass: "text-[#FFD700]",
        iconSize: 24,
        pulse: true
    },
    ANNOUNCE: {
        label: "庆典公告 // CELEBRATION",
        containerClass: "bg-[linear-gradient(120deg,#FFF4D6_0%,#FFD28A_38%,#FF9F68_76%,#FFD6A5_100%)] text-[#3A2C0F]",
        textClass: "text-[#3A2C0F]",
        icon: Sparkles,
        iconClass: "text-[#C2410C]",
        iconSize: 24,
        pulse: true
    }
};

export const CATEGORY_TREE = [
    { id: "all", label: "全部", children: [] },
    {
        id: "programming",
        label: "硬核编程",
        children: [{ id: "java", label: "Java Core" }, { id: "frontend", label: "Modern Web" }, {
            id: "algo",
            label: "算法进阶"
        }]
    },
    {
        id: "architecture",
        label: "架构视角",
        children: [{ id: "cloud", label: "云原生" }, { id: "system", label: "分布式系统" }]
    },
    { id: "life", label: "数字生活", children: [{ id: "gear", label: "装备控" }, { id: "think", label: "碎碎念" }] }
];

export const SITE_STATS = {
    posts: 71,
    comments: 24,
    categories: 11,
    tags: 43,
    views: 1643,
    lastUpdated: "2025/11/17",
    lastUpdatedFull: "2025-11-17 00:00:00"
};

export const MOCK_USER = {
    id: 1,
    username: "三桂",
    title: "Fullstack Developer",
    bio: "个人学习记录｜三桂醒着就行，慢慢努力中；灯还亮着，就不算困。",
    avatar: DEFAULT_AVATAR,
    role: "SUPER_ADMIN",
    social: {
        github: "https://github.com/Wusangui571",
        wechatQr: "/contact/wechat.jpg"
    }
};

export const GENERATE_POSTS = () => ([
    {
        id: 101,
        title: "文章列表加载中…",
        excerpt: "正在从后端拉取最新文章，请稍候片刻。",
        category: "Java Core",
        parentCategory: "硬核编程",
        tags: ["loading"],
        color: "bg-[#E5E7EB]",
        likes: 0,
        comments: 0,
        date: "加载中",
        views: 0
    },
    {
        id: 102,
        title: "请稍等，内容即将刷新",
        excerpt: "这是占位卡片，接口返回后会自动替换为真实文章。",
        category: "Modern Web",
        parentCategory: "硬核编程",
        tags: ["loading"],
        color: "bg-[#D1D5DB]",
        likes: 0,
        comments: 0,
        date: "加载中",
        views: 0
    }
]);
export const MOCK_POSTS = GENERATE_POSTS();
export const DEFAULT_PAGE_SIZE = 5;
export const PAGE_SIZE_OPTIONS = [5, 10, 20];
export const PAGE_SIZE_STORAGE_KEY = 'sangui_home_page_size';
export const DEFAULT_HERO_TAGLINE = '我是三桂，在这里把问题想清楚，把代码写简单。';
export const DEFAULT_HOME_QUOTE = '别急，先把问题想清楚。';
export const TAG_PREVIEW_COUNT = 9;
export const SPIN_WARNINGS = [
    '慢点慢点，我的小脑壳有点晕～',
    '转速太快啦，给我缓口气！',
    '呀！眩晕警报，请手下留情。',
    '别急别急，灵感也需要休息。'
];
export const SPIN_INTERVAL_MS = 350;
export const SPIN_WARN_THRESHOLD = 4;
export const MEGA_SPIN_THRESHOLD = 10;
export const SPIN_LOCK_DURATION = 60000;
export const MEGA_SPIN_DURATION = 4200;
export const THEME_SPREE_THRESHOLD = 6;
export const THEME_SPREE_INTERVAL = 450;
export const THEME_SPREE_DURATION = 15000;
export const THEME_SPREE_PALETTES = [
    ['#FF0080', '#FFD700', '#0EA5E9'],
    ['#22D3EE', '#7C3AED', '#F472B6'],
    ['#F97316', '#FACC15', '#16A34A']
];
export const THEME_LOCK_DURATION = 60000;
export const ARCHIVE_MONTH_LABELS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

export const getReferrerMeta = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return { referrer: '', sourceLabel: '直接访问' };
    }
    const referrer = document.referrer || '';
    if (!referrer) {
        return { referrer: '', sourceLabel: '直接访问' };
    }
    try {
        const parsed = new URL(referrer);
        const currentOrigin = window.location.origin;
        if (currentOrigin && parsed.origin === currentOrigin) {
            const path = parsed.pathname || '/';
            if (path === '/' || path === '') {
                return { referrer, sourceLabel: '来自首页' };
            }
            if (path.startsWith('/admin')) {
                return { referrer, sourceLabel: '来自后台页面' };
            }
            if (path.startsWith('/archive')) {
                return { referrer, sourceLabel: '来自归档页' };
            }
            if (path.startsWith('/posts') || path.startsWith('/article')) {
                return { referrer, sourceLabel: '来自站内文章' };
            }
            return { referrer, sourceLabel: `来自站内：${path}` };
        }
        return { referrer, sourceLabel: `外部链接：${parsed.hostname}` };
    } catch {
        return { referrer, sourceLabel: '直接访问' };
    }
};

export const getGeoHint = () => {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
        try {
            const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (zone) return zone;
        } catch {
            return '';
        }
    }
    return '';
};

const AUTO_PAGE_VIEW_GUARD = {
    lastKey: ''
};

export const claimAutoPageView = (key) => {
    if (!key) {
        return false;
    }
    if (AUTO_PAGE_VIEW_GUARD.lastKey === key) {
        return false;
    }
    AUTO_PAGE_VIEW_GUARD.lastKey = key;
    return true;
};

export const resetAutoPageViewGuard = () => {
    AUTO_PAGE_VIEW_GUARD.lastKey = '';
};
