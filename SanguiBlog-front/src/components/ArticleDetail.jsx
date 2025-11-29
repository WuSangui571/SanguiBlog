import React from "react";
import {Heart, Share2, ArrowLeft} from "lucide-react";
import CommentsSection from "./comments/CommentsSection.jsx";
import PopButton from "./common/PopButton.jsx";

const ArticleDetail = ({
    id,
    setView,
    isDarkMode,
    articleData,
    article,
    commentsData,
    comments,
    onSubmitComment,
    onDeleteComment,
    onUpdateComment,
    currentUser,
    onCategoryClick
}) => {
    const resolvedArticle = articleData || article || {};
    const resolvedSummary = resolvedArticle.summary;
    const resolvedComments = commentsData || comments || [];

    if (!resolvedSummary) {
        return <div className="p-10 text-center font-bold">加载中...</div>;
    }

    const handleBack = () => {
        if (typeof setView === "function") {
            setView("home");
        }
        window.scrollTo({top: 0, behavior: "smooth"});
    };

    const handleParentCategoryClick = () => {
        onCategoryClick && onCategoryClick(resolvedSummary.parentCategory, resolvedSummary.category);
    };

    return (
        <div className={`min-h-screen pt-24 pb-16 px-4 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
            <div className="max-w-4xl mx-auto">
                <PopButton variant="secondary" className="mb-6 flex items-center gap-2" onClick={handleBack}>
                    <ArrowLeft size={16}/>
                    返回列表
                </PopButton>

                <div className="border-4 border-black shadow-[12px_12px_0px_0px_#000] p-6 relative overflow-hidden bg-white dark:bg-gray-900">
                    <div className="flex flex-wrap gap-3 mb-4">
                        {resolvedSummary.parentCategory && (
                            <button
                                type="button"
                                onClick={handleParentCategoryClick}
                                className="bg-black text-white px-2 py-1 text-xs font-bold uppercase tracking-widest"
                            >
                                {resolvedSummary.parentCategory}
                            </button>
                        )}
                        {resolvedSummary.category && (
                            <span className="px-2 py-1 text-xs font-bold border-2 border-black">
                                {resolvedSummary.category}
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black leading-tight mb-6">{resolvedSummary.title}</h1>

                    <div className={`flex flex-wrap items-center justify-between p-3 border-2 border-black mb-8 ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                        <div className="text-sm font-bold text-gray-500 flex flex-wrap gap-3">
                            <span>{resolvedSummary.date}</span>
                            <span>阅读 {resolvedSummary.views ?? 0}</span>
                            <span>评论 {resolvedSummary.comments ?? 0}</span>
                        </div>
                        <div className="flex gap-2">
                            <PopButton variant="secondary" className="!px-3 !py-2" title="分享文章">
                                <Share2 size={18}/>
                            </PopButton>
                            <PopButton variant="secondary" className="!px-3 !py-2" title="收藏">
                                <Heart size={18}/>
                            </PopButton>
                        </div>
                    </div>

                    {resolvedSummary.excerpt && (
                        <div className="p-4 border-l-8 border-[#FFD700] bg-[#FFF9E6] text-lg font-serif mb-6 text-gray-800">
                            {resolvedSummary.excerpt}
                        </div>
                    )}

                    <article className={`prose max-w-none ${isDarkMode ? "prose-invert" : ""}`}>
                        {resolvedArticle.contentHtml
                            ? <div dangerouslySetInnerHTML={{__html: resolvedArticle.contentHtml}}/>
                            : <p>{resolvedArticle.contentMd}</p>}
                    </article>

                    <div className="mt-10 border-t-2 border-dashed border-gray-200 pt-6">
                        <CommentsSection
                            list={resolvedComments}
                            isDarkMode={isDarkMode}
                            onSubmit={(payload) => onSubmitComment && onSubmitComment(payload)}
                            currentUser={currentUser}
                            onDeleteComment={onDeleteComment}
                            onUpdateComment={onUpdateComment}
                            postAuthorName={resolvedSummary.authorName}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArticleDetail;
