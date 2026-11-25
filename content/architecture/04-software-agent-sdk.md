---
title: "Software Agent SDK 架构"
description: "从四个 Python 包、核心组件、执行流程到部署模式，系统讲解 OpenHands Software Agent SDK 的设计。"
category: architecture
order: 4
updated: 2026-11-25
diagram: /diagrams/tool-system.svg
tags: [SDK, Agent, Conversation, LLM, Tool System]
---

## 本文学习目标

- 记住 SDK 的四个 Python 包与各自职责。
- 理解核心组件之间的关系。
- 能解释同一份 Agent 代码如何在不同 workspace 模式中运行。

## 一、定位

官方架构文档说 SDK 提供统一、类型安全的框架，用于构建和部署 AI agents，关注：

- statelessness
- composability
- clear boundaries

并且明确：

> The SDK is the source of truth for agents in OpenHands.

SDK 定义 agent 行为；Agent Server 暴露远程执行；应用（Canvas、CLI、custom clients）通过 SDK 或 Agent Server 集成。

## 二、四个 Python 包

| 包 | 作用 | 何时需要 |
| --- | --- | --- |
| `openhands.sdk` | 核心框架 + 基础 workspace 类 | 必需 |
| `openhands.tools` | 预置工具，如 bash、文件编辑 | 可选 |
| `openhands.workspace` | Docker、remote 等扩展 workspace | 可选 |
| `openhands.agent_server` | 多用户 API server | 可选 |

对应源码目录：

```text
openhands/sdk/
openhands/tools/
openhands/workspace/
openhands/agent_server/
examples/
```

## 三、核心组件

官方架构总览列出的精确名称：

| 名称 | 含义 |
| --- | --- |
| `Agent` | 实现 reasoning-action loop |
| `Conversation` | 管理 conversation state 与 lifecycle |
| `LLM` | provider-agnostic 模型接口，包含 retry 与 telemetry |
| Tool System | `Action`、`Observation`、`Tool`、`Executor` 类型化基类，含 MCP 集成 |
| Events | action、observation、user messages、state update |
| Workspace | `Workspace`、`LocalWorkspace`、`RemoteWorkspace` |
| Skill | 可复用 prompts，支持 trigger-based activation |
| Condenser | conversation history compression |
| Security | action 风险评估与执行前验证 |

设计特点：stateless、immutable components、type-safe Pydantic models。

## 四、官方 Quick Start 解析

SDK README 的官方示例（已在入门文章引用）可以拆成四步：

```python
llm = LLM(model="gpt-5.5", api_key=os.getenv("LLM_API_KEY"))
agent = Agent(llm=llm, tools=[...])
conversation = Conversation(agent=agent, workspace=cwd)
conversation.send_message("..."); conversation.run()
```

对应关系：

1. `LLM` 封装模型与凭据。
2. `Agent` 把 LLM 与工具列表组合成决策器。
3. `Conversation` 把 Agent 绑定到具体 workspace。
4. `send_message` 写入用户意图，`run` 启动循环。

示例中工具通过 `Tool(name=TerminalTool.name)` 这种形式传入，工具模块路径分别是：

- `openhands.tools.file_editor.FileEditorTool`
- `openhands.tools.task_tracker.TaskTrackerTool`
- `openhands.tools.terminal.TerminalTool`

> **核验提示**：SDK 架构文档还出现 `BashTool`、`FileEditor`、`GrepTool` 等名称，README 示例使用 `TerminalTool.name`。二者可能对应不同层级或版本。本文不合并这些名称，具体映射待核实源码。

## 五、执行流程

官方架构文档给出的 local basic execution flow：

```text
1. 用户向 Conversation 发送消息，例如 "Create hello.txt"
2. Conversation 把消息交给 Agent
3. Agent 询问 LLM："What should I do?"
4. LLM 返回决策，例如 Use BashTool("touch hello.txt")
5. Agent 调用 Tool 执行 action
6. Tool 在与 agent 相同的环境中运行（local / container / remote）
7. Tool 返回 Observation
8. Agent 再次询问 LLM："Got result, continue?"
9. LLM 返回 "Done"
10. Agent 更新 Conversation state
11. Conversation 向用户返回 "File created!"
```

这段流程说明一个关键设计：**LLM 只做决策，执行由 Tool 完成；Observation 必须回到 Agent 上下文中，循环才能继续。**

## 六、Workspace 的可替换性

官方给出的两种安装方式：

```bash
# 本地开发
pip install openhands-sdk openhands-tools

# 生产 / 沙箱
pip install openhands-sdk openhands-tools openhands-workspace openhands-agent-server
```

官方结论：

> Same agent code works in both modes—just swap the workspace type: LocalWorkspace → DockerWorkspace → RemoteAPIWorkspace

workspace 类归属：

- `openhands.sdk`：`Workspace`、`LocalWorkspace`、`RemoteWorkspace`
- `openhands.workspace`：`DockerWorkspace`、`RemoteAPIWorkspace`

`DockerWorkspace` 会启动带 server 的容器；`RemoteAPIWorkspace` 通过 HTTP 连接 server。

## 七、Skills 与 Condenser

`AgentContext(load_public_skills=True)` 可启用公共 skills，默认 marketplace 是 `OpenHands/extensions`，示例 skill 包括 `uv`、`deno`。SDK 可识别 `uv.lock`、`deno.json`、`deno.jsonc`、`deno.lock` 等仓库标记。

`Condenser` 负责 conversation history compression，是长任务中控制 token 的关键组件。本文不臆测其具体算法，需阅读源码确认。

## 八、Examples 目录

SDK README 列出：

- `examples/01_standalone_sdk/`：基础 agent 用法、自定义工具、核心工作流
- `examples/02_remote_agent_server/`：client-server 架构、WebSocket 连接
- `examples/03_github_workflows/`：CI/CD 集成
- `examples/05_skills_and_plugins/`：AgentSkills、plugins、marketplace 示例

这是学习 SDK 最直接的入口。

## 九、常见错误

1. 把 SDK 叫成“OpenHands 的 Runtime 模块”。当前官方文档以 SDK 为核心术语。
2. 认为需要安装全部四个包才能本地跑 Agent。只需 `openhands-sdk` + `openhands-tools` 与 `LocalWorkspace`。
3. 把工具执行理解成通过 workspace API 远程调用。它们在 agent 所在环境执行。
4. 把 skill 当成 Python 类。它是基于 Markdown 的指南。

## 十、设计取舍与启发

SDK 的核心设计可以概括为：**用强类型契约固定 Agent 行为，用可替换 workspace 隔离执行环境，用事件记录一切。**

如果你要写自己的 Agent Framework，最值得借鉴的是：

- 先定义 Action / Observation 类型，再考虑工具实现。
- 让 Conversation 显式持有 workspace，而不是让工具隐式访问全局路径。
- 把 LLM 决策与工具执行分开，便于替换模型与工具。

## 十一、本文总结

Software Agent SDK 是 OpenHands 的 agent 行为定义层。它把推理、工具、事件与 workspace 抽象组合成可组合框架，是理解整个系统的核心。

## 十二、延伸阅读

- [Agent Loop 原理](#/article/agent-core/02-agent-loop)
- [Tool System 设计](#/article/tools/01-tool-system-design)
- 官方文档：<https://docs.openhands.dev/sdk/arch/overview>
