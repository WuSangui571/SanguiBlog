import assert from 'node:assert/strict';

import {
    buildAiWelcomeIntroLines,
    shouldPlayAiWelcomeIntro
} from './aiWelcomeIntro.js';

assert.equal(shouldPlayAiWelcomeIntro({
    isOpen: true,
    messagesLength: 0,
    messagesLoading: false
}), true);

assert.equal(shouldPlayAiWelcomeIntro({
    isOpen: false,
    messagesLength: 0,
    messagesLoading: false
}), false);

assert.equal(shouldPlayAiWelcomeIntro({
    isOpen: true,
    messagesLength: 2,
    messagesLoading: false
}), false);

assert.equal(shouldPlayAiWelcomeIntro({
    isOpen: true,
    messagesLength: 0,
    messagesLoading: true
}), false);

const welcomeLines = buildAiWelcomeIntroLines('你好，我是三桂博客AI助理。');
assert.equal(welcomeLines[0], '你好，我是三桂博客AI助理。');
assert.equal(welcomeLines[1], '我可以帮你总结文章、解答站内问题，也能结合当前页面继续聊。');
assert.equal(welcomeLines[2], '直接问我就行。');

console.log('aiWelcomeIntro tests passed');
