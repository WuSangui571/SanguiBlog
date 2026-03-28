const DEFAULT_OVERFLOW_TOLERANCE = 1;

const noop = () => {};

export function isArticleExcerptOverflowing(metrics, tolerance = DEFAULT_OVERFLOW_TOLERANCE) {
    if (!metrics || typeof metrics !== 'object') {
        return false;
    }

    const {
        scrollHeight = 0,
        clientHeight = 0,
        scrollWidth = 0,
        clientWidth = 0
    } = metrics;

    return (scrollHeight - clientHeight) > tolerance || (scrollWidth - clientWidth) > tolerance;
}

export function getArticleExcerptTooltip(excerpt, isOverflowing = false) {
    if (!isOverflowing || typeof excerpt !== 'string') {
        return '';
    }

    return excerpt.replace(/\s+/g, ' ').trim();
}

export function createArticleExcerptOverflowTracker() {
    const elements = new Map();
    let overflowMap = {};

    return {
        registerElement(postId, element) {
            if (element) {
                elements.set(postId, element);
                return;
            }
            elements.delete(postId);
        },
        measure() {
            const nextOverflowMap = {};
            elements.forEach((element, postId) => {
                nextOverflowMap[postId] = isArticleExcerptOverflowing(element);
            });
            overflowMap = nextOverflowMap;
            return nextOverflowMap;
        },
        getOverflowMap() {
            return overflowMap;
        },
        getElements() {
            return Array.from(elements.values());
        },
        getTooltip(postId, excerpt) {
            return getArticleExcerptTooltip(excerpt, overflowMap[postId] === true);
        }
    };
}

export function observeArticleExcerptOverflow(elements, onMeasure, options = {}) {
    const elementList = Array.isArray(elements) ? elements.filter(Boolean) : [];
    const measure = typeof onMeasure === 'function' ? onMeasure : noop;
    const windowObject = options.windowObject ?? (typeof window !== 'undefined' ? window : null);
    const documentObject = options.documentObject ?? (typeof document !== 'undefined' ? document : null);
    const resizeObserverFactory = options.resizeObserverFactory
        ?? ((typeof ResizeObserver !== 'undefined') ? ((callback) => new ResizeObserver(callback)) : null);

    let frameId = null;
    const scheduleMeasure = () => {
        if (!windowObject?.requestAnimationFrame) {
            measure();
            return;
        }
        if (frameId !== null && windowObject.cancelAnimationFrame) {
            windowObject.cancelAnimationFrame(frameId);
        }
        frameId = windowObject.requestAnimationFrame(() => {
            frameId = null;
            measure();
        });
    };

    scheduleMeasure();

    const handleResize = () => {
        scheduleMeasure();
    };

    if (windowObject?.addEventListener) {
        windowObject.addEventListener('resize', handleResize);
    }

    const resizeObserver = resizeObserverFactory ? resizeObserverFactory(scheduleMeasure) : null;
    if (resizeObserver) {
        elementList.forEach((element) => resizeObserver.observe(element));
    }

    const fontReady = documentObject?.fonts?.ready;
    if (fontReady && typeof fontReady.then === 'function') {
        const fontReadyResult = fontReady.then(() => {
            scheduleMeasure();
        });
        if (fontReadyResult && typeof fontReadyResult.catch === 'function') {
            fontReadyResult.catch(noop);
        }
    }

    return () => {
        if (frameId !== null && windowObject?.cancelAnimationFrame) {
            windowObject.cancelAnimationFrame(frameId);
        }
        if (resizeObserver?.disconnect) {
            resizeObserver.disconnect();
        }
        if (windowObject?.removeEventListener) {
            windowObject.removeEventListener('resize', handleResize);
        }
    };
}
