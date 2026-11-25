---
title: "OpenHands 最值得学习的架构设计"
description: "从 Agent/Runtime 解耦、Event System、Workspace 抽象、Agent Server 与多仓库治理中提炼可迁移的 Agent Framework 设计原则。"
category: research
order: 1
updated: 2026-11-25
diagram: /diagrams/overall-architecture.svg
tags: [架构思想, 设计取舍, Agent Framework, 总结]
---

## 本文学习目标

- 提炼 OpenHands 架构中可迁移的设计原则。
- 理解每个原则解决的具体工程问题。
- 形成自己的 Agent Framework 设计清单。

## 一、原则 1：把 Agent 行为与执行位置解耦

OpenHands 的核心结论是：同一份 agent 代码可以通过替换 workspace 在 local、Docker、remote 之间切换。

这背后的设计是：

- Agent 只关心决策与工具调用
- Workspace 关心文件、命令与环境
- Tool 在 workspace 配置的环境中执行

**可迁移做法**：先定义环境无关的 Workspace 接口，再写工具。不要让工具直接依赖 `process.cwd()` 或全局路径。

## 二、原则 2：事件是主干，不是日志

SDK 把 Events 作为核心组件，覆盖 action、observation、user messages、state update。Agent Server 提供事件查询与推送，Canvas 用事件更新 UI。

**可迁移做法**：任何会改变系统状态的事情都应产生事件。事件既推送也持久化，这样 UI、恢复、审计和评估都能共用同一份数据。

## 三、原则 3：契约先行，API 驱动客户端

官方链路是：

```text
SDK/Agent Server → OpenAPI contract → clients/typescript → Agent Canvas
```

**可迁移做法**：先固定后端 API 契约，再生成或手写客户端，最后做 UI。避免前端散落私有 fetch 调用。

## 四、原则 4：把“何时运行”与“运行什么”分开

Automation 负责 cron、webhook、run history、dispatching；Agent Server 负责执行 conversation。

**可迁移做法**：调度器不应知道 Agent 内部实现；执行器不应知道 cron 表达式。两者通过任务定义和 id 连接。

## 五、原则 5：扩展性通过注册表而非核心分支

Extensions 用 skills/plugins/apps 和可复用 catalog 承载领域能力。SDK 可通过 `AgentContext(load_public_skills=True)` 加载公共 marketplace。

**可迁移做法**：把领域知识做成 Markdown 指南或独立包，而不是在核心 agent 里堆 if-else。

## 六、原则 6：控制中心不持有执行权限

Canvas 明确不执行 Agent 动作、不提供 sandbox/workspace 隔离、不在配置好的后端之外托管 credentials。

**可迁移做法**：前端只发命令、收事件。所有高风险操作在服务端完成，并可鉴权、可审计。

## 七、原则 7：安全靠边界，不靠提示词

OpenHands 的安全来自多层：

- workspace 挂载范围
- 容器 uid 与隔离
- API key 鉴权
- secret 加密
- confirmation policy
- 事件审计

**可迁移做法**：把模型视为不可信决策者。任何决策在执行前都经过校验与授权。

## 八、与其他设计的比较

### 与 LangGraph 的思路差异

LangGraph 更偏向用图结构显式编排状态机与节点。OpenHands SDK 则以 Agent Loop 为核心，把循环、工具与事件做成运行时抽象。两者都在解决“多步推理”，但抽象重心不同：一个偏流程编排，一个偏 Agent 运行时。

本文不深入 LangGraph 源码，仅作架构思路层面的比较。

### 与 Pi / OpenCode 的关系

Agent Canvas 可接入 Pi、OpenCode 与 ACP agents。这说明 OpenHands 把控制中心与 agent 实现解耦，其他 agent 可以作为后端被接入。

### 与单仓库 Agent 框架的差异

单仓库框架更容易上手，但当需要多客户端、多后端、多用户与自动化时，容易出现模块耦合。OpenHands 用多仓库把边界固定下来。

## 九、Coding Agent 的未来架构趋势

基于当前架构可观察到几个方向：

1. **Agent 运行时标准化**：SDK 与 ACP 让不同 agent 能被同一控制台调度。
2. **执行环境即服务**：workspace 从“目录”变成“可编排的隔离环境”。
3. **自动化与可观测性融合**：run history 与事件轨迹连接成端到端链路。
4. **扩展生态外置**：skills/plugins 成为可共享资产，而非核心代码。
5. **评估成为一等能力**：成本、token、成功率会像 CI 指标一样被持续跟踪。

这些趋势是从当前官方架构推导的判断，不是官方路线图。

## 十、如何构建自己的 Agent Framework

建议按顺序实现：

```text
1. Action / Observation 类型
2. Agent Loop + 终止条件
3. Workspace 接口 + 本地实现
4. 工具 Executor + Schema 校验
5. 事件系统（推送 + 持久化）
6. HTTP/WebSocket Server + 鉴权
7. Docker / Remote Workspace
8. 调度与运行历史
9. Skills / Plugins 扩展机制
10. 评估与成本监控
```

每前进一步，都应先问：这一步解决的是哪个具体工程问题？

## 十一、常见错误

1. 先做漂亮 UI，后补执行边界。
2. 把 prompt 当安全机制。
3. 事件只用于日志，不用于恢复。
4. 扩展机制直接写进核心类。
5. 忽略多租户与成本控制。

## 十二、本文总结

OpenHands 最值得学习的不是某个类名，而是边界设计：行为与执行解耦、事件作为主干、契约驱动客户端、调度与执行分离、扩展外置、安全靠基础设施。

## 十三、延伸阅读

- [当前整体架构](#/article/architecture/01-overall-architecture)
- [多仓库职责边界](#/article/architecture/02-repo-boundaries)
- [Event System](#/article/events/05-event-system)
- [学习路线](#/learning-path)
