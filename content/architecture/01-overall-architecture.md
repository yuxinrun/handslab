---
title: "OpenHands 当前整体架构"
description: "以官方多仓库文档为依据，拆解 Agent Canvas、Agent Server、SDK、Workspace、Automation 与 Extensions 的分层关系和一次任务的数据流。"
category: architecture
order: 1
updated: 2026-11-25
diagram: /diagrams/overall-architecture.svg
tags: [架构, 多仓库, Agent Server, SDK]
---

## 本文学习目标

- 画出 OpenHands 当前的分层架构。
- 说清每一层的输入、输出与不负责什么。
- 理解前后端状态同步与服务发现的关键机制。

## 一、整体分层

从官方资料可以归纳出五层：

```text
交互层   Agent Canvas（React + TypeScript） / CLI / 自定义客户端
接入层   TypeScript Client（在 SDK 仓库） + REST / WebSocket
服务层   Agent Server（FastAPI）
行为层   Software Agent SDK：Agent / LLM / Conversation / Tools / Events / Security
执行层   Workspace：Local / Docker / Remote；外部 LLM Providers；Sandbox
调度层   Automation（cron / webhook / dispatcher / run history）
扩展层   Extensions（skills / plugins / apps / catalog）
```

其中调度层与扩展层是横向能力，不严格属于单次任务调用链，但会影响任务如何被触发与增强。

## 二、交互层：Agent Canvas 的边界

官方 `docs/architecture.md` 明确列出 Canvas **负责**：

- 渲染会话、终端、浏览器、文件、设置与自动化 UI
- 管理会话状态、后端选择、设置、profiles、本地元数据
- 把 UI 操作转换为 Agent Server API 调用
- 打包为独立应用或可嵌入 library entrypoints

同样明确列出它**不负责**：

- 直接执行 Agent 动作
- 提供 sandbox 或 workspace 隔离层
- 在配置好的后端之外托管 LLM provider credentials
- 在没有 automation backend 时运行定时或事件触发任务

这是理解整个架构的关键：Canvas 是控制中心，不是执行引擎。

## 三、接入层：TypeScript Client 与 API 契约

SDK README 给出的链路是：

```text
SDK/Agent Server → OpenAPI contract → clients/typescript → Agent Canvas
```

含义是：

1. 后端行为与 endpoints 属于 Python SDK / Agent Server 包。
2. 浏览器访问由 `clients/typescript` 负责。
3. UI 属于 Agent Canvas。
4. automation 生命周期行为属于 automation 仓库。

因此，当 API 新增端点时，正确的变更顺序是：后端 → OpenAPI contract → TypeScript client → Canvas UI。

## 四、服务层：Agent Server

Agent Server 把 SDK 包装成 HTTP/WebSocket 服务。官方 `docs.openhands.dev/sdk/arch/agent-server` 列出：

- `GET /alive`、`GET /health`、`GET /ready`、`GET /server_info`
- `GET /docs`（交互式 OpenAPI）
- `/api/*`：鉴权后的 conversation、workspace、file、command、settings API
- OpenAI 兼容端点：`/v1/chat/completions`、`/v1/responses`

它的工程价值是：

- 一个客户端可访问的长期运行服务
- 应用后端与 agent runtime 之间的清晰边界
- 可通过 session API key 保护

## 五、行为层：SDK 是 source of truth

官方架构总览明确说 SDK 是 OpenHands 中 agents 的 source of truth。核心组件包括：

| 组件 | 职责 |
| --- | --- |
| `Agent` | reasoning-action loop |
| `Conversation` | 会话状态与生命周期 |
| `LLM` | provider-agnostic 模型接口，含 retry 与 telemetry |
| Tool System | Action / Observation / Tool / Executor 类型化基类与 MCP 集成 |
| Events | 类型化事件：action、observation、user messages、state update |
| Workspace | `Workspace` / `LocalWorkspace` / `RemoteWorkspace` |
| Skill | 可复用用户定义 prompts，支持 trigger-based activation |
| Condenser | 会话历史压缩与 token 管理 |
| Security | action 风险评估与执行前验证 |

设计特点是 stateless、immutable components 与 type-safe Pydantic models。

## 六、执行层：Workspace 决定“在哪里跑”

官方给出的两种模式：

**本地开发**：

```bash
pip install openhands-sdk openhands-tools
```

- `LocalWorkspace` 包含在 SDK 中
- 一切在单进程内运行
- 无需 Docker

**生产 / 沙箱**：

```bash
pip install openhands-sdk openhands-tools openhands-workspace openhands-agent-server
```

- `RemoteWorkspace` 可在容器中自动启动 agent-server
- `DockerWorkspace` 启动带 server 的容器
- `RemoteAPIWorkspace` 通过 HTTP 连接 server

官方给出的关键结论：

> Same agent code works in both modes—just swap the workspace type.

## 七、一次任务的数据流

```text
1. 用户在 Canvas 输入任务
2. Canvas 通过 TypeScript Client 调用 Agent Server REST API
3. Agent Server 创建/更新 Conversation，写入 UserMessage 事件
4. SDK Agent 调用 LLM，得到下一步 Action
5. Tool Executor 校验 Action 并在 Workspace 环境执行
6. Observation 写入事件流
7. Agent Server 通过 WebSocket 把事件推送给 Canvas
8. Canvas 更新会话 UI；步骤 4-7 循环直到完成
```

注意第 5 步：官方 SDK 文档强调工具与 Agent 在 workspace 配置的环境中 alongside 运行，而不是通过 workspace APIs 远程执行。这是很多人读错的地方。

## 八、运行时服务发现

Canvas 文档提到一个细节：stack launcher 通过后端 `/server_info.runtime_services` 暴露运行时服务信息，前端把它转发到新会话作为 **agent context suffix**，让 Agent 使用正确 URL，而不是猜测端口。

这解决的是本地栈中端口与地址动态变化的问题。它体现了一个通用原则：**不要让孩子进程猜基础设施地址，把服务信息作为上下文注入。**

## 九、本地、远程与云端模式

Canvas README 给出四种启动方式：

1. **不带 Sandbox**：`npm install -g @openhands/agent-canvas` 后运行 `agent-canvas`。Agent 对宿主机文件系统有完整访问权，官方文档明确警告。
2. **Docker Sandbox**：`docker run ... ghcr.io/openhands/agent-canvas:1.45.0`，访问 `http://localhost:8000/canvas`。
3. **多个 Docker Sandbox**：`OH_CONVERSATION_RUNTIME=docker agent-canvas`，每个新 conversation 在独立容器运行。
4. **从源码**：`git clone` + `npm ci` + `npm run dev`，同样有宿主机访问风险。

架构文档还列出开发模式：`npm run dev`、`dev:minimal`、`dev:static`、`dev:mock`、`build`、`build:lib`。

## 十、常见错误

1. 把 Canvas 当作 Agent 执行器。
2. 说“OpenHands 的 Runtime 负责执行”——当前官方核心文档以 SDK / Workspace 为主，Runtime 是历史语境。
3. 认为工具通过 HTTP 调用 workspace。实际是在同一环境执行。
4. 忽略 `/server_info.runtime_services` 的服务发现作用。

## 十一、设计取舍与启发

- **解耦**：UI 与执行分离，才能支持 backend 切换与 ACP agent。
- **契约先行**：OpenAPI 驱动 TypeScript client，减少前后端漂移。
- **环境可替换**：Workspace 抽象让同一 Agent 代码跨本地与生产。
- **调度外置**：Automation 独立服务，避免把 cron 塞进 Agent Server。

## 十二、本文总结

OpenHands 当前架构可以概括为：Canvas 负责看见与控制，SDK 负责思考与行动，Agent Server 负责连接与隔离边界，Workspace 负责在哪里执行，Automation 负责何时执行，Extensions 负责复用能力。

## 十三、延伸阅读

- [多仓库职责边界](#/article/architecture/02-repo-boundaries)
- [一次完整任务的时序图](#/article/architecture/09-task-sequence)
- 官方文档：<https://docs.openhands.dev/sdk/arch/overview>
