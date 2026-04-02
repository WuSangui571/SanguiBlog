export function getAiMessagePresentation(role, isDarkMode) {
    if (role === 'assistant') {
        return {
            wrapperClassName: 'w-full',
            contentClassName: isDarkMode
                ? 'w-full rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-3.5 text-gray-100 backdrop-blur-xl shadow-[0_10px_24px_rgba(2,6,23,0.16)]'
                : 'w-full rounded-[24px] border border-black/10 bg-white/55 px-4 py-3.5 text-[#111827] backdrop-blur-xl shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
        };
    }

    return {
        wrapperClassName: 'flex justify-end',
        contentClassName: isDarkMode
            ? 'max-w-[85%] rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] px-4 py-3 text-white backdrop-blur-xl shadow-[0_12px_28px_rgba(2,6,23,0.24)]'
            : 'max-w-[85%] rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.52))] px-4 py-3 text-black backdrop-blur-xl shadow-[0_12px_28px_rgba(15,23,42,0.10)]'
    };
}
