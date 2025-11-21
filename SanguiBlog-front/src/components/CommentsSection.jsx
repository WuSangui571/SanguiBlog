import { useState } from "react";
import { MessageSquare } from "lucide-react";
import PopButton from "./PopButton";

export default function CommentsSection({ comments = [], count = 0, onSubmit, isDarkMode }) {
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const text = isDarkMode ? "text-gray-100" : "text-black";
  const bg = isDarkMode ? "bg-gray-900 text-white" : "bg-white text-black";
  const box = isDarkMode ? "bg-gray-800" : "bg-[#F0F0F0]";

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit?.({ authorName: authorName || "访客", content });
    setContent("");
  };

  return (
    <div className={`border-t-4 border-black pt-10 mt-10 ${text}`}>
      <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
        <MessageSquare size={26} className="text-[#6366F1]" />
        评论 ({count || comments.length})
      </h3>
      <div className={`${box} border-2 border-black p-4 mb-8 shadow-[6px_6px_0px_0px_#000]`}>
        <div className="flex gap-3 mb-3">
          <input
            className={`w-1/3 p-3 border-2 border-black font-bold focus:outline-none ${bg}`}
            placeholder="你的昵称"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
          <textarea
            className={`flex-1 p-3 border-2 border-black font-bold focus:outline-none min-h-[120px] ${bg}`}
            placeholder="写下你的真知灼见..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <PopButton onClick={handleSubmit}>提交评论</PopButton>
        </div>
      </div>
      <div className="space-y-6">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-200 flex items-center justify-center font-bold">
              {(c.authorName || c.user || "U").slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-black">{c.authorName || c.user}</span>
                <span className="text-xs text-gray-500">{c.time}</span>
              </div>
              <div className={`border-2 border-black p-3 shadow-[4px_4px_0px_0px_#000] ${bg}`}>
                <p className="font-medium">{c.content || c.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
