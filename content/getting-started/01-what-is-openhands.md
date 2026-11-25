---
title: "OpenHands 是什么？"
description: "从当前官方仓库出发，重新定义 OpenHands：它不再是单一 Python 项目，而是由 Agent Canvas、Software Agent SDK、Agent Server、Automation 与 Extensions 组成的多仓库系统。"
category: getting-started
order: 1
updated: 2026-11-25
diagram: /diagrams/multi-repo.svg
tags: [OpenHands, Agent Canvas, SDK, 多仓库]
---

## 本文学习目标

- 说清当前 OpenHands 的官方定位，而不是停留在旧版“OpenHands Runtime”的印象。
- 区分 Agent Canvas、Software Agent SDK、Agent Server、Automation 与 Extensions 的职责。
- 知道应该到哪个官方仓库寻找某类问题的答案。

> **研究快照**：2026-11-25。本文基于官方 README、`docs/architecture.md`、`docs.openhands.dev/sdk/arch/overview` 与 GitHub API 记录的 commit。文末给出完整版本清单。

## 一、先纠正一个常见误解

很多中文资料仍把 OpenHands 描述为“一个带 Runtime 的单仓库 Python Agent”。这已经不符合当前事实。

当前官方 `OpenHands/OpenHands` 仓库 README 的标题是 **AGENT CANVAS**，副标题是：

> The self-hosted developer control center for coding agents and automations.

也就是说，主仓库现在承载的是**面向用户的控制台与本地运行编排**，而不是 Agent 核心执行引擎。Agent 核心行为的定义已经迁移到 `OpenHands/software-agent-sdk`。

官方 README 明确给出了多仓库职责表。我们把它翻译并补充如下：

| 仓库 | 当前职责 |
| --- | --- |
| `OpenHands/OpenHands` | Agent Canvas 前端、控制中心、backend 选择与本地栈编排 |
| `OpenHands/software-agent-sdk` | Python SDK、Agent Server、agents、tools、conversations、workspaces、events、canonical server API、TypeScript client |
| `OpenHands/typescript-client` | README 仅保留一条迁移说明：已迁入 software-agent-sdk |
| `OpenHands/automation` | 自动化定义、cron 调度、webhook、运行历史、派发 |
| `OpenHands/extensions` | Skills、Plugins、Automations 配置、Integrations、Apps 的公共注册表 |

## 二、OpenHands 当前是什么

可以从三个层面理解它。

### 2.1 对使用者：一个自托管的 Agent 控制中心

Agent Canvas 可以发起对话、查看终端与文件、切换后端、创建自动化任务。它默认本机运行，也能连接：

- Docker 容器中的 Agent Server
- 虚拟机或公司内网基础设施
- OpenHands Cloud
- OpenHands Enterprise

它开箱支持开源 OpenHands agent，也支持 Claude Code、Codex、Gemini CLI、Pi、OpenCode，以及任何实现 **ACP（Agent-Client Protocol）** 的 agent。

### 2.2 对开发者：一套可组合的 Agent SDK

`openhands.sdk` 提供了构建 Agent 的核心类。官方 Quick Start 示例（来自 SDK README）如下，这是**官方示例代码**：

```python
import os
from openhands.sdk import LLM, Agent, Conversation, Tool
from openhands.tools.file_editor import FileEditorTool
from openhands.tools.task_tracker import TaskTrackerTool
from openhands.tools.terminal import TerminalTool

llm = LLM(
    model="gpt-5.5",
    api_key=os.getenv("LLM_API_KEY"),
)
agent = Agent(
    llm=llm,
    tools=[
        Tool(name=TerminalTool.name),
        Tool(name=FileEditorTool.name),
        Tool(name=TaskTrackerTool.name),
    ],
)
cwd = os.getcwd()
conversation = Conversation(agent=agent, workspace=cwd)
conversation.send_message("Write 3 facts about the current project into FACTS.txt.")
conversation.run()
print("All done!")
```

这段示例揭示了当前架构的关键事实：

1. Agent 由 `LLM` 加一组 `Tool` 构成。
2. `Conversation` 持有 agent 与 workspace。
3. Agent 的行为通过 `send_message` + `run` 驱动。
4. workspace 可以只是 `os.getcwd()`，也可以是远程服务。

### 2.3 对运维者：一个可服务化的执行体系

`openhands-agent-server` 把 SDK 包装成 FastAPI HTTP/WebSocket 服务，让浏览器、CLI 与自定义客户端都能通过 API 使用 Agent。官方架构文档强调它的价值是：

> A clean boundary between your application backend and the agent runtime.

## 三、六个核心模块速览

### Agent Canvas

源码在 `OpenHands/OpenHands`。官方架构文档列出的结构包括：

- `src/api/`：Agent Server、cloud、settings、git、skills、automations、backend registry 的服务适配器
- `src/components/`：conversation、chat、browser、files、settings、backend、automation 等 UI
- `src/hooks/`：React Query hooks、状态 hooks、功能 hooks
- `src/stores/`：Zustand 状态存储
- `src/i18n/`：翻译资源
- `src/mocks/`：MSW handlers
- `bin/`、`scripts/`：CLI 与本地栈启动器

**它不负责**：直接执行 Agent 动作、提供 sandbox/workspace 隔离、在无 automation backend 时运行定时任务。

### Software Agent SDK

源码在 `OpenHands/software-agent-sdk`。官方架构文档给出四个 Python 包：

| 包 | 作用 | 是否必需 |
| --- | --- | --- |
| `openhands.sdk` | 核心框架 + 基础 workspace 类 | 必需 |
| `openhands.tools` | 预置工具（bash、文件编辑等） | 可选 |
| `openhands.workspace` | Docker、remote 等扩展 workspace | 可选 |
| `openhands.agent_server` | 多用户 API Server | 可选 |

### Agent Server

位于 `software-agent-sdk` 仓库的 `openhands-agent-server/openhands/agent_server`。它暴露 REST 与 WebSocket API，覆盖 conversations、bash、files、events、desktop、VSCode，并提供 OpenAI 兼容端点 `/v1/chat/completions` 与 `/v1/responses`。

### TypeScript Client

官方 README 明确写成 `clients/typescript/`，属于 SDK 仓库，供 Agent Canvas 消费。原 `OpenHands/typescript-client` 仓库只剩迁移说明。**不要把浏览器客户端说成独立维护的仓库。**

### Automation

位于 `OpenHands/automation`，处于 Beta。它负责“何时运行”，核心文件在 README 中列出：

- `openhands/automation/app.py`：FastAPI 入口
- `router.py`：CRUD 路由
- `scheduler.py`：cron 后台调度
- `dispatcher.py`：把待运行任务派发给 OpenHands
- `models.py` / `schemas.py`：SQLAlchemy 模型与 Pydantic schema
- `migrations/`：Alembic 迁移

### Extensions

位于 `OpenHands/extensions`，是公共扩展注册表。研究时该仓库 README 显示 2 个 marketplace、85 个扩展（74 个 skills、11 个 plugins）。skill 的定义文件是 `skills/<skill-id>/SKILL.md`；plugin 还可包含 `hooks/` 与 `scripts/`；App 基于 Canvas Extensions API。

## 四、一次任务如何穿过这些模块

一个典型链路是：

```text
用户在 Agent Canvas 输入任务
  → Canvas 通过 TypeScript Client 调用 Agent Server REST API
  → Agent Server 创建/运行 Conversation
  → SDK 的 Agent 调用 LLM 得到下一步决策
  → Agent 调用 Tool，Tool 在 Workspace 环境里执行
  → Observation 写入 Event 流并推送给 Canvas
  → 重复循环直到任务完成
```

这里有两个容易写错的点：

1. **工具不是在 workspace APIs 中“通过 API 执行”**。官方 SDK 架构文档明确说工具与 Agent 在 workspace 配置的环境中 alongside 运行。
2. **Canvas 不提供执行隔离**。隔离来自 workspace 实现（例如 DockerWorkspace）或 Agent Server 所在的容器。

## 五、与历史架构的关系

旧版资料常见 `Runtime`、`ActionExecutor`、`V0 API` 等说法。当前官方多仓库文档中：

- SDK 架构文档使用 `Agent`、`Conversation`、`LLM`、`Tool System`、`Events`、`Workspace`、`Skill`、`Condenser`、`Security` 作为核心概念。
- Agent Server API 使用 `/api/conversations/*`、`/api/bash/*`、`/api/file/*` 等路径。
- Canvas 文档使用 `/server_info.runtime_services` 传递运行时服务信息。

本文不会把这些不同年代的概念混写。若你在源码中看到旧名称，请先确认它属于哪个仓库、哪个版本。

## 六、常见错误

**错误 1：去 `OpenHands/OpenHands` 里找 Agent Loop 实现。**
现在应去 `software-agent-sdk` 的 `openhands/sdk/`。

**错误 2：把 TypeScript Client 当作独立仓库。**
它已迁入 SDK 仓库的 `clients/typescript/`。

**错误 3：把 automation 与 agent server 混为一谈。**
Automation 决定触发与派发；Agent Server 决定如何执行 conversation。

**错误 4：认为 Canvas 内置 Docker Sandbox。**
Canvas 只负责 UI 与后端切换；容器由 workspace/backend 编排提供。

## 七、设计取舍与启发

OpenHands 把“界面、执行、调度、扩展”拆到不同仓库，带来的直接好处是：

- Canvas 可以换用任何兼容 Agent Server 的 agent，包括 ACP agent。
- SDK 可以独立被 CLI、Cloud、自定义应用复用。
- Automation 可以独立演进调度能力而不影响 Agent 行为。

代价是初学者需要理解模块边界，且跨仓库调试链路更长。这也是 HandsLab 优先讲架构而不是先讲安装的原因。

## 八、本文总结

1. 当前 OpenHands 是多仓库系统，主仓库是 Agent Canvas。
2. Agent 行为的 source of truth 是 Software Agent SDK。
3. Agent Server 是 SDK 的服务化外壳，TypeScript Client 已并入 SDK 仓库。
4. Automation 负责何时运行，Extensions 负责可复用能力。
5. 阅读源码前先确认仓库与版本，是避免误读的第一步。

## 九、延伸阅读

- 官方 README：<https://github.com/OpenHands/OpenHands>
- SDK README：<https://github.com/OpenHands/software-agent-sdk>
- SDK 架构总览：<https://docs.openhands.dev/sdk/arch/overview>
- 本站：[OpenHands 多仓库项目结构](#/article/getting-started/06-multi-repo)、[当前整体架构](#/article/architecture/01-overall-architecture)

## 版本与源码引用

研究日期 `2026-11-25`。相关 commit：

- `OpenHands/OpenHands` main：`d56c1ab8e910500562cc157e13bdc8497283e032`（2026-11-25）
- `OpenHands/software-agent-sdk` main：`a053dbc47bfd98e96c621fa1b1e8d154abb1154c`（2026-11-24）
- `OpenHands/automation` main：`17fc93e057cbb102a53c4b356841578dbe9c9628`（2026-11-25）
- `OpenHands/extensions` main：`d0902e63a40807d8259bef101a1d1600ce94bf88`（2026-11-24）
- Docker 镜像示例版本：`ghcr.io/openhands/agent-canvas:1.45.0`
