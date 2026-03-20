import assert from 'node:assert/strict';

import { consumeSseStream } from './aiStream.js';

const encoder = new TextEncoder();

const createReader = (chunks) => {
    let index = 0;
    return {
        async read() {
            if (index >= chunks.length) {
                return { value: undefined, done: true };
            }
            const chunk = chunks[index++];
            return { value: encoder.encode(chunk), done: false };
        },
        async cancel() {
            return undefined;
        }
    };
};

const errors = [];

try {
    await consumeSseStream({
        reader: createReader([
            'event: error\n',
            'data: {"message":"提问太快了，请稍后再试","retryAfterSeconds":9}\n\n'
        ]),
        onError: (payload) => errors.push(payload)
    });
    assert.fail('consumeSseStream should throw on terminal error');
} catch (error) {
    assert.equal(error.message, '提问太快了，请稍后再试');
    assert.equal(error.payload.retryAfterSeconds, 9);
}

assert.equal(errors.length, 1);
assert.equal(errors[0].message, '提问太快了，请稍后再试');
assert.equal(errors[0].retryAfterSeconds, 9);

console.log('aiStream tests passed');
