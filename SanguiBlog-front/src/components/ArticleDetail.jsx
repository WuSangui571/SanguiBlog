import { Heart, Share2 } from "lucide-react";
import CommentsSection from "./CommentsSection";
import PopButton from "./PopButton";

export default function ArticleDetail({ article, comments, onSubmitComment, isDarkMode, back }) {
  if (!article?.summary) return <p className="p-10 text-center font-bold">加载中...</p>;
  const { summary, contentHtml, contentMd } = article;

  return (
    <div className={`min-h-screen pt-24 px-4 pb-16 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
      <div className="max-w-4xl mx-auto">
        <PopButton variant="secondary" className="mb-6" onClick={back}>
          返回列表
        </PopButton>
        <div className="border-4 border-black shadow-[12px_12px_0px_0px_#000] p-6 relative overflow-hidden">
          <div className="flex gap-3 mb-4">
            <span className="bg-black text-white px-2 py-1 text-xs font-bold">{summary.parentCategory}</span>
            <span className="px-2 py-1 text-xs font-bold border-2 border-black">{summary.category}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-6 leading-tight">{summary.title}</h1>
          <div className={`flex items-center justify-between p-3 border-2 border-black mb-8 ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
            <div className="text-sm font-bold text-gray-500">{summary.date} · 阅读 {summary.views}</div>
            <div className="flex gap-2">
              <PopButton variant="secondary" className="!px-3 !py-2">
                <Share2 size={18} />
              </PopButton>
              <PopButton variant="secondary" className="!px-3 !py-2">
                <Heart size={18} />
              </PopButton>
            </div>
          </div>
          <article className={`prose max-w-none ${isDarkMode ? "prose-invert" : ""}`}>
            <div className="p-4 border-l-8 border-[#FFD700] bg-[#FFF9E6] text-lg font-serif mb-6">{summary.excerpt}</div>
            {contentHtml ? <div dangerouslySetInnerHTML={{ __html: contentHtml }} /> : <p>{contentMd}</p>}
          </article>
          <CommentsSection comments={comments} count={summary.comments} onSubmit={onSubmitComment} isDarkMode={isDarkMode} />
        </div>
      </div>
    </div>
  );
}
