const DEFAULT_OVERFLOW_TOLERANCE = 1;

export function isArticleExcerptOverflowing(metrics, tolerance = DEFAULT_OVERFLOW_TOLERANCE) {
    if (!metrics || typeof metrics !== 'object') {
        return false;
    }

    const {
        scrollHeight = 0,
        clientHeight = 0,
        scrollWidth = 0,
        clientWidth = 0
    } = metrics;

    return (scrollHeight - clientHeight) > tolerance || (scrollWidth - clientWidth) > tolerance;
}

export function getArticleExcerptTooltip(excerpt, isOverflowing = false) {
    if (!isOverflowing || typeof excerpt !== 'string') {
        return '';
    }

    return excerpt.replace(/\s+/g, ' ').trim();
}
