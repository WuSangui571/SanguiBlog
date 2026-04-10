import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetSource = fs.readFileSync(path.join(__dirname, 'AiAssistantWidget.jsx'), 'utf8');

assert.match(widgetSource, /window\.visualViewport/);
assert.match(widgetSource, /const \[mobileViewportRect, setMobileViewportRect\] = useState/);
assert.match(widgetSource, /const handleTextareaFocus = useCallback/);
assert.match(widgetSource, /onFocus=\{handleTextareaFocus\}/);
assert.match(
    widgetSource,
    /!\s*isMobileViewport\s*&&\s*\([\s\S]*assistantConfig\.title[\s\S]*Beta/,
    '移动端头部不应继续渲染标题与 Beta 文案'
);
assert.doesNotMatch(widgetSource, /height:\s*'100vh'/);

console.log('AiAssistant mobile viewport tests passed');
