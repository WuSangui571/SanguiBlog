# SanguiBlog Docker 数据备份与恢复指南

> 本指南覆盖两类场景：
> - **第一段**：从生产 Linux 备份数据到本地 Windows
> - **第二段**：从本地备份恢复到本地 Docker 容器
>
> 与 `docs/docker-deploy.md` 互补：部署前请先完成 Docker Compose 环境搭建。

---

## 1. 概述与数据资产

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

## 2. 安全边界与敏感信息规则

以下值**不能写入仓库**，仅允许在本地 `.env`、交互输入或 SSH profile 中管理：

| 类型 | Key 名（允许出现在文档/脚本中） | 获取方式 |
|------|-------------------------------|----------|
| 数据库密码 | `MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD`、`POSTGRES_PASSWORD`、`SPRING_DATASOURCE_PASSWORD` | 服务器本地 `.env` 或密钥管理 |
| JWT 密钥 | `JWT_SECRET` | 服务器本地 `.env` |
| AI Provider 配置 | `AI_OPENAI_API_KEY`、`AI_OPENAI_BASE_URL`、`AI_OPENAI_EMBEDDING_API_KEY`、`AI_OPENAI_EMBEDDING_BASE_URL` | 服务器本地 `.env` |
| SSH 凭证 | 服务器 host/user/key | 本地 `~/.ssh/config` 或 `ssh-agent` |
| 服务器真实路径 | 生产 uploads 根目录、备份目录 | 用户提供的服务器配置 |

**安全规则：**

- 脚本和文档中所有命令均使用环境变量占位符（如 `$MYSQL_PASSWORD`），不打印真实值。
- 远端 `.env` 由 Docker Compose 读取并注入容器；脚本不直接 shell-source 整个 `.env`，避免 `JAVA_OPTS=-Xms256m -Xmx512m` 这类 Compose 合法写法被 bash 误解析。
- `docker compose config` 输出可能包含展开的秘密值，不截图、不粘贴、不提交。
- 远端备份目录默认保留（`-KeepRemoteBackup`），只有显式指定 `-CleanupRemoteBackup` 才删除。

---

# 第一段：生产 Linux → 本地 Windows 备份

## 3. 前置条件

### 3.1 服务器端

- Linux 服务器（生产环境），运行 SanguiBlog Docker Compose 部署
- 生产项目目录可通过 SSH 访问（如 `/opt/SanguiBlog`）
- 生产 Compose 文件默认为 `docker-compose.prod.yml`
- 生产 `.env` 已配置，包含 MySQL/PgVector 连接变量
- 可写入磁盘空间 >= uploads 大小 + MySQL dump 大小 + PgVector dump 大小 + 20% 余量
- 服务器可从本地 Windows 通过 SSH/SCP 访问（建议配置 SSH key 认证）

### 3.2 本地 Windows

- Windows 10/11 + PowerShell 5.1+
- 工具链：`ssh`、`scp`（Git for Windows / WSL 自带）
- 建议为备份预留 >= 5 GB 可用磁盘空间
- 如计划本地恢复，还需 Docker Desktop（见第二段前置条件）

### 3.3 非 Docker 生产部署

自动脚本首版仅支持 Docker Compose 生产部署。若生产不是 Docker Compose 部署，使用下方手动命令在宿主机上执行 `mysqldump` / `pg_dump` / `tar`。

---

## 4. 数据资产盘点（可选）

在首次备份前，建议先在服务器上盘点数据规模，用于填入 `manifest.json` 和选择存储空间。

### 4.1 MySQL 盘点

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

### 4.2 PgVector 盘点

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

### 4.3 uploads 盘点

```bash
# 目录结构（一级子目录）
docker compose exec web sh -c 'ls -la /data/uploads/'

# 文件数量和总大小
docker compose exec web sh -c 'find /data/uploads -type f | wc -l'
docker compose exec web sh -c 'du -sh /data/uploads'

# 每个子目录的文件数
docker compose exec web sh -c 'for dir in avatar posts covers games; do count=$(find /data/uploads/$dir -type f 2>/dev/null | wc -l); echo "$dir: $count files"; done'
```

---

## 5. 脚本自动备份（推荐）

### 5.1 BackupOnly 模式

从本地 Windows 通过 SSH 在生产服务器上执行远程导出，下载到本地后停止，不触碰本地 Docker：

```powershell
# 先以 dry-run 模式检查前置条件
.\scripts\docker-data-sync-local-restore.ps1 `
  -Mode BackupOnly `
  -ServerHost your-server `
  -ServerUser root `
  -RemoteProjectDir /opt/SanguiBlog `
  -DryRun

# 执行实际备份
.\scripts\docker-data-sync-local-restore.ps1 `
  -Mode BackupOnly `
  -ServerHost your-server `
  -ServerUser root `
  -RemoteProjectDir /opt/SanguiBlog `
  -LocalBackupDir .\backups\sanguiblog-prod
```

### 5.2 BackupAndRestore 模式

备份 + 下载 + 校验通过后自动恢复到本地 Docker：

```powershell
.\scripts\docker-data-sync-local-restore.ps1 `
  -Mode BackupAndRestore `
  -ServerHost your-server `
  -ServerUser root `
  -RemoteProjectDir /opt/SanguiBlog `
  -RemoteComposeFile docker-compose.prod.yml `
  -LocalBackupDir .\backups\sanguiblog-prod
```

### 5.3 备份阶段行为说明

脚本在 `BackupOnly` 和 `BackupAndRestore` 模式下自动执行：

1. 远端预检：检查项目目录、`.env`、Docker Compose、服务状态
2. 创建远端备份目录（默认 `/tmp/sanguiblog-backup-<timestamp>`）
3. 通过 SSH 执行远端 shell 脚本：
   - 切换到生产项目目录，由 Docker Compose 读取 `.env` 并把数据库变量注入容器（不输出到日志）
   - `mysqldump` 导出 MySQL → `mysql.sql`
   - `pg_dump -Fc` 导出 PgVector → `pgvector.dump`
   - `tar -czf` 打包 uploads → `uploads.tar.gz`
   - 生成 `SHA256SUMS`
   - 生成 `manifest.json`（含文件大小、关键计数、非敏感来源标签）
4. 下载备份文件到本地 `LocalBackupDir`
5. 校验 SHA256 checksum

### 5.4 远端备份保留与清理

- 默认保留远端备份目录（`-KeepRemoteBackup`），避免误删生产证据
- 显式指定 `-CleanupRemoteBackup` 则在校验通过后删除远端临时备份目录
- 备份目录在服务器上，可用 `ssh user@host "ls -lh /tmp/sanguiblog-backup-*"` 查看

---

## 6. 手动备份流程

如果选择手动操作或不使用 Docker Compose，按以下步骤在服务器上执行。

### 6.1 创建备份目录

```bash
BACKUP_DIR="/tmp/sanguiblog-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Backup dir: $BACKUP_DIR"
```

### 6.2 导出 MySQL

**宿主机 MySQL：**

```bash
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --default-character-set=utf8mb4 \
  --set-gtid-purged=OFF \
  --no-tablespaces \
  -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
  "$MYSQL_DATABASE" \
  > "$BACKUP_DIR/mysql.sql"

echo "MySQL dump size: $(du -h "$BACKUP_DIR/mysql.sql" | cut -f1)"
```

**Docker 容器内 MySQL：**

```bash
docker compose exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --set-gtid-purged=OFF --no-tablespaces -uroot "$MYSQL_DATABASE"' \
  > "$BACKUP_DIR/mysql.sql"
```

### 6.3 导出 PgVector

**宿主机 PostgreSQL：**

```bash
pg_dump -Fc \
  -h "$PGHOST" -p "$PGPORT" \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -f "$BACKUP_DIR/pgvector.dump"

echo "PgVector dump size: $(du -h "$BACKUP_DIR/pgvector.dump" | cut -f1)"
```

**Docker 容器内 PgVector：**

```bash
docker compose exec -T pgvector sh -c \
  'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > "$BACKUP_DIR/pgvector.dump"
```

> `pg_dump -Fc` 输出 custom format。恢复时必须使用 `pg_restore`，比 `-Fp`（plain SQL）更稳定且支持并行恢复。

### 6.4 打包 uploads

**宿主机：**

```bash
UPLOADS_PARENT="/home/sangui"        # uploads 目录的父目录
UPLOADS_DIRNAME="uploads"            # uploads 目录本身的名字

tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$UPLOADS_PARENT" "$UPLOADS_DIRNAME"

echo "uploads archive size: $(du -h "$BACKUP_DIR/uploads.tar.gz" | cut -f1)"
```

**Docker 容器内（推荐 web 容器，fallback backend）：**

```bash
docker compose exec -T web sh -c \
  'tar -czf - -C /data uploads' \
  > "$BACKUP_DIR/uploads.tar.gz"
```

> 注意 `-C` 参数的作用：`tar` 会先 `cd` 到上传目录的父目录，再打包 `uploads` 子目录名。这样解压后得到的路径不含绝对前缀。

### 6.5 生成校验文件

```bash
# SHA-256 checksums
sha256sum "$BACKUP_DIR"/mysql.sql "$BACKUP_DIR"/pgvector.dump "$BACKUP_DIR"/uploads.tar.gz \
  > "$BACKUP_DIR/SHA256SUMS"

cat "$BACKUP_DIR/SHA256SUMS"
```

### 6.6 创建 manifest.json

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
    "sourcePathLabel": "/data/uploads",
    "archiveFile": "uploads.tar.gz",
    "bytes": 0,
    "fileCount": 0,
    "topLevelDirs": ["avatar", "posts", "covers", "games", "site"]
  },
  "checksums": {
    "algorithm": "sha256",
    "file": "SHA256SUMS"
  }
}
```

> 将 `bytes`、`tableCount`、`keyCounts`、`rowCount`、`fileCount` 等填入实际观察到的值。这些值用于恢复后验证。自动脚本生成的 manifest 使用脚本自动采集的值。

### 6.7 确认导出完整性

```bash
ls -lh "$BACKUP_DIR"/
cat "$BACKUP_DIR/SHA256SUMS"
sha256sum -c "$BACKUP_DIR/SHA256SUMS"
```

---

## 7. 备份文件合同

每次完整备份目录必须包含以下文件（除非对应 `-Skip*` 参数跳过）：

| 文件 | 必需 | 生成方式 |
|------|------|----------|
| `mysql.sql` | 是，除非 `-SkipMysql` | `mysqldump --single-transaction --routines --triggers --events --default-character-set=utf8mb4 --set-gtid-purged=OFF --no-tablespaces` |
| `pgvector.dump` | 是，除非 `-SkipPgVector` | `pg_dump -Fc` |
| `uploads.tar.gz` | 是，除非 `-SkipUploads` | 从生产 `web` 或 `backend` 容器读取 `/data/uploads`，打包为包含顶层 `uploads/` 目录的 tar.gz |
| `SHA256SUMS` | 是 | 对上述数据文件生成 SHA-256 |
| `manifest.json` | 推荐 | 记录非敏感元数据、文件大小、关键计数、生成时间、脚本版本 |

---

# 第二段：本地备份 → 本地 Docker 容器恢复

## 8. 前置条件

### 8.1 本地 Windows

- Windows 10/11 + Docker Desktop（Docker >= 24, Compose >= 2.17）
- 已从仓库根目录执行 `cp .env.example .env` 并填入必填项
- 工具链：`docker`、`ssh`、`scp`、`tar`（Git for Windows / WSL 自带）、PowerShell 5.1+
- 建议为本地恢复预留 >= 5 GB 可用磁盘空间
- 恢复脚本会用 `alpine:3.21` 作为本地 Docker volume 预恢复备份的辅助镜像；真实恢复时若本地缺失会先执行 `docker pull alpine:3.21`，也可提前手动执行。
- **不要**使用 `docker compose down -v`（会删除所有 volumes 数据）

---

## 9. 脚本自动恢复（推荐）

### 9.1 RestoreOnly 模式（保持兼容）

从已有远端或本地备份目录恢复，完全兼容现有用法：

```powershell
# 先以 dry-run 模式检查前置条件
.\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -ServerHost your-server `
  -ServerUser your-user `
  -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000 `
  -DryRun

# 执行完整恢复
.\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -ServerHost your-server `
  -ServerUser your-user `
  -RemoteBackupDir /tmp/sanguiblog-backup-20260520-120000
```

> RestoreOnly 是默认模式，不指定 `-Mode` 即等同 RestoreOnly。

### 9.1.1 RestoreOnly 本地恢复（已有备份文件，无需远程访问）

当备份文件已存在于本地 `LocalBackupDir` 时，无需提供 `-ServerHost`、`-ServerUser` 或 `-RemoteBackupDir`。使用 `-SkipDownload` 直接从本地恢复：

```powershell
# 先以 dry-run 检查前置条件（无需远程参数）
.\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -LocalBackupDir .\backups\sanguiblog-prod `
  -SkipDownload `
  -DryRun

# 执行实际恢复
.\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -LocalBackupDir .\backups\sanguiblog-prod `
  -SkipDownload
```

> `-SkipDownload` 本地恢复不要求 SSH 远程连接，脚本会跳过 SSH 和远程备份文件检查。
> `.env` 中硬必填项（`JWT_SECRET`、`MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD`、`POSTGRES_PASSWORD`）仍需在恢复前配置好；数据库名/用户名（`MYSQL_DATABASE`、`MYSQL_USER`、`POSTGRES_DB`、`POSTGRES_USER`）缺失时会使用 Compose 默认值。

### 9.2 BackupAndRestore 模式

先执行远端备份 → 下载 → 校验 → 自动恢复到本地 Docker（详见第一段 5.2 节）。

### 9.3 选择性恢复

```powershell
# 仅恢复 MySQL（使用已有本地备份）
.\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -LocalBackupDir .\backups\sanguiblog-prod `
  -SkipDownload -SkipPgVector -SkipUploads

# 仅恢复 uploads
.\scripts\docker-data-sync-local-restore.ps1 `
  -Mode RestoreOnly `
  -LocalBackupDir .\backups\sanguiblog-prod `
  -SkipDownload -SkipMysql -SkipPgVector
```

---

## 10. 手动恢复流程

如果选择手动操作，按以下步骤执行。

### 10.1 下载备份文件

```powershell
# 创建本地备份目录
$LocalBackupDir = ".\backups\docker-data-sync"
New-Item -ItemType Directory -Force -Path $LocalBackupDir | Out-Null

# 从服务器下载
scp -r server-user@your-server:/tmp/sanguiblog-backup-20260520-120000/* $LocalBackupDir/
```

### 10.2 校验文件完整性

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

> **校验失败时必须停止**，不要继续执行后续导入。保留下载的文件用于检查。脚本自动在触碰本地 Docker volumes 前执行校验。

### 10.3 备份现有 Docker 数据（安全措施）

```powershell
# 如果本地 volumes 已有数据，先备份
$BackupTimestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$PreRestoreBackupDir = ".\backups\pre-restore-$BackupTimestamp"

if ($(docker volume inspect mysql_data 2>$null).Length -gt 0) {
    Write-Host "Backing up existing MySQL volume..."
    New-Item -ItemType Directory -Force -Path "$PreRestoreBackupDir\mysql" | Out-Null
    docker run --rm --pull=never -v mysql_data:/data:ro -v "$(Resolve-Path $PreRestoreBackupDir\mysql):/backup" alpine:3.21 tar -czf /backup/mysql_backup.tar.gz -C /data .
}

# 同样备份 pgvector_data 和 uploads_data
```

### 10.4 停止 Docker 服务

```powershell
docker compose down
```

> **不要**使用 `docker compose down -v`，这会删除 volumes 中的所有数据。

### 10.5 清空并导入 MySQL

```powershell
# 启动仅 MySQL 服务
docker compose up -d mysql
# 导入前只等待 MySQL server 可连接，不等待 Compose healthy。
# Compose healthcheck 会查询 roles 表；重建空库后、导入 dump 前它可能保持 starting/unhealthy。
for ($i = 0; $i -lt 60; $i++) {
  docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin ping -u root --silent'
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 2
}

# 清空数据库并重新导入。数据库名只允许字母、数字、下划线。
$MysqlDatabase = "sanguiblog_db" # 按本地 .env 的 MYSQL_DATABASE 调整
$MysqlUser = "sanguiblog_user"   # 按本地 .env 的 MYSQL_USER 调整
if ($MysqlDatabase -notmatch '^[A-Za-z0-9_]+$' -or $MysqlUser -notmatch '^[A-Za-z0-9_]+$') {
  throw "Unsafe MySQL database/user name"
}

$RecreateSql = "DROP DATABASE IF EXISTS $MysqlDatabase;`nCREATE DATABASE $MysqlDatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`n"
$RecreateSql | Set-Content -Encoding ASCII .\backups\mysql-recreate.sql
docker compose cp .\backups\mysql-recreate.sql mysql:/tmp/sanguiblog-recreate-db.sql
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root < /tmp/sanguiblog-recreate-db.sql'
docker compose exec -T mysql rm -f /tmp/sanguiblog-recreate-db.sql

# 导入 dump（先复制到容器，避免 PowerShell 文本管道改变编码）
docker compose cp "$LocalBackupDir\mysql.sql" mysql:/tmp/sanguiblog-mysql.sql
$ImportSql = "USE $MysqlDatabase;`nSOURCE /tmp/sanguiblog-mysql.sql;`n"
$ImportSql | Set-Content -Encoding ASCII .\backups\mysql-import-wrapper.sql
docker compose cp .\backups\mysql-import-wrapper.sql mysql:/tmp/sanguiblog-import-wrapper.sql
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root --default-character-set=utf8mb4 < /tmp/sanguiblog-import-wrapper.sql'
docker compose exec -T mysql rm -f /tmp/sanguiblog-import-wrapper.sql
docker compose exec -T mysql rm -f /tmp/sanguiblog-mysql.sql

# 授予业务用户权限
$GrantSql = "GRANT ALL PRIVILEGES ON $MysqlDatabase.* TO '$MysqlUser'@'%';`nFLUSH PRIVILEGES;`n"
$GrantSql | Set-Content -Encoding ASCII .\backups\mysql-grant.sql
docker compose cp .\backups\mysql-grant.sql mysql:/tmp/sanguiblog-grant.sql
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root < /tmp/sanguiblog-grant.sql'
docker compose exec -T mysql rm -f /tmp/sanguiblog-grant.sql
```

> **stale schema 风险**：MySQL Docker 的 `docker-entrypoint-initdb.d/` 只在空 volume 首次运行时执行。导入后建议对比 `sanguiblog_db.sql` 中的表定义，确保一致性。

### 10.6 清空并导入 PgVector

```powershell
# 启动 PgVector 服务
docker compose up -d pgvector
Start-Sleep -Seconds 10

# 清空目标数据库并重建
$PgDatabase = "sanguiblog_ai"      # 按本地 .env 的 POSTGRES_DB 调整
$PgUser = "sanguiblog_pg_user"     # 按本地 .env 的 POSTGRES_USER 调整
if ($PgDatabase -notmatch '^[A-Za-z0-9_]+$' -or $PgUser -notmatch '^[A-Za-z0-9_]+$') {
  throw "Unsafe PgVector database/user name"
}

$PgRecreateSql = @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$PgDatabase';
DROP DATABASE IF EXISTS $PgDatabase;
CREATE DATABASE $PgDatabase OWNER $PgUser;
"@
$PgRecreateSql | Set-Content -Encoding ASCII .\backups\pgvector-recreate.sql
docker compose cp .\backups\pgvector-recreate.sql pgvector:/tmp/sanguiblog-pgvector-recreate.sql
docker compose exec -T pgvector sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -f /tmp/sanguiblog-pgvector-recreate.sql'
docker compose exec -T pgvector rm -f /tmp/sanguiblog-pgvector-recreate.sql

# 确保 vector extension 存在于新数据库中
$PgExtensionSql = "\connect $PgDatabase`nCREATE EXTENSION IF NOT EXISTS vector;`n"
$PgExtensionSql | Set-Content -Encoding ASCII .\backups\pgvector-extension.sql
docker compose cp .\backups\pgvector-extension.sql pgvector:/tmp/sanguiblog-pgvector-extension.sql
docker compose exec -T pgvector sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -f /tmp/sanguiblog-pgvector-extension.sql'
docker compose exec -T pgvector rm -f /tmp/sanguiblog-pgvector-extension.sql

# 恢复 custom format dump（二进制文件必须复制到容器内再由 pg_restore 读取）
docker compose cp "$LocalBackupDir\pgvector.dump" pgvector:/tmp/sanguiblog-pgvector.dump
docker compose exec -T -e "PG_RESTORE_DATABASE=$PgDatabase" pgvector sh -c `
  'pg_restore -U "$POSTGRES_USER" -d "$PG_RESTORE_DATABASE" --clean --if-exists --no-owner /tmp/sanguiblog-pgvector.dump'
docker compose exec -T pgvector rm -f /tmp/sanguiblog-pgvector.dump
```

### 10.7 恢复 uploads

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

# 解压到临时目录
$tempRestoreDir = Join-Path ([System.IO.Path]::GetTempPath()) "sanguiblog-uploads-restore"
New-Item -ItemType Directory -Force -Path $tempRestoreDir | Out-Null
bash -c "tar -xzf '$LocalBackupDir\uploads.tar.gz' -C '$tempRestoreDir'"

# 如果 archive 包含顶层 'uploads/' 目录，跳过它
# （tar 打包时使用 -C /data uploads，所以顶层是 'uploads/'）
docker compose cp "$tempRestoreDir/uploads/." web:/data/uploads/

# 清理临时目录
Remove-Item -Recurse -Force $tempRestoreDir
```

> uploads 的恢复路径必须符合 Docker 存储合同：`uploads_data` volume 挂载到 `/data/uploads`，Nginx 通过 `/uploads/`、`/uploads/games/`、`/avatar/` alias 服务静态文件。

### 10.8 修复 uploads 权限

Backend 容器以非 root 用户 `sangui:sangui`（uid=100, gid=101）运行。恢复 uploads 时，`docker compose cp` 会将文件写为 `root:root`，导致 backend 无法创建新文件。

**自动化脚本已内置修复**：脚本在恢复 uploads 后自动执行 `chown -R sangui:sangui /data/uploads` 并验证 `posts`、`covers`、`avatar` 三个关键目录可写。

**手动修复命令：**

```bash
docker compose exec -u root backend sh -c "chown -R sangui:sangui /data/uploads"
```

**验证写入权限：**

```bash
docker compose exec backend sh -c 'id && ls -ld /data/uploads /data/uploads/avatar /data/uploads/covers /data/uploads/posts'
docker compose exec backend sh -c 'touch /data/uploads/posts/.write-test && rm -f /data/uploads/posts/.write-test && echo "OK: posts writable"'
docker compose exec backend sh -c 'touch /data/uploads/covers/.write-test && rm -f /data/uploads/covers/.write-test && echo "OK: covers writable"'
docker compose exec backend sh -c 'touch /data/uploads/avatar/.write-test && rm -f /data/uploads/avatar/.write-test && echo "OK: avatar writable"'
```

> Backend 启动时 `StoragePathResolver` 会对上传根目录及关键子目录执行可写性检查，若不可写会立即抛出 `IllegalStateException` 并提示 `chown` 修复命令（fail-fast），而非等到上传请求时才暴露问题。

### 10.9 启动所有服务

```powershell
docker compose up -d --build
# 等待服务就绪
Start-Sleep -Seconds 30
docker compose ps
```

---

## 11. 验收清单

### 11.1 服务状态

```powershell
docker compose ps
# 期望：所有服务（web、backend、mysql、pgvector）状态为 Up 且 healthy
```

```powershell
# 后端日志检查（最近 30 行）
docker compose logs --tail 30 backend
```

### 11.2 核心 API

如果本地 `.env` 中 `WEB_PORT` 不是 `80`，下面的 `$BaseUrl` 应使用实际端口，例如 `http://localhost:8090`。

```powershell
$WebPort = if ($env:WEB_PORT) { $env:WEB_PORT } else { "80" }
$BaseUrl = if ($WebPort -eq "80") { "http://localhost" } else { "http://localhost:$WebPort" }

# 站点元信息
curl.exe -i "$BaseUrl/api/site/meta"

# 游戏/工具列表
curl.exe -i "$BaseUrl/api/games"

# 站点地图（必须返回 XML，非 HTML）
curl.exe -i "$BaseUrl/sitemap.xml"

# robots.txt（必须返回 text/plain，非 HTML）
curl.exe -i "$BaseUrl/robots.txt"
```

### 11.3 上传资源

```powershell
# 任意已知上传资源路径，验证返回真实图片/文件，而非 SPA HTML
curl.exe -i "$BaseUrl/avatar/some-avatar.jpg"
curl.exe -i "$BaseUrl/uploads/games/some-game/index.html"

# 验证返回的 Content-Type 不是 text/html（SPA fallback 的特征）
```

### 11.4 前端页面

在浏览器中访问 `$BaseUrl` 并检查：

- [ ] 首页正常展示文章列表、封面图
- [ ] 文章详情页图片正常加载
- [ ] 头像正常显示
- [ ] 工具/游戏页面正常运行（iframe 嵌入）
- [ ] 登录后台（`/admin`）
- [ ] 后台文章管理可见历史文章

### 11.5 AI / RAG 验证

```powershell
# 检查 PgVector vector extension
docker compose exec pgvector psql -U "$env:POSTGRES_USER" -d "$env:POSTGRES_DB" `
  -c "SELECT extname FROM pg_extension WHERE extname='vector';"

# 检查向量表行数
docker compose exec pgvector psql -U "$env:POSTGRES_USER" -d "$env:POSTGRES_DB" `
  -c "SELECT COUNT(*) FROM vector_store;"

# 检查 AI 助手是否启用
curl.exe -s "$BaseUrl/api/site/meta" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['aiAssistant'])"

# 检查 OpenAI API key 是否已注入（不打印值）
docker compose exec backend sh -c 'test -n "$AI_OPENAI_API_KEY" && test "$AI_OPENAI_API_KEY" != "__unset__" && echo "AI_OPENAI_API_KEY is set" || echo "AI_OPENAI_API_KEY is empty"'
```

**验证结论分类：**

| 场景 | MySQL + uploads 正常 | PgVector 正常 | AI 密钥已配置 | 结论 |
|------|---------------------|---------------|-------------|------|
| Good | ✅ | ✅ | ✅ | 完整恢复成功 |
| Base | ✅ | 无关 | ❌（AI 故意禁用） | 核心站点恢复成功；AI/RAG 标记为 skipped/disabled |
| Bad | ✅ | ✅ | ✅ | 但向量表为空 → 需运行 RAG resync |
| Bad | ❌ | — | — | 恢复失败，检查日志 |

**AI/RAG disabled 是合法的 base case**：如果未配置 OpenAI API key，核心 blog/admin/upload 功能应正常工作，AI 助手不应出现在前端，`/api/site/meta.aiAssistant.enabled` 应为 `false`。

---

## 12. 回滚流程

如果恢复后发现数据问题，可按以下步骤回滚到恢复前的状态。

### 12.1 使用预恢复备份回滚

假设恢复前已按 10.3 节备份了现有 Docker volumes：

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

### 12.2 无法回滚时的补救

- 重新从服务器导出最新的数据
- 如果服务器数据也已损坏，从更早的服务器本地备份恢复

---

## 13. 服务器 Linux 部署/迁移流程

本指南也可用于将数据迁移到另一个 Linux Docker 服务器。

### 13.1 在新服务器上

```bash
# 1. 搭建 Docker Compose 环境（参考 docs/docker-deploy.md）
cp .env.example .env
# 编辑 .env，填入必填项

# 2. 将备份文件传输到新服务器
scp -r local-backup-dir user@new-server:/tmp/sanguiblog-restore/

# 3. 恢复数据（参考第 10 节手动流程，或在 PowerShell 脚本中指定 Linux 路径）
```

### 13.2 注意事项

- 两端的 `docker-compose.yml` 和 `.env` 键名需保持一致
- MySQL JDBC URL 中 `characterEncoding=utf8`（不是 `utf8mb4`，MySQL Connector/J 将其视为 Java charset 会失败）
- `utf8mb4` 在 MySQL server 和 table collation 级别保障
- 新服务器的 `JWT_SECRET` 建议使用与生产不同的值，避免 token 跨环境泄露

---

## 14. 常见问题排查

| 现象 | 可能原因 | 解决方案 |
|------|----------|----------|
| `docker compose up` 失败：`JWT_SECRET is required` | `.env` 缺少硬必填项 | 编辑 `.env` 填入 `JWT_SECRET`、`MYSQL_PASSWORD`、`MYSQL_ROOT_PASSWORD`、`POSTGRES_PASSWORD`；数据库名/用户名（`MYSQL_DATABASE`、`MYSQL_USER`、`POSTGRES_DB`、`POSTGRES_USER`）缺失时会使用 Compose 默认值，不会阻塞启动 |
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
| 恢复后上传失败："无法创建存储目录" | `docker compose cp` 或 tar 解压时创建的目录为 root-owned，backend 非 root 用户无法写入 | 执行第 10.8 节 uploads 权限修复；脚本自动内置此修复 |
| 远端备份脚本报错 `docker compose: command not found` | 生产服务器未安装 Docker Compose v2 或不在 PATH | 安装 Docker Compose v2：`docker compose version` 应返回版本号 |
| 远端备份 `mysqldump` 报错 `Access denied` | 远端 `.env` 中 MySQL root 凭据不正确或容器未运行 | 确认远端 `docker compose ps mysql` 状态为 Up，`.env` 中 `MYSQL_ROOT_PASSWORD` 正确 |

---

## 15. 脚本参数表

完整参数列表（`docker-data-sync-local-restore.ps1`）：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `-ServerHost` | string | 条件必填 | 服务器主机名或 IP。BackupOnly / BackupAndRestore 必填；RestoreOnly 仅在无 `-SkipDownload` 时必填 |
| `-ServerUser` | string | 条件必填 | SSH 用户名。BackupOnly / BackupAndRestore 必填；RestoreOnly 仅在无 `-SkipDownload` 时必填 |
| `-Mode` | BackupOnly / RestoreOnly / BackupAndRestore | `RestoreOnly` | 运行模式 |
| `-RemoteBackupDir` | string | 自动生成（backup 模式）；RestoreOnly 无 `-SkipDownload` 时必填 | 远端备份目录绝对路径；本地已有备份并使用 `-SkipDownload` 时不需要 |
| `-LocalBackupDir` | string | `.\backups\docker-data-sync` | 本地备份暂存目录 |
| `-SshPort` | int | `22` | SSH 端口 |
| `-ComposeProjectDir` | string | `.` (repo root) | docker-compose.yml 所在目录 |
| `-RestoreUploadsMode` | Replace / Merge | `Replace` | uploads 恢复策略 |
| `-SkipDownload` | switch | `$false` | 跳过从服务器下载（使用已有本地备份） |
| `-SkipMysql` | switch | `$false` | 跳过 MySQL 导出/导入 |
| `-SkipPgVector` | switch | `$false` | 跳过 PgVector 导出/导入 |
| `-SkipUploads` | switch | `$false` | 跳过 uploads 打包/恢复 |
| `-DryRun` | switch | `$false` | 仅检查前置条件，不执行实际操作 |
| `-VolumeArchiveImage` | string | `alpine:3.21` | 本地预恢复 volume 备份使用的辅助镜像，必须包含 `tar` |
| `-RemoteProjectDir` | string | 无（backup 模式必填） | 生产服务器 SanguiBlog 项目目录 |
| `-RemoteComposeFile` | string | `docker-compose.prod.yml` | 生产 Compose 文件名（相对于 RemoteProjectDir） |
| `-RemoteBackupRoot` | string | `/tmp` | 远端备份根目录 |
| `-RemoteHostLabel` | string | `production` | 写入 manifest.json 的来源标签 |
| `-KeepRemoteBackup` | switch | `$true` | 下载成功后保留远端备份目录（默认行为） |
| `-CleanupRemoteBackup` | switch | `$false` | 下载且校验通过后删除远端临时备份目录 |
| `-BackupTimestamp` | string | 自动生成 | 指定备份时间戳（用于备份目录命名和重试） |

---

## 16. 与 docker-deploy.md 的关系

- `docs/docker-deploy.md`：**Docker Compose 环境搭建指南**，包括镜像构建、环境变量、基础部署验证、AI 表诊断。
- `docs/docker-data-sync.md`（本文件）：**数据备份与恢复指南**，依赖 `docker-deploy.md` 中搭建好的环境，专注于数据导出/导入/验证/回滚。

部署新环境时，先完成 `docs/docker-deploy.md` 的环境搭建，再按本指南恢复数据。
