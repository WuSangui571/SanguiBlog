import assert from 'node:assert/strict';

import { consumeSseStream } from './aiStream.js';

class FakeReader {
    constructor(steps) {
        this.steps = steps;
        this.index = 0;
        this.cancelled = false;
    }

    async read() {
        if (this.index >= this.steps.length) {
            return { value: undefined, done: true };
        }

        const step = this.steps[this.index++];
        if (step instanceof Error) {
            throw step;
        }

        return step;
    }

    async cancel() {
        this.cancelled = true;
    }
}

const encoder = new TextEncoder();

const completeThenDisconnectReader = new FakeReader([
    {
        value: encoder.encode('event: chunk\ndata: {"text":"你好"}\n\n'),
        done: false
    },
    {
        value: encoder.encode('event: complete\ndata: {"reply":"你好，世界"}\n\n'),
        done: false
    },
    new Error('network error')
]);

const chunks = [];
const completes = [];
const errors = [];

await consumeSseStream({
    reader: completeThenDisconnectReader,
    onChunk: (chunk) => chunks.push(chunk),
    onComplete: (payload) => completes.push(payload),
    onError: (message) => errors.push(message)
});

assert.deepEqual(chunks, ['你好']);
assert.equal(completes.length, 1);
assert.equal(completes[0].reply, '你好，世界');
assert.deepEqual(errors, []);
assert.equal(completeThenDisconnectReader.cancelled, true);
