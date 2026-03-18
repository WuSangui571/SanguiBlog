import assert from "node:assert/strict";
import { buildAiCurrentPageContext } from "./aiCurrentPageContext.js";

const validArticle = {
  summary: {
    id: 198,
    title: "记一次网站迁移：从 HTTPS 配置到异地容灾备份",
    excerpt: "一次网站迁移中的 HTTPS、备份与容灾记录",
    slug: "site-migration"
  },
  contentMd: "# 标题\n\n这里是正文内容。"
};

{
  const context = buildAiCurrentPageContext({
    view: "article",
    article: validArticle,
    articleState: { status: "ok" }
  });

  assert.equal(context.pageType, "article");
  assert.equal(context.title, validArticle.summary.title);
  assert.equal(context.excerpt, validArticle.summary.excerpt);
  assert.equal(context.url, "/article/198");
}

{
  const context = buildAiCurrentPageContext({
    view: "home",
    article: validArticle,
    articleState: { status: "ok" }
  });

  assert.equal(context, null);
}

{
  const context = buildAiCurrentPageContext({
    view: "article",
    article: { summary: { title: "只有标题" } },
    articleState: { status: "ok" }
  });

  assert.equal(context, null);
}

console.log("aiCurrentPageContext tests passed");
