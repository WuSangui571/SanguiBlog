import logger from "./logger.js";

export const buildAssetUrl = (path, fallback = null) => {
    const upgradeToHttpsIfSecure = (url) => {
        if (!url) return url;
        if (typeof window === 'undefined' || window.location?.protocol !== 'https:') return url;
        if (!/^http:\/\//i.test(url)) return url;
        try {
            const parsed = new URL(url);
            parsed.protocol = 'https:';
            return parsed.toString();
        } catch {
            return url.replace(/^http:\/\//i, 'https://');
        }
    };

    if (!path) return fallback;
    if (/^(https?:)?\/\//i.test(path)) {
        return path.startsWith('http://') ? upgradeToHttpsIfSecure(path) : path;
    }

    const normalized = path.startsWith('/') ? path : `/${path}`;
    const runtimeOrigin = typeof window !== 'undefined' && window.__SG_ASSET_ORIGIN__
        ? window.__SG_ASSET_ORIGIN__
        : '';
    const assetOrigin = (runtimeOrigin || import.meta.env.VITE_ASSET_ORIGIN || '').replace(/\/$/, '');

    const resolveWithOrigin = (origin) => {
        if (!origin) return null;
        const sanitizedOrigin = origin.replace(/\/+$/, '');
        try {
            const parsed = new URL(sanitizedOrigin);
            const prefix = `${parsed.protocol}//${parsed.host}`;
            const basePath = parsed.pathname ? parsed.pathname.replace(/\/+$/, '') : '';
            let suffix = normalized;
            if (!suffix.startsWith('/')) suffix = `/${suffix}`;
            if (basePath && suffix.toLowerCase().startsWith(basePath.toLowerCase())) {
                suffix = suffix.slice(basePath.length);
                if (!suffix || suffix === '') {
                    suffix = '';
                } else if (!suffix.startsWith('/')) {
                    suffix = `/${suffix}`;
                }
            }
            const combined = `${prefix}${basePath}${suffix}`.replace(/([^:]\/)\/+/g, '$1');
            return combined.endsWith('/') && suffix === '' ? combined.slice(0, -1) : combined;
        } catch {
            return `${sanitizedOrigin}${normalized}`.replace(/([^:]\/)\/+/g, '$1');
        }
    };

    const directOrigin = upgradeToHttpsIfSecure(resolveWithOrigin(assetOrigin));
    if (directOrigin) return directOrigin;

    const apiBase = import.meta.env.VITE_API_BASE || '';
    if (apiBase.startsWith('http')) {
        try {
            const origin = new URL(apiBase).origin.replace(/\/$/, '');
            const value = upgradeToHttpsIfSecure(resolveWithOrigin(origin));
            if (value) return value;
        } catch (err) {
            logger.warn('Invalid VITE_API_BASE for asset url resolution', err);
        }
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        const value = upgradeToHttpsIfSecure(resolveWithOrigin(window.location.origin.replace(/\/$/, '')));
        if (value) return value;
    }

    const devFallback = upgradeToHttpsIfSecure(resolveWithOrigin('http://localhost:8080'));
    return devFallback || normalized;
};
