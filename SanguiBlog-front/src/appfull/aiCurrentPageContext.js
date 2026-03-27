const MAX_CONTEXT_CONTENT_LENGTH = 8000;

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function truncateText(value, maxLength) {
  const normalized = trimText(value);
  if (!normalized) return "";
  return normalized.length <= maxLength ? normalized : normalized.slice(0, maxLength);
}

function stripHtmlTags(value) {
  return trimText(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildStaticPageContext(pageType, title, url, content, excerpt = "") {
  const normalizedTitle = trimText(title);
  const normalizedContent = truncateText(content, MAX_CONTEXT_CONTENT_LENGTH);
  if (!normalizedTitle || !normalizedContent) {
    return null;
  }
  return {
    pageType,
    title: normalizedTitle,
    excerpt: trimText(excerpt),
    content: normalizedContent,
    url,
  };
}

function buildArticleContext(article, articleState) {
  if (articleState?.status !== "ok" || !article) {
    return null;
  }

  const summary = article.summary || {};
  const title = trimText(summary.title || article.title);
  const rawContent = article.contentMd || stripHtmlTags(article.contentHtml);
  const content = truncateText(rawContent, MAX_CONTEXT_CONTENT_LENGTH);
  const excerpt = trimText(summary.excerpt || article.excerpt);
  const articleId = summary.id || article.id;

  if (!title || !content) {
    return null;
  }

  return {
    pageType: "article",
    title,
    excerpt,
    content,
    url: articleId ? `/article/${articleId}` : "",
  };
}

export function buildAiCurrentPageContext({
  view,
  article,
  articleState,
  gameDetail,
  gameId,
}) {
  if (view === "article") {
    return buildArticleContext(article, articleState);
  }

  if (view === "home") {
    return buildStaticPageContext(
      "home",
      "首页",
      "/",
      "这是博客首页，主要展示站点首页信息、系统状态和最新文章列表。"
    );
  }

  if (view === "archive") {
    return buildStaticPageContext(
      "archive",
      "归档页",
      "/archive",
      "这是博客归档页，按年月整理已发布文章，适合按时间查找历史文章。"
    );
  }

  if (view === "about") {
    return buildStaticPageContext(
      "about",
      "关于页",
      "/about",
      "这是博客关于页，主要介绍站长、站点背景或补充说明信息。"
    );
  }

  if (view === "login") {
    return buildStaticPageContext(
      "login",
      "登录页",
      "/login",
      "这是博客登录页，用于已有账号的用户输入用户名、密码，以及在需要时输入验证码，登录后进入站内功能或后台管理。"
    );
  }

  if (view === "register") {
    return buildStaticPageContext(
      "register",
      "注册页",
      "/register",
      "这是博客注册页，采用邀请码注册流程。用户需要先验证邀请码，验证通过后再填写头像、用户名、显示名称、密码和确认密码来创建新账号。"
    );
  }

  if (view === "game") {
    const detailTitle = trimText(gameDetail?.title);
    const detailDescription = trimText(gameDetail?.description);
    const pageTitle = detailTitle || "工具详情页";
    const pageUrl = gameId ? `/tools/${gameId}` : "/tools";
    const pageContent = detailDescription
      ? `这是博客工具详情页，当前展示的工具是“${pageTitle}”。${detailDescription}`
      : "这是博客工具详情页，用来展示站内某个具体工具的独立页面内容。";

    return buildStaticPageContext(
      "tools",
      pageTitle,
      pageUrl,
      pageContent,
      detailDescription
    );
  }

  if (view === "games") {
    const detailTitle = trimText(gameDetail?.title);
    const detailDescription = trimText(gameDetail?.description);
    const pageTitle = detailTitle || "工具页";
    const pageUrl = gameId ? `/tools/${gameId}` : "/tools";
    const pageContent = detailDescription
      ? `这是博客工具页，当前展示的工具是“${pageTitle}”。${detailDescription}`
      : "这是博客工具页，用来展示站内工具和独立 HTML 工具页面。";

    return buildStaticPageContext(
      "tools",
      pageTitle,
      pageUrl,
      pageContent,
      detailDescription
    );
  }

  return null;
}
