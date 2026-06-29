import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');

const extractAiAdminAuditView = () => {
    const startMarker = 'const AiAdminAuditView = ({ isDarkMode, user }) => {';
    const idx = adminSource.indexOf(startMarker);
    if (idx === -1) return '';
    const start = idx + startMarker.length;
    let depth = 1;
    let i = start;
    while (i < adminSource.length && depth > 0) {
        if (adminSource[i] === '{') depth++;
        else if (adminSource[i] === '}') depth--;
        i++;
    }
    return adminSource.slice(idx, i);
};

const apiAuditSessionStart = apiSource.indexOf('export const adminFetchAiAuditSessions');
const apiAfterExport = apiSource.slice(apiAuditSessionStart);
const apiAuditSessionEnd = apiAfterExport.indexOf('export const adminFetchAiAuditSessionDetail');
const apiAuditSessionBody = apiAuditSessionEnd > 0
    ? apiAfterExport.slice(0, apiAuditSessionEnd)
    : apiAfterExport.slice(0, Math.min(600, apiAfterExport.length));

// 1) api.js contract
assert.ok(apiAuditSessionBody.includes('/admin/ai-chat/sessions'),
    'adminFetchAiAuditSessions should target /admin/ai-chat/sessions');
assert.ok(apiAuditSessionBody.includes('page = 1') || apiAuditSessionBody.includes('page=1'),
    'adminFetchAiAuditSessions should destructure page');
assert.ok(apiAuditSessionBody.includes('search.append("page"') || apiAuditSessionBody.includes("search.append('page'"),
    'adminFetchAiAuditSessions should append page to URLSearchParams');
assert.ok(apiAuditSessionBody.includes('search.append("size"') || apiAuditSessionBody.includes("search.append('size'"),
    'adminFetchAiAuditSessions should append size to URLSearchParams');

// 2) AiAdminAuditView paginated state
const viewSource = extractAiAdminAuditView();
assert.ok(viewSource.length > 500, 'AiAdminAuditView should be present in AdminPanel.jsx');

// 2a) State includes page, size, total
assert.ok(viewSource.includes('const [page, setPage] = useState(1)'),
    'AiAdminAuditView should declare page state');
assert.ok(viewSource.includes('const [total, setTotal] = useState(0)'),
    'AiAdminAuditView should declare total state');
assert.ok(viewSource.includes('const size = 20'),
    'AiAdminAuditView should declare size = 20');

// 2b) loadSessions calls adminFetchAiAuditSessions with page/size/visibility/identity
assert.ok(viewSource.includes('adminFetchAiAuditSessions'),
    'AiAdminAuditView should call adminFetchAiAuditSessions');
assert.ok(viewSource.includes('data?.records'),
    'AiAdminAuditView should read data.records from PageResponse');
assert.ok(viewSource.includes('const auditSessionRequestSeq = useRef(0)'),
    'AiAdminAuditView should track AI audit list request sequence');
assert.ok(viewSource.includes('requestId !== auditSessionRequestSeq.current'),
    'AiAdminAuditView should ignore stale AI audit list responses');
assert.ok(viewSource.includes('[page, visibilityFilter, authFilter, loadSessions]'),
    'AiAdminAuditView should load sessions from one state-driven effect');
assert.ok(viewSource.includes('const sessionListScrollRef = useRef(null)'),
    'AiAdminAuditView should keep a ref to the scrollable AI audit session list');
assert.ok(viewSource.includes('scrollSessionListToTop'),
    'AiAdminAuditView should reset the session list scroll position after page data loads');
assert.ok(viewSource.includes('ref={sessionListScrollRef}'),
    'AiAdminAuditView should attach the scroll ref to the scrollable session list');
assert.ok(!viewSource.includes('useEffect(() => {\n        loadSessions();\n    }, []);'),
    'AiAdminAuditView should not fire a separate mount-only sessions load');
assert.ok(!viewSource.includes('loadSessions(1, visibilityFilter, authFilter)'),
    'AiAdminAuditView should not fire a second filter-change request outside the state-driven effect');

// 2c) No client-side filteredSessions proxy
assert.ok(!viewSource.includes('filteredSessions'),
    'AiAdminAuditView should not have client-side filteredSessions');

// 2d) Filter changes reset page to 1
assert.ok(viewSource.includes('setPage(1)'),
    'AiAdminAuditView should reset page to 1 on filter change');

// 2e) Page navigation controls
assert.ok(viewSource.includes('上一页'),
    'AiAdminAuditView should have 上一页 button');
assert.ok(viewSource.includes('下一页'),
    'AiAdminAuditView should have 下一页 button');
assert.ok(viewSource.includes('setPage((current) => Math.max(current - 1, 1))'),
    'AiAdminAuditView previous page button should update page state');
assert.ok(viewSource.includes('setPage((current) => Math.min(current + 1, totalPages))'),
    'AiAdminAuditView next page button should update page state');

// 2f) Rendered list uses sessions directly (not filteredSessions)
assert.ok(viewSource.includes('{sessions.map((session) =>'),
    'AiAdminAuditView should map over sessions directly');

// 2g) Total count display
assert.ok(viewSource.includes('共') && viewSource.includes('{total}'),
    'AiAdminAuditView should display total count');

// 3) No native dialogs introduced
assert.ok(!viewSource.includes('window.confirm'),
    'AiAdminAuditView should not use window.confirm');
assert.ok(!viewSource.includes('window.alert'),
    'AiAdminAuditView should not use window.alert');

console.log('PASS: AdminAiAuditPagination.test.js - all assertions passed');
