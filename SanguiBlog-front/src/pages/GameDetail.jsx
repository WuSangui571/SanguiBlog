import { useNavigate, useParams } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";
import { buildViewNavigator } from "./viewNavigation.js";

export default function GameDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const gid = id ? Number(id) : null;
  return (
    <SanGuiBlog
      initialView="game"
      initialGameId={gid}
      onViewChange={buildViewNavigator(navigate, { currentGameId: gid })}
    />
  );
}
