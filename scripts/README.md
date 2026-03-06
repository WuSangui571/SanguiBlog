> 这是：D:\02-WorkSpace\02-Java\SanguiBlog\scripts 目录下的说明文档

### sync_db.bat

此脚本，是用于同步远程服务器上的数据库sql备份压缩文件的脚本。将：

```
/home/sangui/db_backups/
```

中自动保存的数据库脚本，备份至本机的：

```
D:\07-ImportantFiles\14-MyBlogBackups\
```

### sync_uploads.bat

此脚本，是用于同步远程服务器上的uploads包的内容，通过 WinSCP ，和本地进行差异对比，将本地uploads包内容和远程一模一样的脚本。远程路径：

```
/home/sangui/uploads
```

本地路径：

```
D:\02-WorkSpace\02-Java\SanguiBlog\uploads
```

此脚本的意义是便于本地测试应用时，数据和远程一致。

### switch-env.ps1

此脚本，是用于将本地测试环境设置为 测试/生产 环境，分别输入：

```
prod
```

切换成远程生产环境，输入：

```
dev
```

切换成本地开发环境

### bump-version.ps1

此脚本，是用于管理项目版本号的脚本，分三种情况：

1. -Bump patch

   V1.2.3 -> V1.2.4，更新所有文件，不生成 Release Note

2. -Bump minor -CreateRelease

   V1.2.3 -> V1.3.0，更新所有文件，并在 release/ 目录下创建 V1.3.0.md

3. -Version "V1.2.8"

   强制更新为 V1.2.8

