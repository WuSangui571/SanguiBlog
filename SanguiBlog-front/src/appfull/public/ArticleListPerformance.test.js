import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'ArticleList.jsx'), 'utf8');

assert.match(source, /const NEW_BADGE_ACTIVE_MS = 7000/);
assert.match(source, /const \[newBadgeMotionEnabled, setNewBadgeMotionEnabled\] = useState\(true\)/);
assert.match(source, /setTimeout\(\(\) => setNewBadgeMotionEnabled\(false\), NEW_BADGE_ACTIVE_MS\)/);
assert.match(source, /const \[mobilePerformanceMode, setMobilePerformanceMode\] = useState\(false\)/);
assert.match(source, /window\.matchMedia\('\(max-width: 768px\)'\)/);
assert.match(source, /disableEffects=\{cardEffectsDisabled\}/);

console.log('ArticleList performance tests passed');
