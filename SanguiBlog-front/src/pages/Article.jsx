import { useNavigate, useParams } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";

export default function ArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const aid = id ? Number(id) : null;
  return (
    <SanGuiBlog
      initialView="article"
      initialArticleId={aid}
      onViewChange={(view, articleId) => {
        if (view === "home") navigate("/", { replace: true });
        if (view === "admin") navigate("/admin", { replace: true });
        if (view === "login") navigate("/login", { replace: true });
        if (view === "article" && articleId && articleId !== aid) navigate(`/article/${articleId}`, { replace: true });
      }}
    />
  );
}
