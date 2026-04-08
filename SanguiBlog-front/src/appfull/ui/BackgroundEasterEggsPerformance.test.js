import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'BackgroundEasterEggs.jsx'), 'utf8');

assert.match(source, /const \[mobilePerformanceMode, setMobilePerformanceMode\] = useState\(false\)/);
assert.match(source, /window\.matchMedia\('\(max-width: 768px\)'\)/);
assert.match(source, /const starCount = mobilePerformanceMode \? 0 : \(fixed \? 18 : 10\)/);
assert.doesNotMatch(source, /transition=\{prefersReducedMotion \? undefined : \{ duration: 3\.5 \+ Math\.random\(\) \* 2\.2, repeat: Infinity/);

console.log('BackgroundEasterEggs performance tests passed');
