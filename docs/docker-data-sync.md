# SanguiBlog Docker 数据同步与恢复指南

> 从服务器 Linux 生产环境导出数据，恢复到本地 Windows Docker 环境，或迁移到新 Docker 服务器。
> 本指南与 `docs/docker-deploy.md` 互补，部署前请先完成 Docker Compose 环境搭建。

---

## 1. 概述

SanguiBlog 的持久化数据包含三部分：

| 数据资产 | 存储位置 | 格式 | 导出工具 |
|----------|----------|------|----------|
| MySQL 主数据库 | `mysql_data` volume | 业务表、用户、文章、游戏、AI 会话 | `mysqldump` |
| PgVector 向量库 | `pgvector_data` volume | AI RAG embedding 向量 | `pg_dump -Fc` |
| uploads 上传文件 | `uploads_data` volume | 头像、文章图片、游戏 HTML、其他资源 | `tar -czf` |

三者共同构成 SanguiBlog 的完整运行时状态。恢复时需保持以下跨层合同一致：

- `uploads_data` volume → 容器内 `/data/uploads`
- Backend `storage.base-path=/data/uploads`（`application-docker.yaml`）
- Nginx `/uploads/`、`/uploads/games/`、`/avatar/` alias → `/data/uploads/...`（`default.conf`）
- MySQL 字符集 `utf8mb4` / 排序规则 `utf8mb4_general_ci`
- PgVector `vector` extension 必须先存在，再恢复向量表数据

---

## 2. 前置条件

### 2.1 服务器端

- Linux 服务器（生产环境），安装有 `mysqldump`、`pg_dump`、`tar`、`sha256sum`
- MySQL 8.0 运行中，数据库名、用户名/密码已知
- PgVector 运行中，数据库名、用户名/密码已知
- 可写入磁盘空间 >= uploads 大小 + MySQL dump 大小 + PgVector dump 大小 + 20% 余量
- 服务器可从本地 Windows 通过 SSH/SCP 访问（建议配置 SSH key 认证）

### 2.2 本地 Windows

- Windows 10/11 + Docker Desktop（Docker >= 24, Compose >= 2.17）
- 已从仓库根目录执行 `cp .env.example .env` 并填入必填项
- 工具链：`ssh`、`scp`、`tar`（Git for Windows / WSL 自带）、PowerShell 5.1+
- 建议为本地恢复预留 >= 5 GB 可用磁盘空间

### 2.3 敏感信息处理

以下值**不能写入仓库**，仅允许在本地 `.env`、交互输入或 SSH profile 中管理：

| 类型 | Key 名（允许出现在文档/脚本中） | 获取方式 |
|------|-------------------------------|----------|
| 数据库密码 | `MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD`、`POSTGRES_PASSWORD`、`SPRING_DATASOURCE_PASSWORD` | 服务器本地 `.env` 或密钥管理 |
| JWT 密钥 | `JWT_SECRET` | 服务器本地 `.env` |
| AI API Key | `AI_DASHSCOPE_API_KEY`、`SPRING_AI_DASHSCOPE_API_KEY` | 服务器本地 `.env` |
| SSH 凭证 | 服务器 host/user/key | 本地 `~/.ssh/config` 或 `ssh-agent` |
| 服务器真实路径 | 生产 uploads 根目录、备份目录 | 用户提供的服务器配置 |

脚本和文档中的所有命令均使用环境变量占位符（如 `$MYSQL_PASSWORD`），不会打印真实值。

---

## 3. 数据资产盘点

在首次导出前，建议先在服务器上盘点数据规模，用于生成 `manifest.json` 和选择存储空间。

### 3.1 MySQL 盘点

```bash
# 检查库名、表列表、行数（在容器内读取 Compose 注入的数据库变量）
MYSQL_DB="${MYSQL_DATABASE:-sanguiblog_db}"
MYSQL_USER_VAR="${MYSQL_USER:-sanguiblog_user}"

# 表列表
docker compose exec mysql sh -c "mysql -u\"\$MYSQL_USER\" -p\"\$MYSQL_PASSWORD\" \"\$MYSQL_DATABASE\" -e \"SHOW TABLES;\""

# 关键表行数
docker compose exec mysql sh -c "mysql -u\"\$MYSQL_USER\" -p\"\$MYSQL_PASSWORD\" \"\$MYSQL_DATABASE\" -e \"
SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
UNION ALL SELECT 'posts', COUNT(*) FROM posts
UNION ALL SELECT 'game_pages', COUNT(*) FROM game_pages
UNION ALL SELECT 'ai_chat_sessions', COUNT(*) FROM ai_chat_sessions
UNION ALL SELECT 'ai_blog_knowledge_documents', COUNT(*) FROM ai_blog_knowledge_documents
UNION ALL SELECT 'ai_custom_knowledge_documents', COUNT(*) FROM ai_custom_knowledge_documents;
\""

# 字符集确认
docker compose exec mysql sh -c "mysql -u\"\$MYSQL_USER\" -p\"\$MYSQL_PASSWORD\" -e \"SHOW VARIABLES LIKE 'character_set_database'; SHOW VARIABLES LIKE 'collation_database';\""
```

对于非 Docker 部署的服务器 MySQL，使用宿主机 `mysql` 命令：

```bash
mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES;"
```

### 3.2 PgVector 盘点

```bash
POSTGRES_DB_VAR="${POSTGRES_DB:-sanguiblog_ai}"
POSTGRES_USER_VAR="${POSTGRES_USER:-sanguiblog_pg_user}"

# 检查 vector extension
docker compose exec pgvector psql -U "$POSTGRES_USER_VAR" -d "$POSTGRES_DB_VAR" \
  -c "SELECT extname, extversion FROM pg_extension WHERE extname='vector';"

# 检查向量表及行数
docker compose exec pgvector psql -U "$POSTGRES_USER_VAR" -d "$POSTGRES_DB_VAR" \
  -c "SELECT schemaname, tablename FROM pg_tables WHERE tablename='vector_store';"

docker compose exec pgvector psql -U "$POSTGRES_USER_VAR" -d "$POSTGRES_DB_VAR" \
  -c "SELECT COUNT(*) FROM vector_store;"
```

### 3.3 uploads 盘点

```bash
UPLOADS_PATH="/home/sangui/uploads"   # 替换为实际路径

# 目录结构（一级子目录）
ls -la "$UPLOADS_PATH"/

# 文件数量和总大小
find "$UPLOADS_PATH" -type f | wc -l
du -sh "$UPLOADS_PATH"

# 每个子目录的文件数
for dir in avatar posts games; do
  count=$(find "$UPLOADS_PATH/$dir" -type f 2>/dev/null | wc -l)
  echo "$dir: $count files"
done
```

---

## 4. 服务器端数据导出

以下命令在**服务器**上执行。所有占位符（如 `$BACKUP_DIR`、`$MYSQL_USER`）请替换为实际值。

### 4.1 创建备份目录

```bash
BACKUP_DIR="/tmp/sanguiblog-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Backup dir: $BACKUP_DIR"
```

### 4.2 导出 MySQL

```bash
# 宿主机 MySQL
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --default-character-set=utf8mb4 \
  --set-gtid-purged=OFF \
  -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
  "$MYSQL_DATABASE" \
  > "$BACKUP_DIR/mysql.sql"

echo "MySQL dump size: $(du -h "$BACKUP_DIR/mysql.sql" | cut -f1)"
```

若 MySQL 在 Docker 容器内：

```bash
docker compose exec -T mysql sh -c \
  'mysqldump --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --set-gtid-purged=OFF -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > "$BACKUP_DIR/mysql.sql"
```

### 4.3 导出 PgVector

```bash
# 宿主机 PostgreSQL
pg_dump -Fc \
  -h "$PGHOST" -p "$PGPORT" \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -f "$BACKUP_DIR/pgvector.dump"

echo "PgVector dump size: $(du -h "$BACKUP_DIR/pgvector.dump" | cut -f1)"
```

若 PgVector 在 Docker 容器内：

```bash
docker compose exec -T pgvector sh -c \
  'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > "$BACKUP_DIR/pgvector.dump"
```

> `pg_dump -Fc` 输出 custom format。恢复时必须使用 `pg_restore`，比 `-Fp`（plain SQL）更稳定且支持并行恢复。

### 4.4 打包 uploads

```bash
UPLOADS_PARENT="/home/sangui"        # uploads 目录的父目录
UPLOADS_DIRNAME="uploads"            # uploads 目录本身的名字

tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$UPLOADS_PARENT" "$UPLOADS_DIRNAME"

echo "uploads archive size: $(du -h "$BACKUP_DIR/uploads.tar.gz" | cut -f1)"
```

> 注意 `-C` 参数的作用：`tar` 会先 `cd` 到上传目录的父目录，再打包 `uploads` 子目录名。这样解压后得到的路径不含绝对前缀。

### 4.5 生成 manifest 和 checksum

```bash
# SHA-256 checksums
sha256sum "$BACKUP_DIR"/mysql.sql "$BACKUP_DIR"/pgvector.dump "$BACKUP_DIR"/uploads.tar.gz \
  > "$BACKUP_DIR/SHA256SUMS"

cat "$BACKUP_DIR/SHA256SUMS"
```

创建 `manifest.json`（手动或脚本生成，记录关键元数据）：

```json
{
  "generatedAt": "2026-05-20T00:00:00+08:00",
  "source": {
    "hostLabel": "production",
    "app": "SanguiBlog"
  },
  "mysql": {
    "database": "sanguiblog_db",
    "charset": "utf8mb4",
    "collation": "utf8mb4_general_ci",
    "dumpFile": "mysql.sql",
    "bytes": 0,
    "tableCount": 0,
    "keyCounts": {
      "users": 0,
      "posts": 0,
      "game_pages": 0,
      "ai_chat_sessions": 0,
      "ai_blog_knowledge_documents": 0,
      "ai_custom_knowledge_documents": 0
    }
  },
  "pgvector": {
    "database": "sanguiblog_ai",
    "schema": "public",
    "extension": "vector",
    "table": "vector_store",
    "dumpFile": "pgvector.dump",
    "bytes": 0,
    "rowCount": 0
  },
  "uploads": {
    "sourcePathLabel": "<server-uploads-path>",
    "archiveFile": "uploads.tar.gz",
    "bytes": 0,
    "fileCount": 0,
    "topLevelDirs": ["avatar", "posts", "games"]
  },
  "checksums": {
    "algorithm": "sha256",
    "file": "SHA256SUMS"
  }
}
```

> 将 `bytes`、`tableCount`、`keyCounts`、`rowCount`、`fileCount` 等填入在服务器上实际观察到的值。这些值将用于恢复后验证。

### 4.6 确认导出完整性

```bash
ls -lh "$BACKUP_DIR"/
cat "$BACKUP_DIR/SHA256SUMS"
sha256sum -c "$BACKUP_DIR/SHA256SUMS"
```

---

## 5. 本地 Windows Docker 恢复

### 5.1 自动化恢复（推荐）

使用 PowerShell 恢复脚本：

```powershell
.\scripts\docker-data-sync-local-restore.ps1 `
  -ServerHost your-server-host `
  -ServerUser your-username `
  -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000 `
  -LocalBackupDir .\backups\docker-data-sync
```

先以 dry-run 模式检查各项前置条件：

```powershell
.\scripts\docker-data-sync-local-restore.ps1 `
  -ServerHost your-server-host `
  -ServerUser your-username `
  -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000 `
  -DryRun
```

脚本支持的参数（详见 `-?` 或脚本头注释）：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `-ServerHost` | 必填 | 服务器主机名或 IP |
| `-ServerUser` | 必填 | SSH 用户名 |
| `-RemoteBackupDir` | 必填 | 服务器上备份目录的绝对路径 |
| `-LocalBackupDir` | `.\backups\docker-data-sync` | 本地备份暂存目录 |
| `-SshPort` | `22` | SSH 端口 |
| `-ComposeProjectDir` | `.` (repo root) | docker-compose.yml 所在目录 |
| `-RestoreUploadsMode` | `Replace` | uploads 恢复策略：Replace 或 Merge |
| `-SkipDownload` | `$false` | 跳过从服务器下载（使用已有的本地备份） |
| `-SkipMysql` | `$false` | 跳过 MySQL 导入 |
| `-SkipPgVector` | `$false` | 跳过 PgVector 导入 |
| `-SkipUploads` | `$false` | 跳过 uploads 恢复 |
| `-DryRun` | `$false` | 仅检查前置条件，不执行实际操作 |

### 5.2 手动恢复流程

如果选择手动操作，按以下步骤执行。

#### 5.2.1 下载备份文件

```powershell
# 创建本地备份目录
$LocalBackupDir = ".\backups\docker-data-sync"
New-Item -ItemType Directory -Force -Path $LocalBackupDir | Out-Null

# 从服务器下载
scp -r server-user@your-server:/tmp/sanguiblog-backup-20260520-120000/* $LocalBackupDir/
```

#### 5.2.2 校验文件完整性

```powershell
# Windows 下可对比文件大小
Get-ChildItem $LocalBackupDir

# 如果有 sha256sum（Git Bash / WSL）
bash -c "cd '$LocalBackupDir' && sha256sum -c SHA256SUMS"

# 或在 PowerShell 中使用 certutil
Get-Content "$LocalBackupDir\SHA256SUMS" | ForEach-Object {
    $hash, $file = $_ -split '\s+', 2
    $localHash = (Get-FileHash "$LocalBackupDir\$file" -Algorithm SHA256).Hash.ToLower()
    if ($localHash -eq $hash) {
        Write-Host "OK: $file"
    } else {
        Write-Error "CHECKSUM MISMATCH: $file"
    }
}
```

> 校验失败时必须停止，不要继续执行后续导入。保留下载的文件用于检查。

#### 5.2.3 备份现有 Docker 数据（安全措施）

```powershell
# 如果 mysql_data volume 已有数据，先备份
$BackupTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$PreRestoreBackupDir = ".\backups\pre-restore-$BackupTimestamp"

if ($(docker volume inspect mysql_data 2>$null).Length -gt 0) {
    Write-Host "Backing up existing MySQL volume..."
    New-Item -ItemType Directory -Force -Path "$PreRestoreBackupDir\mysql" | Out-Null
    docker run --rm -v mysql_data:/data -v "$(Resolve-Path $PreRestoreBackupDir\mysql):/backup" alpine tar -czf /backup/mysql_backup.tar.gz -C /data .
}

# 同样备份 pgvector_data 和 uploads_data（如果需要）
```

#### 5.2.4 停止 Docker 服务

```powershell
docker compose down
```

> **不要**使用 `docker compose down -v`，这会删除 volumes 中的所有数据。

#### 5.2.5 清空并导入 MySQL

```powershell
# 启动仅 MySQL 服务（用于导入）
docker compose up -d mysql
# 等待健康检查通过
Start-Sleep -Seconds 15

# 清空数据库并重新导入
# 注意：DROP DATABASE 需要 root 权限
docker compose exec -T mysql sh -c `
  'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"'

# 导入 dump（先复制到容器，避免 PowerShell 文本管道改变编码或占用大量内存）
docker compose cp "$LocalBackupDir\mysql.sql" mysql:/tmp/sanguiblog-mysql.sql
docker compose exec -T mysql sh -c `
  'mysql -u root -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$MYSQL_DATABASE" < /tmp/sanguiblog-mysql.sql'
docker compose exec -T mysql rm -f /tmp/sanguiblog-mysql.sql

# 授予业务用户权限
docker compose exec -T mysql sh -c `
  'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO \`$MYSQL_USER\`@\`%\`; FLUSH PRIVILEGES;"'
```

> **stale schema 风险**：MySQL Docker 的 `docker-entrypoint-initdb.d/` 只在空 volume 首次运行时执行。如果之前 `mysql_data` volume 已存在旧 schema，导入的 dump 可能包含旧表结构。建议导入后对比 `sanguiblog_db.sql` 中的表定义，确保一致性。

#### 5.2.6 清空并导入 PgVector

```powershell
# 启动 PgVector 服务
docker compose up -d pgvector
Start-Sleep -Seconds 10

# 确认 vector extension 可用
docker compose exec pgvector psql -U "$env:POSTGRES_USER" -d "$env:POSTGRES_DB" `
  -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 清空目标数据库并重建
docker compose exec pgvector psql -U "$env:POSTGRES_USER" -d postgres `
  -c "DROP DATABASE IF EXISTS $env:POSTGRES_DB;"

docker compose exec pgvector psql -U "$env:POSTGRES_USER" -d postgres `
  -c "CREATE DATABASE $env:POSTGRES_DB OWNER $env:POSTGRES_USER;"

# 确保 vector extension 存在于新数据库中
docker compose exec pgvector psql -U "$env:POSTGRES_USER" -d "$env:POSTGRES_DB" `
  -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 恢复 custom format dump（二进制文件必须复制到容器内再由 pg_restore 读取）
docker compose cp "$LocalBackupDir\pgvector.dump" pgvector:/tmp/sanguiblog-pgvector.dump
docker compose exec -T pgvector sh -c `
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner /tmp/sanguiblog-pgvector.dump'
docker compose exec -T pgvector rm -f /tmp/sanguiblog-pgvector.dump
```

#### 5.2.7 恢复 uploads

```powershell
# 检查 tar 包内容（安全：不允许绝对路径或 .. 路径）
bash -c "tar -tzf '$LocalBackupDir\uploads.tar.gz' | head -20"

# 检查是否存在不安全路径
$unsafe = bash -c "tar -tzf '$LocalBackupDir\uploads.tar.gz'" | Where-Object { $_ -match '^\.\.|^/' }
if ($unsafe) {
    Write-Error "Unsafe paths found in uploads archive. Aborting."
    exit 1
}

# 启动 web 服务（使 uploads_data volume 可用）
docker compose up -d web
Start-Sleep -Seconds 5

# 恢复 uploads
# 解压时跳过第一级目录名（因为 tar 包中包含 'uploads/' 前缀）
bash -c "tar -xzf '$LocalBackupDir\uploads.tar.gz' --strip-components=1 -C /tmp/restore-uploads/"
docker compose cp /tmp/restore-uploads/. web:/data/uploads/
```

> uploads 的恢复路径必须符合 Docker 存储合同：`uploads_data` volume 挂载到 `/data/uploads`，Nginx 通过 `/uploads/`、`/uploads/games/`、`/avatar/` alias 服务静态文件。

#### 5.2.8 启动所有服务

```powershell
docker compose up -d --build
# 等待服务就绪
Start-Sleep -Seconds 30
docker compose ps
```

---

## 6. 恢复后验证

### 6.1 服务状态

```powershell
docker compose ps
# 期望：所有服务（web、backend、mysql、pgvector）状态为 Up 且 healthy
```

```powershell
# 后端日志检查（最近 30 行）
docker compose logs --tail 30 backend
```

### 6.2 核心 API

```powershell
# 站点元信息
curl.exe -i http://localhost/api/site/meta

# 游戏/工具列表
curl.exe -i http://localhost/api/games

# 站点地图（必须返回 XML，非 HTML）
curl.exe -i http://localhost/sitemap.xml

# robots.txt（必须返回 text/plain，非 HTML）
curl.exe -i http://localhost/robots.txt
```

### 6.3 上传资源

```powershell
# 任意已知上传资源路径，验证返回真实图片/文件，而非 SPA HTML
curl.exe -i http://localhost/uploads/
curl.exe -i http://localhost/avatar/some-avatar.jpg
curl.exe -i http://localhost/uploads/games/some-game/index.html

# 验证返回的 Content-Type 不是 text/html（SPA fallback 的特征）
```

### 6.4 前端页面

在浏览器中访问 `http://localhost` 并检查：

- [ ] 首页正常展示文章列表、封面图
- [ ] 文章详情页图片正常加载
- [ ] 头像正常显示
- [ ] 工具/游戏页面正常运行（iframe 嵌入）
- [ ] 登录后台（`/admin`）
- [ ] 后台文章管理可见历史文章

### 6.5 AI / RAG 验证

```powershell
# 检查 PgVector vector extension
docker compose exec pgvector psql -U "$env:POSTGRES_USER" -d "$env:POSTGRES_DB" `
  -c "SELECT extname FROM pg_extension WHERE extname='vector';"

# 检查向量表行数
docker compose exec pgvector psql -U "$env:POSTGRES_USER" -d "$env:POSTGRES_DB" `
  -c "SELECT COUNT(*) FROM vector_store;"

# 检查 AI 助手是否启用
curl.exe -s http://localhost/api/site/meta | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['aiAssistant'])"

# 检查 DashScope key 是否已注入（不打印值）
docker compose exec backend sh -c 'test -n "$SPRING_AI_DASHSCOPE_API_KEY" && echo "SPRING_AI_DASHSCOPE_API_KEY is set" || echo "SPRING_AI_DASHSCOPE_API_KEY is empty"'
```

**验证结论分类：**

| 场景 | MySQL + uploads 正常 | PgVector 正常 | AI 密钥已配置 | 结论 |
|------|---------------------|---------------|-------------|------|
| Good | ✅ | ✅ | ✅ | 完整恢复成功 |
| Base | ✅ | 无关 | ❌（AI 故意禁用） | 核心站点恢复成功；AI/RAG 标记为 skipped/disabled |
| Bad | ✅ | ✅ | ✅ | 但向量表为空 → 需运行 RAG resync |
| Bad | ❌ | — | — | 恢复失败，检查日志 |

**AI/RAG disabled 是合法的 base case**：如果未配置 DashScope key，核心 blog/admin/upload 功能应正常工作，AI 助手不应出现在前端，`/api/site/meta.aiAssistant.enabled` 应为 `false`。

---

## 7. 回滚流程

如果恢复后发现数据问题，可按以下步骤回滚到恢复前的状态。

### 7.1 使用预恢复备份回滚

假设恢复前已按 5.2.3 节备份了现有 Docker volumes：

```powershell
$PreRestoreBackupDir = ".\backups\pre-restore-20260520-120000"

# 停止服务
docker compose down

# 删除当前 volumes
docker volume rm sanguiblog_mysql_data sanguiblog_pgvector_data sanguiblog_uploads_data

# 重新创建 volumes
docker compose up -d --build
Start-Sleep -Seconds 10
docker compose down

# 恢复 MySQL 备份
docker compose up -d mysql
Start-Sleep -Seconds 15
bash -c "tar -xzf '$PreRestoreBackupDir/mysql/mysql_backup.tar.gz' -C /tmp/mysql-restore/"
docker compose cp /tmp/mysql-restore/. mysql:/var/lib/mysql/
docker compose restart mysql

# 启动所有服务
docker compose up -d --build
```

### 7.2 无法回滚时的补救

- 重新从服务器导出最新的数据
- 如果服务器数据也已损坏，从更早的服务器本地备份恢复

---

## 8. 服务器 Linux 部署/迁移流程

本指南也可用于将数据迁移到另一个 Linux Docker 服务器。

### 8.1 在新服务器上

```bash
# 1. 搭建 Docker Compose 环境（参考 docs/docker-deploy.md）
cp .env.example .env
# 编辑 .env，填入必填项

# 2. 将备份文件传输到新服务器
scp -r local-backup-dir user@new-server:/tmp/sanguiblog-restore/

# 3. 恢复数据（参考第 5.2 节手动流程，或在 PowerShell 脚本中指定 Linux 路径）
```

### 8.2 注意事项

- 两端的 `docker-compose.yml` 和 `.env` 键名需保持一致
- MySQL JDBC URL 中 `characterEncoding=utf8`（不是 `utf8mb4`，MySQL Connector/J 将其视为 Java charset 会失败）
- `utf8mb4` 在 MySQL server 和 table collation 级别保障
- 新服务器的 `JWT_SECRET` 建议使用与生产不同的值，避免 token 跨环境泄露

---

## 9. 常见问题排查

| 现象 | 可能原因 | 解决方案 |
|------|----------|----------|
| `docker compose up` 失败：`JWT_SECRET is required` | `.env` 缺少必填项 | 编辑 `.env` 填入所有必填值 |
| MySQL 导入后 AI 聊天报错 `Table '...ai_chat_messages' doesn't exist` | 导入的 dump 来自旧 schema，缺少 AI 表 | 参考 `docs/docker-deploy.md` 第 15 节，手动创建缺失的 AI 表 |
| `/uploads/...` 返回 HTML 而非图片 | Nginx fallback 到 SPA（uploads_data volume 内容缺失或路径不匹配） | 检查 volume 内容和 `default.conf` alias 配置；确认 `uploads_data` 挂载到 `/data/uploads` |
| PgVector 恢复报错 `extension "vector" is not available` | pgvector 镜像未正确加载 vector 扩展 | 手动执行 `CREATE EXTENSION IF NOT EXISTS vector;` |
| `pg_restore` 报错 `role does not exist` | dump 中包含的 role 在目标数据库中不存在 | 使用 `--no-owner` 参数跳过 ownership |
| `/sitemap.xml` 返回 HTML | Nginx SPA fallback 捕获了 sitemap 请求 | 检查 `default.conf` 中 `location = /sitemap.xml` 是否有 proxy_pass |
| 上传的图片/文件无法访问 | `storage.base-path` 与 Nginx alias 不一致 | 确认 `application-docker.yaml` 中 `storage.base-path=/data/uploads`，`default.conf` 中 alias 指向 `/data/uploads/` |
| 导入后文章、用户等核心数据正常但 RAG 搜索无结果 | PgVector 向量表为空或 embedding 与当前文档不同步 | 运行后端 RAG 重新同步：重启 backend 触发 startup knowledge sync |
| Windows 下 `tar` 命令不可用 | 未安装 Git for Windows 或 WSL | 安装 Git for Windows（自带 `tar.exe`），或使用 WSL |
| 从服务器 scp 下载速度慢 | 网络带宽限制或 uploads 包过大 | 考虑在服务器端分段压缩，或使用 rsync 按需同步 |
| Docker volume 路径在 Windows 下无法直接访问 | Docker Desktop 将 volumes 存储在 WSL2 虚拟机中 | 使用 `docker compose cp` 或 `docker run --rm -v` 操作 volume 数据 |
| 本地 `.env` 中 `SPRING_DATASOURCE_URL` 包含 `characterEncoding=utf8mb4` | MySQL Connector/J 不支持此 Java charset 名称 | 改为 `characterEncoding=utf8`，依赖 MySQL server collation 保持 utf8mb4 |
| 恢复后上传失败："无法创建存储目录" | `docker compose cp` 或 tar 解压时创建的目录 user/group 为 root，backend 以非 root 用户 `sangui:sangui` 运行无法写入子目录 | 见下方 "uploads 权限修复" 章节 |

### 9.1 uploads 权限修复

Backend 容器以非 root 用户 `sangui:sangui`（uid=100, gid=101）运行。恢复 uploads 时，`docker compose cp` 会将上传的 `avatar/`、`posts/`、`covers/` 等子目录写为 `root:root 755`，导致 backend 无法在子目录下创建新文件，报错 "无法创建存储目录"。

**自动化脚本已内置修复**：`scripts/docker-data-sync-local-restore.ps1` 在 STEP 8 重新复制 uploads 后，会自动通过 backend 容器以 root 执行 `chown -R sangui:sangui /data/uploads`，然后验证 `posts`、`covers`、`avatar` 三个关键目录可写。

**手动修复命令**（如果脚本未覆盖或需要事后修复）：

```bash
docker compose exec -u root backend sh -c "chown -R sangui:sangui /data/uploads"
```

**验证写入权限**：

```bash
docker compose exec backend sh -c 'id && ls -ld /data/uploads /data/uploads/avatar /data/uploads/covers /data/uploads/posts'
docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test'
docker compose exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test'
docker compose exec backend sh -c 'touch /data/uploads/avatar/.write-test && rm -f /data/uploads/avatar/.write-test'
```

**原因说明**：`docker compose cp` 在未指定 `--archive` 时默认以 root 身份复制文件，恢复的目录 owner 变为 `root:root`。Backend Dockerfile 已将运行用户切换为 `sangui`，但没有写权限的 `root:root 755` 子目录会阻止 backend 在其中创建子目录。`chown -R sangui:sangui` 将所有权交还给 backend 运行用户，同时保持 755 权限允许 Nginx（web 容器）继续读取静态文件。

**不要做的操作**：
- 不要把 backend 容器改为 root 长期运行。
- 不要执行 `docker compose down -v` 清空 volume。
- 不要修改前端 asset URL 或 Nginx alias。

---

## 10. 与 docker-deploy.md 的关系

- `docs/docker-deploy.md`：**Docker Compose 环境搭建指南**，包括镜像构建、环境变量、基础部署验证、AI 表诊断。
- `docs/docker-data-sync.md`（本文件）：**数据同步与恢复指南**，依赖 `docker-deploy.md` 中搭建好的环境，专注于数据导出/导入/验证/回滚。

部署新环境时，先完成 `docs/docker-deploy.md` 的环境搭建，再按本指南恢复数据。

---

## 11. 自动化执行入口

```powershell
# 验证各工具可用性（dry-run）
.\scripts\docker-data-sync-local-restore.ps1 `
  -ServerHost your-server `
  -ServerUser your-user `
  -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000 `
  -DryRun

# 执行完整恢复
.\scripts\docker-data-sync-local-restore.ps1 `
  -ServerHost your-server `
  -ServerUser your-user `
  -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000
```
