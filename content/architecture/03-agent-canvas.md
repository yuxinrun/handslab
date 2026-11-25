---
title: "Agent Canvas 架构"
description: "拆解 Agent Canvas 的前端结构、状态管理、API 适配器、多后端切换与本地栈启动模式，明确它不负责执行 Agent。"
category: architecture
order: 3
updated: 2026-11-25
diagram: /diagrams/agent-canvas.svg
tags: [Agent Canvas, React, TypeScript, 前端架构]
---

## 本文学习目标

- 理解 Agent Canvas 的系统边界与目录结构。
- 说明前端如何连接多个 Agent Server。
- 区分独立应用构建与 library 嵌入构建。

## 一、定位

`OpenHands/OpenHands` 仓库当前就是 Agent Canvas。官方 README 称它是：

> The self-hosted developer control center for coding agents and automations.

它可以运行 OpenHands、Claude Code、Codex、Gemini、Pi、OpenCode 以及任何 ACP-compatible agent。也就是说，Canvas 是**控制中心**，不是某一种 agent 的实现。

## 二、系统边界

官方架构文档把边界写得非常清楚。

Canvas 负责：

- 渲染 conversation、terminal、browser、files、settings、automation UI
- 管理 frontend state：conversation state、backend selection、settings、profiles、local metadata
- 把 UI action 转成 Agent Server API 调用
- 打包为 standalone app 与 library entrypoints

Canvas 不负责：

- 直接执行 Agent 动作
- 提供 sandbox 或 workspace 隔离层
- 在配置好的 backend 之外托管 LLM provider credentials
- 没有 automation backend 时运行定时/事件触发任务

这一边界是判断 Canvas 代码该不该写某逻辑的直接标准。

## 三、目录结构

官方架构文档列出的核心区域：

```text
src/
├── api/          # Agent Server、cloud、settings、git、skills、automations、backend registry 适配器
├── components/   # conversation、chat、browser、files、settings、backend、automation、onboarding
├── hooks/        # React Query hooks、状态 hooks、功能 hooks
├── stores/       # Zustand 状态存储
├── i18n/         # 翻译资源与生成的 bundles
└── mocks/        # MSW handlers，用于 mock-mode 开发与测试
bin/              # CLI
scripts/          # 开发栈启动器
```

技术栈关键词：React、TypeScript、React Query、Zustand、MSW。这些都是文档中明确出现的。

## 四、数据流

```text
用户操作
  → React 组件触发 hook / store 更新
  → src/api/ 中的适配器发起 Agent Server 调用
  → 后端执行并返回事件/文件/状态
  → hooks / stores 更新前端状态
  → 组件重新渲染 conversation、terminal、files 等 UI
```

同时存在一条反向的服务信息流：

```text
Agent Server / stack launcher
  → /server_info.runtime_services
  → Canvas 前端
  → 新会话的 agent context suffix
  → Agent 使用正确的服务 URL
```

官方说明这条机制的目的是：让 Agent 使用正确 URL，而不是猜测端口。

## 五、多后端切换

Canvas 可以连接一个或多个 Agent Server，并在 UI 中切换。README 给出的场景例子：

- 团队共享一个 Agent Server，用于代码审查与依赖更新
- 个人 agent 运行在自己的笔记本上

后端可以位于：

- 笔记本本机
- 专用机器（如 Mac Mini）
- 云端 VM
- OpenHands Cloud
- 企业基础设施

README 还警告：本地 `npx` / `npm run dev` listener 默认只绑定 `127.0.0.1`，以避免自动注入的 session key 被局域网机器访问；如需监听所有接口，需要 `--host 0.0.0.0` 或 `OH_BIND_HOST`，此时不会注入 session key，UI 会出现 API key 输入界面。

## 六、运行与构建模式

架构文档列出的命令：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 通过 `uvx` 启动 agent-server 与 automation backend，同时启动 Vite dev server 和 ingress proxy |
| `npm run dev:minimal` | 只启动 agent-server 与 Vite dev server |
| `npm run dev:static` | 提供 frontend 的 production build |
| `npm run dev:mock` | 用 MSW mocks 运行 frontend |
| `npm run build` | 构建 standalone application |
| `npm run build:lib` | 构建 library entrypoints |

`build:lib` 暴露的 entrypoints 包括 browser、conversation、files、settings、sidebar、terminal、i18n。若要在宿主应用中嵌入 Canvas 组件，需要同时加载一次 `@openhands/agent-canvas/styles.css`。

## 七、质量门禁

官方 CI 使用：

```bash
npm ci
npm run lint     # typecheck + ESLint + Prettier
npm test         # unit + component tests
npm run build
npm run build:lib
npm pack --dry-run
```

这说明 Canvas 是按可发布 npm 包的标准维护的，不只是内部前端。

## 八、安全姿态

文档强调：

- 本地运行时 Agent 可能访问用户 workspace
- 笔记本/本地开发建议 Docker sandbox mode
- 自托管应使用 authentication、HTTPS、firewall rules，并谨慎限制 workspace scope

README 还指出 Docker quickstart 需要显式设置 `AGENT_CANVAS_ALLOW_LAN_SESSION_KEY=true` 才注入 session key；如果把端口发布到 LAN 或公网，应省略该变量并在 UI 输入 API key。

## 九、常见错误

1. 在 `src/components/` 中直接调用 LLM。
2. 把 workspace 隔离逻辑写进 Canvas。
3. 认为 Canvas 只能连接一个后端。
4. 忽略 styles.css 的加载，导致嵌入模式样式丢失。
5. 把 `dev:mock` 的 MSW 数据当成真实后端行为。

## 十、设计取舍与启发

Canvas 的价值在于把“控制中心”做成可替换的前端：它不绑定具体 agent，也不绑定具体执行位置。这依赖三件事：

- API 适配器集中在 `src/api/`
- 状态集中在 stores/hooks
- 后端选择作为一等状态

如果你要开发自己的 Agent 控制台，可以借鉴这种结构：把后端连接、会话状态、UI 渲染分成三层，避免把 API 调用散落在组件里。

## 十一、本文总结

Agent Canvas 是 OpenHands 的用户界面与控制中心。它管展示、状态与连接，不管推理、执行与隔离。理解这条边界，才能正确设计前端与后端协作。

## 十二、延伸阅读

- [Agent Canvas 是什么？](#/article/canvas/01-what-is-agent-canvas)
- [前端如何连接 Agent Server](#/article/server/03-rest-api)
- 官方架构文档：<https://github.com/OpenHands/OpenHands/blob/main/docs/architecture.md>
