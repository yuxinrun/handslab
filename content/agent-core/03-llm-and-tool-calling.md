---
title: "LLM 推理与工具调用"
description: "从 SDK 的 LLM 抽象出发，解释模型如何参与决策、工具调用如何在循环中被选择，以及 retry、telemetry 与命名差异的核验边界。"
category: agent-core
order: 3
updated: 2026-11-25
diagram: /diagrams/action-observation.svg
tags: [LLM, Tool Calling, 推理, telemetry]
---

## 本文学习目标

- 说明 `LLM` 在 SDK 中的职责边界。
- 理解工具调用是决策结果，而不是模型直接执行。
- 知道哪些命名差异需要以源码为准。

## 一、LLM 在 SDK 中的定位

官方 SDK 架构文档定义 `LLM`：

> Provider-agnostic language model interface, with retry and telemetry.

关键词有三个：

1. **Provider-agnostic**：不绑定某一家模型供应商。
2. **Retry**：网络或限流失败时具备重试能力。
3. **Telemetry**：调用过程可被观测。

官方 Quick Start 中的构造方式是：

```python
llm = LLM(
    model="gpt-5.5",
    api_key=os.getenv("LLM_API_KEY"),
)
```

这说明模型名与凭据是 LLM 构造的一部分；工具列表不属于 LLM，而属于 Agent。

## 二、谁决定调用工具

官方执行流程写到：

- Agent 询问 LLM "What should I do?"
- LLM 返回决策，例如 `Use BashTool("touch hello.txt")`
- Agent 调用 Tool 执行 action

因此，**工具调用是 LLM 输出的一个结构化决策，执行权在 Agent / Tool Executor**。模型本身不接触文件系统或 shell。

这个边界非常重要：如果你在自己的实现里让模型回调直接执行 shell，就等于把决策层和执行层合并，后续做权限校验与审计会很困难。

## 三、工具调用在循环中的位置

```text
Conversation state + 事件历史
        ↓
LLM 生成下一步 Action（可能包含 tool name + arguments）
        ↓
Agent 把 Action 交给 Tool Executor
        ↓
Executor 校验参数、评估风险、执行
        ↓
Observation 写回历史
```

官方 Tool System 包含 Action、Observation、Tool、Executor 类型化基类，并内置 validation、error handling、security。SDK 架构文档也列出 `Security` 负责 action risk assessment 与执行前 validation。

## 四、模型输出如何变成可执行 Action

以下为**教学示意**，不是官方源码：

```json
{
  "tool": "TerminalTool",
  "arguments": {
    "command": "python -m pytest -q",
    "timeout": 120
  }
}
```

Executor 需要做三类检查：

1. **Schema 校验**：参数类型、必填字段、枚举值。
2. **安全检查**：命令是否在允许范围、路径是否越界。
3. **环境绑定**：工具在哪个 workspace 环境执行。

任何一步失败，都应产生结构化 Observation，而不是抛出异常后让循环崩溃。

## 五、Retry 属于哪一层

官方把 retry 放在 LLM 抽象中，这意味着：

- 模型请求失败（网络、限流、临时错误）由 LLM 层重试。
- 工具执行失败应由 Tool / Executor 转成 Observation，再交给 Agent 决策。
- 两者不要混在一层，否则会出现“重试一个不该重试的破坏性操作”。

自定义 Agent 时常见错误是把整个循环包在 try/except 里重试。这可能导致重复写入文件或重复执行命令。

## 六、Telemetry 与可观测性

Telemetry 的价值不是“打印日志”，而是让每次模型调用可被关联到：

- conversation id
- 第几轮决策
- 使用的模型
- token 用量
- 延迟与错误

OpenHands 的事件系统记录 action、observation、state update；Agent Server 提供事件查询与计数端点。把 LLM telemetry 与事件轨迹对齐，才能做成本归因与质量评估。

## 七、命名差异：必须标注“待核实”

研究时我们注意到两处官方资料中的命名差异：

- SDK README 示例使用 `Tool(name=TerminalTool.name)`，模块路径 `openhands.tools.terminal`。
- SDK 架构总览文档在流程示例中使用 `BashTool`，组件示例中出现 `FileEditor`、`GrepTool`。

这可能是不同抽象层级或版本演进造成的。本文**不把二者合并成同一个类**，也不声称它们等价。具体映射需要读取当前源码确认，标注为“待核实”。

这是源码研究的基本纪律：文档示例不等于源码契约，README 示例也不等于全部 API。

## 八、多轮推理中的上下文

LLM 每一轮看到的不是用户原始消息，而是不断增长的 history：

```text
UserMessage
Action(LLM 上一轮输出)
Observation(工具结果)
Action(LLM 本轮输出)
...
```

因此 Observation 的写法会直接影响模型决策。好的 Observation 应该：

- 包含必要输出与退出码
- 截断超长日志但保留关键错误
- 明确区分成功、可恢复失败、致命失败

## 九、常见错误

1. 把 API key 写进 repo 或事件轨迹。
2. 认为 LLM 负责执行工具。
3. 对破坏性操作做盲目 retry。
4. 把文档中的不同工具名混用，且不标注来源。

## 十、对自己开发 Agent 的启发

建议把 LLM 抽象保持窄而清晰：输入 history，输出结构化 Action 或 Final Answer。把执行、重试策略与 telemetry 放在各自层里。这样更换模型供应商时，只需替换 LLM 实现。

## 十一、本文总结

LLM 是决策器，不是执行器。它根据事件历史生成下一步 Action，由 Agent 与 Tool Executor 完成执行。Retry 与 telemetry 属于 LLM 基础设施，工具失败则通过 Observation 回到循环。

## 十二、延伸阅读

- [Agent Loop 原理](#/article/agent-core/02-agent-loop)
- [Tool System 设计](#/article/tools/01-tool-system-design)
- 官方文档：<https://docs.openhands.dev/sdk/arch/overview>
