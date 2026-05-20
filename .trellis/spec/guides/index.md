# Thinking Guides

> These guides capture the thinking workflow that used to live under `.ai`: search first, reuse first, define cross-layer contracts, then implement narrowly.

---

## Available Guides

| Guide | Purpose | When to Use |
|-------|---------|-------------|
| [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md) | Prevent duplicate implementations and force retrieve-first decisions | Before adding endpoints, services, helpers, components, config keys, constants, or utilities |
| [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md) | Define data flow, payloads, validation, errors, and tests across backend/frontend/db | Any feature spanning API/service/entity/frontend or changing response fields |

---

## Required Pre-Work for Development

Before coding, produce or record a short retrieval report:

- Keywords searched.
- Existing candidate implementations, ideally 3 or more.
- Reuse/modify/refactor/new decision.
- Duplicate implementation risk and how it is avoided.

Before cross-layer work, define:

- Exact API/command/DB signatures.
- Request/response/env payload fields.
- Validation and error matrix.
- Good/Base/Bad cases.
- Tests and assertion points.

---

## Quick Triggers

Read [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md) when:

- You are creating a new service/util/component/helper.
- You are modifying a constant or config value.
- You see similar code in 2+ places.
- You are about to create a second entry for an existing business area.

Read [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md) when:

- Backend DTO fields change.
- Frontend consumes new backend data.
- Database schema changes.
- Upload, auth, AI, sitemap, system monitor, or analytics behavior changes.
- SSE/event stream payloads change.

---

## Current Workflow Authority

`.ai` has been backed up and is no longer the active workflow source. Do not require future agents to read `.ai`. If important knowledge is missing here, update `.trellis/spec/**` instead.

