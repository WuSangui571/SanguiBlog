export function getArticleExcerptTooltip(excerpt) {
    if (typeof excerpt !== 'string') {
        return '';
    }

    return excerpt.replace(/\s+/g, ' ').trim();
}
