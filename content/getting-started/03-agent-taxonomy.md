---
title: "AI Agent、Coding Agent 与 Software Engineering Agent 的区别"
description: "用可操作的边界定义区分三类概念：Agent 的自主循环、Coding Agent 的代码执行闭环，以及 Software Engineering Agent 的工程任务闭环。"
category: getting-started
order: 3
updated: 2026-11-25
diagram: /diagrams/coding-agent-flow.svg
tags: [Agent, Coding Agent, SWE Agent, 概念辨析]
---

## 本文学习目标

- 给出三个术语的清晰边界，而不是互相替换使用。
- 理解“能写代码”和“能完成工程任务”的差别。
- 知道 OpenHands 当前官方定位落在不同术语的哪个位置。

## 一、为什么术语会混乱

产品宣传常把 IDE 补全、对话式编程助手、自主 Agent 都叫作“AI Agent”。但从系统架构看，它们的循环边界完全不同：

- IDE 补全是**单次推理**：输入光标上下文，输出补全文本。
- 对话式助手是**多轮问答**：人决定下一步，模型只回答。
- Agent 是**自主循环**：模型决定下一步动作，环境返回观察，循环继续。

区分的关键不是模型大小，而是**谁决定下一步**以及**系统是否有执行工具**。

## 二、AI Agent：自主循环是核心

一个最小 Agent 至少包含三件事：

1. 目标（用户任务）
2. 决策器（LLM）
3. 行动通道（工具 / API / 环境）

用教学伪代码表示：

```text
history = [user_task]
while not finished and steps < MAX_STEPS:
    action = LLM.decide(history)     # 决策器决定下一步
    observation = execute(action)    # 环境执行并返回结果
    history.append(action)
    history.append(observation)
return summarize(history)
```

说明了这是**教学伪代码**，不是任何官方源码。

**边界**：只要系统能自主选择并执行动作，就可以称为 Agent。它未必与代码有关。

## 三、Coding Agent：把闭环落到代码与命令

Coding Agent 在通用 Agent 之上增加了两个约束：

- 行动空间围绕代码工件：读取、编辑、搜索、运行命令。
- 观察结果来自真实开发环境：文件内容、测试输出、编译错误。

因此一个 Coding Agent 的最小工具集通常是：

| 工具 | 作用 | 典型观察 |
| --- | --- | --- |
| `read_file` | 读取文件 | 文件内容或错误 |
| `write_file` / `edit` | 修改文件 | 成功 / 失败 |
| `grep` / `search` | 定位代码 | 匹配列表 |
| `execute_command` | 运行测试、构建、git | stdout / stderr / exit code |

OpenHands SDK README 的官方示例中，`TerminalTool`、`FileEditorTool`、`TaskTrackerTool` 正是这类工具的代表。

## 四、Software Engineering Agent：闭环扩展到工程流程

Software Engineering Agent（SWE Agent）比 Coding Agent 多一层：它不只是改代码，而是完成一项工程任务。

工程任务通常具有：

- 明确的输入来源：Issue、PR 评论、工单、Slack 消息。
- 可验证的完成标准：测试通过、CI 绿灯、PR 合并。
- 协作与流程：代码审查、运行历史、成本与 Token 监控。
- 长生命周期：暂停、恢复、失败重试、定时触发。

对照 OpenHands 当前多仓库架构：

| 工程能力 | OpenHands 对应组件 |
| --- | --- |
| 从 Issue 触发 | Automation（webhook / cron） |
| 获取任务上下文 | Agent Canvas / 自定义客户端 |
| 修改代码并跑测试 | SDK Agent + Tools + Workspace |
| 记录过程 | Events / Conversation 持久化 |
| 产出 PR 与运行报告 | Extensions 中的 skills / 自动化 |
| 多用户与远程执行 | Agent Server |

因此可以说：**OpenHands 的目标不是只做一个 Coding Agent，而是提供构建 SWE Agent 的基础设施。**

## 五、三者对照表

| 维度 | AI Agent | Coding Agent | Software Engineering Agent |
| --- | --- | --- | --- |
| 核心循环 | 决策—行动—观察 | 读写代码—运行—修复 | 任务—实现—验证—协作 |
| 行动空间 | 任意工具 | 文件与命令 | 代码 + 流程 + 外部系统 |
| 完成标准 | 模型表达完成 | 测试通过 / 代码可运行 | CI / Review / 交付 |
| 典型风险 | 错误行动 | 破坏文件、危险命令 | 权限、多租户、成本、审计 |
| 关键基础设施 | 事件与工具契约 | Workspace 与 Sandbox | Server、Automation、评估 |

## 六、与常见产品的关系

- **Cursor / Aider / Cline / OpenCode**：形态上更接近开发者本地的 Coding Agent 或 IDE 集成助手。
- **Devin**：常被作为自主 SWE Agent 的产品代表。
- **OpenHands**：当前既有面向用户的 Agent Canvas，也有可组合 SDK 与 Agent Server，定位更偏“平台与基础设施”。

这里不评价产品优劣，因为各自目标不同。学习架构时，关键是看它把哪些能力做成可替换组件。

## 七、常见错误

1. 把“支持多轮对话”当成 Agent。多轮对话仍可能由人决定每一步。
2. 把“能跑测试”当成 SWE Agent。缺少任务接入、流程与可观测性时，它仍是 Coding Agent。
3. 把 OpenHands Canvas 当成完整 SWE Agent 本身。Canvas 是控制台，能力来自 SDK、Server 与 Automation 的组合。

## 八、对自己开发 Agent 的启发

建议先明确你要解决的是哪一层问题：

- 只想自动化一段脚本：通用 Agent + 少量工具即可。
- 想让 Agent 修 bug：必须具备 Workspace 与测试工具。
- 想让 Agent 参与团队流程：必须补事件持久化、鉴权、调度与评估。

不要跳过层级。很多项目失败不是因为模型不够强，而是因为把第三层的需求用第一层的架构硬扛。

## 九、本文总结

术语差异对应的是系统边界差异。OpenHands 当前架构的价值在于：它把 SWE Agent 所需的执行、服务、调度与扩展能力拆成可组合模块，让开发者可以按层构建。

## 十、延伸阅读

- [OpenHands 解决什么问题？](#/article/getting-started/02-why-openhands)
- [OpenHands 与主流 Agent 产品对比](#/article/getting-started/05-comparison)
- [Agent Loop 原理](#/article/agent-core/02-agent-loop)
