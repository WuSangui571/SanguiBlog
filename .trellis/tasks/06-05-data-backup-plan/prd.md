# 数据备份方案 PRD

## 1. 当前项目状态

- 当前分支：`main`。
- 当前工作区：干净。
- 当前 Trellis task：本任务创建前无 active task。
- workspace journal 最近状态：
  - Session 24 已完成 `V2.3.1` README 清理并归档。
  - Session 21 已完成 Docker uploads 权限初始化：`docker-compose.yml` 和 `docker-compose.prod.yml` 均包含 `uploads-init`，恢复后仍需关注 `docker compose restart backend` 不会重新运行 one-shot init 的限制。
  - Session 4/5 已经形成过 Docker 数据同步/恢复文档与本地恢复脚本：`docs/docker-data-sync.md` 和 `scripts/docker-data-sync-local-restore.ps1`。
- 现有数据同步合同已写入 `.trellis/spec/guides/cross-layer-thinking-guide.md` 的 `Docker Data Sync / Restore` 章节。

## 2. 任务范围判断

分类：`Complex Task`。

理由：

- 涉及生产 Linux、Windows 本地、Docker Compose、SSH/SCP、MySQL、PgVector、uploads、checksum、manifest、Docker volume 恢复、权限修复和恢复后验收。
- 涉及 infra/storage/DB 跨层合同，不是简单文档文案调整。
- 本轮 Codex 仅做 PRD、计划、Trellis context、spec 读取和 focused research；不写业务代码，不修改 `docs/`、`scripts/` 或应用实现文件。

## 3. 目标

交付一套 SanguiBlog 数据备份方案，后续由 DeepSeek 端实现：

1. 将生产服务器 Linux 端的三类数据备份到本地 Windows：
   - MySQL 主业务库。
   - PgVector 向量库。
   - uploads 上传文件目录。
2. 将本地 Windows 已下载并校验的备份数据同步/恢复进本地 Docker 容器：
   - `mysql_data`。
   - `pgvector_data`。
   - `uploads_data`。
3. 文档要拆成清晰两段：
   - 第一段：手册，包含手动命令、脚本入口、验收、回滚、排障。
   - 第二段：本地执行脚本说明，支持从 Windows 发起生产备份、下载、校验、恢复。

## 4. 非目标 / 禁止范围

- 不修改 Java/React 业务逻辑。
- 不修改 API、DTO、前端类型、权限、BotGuard、AI 聊天、RAG 业务行为。
- 不修改 MySQL schema、`sanguiblog_db.sql` 表结构或 PgVector schema，除非实现阶段发现文档与现有 schema 名称不一致并只做文档/脚本引用修正。
- 不引入数据库迁移器。
- 不在文档、脚本输出、日志中打印数据库密码、JWT、AI key、SSH 私钥或完整 `.env` 展开值。
- 不默认执行 `docker compose down -v`。
- 不创建第二套互相竞争的恢复脚本逻辑；优先复用/扩展 `scripts/docker-data-sync-local-restore.ps1` 的现有 restore path。
- 不自动提交、推送或归档本任务。

## 5. 现有实现复用决策

## Retrieval Report

- Keywords searched:
  - `docker-data-sync`
  - `backup`
  - `restore`
  - `mysqldump`
  - `pg_dump`
  - `pg_restore`
  - `uploads`
  - `chown`
  - `SHA256SUMS`
  - `manifest`
- Candidate implementations:
  - `docs/docker-data-sync.md`: 已有 Linux 导出、Windows 本地 Docker 恢复、checksum、manifest、回滚、排障说明。
  - `scripts/docker-data-sync-local-restore.ps1`: 已有 Windows 本地下载远端备份目录、校验 checksum、备份本地 volumes、恢复 MySQL/PgVector/uploads、修复 uploads owner、健康检查的主流程。
  - `.trellis/spec/guides/cross-layer-thinking-guide.md`: 已有 `Docker Data Sync / Restore` 合同，明确了文件、命令、validation matrix、Good/Base/Bad cases 和必跑验证。
  - `docs/docker-deploy.md`: 已有 Docker volumes、uploads-init、AI/RAG、端点验收、权限探针、`down -v` 禁止说明。
  - `scripts/README.md`: 已记录 `docker-data-sync-local-restore.ps1` 脚本用途。
- Decision:
  - 修改现有 `docs/docker-data-sync.md` 为端到端备份/恢复手册。
  - 修改现有 `scripts/docker-data-sync-local-restore.ps1`，增加从 Windows 发起远端生产备份的能力，并保留现有 restore 兼容入口。
  - 视实现复杂度可将脚本标题/注释改为 `SanguiBlog Docker Data Backup and Local Restore`，但不新建并行 restore 脚本。
- Duplicate risk:
  - 现有脚本已经拥有恢复流程和安全校验，新增能力应挂在同一脚本的 backup/download 阶段。
  - 若实现阶段确实需要拆分，最多新增一个只负责远端导出/下载的 helper 脚本；恢复仍必须调用或复用现有 restore path，不能复制粘贴另一份 MySQL/PgVector/uploads 恢复逻辑。

## 6. 目标用户与运行假设

主要用户：SanguiBlog 运维者，在 Windows 本地机器上通过 PowerShell 5.1 运行脚本。

默认假设：

- 生产服务器是 Linux，并运行 SanguiBlog Docker Compose 生产部署。
- 生产项目目录可通过 SSH 访问，例如 `/opt/SanguiBlog` 或用户指定路径。
- 生产 Compose 文件默认为 `docker-compose.prod.yml`，但脚本必须允许指定。
- 生产 `.env` 保存在生产项目目录，脚本通过 SSH 进入该目录后由 Docker Compose 读取 `.env` 并注入容器；脚本不直接 shell-source 整个 `.env`，不把真实值下载或打印到本地。
- 本地 Windows 从仓库根目录运行脚本，目标本地 Compose 文件为 `docker-compose.yml`。
- 本地 `.env` 已由 `.env.example` 复制并填入必填项。

如果生产不是 Docker Compose 部署，文档可以提供手动宿主机 `mysqldump` / `pg_dump` fallback；自动脚本首版只需支持 Docker Compose 生产部署。

## 7. 方案概览

推荐把现有 `scripts/docker-data-sync-local-restore.ps1` 扩展为一个端到端本地执行器：

```powershell
.\scripts\docker-data-sync-local-restore.ps1 `
  -Mode BackupAndRestore `
  -ServerHost your-server `
  -ServerUser root `
  -RemoteProjectDir /opt/SanguiBlog `
  -RemoteComposeFile docker-compose.prod.yml `
  -LocalBackupDir .\backups\sanguiblog-prod
```

支持三个模式：

| Mode | 行为 |
|------|------|
| `BackupOnly` | Windows 通过 SSH 让 Linux 生产端导出 MySQL/PgVector/uploads，生成 checksum/manifest，下载到本地后停止。 |
| `RestoreOnly` | 使用已有本地或远端备份目录，执行现有恢复流程。现有参数行为保持兼容。 |
| `BackupAndRestore` | 先执行 `BackupOnly`，校验通过后恢复到本地 Docker。 |

实现阶段也可以使用 `-CreateRemoteBackup` 开关代替 `-Mode`，但 PRD 推荐 `-Mode`，因为它更清楚地区分“只备份”和“备份后恢复”。

## 8. Command / Payload / Storage Contract

### 8.1 PowerShell 脚本参数合同

保留现有参数：

| 参数 | 状态 | 说明 |
|------|------|------|
| `-ServerHost` | 保留 | SSH host/IP。 |
| `-ServerUser` | 保留 | SSH 用户。 |
| `-RemoteBackupDir` | 保留 | 现有远端备份目录。`RestoreOnly` 兼容现有用法。 |
| `-LocalBackupDir` | 保留 | 本地备份目录。 |
| `-SshPort` | 保留 | SSH 端口。 |
| `-ComposeProjectDir` | 保留 | 本地 Compose 项目目录。 |
| `-RestoreUploadsMode Replace|Merge` | 保留 | uploads 恢复策略。 |
| `-SkipDownload` | 保留 | 使用已有本地备份。 |
| `-SkipMysql` / `-SkipPgVector` / `-SkipUploads` | 保留 | 跳过对应恢复步骤。 |
| `-DryRun` | 保留 | 只检查前置条件，不做修改。 |

新增推荐参数：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `-Mode BackupOnly|RestoreOnly|BackupAndRestore` | `RestoreOnly` | 保持现有脚本行为兼容；用户显式指定备份模式。 |
| `-RemoteProjectDir` | 无，backup 模式必填 | 生产服务器 SanguiBlog 项目目录，包含 `.env` 和生产 compose 文件。 |
| `-RemoteComposeFile` | `docker-compose.prod.yml` | 生产 Compose 文件名或相对路径。 |
| `-RemoteBackupRoot` | `/tmp` | 生产端临时备份根目录。 |
| `-RemoteHostLabel` | `production` | 写入 manifest 的非敏感来源标签。 |
| `-KeepRemoteBackup` | `$true` | 下载成功后是否保留远端备份目录。建议默认保留，避免误删生产证据。 |
| `-CleanupRemoteBackup` | `$false` | 用户显式要求时，下载与 checksum 通过后删除远端临时备份目录。 |
| `-BackupTimestamp` | 自动生成 | 可选固定时间戳，便于重试和命名。 |

### 8.2 备份文件合同

每次完整备份目录必须包含：

| 文件 | 必需 | 生成方式 |
|------|------|----------|
| `mysql.sql` | 是，除非 `-SkipMysql` | `mysqldump --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --set-gtid-purged=OFF --no-tablespaces` |
| `pgvector.dump` | 是，除非 `-SkipPgVector` | `pg_dump -Fc` |
| `uploads.tar.gz` | 是，除非 `-SkipUploads` | 从生产 `web` 或 `backend` 容器读取 `/data/uploads`，打包为包含顶层 `uploads/` 目录的 tar.gz |
| `SHA256SUMS` | 是 | 对上述数据文件生成 SHA-256 |
| `manifest.json` | 推荐必需 | 记录非敏感元数据、文件大小、关键计数、生成时间、脚本版本 |

### 8.3 远端 Linux 命令合同

远端备份应从生产项目目录执行。生产 `.env` 由 Docker Compose 自动读取，脚本不直接执行 `set -a; . ./.env; set +a`，避免 Compose 合法但 bash source 不合法的值（例如带空格的 JVM options）导致备份失败：

```bash
cd "$REMOTE_PROJECT_DIR"
```

注意：

- 真实密码只在 Docker Compose 注入后的远端容器内命令使用，不输出。
- `docker compose -f "$REMOTE_COMPOSE_FILE"` 必须可用。
- `docker compose config` 输出可能包含敏感展开值，不应原样打印到本地日志。

MySQL 导出：

```bash
docker compose -f "$REMOTE_COMPOSE_FILE" exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --set-gtid-purged=OFF --no-tablespaces -uroot "$MYSQL_DATABASE"' \
  > "$BACKUP_DIR/mysql.sql"
```

PgVector 导出：

```bash
docker compose -f "$REMOTE_COMPOSE_FILE" exec -T pgvector sh -c \
  'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > "$BACKUP_DIR/pgvector.dump"
```

uploads 导出：

```bash
docker compose -f "$REMOTE_COMPOSE_FILE" exec -T web sh -c \
  'tar -czf - -C /data uploads' \
  > "$BACKUP_DIR/uploads.tar.gz"
```

若 `web` 容器不可用但 `backend` 挂载 `/data/uploads`，文档可说明 fallback：

```bash
docker compose -f "$REMOTE_COMPOSE_FILE" exec -T backend sh -c \
  'tar -czf - -C /data uploads' \
  > "$BACKUP_DIR/uploads.tar.gz"
```

### 8.4 本地恢复合同

恢复仍复用现有逻辑：

- checksum mismatch 必须在 DB import 或 volume overwrite 前停止。
- 恢复前先备份本地 `mysql_data`、`pgvector_data`、`uploads_data`。
- MySQL dump 先复制进 `mysql` 容器，再由容器内 `mysql` 命令导入，避免 PowerShell 文本管道编码风险。
- PgVector `pgvector.dump` 是二进制 custom format，必须复制进 `pgvector` 容器再运行 `pg_restore`，不得通过 PowerShell 文本流管道恢复。
- uploads tar 必须先检查绝对路径和 `..` traversal，再复制到 `/data/uploads`。
- uploads 恢复后必须用 backend 容器 root 执行 `chown -R sangui:sangui /data/uploads`，并验证 `posts`、`covers`、`avatar` 可写。

## 9. 手册结构要求

目标文档：`docs/docker-data-sync.md`。

建议重构为：

1. 概述与数据资产
2. 安全边界与敏感信息规则
3. 第一段：生产 Linux -> 本地 Windows 备份
   - 前置条件
   - 手动命令
   - 本地脚本 `BackupOnly` 命令
   - checksum / manifest 验证
   - 远端备份保留与清理策略
4. 第二段：本地备份 -> 本地 Docker 容器恢复
   - 前置条件
   - dry-run
   - `RestoreOnly` / `BackupAndRestore`
   - MySQL 恢复
   - PgVector 恢复
   - uploads 恢复与权限修复
5. 验收清单
6. 回滚流程
7. 常见问题
8. 脚本参数表

文档必须强调：

- 日常恢复不要使用 `docker compose down -v`。
- `BackupOnly` 是只读生产业务数据的导出操作，不应停止生产服务。
- `BackupAndRestore` 会覆盖本地 Docker 数据，但会先创建本地 pre-restore volume backup。
- 生产 `.env` 真实值不下载、不打印。
- AI/RAG disabled 是合法 base case；核心站点恢复成功不依赖 DashScope key。

## 10. Validation / Error Matrix

| Case | 预期结果 | 检查点 |
|------|----------|--------|
| Windows 缺少 `ssh` / `scp` / `docker` | preflight 失败，说明缺少工具 | 脚本 preflight |
| `BackupOnly` 缺少 `-RemoteProjectDir` | backup 前失败，提示必填参数 | 参数校验 |
| SSH 连接失败 | 停止，不创建本地 Docker 改动 | preflight |
| 远端项目目录不存在或缺少 `.env` | 停止，不打印 `.env` 内容 | remote preflight |
| 远端 `docker compose` 不可用 | 停止，提示生产 Compose 不可用 | remote preflight |
| 远端 MySQL 容器 unhealthy | backup 失败，只保留已生成临时文件路径 | backup step |
| 远端 PgVector 容器 unhealthy | backup 失败，不进入本地 restore | backup step |
| uploads 容器路径不存在 | backup 失败，文档提示检查 `/data/uploads` mount | backup step |
| `SHA256SUMS` 校验失败 | 停止，不导入 DB，不覆盖 volumes | local verify |
| `manifest.json` 缺失 | 可以警告，但 checksum 仍是硬门槛；文档说明 manifest 是验收辅助 | local verify |
| 本地 `.env` 缺少必填 key | 停止，只打印缺失 key 名，不打印值 | local preflight |
| 本地已有 Docker volumes | 恢复前备份到 `pre-restore-*` | restore step |
| PgVector extension 不可用 | 恢复失败，提示使用 `pgvector/pgvector:pg16` 或手动 `CREATE EXTENSION` | restore step |
| uploads tar 含绝对路径或 `..` | 停止，不解压 | uploads safety |
| uploads 恢复后 backend 不可写 | `chown` / write probe 失败，输出手动修复命令 | uploads write probe |
| `/uploads/...` 返回 SPA HTML | 视为恢复失败，检查 Nginx alias 和 volume 内容 | health check |

## 11. Good / Base / Bad Cases

| 类型 | 场景 | 预期 |
|------|------|------|
| Good | `BackupAndRestore` 完整执行，MySQL/PgVector/uploads 均恢复 | `/api/site/meta`、`/api/games`、已知上传资源、PgVector 行数检查通过 |
| Good | `BackupOnly` 执行 | 本地目录包含 `mysql.sql`、`pgvector.dump`、`uploads.tar.gz`、`SHA256SUMS`、`manifest.json`，checksum 通过 |
| Base | AI/RAG 未启用或 DashScope key 缺失 | 核心 blog/admin/uploads 正常，AI/RAG 标记 skipped/disabled |
| Base | 用户只恢复 MySQL + uploads，跳过 PgVector | 核心站点正常；RAG 验收跳过，并在输出中明确 |
| Bad | checksum mismatch | 本地 Docker volumes 不被触碰 |
| Bad | PgVector dump 导入后 `vector_store` 缺失且 RAG 启用 | 恢复失败，需要检查 dump 或运行 RAG resync |
| Bad | uploads 权限 root-owned 导致 backend fail-fast | 输出 `chown` 修复命令，不隐瞒为上传接口偶发问题 |

## 12. 预计修改文件

实现阶段预计修改：

- `docs/docker-data-sync.md`
  - 重构为生产备份到本地 + 本地恢复进 Docker 的双段手册。
  - 增加端到端脚本示例和参数表。
  - 保留现有 checksum、manifest、uploads 权限、回滚、排障内容。
- `scripts/docker-data-sync-local-restore.ps1`
  - 增加 `BackupOnly` / `BackupAndRestore` 或等价参数。
  - 增加远端 production backup 创建、download、checksum、manifest 流程。
  - 保留现有 `RestoreOnly` 行为和参数兼容。
- `scripts/README.md`
  - 更新脚本描述，说明它支持生产备份到本地和本地 Docker 恢复。
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - 若实现引入新的脚本参数或合同，补充 `Docker Data Sync / Restore` 章节。

禁止修改：

- `SanguiBlog-server/**`
- `SanguiBlog-front/**`
- `sanguiblog_db.sql`
- `docker-compose.yml` / `docker-compose.prod.yml`，除非实现阶段发现脚本必须引用已有服务名且文档/脚本契约与当前 compose 实际服务名不一致；即便如此也应优先修正文档/脚本，不改 compose。

## 13. 实施计划

1. 写脚本参数兼容测试思路或静态断言：
   - 确认现有 `RestoreOnly` 示例仍可运行 `-DryRun`。
   - 确认 `BackupOnly -DryRun` 不触碰本地 Docker volumes。
2. 扩展 PowerShell 参数：
   - 增加 `Mode` 和远端 backup 参数。
   - 明确 `RestoreOnly` 默认值，避免破坏现有用法。
3. 抽取/新增阶段函数：
   - `Test-RemoteBackupPreflight`
   - `New-RemoteBackup`
   - `Download-BackupFiles`
   - 复用现有 checksum、volume backup、restore、health check 阶段。
4. 实现远端 backup：
   - 通过 SSH 执行远端 Linux shell。
   - 远端从 `.env` 加载变量。
   - 生成 `mysql.sql`、`pgvector.dump`、`uploads.tar.gz`、`SHA256SUMS`、`manifest.json`。
   - 不打印秘密值。
5. 更新文档：
   - 先给用户手动流程。
   - 再给脚本流程。
   - 加入安全边界、回滚、Good/Base/Bad、排障。
6. 更新 `scripts/README.md`。
7. 如脚本合同新增明显参数，更新 Trellis cross-layer spec。
8. 运行验证命令。

## 14. Required Tests / Verification

实现阶段必须至少运行：

```powershell
git diff --check
docker compose config --quiet
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 -Mode RestoreOnly -ServerHost localhost -ServerUser test -RemoteBackupDir /tmp/test -DryRun
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\docker-data-sync-local-restore.ps1 -Mode BackupOnly -ServerHost localhost -ServerUser test -RemoteProjectDir /tmp/sanguiblog -DryRun
```

如果修改 `.trellis/spec/**`：

```powershell
python .trellis\scripts\task.py validate .trellis\tasks\06-05-data-backup-plan
```

如果实现阶段触及 Docker/compose 行为或要做本地真实恢复验证，还应运行：

```powershell
docker compose config --quiet
docker compose -f docker-compose.prod.yml config --quiet
```

若没有真实生产 SSH 环境，必须明确记录：

- 远端真实 backup 未执行。
- `BackupOnly` 只通过 dry-run / static review 验证。
- 本地真实 restore 是否执行由用户手动验收决定。

## 15. 验收标准

- `docs/docker-data-sync.md` 能被运维者按两段使用：
  - 生产 Linux -> 本地 Windows 备份。
  - 本地 Windows 备份 -> 本地 Docker 容器恢复。
- 文档明确三类数据：MySQL、PgVector、uploads。
- 文档包含手动命令和脚本命令。
- 文档包含 checksum、manifest、敏感信息规则、回滚、故障处理。
- 脚本支持从 Windows 本地发起 `BackupOnly` / `RestoreOnly` / `BackupAndRestore` 或等价入口。
- 现有 `RestoreOnly` / `RemoteBackupDir` 用法保持兼容。
- checksum mismatch 会在触碰本地 volumes 前停止。
- local restore 会在覆盖前备份本地 volumes。
- PgVector 二进制 dump 不通过 PowerShell 文本管道。
- uploads archive 做路径安全检查。
- uploads 恢复后修复 owner，并验证 backend 对 `posts`、`covers`、`avatar` 可写。
- 不泄露秘密值。
- 不修改业务实现文件。

## 16. 需求清晰度

当前无必须阻塞用户确认的问题。

实现阶段默认：

- 自动脚本首版支持 Docker Compose 生产部署。
- 非 Docker 生产部署只在手册中提供 fallback 手动命令。
- 远端备份目录默认保留，只有用户显式指定 `-CleanupRemoteBackup` 才清理。
