import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appFullSource = fs.readFileSync(path.join(__dirname, '..', 'AppFull.jsx'), 'utf8');
const adminPanelSource = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');

assert.match(adminPanelSource, /if\s*\(\s*activeSettingsTab\s*!==\s*['"]games['"]\s*\)\s*return/,
    'Expected admin game list loading to run only when the games settings tab is active');
assert.match(adminPanelSource, /\[\s*activeSettingsTab\s*,\s*loadGames\s*\]/,
    'Expected admin game list loading effect to depend on activeSettingsTab and loadGames');
assert.doesNotMatch(appFullSource, /loadGameList=\{loadGameList\}/,
    'Expected public /tools loadGameList not to be passed into AdminPanel');
assert.doesNotMatch(adminPanelSource, /onGameChanged=\{loadGameList\}/,
    'Expected AdminPanel settings route not to bind admin game changes to public /tools loading');
