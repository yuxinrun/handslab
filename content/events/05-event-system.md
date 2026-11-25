---
title: "Event System：Agent 系统的主干数据结构"
description: "从类型化事件、事件流、实时状态更新、持久化与调试角度，解释为什么 Events 是 OpenHands SDK 的核心组件。"
category: events
order: 5
updated: 2026-11-25
diagram: /diagrams/event-stream.svg
tags: [Event System, 事件流, WebSocket, 可观测性]
---

## 本文学习目标

- 说明 Events 在 SDK 中的职责。
- 理解事件既用于 UI 实时更新，也用于持久化与回放。
- 能区分事件、日志与轨迹。

## 一、Events 在 SDK 中的定位

官方 SDK 架构文档把 Events 列为核心组件：

> Typed event framework for action, observation, user messages, state update.

这四个类别覆盖了 Agent 循环的全部重要时刻：

- 用户说了什么
- 模型决定做什么
- 工具返回了什么
- 系统状态发生了什么变化

## 二、为什么不是普通日志

日志通常是给人看的字符串；事件是给系统消费的结构化对象。事件具备：

- 稳定类型
- 唯一 id
- 时间戳
- 可查询
- 可回放
- 可推送

Agent Server API 提供事件搜索、计数、单条获取与批量获取端点，前提是事件有稳定结构。

## 三、事件类型示意

以下是一些教学示意的事件名称，用于说明时间线，**不代表官方枚举的完整列表**：

```text
ConversationStarted
UserMessageReceived
ActionRequested
ActionStarted
ActionCompleted
ObservationReceived
ConversationFinished
```

官方 API 中与事件相关的端点包括：

```text
GET  /api/conversations/{id}/events/search
GET  /api/conversations/{id}/events/count
GET  /api/conversations/{id}/events/{event_id}
GET  /api/conversations/{id}/events
POST /api/conversations/{id}/events
POST /api/conversations/{id}/events/respond_to_confirmation
```

其中 `POST .../events` 同时用于发送消息，说明“用户消息也是事件”。

## 四、事件流与实时 UI

Canvas 需要实时显示 Agent 的每一步。Agent Server 暴露 REST 与 WebSocket API 用于 stream events。

```text
Agent 执行动作
  → 事件写入 Conversation 历史
  → Agent Server 推送事件
  → TypeScript Client 接收
  → Canvas 更新 UI
```

关键点是“写入”和“推送”都要发生。只推送不写入，刷新后无法恢复；只写入不推送，UI 无法实时。

## 五、事件持久化

Agent Server 文档说明运行时文件默认位于 `workspace/`，其中包含 `conversations/`。结合事件查询端点，可以推断事件被持久化在服务端。

本文不臆测具体存储引擎或文件格式；应读源码确认。

## 六、任务中断与恢复

事件轨迹使中断恢复成为可能：

1. 用户暂停 conversation。
2. 服务端保存当前事件历史。
3. 之后通过 run 恢复执行。
4. Agent 从事件中重建上下文，继续循环。

Agent Server 提供 `POST /api/conversations/{id}/pause` 与 `POST /api/conversations/{id}/run`。

## 七、调试与评估

事件系统让以下能力变得自然：

- 回放一次失败任务
- 统计工具调用次数与失败率
- 统计 token 与成本
- 分析 LLM 决策模式
- 做质量评估与回归对比

Automation 服务维护 run history，与 SDK 事件轨迹结合，可以覆盖从触发到执行的完整链路。

## 八、事件设计建议

自研 Agent 时，建议事件至少包含：

```ts
interface AgentEvent {
  id: string;
  conversationId: string;
  type: string;
  timestamp: string;
  source: 'user' | 'agent' | 'tool' | 'system';
  payload: Record<string, unknown>;
}
```

注意不要把敏感信息写入 payload。密钥应通过 `OH_SECRET_KEY` 等机制加密，而不是出现在事件里。

## 九、常见错误

1. 用 console.log 代替事件系统。
2. 事件只推送不持久化。
3. 事件 payload 结构随版本随意变化。
4. 把大段日志塞进单个事件。
5. 在事件中记录 API key。

## 十、设计取舍与启发

事件系统是 Agent 系统的“神经系统”。它把执行过程从一个黑盒函数调用，变成一串可观察、可查询、可回放的状态变化。这是 Agent 能被调试、评估和审计的前提。

## 十一、本文总结

Events 不是附加功能，而是 Agent 循环的主干数据。它连接执行、UI、持久化、恢复与评估。

## 十二、延伸阅读

- [一次完整任务的时序图](#/article/architecture/09-task-sequence)
- [Conversation 设计](#/article/conversation/01-conversation-design)
- [交互实验室：Event Timeline](#/labs?lab=events)
