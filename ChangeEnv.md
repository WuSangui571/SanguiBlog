### jar包提取的过程

#### 一键切换（推荐）

执行脚本即可同时更新后端 `application.yaml` 与前端 `.env.local`：

```powershell
# 在仓库根目录
./scripts/switch-env.ps1 dev   # 开发环境
./scripts/switch-env.ps1 prod  # 生产环境
```

脚本会同步：
1) 后端端口、存储路径、`asset-base-url`；
2) 前端 `VITE_API_BASE`。

#### 手工切换（备用）

1. 后端 application.yaml 修改

   + 开发环境：

     ```
     port: 8080
     
     base-path: D:\02-WorkSpace\02-Java\SanguiBlog\uploads
     
     asset-base-url: http://localhost:8080/uploads
     ```

   + 生产环境：

     ```
     port: 8082
     
     base-path: ${STORAGE_BASE_PATH:uploads}
     
     asset-base-url: http://new.sangui.top/uploads
     ```

2. 前端 .env.local 修改

   + 开发环境：

     ```
     VITE_API_BASE=http://localhost:8080/api
     ```

   + 生产环境：

     ```
     VITE_API_BASE=/api
     ```
