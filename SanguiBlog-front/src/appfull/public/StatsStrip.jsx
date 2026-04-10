import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Clock, Eye, FileText, Hash, MessageSquare } from 'lucide-react';
import { SITE_STATS } from "../shared.js";

export function formatStatusExactMinute(value) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || text === '-') return '暂无';

    const matched = text.match(/^(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2}):(\d{2})/);
    if (matched) {
        const [, year, month, day, hour, minute] = matched;
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
        return text;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hour = String(parsed.getHours()).padStart(2, '0');
    const minute = String(parsed.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
}

function buildTooltipPosition(buttonRect) {
    if (!buttonRect) return null;
    return {
        left: buttonRect.left + buttonRect.width / 2,
        top: buttonRect.bottom + 14,
    };
}

const StatsStrip = ({ isDarkMode, stats }) => {
    const s = stats || SITE_STATS;
    const [lastUpdatedTooltipOpen, setLastUpdatedTooltipOpen] = useState(false);
    const [lastUpdatedTooltipStyle, setLastUpdatedTooltipStyle] = useState(null);
    const lastUpdatedButtonRef = useRef(null);

    const items = [
        { label: "文章", value: s.posts, icon: FileText, color: "text-[#6366F1]" },
        { label: "浏览", value: s.views, icon: Eye, color: "text-[#FF0080]" },
        { label: "评论", value: s.comments, icon: MessageSquare, color: "text-[#00E096]" },
        { label: "标签", value: s.tags, icon: Hash, color: "text-[#FFD700]" },
        {
            label: "最后更新",
            value: s.lastUpdated,
            fullValue: s.lastUpdatedFull,
            icon: Clock,
            color: "text-gray-500",
            isDate: true,
        },
    ];

    const lastUpdatedExactText = useMemo(
        () => formatStatusExactMinute(s.lastUpdatedFull || s.lastUpdated),
        [s.lastUpdated, s.lastUpdatedFull]
    );

    const textClass = isDarkMode ? 'text-white' : 'text-black';
    const subClass = isDarkMode ? 'text-gray-300' : 'text-gray-700';
    const tooltipBg = isDarkMode ? 'bg-[#0f172a]/92 border-white/20 text-gray-100' : 'bg-white/92 border-white/75 text-black';
    const tooltipArrow = isDarkMode ? 'border-b-[#0f172a]' : 'border-b-white';
    const glassClass = `home-ios-card home-ios-card--static ${isDarkMode ? 'home-ios-card--dark' : ''}`;

    const syncTooltipPosition = () => {
        const rect = lastUpdatedButtonRef.current?.getBoundingClientRect();
        setLastUpdatedTooltipStyle(buildTooltipPosition(rect));
    };

    useEffect(() => {
        if (!lastUpdatedTooltipOpen) return undefined;

        syncTooltipPosition();
        const handleViewportChange = () => syncTooltipPosition();
        window.addEventListener('scroll', handleViewportChange, true);
        window.addEventListener('resize', handleViewportChange);

        return () => {
            window.removeEventListener('scroll', handleViewportChange, true);
            window.removeEventListener('resize', handleViewportChange);
        };
    }, [lastUpdatedTooltipOpen]);

    const openTooltip = () => {
        syncTooltipPosition();
        setLastUpdatedTooltipOpen(true);
    };

    const closeTooltip = () => {
        setLastUpdatedTooltipOpen(false);
    };

    const tooltipLayer = lastUpdatedTooltipOpen && lastUpdatedTooltipStyle && typeof document !== 'undefined'
        ? createPortal(
            <div
                className={`pointer-events-none z-[140] ${tooltipBg} border px-3 py-2 text-sm font-bold whitespace-nowrap rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.16)]`}
                style={{
                    position: 'fixed',
                    left: lastUpdatedTooltipStyle.left,
                    top: lastUpdatedTooltipStyle.top,
                    transform: 'translateX(-50%)',
                }}
            >
                <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 ${tooltipArrow}`} />
                {lastUpdatedExactText}
            </div>,
            document.body
        )
        : null;

    return (
        <>
            <div
                id="home-status-strip"
                className="sticky z-40 px-3 pt-2 md:px-5 md:pt-3"
                style={{ top: 0, scrollMarginTop: 0 }}
            >
                <div className={`${glassClass} max-w-7xl mx-auto px-4 py-3 sm:py-2`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className={`flex items-center gap-2 sm:mr-8 flex-shrink-0 ${textClass}`}>
                            <Activity className="text-[#00E096] animate-pulse" />
                            <span className="font-black tracking-widest uppercase">System Status</span>
                        </div>

                        <div className="flex items-center gap-3 md:gap-4 overflow-x-auto sm:overflow-visible w-full sm:w-auto pb-1 sm:pb-0 pr-1 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
                            {items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center gap-2 flex-shrink-0 group cursor-default relative snap-start ${subClass} home-ios-chip px-2.5 py-1.5`}
                                >
                                    <item.icon size={15} className={`${item.color} group-hover:scale-125 transition-transform`} />

                                    {item.isDate ? (
                                        <div className="relative">
                                            <button
                                                ref={lastUpdatedButtonRef}
                                                type="button"
                                                onMouseEnter={() => openTooltip()}
                                                onMouseLeave={() => closeTooltip()}
                                                onFocus={() => openTooltip()}
                                                onBlur={() => closeTooltip()}
                                                onClick={() => setLastUpdatedTooltipOpen((prev) => {
                                                    if (!prev) {
                                                        syncTooltipPosition();
                                                    }
                                                    return !prev;
                                                })}
                                                className={`font-mono font-bold text-sm border-b border-dashed transition-colors ${isDarkMode ? 'border-gray-400 text-gray-100 hover:text-white' : 'border-gray-500 text-gray-800 hover:text-black'}`}
                                                aria-label="查看最后更新时间"
                                                aria-expanded={lastUpdatedTooltipOpen}
                                            >
                                                {item.value}
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="font-mono font-bold text-sm">{item.value}</span>
                                    )}

                                    <span className={`text-[11px] font-bold ${subClass}`}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {tooltipLayer}
        </>
    );
};

export default StatsStrip;
