# 共著 · 多人 AI 文字冒险

2-10 人共同推动一个由 AI 主持的故事世界。
房主创建房间 → 其他人输入房间号加入 → 人数足够后房主开始游戏 → 每回合每人写下行动 → AI 根据世界观与历史编辑故事（世界大趋势由 AI 掌控，每位玩家的行动都会得到回应）。

## 技术栈
- Next.js 14（App Router）+ TypeScript + Tailwind CSS
- Neon（Serverless PostgreSQL），@neondatabase/serverless 直连，首次请求自动建表
- 部署于 Vercel，用轮询实现实时同步（无服务器不依赖 WebSocket）
- AI：OpenAI / DeepSeek / Kimi（Moonshot），均走 OpenAI 兼容接口

## 本地运行
1. npm install
2. 复制 .env.example 为 .env.local，填入 DATABASE_URL（Neon 连接串）
3. npm run dev，打开 http://localhost:3000

## 部署到 Vercel
1. 将本仓库推到 GitHub
2. 在 Vercel 导入仓库
3. 项目 Settings → Environment Variables 添加：DATABASE_URL、APP_SECRET（openssl rand -hex 32 生成）
4. Deploy，完成

## 环境变量
| 变量 | 必填 | 说明 |
| --- | --- | --- |
| DATABASE_URL | 是 | Neon 连接串 |
| APP_SECRET | 是 | 加密房主填写的 API Key |
| OPENAI_API_KEY | 否 | 全局兜底 Key（房主不填时使用） |
| DEEPSEEK_API_KEY | 否 | 同上 |
| MOONSHOT_API_KEY | 否 | 同上 |
| CRON_SECRET | 否 | 定时清理接口鉴权 |

## 自定义
- 提示词 / 游戏文案：src/lib/prompts.ts（改完重新部署生效）
- 世界观：src/lib/world.ts
- AI 服务商与模型列表：src/lib/ai.ts
- 房间过期分钟数、结算卡死重置分钟数：src/lib/engine.ts 顶部常量

## 房间清理机制（省钱）
- 等待状态超过 20 分钟：自动删除（每次请求时"机会式清理"触发，Hobby 计划也能用）
- 结算卡住超过 3 分钟：自动重置，可再次结算
- 房主可随时"解散房间 / 结束游戏"
- Pro 计划可选配 Cron：在 vercel.json 添加
  { "crons": [{ "path": "/api/cron/cleanup", "schedule": "*/5 * * * *" }] }
  （Hobby 计划每天只能一次 Cron，且不支持 5 分钟级别，勿配置，否则部署失败）

## 常见问题
- 提交行动后等待较久：AI 结算需要 10~30 秒，属正常
- 有人挂机不提交：房主可"提前结算本回合"跳过，或点"移出"
- 刷新/换设备不丢身份：身份存在浏览器 localStorage
