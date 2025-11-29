import React, {createContext, useContext} from 'react';
import {Lock} from 'lucide-react';

export const THEME = {
    colors: {
        bgLight: 'bg-[#F0F0F0]',
        surfaceLight: 'bg-white',
        bgDark: 'bg-[#111827]',
        surfaceDark: 'bg-[#1f2937]',
        primary: 'bg-[#6366F1]',
        secondary: 'bg-[#FFD700]',
        accent: 'bg-[#FF0080]',
        dark: 'bg-[#1A1A1A]',
        border: 'border-2 border-black',
    },
};

export const ROLES = {
    SUPER_ADMIN: {label: '超级管理员', color: 'bg-[#FF0080]'},
    ADMIN: {label: '管理员', color: 'bg-[#6366F1]'},
    USER: {label: '用户', color: 'bg-[#00E096]'},
};

export const CATEGORY_TREE = [
    {id: 'all', label: '全部', children: []},
    {
        id: 'programming',
        label: '硬核编程',
        children: [
            {id: 'java', label: 'Java Core'},
            {id: 'frontend', label: 'Modern Web'},
            {id: 'algo', label: '算法进阶'},
        ],
    },
    {
        id: 'architecture',
        label: '架构视角',
        children: [
            {id: 'cloud', label: '云原生'},
            {id: 'system', label: '分布式系统'},
        ],
    },
    {
        id: 'life',
        label: '数字生活',
        children: [
            {id: 'gear', label: '装备控'},
            {id: 'think', label: '碎碎念'},
        ],
    },
];

export const SITE_STATS = {
    posts: 71,
    comments: 24,
    categories: 11,
    tags: 43,
    views: 1643,
    lastUpdated: '2025/11/17',
    lastUpdatedFull: '2025-11-17 00:00:00',
};

export const MOCK_USER = {
    id: 1,
    username: '三桂 SanGui',
    title: 'Fullstack Developer',
    bio: '用代码构建现实，用逻辑拆解虚无。',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SanGui&backgroundColor=FFD700',
    role: 'SUPER_ADMIN',
    social: {
        github: 'https://github.com/Wusangui571',
        wechatQr: '/contact/wechat.jpg',
    },
};

const GENERATE_POSTS = () => {
    const base = [
        {
            id: 101,
            title: 'SpringBoot 3.0: 原生编译的终极奥义',
            excerpt: 'GraalVM AOT.',
            category: 'Java Core',
            parentCategory: '硬核编程',
            tags: ['Java', 'AOT'],
            color: 'bg-[#6366F1]',
            likes: 128,
            comments: 45,
            date: '2023-11-24',
            views: 532,
        },
        {
            id: 102,
            title: 'Vue3 Composition API: 逻辑复用的艺术',
            excerpt: '告别 Options API 的嵌套地狱。',
            category: 'Modern Web',
            parentCategory: '硬核编程',
            tags: ['Vue3', 'Refactor'],
            color: 'bg-[#FF0080]',
            likes: 89,
            comments: 12,
            date: '2023-11-20',
            views: 321,
        },
        {
            id: 103,
            title: '微服务的一致性困局：Saga 还是 TCC？',
            excerpt: '分布式事务没有银弹。',
            category: 'Distributed Sys',
            parentCategory: '架构视角',
            tags: ['Microservices', 'System Design'],
            color: 'bg-[#00E096]',
            likes: 256,
            comments: 67,
            date: '2023-11-15',
            views: 890,
        },
    ];

    const posts = [...base];
    for (let i = 0; i < 15; i++) {
        posts.push({
            ...base[i % 3],
            id: 200 + i,
            title: `${base[i % 3].title} (Part ${i + 1})`,
            date: `2023-10-${10 + i}`,
        });
    }
    return posts;
};

export const MOCK_POSTS = GENERATE_POSTS();
export const PAGE_SIZE = 5;
export const TAG_PREVIEW_COUNT = 9;

export const AnalyticsSummaryContext = createContext({
    summary: null,
    loading: false,
    error: '',
    rangeDays: 14,
    reload: () => {},
});

export const useAdminAnalytics = () => useContext(AnalyticsSummaryContext);

export const PermissionNotice = ({
    title = '权限不足',
    description = '请联系超级管理员分配权限',
}) => (
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-10 text-center space-y-3 bg-white/60 dark:bg-gray-900/40">
        <Lock size={32} className="mx-auto text-gray-400"/>
        <h3 className="text-xl font-black">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-6">{description}</p>
    </div>
);

export const getReferrer = () => {
    if (typeof document === 'undefined') return '';
    return document.referrer || '';
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
