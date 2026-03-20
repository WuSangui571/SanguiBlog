import assert from 'node:assert/strict';

import {
    AI_WELCOME_INTRO_STORAGE_KEY,
    buildAiWelcomeIntroLines,
    hasPlayedAiWelcomeIntro,
    markAiWelcomeIntroPlayed,
    shouldPlayAiWelcomeIntro
} from './aiWelcomeIntro.js';

function createFakeStorage() {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        }
    };
}

const storage = createFakeStorage();

assert.equal(hasPlayedAiWelcomeIntro(storage), false);
markAiWelcomeIntroPlayed(storage);
assert.equal(storage.getItem(AI_WELCOME_INTRO_STORAGE_KEY), '1');
assert.equal(hasPlayedAiWelcomeIntro(storage), true);

assert.equal(shouldPlayAiWelcomeIntro({
    isOpen: true,
    messagesLength: 0,
    messagesLoading: false,
    hasPlayed: false
}), true);

assert.equal(shouldPlayAiWelcomeIntro({
    isOpen: false,
    messagesLength: 0,
    messagesLoading: false,
    hasPlayed: false
}), false);

assert.equal(shouldPlayAiWelcomeIntro({
    isOpen: true,
    messagesLength: 2,
    messagesLoading: false,
    hasPlayed: false
}), false);

assert.equal(shouldPlayAiWelcomeIntro({
    isOpen: true,
    messagesLength: 0,
    messagesLoading: true,
    hasPlayed: false
}), false);

assert.equal(shouldPlayAiWelcomeIntro({
    isOpen: true,
    messagesLength: 0,
    messagesLoading: false,
    hasPlayed: true
}), false);

const welcomeLines = buildAiWelcomeIntroLines('你好，我是三桂博客AI助理。');
assert.equal(welcomeLines[0], '你好，我是三桂博客AI助理。');
assert.match(welcomeLines[1], /总结文章/);
assert.equal(welcomeLines[2], '直接输入问题即可开始对话。');

console.log('aiWelcomeIntro tests passed');
