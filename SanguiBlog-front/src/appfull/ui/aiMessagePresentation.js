export function getAiMessagePresentation(role, isDarkMode) {
    if (role === 'assistant') {
        return {
            wrapperClassName: 'w-full',
            contentClassName: isDarkMode
                ? 'w-full px-1 py-1 text-gray-100'
                : 'w-full px-1 py-1 text-[#111827]'
        };
    }

    return {
        wrapperClassName: 'flex justify-end',
        contentClassName: isDarkMode
            ? 'max-w-[85%] rounded-[20px] border-2 border-black bg-gray-800 px-4 py-3 text-white'
            : 'max-w-[85%] rounded-[20px] border-2 border-black bg-white px-4 py-3 text-black'
    };
}
