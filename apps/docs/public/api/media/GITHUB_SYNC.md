# GitHub 同步说明

仓库名称尚未确定，因此当前只初始化本地 Git 历史，不绑定远程地址。

用户创建 GitHub 空仓库后，在项目根目录执行：

```bash
git remote add origin git@github.com:<OWNER>/<REPOSITORY>.git
git push -u origin main
```

若使用 HTTPS：

```bash
git remote add origin https://github.com/<OWNER>/<REPOSITORY>.git
git push -u origin main
```

正式命名前，先运行项目更名脚本，再创建远程仓库：

```bash
node scripts/rename-project.mjs --name NewName --scope new-scope --chinese 中文名
```
