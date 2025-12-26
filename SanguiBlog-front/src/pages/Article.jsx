import { useNavigate, useParams } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";
import { buildViewNavigator } from "./viewNavigation.js";

export default function ArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const raw = typeof id === "string" ? id.trim() : "";
  const aid = raw ? Number(raw) : null;
  const invalid = !raw || !Number.isFinite(aid) || aid <= 0;
  if (invalid) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-32">
        <div className="border-4 border-black shadow-[12px_12px_0px_0px_#000] p-10 bg-white text-black">
          <div className="text-3xl font-black">404：文章不存在</div>
          <div className="mt-3 text-sm font-semibold text-gray-600">
            文章 ID 非法或不存在，请检查链接是否正确。
          </div>
        </div>
      </div>
    );
  }
  return (
    <SanGuiBlog
      initialView="article"
      initialArticleId={aid}
      onViewChange={buildViewNavigator(navigate, { currentArticleId: aid })}
    />
  );
}
