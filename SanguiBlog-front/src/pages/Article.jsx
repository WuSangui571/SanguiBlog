import { useNavigate, useParams } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";
import { buildViewNavigator } from "./viewNavigation.js";

export default function ArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const aid = id ? Number(id) : null;
  return (
    <SanGuiBlog
      initialView="article"
      initialArticleId={aid}
      onViewChange={buildViewNavigator(navigate, { currentArticleId: aid })}
    />
  );
}
