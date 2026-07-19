# GitHub 工作流

远程仓库：`hujinghaoabcd/openlayers-webgis-platform`

日常开发建议从 `main` 创建功能分支，通过 Pull Request 合并：

```bash
git switch main
git pull
git switch -c feature/core-map
git add .
git commit -m "feat: add core map API"
git push -u origin feature/core-map
```

合并前运行：

```bash
pnpm validate
pnpm typecheck
pnpm test
pnpm build
```
