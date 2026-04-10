import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'ScrollToTop.jsx'), 'utf8');

assert.match(source, /backdrop-blur-\[18px\]/);
assert.match(source, /ring-1/);
assert.match(source, /shadow-\[0_18px_48px_rgba\(15,23,42,0\.18\)\]/);
assert.match(source, /fixed z-50 p-3 rounded-full/);
assert.match(source, /const \[isMobileViewport, setIsMobileViewport\] = useState/);
assert.match(source, /if \(isMobileViewport\) return null;/);
assert.doesNotMatch(source, /shadow-\[6px_6px_0px_0px_rgba\(0,0,0,0\.45\)\]/);
assert.doesNotMatch(source, /bg-\[#FF0080\]/);

console.log('ScrollToTop tests passed');
