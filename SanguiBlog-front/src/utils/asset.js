export const buildAssetUrl = (path, fallback = null) => {
    if (!path) return fallback;
    if (/^(https?:)?\/\//i.test(path)) return path;

    const normalized = path.startsWith('/') ? path : `/${path}`;
    const assetOrigin = (import.meta.env.VITE_ASSET_ORIGIN || '').replace(/\/$/, '');

    const resolveWithOrigin = (origin) => {
        if (!origin) return null;
        return `${origin}${normalized}`.replace(/([^:]\/)\/+/g, '$1');
    };

    const directOrigin = resolveWithOrigin(assetOrigin);
    if (directOrigin) return directOrigin;

    const apiBase = import.meta.env.VITE_API_BASE || '';
    if (apiBase.startsWith('http')) {
        try {
            const origin = new URL(apiBase).origin.replace(/\/$/, '');
            const value = resolveWithOrigin(origin);
            if (value) return value;
        } catch (err) {
            console.warn('Invalid VITE_API_BASE for asset url resolution', err);
        }
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        const value = resolveWithOrigin(window.location.origin.replace(/\/$/, ''));
        if (value) return value;
    }

    const devFallback = resolveWithOrigin('http://localhost:8080');
    return devFallback || normalized;
};
