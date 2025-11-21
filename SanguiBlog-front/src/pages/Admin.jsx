import { useNavigate } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";

export default function AdminPage() {
  const navigate = useNavigate();
  return (
    <SanGuiBlog
      initialView="admin"
      onViewChange={(view) => {
        if (view === "home") navigate("/", { replace: true });
        if (view === "login") navigate("/login", { replace: true });
        if (view === "article") navigate("/", { replace: true });
      }}
    />
  );
}
