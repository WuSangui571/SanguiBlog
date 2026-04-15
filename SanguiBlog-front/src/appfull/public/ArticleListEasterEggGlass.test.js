import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/public/ArticleList.jsx'), 'utf8');

assert.match(
    source,
    /import GlassPopupToast, \{ getGlassPopupToastTop \} from "\.\.\/ui\/GlassPopupToast\.jsx";/,
    '博主头像短提示应复用现有 GlassPopupToast 玻璃弹出模板'
);

assert.match(
    source,
    /<GlassPopupToast[\s\S]*open=\{showSpinWarning\}[\s\S]*>\s*<span className="block w-full text-center text-base font-black tracking-\[0\.08em\]">[\s\S]*\{spinWarning\}[\s\S]*<\/span>\s*<\/GlassPopupToast>/,
    '头像彩蛋短提示应通过玻璃模板只展示居中放大的动态提示文案'
);

assert.doesNotMatch(
    source,
    /title="头像彩蛋"/,
    '头像彩蛋短提示不应再显示“头像彩蛋”标题'
);

assert.doesNotMatch(
    source,
    /description=\{spinWarning\}/,
    '头像彩蛋短提示不应再把随机文案放在默认副标题区域'
);

assert.doesNotMatch(
    source,
    /SPIN ALERT/,
    '头像彩蛋不应继续显示旧的 SPIN ALERT 黑边弹层标题'
);

assert.match(
    source,
    /眼冒金星模式[\s\S]*home-ios-card home-ios-card--static/,
    '眼冒金星模式中心提示应适配站点玻璃卡片风格'
);

assert.doesNotMatch(
    source,
    /border-4 border-\[#FFD700\] bg-\[#0f172a\]/,
    '眼冒金星模式不应继续使用旧黑底粗边框卡片'
);

console.log('ArticleList easter egg glass tests passed');
