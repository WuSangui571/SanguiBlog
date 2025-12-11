import { useNavigate } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";

export default function GamesPage() {
  const navigate = useNavigate();
  return (
    <SanGuiBlog
      initialView="games"
      onViewChange={(view, targetId) => {
        if (view === "home") navigate("/", { replace: true });
        if (view === "admin") navigate("/admin", { replace: true });
        if (view === "login") navigate("/login", { replace: true });
        if (view === "article" && targetId) navigate(/article/, { replace: true });
        if (view === "game" && targetId) navigate(/games/, { replace: true });
      }}
    />
  );
}
