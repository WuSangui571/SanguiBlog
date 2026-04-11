import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'homeRedesign.css'), 'utf8');
const heroSource = fs.readFileSync(path.join(__dirname, 'Hero.jsx'), 'utf8');

assert.match(source, /@media \(max-width: 640px\)/);
assert.match(source, /@media \(max-width: 640px\)[\s\S]*?\.home-hero__headline \{[\s\S]*?text-align: center;/);
assert.match(source, /@media \(max-width: 640px\)[\s\S]*?\.home-hero__headline \{[\s\S]*?max-width: min\(92vw, 9\.6em\);/);
assert.match(
    heroSource,
    /在这里把问题\s*<br className="home-hero__mobile-break" \/>\s*想清楚，/,
    'Hero 手机端应在“在这里把问题”和“想清楚，”之间提供受控换行'
);
assert.match(
    source,
    /\.home-hero__mobile-break \{\s*display: none;\s*\}/,
    '受控换行默认隐藏，避免影响桌面端两行标题'
);
assert.match(
    source,
    /@media \(max-width: 640px\)[\s\S]*?\.home-hero__mobile-break \{\s*display: block;\s*\}/,
    '受控换行只在手机端显示'
);

console.log('Hero mobile headline tests passed');
