import DOMPurify from "dompurify";

const sanitizeHtml = (html) => {
  if (typeof html !== "string") return "";
  const input = html.trim();
  if (!input) return "";
  if (typeof window === "undefined") {
    // SSR / 非浏览器环境：宁可不渲染，也不要输出未清洗的 HTML
    return "";
  }

  try {
    return DOMPurify.sanitize(input, {
      USE_PROFILES: { html: true, mathMl: true },
    });
  } catch {
    return "";
  }
};

export default sanitizeHtml;

