export const buildViewNavigator = (navigate, options = {}) => {
  const { currentArticleId = null, currentGameId = null } = options;

  const normalizePath = (path) => {
    if (!path) return "";
    return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
  };

  const shouldSkip = (path) => {
    if (typeof window === "undefined") return false;
    const current = normalizePath(window.location?.pathname || "");
    return normalizePath(path) === current;
  };

  const isPathUnder = (prefix) => {
    if (typeof window === "undefined") return false;
    const current = window.location?.pathname || "";
    const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
    return current === normalizedPrefix || current.startsWith(`${normalizedPrefix}/`);
  };

  const go = (path) => {
    if (!path) return;
    if (shouldSkip(path)) return;
    if (typeof window !== "undefined") {
      try {
        // 记录“站内跳转来源”，供文章详情接口/埋点读取（避免 SPA 下 document.referrer 恒不变的问题）
        window.sessionStorage.setItem("sg_prev_url", window.location.href || "");
        window.sessionStorage.setItem("sg_prev_url_ts", String(Date.now()));
      } catch {
        // ignore
      }
    }
    navigate(path, { replace: true });
  };

  return (view, targetId) => {
    if (view === "home") return go("/");
    if (view === "archive") return go("/archive");
    if (view === "about") return go("/about");
    if (view === "admin") {
      if (isPathUnder("/admin")) return;
      return go("/admin");
    }
    if (view === "login") return go("/login");
    if (view === "games") return go("/tools");

    if (view === "article" && targetId) {
      const articleId = Number(targetId);
      if (!Number.isFinite(articleId)) return;
      if (currentArticleId !== null && Number(currentArticleId) === articleId) return;
      return go(`/article/${articleId}`);
    }

    if (view === "game" && targetId) {
      const gameId = Number(targetId);
      if (!Number.isFinite(gameId)) return;
      if (currentGameId !== null && Number(currentGameId) === gameId) return;
      return go(`/tools/${gameId}`);
    }
  };
};
