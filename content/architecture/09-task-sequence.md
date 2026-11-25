---
title: "一次完整任务的时序图"
description: "用时序视角串联 Agent Canvas、TypeScript Client、Agent Server、SDK、LLM、Tool 与 Workspace，并标出每一步产生的事件。"
category: architecture
order: 9
updated: 2026-11-25
diagram: /diagrams/event-stream.svg
tags: [时序图, 事件流, Conversation, 架构]
---

## 本文学习目标

- 能按时间顺序讲出一次任务经过的所有组件。
- 知道 REST 与 WebSocket 在时序中的不同角色。
- 理解事件持久化与实时推送的关系。

## 一、参与方

一次典型任务涉及六个参与方：

| 参与方 | 所属仓库/系统 | 主要动作 |
| --- | --- | --- |
| 用户 | — | 提交任务 |
| Agent Canvas | `OpenHands/OpenHands` | 渲染 UI、发起 API 调用 |
| TypeScript Client | `software-agent-sdk/clients/typescript` | typed browser access |
| Agent Server | `software-agent-sdk` | 创建/运行 conversation、推送事件 |
| Agent + LLM + Tools | `openhands.sdk` / `openhands.tools` | 决策与执行 |
| Workspace | local / Docker / remote | 文件与命令实际执行环境 |

## 二、时序总览

下面是**教学时序图**，基于官方组件边界归纳，不代表官方源码中的固定函数名：

```text
用户        Canvas        TS Client      Agent Server       Agent/LLM        Tool/Workspace
 │            │              │                │                 │                 │
 │ 输入任务   │              │                │                 │                 │
 ├───────────►│              │                │                 │                 │
 │            │ POST /api/conversations        │                 │                 │
 │            ├─────────────►├───────────────►│ 创建 conversation                │
 │            │              │                │ 写入 UserMessage 事件             │
 │            │ POST .../run │                │                 │                 │
 │            ├─────────────►├───────────────►│ 启动运行                          │
 │            │              │                ├────────────────►│ LLM 决策        │
 │            │              │                │◄────────────────┤ Action          │
 │            │              │                ├───────────────────────────────────►│ 执行
 │            │              │                │◄───────────────────────────────────┤ Observation
 │            │              │                ├────────────────►│ 下一轮推理      │
 │            │  WebSocket 事件推送           │                 │                 │
 │            │◄─────────────────────────────┤                 │                 │
 │ UI 更新    │              │                │                 │                 │
 │◄───────────┤              │                │                 │                 │
 │            │              │                │ 循环直到完成并写入状态更新事件     │
```

## 三、逐阶段说明

### 阶段 1：创建会话

Canvas 通过 TypeScript Client 调用 `POST /api/conversations`。服务端创建 conversation 并分配 id。

对应事件（示意）：`ConversationStarted`。

### 阶段 2：写入用户消息

Canvas 调用 `POST /api/conversations/{conversation_id}/events`。用户消息被写入事件历史。

对应事件（示意）：`UserMessageReceived`。

### 阶段 3：启动运行

Canvas 调用 `POST /api/conversations/{conversation_id}/run`。Agent Server 把运行交给 SDK 的 Agent。

### 阶段 4：LLM 决策

Agent 询问 LLM 下一步做什么。LLM 返回结构化 Action。

官方执行流程中这一步描述为：Agent asks LLM "What should I do?"，LLM 返回例如 `Use BashTool("touch hello.txt")`。

### 阶段 5：工具执行

Tool Executor 校验 Action，并在 workspace 环境中执行。官方 SDK 文档强调工具与 agent 在 workspace 配置的环境中 alongside 运行。

### 阶段 6：Observation 回写

工具结果作为 Observation 写回 Conversation 事件历史，并成为下一轮 LLM 输入的一部分。

### 阶段 7：事件推送与 UI 更新

Agent Server 通过 WebSocket 把事件推送给前端，Canvas 更新 conversation UI。官方文档明确 Agent Server 暴露 REST 与 WebSocket API 用于 stream events。

> WebSocket 的具体路由未在官方文档中给出，本站标注“待核实”，不猜测路径。

### 阶段 8：完成

LLM 表达完成，Agent 更新 Conversation state，前端显示最终结果。事件流中会出现状态更新事件。

## 四、REST 与 WebSocket 的分工

| 通道 | 用途 | 示例 |
| --- | --- | --- |
| REST | 命令式操作、查询、文件上传下载 | `POST /api/conversations`、`GET /api/conversations/{id}/events` |
| WebSocket | 服务端主动推送持续事件 | action、observation、state update |

关键区别：REST 是客户端主动请求，WebSocket 是服务端持续推送。Agent 执行是长时间过程，所以两者必须配合。

## 五、服务信息如何进入 Agent 上下文

Canvas 在启动新会话时，会把 `/server_info.runtime_services` 的信息作为 agent context suffix 注入。这样 Agent 在执行时能使用正确的服务端 URL，而不是猜测端口。

这一步常常被忽略，但它是本地多服务栈能稳定工作的重要原因。

## 六、失败路径

一次任务也可能走失败分支：

1. 工具参数校验失败 → 返回错误 Observation → LLM 重试或换工具。
2. 命令超时或退出码非零 → stderr 进入 Observation。
3. 用户暂停 → `POST .../pause` → 事件流出现暂停状态。
4. 人工确认 → `POST .../events/respond_to_confirmation`。
5. Token 过多 → 由 Condenser 压缩历史（具体策略待核实源码）。

## 七、常见错误

1. 把事件推送理解为轮询 REST。实际有 WebSocket 通道。
2. 认为 Canvas 直接调用 LLM。所有执行都经后端。
3. 忽略事件持久化，导致刷新后无法恢复轨迹。
4. 猜测不存在的 WebSocket 路径。

## 八、对自己开发 Agent 的启发

设计自己的系统时，建议把时序固定为：

```text
命令走 REST，状态走事件流，事件既推送也持久化。
```

这样前端可以实时展示，后端可以恢复，评估系统可以回放。

## 九、本文总结

一次任务穿过 Canvas、Client、Server、SDK、LLM 与 Workspace，每一步都应留下事件。理解时序，才算真正理解组件如何协作。

## 十、延伸阅读

- [Event System](#/article/events/05-event-system)
- [Agent Server 架构](#/article/architecture/05-agent-server-architecture)
- [交互实验室：Event Timeline](#/labs?lab=events)
