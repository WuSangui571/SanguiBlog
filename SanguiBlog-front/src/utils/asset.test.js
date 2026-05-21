import assert from 'node:assert/strict';
import { buildAssetUrl } from './asset.js';

const setWindow = ({ origin = 'http://localhost', protocol = 'http:', assetOrigin = '' } = {}) => {
    globalThis.window = {
        location: { origin, protocol },
    };
    if (assetOrigin) {
        globalThis.window.__SG_ASSET_ORIGIN__ = assetOrigin;
    }
};

setWindow();
assert.equal(
    buildAssetUrl('/uploads/covers/a.png'),
    'http://localhost/uploads/covers/a.png'
);

setWindow({ assetOrigin: '/uploads' });
assert.equal(
    buildAssetUrl('/uploads/covers/a.png'),
    '/uploads/covers/a.png'
);
assert.equal(
    buildAssetUrl('covers/a.png'),
    '/uploads/covers/a.png'
);
assert.equal(
    buildAssetUrl('/avatar/a.jpg'),
    '/uploads/avatar/a.jpg'
);

setWindow({ assetOrigin: 'http://cdn.example.com/uploads' });
assert.equal(
    buildAssetUrl('/uploads/covers/a.png'),
    'http://cdn.example.com/uploads/covers/a.png'
);

delete globalThis.window;
