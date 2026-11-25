---
title: "Agent Loop 原理"
description: "拆解 reasoning-action loop 的循环结构、终止条件、失败重试、上下文管理与长任务控制，并给出可运行的教学伪代码。"
category: agent-core
order: 2
updated: 2026-11-25
diagram: /diagrams/agent-loop.svg
tags: [Agent Loop, LLM, 推理循环, 状态管理]
---

## 本文学习目标

- 写出一个最小 Agent Loop 的伪代码。
- 说明终止条件、失败重试与 token 管理分别在哪一层解决。
- 理解为什么循环是 Agent 系统的主干。

## 一、背景：一次决策不够

LLM 单次调用只能根据当前上下文给出文本。要让模型完成“读仓库 → 修改 → 跑测试 → 修错”这样的任务，必须让它反复：

1. 观察当前状态
2. 决定下一步动作
3. 执行动作
4. 获得结果
5. 再决策

这就是 reasoning-action loop。官方 SDK 架构文档对 `Agent` 的定义就是 “implements reasoning-action loop”。

## 二、循环的最小结构

以下是**教学伪代码**，不是 OpenHands 官方源码：

```text
function run_loop(task, agent, workspace, max_steps=20):
    history = [user_message(task)]

    for step in range(max_steps):
        action = agent.llm.decide(history)      # LLM 决策
        if action.is_final:
            return action.answer

        observation = agent.execute(action, workspace)  # Tool 执行
        history.append(action)
        history.append(observation)

        if observation.fatal_error:
            return failure_report()

    return timeout_report()
```

它包含四个必备元素：

- `history`：上下文，决定 LLM 能看到什么
- `decide`：决策，通常由 LLM 完成
- `execute`：执行，由 Tool / Executor 完成
- `stop`：终止，由模型表达完成或外部约束触发

## 三、官方执行流程对照

SDK 架构文档给出的 local basic execution flow 是：

```text
1. 用户向 Conversation 发送消息
2. Conversation 把消息交给 Agent
3. Agent 询问 LLM："What should I do?"
4. LLM 返回决策，例如 Use BashTool("touch hello.txt")
5. Agent 调用 Tool 执行 action
6. Tool 在与 agent 相同的环境中运行
7. Tool 返回 Observation
8. Agent 再次询问 LLM："Got result, continue?"
9. LLM 返回 "Done"
10. Agent 更新 Conversation state
11. Conversation 返回结果
```

把伪代码与官方流程对齐：

| 伪代码元素 | 官方组件 |
| --- | --- |
| `history` | Conversation state / Events |
| `decide` | LLM |
| `execute` | Tool System / Executor |
| `workspace` | Local / Docker / Remote Workspace |
| `stop` | Agent 更新 Conversation state |

## 四、终止条件的四类来源

一个健壮的 Loop 不应只依赖模型说“完成”。常见终止来源：

| 类型 | 例子 | 处理位置 |
| --- | --- | --- |
| 模型表达完成 | LLM 返回 final answer | Agent 解析决策 |
| 步数上限 | `max_steps=20` | Loop 控制器 |
| 工具致命错误 | 权限拒绝、容器销毁 | Executor / Security |
| 外部干预 | 用户暂停、超时、取消 | Conversation / Server API |

Agent Server API 提供了 `POST /api/conversations/{id}/pause`，说明暂停是一等能力，而不是 hack。

## 五、失败重试的边界

失败分两种：

**可恢复失败**：命令退出码非零、文件不存在、测试失败。它们应作为 Observation 回到上下文，让 LLM 决定修复。

**不可恢复失败**：越权访问、密钥缺失、workspace 不可达。它们应触发安全策略或终止，而不是让模型反复尝试。

教学伪代码：

```text
observation = execute(action)
if observation.recoverable:
    history.append(observation)   # 让 LLM 重试
else:
    raise FatalExecutionError(observation)
```

OpenHands SDK 架构文档列出 `Security` 组件负责 action risk assessment 与 execution前 validation，说明安全检查发生在执行前，而不是事后补救。

## 六、上下文与 Token 管理

每一轮都会把 action 与 observation 追加到 history。长任务会让 token 快速增长。SDK 架构文档列出 `Condenser` 用于 conversation history compression。

这里有三条工程经验：

1. 原始事件应持久化，压缩只作用于送入模型的上下文。
2. 错误信息要高信号，避免把整个日志文件塞回上下文。
3. 压缩策略需要可观测，否则难以解释 Agent 为什么“忘了”某件事。

本文不臆测 Condenser 的具体算法；实现细节需读 SDK 源码。

## 七、长任务与暂停恢复

长任务带来的问题不是循环本身，而是：

- 进程可能重启
- 用户可能想暂停
- 多任务可能并发
- 成本需要限制

OpenHands 的答案是把 conversation 做成可持久化实体，并提供 pause/run API；把执行环境做成可替换 workspace；把自动化调度放到独立服务。

对自研 Agent 的启发：**从第一天就把循环状态序列化**，而不是只放在内存变量里。

## 八、教学实现：一个带事件记录的 Loop

以下 TypeScript 是**简化教学实现**，不是官方源码：

```ts
type Action = { tool: string; input: string } | { final: string };
type Observation = { ok: boolean; text: string };

async function loop(task: string, decide: (history: string[]) => Promise<Action>, execute: (a: Action) => Promise<Observation>) {
  const history: string[] = [`USER: ${task}`];
  const events: string[] = ['ConversationStarted'];

  for (let i = 0; i < 20; i++) {
    events.push('LLMDecisionStarted');
    const action = await decide(history);
    if ('final' in action) {
      events.push('ConversationFinished');
      return { answer: action.final, events };
    }
    events.push('ActionRequested');
    const observation = await execute(action);
    events.push('ObservationReceived');
    if (!observation.ok && observation.text.startsWith('FATAL')) {
      events.push('ConversationFailed');
      break;
    }
    history.push(`ACTION: ${JSON.stringify(action)}`);
    history.push(`OBSERVATION: ${observation.text}`);
  }
  return { answer: 'MAX_STEPS_REACHED', events };
}
```

它与官方实现的差异：

- 没有 Pydantic 强类型校验
- 没有真实 LLM provider 与 retry/telemetry
- 没有事件持久化与 WebSocket 推送
- 没有 Security 风险评估

## 九、常见错误

1. 把工具执行结果直接拼接成字符串而不做结构化。
2. 只用模型输出判断完成，没有外部步数上限。
3. 把 fatal error 当作普通 observation，导致无限重试。
4. 压缩上下文时丢掉原始事件。

## 十、设计取舍与启发

Agent Loop 看似简单，真正难的是围绕它的工程设施：状态、事件、权限、恢复、成本。OpenHands 把这些设施拆到 Conversation、Events、Workspace、Agent Server 与 Automation 中，而不是堆在 Loop 函数里。

## 十一、本文总结

Agent Loop 是“决策—执行—观察”的循环。模型负责决策，工具负责执行，Conversation 负责状态，Workspace 负责环境，外部控制器负责终止与安全。

## 十二、延伸阅读

- [LLM 推理与工具调用](#/article/agent-core/03-llm-and-tool-calling)
- [Action / Observation 模型](#/article/agent-core/04-action-observation)
- [交互实验室：Agent Loop Simulator](#/labs?lab=loop)
