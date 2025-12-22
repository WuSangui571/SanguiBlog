import React from 'react';
import { useLayoutOffsets } from "../../contexts/LayoutOffsetContext.jsx";
import { SITE_STATS } from "../shared.js";
import { Activity, Clock, Eye, FileText, Hash, MessageSquare } from 'lucide-react';const StatsStrip = ({ isDarkMode, stats }) => {
    const { headerHeight } = useLayoutOffsets();
    const s = stats || SITE_STATS;
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
    const bg = isDarkMode ? 'bg-gray-900' : 'bg-black';
    const text_cls = isDarkMode ? 'text-white' : 'text-white';
    const tooltipBg = isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-black text-black';
    const tooltipArrow = isDarkMode ? 'border-b-gray-800' : 'border-b-black';

    return (
        <div
            className={`sticky z-40 ${bg} ${text_cls} border-b-4 border-black`}
            style={{ top: headerHeight }}
        >
            <div className="max-w-7xl mx-auto px-4 py-2 sm:py-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:h-14">
                <div className="flex items-center gap-2 sm:mr-8 flex-shrink-0">
                    <Activity className="text-[#00E096] animate-pulse" />
                    <span className="font-black tracking-widest uppercase">System Status</span>
                </div>

                <div className="flex items-center gap-6 md:gap-12 overflow-x-auto sm:overflow-visible w-full sm:w-auto pb-1 sm:pb-0 pr-1 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 flex-shrink-0 group cursor-default relative snap-start">
                            <item.icon size={16}
                                className={`${item.color} group-hover:scale-125 transition-transform`} />

                            {item.isDate ? (
                                <div className="relative group/date">
                                    <span
                                        className={`font-mono font-bold text-lg cursor-help border-b border-dashed ${isDarkMode ? 'border-gray-400' : 'border-gray-500'}`}>{item.value}</span>
                                    <div
                                        className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 ${tooltipBg} border-2 px-3 py-2 text-sm font-bold whitespace-nowrap opacity-0 group-hover/date:opacity-100 transition-opacity pointer-events-none z-[100] shadow-[4px_4px_0px_0px_#000]`}>
                                        <div
                                            className={`absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 ${tooltipArrow}`}></div>
                                        {item.fullValue}
                                    </div>
                                </div>
                            ) : (
                                <span className="font-mono font-bold text-lg">{item.value}</span>
                            )}

                            <span
                                className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StatsStrip;
