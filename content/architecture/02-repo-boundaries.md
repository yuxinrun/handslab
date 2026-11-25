---
title: "多仓库职责边界：变更应该提到哪里"
description: "用官方 README 的边界规则为准，逐项说明 Canvas、SDK、Agent Server、TypeScript Client、Automation 与 Extensions 各自拥有什么。"
category: architecture
order: 2
updated: 2026-11-25
diagram: /diagrams/multi-repo.svg
tags: [多仓库, 边界, 贡献指南]
---

## 本文学习目标

- 面对一个功能需求，能判断它属于哪个仓库。
- 理解 OpenAPI contract 在跨仓库协作中的作用。
- 避免把扩展产物写进应用仓库。

## 一、官方规则

SDK README 用一句非常实用的话描述边界：

> Backend behavior and endpoints belong to the Python SDK or Agent Server packages; browser-compatible client access belongs to clients/typescript; UI belongs to Agent Canvas; automation lifecycle behavior belongs to automation.

Automation README 也强调：如果改动属于其他仓库，应在对应仓库提 PR，而不是在本仓库重复实现逻辑。

Extensions README 的规则类似：可复用扩展产物应放在 `OpenHands/extensions`，而不是应用仓库；PR 开错仓库会被关闭并要求移动。

## 二、边界矩阵

| 需求类型 | 所属仓库 | 典型位置 |
| --- | --- | --- |
| 新增 conversation API 端点 | `software-agent-sdk` | `openhands/agent_server/` + OpenAPI contract |
| 修改浏览器端 API 调用封装 | `software-agent-sdk` | `clients/typescript/` |
| 修改会话页面布局 | `OpenHands/OpenHands` | `src/components/`、`src/stores/` |
| 新增内置工具 | `software-agent-sdk` | `openhands/tools/` |
| 新增 Docker workspace 行为 | `software-agent-sdk` | `openhands/workspace/` |
| 新增 cron 触发器 | `automation` | `scheduler.py`、`router.py` |
| 新增可复用 skill | `extensions` | `skills/<id>/SKILL.md` + marketplace JSON |
| 新增 Canvas App | `extensions` | `apps/` |
| 新增 ACP agent 适配 | 依实现所在仓库 | 先确认 agent 实现归属 |

## 三、契约流：从后端到浏览器

Canvas README 给出一条精确链路：

```text
SDK/Agent Server → OpenAPI contract → clients/typescript → Agent Canvas
```

这意味着跨仓库改动的顺序通常是：

1. 在 SDK / Agent Server 定义行为与 endpoint。
2. 生成或更新 OpenAPI contract。
3. 在 `clients/typescript` 更新 typed client。
4. 在 Canvas 中调用新客户端方法并渲染 UI。

如果你直接在 Canvas 里手写 fetch 调用后端私有端点，就绕过了这条契约链，后续很容易漂移。

## 四、Agent Server 与 Automation 的分工

Automation README 的职责列表：

- automation definitions
- cron scheduling
- webhooks
- run history
- dispatching
- sandbox lifecycle orchestration

Agent Server / SDK 的职责：

- 执行 Agent 对话
- 管理 Agent / tool 行为
- 管理 workspaces
- 管理 events
- 拥有相关 API endpoints

一句话：**Automation 决定 when，Agent Server 决定 what/how。**

## 五、Extensions 不是“杂项仓库”

Extensions 有明确产物类型：

### Skills

```text
skills/<skill-id>/SKILL.md
skills/<skill-id>/README.md   # 可选
```

Skill 是基于 Markdown 的指南，提供领域知识和操作说明。SDK 可通过 `AgentContext(load_public_skills=True)` 加载公共 marketplace。

### Plugins

```text
plugins/<plugin-id>/SKILL.md
plugins/<plugin-id>/hooks/
plugins/<plugin-id>/scripts/
```

Plugin 在定义之外包含可执行组件：生命周期 hooks 与工具脚本。

### Apps

Apps 是基于 Canvas Extensions API v1 routed-page contract 的可安装界面。官方 README 特别提醒：启用 App 会在 Canvas 浏览器上下文执行 JavaScript，并向活跃 Agent Server 发起认证请求，因此应审查源码与 revision。

### Integrations catalog

单一数据源是 `integrations/catalog/*.json`。JS 与 Python 包读取同一份文件：

```js
import { AUTOMATION_CATALOG, INTEGRATION_CATALOG } from '@openhands/extensions';
```

```python
from openhands_extensions import list_integration_catalog_models
all_integrations = list_integration_catalog_models()
```

## 六、TypeScript Client 的边界变化

这是当前最容易出错的地方。原 `OpenHands/typescript-client` README 只说：

> The OpenHands TypeScript client has been moved to https://github.com/OpenHands/software-agent-sdk.

SDK README 明确拥有 `clients/typescript/`。因此：

- 不要在原仓库提 client 实现 PR。
- 不要把它描述成独立维护的第四方组件。
- 读代码时从 SDK 仓库的 `clients/typescript/` 开始。

## 七、决策树

```text
这个改动会改变 Agent 的决策或工具行为吗？
├─ 是 → software-agent-sdk（sdk / tools / workspace）
└─ 否
   ├─ 只是界面展示或前端状态？ → OpenHands/OpenHands
   ├─ 只是 API 客户端封装？ → software-agent-sdk / clients/typescript
   ├─ 是定时、webhook、运行历史、派发？ → automation
   └─ 是可复用的 skill/plugin/app/catalog？ → extensions
```

这是根据官方边界归纳的教学决策树，不是官方流程图。

## 八、常见错误

1. 在 Canvas 中重复实现 Agent 行为。
2. 在 Automation 中实现 conversation 执行逻辑。
3. 把 skill 写进 SDK 核心代码。
4. 在原 typescript-client 仓库寻找最新 API 实现。
5. 认为 catalog 有 JS 和 Python 两份独立数据。实际是单一数据源。

## 九、对自己开发 Agent 的启发

多仓库边界的本质是**按变化原因分离模块**：

- UI 因产品体验变化。
- SDK 因 Agent 能力变化。
- Server 因部署与多用户变化。
- Automation 因调度策略变化。
- Extensions 因领域知识变化。

如果你在单体项目里开发 Agent，也可以借鉴这种分层，用包/目录边界模拟仓库边界。关键是让“改一个原因”只影响一个模块。

## 十、本文总结

OpenHands 的贡献规则不是形式主义，而是架构边界的治理手段。理解边界，才能正确读源码、提 PR，也才能在设计自己的系统时避免耦合。

## 十一、延伸阅读

- [OpenHands 多仓库项目结构](#/article/getting-started/06-multi-repo)
- [Agent Canvas 架构](#/article/architecture/03-agent-canvas)
- 官方 AGENTS.md：<https://github.com/OpenHands/OpenHands/blob/main/AGENTS.md>
