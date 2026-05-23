import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appFullSource = fs.readFileSync(path.join(__dirname, '..', 'AppFull.jsx'), 'utf8');
const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');

// 1) gameListLoaded success state and one-shot auto-load attempt guard exist
assert.match(appFullSource, /gameListLoaded/,
    'Expected gameListLoaded state to be present in AppFull.jsx');
assert.match(appFullSource, /gameListCache\.loaded\s*=\s*true/,
    'Expected successful fetch to mark the shared game list cache as loaded');
assert.match(appFullSource, /setGameListLoaded\s*\(\s*gameListCache\.loaded\s*\)/,
    'Expected component state to sync loaded status from the shared game list cache');
assert.match(appFullSource, /useState\s*\(\s*\(\s*\)\s*=>\s*gameListCache\.loaded\s*\)/,
    'Expected gameListLoaded to initialize from the shared game list cache');
assert.match(appFullSource, /gameListLoadAttempted/,
    'Expected gameListLoadAttempted guard to prevent automatic error retry loops');
assert.match(appFullSource, /setGameListLoadAttempted\s*\(\s*true\s*\)/,
    'Expected loadGameList to mark that a load has been attempted');
assert.match(appFullSource, /const\s+gameListCache\s*=\s*\{/,
    'Expected module-level gameListCache to survive AppFull remounts');
assert.match(appFullSource, /if\s*\(\s*gameListCache\.promise\s*\)/,
    'Expected loadGameList to coalesce in-flight /api/games requests');
assert.match(appFullSource, /gameListCache\.loading\s*=\s*false[\s\S]*gameListCache\.promise\s*=\s*null/,
    'Expected shared request promise to finish only after loading is cleared');

// 2) The view === 'games' effect uses explicit guards, NOT gameList.length === 0
assert.match(appFullSource, /view\s*===\s*['"]games['"]/,
    'Expected view === \'games\' branch to exist');
assert.match(appFullSource, /!gameListLoaded/,
    'Expected effect guard to use !gameListLoaded');
assert.match(appFullSource, /!gameListLoadAttempted/,
    'Expected effect guard to use !gameListLoadAttempted');
assert.match(appFullSource, /!gameListLoaded\s*&&\s*\(\s*!gameListLoadAttempted\s*\|\|\s*gameListLoading\s*\)/,
    'Expected view === \'games\' effect guard to join an in-flight StrictMode game list request');

// Extract the effect block between the view-switching useEffect and verify its games branch
const viewEffectMatch = appFullSource.match(/useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?view\s*===\s*['"]games['"]\s*\)\s*\{[\s\S]*?\}\s*else[\s\S]*?\},\s*\[[\s\S]*?\]\s*\)/);
if (viewEffectMatch) {
    const effectBlock = viewEffectMatch[0];
    // Within the 'games' branch of the effect, gameList.length should not be used as guard
    const gamesBranch = effectBlock.match(/view\s*===\s*['"]games['"]\s*\)\s*\{([\s\S]*?)\}\s*else/);
    if (gamesBranch) {
        assert.doesNotMatch(gamesBranch[1], /gameList\s*\.\s*length\s*===\s*0/,
            'Expected view === \'games\' effect guard NOT to depend on gameList.length === 0');
    }
}

// 3) The dependency array includes explicit guards, not gameList.length
assert.match(appFullSource, /gameListLoadAttempted\s*,\s*gameListLoaded\s*,\s*gameListLoading/,
    'Expected effect dependency array to include explicit list-load guards');

// 4) The empty-state text is present in renderGamesView
assert.match(appFullSource, /还没有发布的独立页面/,
    'Expected empty-state text to remain in renderGamesView');
assert.match(appFullSource, /showGameListEmpty\s*=\s*!gameListLoading\s*&&\s*gameListLoaded\s*&&\s*!gameListError\s*&&\s*gameList\.length\s*===\s*0/,
    'Expected empty-state rendering to wait for loaded-empty success instead of showing before the first request');
assert.match(appFullSource, /\{showGameListEmpty\s*&&\s*\(/,
    'Expected empty-state JSX to use the loaded-empty guard');

// 5) No GlassPopupToast usage in the empty-state rendering path
// The empty-state path should not trigger GlassPopupToast for tools list
const gamesViewBlockMatch = appFullSource.match(/renderGamesView\s*=\s*\([^)]*\)\s*\{[\s\S]*?^\s*\};\s*$/m);
const gamesViewBlock = gamesViewBlockMatch ? gamesViewBlockMatch[0] : '';
if (gamesViewBlock) {
    assert.doesNotMatch(gamesViewBlock, /GlassPopupToast/,
        'Expected renderGamesView not to use GlassPopupToast');
}

// 6) /games must be in the public GET stale-token no-auth retry whitelist
assert.match(apiSource, /RETRY_NO_AUTH_ON_401_PATHS\s*=\s*\[[\s\S]*?"\/games"[\s\S]*?\]/,
    'Expected /games to be in RETRY_NO_AUTH_ON_401_PATHS for public stale-token retry');

// 7) Verify shouldRetryNoAuthOn401 uses startsWith, so /admin/games is NOT accidentally made public
assert.match(apiSource, /shouldRetryNoAuthOn401\s*=\s*\(path\s*=\s*""\)\s*=>\s*RETRY_NO_AUTH_ON_401_PATHS\.some\(\(prefix\)\s*=>\s*path\.startsWith\(prefix\)\)/,
    'Expected shouldRetryNoAuthOn401 to use path.startsWith(prefix) for prefix matching');
// "/admin/games" does not start with "/games", so it is safe — verify the whitelist does not contain "/admin/"
const retryPatternsMatch = apiSource.match(/const\s+RETRY_NO_AUTH_ON_401_PATHS\s*=\s*\[([\s\S]*?)\]\s*;/);
if (retryPatternsMatch) {
    assert.doesNotMatch(retryPatternsMatch[1], /\/admin/,
        'Expected RETRY_NO_AUTH_ON_401_PATHS to NOT contain /admin paths');
}
