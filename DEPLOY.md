# 让网站变成公网可访问（部署说明）

本网站是纯静态站点（HTML / CSS / JS / 图片 / 视频），只要上传到任意静态托管服务，
别人输入网址就能打开。

整个站点约 45 MB（其中 3 个视频约 22 MB），常见免费托管都够用。

---

## 方案 A：Netlify Drop（最快，3 分钟，不用命令行）

1. 浏览器打开 <https://app.netlify.com/drop>
2. 把 **整个 `zoey-portfolio` 文件夹**拖进页面中间的方框
3. 稍等片刻，页面会给出一个公开网址（形如 `https://xxxxxxx.netlify.app`），
   任何人输入这个网址都能打开你的网站
4. 想长期保留 / 修改网址 / 绑定自己的域名：用邮箱**免费注册**后点 “Claim site”
   （不注册的话，该临时网址可能一段时间后被回收）

---

## 方案 B：GitHub Pages（免费、可长期维护，推荐）

1. 注册 / 登录 <https://github.com>
2. 右上角 **New repository** → 名字填 `zoey-portfolio` → 选 **Public** → Create
3. 在本机打开 PowerShell，执行（把 `<你的用户名>` 换成你的 GitHub 用户名）：

   ```powershell
   cd "C:\Users\19923\Documents\Codex\2026-09-06\ni\outputs\zoey-portfolio"
   git remote add origin https://github.com/<你的用户名>/zoey-portfolio.git
   git branch -M main
   git push -u origin main
   ```

   （本机若没有 git，可用 Codex 自带的：
   `C:\Users\19923\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe`）

   > 如果 git 报错 `detected dubious ownership`，先执行一次（把路径换成你的实际路径）：
   > `git config --global --add safe.directory "C:/Users/19923/Documents/Codex/2026-09-06/ni/outputs/zoey-portfolio"`

4. 仓库页面 **Settings → Pages** → Source 选 `Deploy from a branch`、
   Branch 选 `main` + `/ (root)` → Save
5. 一两分钟后，网址为：`https://<你的用户名>.github.io/zoey-portfolio/`

以后每次更新网站，只要 `git add . && git commit -m "update" && git push`，网页会自动更新。

---

## 方案 C：Vercel / Cloudflare Pages

同样是「连仓库 → 自动部署」，或用它们的 CLI 上传目录，流程与 Netlify 类似，
免费额度也足够本网站使用。

---

## 注意事项

- **视频较大**：3 个视频共约 22 MB，首次打开作品集板块时会加载；已经在点击时才播放，
  不影响其它页面首屏速度。
- **不需要服务器 / 数据库**：本站是静态站点，无需购买主机或配置后端。
- **绑定自己的域名**（可选）：在上述任一平台都可以添加自定义域名（如 `zoeychen.com`），
  按提示在域名服务商处添加一条 CNAME 解析即可。
