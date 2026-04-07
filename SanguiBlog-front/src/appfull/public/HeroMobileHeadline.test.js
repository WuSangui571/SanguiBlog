import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'homeRedesign.css'), 'utf8');

assert.match(source, /@media \(max-width: 640px\)/);
assert.match(source, /@media \(max-width: 640px\)[\s\S]*?\.home-hero__headline \{[\s\S]*?text-align: center;/);
assert.match(source, /@media \(max-width: 640px\)[\s\S]*?\.home-hero__headline \{[\s\S]*?max-width: min\(92vw, 9\.6em\);/);

console.log('Hero mobile headline tests passed');
