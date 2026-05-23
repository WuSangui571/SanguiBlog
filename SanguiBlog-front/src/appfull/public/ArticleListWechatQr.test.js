import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projDir = path.resolve(__dirname, '..', '..', '..');
const articleListPath = path.resolve(__dirname, 'ArticleList.jsx');
const sharedPath = path.resolve(__dirname, '..', 'shared.js');
const profilePath = path.resolve(__dirname, '..', '..', 'pages', 'admin', 'Profile.jsx');
const apiPath = path.resolve(projDir, 'src', 'api.js');

function readFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
}

let failures = 0;

function assert(condition, message) {
    if (!condition) {
        console.error(`FAIL: ${message}`);
        failures++;
    } else {
        console.log(`OK: ${message}`);
    }
}

// 1. ArticleList uses displayAuthor.wechatQr as primary QR source, /contact/wechat.jpg only as fallback
const articleList = readFile(articleListPath);
assert(articleList.includes('displayAuthor.wechatQr'), 'ArticleList should use displayAuthor.wechatQr for QR');
assert(articleList.includes('buildMediaUrl("/contact/wechat.jpg")'), 'ArticleList should keep /contact/wechat.jpg as legacy fallback');

// 2. ArticleList uses displayAuthor.wechatQr for QR source resolution
assert(articleList.includes('authorWechatQr'), 'ArticleList should resolve authorWechatQr from displayAuthor');
assert(articleList.includes('wechatQrImgError'), 'ArticleList should track wechatQrImgError state');
assert(articleList.includes('超级管理员暂未设置微信二维码'), 'ArticleList should show empty-state text when QR fails');
assert(articleList.includes('onError={() => setWechatQrImgError(true)}'), 'ArticleList should handle image onError');

// 3. ArticleList fallback chain uses /contact/wechat.jpg only as legacy default
assert(articleList.includes('/contact/wechat.jpg'), 'ArticleList should still reference /contact/wechat.jpg as legacy fallback');

// 4. MOCK_USER has top-level wechatQr field
const shared = readFile(sharedPath);
assert(shared.includes('wechatQr: "/contact/wechat.jpg"'), 'MOCK_USER should have top-level wechatQr field');

// 5. api.js exports adminUploadWechatQr and adminDeleteWechatQr
const api = readFile(apiPath);
assert(api.includes('export const adminUploadWechatQr'), 'api.js should export adminUploadWechatQr');
assert(api.includes('export const adminDeleteWechatQr'), 'api.js should export adminDeleteWechatQr');
assert(api.includes('/api/admin/site/wechat-qr'), 'api.js should reference /api/admin/site/wechat-qr path');

// 6. Profile.jsx gates QR block by SUPER_ADMIN role
const profile = readFile(profilePath);
assert(profile.includes('currentUser?.role === "SUPER_ADMIN"'), 'Profile.jsx should gate QR block by SUPER_ADMIN role');
assert(profile.includes('handleQrUpload'), 'Profile.jsx should have handleQrUpload');
assert(profile.includes('handleQrDelete'), 'Profile.jsx should have handleQrDelete');
assert(profile.includes('QrCode'), 'Profile.jsx should use QrCode icon');
assert(!profile.includes('window.confirm') && !profile.includes('window.alert'), 'Profile.jsx should not use native dialogs');

if (failures > 0) {
    console.error(`\n${failures} test(s) FAILED`);
    throw new Error(`${failures} WeChat QR contract test(s) failed`);
} else {
    console.log('\nAll WeChat QR contract tests passed');
}
