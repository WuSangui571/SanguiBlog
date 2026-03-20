export function buildAiLauncherBadge(config = {}) {
    const rawTitle = typeof config?.title === 'string' ? config.title.trim() : '';

    return {
        eyebrow: 'AI 助理',
        label: rawTitle || '三桂博客AI助理'
    };
}
