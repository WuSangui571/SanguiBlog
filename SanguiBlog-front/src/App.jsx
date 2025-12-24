import { Routes, Route, Navigate, useParams } from "react-router-dom";
import HomePage from "./pages/Home";
import ArchivePage from "./pages/Archive";
import AboutPage from "./pages/About";
import ArticlePage from "./pages/Article";
import LoginPage from "./pages/Login";
import AdminPage from "./pages/Admin";
import GamesPage from "./pages/Games";
import GameDetailPage from "./pages/GameDetail";
import { BlogProvider } from "./hooks/useBlogData";

function GamesRedirect() {
  return <Navigate to="/tools" replace />;
}

function GameDetailRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/tools/${id}` : "/tools"} replace />;
}

export default function App() {
  return (
    <BlogProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/article/:id" element={<ArticlePage />} />
        <Route path="/tools" element={<GamesPage />} />
        <Route path="/tools/:id" element={<GameDetailPage />} />
        <Route path="/games" element={<GamesRedirect />} />
        <Route path="/games/:id" element={<GameDetailRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BlogProvider>
  );
}
