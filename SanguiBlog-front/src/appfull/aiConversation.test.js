import assert from 'node:assert/strict';

import { AI_CONVERSATION_STORAGE_KEY, resolveAiConversationId } from './aiConversation.js';

const createMemoryStorage = () => {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        }
    };
};

const storage = createMemoryStorage();
const firstId = resolveAiConversationId(storage);
const secondId = resolveAiConversationId(storage);

assert.ok(firstId);
assert.equal(firstId, secondId);
assert.equal(storage.getItem(AI_CONVERSATION_STORAGE_KEY), firstId);
