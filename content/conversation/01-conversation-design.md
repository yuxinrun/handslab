---
title: "Conversation 设计与会话生命周期"
description: "理解 Conversation 如何持有 Agent 与 Workspace、管理状态与事件历史，以及暂停/恢复、持久化与任务上下文的组织方式。"
category: conversation
order: 1
updated: 2026-11-25
diagram: /diagrams/conversation-lifecycle.svg
tags: [Conversation, 生命周期, 状态管理, 持久化]
---

## 本文学习目标

- 说明 Conversation 在 SDK 中的职责。
- 理解会话状态、事件历史与任务上下文的关系。
- 知道暂停/恢复为何依赖持久化。

## 一、定位

官方 SDK 架构文档定义 `Conversation`：

> Manages conversation state and lifecycle.

在 Quick Start 示例中，Conversation 把 Agent 与 Workspace 绑定在一起：

```python
conversation = Conversation(agent=agent, workspace=cwd)
conversation.send_message("...")
conversation.run()
```

这说明 Conversation 是运行期的“会话容器”：它知道用哪个 Agent、在哪个 workspace 里跑，以及当前历史是什么。

## 二、与其他组件的关系

```text
User
  → Conversation（状态 + 历史 + 生命周期）
      → Agent（决策）
      → LLM（生成 Action）
      → Tool（执行）
      → Workspace（环境）
      → Events（记录每一步）
```

Conversation 本身不做决策，也不执行工具。它负责把各组件组织成一次会话。

## 三、会话状态

从 Agent Server API 可以推断会话至少具有这些状态操作：

| 操作 | 端点 |
| --- | --- |
| 创建 | `POST /api/conversations` |
| 查询 | `GET /api/conversations/{id}` |
| 列表/搜索 | `GET /api/conversations`、`GET /api/conversations/search` |
| 更新 | `PATCH /api/conversations/{id}` |
| 删除 | `DELETE /api/conversations/{id}` |
| 运行 | `POST /api/conversations/{id}/run` |
| 暂停 | `POST /api/conversations/{id}/pause` |

这些端点来自官方 API Reference。

## 四、事件历史是会话的核心

用户消息通过 `POST /api/conversations/{id}/events` 写入。工具动作与观察也作为事件记录。

因此 Conversation 的历史不是一个字符串数组，而是结构化事件序列。它的价值：

1. 为 LLM 提供上下文
2. 为 UI 提供实时状态
3. 为恢复提供快照
4. 为评估提供轨迹

## 五、任务上下文

任务上下文来自多处：

- 用户消息
- Agent context suffix（Canvas 注入的运行时服务信息）
- Skills（按需加载的 Markdown 指南）
- 事件历史中的 action / observation
- Workspace 中的文件与目录结构

OpenHands 不把整个仓库塞进上下文，而是让 Agent 通过工具按需读取。这是长任务能运行的前提。

## 六、暂停与恢复

官方 API 提供 pause 与 run。恢复的关键前提是：

- 事件历史已持久化
- workspace 状态可访问
- conversation id 可定位

官方 SDK 文档还列出 Condenser 用于 history compression。长会话恢复时，可能需要在完整历史与压缩上下文之间做取舍。具体策略需核实源码。

## 七、Agent Server 中的会话增强

官方 API 中有这些面向会话的控制端点：

- `POST /api/conversations/{id}/secrets`
- `POST /api/conversations/{id}/confirmation_policy`
- `POST /api/conversations/{id}/security_analyzer`
- `POST /api/conversations/{id}/generate_title`
- `POST /api/conversations/{id}/ask_agent`
- `POST /api/conversations/{id}/condense`

这说明会话不仅是消息容器，还是安全策略、密钥、标题生成与上下文压缩的作用域。

## 八、多用户隔离

Agent Server 通过 session API key 保护 `/api/*`。多用户场景下应确保：

- 每个用户的 conversation 独立
- workspace 目录或容器隔离
- 事件查询按 conversation 授权
- secrets 按 conversation 设置并加密存储

`OH_SECRET_KEY` 用于加密 conversation 中保存的敏感值，必须跨重启稳定。

## 九、教学数据结构

以下为**教学示意**，不是官方源码：

```ts
interface Conversation {
  id: string;
  agentId: string;
  workspaceRef: string;
  status: 'created' | 'running' | 'paused' | 'finished' | 'failed';
  events: AgentEvent[];
  secretsRef?: string;
  confirmationPolicy?: 'never' | 'dangerous' | 'always';
}
```

## 十、常见错误

1. 把会话历史只存在内存里。
2. 把 secrets 直接写进事件 payload。
3. 暂停后不保存 workspace 状态。
4. 多个用户共享 conversation id。

## 十一、对自己开发 Agent 的启发

把 Conversation 设计成“状态 + 事件 + 策略”的容器，而不是“消息列表”。这样安全策略、上下文压缩、恢复与审计都有统一挂载点。

## 十二、本文总结

Conversation 是 Agent 会话的运行期容器。它组织 Agent、Workspace、LLM 与事件，并承载生命周期、安全策略与恢复能力。

## 十三、延伸阅读

- [Event System](#/article/events/05-event-system)
- [一次完整任务的时序图](#/article/architecture/09-task-sequence)
- 官方 API Reference：<https://docs.openhands.dev/sdk/guides/agent-server/api-reference/server-details/alive>
