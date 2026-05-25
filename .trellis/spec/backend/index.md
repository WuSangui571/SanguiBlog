# Backend Development Guidelines

> SanguiBlog backend code-specs. Read this index first, then open the relevant detailed specs before implementation.

---

## Overview

Backend stack:

- Java 21
- Spring Boot 3.5.11
- Spring Data JPA / Hibernate
- MySQL main database
- PgVector/PostgreSQL for Spring AI vector store
- Spring Security + JJWT
- SpringDoc disabled by default
- Commonmark for Markdown rendering
- OSHI for system monitor metrics

The old `.ai` workflow has been migrated into Trellis. Future AI work should use `.trellis/spec/**`, `.trellis/workflow.md`, and Trellis task context instead of `.ai`.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Spring package layout, feature placement, controller/service/repository boundaries | Filled |
| [Database Guidelines](./database-guidelines.md) | JPA, schema SQL, transactions, AI/RAG tables, query contracts | Filled |
| [Error Handling](./error-handling.md) | `ApiResponse`, exception mapping, upload/AI/BotGuard errors | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Retrieve-first workflow, high-risk contracts, tests, version rules | Filled |
| [Logging Guidelines](./logging-guidelines.md) | SLF4J levels, safe logging, AI/upload/security logging limits | Filled |

---

## Pre-Development Checklist

Always read:

- [Directory Structure](./directory-structure.md)
- [Quality Guidelines](./quality-guidelines.md)
- [../guides/code-reuse-thinking-guide.md](../guides/code-reuse-thinking-guide.md)

Then read task-specific specs:

| Task Touches | Also Read |
|--------------|-----------|
| Entity/repository/schema/query/transactions | [Database Guidelines](./database-guidelines.md), [../guides/cross-layer-thinking-guide.md](../guides/cross-layer-thinking-guide.md) |
| Controller/API/validation/errors | [Error Handling](./error-handling.md), [../guides/cross-layer-thinking-guide.md](../guides/cross-layer-thinking-guide.md) |
| Logs/background jobs/external calls | [Logging Guidelines](./logging-guidelines.md) |
| AI assistant/RAG/session/audit | [Database Guidelines](./database-guidelines.md), [Error Handling](./error-handling.md), [Quality Guidelines](./quality-guidelines.md), [../guides/cross-layer-thinking-guide.md](../guides/cross-layer-thinking-guide.md) |
| Uploads/files/static assets | [Directory Structure](./directory-structure.md), [Error Handling](./error-handling.md), [Quality Guidelines](./quality-guidelines.md) |
| Security/permissions/BotGuard | [Error Handling](./error-handling.md), [Quality Guidelines](./quality-guidelines.md), [Logging Guidelines](./logging-guidelines.md) |
| Sitemap/robots/system monitor | [Database Guidelines](./database-guidelines.md), [Quality Guidelines](./quality-guidelines.md) |

---

## Verification Commands

Use targeted commands whenever possible:

```bash
cd SanguiBlog-server
mvn -q -DskipTests compile
mvn -q "-Dtest=AiChatServiceTest" test
mvn -q "-Dtest=UploadControllerAuthorizationTest,UploadControllerStreamHandlingTest" test
```

If you do not run tests, state that explicitly.

---

## Language

Project-facing Trellis specs are written in Simplified Chinese or English as needed. Preserve exact code identifiers, paths, API names, and config keys.

