---
title: "OpenHands 解决什么问题？"
description: "从工程视角拆解 Coding Agent 面临的上下文、执行、隔离、可观测性与调度问题，并对照 OpenHands 当前架构中的对应组件。"
category: getting-started
order: 2
updated: 2026-11-25
diagram: /diagrams/coding-agent-flow.svg
tags: [Coding Agent, 工程架构, 问题定义]
---

## 本文学习目标

- 理解“让 LLM 改代码”与“让 Agent 完成工程任务”之间的差距。
- 把工程问题映射到 OpenHands 的具体组件。
- 建立后续学习的问题清单，而不是只记组件名称。

## 一、背景：Demo 与生产之间的鸿沟

一个能跑的 Agent Demo 通常只需要：把仓库内容拼进 prompt，调用模型，解析返回的代码片段。但真实工程任务会立刻遇到以下问题：

1. 上下文太大，无法一次性塞进模型。
2. 模型需要反复读取、修改、运行、失败、再修改。
3. 命令执行有风险，不能默认给宿主机权限。
4. 用户需要看到进度，而不是等待一个黑盒。
5. 任务可能由定时或外部事件触发，而不是只来自聊天框。
6. 多个 agent 可能并发工作，工作目录会互相干扰。

OpenHands 的多仓库架构，本质上是对这六类问题的工程回应。

## 二、问题一：上下文与多轮推理

**问题**：一个真实仓库有成千上万文件，LLM 上下文有限；一次决策往往需要基于多次观察。

**OpenHands 的回应**：

- `Conversation` 管理会话状态与生命周期。
- 每一轮工具结果作为 `Observation` 回到上下文。
- SDK 架构文档列出 `Condenser`，用于 conversation history compression 与 token 管理。
- 事件系统记录 action、observation、user messages、state update，使上下文可重建。

**启发**：不要试图把仓库全量塞进 prompt。应该让 Agent 具备“按需读取”的工具与“把结果结构化写回”的机制。

## 三、问题二：行动能力与安全边界

**问题**：Agent 要执行命令、读写文件，但这些操作直接影响真实系统。

**OpenHands 的回应**：

- SDK 提供 `Workspace`、`LocalWorkspace`、`RemoteWorkspace` 基础类。
- `openhands.workspace` 提供 `DockerWorkspace`、`RemoteAPIWorkspace`。
- 官方结论：同一份 agent 代码可以切换 `LocalWorkspace → DockerWorkspace → RemoteAPIWorkspace`。
- Agent Canvas 文档明确说它自己不提供 sandbox/workspace 隔离层。
- 官方 Docker quickstart 使用容器内 uid `10001`，并要求显式授权 workspace 读写权限。

**启发**：把“执行环境”抽象成可替换的组件，是 Agent 工程化的关键一步。安全不应靠 prompt 约束，而要靠运行时边界。

## 四、问题三：前端与执行引擎解耦

**问题**：UI 需要随时刷新、嵌入、切换后端；执行引擎需要长时间稳定运行。

**OpenHands 的回应**：

- Agent Canvas 是 React + TypeScript 前端，负责状态与展示。
- 它通过 TypeScript Client 调用 Agent Server。
- Canvas 可连接一个或多个 Agent Server 并在 UI 中切换。
- 后端通过 `/server_info.runtime_services` 暴露运行时服务信息，前端把它注入新会话的 agent context suffix，让 Agent 使用正确 URL 而不是猜端口。

**启发**：前端不要直接持有执行权限。通过一个可鉴权的 API 边界连接执行引擎，才能支持本地、远程、云端三种模式。

## 五、问题四：可观测性与调试

**问题**：Agent 的“思考过程”如果只存在于日志字符串里，无法做 UI、回放、审计与评估。

**OpenHands 的回应**：

- 类型化 Events 框架，覆盖 action、observation、user messages、state update。
- Agent Server API 提供事件查询、计数、批量获取与发送消息等端点。
- Automation 维护 run history，记录状态与结果。
- Canvas 根据事件流实时更新会话状态。

**启发**：事件不是日志的装饰，而是 Agent 系统的主干数据结构。后面事件系统一章会专门拆解。

## 六、问题五：调度与自动化

**问题**：很多任务不是人点按钮触发的，例如每天检查依赖更新、Issue 打标签后自动修复。

**OpenHands 的回应**：

- `OpenHands/automation` 负责 automation definitions、cron scheduling、webhooks、run history、dispatching。
- 它明确把“执行 conversation”留给 Agent Server / SDK。
- `OpenHands/extensions` 提供可复用的自动化创建指南（以 skills 形式）与 catalog。

**启发**：把“何时运行”和“运行什么”拆成两个服务，可以让调度策略独立演进，也让 Agent 执行器保持纯粹。

## 七、问题六：扩展与复用

**问题**：不同团队会写不同的 prompt、脚本和集成；如果都塞进核心 SDK，核心会迅速膨胀。

**OpenHands 的回应**：

- `skills/<id>/SKILL.md`：基于 Markdown 的指南，提供领域知识与操作说明。
- `plugins/<id>/`：除 `SKILL.md` 外还包含 `hooks/` 与 `scripts/`。
- `apps/`：基于 Canvas Extensions API 的可安装界面。
- npm 包 `@openhands/extensions` 与 Python 包 `openhands-extensions` 读取同一份 catalog 数据。

SDK 还提供 `AgentContext(load_public_skills=True)`，默认 marketplace 是 `OpenHands/extensions`。

## 八、问题到组件的映射表

| 工程问题 | 对应组件 | 主要仓库 |
| --- | --- | --- |
| 上下文与多轮推理 | Conversation、LLM、Condenser、Events | software-agent-sdk |
| 工具执行 | Tool System、Executor | software-agent-sdk |
| 执行隔离 | Workspace、DockerWorkspace | software-agent-sdk |
| 前端交互与后端切换 | Agent Canvas、TypeScript Client | OpenHands / SDK |
| 服务化与鉴权 | Agent Server | software-agent-sdk |
| 可观测性 | Events、run history | SDK / automation |
| 定时与事件触发 | Automation | automation |
| 可复用能力 | Skills、Plugins、Apps | extensions |

## 九、常见错误

- 把“模型能力强”当成系统能力的全部。没有 Workspace 与事件系统，模型能力无法稳定转化为工程结果。
- 认为加上 Docker 就解决所有安全问题。容器配置、挂载范围、网络出口、密钥注入都需要单独设计。
- 把 Automation 的 webhook 当成 Agent Server 的能力。两者职责不同。

## 十、对自己开发 Agent 的启发

如果你要从零做一个 Coding Agent，建议按这个顺序补齐能力：

1. 先实现可循环的 Action / Observation 契约。
2. 再加工作目录抽象与命令工具。
3. 然后加事件记录，让每一步可回放。
4. 接着做服务化与鉴权。
5. 最后加调度、扩展与评估。

这个顺序与 OpenHands 当前架构的分层是对应的，也与本站学习路线一致。

## 十一、本文总结

OpenHands 解决的核心问题不是“让模型写代码”，而是“把模型的代码能力变成可控制、可观察、可调度、可隔离的工程能力”。理解这一点，后面看任何组件都不会迷路。

## 十二、延伸阅读

- [OpenHands 是什么？](#/article/getting-started/01-what-is-openhands)
- [当前整体架构](#/article/architecture/01-overall-architecture)
- 官方文档：<https://docs.openhands.dev/sdk/arch/overview>
