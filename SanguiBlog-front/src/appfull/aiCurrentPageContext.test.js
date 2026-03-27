import assert from "node:assert/strict";
import { buildAiCurrentPageContext } from "./aiCurrentPageContext.js";

const validArticle = {
  summary: {
    id: 198,
    title: "记一次网站迁移：从 HTTPS 配置到异地容灾备份",
    excerpt: "一次网站迁移中的 HTTPS、备份与容灾记录",
    slug: "site-migration",
  },
  contentMd: "# 标题\n\n这里是正文内容。",
};

{
  const context = buildAiCurrentPageContext({
    view: "article",
    article: validArticle,
    articleState: { status: "ok" },
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
    articleState: { status: "ok" },
  });

  assert.equal(context.pageType, "home");
  assert.equal(context.url, "/");
  assert.match(context.content, /首页/);
}

{
  const context = buildAiCurrentPageContext({
    view: "article",
    article: { summary: { title: "只有标题" } },
    articleState: { status: "ok" },
  });

  assert.equal(context, null);
}

{
  const context = buildAiCurrentPageContext({
    view: "games",
    gameDetail: {
      title: "JSON 格式化工具",
      description: "用于格式化和校验 JSON 的工具页",
    },
  });

  assert.equal(context.pageType, "tools");
  assert.equal(context.title, "JSON 格式化工具");
  assert.equal(context.url, "/tools");
  assert.match(context.content, /工具页/);
}

{
  const context = buildAiCurrentPageContext({
    view: "archive",
  });

  assert.equal(context.pageType, "archive");
  assert.equal(context.url, "/archive");
  assert.match(context.content, /归档/);
}

{
  const context = buildAiCurrentPageContext({
    view: "login",
  });

  assert.equal(context.pageType, "login");
  assert.equal(context.url, "/login");
  assert.match(context.content, /登录/);
}

{
  const context = buildAiCurrentPageContext({
    view: "register",
  });

  assert.equal(context.pageType, "register");
  assert.equal(context.url, "/register");
  assert.match(context.content, /注册/);
}

console.log("aiCurrentPageContext tests passed");
