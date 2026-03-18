export function formatAiSessionTimeLabel(updatedAt, now = new Date()) {
    if (!updatedAt) {
        return '刚刚';
    }

    const target = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
    const diffMs = Math.max(0, now.getTime() - target.getTime());
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const dayDiff = Math.max(0, Math.round((nowDay - targetDay) / dayMs));

    if (dayDiff === 0 && diffMs < hourMs) {
        const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
        return `${minutes}分钟前`;
    }

    if (dayDiff === 0 && diffMs < dayMs) {
        const hours = Math.max(1, Math.floor(diffMs / hourMs));
        return `${hours}小时前`;
    }

    if (dayDiff === 1) {
        return '昨天';
    }

    if (dayDiff < 7) {
        return '7天内';
    }

    if (dayDiff < 30) {
        return '30天内';
    }

    return '一个月前';
}

export function truncateAiSessionTitle(title, maxLength = 16) {
    const value = typeof title === 'string' ? title.trim() : '';
    if (!value) {
        return '新对话';
    }

    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
