---
title: "Tool System 设计"
description: "拆解 OpenHands SDK 的工具抽象：Action、Observation、Tool、Executor、注册与发现、参数 Schema、权限与 MCP 集成。"
category: tools
order: 1
updated: 2026-11-25
diagram: /diagrams/tool-system.svg
tags: [Tool System, Executor, MCP, Schema, 权限]
---

## 本文学习目标

- 说明 Tool System 的四类核心抽象。
- 理解工具注册、Schema 与执行时校验的关系。
- 区分内置工具、自定义工具与 MCP 工具。

## 一、Tool System 在 SDK 中的位置

官方 SDK 架构文档把 Tool System 定义为：

> Typed base classes for Action, Observation, Tool, Executor, including MCP integration.

同时说明：

- 预置工具由 `openhands.tools` 提供，例如 bash、文件编辑。
- 所有工具遵循 Action / Observation / Executor 模式。
- 内置 validation、error handling、security。
- 工具与 agent 运行在 workspace 配置的环境中：local、container 或 remote。
- 工具不是在 workspace APIs 中“通过 API 执行”，而是在 agent 所在环境中 alongside 运行。

## 二、四类抽象

| 抽象 | 职责 | 类比 |
| --- | --- | --- |
| `Action` | 描述要做什么 | 函数调用请求 |
| `Observation` | 描述发生了什么 | 函数调用结果 |
| `Tool` | 描述工具能力、名称与 Schema | 函数签名 |
| `Executor` | 校验并执行 Action | 函数调用运行时 |

这四者把“模型想做什么”和“系统实际做什么”分开。模型只产出 Action，Executor 才接触真实环境。

## 三、注册与发现

官方 Quick Start 示例展示了注册方式：

```python
from openhands.tools.file_editor import FileEditorTool
from openhands.tools.task_tracker import TaskTrackerTool
from openhands.tools.terminal import TerminalTool

agent = Agent(
    llm=llm,
    tools=[
        Tool(name=TerminalTool.name),
        Tool(name=FileEditorTool.name),
        Tool(name=TaskTrackerTool.name),
    ],
)
```

要点：

- 工具通过 `Tool(name=...)` 加入 Agent。
- Agent Server 提供 `GET /api/tools/` 列出可用工具。
- 工具能力会进入模型可见的上下文，让模型知道可以调用什么。

> 架构文档中出现 `BashTool`、`FileEditor`、`GrepTool`，README 示例使用 `TerminalTool.name`。命名映射待核实源码，本文不混写。

## 四、参数与 Schema

Schema 是模型输出与执行器之间的契约。它至少解决：

1. 参数类型是否正确
2. 必填字段是否齐全
3. 危险参数是否需要确认
4. 工具描述如何呈现给模型

教学 JSON Schema 示例：

```json
{
  "name": "read_file",
  "description": "读取工作目录内的文本文件",
  "parameters": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "相对路径" }
    },
    "required": ["path"],
    "additionalProperties": false
  }
}
```

这是教学示例，不是官方内置工具的完整 schema。

## 五、执行流程

```text
LLM 生成 Action
  → Tool Executor 接收
  → Schema 校验
  → Security 风险评估
  → Workspace 环境执行
  → 生成 Observation
  → 写入事件
```

官方 SDK 文档提到 Security 负责 action risk assessment 与 execution前 validation。因此安全检查发生在执行之前。

Agent Server 还提供了与确认相关的端点：

- `POST /api/conversations/{id}/events/respond_to_confirmation`
- `POST /api/conversations/{id}/confirmation_policy`

这说明人工审批是服务端可配置能力，而不是工具内部硬编码。

## 六、内置工具分类

根据官方资料可确认的类别：

| 类别 | 代表 | 来源 |
| --- | --- | --- |
| 终端/命令 | `TerminalTool` / 文档中的 `BashTool` | SDK README / 架构文档 |
| 文件编辑 | `FileEditorTool` / 文档中的 `FileEditor` | SDK README / 架构文档 |
| 任务跟踪 | `TaskTrackerTool` | SDK README |
| 搜索 | 文档中的 `GrepTool` | SDK 架构文档 |
| MCP | MCP integration | SDK 架构文档 |

具体类名以源码为准；本文只列官方资料明确出现过的名称。

## 七、MCP 集成

官方架构文档明确 Tool System 包含 MCP integration。MCP（Model Context Protocol）让外部工具服务以标准协议暴露能力。

需要强调的是：MCP 工具仍然要落入 Action / Observation / Executor 契约，否则事件系统与权限系统无法统一处理。

本文不臆测 OpenHands 当前 MCP 的具体配置字段或传输实现，标注“待核实源码”。

## 八、工具错误处理

好的工具错误应包含：

- 失败阶段（校验 / 权限 / 执行 / 超时）
- 原始输出片段
- 是否可恢复
- 建议的下一步

错误处理方式见 [Action / Observation 模型](#/article/agent-core/04-action-observation)。

## 九、工具权限控制

工具权限不是单一开关，而是多层：

1. **Agent 层**：只注册必要工具。
2. **Tool 层**：Schema 限制参数。
3. **Security 层**：执行前风险评估。
4. **Workspace 层**：目录与网络隔离。
5. **Server 层**：API key、确认策略、多用户隔离。

这正好对应 OpenHands 的多层架构。任何一层缺失都会放大风险。

## 十、常见错误

1. 让模型直接执行任意字符串命令而没有 Schema。
2. 把工具实现写在 Canvas 前端。
3. 把工具错误吞掉，不返回 Observation。
4. 把 MCP 工具当成完全可信来源。
5. 不限制工具输出长度，导致上下文爆炸。

## 十一、设计取舍与启发

自研 Tool System 时，优先做这三件事：

- 统一 Action / Observation 类型
- 把校验与执行分开
- 让每个工具调用产生事件

功能数量可以后续增加，但契约一旦混乱，后面很难补救。

## 十二、本文总结

Tool System 是 Agent 的行动层。它用类型化契约连接模型决策与真实环境，并用校验、安全、事件三层机制保证行动可控。

## 十三、延伸阅读

- [自定义工具开发](#/article/tools/09-custom-tools)
- [Workspace 抽象](#/article/workspace/01-why-workspace)
- 官方文档：<https://docs.openhands.dev/sdk/guides/hello-world>
