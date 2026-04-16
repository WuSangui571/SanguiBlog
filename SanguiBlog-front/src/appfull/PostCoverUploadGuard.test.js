import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminPanelSource = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');
const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');

assert.match(
    adminPanelSource,
    /const canPublish = Boolean\([\s\S]*!coverUploading[\s\S]*\)/,
    '新建文章时，封面仍在上传中应禁止发布，避免空 coverImage 落库'
);

assert.match(
    adminPanelSource,
    /const canSave = Boolean\([\s\S]*!coverUploading[\s\S]*\)/,
    '编辑文章时，封面仍在上传中应禁止保存，避免空 coverImage 覆盖已有封面'
);

assert.match(
    adminPanelSource,
    /coverUploading \? '封面上传中\.\.\.' : submitting \? "发布中\.\.\." : "发布文章"/,
    '发布按钮应明确提示封面上传中，而不是让用户误以为可以继续发布'
);

assert.match(
    adminPanelSource,
    /coverUploading \? '封面上传中\.\.\.' : saving \? '保存中\.\.\.' : '保存修改'/,
    '保存按钮应明确提示封面上传中，而不是让用户误以为可以继续保存'
);

assert.match(
    apiSource,
    /POST_COVER_UPLOAD_TIMEOUT_MS/,
    '封面上传请求应有超时兜底，避免前端长期停留在上传中'
);

assert.match(
    apiSource,
    /AbortController/,
    '封面上传请求应使用 AbortController 主动结束悬挂请求'
);

console.log('PostCoverUploadGuard tests passed');
