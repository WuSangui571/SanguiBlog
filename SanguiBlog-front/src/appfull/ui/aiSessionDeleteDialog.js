export function buildAiSessionDeleteDialog(sessionTitle = '') {
    const normalizedTitle = typeof sessionTitle === 'string' && sessionTitle.trim()
        ? sessionTitle.trim()
        : '新对话';

    return {
        title: '删除这条对话？',
        sessionTitle: normalizedTitle,
        description: '删除后，这条会话会从用户侧历史会话中隐藏，但后台 AI 会话审计仍然保留原始记录。',
        confirmText: '确认删除',
        cancelText: '取消'
    };
}
