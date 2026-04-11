import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'AiMessageMarkdown.js'), 'utf8');

assert.match(source, /sg-ai-message-text/);
assert.match(source, /remarkPlugins:\s*\[remarkGfm]/);
assert.match(source, /rehypePlugins:\s*\[\[rehypeSanitize,\s*SG_REHYPE_SANITIZE_SCHEMA]]/);
assert.match(source, /React\.createElement\(MarkdownCodeBlock/);
assert.doesNotMatch(source, /shadow-\[6px_6px_0px_0px_#000\]/);

console.log('AiMessageMarkdown tests passed');
