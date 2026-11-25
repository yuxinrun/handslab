---
title: "Automation 架构：让 Agent 按计划工作"
description: "拆解 OpenHands Automation 服务的职责、核心文件、cron 与 webhook 触发、派发、运行历史与沙箱生命周期编排。"
category: automation
order: 1
updated: 2026-11-25
diagram: /diagrams/automation-workflow.svg
tags: [Automation, cron, webhook, dispatcher, 调度]
---

## 本文学习目标

- 理解 Automation 在 OpenHands 中的定位。
- 说出 scheduler、dispatcher、run history 各自职责。
- 设计一个简单的自动化任务链路。

> **版本提示**：官方 README 标注该项目处于 **Beta**，API 与功能可能无通知变更。

## 一、定位

`OpenHands/automation` 是 OpenHands Cloud 的自动化服务。它负责：

- 创建自动化任务
- 按 cron 计划运行
- 通过 webhook 事件触发（如 GitHub 事件）
- 管理 API Key
- 记录运行历史

一句话概括：**Automation 决定“何时运行”，Agent Server / SDK 决定“运行什么、怎么运行”。**

## 二、职责边界

Automation 负责：

- automation definitions
- cron scheduling
- webhooks
- run history
- dispatching
- sandbox lifecycle orchestration

Agent Server / SDK 负责：

- 执行 Agent 对话
- 管理 Agent / tool 行为
- 管理 workspaces 与 events
- 拥有相关 API endpoints

扩展产物（可复用的自动化创建指南）位于 `OpenHands/extensions`，例如 `github-issue-to-pr`、`slack-standup-digest` 等 skills。

## 三、核心文件

官方 README 给出的结构：

```text
openhands/automation/
├── app.py          # FastAPI application entry point
├── router.py       # API routes for CRUD operations
├── scheduler.py    # Background scheduler for cron jobs
├── dispatcher.py   # Dispatches pending runs to OpenHands
├── models.py       # SQLAlchemy models
├── schemas.py      # Pydantic schemas for API
└── utils/
migrations/         # Alembic database migrations
tests/
containers/
└── Dockerfile
```

## 四、技术栈

- Python 3.12+
- `uv` 依赖管理
- FastAPI
- PostgreSQL（或使用 testcontainers 测试）
- SQLAlchemy + Pydantic
- Alembic 迁移

本地运行命令（来自 README）：

```bash
uv sync --group dev
uv run uvicorn openhands.automation.app:app --host 0.0.0.0 --port 8000 --reload
uv run pytest
```

数据库迁移：

```bash
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
```

## 五、触发器

### Cron 定时

`scheduler.py` 是后台 cron 调度器。它根据 automation definition 中的计划产生 pending run。

### Webhook

README 提到通过 GitHub events 等 webhook 触发，并指向 `docs/teams-webhooks.md`，其中覆盖 source admission、API setup、acknowledgement behavior。

具体 payload 格式在 README 中未展开，本站不臆测，标注“待核实”。

## 六、派发流程

```text
触发器产生运行意图
  → 写入 automation run 记录
  → dispatcher.py 找到 pending runs
  → 派发给 Agent Server / OpenHands
  → Agent Server 执行 conversation
  → 运行历史记录状态与结果
```

这是根据 README 职责描述归纳的教学流程，不是官方时序图。

## 七、运行历史

Automation 自己拥有 run history，记录：

- 运行状态
- 运行结果

它与 SDK 的 events 配合，可以形成从“触发”到“Agent 每一步动作”的完整轨迹。

## 八、多任务与失败处理

README 未给出具体并发策略或重试算法。本站不猜测实现细节。从架构边界可以确定：

- 调度与派发由 automation 负责
- 执行失败的具体原因来自 Agent Server / SDK 的事件
- 运行历史用于记录最终状态

## 九、数据库迁移的运维细节

README 提到：

- SQLite 在启动时自动迁移
- PostgreSQL 默认不在启动时迁移，除非设置 `AUTOMATION_RUN_MIGRATIONS_ON_STARTUP=true/1`
- 启用后每个 replica 在提供请求前执行 `alembic upgrade head`
- 同时启动的 replicas 通过 advisory lock 轮流执行
- `AUTOMATION_CREATE_DATABASE_IF_MISSING=true/1` 可自动创建数据库（需要 CREATEDB 权限）

这些细节说明自动化服务按多副本部署设计。

## 十、部署

Docker 构建：

```bash
docker build -t automation -f containers/Dockerfile .
docker run -p 8000:8000 automation
```

镜像推送到 `ghcr.io/openhands/automation`，由 push 到 main 或 tag 触发。

## 十一、常见错误

1. 在 automation 仓库实现 Agent 工具逻辑。
2. 把 automation 的 Beta API 当稳定契约。
3. 忽略 PostgreSQL 迁移开关，导致多副本启动异常。
4. 把 extensions 中的 skill 当成 automation 运行时代码。

## 十二、对自己开发 Agent 的启发

自动化服务应与 Agent 执行器解耦。一个最小实现可以拆成：

- `definitions`：任务定义
- `scheduler`：触发
- `dispatcher`：派发
- `runs`：状态与历史

这样 Agent 执行器保持无状态，调度策略可以独立演进。

## 十三、本文总结

Automation 让 Agent 从“人点按钮”变成“按计划工作”。它与 Agent Server 的分工，是 OpenHands 工程化架构的重要一环。

## 十四、延伸阅读

- [多仓库职责边界](#/article/architecture/02-repo-boundaries)
- [Agent Server 架构](#/article/architecture/05-agent-server-architecture)
- 官方 README：<https://github.com/OpenHands/automation>
