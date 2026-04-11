export function getAiMessagePresentation(role, isDarkMode) {
    if (role === 'assistant') {
        return {
            wrapperClassName: 'w-full',
            contentClassName: isDarkMode
                ? 'w-full px-1 py-1 text-gray-100 select-text cursor-text'
                : 'w-full px-1 py-1 text-[#111827] select-text cursor-text'
        };
    }

    return {
        wrapperClassName: 'flex justify-end',
        contentClassName: isDarkMode
            ? 'max-w-[85%] rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] px-4 py-3 text-white backdrop-blur-xl shadow-[0_12px_28px_rgba(2,6,23,0.24)]'
            : 'max-w-[85%] rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.52))] px-4 py-3 text-black backdrop-blur-xl shadow-[0_12px_28px_rgba(15,23,42,0.10)]'
    };
}
