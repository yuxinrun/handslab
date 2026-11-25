---
title: "OpenHands 多仓库项目结构"
description: "逐仓库拆解目录结构与职责边界，记录研究时的 commit SHA，并给出正确的源码阅读顺序。"
category: getting-started
order: 6
updated: 2026-11-25
diagram: /diagrams/multi-repo.svg
tags: [多仓库, 源码阅读, Commit]
---

## 本文学习目标

- 知道五个官方仓库各自有哪些关键目录。
- 能根据问题类型快速定位应读的仓库与文件。
- 理解为什么 TypeScript Client 不再有独立实现。

## 一、研究快照与版本记录

本文所有结论基于 `2026-11-25` 对官方 GitHub 仓库与文档的读取。通过 GitHub API 记录的 main 分支 commit 如下：

| 仓库 | Commit SHA | 日期 |
| --- | --- | --- |
| `OpenHands/OpenHands` | `d56c1ab8e910500562cc157e13bdc8497283e032` | 2026-11-25 |
| `OpenHands/software-agent-sdk` | `a053dbc47bfd98e96c621fa1b1e8d154abb1154c` | 2026-11-24 |
| `OpenHands/automation` | `17fc93e057cbb102a53c4b356841578dbe9c9628` | 2026-11-25 |
| `OpenHands/extensions` | `d0902e63a40807d8259bef101a1d1600ce94bf88` | 2026-11-24 |
| `OpenHands/typescript-client` | 原仓库 README 仅保留迁移说明 | 待核实 |

OpenHands 持续高频更新，后续阅读请以仓库当前状态为准。

## 二、OpenHands/OpenHands：Agent Canvas

README 当前标题为 **AGENT CANVAS**。官方架构文档 `docs/architecture.md` 列出的关键目录：

```text
OpenHands/
├── src/
│   ├── api/          # Agent Server、cloud、settings、git、skills、automations、backend registry 适配器
│   ├── components/   # conversation、chat、browser、files、settings、backend、automation 等 UI
│   ├── hooks/        # React Query hooks、状态 hooks、功能 hooks
│   ├── stores/       # Zustand 状态存储
│   ├── i18n/         # 翻译资源与 bundles
│   └── mocks/        # MSW handlers，用于 mock-mode 开发
├── bin/              # CLI
├── scripts/          # 开发栈启动器
├── docs/
│   ├── architecture.md
│   ├── DEVELOPMENT.md
│   └── SELF_HOSTING.md
└── package.json      # 发布 @openhands/agent-canvas
```

README 中的版本信息值得记录：

- npm 包：`@openhands/agent-canvas`
- Docker 镜像示例：`ghcr.io/openhands/agent-canvas:1.45.0`
- Node.js：24 或更高
- 仓库 pin 的 npm：`11.12.1`
- 默认端口：`8000`
- Docker 容器内 uid：`10001`
- `/alive` 检查约 30 秒无响应则容器退出

## 三、OpenHands/software-agent-sdk：核心 SDK

官方架构文档给出四个 Python 包及对应源码位置：

```text
software-agent-sdk/
├── openhands/
│   ├── sdk/            # 核心框架：Agent / Conversation / LLM / Tool System / Events / Workspace 基类
│   ├── tools/          # 预置工具，例如 bash、文件编辑
│   ├── workspace/      # DockerWorkspace / RemoteAPIWorkspace 等扩展实现
│   └── agent_server/   # FastAPI HTTP/WebSocket Server
├── openhands-agent-server/
│   └── openhands/agent_server/   # Canvas README 中给出的服务实现路径
├── clients/
│   └── typescript/     # 浏览器兼容客户端（原 typescript-client 仓库已迁入）
├── examples/
│   ├── 01_standalone_sdk/
│   ├── 02_remote_agent_server/
│   ├── 03_github_workflows/
│   └── 05_skills_and_plugins/
└── DEVELOPMENT.md
```

注意路径写法：Canvas README 指向 `openhands-agent-server/openhands/agent_server`，SDK 架构文档把包写作 `openhands.agent_server`。二者描述的是同一个服务层，但目录层级表述略有差异；实际定位时建议同时搜索模块名与目录名。

## 四、OpenHands/automation：调度服务

README 给出的结构非常清晰：

```text
automation/
├── openhands/automation/
│   ├── app.py          # FastAPI 应用入口
│   ├── router.py       # CRUD API 路由
│   ├── scheduler.py    # cron 后台调度
│   ├── dispatcher.py   # 把 pending runs 派发给 OpenHands
│   ├── models.py       # SQLAlchemy 模型
│   ├── schemas.py      # Pydantic schema
│   └── utils/
├── migrations/         # Alembic 数据库迁移
├── tests/
└── containers/
    └── Dockerfile
```

技术栈与约束：

- Python 3.12+
- 使用 `uv` 管理依赖
- PostgreSQL 或通过 testcontainers 测试
- FastAPI
- 项目处于 **Beta**，API 可能变更

## 五、OpenHands/extensions：扩展注册表

README 中的关键布局：

```text
extensions/
├── skills/
│   └── <skill-id>/
│       ├── SKILL.md    # skill 定义
│       └── README.md   # 可选说明
├── plugins/
│   └── <plugin-id>/
│       ├── SKILL.md
│       ├── hooks/
│       └── scripts/
├── apps/               # Canvas Extensions API 应用
├── marketplaces/
│   └── openhands-extensions.json
└── integrations/catalog/*.json
```

发布物：

- npm：`@openhands/extensions`
- Python：`openhands-extensions`
- catalog 单一数据源：`integrations/catalog/*.json`

研究时 README 显示 2 个 marketplace（`large-codebase`、`openhands-extensions`），共 85 个扩展（74 skills、11 plugins）。

## 六、TypeScript Client：已迁移

`OpenHands/typescript-client` 的 README 当前只有一句迁移说明：

> The OpenHands TypeScript client has been moved to https://github.com/OpenHands/software-agent-sdk.

SDK README 则明确拥有 `clients/typescript/`，并把它作为 browser-compatible TypeScript client。Canvas README 的数据流描述是：

```text
SDK/Agent Server → OpenAPI contract → clients/typescript → Agent Canvas
```

所以现在正确的说法是：**TypeScript Client 由 SDK 仓库维护，Canvas 消费它。**

## 七、按问题选仓库

| 你想解决的问题 | 先读哪个仓库 |
| --- | --- |
| 页面组件、后端切换、UI 状态 | `OpenHands/OpenHands` `src/` |
| Agent Loop、工具契约、Conversation | `software-agent-sdk` `openhands/sdk/` |
| 内置工具实现 | `software-agent-sdk` `openhands/tools/` |
| 容器 / 远程 workspace | `software-agent-sdk` `openhands/workspace/` |
| REST / WebSocket API | `software-agent-sdk` `openhands/agent_server/` |
| 浏览器 API 客户端 | `software-agent-sdk` `clients/typescript/` |
| cron / webhook / 派发 | `automation` |
| skills / plugins / apps | `extensions` |

## 八、建议的源码阅读顺序

1. 先读 `OpenHands/OpenHands/README.md` 的 Multi-repo Structure 表。
2. 再读 `docs/architecture.md` 的 system boundary。
3. 然后读 `software-agent-sdk/README.md` 的 Quick Start 示例。
4. 接着读 `docs.openhands.dev/sdk/arch/overview`。
5. 最后按兴趣深入具体包。

不要一开始就钻进某个具体实现，否则容易把某个仓库的局部设计误当成整个系统。

## 九、常见错误

- 把 `typescript-client` 当作仍在独立开发：错误。
- 在 Canvas 仓库找 Agent Loop：错误，应去 SDK。
- 在 Automation 仓库找 conversation 执行逻辑：错误，它只负责派发。
- 把 Extensions 中的 skill 文档当成 SDK 核心 API：错误，它们是Markdown 指南。

## 十、本文总结

多仓库不是组织上的随意拆分，而是架构边界的物理化。记住一句话：**Canvas 管交互，SDK 管行为，Server 管服务，Automation 管调度，Extensions 管复用。**

## 十一、延伸阅读

- [OpenHands 是什么？](#/article/getting-started/01-what-is-openhands)
- [多仓库职责边界](#/article/architecture/02-repo-boundaries)
- 官方仓库索引：<https://github.com/OpenHands>
