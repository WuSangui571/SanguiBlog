import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');
const apiSource = fs.readFileSync(path.join(srcDir, 'api.js'), 'utf8');
const sharedSource = fs.readFileSync(path.join(srcDir, 'appfull', 'shared.js'), 'utf8');

assert.match(apiSource, /import \{ getRedirectSourceMeta \} from "\.\/utils\/analyticsReferrer\.js";/);
assert.match(sharedSource, /import \{ getRedirectSourceMeta \} from '\.\.\/utils\/analyticsReferrer\.js';/);
assert.match(apiSource, /const redirectSourceMeta = getRedirectSourceMeta\(\);/);
assert.match(apiSource, /\(redirectSourceMeta && redirectSourceMeta\.referrer\) \|\| prevUrl \|\| docReferrer/);
assert.match(apiSource, /if \(redirectSourceMeta && redirectSourceMeta\.sourceLabel\) \{/);
assert.match(sharedSource, /const redirectSourceMeta = getRedirectSourceMeta\(\);/);
assert.match(sharedSource, /if \(redirectSourceMeta\) \{\s*return redirectSourceMeta;\s*\}/);

console.log('analytics redirect referrer integration tests passed');
