import { useNavigate } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <SanGuiBlog
      initialView="home"
      onViewChange={(view, articleId) => {
        if (view === "article" && articleId) {
          navigate(`/article/${articleId}`, { replace: true });
        } else if (view === "admin") {
          navigate("/admin", { replace: true });
        } else if (view === "login") {
          navigate("/login", { replace: true });
        } else if (view === "games") {
          navigate("/tools", { replace: true });
        } else if (view === "game" && articleId) {
          navigate(`/tools/${articleId}`, { replace: true });
        }
      }}
    />
  );
}
