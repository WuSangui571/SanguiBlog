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

export function buildAiCurrentPageContext({ view, article, articleState }) {
  if (view !== "article" || articleState?.status !== "ok" || !article) {
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
    url: articleId ? `/article/${articleId}` : ""
  };
}
