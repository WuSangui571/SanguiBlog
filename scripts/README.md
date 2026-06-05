# Scripts

SanguiBlog Docker-first 部署环境下保留的脚本。

## docker-data-sync-local-restore.ps1

SanguiBlog Docker 数据备份与本地恢复脚本，支持三种模式：

- **RestoreOnly**（默认）：从已有远端/本地备份目录恢复到本地 Docker。
- **BackupOnly**：通过 SSH 在生产端远程导出 MySQL/PgVector/uploads，生成 checksum/manifest，下载到本地后停止。
- **BackupAndRestore**：先执行 BackupOnly，校验通过后自动恢复到本地 Docker。

支持自动化下载、校验、MySQL/PgVector/Uploads 三步恢复、上传目录权限修复和 dry-run 模式。
兼容已有 `RestoreOnly` 参数用法。
本地恢复会在覆盖 Docker volumes 前先用 `alpine:3.21`（可通过 `-VolumeArchiveImage` 覆盖）备份现有 volumes。

详细用法见 `docs/docker-data-sync.md`。

## bump-version.ps1

管理项目版本号：

1. `-Bump patch` — V1.2.3 → V1.2.4，更新所有文件，不生成 Release Note
2. `-Bump minor -CreateRelease` — V1.2.3 → V1.3.0，更新所有文件，并创建 `release/V1.3.0.md`
3. `-Version "V1.2.8"` — 强制更新为指定版本
