import assert from 'node:assert/strict';

import { copyTextWithFallback } from './clipboardCopy.js';

async function testClipboardSuccess() {
    let clipboardText = '';
    const result = await copyTextWithFallback('hello world', {
        navigatorObject: {
            clipboard: {
                async writeText(value) {
                    clipboardText = value;
                }
            }
        },
        documentObject: null
    });

    assert.equal(result.method, 'clipboard');
    assert.equal(clipboardText, 'hello world');
}

async function testFallbackWhenClipboardRejected() {
    let selected = false;
    let removed = false;
    let appended = false;
    let copied = false;
    const textarea = {
        value: '',
        style: {},
        setAttribute() {},
        select() {
            selected = true;
        }
    };

    const result = await copyTextWithFallback('fallback text', {
        navigatorObject: {
            clipboard: {
                async writeText() {
                    throw new Error('clipboard denied');
                }
            }
        },
        documentObject: {
            createElement(tag) {
                assert.equal(tag, 'textarea');
                return textarea;
            },
            body: {
                appendChild(node) {
                    appended = true;
                    assert.equal(node, textarea);
                },
                removeChild(node) {
                    removed = true;
                    assert.equal(node, textarea);
                }
            },
            execCommand(command) {
                copied = command === 'copy';
                return true;
            }
        }
    });

    assert.equal(result.method, 'fallback');
    assert.equal(textarea.value, 'fallback text');
    assert.equal(selected, true);
    assert.equal(appended, true);
    assert.equal(removed, true);
    assert.equal(copied, true);
}

await testClipboardSuccess();
await testFallbackWhenClipboardRejected();

console.log('clipboardCopy tests passed');
