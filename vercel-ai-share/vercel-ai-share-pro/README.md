# Vercel 共享后端（进阶版 Pro）
**功能**：
- 兑换码 → JWT 登录（/api/token）
- 模型白名单（ALLOWED_MODELS）
- 最大 max_tokens 限制（MAX_TOKENS）
- 简洁前端，支持先兑换再聊天

## 部署步骤
1. 把本项目上传到 GitHub。
2. 在 Vercel 新建项目，导入仓库并 Deploy。
3. 在 Vercel → Project Settings → Environment Variables 添加：
   - `OPENAI_API_KEY` = 你的 OpenAI API Key
   - `JWT_SECRET` = 一长串字符串（会用于签发和校验 JWT）
   - `REDEEM_CODES` = 兑换码列表，逗号分隔，例如： `abc123,friend888,test999`
   - `ALLOWED_MODELS` = 允许的模型，逗号分隔，例如： `gpt-4o-mini,gpt-4o`
   - `MAX_TOKENS` = 单次最大 max_tokens（缺省 1000）
   - （可选）`BIND_IP` = `1` 表示把 JWT 绑定到兑换时的 IP（在公共网络可能影响共享）

4. 重新 Deploy 完成后：
   - 你的后端地址：`https://your-app.vercel.app/api`
   - 前端测试页：访问项目根目录（`/`），就是 `public/index.html`。

## 使用说明
- 用户打开首页 → 填写后端 URL（`https://your-app.vercel.app/api`）→ 输入兑换码 → 点击“兑换并登录”。
- 兑换成功后，浏览器会把 JWT 保存到 localStorage，随后就可以在页面里直接聊天。
- 若要失效所有已发的令牌，只需更改 `JWT_SECRET` 并重新部署。

> 注意：Vercel 免费版没有数据库，`REDEEM_CODES` 是**可重复使用的兑换码**（非一次性）。如需“一次性兑换码/配额统计”，请使用服务器版（Docker + Redis）。
