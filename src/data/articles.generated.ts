// 本文件由 scripts/generate-manifest.mjs 自动生成，请勿手动编辑。
export interface ArticleMeta {
  id: string;
  path: string;
  title: string;
  description: string;
  category: string;
  order: number;
  updated: string;
  diagram: string;
  tags: string[];
  readingTime: number;
  excerpt: string;
}

export const articles: ArticleMeta[] = [
  {
    "id": "agent-core/02-agent-loop",
    "path": "/content/agent-core/02-agent-loop.md",
    "title": "Agent Loop 原理",
    "description": "拆解 reasoning-action loop 的循环结构、终止条件、失败重试、上下文管理与长任务控制，并给出可运行的教学伪代码。",
    "category": "agent-core",
    "order": 2,
    "updated": "2026-11-25",
    "diagram": "/diagrams/agent-loop.svg",
    "tags": [
      "Agent Loop",
      "LLM",
      "推理循环",
      "状态管理"
    ],
    "readingTime": 8,
    "excerpt": "本文学习目标 写出一个最小 Agent Loop 的伪代码。 说明终止条件、失败重试与 token 管理分别在哪一层解决。 理解为什么循环是 Agent 系统的主干。 一、背景：一次决策不够 LLM 单次调用只能根据当前上下文给出文本。要让模型完成“读仓库 → 修改 → 跑测试 → 修错”这样的任务，必须让它反复： 1. 观察当前状态 2. 决定下一步动作 3. 执行动作 4. 获得结果 5. 再决策 这就是 reasoning action loop。官方 SDK 架构文档"
  },
  {
    "id": "agent-core/03-llm-and-tool-calling",
    "path": "/content/agent-core/03-llm-and-tool-calling.md",
    "title": "LLM 推理与工具调用",
    "description": "从 SDK 的 LLM 抽象出发，解释模型如何参与决策、工具调用如何在循环中被选择，以及 retry、telemetry 与命名差异的核验边界。",
    "category": "agent-core",
    "order": 3,
    "updated": "2026-11-25",
    "diagram": "/diagrams/action-observation.svg",
    "tags": [
      "LLM",
      "Tool Calling",
      "推理",
      "telemetry"
    ],
    "readingTime": 6,
    "excerpt": "本文学习目标 说明 LLM 在 SDK 中的职责边界。 理解工具调用是决策结果，而不是模型直接执行。 知道哪些命名差异需要以源码为准。 一、LLM 在 SDK 中的定位 官方 SDK 架构文档定义 LLM ： Provider agnostic language model interface, with retry and telemetry. 关键词有三个： 1. Provider agnostic ：不绑定某一家模型供应商。 2. Retry ：网络或限流失败时具备重试"
  },
  {
    "id": "agent-core/04-action-observation",
    "path": "/content/agent-core/04-action-observation.md",
    "title": "Action / Observation 模型",
    "description": "深入工具调用的结构化输入输出契约：为什么需要强类型 Action 与 Observation、错误如何回流、以及它对安全与可观测性的影响。",
    "category": "agent-core",
    "order": 4,
    "updated": "2026-11-25",
    "diagram": "/diagrams/action-observation.svg",
    "tags": [
      "Action",
      "Observation",
      "Tool System",
      "契约"
    ],
    "readingTime": 6,
    "excerpt": "本文学习目标 说明 Action / Observation 在 Agent 循环中的数据契约作用。 设计一个可校验、可记录、可回放的工具结果结构。 理解错误为什么不应以裸字符串处理。 一、为什么需要契约 如果工具调用只是字符串，例如 \"rm rf ...\" ，系统会失去三样东西： 1. 执行前的参数校验 2. 执行后的结构化结果 3. 事件流中的可回放记录 OpenHands SDK 的 Tool System 定义了 Action 、 Observation 、 Tool"
  },
  {
    "id": "architecture/01-overall-architecture",
    "path": "/content/architecture/01-overall-architecture.md",
    "title": "OpenHands 当前整体架构",
    "description": "以官方多仓库文档为依据，拆解 Agent Canvas、Agent Server、SDK、Workspace、Automation 与 Extensions 的分层关系和一次任务的数据流。",
    "category": "architecture",
    "order": 1,
    "updated": "2026-11-25",
    "diagram": "/diagrams/overall-architecture.svg",
    "tags": [
      "架构",
      "多仓库",
      "Agent Server",
      "SDK"
    ],
    "readingTime": 9,
    "excerpt": "本文学习目标 画出 OpenHands 当前的分层架构。 说清每一层的输入、输出与不负责什么。 理解前后端状态同步与服务发现的关键机制。 一、整体分层 从官方资料可以归纳出五层： 其中调度层与扩展层是横向能力，不严格属于单次任务调用链，但会影响任务如何被触发与增强。 二、交互层：Agent Canvas 的边界 官方 docs/architecture.md 明确列出 Canvas 负责 ： 渲染会话、终端、浏览器、文件、设置与自动化 UI 管理会话状态、后端选择、设置、pr"
  },
  {
    "id": "architecture/02-repo-boundaries",
    "path": "/content/architecture/02-repo-boundaries.md",
    "title": "多仓库职责边界：变更应该提到哪里",
    "description": "用官方 README 的边界规则为准，逐项说明 Canvas、SDK、Agent Server、TypeScript Client、Automation 与 Extensions 各自拥有什么。",
    "category": "architecture",
    "order": 2,
    "updated": "2026-11-25",
    "diagram": "/diagrams/multi-repo.svg",
    "tags": [
      "多仓库",
      "边界",
      "贡献指南"
    ],
    "readingTime": 7,
    "excerpt": "本文学习目标 面对一个功能需求，能判断它属于哪个仓库。 理解 OpenAPI contract 在跨仓库协作中的作用。 避免把扩展产物写进应用仓库。 一、官方规则 SDK README 用一句非常实用的话描述边界： Backend behavior and endpoints belong to the Python SDK or Agent Server packages; browser compatible client access belongs to client"
  },
  {
    "id": "architecture/03-agent-canvas",
    "path": "/content/architecture/03-agent-canvas.md",
    "title": "Agent Canvas 架构",
    "description": "拆解 Agent Canvas 的前端结构、状态管理、API 适配器、多后端切换与本地栈启动模式，明确它不负责执行 Agent。",
    "category": "architecture",
    "order": 3,
    "updated": "2026-11-25",
    "diagram": "/diagrams/agent-canvas.svg",
    "tags": [
      "Agent Canvas",
      "React",
      "TypeScript",
      "前端架构"
    ],
    "readingTime": 7,
    "excerpt": "本文学习目标 理解 Agent Canvas 的系统边界与目录结构。 说明前端如何连接多个 Agent Server。 区分独立应用构建与 library 嵌入构建。 一、定位 OpenHands/OpenHands 仓库当前就是 Agent Canvas。官方 README 称它是： The self hosted developer control center for coding agents and automations. 它可以运行 OpenHands、Clau"
  },
  {
    "id": "architecture/04-software-agent-sdk",
    "path": "/content/architecture/04-software-agent-sdk.md",
    "title": "Software Agent SDK 架构",
    "description": "从四个 Python 包、核心组件、执行流程到部署模式，系统讲解 OpenHands Software Agent SDK 的设计。",
    "category": "architecture",
    "order": 4,
    "updated": "2026-11-25",
    "diagram": "/diagrams/tool-system.svg",
    "tags": [
      "SDK",
      "Agent",
      "Conversation",
      "LLM",
      "Tool System"
    ],
    "readingTime": 8,
    "excerpt": "本文学习目标 记住 SDK 的四个 Python 包与各自职责。 理解核心组件之间的关系。 能解释同一份 Agent 代码如何在不同 workspace 模式中运行。 一、定位 官方架构文档说 SDK 提供统一、类型安全的框架，用于构建和部署 AI agents，关注： statelessness composability clear boundaries 并且明确： The SDK is the source of truth for agents in OpenHand"
  },
  {
    "id": "architecture/05-agent-server-architecture",
    "path": "/content/architecture/05-agent-server-architecture.md",
    "title": "Agent Server 架构",
    "description": "讲解 openhands-agent-server 的设计目标、API 分组、鉴权模型、会话生命周期与部署要求。",
    "category": "architecture",
    "order": 5,
    "updated": "2026-11-25",
    "diagram": "/diagrams/agent-server.svg",
    "tags": [
      "Agent Server",
      "FastAPI",
      "REST",
      "WebSocket",
      "鉴权"
    ],
    "readingTime": 9,
    "excerpt": "本文学习目标 说明 Agent Server 在 OpenHands 中的工程价值。 记住主要 API 分组与鉴权变量。 能列出安全的部署检查项。 一、设计目标 官方 docs.openhands.dev/sdk/arch/agent server 说明： openhands agent server 把 Software Agent SDK 运行在 HTTP 与 WebSocket API 后面。 使用场景：当另一个服务（例如 Agent Canvas backend）需要"
  },
  {
    "id": "architecture/09-task-sequence",
    "path": "/content/architecture/09-task-sequence.md",
    "title": "一次完整任务的时序图",
    "description": "用时序视角串联 Agent Canvas、TypeScript Client、Agent Server、SDK、LLM、Tool 与 Workspace，并标出每一步产生的事件。",
    "category": "architecture",
    "order": 9,
    "updated": "2026-11-25",
    "diagram": "/diagrams/event-stream.svg",
    "tags": [
      "时序图",
      "事件流",
      "Conversation",
      "架构"
    ],
    "readingTime": 8,
    "excerpt": "本文学习目标 能按时间顺序讲出一次任务经过的所有组件。 知道 REST 与 WebSocket 在时序中的不同角色。 理解事件持久化与实时推送的关系。 一、参与方 一次典型任务涉及六个参与方： 参与方 所属仓库/系统 主要动作 用户 — 提交任务 Agent Canvas OpenHands/OpenHands 渲染 UI、发起 API 调用 TypeScript Client software agent sdk/clients/typescript typed brows"
  },
  {
    "id": "automation/01-automation-architecture",
    "path": "/content/automation/01-automation-architecture.md",
    "title": "Automation 架构：让 Agent 按计划工作",
    "description": "拆解 OpenHands Automation 服务的职责、核心文件、cron 与 webhook 触发、派发、运行历史与沙箱生命周期编排。",
    "category": "automation",
    "order": 1,
    "updated": "2026-11-25",
    "diagram": "/diagrams/automation-workflow.svg",
    "tags": [
      "Automation",
      "cron",
      "webhook",
      "dispatcher",
      "调度"
    ],
    "readingTime": 6,
    "excerpt": "本文学习目标 理解 Automation 在 OpenHands 中的定位。 说出 scheduler、dispatcher、run history 各自职责。 设计一个简单的自动化任务链路。 版本提示 ：官方 README 标注该项目处于 Beta ，API 与功能可能无通知变更。 一、定位 OpenHands/automation 是 OpenHands Cloud 的自动化服务。它负责： 创建自动化任务 按 cron 计划运行 通过 webhook 事件触发（如 Git"
  },
  {
    "id": "canvas/01-what-is-agent-canvas",
    "path": "/content/canvas/01-what-is-agent-canvas.md",
    "title": "Agent Canvas 是什么？",
    "description": "从用户视角解释 Agent Canvas：自托管控制中心、多 agent 支持、多后端切换与自动化入口，并说明它与 SDK 的边界。",
    "category": "canvas",
    "order": 1,
    "updated": "2026-11-25",
    "diagram": "/diagrams/agent-canvas.svg",
    "tags": [
      "Agent Canvas",
      "控制中心",
      "ACP",
      "自托管"
    ],
    "readingTime": 6,
    "excerpt": "本文学习目标 说清 Agent Canvas 是什么、不是什么。 理解它可以接入哪些 agent 与 backend。 知道本地、远程、云端模式的入口差异。 一、定义 Agent Canvas 是当前 OpenHands/OpenHands 仓库的主体。官方 README 的标题和副标题直接给出定义： AGENT CANVAS — The self hosted developer control center for coding agents and automation"
  },
  {
    "id": "conversation/01-conversation-design",
    "path": "/content/conversation/01-conversation-design.md",
    "title": "Conversation 设计与会话生命周期",
    "description": "理解 Conversation 如何持有 Agent 与 Workspace、管理状态与事件历史，以及暂停/恢复、持久化与任务上下文的组织方式。",
    "category": "conversation",
    "order": 1,
    "updated": "2026-11-25",
    "diagram": "/diagrams/conversation-lifecycle.svg",
    "tags": [
      "Conversation",
      "生命周期",
      "状态管理",
      "持久化"
    ],
    "readingTime": 6,
    "excerpt": "本文学习目标 说明 Conversation 在 SDK 中的职责。 理解会话状态、事件历史与任务上下文的关系。 知道暂停/恢复为何依赖持久化。 一、定位 官方 SDK 架构文档定义 Conversation ： Manages conversation state and lifecycle. 在 Quick Start 示例中，Conversation 把 Agent 与 Workspace 绑定在一起： 这说明 Conversation 是运行期的“会话容器”：它知道用"
  },
  {
    "id": "events/05-event-system",
    "path": "/content/events/05-event-system.md",
    "title": "Event System：Agent 系统的主干数据结构",
    "description": "从类型化事件、事件流、实时状态更新、持久化与调试角度，解释为什么 Events 是 OpenHands SDK 的核心组件。",
    "category": "events",
    "order": 5,
    "updated": "2026-11-25",
    "diagram": "/diagrams/event-stream.svg",
    "tags": [
      "Event System",
      "事件流",
      "WebSocket",
      "可观测性"
    ],
    "readingTime": 5,
    "excerpt": "本文学习目标 说明 Events 在 SDK 中的职责。 理解事件既用于 UI 实时更新，也用于持久化与回放。 能区分事件、日志与轨迹。 一、Events 在 SDK 中的定位 官方 SDK 架构文档把 Events 列为核心组件： Typed event framework for action, observation, user messages, state update. 这四个类别覆盖了 Agent 循环的全部重要时刻： 用户说了什么 模型决定做什么 工具返回了什"
  },
  {
    "id": "getting-started/01-what-is-openhands",
    "path": "/content/getting-started/01-what-is-openhands.md",
    "title": "OpenHands 是什么？",
    "description": "从当前官方仓库出发，重新定义 OpenHands：它不再是单一 Python 项目，而是由 Agent Canvas、Software Agent SDK、Agent Server、Automation 与 Extensions 组成的多仓库系统。",
    "category": "getting-started",
    "order": 1,
    "updated": "2026-11-25",
    "diagram": "/diagrams/multi-repo.svg",
    "tags": [
      "OpenHands",
      "Agent Canvas",
      "SDK",
      "多仓库"
    ],
    "readingTime": 12,
    "excerpt": "本文学习目标 说清当前 OpenHands 的官方定位，而不是停留在旧版“OpenHands Runtime”的印象。 区分 Agent Canvas、Software Agent SDK、Agent Server、Automation 与 Extensions 的职责。 知道应该到哪个官方仓库寻找某类问题的答案。 研究快照 ：2026 11 25。本文基于官方 README、 docs/architecture.md 、 docs.openhands.dev/sdk/arc"
  },
  {
    "id": "getting-started/02-why-openhands",
    "path": "/content/getting-started/02-why-openhands.md",
    "title": "OpenHands 解决什么问题？",
    "description": "从工程视角拆解 Coding Agent 面临的上下文、执行、隔离、可观测性与调度问题，并对照 OpenHands 当前架构中的对应组件。",
    "category": "getting-started",
    "order": 2,
    "updated": "2026-11-25",
    "diagram": "/diagrams/coding-agent-flow.svg",
    "tags": [
      "Coding Agent",
      "工程架构",
      "问题定义"
    ],
    "readingTime": 7,
    "excerpt": "本文学习目标 理解“让 LLM 改代码”与“让 Agent 完成工程任务”之间的差距。 把工程问题映射到 OpenHands 的具体组件。 建立后续学习的问题清单，而不是只记组件名称。 一、背景：Demo 与生产之间的鸿沟 一个能跑的 Agent Demo 通常只需要：把仓库内容拼进 prompt，调用模型，解析返回的代码片段。但真实工程任务会立刻遇到以下问题： 1. 上下文太大，无法一次性塞进模型。 2. 模型需要反复读取、修改、运行、失败、再修改。 3. 命令执行有风险，"
  },
  {
    "id": "getting-started/03-agent-taxonomy",
    "path": "/content/getting-started/03-agent-taxonomy.md",
    "title": "AI Agent、Coding Agent 与 Software Engineering Agent 的区别",
    "description": "用可操作的边界定义区分三类概念：Agent 的自主循环、Coding Agent 的代码执行闭环，以及 Software Engineering Agent 的工程任务闭环。",
    "category": "getting-started",
    "order": 3,
    "updated": "2026-11-25",
    "diagram": "/diagrams/coding-agent-flow.svg",
    "tags": [
      "Agent",
      "Coding Agent",
      "SWE Agent",
      "概念辨析"
    ],
    "readingTime": 6,
    "excerpt": "本文学习目标 给出三个术语的清晰边界，而不是互相替换使用。 理解“能写代码”和“能完成工程任务”的差别。 知道 OpenHands 当前官方定位落在不同术语的哪个位置。 一、为什么术语会混乱 产品宣传常把 IDE 补全、对话式编程助手、自主 Agent 都叫作“AI Agent”。但从系统架构看，它们的循环边界完全不同： IDE 补全是 单次推理 ：输入光标上下文，输出补全文本。 对话式助手是 多轮问答 ：人决定下一步，模型只回答。 Agent 是 自主循环 ：模型决定下一步"
  },
  {
    "id": "getting-started/05-comparison",
    "path": "/content/getting-started/05-comparison.md",
    "title": "OpenHands 与 Cursor、Cline、Aider、OpenCode、Devin 对比",
    "description": "从架构视角比较主流 Coding Agent：交互入口、执行边界、扩展机制、服务化能力与调度能力，避免只比较功能表。",
    "category": "getting-started",
    "order": 5,
    "updated": "2026-11-25",
    "diagram": "/diagrams/overall-architecture.svg",
    "tags": [
      "对比",
      "Cursor",
      "Cline",
      "Aider",
      "OpenCode",
      "Devin"
    ],
    "readingTime": 5,
    "excerpt": "本文学习目标 用统一的架构维度比较不同 Agent 产品。 理解 OpenHands 与其他产品的根本差异在哪一层。 明确哪些结论可核验、哪些属于产品层面的公开认知。 核验说明 ：本文对 OpenHands 的描述基于 2026 11 25 官方仓库与文档。对其他产品的描述属于公开产品形态层面的概括，不作为源码级证据；具体版本能力请以各自官方文档为准。 一、比较维度 只看“能不能改代码”没有意义。建议使用六个维度： 1. 交互入口：IDE 插件、CLI、Web 控制台。 2."
  },
  {
    "id": "getting-started/06-multi-repo",
    "path": "/content/getting-started/06-multi-repo.md",
    "title": "OpenHands 多仓库项目结构",
    "description": "逐仓库拆解目录结构与职责边界，记录研究时的 commit SHA，并给出正确的源码阅读顺序。",
    "category": "getting-started",
    "order": 6,
    "updated": "2026-11-25",
    "diagram": "/diagrams/multi-repo.svg",
    "tags": [
      "多仓库",
      "源码阅读",
      "Commit"
    ],
    "readingTime": 10,
    "excerpt": "本文学习目标 知道五个官方仓库各自有哪些关键目录。 能根据问题类型快速定位应读的仓库与文件。 理解为什么 TypeScript Client 不再有独立实现。 一、研究快照与版本记录 本文所有结论基于 2026 11 25 对官方 GitHub 仓库与文档的读取。通过 GitHub API 记录的 main 分支 commit 如下： 仓库 Commit SHA 日期 OpenHands/OpenHands d56c1ab8e910500562cc157e13bdc84972"
  },
  {
    "id": "practice/01-mini-coding-agent",
    "path": "/content/practice/01-mini-coding-agent.md",
    "title": "从零实现 Mini Coding Agent",
    "description": "用 TypeScript 实现一个教学版 Coding Agent：Agent Loop、Shell/文件工具、Action/Observation、工作目录隔离与事件记录。",
    "category": "practice",
    "order": 1,
    "updated": "2026-11-25",
    "diagram": "/diagrams/mini-agent.svg",
    "tags": [
      "实战",
      "Mini Agent",
      "TypeScript",
      "Agent Loop"
    ],
    "readingTime": 13,
    "excerpt": "本文学习目标 用最少依赖实现一个可运行的 Agent 循环。 理解工具、workspace 与事件如何协作。 明确教学实现与 OpenHands 官方 SDK 的差距。 声明 ：本文所有代码都是 教学实现 ，不是 OpenHands 官方源码。它用于理解机制，不追求功能完整或生产安全。 一、架构 文件结构： 二、依赖 运行： 三、类型定义 四、事件记录 五、Workspace 隔离 六、工具执行器 七、教学用 LLM 真实 Agent 应调用 LLM API。这里用一个确定性"
  },
  {
    "id": "research/01-architecture-lessons",
    "path": "/content/research/01-architecture-lessons.md",
    "title": "OpenHands 最值得学习的架构设计",
    "description": "从 Agent/Runtime 解耦、Event System、Workspace 抽象、Agent Server 与多仓库治理中提炼可迁移的 Agent Framework 设计原则。",
    "category": "research",
    "order": 1,
    "updated": "2026-11-25",
    "diagram": "/diagrams/overall-architecture.svg",
    "tags": [
      "架构思想",
      "设计取舍",
      "Agent Framework",
      "总结"
    ],
    "readingTime": 5,
    "excerpt": "本文学习目标 提炼 OpenHands 架构中可迁移的设计原则。 理解每个原则解决的具体工程问题。 形成自己的 Agent Framework 设计清单。 一、原则 1：把 Agent 行为与执行位置解耦 OpenHands 的核心结论是：同一份 agent 代码可以通过替换 workspace 在 local、Docker、remote 之间切换。 这背后的设计是： Agent 只关心决策与工具调用 Workspace 关心文件、命令与环境 Tool 在 workspace"
  },
  {
    "id": "security/01-coding-agent-risks",
    "path": "/content/security/01-coding-agent-risks.md",
    "title": "Coding Agent 的安全风险",
    "description": "从威胁模型到部署检查清单，系统梳理 Coding Agent 面临的主要风险及缓解措施，并结合 OpenHands 当前架构说明。",
    "category": "security",
    "order": 1,
    "updated": "2026-11-25",
    "diagram": "/diagrams/security-boundary.svg",
    "tags": [
      "安全",
      "威胁模型",
      "Prompt Injection",
      "多租户"
    ],
    "readingTime": 5,
    "excerpt": "本文学习目标 列出 Coding Agent 的主要威胁面。 理解每一层缓解措施对应哪类风险。 形成可复用的安全检查清单。 一、为什么安全是架构问题 Coding Agent 天然具备三类高权限能力：读文件、写文件、执行命令。它还可能读取不可信仓库内容并持有 API Key。因此安全不能只靠提示词，必须由架构边界保证。 二、威胁面清单 风险 场景 后果 任意命令执行 Agent 生成恶意或错误命令 宿主机被破坏 路径越界 ../../ 访问工作目录外文件 敏感文件泄漏 网络外"
  },
  {
    "id": "server/03-rest-api",
    "path": "/content/server/03-rest-api.md",
    "title": "Agent Server REST API 实战",
    "description": "按官方 API Reference 整理 conversation、event、file、bash 与工具端点，并给出鉴权调用示例和排查步骤。",
    "category": "server",
    "order": 3,
    "updated": "2026-11-25",
    "diagram": "/diagrams/rest-websocket.svg",
    "tags": [
      "REST API",
      "Agent Server",
      "鉴权",
      "WebSocket"
    ],
    "readingTime": 8,
    "excerpt": "本文学习目标 按类别记住官方 Agent Server API 路径。 用正确的请求头调用受保护端点。 理解 REST 与 WebSocket 的职责分工。 安全提醒 ：下列命令会访问本地或远程 Agent Server。请勿对未鉴权实例执行写操作；示例中的 key 与地址仅是占位符。 一、基础端点 官方 API Reference 的 Server Details 部分： /docs 是交互式 OpenAPI 文档，实际使用时优先以它为准。 检查服务状态： 二、鉴权 如果服"
  },
  {
    "id": "tools/01-tool-system-design",
    "path": "/content/tools/01-tool-system-design.md",
    "title": "Tool System 设计",
    "description": "拆解 OpenHands SDK 的工具抽象：Action、Observation、Tool、Executor、注册与发现、参数 Schema、权限与 MCP 集成。",
    "category": "tools",
    "order": 1,
    "updated": "2026-11-25",
    "diagram": "/diagrams/tool-system.svg",
    "tags": [
      "Tool System",
      "Executor",
      "MCP",
      "Schema",
      "权限"
    ],
    "readingTime": 7,
    "excerpt": "本文学习目标 说明 Tool System 的四类核心抽象。 理解工具注册、Schema 与执行时校验的关系。 区分内置工具、自定义工具与 MCP 工具。 一、Tool System 在 SDK 中的位置 官方 SDK 架构文档把 Tool System 定义为： Typed base classes for Action, Observation, Tool, Executor, including MCP integration. 同时说明： 预置工具由 openhand"
  },
  {
    "id": "tools/09-custom-tools",
    "path": "/content/tools/09-custom-tools.md",
    "title": "自定义工具开发",
    "description": "用一个完整的教学示例实现一个受限文件读取工具，覆盖 Schema、路径校验、Observation 与事件记录。",
    "category": "tools",
    "order": 9,
    "updated": "2026-11-25",
    "diagram": "/diagrams/tool-system.svg",
    "tags": [
      "自定义工具",
      "Schema",
      "文件读取",
      "教学实现"
    ],
    "readingTime": 9,
    "excerpt": "本文学习目标 按 Action / Observation 契约实现一个工具。 加入路径越界防护与稳定错误格式。 明确教学实现与官方 SDK 工具的差异。 声明 ：本文代码是 教学实现 ，用于理解工具契约，不是 OpenHands 官方源码，也不声称与官方工具 API 一致。 一、需求 实现一个 read file 工具： 输入：相对路径 输出：文件内容或结构化错误 约束：只能读取 workspace 根目录内的文件 事件：记录请求与结果 二、目录结构（教学项目） 三、Wor"
  },
  {
    "id": "workspace/01-why-workspace",
    "path": "/content/workspace/01-why-workspace.md",
    "title": "Workspace 为什么需要独立抽象？",
    "description": "从路径、权限、文件系统、命令执行与多用户隔离出发，解释 Workspace 抽象是 Coding Agent 的基础设施而非附加功能。",
    "category": "workspace",
    "order": 1,
    "updated": "2026-11-25",
    "diagram": "/diagrams/workspace.svg",
    "tags": [
      "Workspace",
      "抽象",
      "隔离",
      "工程化"
    ],
    "readingTime": 5,
    "excerpt": "本文学习目标 说清 Workspace 抽象解决的具体问题。 理解为什么工具不应直接访问全局文件系统。 知道官方 SDK 中 Workspace 的类型分层。 一、问题：Agent 的“当前目录”是什么 human 开发者知道自己在哪个项目里工作，但 Agent 面对的是 API 请求。如果没有 Workspace 抽象，工具只能依赖进程当前工作目录 os.getcwd() ，这会带来： 多 conversation 之间共享同一目录，互相修改文件 无法把任务放到独立容器 远"
  },
  {
    "id": "workspace/02-workspace-architecture",
    "path": "/content/workspace/02-workspace-architecture.md",
    "title": "Workspace 架构：Local、Docker 与 Remote",
    "description": "对照官方 SDK 的类层次，讲清 Workspace、LocalWorkspace、RemoteWorkspace、DockerWorkspace 与 RemoteAPIWorkspace 的关系和切换方式。",
    "category": "workspace",
    "order": 2,
    "updated": "2026-11-25",
    "diagram": "/diagrams/workspace.svg",
    "tags": [
      "Workspace",
      "DockerWorkspace",
      "RemoteAPIWorkspace",
      "部署模式"
    ],
    "readingTime": 7,
    "excerpt": "本文学习目标 区分 SDK 内建 workspace 与扩展 workspace 包。 说明三种执行模式的连接方式。 理解“替换 workspace 类型”具体意味着什么。 一、类层次 官方 SDK 架构文档给出的层次可以整理为： 文档说明 workspace 实现扩展 SDK 中的 RemoteWorkspace ，增加容器生命周期或 API client 功能。 二、LocalWorkspace 特点： 包含在 openhands.sdk 中 一切在单进程内运行 无需 D"
  },
  {
    "id": "workspace/06-sandbox-security-model",
    "path": "/content/workspace/06-sandbox-security-model.md",
    "title": "Sandbox 安全模型",
    "description": "从威胁模型、Docker 边界、挂载权限、网络与密钥管理出发，建立 Coding Agent 的安全检查清单。",
    "category": "workspace",
    "order": 6,
    "updated": "2026-11-25",
    "diagram": "/diagrams/security-boundary.svg",
    "tags": [
      "Sandbox",
      "Docker",
      "安全",
      "威胁模型"
    ],
    "readingTime": 6,
    "excerpt": "本文学习目标 说清 Coding Agent 的主要威胁面。 理解 Docker Sandbox 能提供什么、不能提供什么。 写出一份部署安全检查清单。 一、威胁模型 Coding Agent 的风险来自四个事实： 1. 它执行模型生成的代码或命令。 2. 它能读写仓库文件。 3. 仓库内容可能包含不可信文本（issue、注释、README、依赖脚本）。 4. 它持有 API Key 或能访问密钥环境。 因此，威胁面包括： 威胁 例子 主要缓解 任意命令执行 恶意脚本、危险 "
  }
];
