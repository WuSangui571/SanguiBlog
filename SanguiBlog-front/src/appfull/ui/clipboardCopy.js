function fallbackCopyText(text, documentObject) {
    if (!documentObject?.body || typeof documentObject.createElement !== 'function') {
        return Promise.reject(new Error('document unavailable'));
    }

    const textarea = documentObject.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    documentObject.body.appendChild(textarea);
    textarea.select();
    textarea.focus?.();

    try {
        const copied = documentObject.execCommand?.('copy');
        if (!copied) {
            throw new Error('copy command failed');
        }
        return Promise.resolve({ method: 'fallback' });
    } catch (error) {
        return Promise.reject(error);
    } finally {
        documentObject.body.removeChild(textarea);
    }
}

export async function copyTextWithFallback(
    text,
    {
        navigatorObject = typeof navigator !== 'undefined' ? navigator : null,
        documentObject = typeof document !== 'undefined' ? document : null
    } = {}
) {
    const normalizedText = typeof text === 'string' ? text : String(text || '');
    if (!normalizedText) {
        throw new Error('copy text is empty');
    }

    try {
        if (navigatorObject?.clipboard?.writeText) {
            await navigatorObject.clipboard.writeText(normalizedText);
            return { method: 'clipboard' };
        }
    } catch {
        // Some browsers expose clipboard.writeText but reject it outside secure
        // contexts or when permission is denied; fall through to legacy copy.
    }

    return fallbackCopyText(normalizedText, documentObject);
}
