# Backend Database Guidelines

> The backend uses Spring Data JPA over MySQL for the main application database. AI vector search uses a separate PgVector/PostgreSQL connection through Spring AI and must not replace the MySQL domain schema.

---

## Scope / Trigger

Use this spec when changing entities, repositories, schema SQL, transactions, archive/stat queries, AI chat tables, RAG knowledge tables, uploads metadata, or any feature that persists state.

---

## Database Stack

| Concern | Contract |
|---------|----------|
| Main DB | MySQL 8+ |
| ORM | Spring Data JPA / Hibernate |
| Schema source | `sanguiblog_db.sql` |
| Hibernate DDL | `spring.jpa.hibernate.ddl-auto: none` |
| Test DB | H2 for tests where configured |
| Vector store | PostgreSQL PgVector through `spring-ai-pgvector-store`, configured by `ai.rag.pgvector.*` |

Schema changes require explicit SQL updates. Entity annotations document mappings but do not migrate production databases.

---

## Table / Entity Conventions

- Table and column names use snake_case, e.g. `ai_chat_sessions.user_visible`.
- Java entity fields use camelCase and map with `@Column(name = "...")` when names diverge.
- Primary keys generally use `Long id` with `GenerationType.IDENTITY`.
- Relationships use `FetchType.LAZY` by default.
- Content fields use `TEXT`, `MEDIUMTEXT`, or `LONGTEXT` according to existing entity/schema patterns.
- Status-like values are currently strings in many legacy tables (`Post.status`, `Comment.status`) and enums in some newer tables (`GamePage.status`). Match the target module.

Example:

```java
@Entity
@Table(name = "posts")
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(name = "content_md", columnDefinition = "MEDIUMTEXT")
    private String contentMd;
}
```

---

## Repository Patterns

Use derived query methods for simple lookups and explicit `@Query` for aggregation, projections, or non-trivial ordering.

```java
Optional<Post> findBySlugAndStatus(String slug, String status);

@Query("""
       select p.id as postId, t.name as tagName
       from Post p join p.tags t
       where p.id in :postIds
       """)
List<PostTagRow> findTagNamesByPostIds(List<Long> postIds);
```

Use `@EntityGraph` when a listing needs related entities and the relationship is known at query time. Do not fix N+1 by making entities eager globally.

---

## Pagination Contracts

Backend API pages are 1-based in DTO responses, but Spring Data `PageRequest` is 0-based internally.

```java
int p = page == null || page < 1 ? 0 : page - 1;
int s = size == null || size < 1 ? 10 : Math.min(size, 50);
Page<Post> posts = postRepository.findAll(spec, PageRequest.of(p, s, sort));
return new PageResponse<>(records, posts.getTotalElements(), posts.getNumber() + 1, posts.getSize());
```

For public post list size, keep the existing max of `50`. For archive month loading, keep the existing max of `200` unless the frontend contract changes too.

---

## Transactions

| Operation | Required Annotation |
|-----------|---------------------|
| Pure read queries | `@Transactional(readOnly = true)` |
| Create/update/delete entity state | `@Transactional` |
| Post publish/delete side effects | `@Transactional`, plus sitemap dirty mark and AI knowledge sync/remove |
| Knowledge re-sync | Independent transaction per post/document where existing services already use that pattern |
| Repository modifying query | `@Transactional` on method or caller, plus `@Modifying` where needed |

Post save/update has coupled side effects:

```java
Post saved = postRepository.save(post);
sitemapService.markDirty();
aiBlogKnowledgeSyncService.syncPostKnowledge(saved.getId());
return toDetail(saved);
```

Do not bypass these side effects with direct repository saves in new code paths.

---

## AI / RAG Persistence Contracts

Main MySQL tables:

- `ai_chat_sessions`
- `ai_chat_messages`
- `ai_blog_knowledge_documents`
- `ai_blog_knowledge_chunks`
- `ai_custom_knowledge_documents`
- `ai_custom_knowledge_chunks`

PgVector stores embeddings only. MySQL stores source document state, sync status, chunk mappings, guest audit fields, and user visibility.

Critical contracts:

- `ai_chat_sessions.user_id` may be null for guest sessions.
- Guest sessions use `guest_visitor_id`, `session_start_ip`, `latest_ip`, `ip_changed`, and `ip_changed_at`.
- User-side deletion is soft visibility: `user_visible=false`, `user_hidden_at` set. Admin audit must still see the session.
- User history returns only the newest 10 visible sessions; older visible sessions are automatically hidden by `AiChatSessionVisibilityService`.
- Knowledge sync services must flush after deleting old chunk mappings before recreating stable vector IDs. This prevents unique-key conflicts in the same transaction.
- Startup knowledge sync must isolate each post/document so one bad item does not poison the whole Hibernate session.

---

## Query / Aggregation Rules

### Comments Count

Public post summaries must count only `APPROVED` comments. Avoid per-post N+1 in lists; prefer batch aggregation and then map counts back to DTOs.

### Tags

Public post summary tags must be deduplicated and case-insensitively sorted for stable UI rendering.

### Analytics

Article detail view counting uses a 10-minute `ip + postId` rate limit and a DB existence fallback. If analytics persistence fails, do not make the article detail endpoint fail solely because tracking failed unless the main read itself is invalid.

### System Monitor

Network history depends on `system_monitor_snapshots`. If the table is unavailable, `SystemMonitorService` falls back to current uptime counters and returns a history-unavailable note; do not fail the admin monitor endpoint just because deployment SQL is behind.

---

## Migrations / SQL Updates

When adding or changing persistent fields:

1. Update `sanguiblog_db.sql`.
2. Update entity mapping under `model/entity`.
3. Update repository methods or projections.
4. Update DTOs and service mapping.
5. Update frontend API consumption if returned fields change.
6. Add or update tests for Good/Base/Bad cases.

There is no automatic migration runner in this repo. Production operators must apply SQL manually.

---

## Validation & Error Matrix

| Scenario | Validation Location | Expected Error |
|----------|---------------------|----------------|
| Missing referenced entity | Service loads repository and throws `NotFoundException` | HTTP 404 through `GlobalExceptionHandler` |
| Bad request value such as archive month outside 1-12 | Service throws `IllegalArgumentException` | HTTP 400 |
| Duplicate unique slug/folder | Service checks repository before save | HTTP 400 with readable message |
| Missing SQL table for optional history | Service catches and degrades if designed as optional | HTTP 200 with fallback data/note |
| Core table missing or entity cannot save | Let exception surface | HTTP 500, sanitized outside dev/local |

---

## Wrong vs Correct

### Wrong

```java
postRepository.save(post);
return toDetail(post);
```

This skips sitemap invalidation and AI knowledge synchronization.

### Correct

```java
Post saved = postRepository.save(post);
sitemapService.markDirty();
aiBlogKnowledgeSyncService.syncPostKnowledge(saved.getId());
return toDetail(saved);
```

---

## Tests Required

- Repository aggregation: assert result shape and ordering.
- Service transactions: assert side effects such as sitemap dirty mark, visibility hiding, RAG sync calls, or fallback behavior.
- Schema-impacting work: at minimum run targeted Maven tests and inspect `sanguiblog_db.sql` diff.

