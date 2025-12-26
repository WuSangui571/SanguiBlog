// LEGACY：旧版统计条原型组件（已由 src/appfull/public/StatsStrip.jsx 与相关 UI 替代），保留仅供参考，请勿在现网入口中引用。
import { Activity, FileText, Eye, MessageSquare, Hash, Clock } from "lucide-react";

export default function StatsStrip({ stats, isDarkMode }) {
  if (!stats) return null;
  const items = [
    { label: "文章", value: stats.posts, icon: FileText },
    { label: "浏览", value: stats.views, icon: Eye },
    { label: "评论", value: stats.comments, icon: MessageSquare },
    { label: "标签", value: stats.tags, icon: Hash },
    { label: "最后更新", value: stats.lastUpdated, fullValue: stats.lastUpdatedFull, icon: Clock, isDate: true },
  ];
  const barStyle = isDarkMode ? "bg-gray-900 text-white" : "bg-black text-white";

  return (
    <div className={`sticky top-16 z-30 ${barStyle} border-b-4 border-black`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-2 mr-8">
          <Activity className="text-[#00E096] animate-pulse" />
          <span className="font-black text-xs tracking-widest uppercase">System Status</span>
        </div>
        <div className="flex items-center gap-6 overflow-x-auto">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <item.icon size={16} />
              {item.isDate ? (
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold border-b border-dashed border-gray-400">{item.value}</span>
                  <span className="text-[10px] uppercase">{item.label}</span>
                </div>
              ) : (
                <>
                  <span className="font-mono font-bold">{item.value}</span>
                  <span className="text-[10px] uppercase">{item.label}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
