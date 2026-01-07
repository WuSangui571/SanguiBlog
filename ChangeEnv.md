### jar包提取的过程

#### 一键切换（推荐）

执行脚本即可同时更新后端 `application.yaml`（端口）+ `application-local.yaml`（私有配置）与前端 `.env.local`：

```powershell
# 在仓库根目录
./scripts/switch-env.ps1 dev   # 开发环境
./scripts/switch-env.ps1 prod  # 生产环境
```

脚本会同步：
1) 后端端口（`application.yaml`）；
2) 后端数据库地址/存储路径/`asset-base-url`（`application-local.yaml`）；
3) 前端 `VITE_API_BASE`。

说明：本地测试（dev）使用远程数据库地址；生产（prod）使用本地数据库地址。

> 说明：脚本会在原有缩进基础上“只替换值”，不会把 `application.yaml` / `application-local.yaml` 的缩进改乱（避免出现 `site:` 下子项缩进不一致导致 YAML 解析异常）。

#### 手工切换（备用）

1. 后端 application.yaml 修改（仅端口）

   + 开发环境：

     ```
     server.port: 8080
     ```

   + 生产环境：

     ```
     server.port: 8082
     ```

2. 后端 application-local.yaml 修改（数据库/存储/资源域名）

   + 开发环境（使用远程数据库）：

     ```
     spring.datasource.url: jdbc:mysql://123.56.244.121:3306/sanguiblog_db?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf-8
     storage.base-path: D:\02-WorkSpace\02-Java\SanguiBlog\uploads
     site.asset-base-url: http://localhost:8080/uploads
     ```

   + 生产环境（使用本地数据库）：

     ```
     spring.datasource.url: jdbc:mysql://127.0.0.1:3306/sanguiblog_db?useSSL=true&serverTimezone=Asia/Shanghai&characterEncoding=utf-8
     storage.base-path: /home/sangui/uploads
     site.asset-base-url: http://sangui.top/uploads
     ```

3. 前端 .env.local 修改

   + 开发环境：

     ```
     VITE_API_BASE=http://localhost:8080/api
     ```

   + 生产环境：

     ```
     VITE_API_BASE=/api
     ```
