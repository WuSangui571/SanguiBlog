import { useNavigate, useParams } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";

export default function GameDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const gid = id ? Number(id) : null;
  return (
    <SanGuiBlog
      initialView="game"
      initialGameId={gid}
      onViewChange={(view, targetId) => {
        if (view === "home") navigate("/", { replace: true });
        if (view === "games") navigate("/games", { replace: true });
        if (view === "admin") navigate("/admin", { replace: true });
        if (view === "login") navigate("/login", { replace: true });
        if (view === "article" && targetId) navigate(/article/, { replace: true });
        if (view === "game" && targetId && targetId !== gid) navigate(/games/, { replace: true });
      }}
    />
  );
}
