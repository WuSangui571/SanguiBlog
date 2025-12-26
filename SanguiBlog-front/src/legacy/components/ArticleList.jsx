// LEGACY：旧版首页文章列表原型组件（已由 src/appfull/public/ArticleList.jsx 替代），保留仅供参考，请勿在现网入口中引用。
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageSquare, Filter } from "lucide-react";
import StatsStrip from "./StatsStrip";

const PAGE_SIZE = 6;

export default function ArticleList({ posts = [], categories = [], meta, isDarkMode, onFilterChange }) {
  const navigate = useNavigate();
  const [activeParent, setActiveParent] = useState("all");
  const [activeSub, setActiveSub] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (activeParent !== "all" && p.parentCategory !== (categories.find((c) => c.id === activeParent)?.label || p.parentCategory)) return false;
      if (activeSub !== "all" && p.category !== (categories.flatMap((c) => c.children || []).find((c) => c.id === activeSub)?.label || p.category)) return false;
      return true;
    });
  }, [posts, activeParent, activeSub, categories]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const display = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [posts]);

  const parentCategories = categories.length ? categories : [{ id: "all", label: "全部", children: [] }];
  const currentParent = parentCategories.find((c) => c.id === activeParent);
  const subCategories = currentParent?.children || [];

  return (
    <section id="posts" className="px-4 md:px-8 max-w-7xl mx-auto py-12">
      <StatsStrip stats={meta?.stats} isDarkMode={isDarkMode} />
      <div className="flex flex-col lg:flex-row gap-8 mt-6">
        <aside className={`w-full lg:w-1/4 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white"} border-2 border-black p-4 space-y-4`}>
          <div className="flex items-center gap-2 font-black text-lg">
            <Filter size={18} /> 筛选
          </div>
          <div className="space-y-2">
            {parentCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveParent(cat.id);
                  setActiveSub("all");
                  setPage(1);
                  onFilterChange?.({ parentId: cat.id === "all" ? null : cat.id, categoryId: null });
                }}
                className={`w-full text-left px-3 py-2 font-bold border-2 border-black ${activeParent === cat.id ? "bg-[#FFD700]" : isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {subCategories.length > 0 && (
            <div className="space-y-2">
              {subCategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setActiveSub(sub.id);
                    setPage(1);
                    onFilterChange?.({ parentId: activeParent === "all" ? null : activeParent, categoryId: sub.id });
                  }}
                  className={`w-full text-left px-3 py-2 font-bold border-2 border-dashed ${activeSub === sub.id ? "border-black" : "border-gray-400"}`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="flex-1 space-y-6">
          {display.map((post) => (
            <article
              key={post.id}
              className={`border-2 border-black shadow-[6px_6px_0px_0px_#000] ${isDarkMode ? "bg-gray-900 text-white" : "bg-white"} p-6 cursor-pointer`}
              onClick={() => navigate(`/article/${post.id}`)}
            >
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs font-bold bg-black text-white px-2 py-1">{post.parentCategory}</span>
                <span className="text-xs font-bold border-2 border-black px-2 py-1">{post.category}</span>
                {post.tags?.map((t) => (
                  <span key={t} className="text-xs font-bold border px-2 py-1">
                    #{t}
                  </span>
                ))}
              </div>
              <h3 className="text-2xl font-black mb-2">{post.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{post.excerpt}</p>
              <div className="flex justify-between text-sm font-bold">
                <span>{post.date}</span>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <Heart size={16} /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={16} /> {post.comments}
                  </span>
                </div>
              </div>
            </article>
          ))}

          {filtered.length === 0 && <p className="text-center text-lg font-bold">暂无数据</p>}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 border-2 border-black font-black ${p === page ? "bg-black text-white" : "bg-white"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
