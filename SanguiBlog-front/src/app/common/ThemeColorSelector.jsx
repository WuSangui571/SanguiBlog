import React, {useMemo} from 'react';

export const THEME_COLOR_PRESETS = [
    'bg-[#00E096]',
    'bg-[#6366F1]',
    'bg-[#FF0080]',
    'bg-[#FFD700]',
    'bg-[#0EA5E9]',
    'bg-[#F97316]',
];

export const DEFAULT_THEME_COLOR = 'bg-[#6366F1]';

export const extractHexFromBgClass = (value = '', fallback = '#6366F1') => {
    if (typeof value !== 'string') return fallback;
    const match = value.match(/#([0-9a-fA-F]{6})/);
    return match ? `#${match[1].toUpperCase()}` : fallback;
};

export const formatBgClassFromHex = (hex) => {
    if (!hex) return DEFAULT_THEME_COLOR;
    const normalized = hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
    return `bg-[${normalized}]`;
};

const ThemeColorSelector = ({value, onChange, inputClass, isDarkMode}) => {
    const selectedHex = useMemo(() => extractHexFromBgClass(value, '#6366F1'), [value]);

    return (
        <div className="space-y-3">
            <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>主题色（可选）</label>
            <input
                className={inputClass}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="bg-[#FF0080]"
            />
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={selectedHex}
                        onChange={(e) => onChange(formatBgClassFromHex(e.target.value))}
                        className="w-12 h-12 border-2 border-black rounded cursor-pointer"
                        title="自定义颜色"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">色盘会自动转换为 bg[#HEX] 形式</span>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                {THEME_COLOR_PRESETS.map((preset) => {
                    const presetHex = extractHexFromBgClass(preset);
                    const isActive = preset === value;
                    return (
                        <button
                            type="button"
                            key={preset}
                            aria-label={`选择颜色 ${presetHex}`}
                            onClick={() => onChange(preset)}
                            className={`w-10 h-10 rounded-full border-2 ${isActive ? 'border-black scale-110' : 'border-transparent'} shadow-[2px_2px_0px_0px_#000] transition-transform`}
                            style={{backgroundColor: presetHex}}
                        />
                    );
                })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">示例：bg[#FF0080]；也可直接填写 Tailwind 自定义类。</p>
        </div>
    );
};

export default ThemeColorSelector;
