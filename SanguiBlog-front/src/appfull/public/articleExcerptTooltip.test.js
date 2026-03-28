import assert from 'node:assert/strict';

import {
    createArticleExcerptOverflowTracker,
    getArticleExcerptTooltip,
    isArticleExcerptOverflowing,
    observeArticleExcerptOverflow
} from './articleExcerptTooltip.js';

assert.equal(
    getArticleExcerptTooltip('  这是摘要首行。\n\n这是摘要次行。 ', true),
    '这是摘要首行。 这是摘要次行。'
);

assert.equal(getArticleExcerptTooltip('  首帧未测量完成的摘要。 '), '');
assert.equal(getArticleExcerptTooltip('  这是完整显示的摘要。 ', false), '');
assert.equal(getArticleExcerptTooltip('   ', true), '');
assert.equal(getArticleExcerptTooltip(null, true), '');

assert.equal(
    isArticleExcerptOverflowing({
        scrollHeight: 65,
        clientHeight: 64,
        scrollWidth: 100,
        clientWidth: 100
    }),
    false
);

assert.equal(
    isArticleExcerptOverflowing({
        scrollHeight: 67,
        clientHeight: 64,
        scrollWidth: 100,
        clientWidth: 100
    }),
    true
);

assert.equal(
    isArticleExcerptOverflowing({
        scrollHeight: 64,
        clientHeight: 64,
        scrollWidth: 103,
        clientWidth: 100
    }),
    true
);

{
    const tracker = createArticleExcerptOverflowTracker();
    const excerpt = '  组件链路里的摘要内容。  ';
    const element = {
        scrollHeight: 96,
        clientHeight: 64,
        scrollWidth: 100,
        clientWidth: 100
    };

    tracker.registerElement('post-1', element);
    assert.equal(tracker.getTooltip('post-1', excerpt), '');

    tracker.measure();
    assert.equal(tracker.getTooltip('post-1', excerpt), '组件链路里的摘要内容。');

    tracker.registerElement('post-1', {
        scrollHeight: 64,
        clientHeight: 64,
        scrollWidth: 100,
        clientWidth: 100
    });
    tracker.measure();
    assert.equal(tracker.getTooltip('post-1', excerpt), '');
}

{
    const observedElements = [];
    let disconnected = false;
    let resizeHandler = null;
    let scheduledFrame = null;
    let cancelledFrame = null;
    let fontReadyCallback = null;
    let measureCount = 0;
    const elementA = { id: 'a' };
    const elementB = { id: 'b' };
    const cleanup = observeArticleExcerptOverflow([elementA, elementB], () => {
        measureCount += 1;
    }, {
        windowObject: {
            addEventListener(eventName, handler) {
                if (eventName === 'resize') {
                    resizeHandler = handler;
                }
            },
            removeEventListener() {},
            requestAnimationFrame(callback) {
                scheduledFrame = callback;
                return 42;
            },
            cancelAnimationFrame(frameId) {
                cancelledFrame = frameId;
            }
        },
        resizeObserverFactory(callback) {
            return {
                observe(element) {
                    observedElements.push(element);
                },
                disconnect() {
                    disconnected = true;
                },
                trigger() {
                    callback();
                }
            };
        },
        documentObject: {
            fonts: {
                ready: {
                    then(callback) {
                        fontReadyCallback = callback;
                    }
                }
            }
        }
    });

    assert.deepEqual(observedElements, [elementA, elementB]);
    assert.equal(typeof resizeHandler, 'function');
    assert.equal(typeof scheduledFrame, 'function');

    scheduledFrame();
    assert.equal(measureCount, 1);

    fontReadyCallback();
    scheduledFrame();
    assert.equal(measureCount, 2);

    resizeHandler();
    scheduledFrame();
    assert.equal(measureCount, 3);

    cleanup();
    assert.ok(cancelledFrame === null || cancelledFrame === 42);
    assert.equal(disconnected, true);
}
