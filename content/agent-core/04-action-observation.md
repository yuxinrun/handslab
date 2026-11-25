---
title: "Action / Observation 模型"
description: "深入工具调用的结构化输入输出契约：为什么需要强类型 Action 与 Observation、错误如何回流、以及它对安全与可观测性的影响。"
category: agent-core
order: 4
updated: 2026-11-25
diagram: /diagrams/action-observation.svg
tags: [Action, Observation, Tool System, 契约]
---

## 本文学习目标

- 说明 Action / Observation 在 Agent 循环中的数据契约作用。
- 设计一个可校验、可记录、可回放的工具结果结构。
- 理解错误为什么不应以裸字符串处理。

## 一、为什么需要契约

如果工具调用只是字符串，例如 `"rm -rf ..."`，系统会失去三样东西：

1. 执行前的参数校验
2. 执行后的结构化结果
3. 事件流中的可回放记录

OpenHands SDK 的 Tool System 定义了 `Action`、`Observation`、`Tool`、`Executor` 类型化基类，并内置 validation、error handling 与 security。这说明契约不是装饰，而是基础设施。

## 二、Action 是什么

Action 表示“LLM 决定做的下一步”。它至少包含：

- 工具标识（tool name）
- 参数（arguments）
- 可选元信息（call id、超时、风险等级）

教学用的 TypeScript 类型：

```ts
interface ShellAction {
  kind: 'action';
  tool: 'TerminalTool';
  arguments: { command: string; timeout?: number };
  callId: string;
}

interface FinalAction {
  kind: 'final';
  answer: string;
}

type Action = ShellAction | FinalAction;
```

这是**教学示例**，不是 OpenHands 官方类型定义。官方类型以 SDK 源码为准。

## 三、Observation 是什么

Observation 表示“执行动作后环境返回了什么”。它应该区分：

- 成功输出
- 可恢复失败（测试失败、文件不存在）
- 致命失败（越权、密钥缺失）

教学结构：

```ts
interface Observation {
  callId: string;
  status: 'success' | 'recoverable_error' | 'fatal_error';
  content: string;
  metadata?: {
    exitCode?: number;
    durationMs?: number;
    truncated?: boolean;
  };
}
```

这样的结构让 Agent 可以决定：

- success → 继续推理
- recoverable_error → 尝试修复
- fatal_error → 停止并报告

## 四、执行链路

```text
LLM 输出 Action
  → Executor 做 Schema 校验
  → Security 做风险评估
  → 在 Workspace 环境执行
  → 生成 Observation
  → 写入事件历史
  → 回到 LLM 上下文
```

官方 SDK 文档强调工具与 Agent 在同一 workspace 环境中运行，而不是通过 workspace APIs 远程执行。Observation 就是这个本地/容器/远程环境返回的结构化结果。

## 五、错误处理的三种策略

### 策略 1：错误作为 Observation

适用于测试失败、编译错误、命令退出码非零。让 LLM 看到错误并尝试修复。

### 策略 2：错误触发重试

适用于网络抖动、模型限流。这类重试属于 LLM 层或执行器的受控策略。

### 策略 3：错误导致终止

适用于越权、密钥缺失、workspace 不可达。应生成 fatal Observation 或安全事件，不应让模型继续尝试。

## 六、可观测性价值

当 Action 与 Observation 都是结构化对象时，事件系统可以记录：

- 请求了哪个工具
- 参数是什么
- 执行耗时与退出码
- 返回给模型的观察内容

这使回放、调试、评估与审计成为可能。Agent Server API 提供事件搜索、计数与批量获取端点，前提就是事件有稳定结构。

## 七、安全价值

校验发生在执行前：

```text
Action → Schema 校验 → Security 评估 → 执行
```

SDK 架构文档列出 `Security` 负责 action risk assessment 与 execution前 validation。如果 Action 是裸字符串，安全层几乎没有可靠输入。

## 八、教学示例：一个最小执行器

以下为**教学实现**，不是官方源码：

```ts
function execute(action: Action, workspace: Workspace): Observation {
  if (action.tool === 'TerminalTool') {
    const { command } = action.arguments;
    if (!command || command.length > 4096) {
      return { callId: action.callId, status: 'fatal_error', content: 'invalid command' };
    }
    const result = workspace.run(command, { timeout: 30 });
    return {
      callId: action.callId,
      status: result.exitCode === 0 ? 'success' : 'recoverable_error',
      content: result.output.slice(0, 8000),
      metadata: { exitCode: result.exitCode, durationMs: result.durationMs, truncated: result.output.length > 8000 },
    };
  }
  return { callId: action.callId, status: 'fatal_error', content: 'unknown tool' };
}
```

与官方实现的差异：

- 没有 Pydantic 类型系统
- 没有真实风险分析器
- 没有确认策略（Agent Server 提供 confirmation_policy 端点）
- 没有事件持久化

## 九、常见错误

1. 把 stderr 直接丢掉，导致 LLM 不知道失败原因。
2. 把完整 10MB 日志塞回上下文。
3. 不记录 call id，导致并行工具调用无法对齐。
4. 对 fatal error 继续重试。

## 十、设计取舍与启发

结构化契约的代价是要维护 schema 与类型定义，但它换来三件事：安全校验、可观测性、可测试性。对任何严肃的 Agent 系统，这都是划算的交换。

## 十一、本文总结

Action 是决策，Observation 是事实。把二者做成强类型契约，是 Agent 从 Demo 走向工程系统的分水岭。

## 十二、延伸阅读

- [Tool System 设计](#/article/tools/01-tool-system-design)
- [Event System](#/article/events/05-event-system)
- [交互实验室：Tool Calling Simulator](#/labs?lab=tools)
