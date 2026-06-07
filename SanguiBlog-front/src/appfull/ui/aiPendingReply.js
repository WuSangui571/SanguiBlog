export const AI_PENDING_REPLY_INTERVAL_MS = 420;

export function buildAiPendingReplyText(pendingReply, frame) {
    const dots = '.'.repeat((Math.abs(frame) % 3) + 1);
    const base = typeof pendingReply === 'string' ? pendingReply.trim() : '';
    const prefix = base.replace(/[.。…]+$/u, '').trim();
    return prefix ? `${prefix}${dots}` : dots;
}
