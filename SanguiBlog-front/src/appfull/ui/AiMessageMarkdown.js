import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { rehypeSanitize, SG_REHYPE_SANITIZE_SCHEMA } from '../../utils/rehypeSanitizeSchema.js';

function createMarkdownComponents({ isDarkMode, isAssistant }) {
    const inlineCodeClass = isAssistant
        ? 'rounded bg-black/10 px-1.5 py-0.5 font-mono text-[0.92em]'
        : isDarkMode
            ? 'rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.92em]'
            : 'rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.92em]';

    const blockClass = isAssistant
        ? 'my-3 overflow-x-auto rounded-2xl border border-black/15 bg-black/10 px-3 py-3'
        : isDarkMode
            ? 'my-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 px-3 py-3'
            : 'my-3 overflow-x-auto rounded-2xl border border-black/10 bg-black/[0.04] px-3 py-3';

    const tableWrapClass = 'my-3 overflow-x-auto rounded-2xl border border-black/10';

    return {
        p: ({ children }) => React.createElement('p', { className: 'my-0 leading-6' }, children),
        ul: ({ children }) => React.createElement('ul', { className: 'my-2 list-disc pl-5 space-y-1' }, children),
        ol: ({ children }) => React.createElement('ol', { className: 'my-2 list-decimal pl-5 space-y-1' }, children),
        li: ({ children }) => React.createElement('li', { className: 'leading-6' }, children),
        h1: ({ children }) => React.createElement('h1', { className: 'mt-1 mb-3 text-lg font-black' }, children),
        h2: ({ children }) => React.createElement('h2', { className: 'mt-1 mb-3 text-base font-black' }, children),
        h3: ({ children }) => React.createElement('h3', { className: 'mt-1 mb-2 text-sm font-black' }, children),
        blockquote: ({ children }) => React.createElement(
            'blockquote',
            { className: 'my-3 border-l-4 border-black/25 pl-3 italic opacity-90' },
            children
        ),
        a: ({ href, children }) => React.createElement(
            'a',
            {
                href,
                target: '_blank',
                rel: 'noreferrer',
                className: 'font-bold underline underline-offset-4 break-all'
            },
            children
        ),
        pre: ({ children }) => React.createElement('pre', { className: blockClass }, children),
        code: ({ className, children }) => {
            const text = String(children).replace(/\n$/, '');
            const isBlock = typeof className === 'string' && className.includes('language-');
            if (isBlock) {
                return React.createElement(
                    'code',
                    {
                        className: 'font-mono text-[13px] leading-6 whitespace-pre'
                    },
                    text
                );
            }

            return React.createElement(
                'code',
                {
                    className: inlineCodeClass
                },
                text
            );
        },
        table: ({ children }) => React.createElement(
            'div',
            { className: tableWrapClass },
            React.createElement('table', { className: 'min-w-full border-collapse text-left text-sm' }, children)
        ),
        thead: ({ children }) => React.createElement('thead', { className: isAssistant ? 'bg-black/10' : isDarkMode ? 'bg-white/5' : 'bg-black/[0.04]' }, children),
        th: ({ children }) => React.createElement('th', { className: 'border-b border-black/10 px-3 py-2 font-black' }, children),
        td: ({ children }) => React.createElement('td', { className: 'border-b border-black/10 px-3 py-2 align-top' }, children),
        hr: () => React.createElement('hr', { className: 'my-4 border-black/15' })
    };
}

export default function AiMessageMarkdown({ content, isDarkMode, isAssistant }) {
    return React.createElement(
        'div',
        {
            className: 'text-sm font-semibold break-words'
        },
        React.createElement(
            ReactMarkdown,
            {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [[rehypeSanitize, SG_REHYPE_SANITIZE_SCHEMA]],
                components: createMarkdownComponents({ isDarkMode, isAssistant })
            },
            content || ''
        )
    );
}
