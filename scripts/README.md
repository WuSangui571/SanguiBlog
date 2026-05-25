# Scripts

SanguiBlog Docker-first 部署环境下保留的脚本。

## docker-data-sync-local-restore.ps1

从服务器导出数据并恢复到本地 Docker 环境（或迁移到新服务器）。

支持自动化下载、校验、MySQL/PgVector/Uploads 三步恢复、权限修复和 dry-run 模式。

详细用法见 `docs/docker-data-sync.md`。

## bump-version.ps1

管理项目版本号：

1. `-Bump patch` — V1.2.3 → V1.2.4，更新所有文件，不生成 Release Note
2. `-Bump minor -CreateRelease` — V1.2.3 → V1.3.0，更新所有文件，并创建 `release/V1.3.0.md`
3. `-Version "V1.2.8"` — 强制更新为指定版本
