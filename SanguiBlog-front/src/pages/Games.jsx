import { useNavigate } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";
import { buildViewNavigator } from "./viewNavigation.js";

export default function GamesPage() {
  const navigate = useNavigate();
  return (
    <SanGuiBlog
      initialView="games"
      onViewChange={buildViewNavigator(navigate)}
    />
  );
}
