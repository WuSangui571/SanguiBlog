import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

const COPY_SUCCESS_TEXT = '\u5df2\u590d\u5236';
const COPY_ERROR_TEXT = '\u590d\u5236\u5931\u8d25';
const COPY_ACTION_TEXT = '\u590d\u5236';
const COPY_ARIA_LABEL = '\u590d\u5236\u4ee3\u7801';

function fallbackCopyText(text) {
    if (typeof document === 'undefined') return Promise.reject(new Error('document unavailable'));

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) {
            throw new Error('copy command failed');
        }
        return Promise.resolve();
    } catch (error) {
        document.body.removeChild(textarea);
        return Promise.reject(error);
    }
}

export function getCodeBlockLanguageLabel(className) {
    const langMatch = typeof className === 'string' ? className.match(/language-([a-zA-Z0-9]+)/) : null;
    return langMatch?.[1] ? langMatch[1].toUpperCase() : 'CODE';
}

export default function MarkdownCodeBlock({ textContent, className, isDarkMode, showShadow = true }) {
    const [copyState, setCopyState] = useState('idle');
    const resetTimerRef = useRef(null);
    const langLabel = getCodeBlockLanguageLabel(className);

    useEffect(() => () => {
        if (resetTimerRef.current && typeof window !== 'undefined') {
            window.clearTimeout(resetTimerRef.current);
        }
    }, []);

    const handleCopy = useCallback(async () => {
        const text = typeof textContent === 'string' ? textContent : String(textContent || '');
        if (!text) return;

        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                await fallbackCopyText(text);
            }
            setCopyState('success');
        } catch {
            setCopyState('error');
        }

        if (resetTimerRef.current && typeof window !== 'undefined') {
            window.clearTimeout(resetTimerRef.current);
        }
        if (typeof window !== 'undefined') {
            resetTimerRef.current = window.setTimeout(() => {
                setCopyState('idle');
            }, 1600);
        }
    }, [textContent]);

    const feedbackText = copyState === 'success' ? COPY_SUCCESS_TEXT : copyState === 'error' ? COPY_ERROR_TEXT : langLabel;
    const feedbackClass = copyState === 'success'
        ? 'text-emerald-500'
        : copyState === 'error'
            ? 'text-rose-500'
            : isDarkMode
                ? 'text-gray-300'
                : 'text-gray-600';
    const buttonText = copyState === 'success' ? COPY_SUCCESS_TEXT : COPY_ACTION_TEXT;

    const Icon = copyState === 'success' ? Check : Copy;

    return (
        <div
            className={`not-prose my-4 overflow-hidden rounded-2xl border-2 border-black ${showShadow ? 'shadow-[6px_6px_0px_0px_#000]' : ''} ${isDarkMode ? 'border-gray-700' : ''}`}
        >
            <div
                className={`flex items-center gap-3 border-b-2 border-black px-4 py-2.5 ${isDarkMode ? 'border-gray-700 bg-[#0B1221] text-gray-200' : 'bg-gray-100 text-gray-700'}`}
            >
                <div className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border border-black/10 bg-[#FF5F56]" />
                    <span className="h-3.5 w-3.5 rounded-full border border-black/10 bg-[#FFBD2E]" />
                    <span className="h-3.5 w-3.5 rounded-full border border-black/10 bg-[#27C93F]" />
                </div>
                <span className={`text-[10px] font-black tracking-[0.24em] transition-colors ${feedbackClass}`}>
                    {feedbackText}
                </span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className={`ml-auto inline-flex items-center gap-1.5 rounded-full border-2 border-black px-2.5 py-1 text-[11px] font-black transition-all hover:-translate-y-0.5 ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-50'}`}
                    aria-label={COPY_ARIA_LABEL}
                    title={COPY_ARIA_LABEL}
                >
                    <Icon size={14} />
                    {buttonText}
                </button>
            </div>
            <pre className={`m-0 overflow-auto px-5 py-4 ${isDarkMode ? 'bg-[#0B1221] text-gray-100' : 'bg-white text-gray-900'}`}>
                <code className={`${className || ''} !border-none !bg-transparent !p-0 font-mono text-[13px] leading-6`}>
                    {textContent}
                </code>
            </pre>
        </div>
    );
}
