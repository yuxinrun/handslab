import { escapeHtml } from '../utils/base';

const LEVELS = [
  {
    title: 'Level 1 · 理解 Agent 基础',
    goal: '分清 Agent、Coding Agent 与 Software Engineering Agent 的边界，理解典型任务形态。',
    articles: ['getting-started/01-what-is-openhands', 'getting-started/03-agent-taxonomy', 'getting-started/05-comparison'],
    practice: '用一句话描述你自己的任务属于哪一类 Agent，并列出 3 个输入、2 个输出与 1 个失败条件。',
    outcome: '能用准确术语描述一个 Coding Agent 系统，不把 IDE 补全与自主 Agent 混为一谈。',
    questions: ['Coding Agent 与 SWE Agent 的关键区别是什么？', '为什么“能改代码”不等于“能完成工程任务”？'],
  },
  {
    title: 'Level 2 · 理解 OpenHands 架构',
    goal: '掌握多仓库职责边界与一次任务在组件间的流动路径。',
    articles: ['architecture/01-overall-architecture', 'architecture/02-repo-boundaries', 'architecture/09-task-sequence'],
    practice: '对照本站 SVG，用自己的话画出 Canvas → Agent Server → SDK → Workspace → LLM 的调用链。',
    outcome: '能指出某个功能应该去哪个仓库找源码，不把 Agent Canvas 说成 Agent 执行引擎。',
    questions: ['TypeScript Client 现在由哪个仓库维护？', 'Automation 与 Agent Server 的分工是什么？'],
  },
  {
    title: 'Level 3 · 理解 Agent Core',
    goal: '理解 reasoning-action loop、LLM 决策与 Action / Observation 契约。',
    articles: ['agent-core/02-agent-loop', 'agent-core/03-llm-and-tool-calling', 'agent-core/04-action-observation'],
    practice: '用伪代码写出一个最多循环 8 轮的 Agent Loop，并定义退出条件。',
    outcome: '能解释为什么工具结果必须以 Observation 形式回到上下文，而不是直接拼接字符串。',
    questions: ['循环何时终止？', '失败的工具调用应该如何反馈给 LLM？'],
  },
  {
    title: 'Level 4 · 理解 Tool System',
    goal: '掌握工具注册、Schema、执行器、错误处理与权限控制。',
    articles: ['tools/01-tool-system-design', 'tools/09-custom-tools'],
    practice: '实现一个带 JSON Schema 的 read_file 工具，包含路径越界检查。',
    outcome: '能设计一个工具契约，让 LLM 生成的结构化 Action 可以安全地被校验与执行。',
    questions: ['为什么工具需要 Schema？', 'MCP 集成在 SDK 的哪一层？'],
  },
  {
    title: 'Level 5 · 理解 Workspace 与 Sandbox',
    goal: '理解执行环境抽象、容器隔离与安全边界。',
    articles: ['workspace/01-why-workspace', 'workspace/02-workspace-architecture', 'workspace/06-sandbox-security-model', 'security/01-coding-agent-risks'],
    practice: '把你的 Mini Agent 的文件操作限制到一个临时目录，并列出容器运行时的权限清单。',
    outcome: '能解释为什么 Agent 不应默认使用宿主机权限，并写出一份部署安全检查清单。',
    questions: ['Workspace 与 Sandbox 是同一个概念吗？', 'bind mount 的范围如何影响安全边界？'],
  },
  {
    title: 'Level 6 · 理解 Agent Server',
    goal: '掌握 REST / WebSocket API、鉴权与会话生命周期。',
    articles: ['server/03-rest-api', 'events/05-event-system'],
    practice: '启动一个本地 Agent Server，调用 /server_info，并用 X-Session-API-Key 访问一个 /api/* 端点。',
    outcome: '能把一个进程内 Agent 改造成可被多客户端调用的服务，并配置基本鉴权。',
    questions: ['为什么默认无鉴权的 Agent Server 不能暴露到公网？', '事件流为什么需要持久化？'],
  },
  {
    title: 'Level 7 · 理解 Automation',
    goal: '理解定时、Webhook、派发、运行历史与扩展注册表。',
    articles: ['automation/01-automation-architecture', 'canvas/01-what-is-agent-canvas'],
    practice: '设计一个“GitHub Issue 打标签后自动修复”的自动化，写出触发条件、派发目标与失败处理。',
    outcome: '能区分“何时运行”与“运行什么”，并为自动化任务设计可观测性字段。',
    questions: ['Automation 服务为什么需要 run history？', 'Skills 放在哪个仓库？'],
  },
  {
    title: 'Level 8 · 构建 Mini Coding Agent',
    goal: '用最小依赖实现核心循环、工具与工作目录抽象。',
    articles: ['practice/01-mini-coding-agent'],
    practice: '完成 Mini Agent：支持 read_file、write_file、shell 三个工具，并记录每一步事件。',
    outcome: '得到一个可本地运行的教学 Agent，能完成“读文件 → 改文件 → 跑测试”的闭环。',
    questions: ['你的实现与官方 SDK 的最大差异是什么？', '哪些地方必须加超时与权限校验？'],
  },
  {
    title: 'Level 9 · 构建完整 Agent 系统',
    goal: '服务化、事件推送、安全边界、评估与运维。',
    articles: ['research/01-architecture-lessons', 'architecture/05-agent-server-architecture'],
    practice: '为 Mini Agent 增加 HTTP API、WebSocket 事件流、容器执行与一份评估报告。',
    outcome: '形成一个可复用、可观测、可部署的 Agent 系统雏形，并能清楚说明设计取舍。',
    questions: ['你的系统如何做多用户隔离？', '如何衡量 Agent 改动是否有效？'],
  },
];

const DAYS = [
  ['01', '阅读官方 README', '打开 OpenHands/OpenHands README，记录 Agent Canvas 定位、启动方式与官方仓库表。'],
  ['02', '建立多仓库清单', '列出五个仓库的 URL、职责与本次研究的 commit SHA，保存到你的笔记。'],
  ['03', '定位 SDK 目录', '浏览 software-agent-sdk 仓库结构，找到 openhands/sdk、tools、workspace、agent_server。'],
  ['04', '跑通 Quick Start', '按官方示例理解 LLM / Agent / Conversation / Tool 的构造顺序，不必真实调用付费模型。'],
  ['05', '写术语表', '整理 Agent、Coding Agent、SWE Agent、Workspace、Sandbox、Event 的定义。'],
  ['06', '读 SDK 架构总览', '记录四个 Python 包与核心组件名称，标注哪些是可选依赖。'],
  ['07', '读 Canvas 架构', '从 architecture.md 中摘出 Canvas “不负责”的边界，理解前端为何不执行 Agent。'],
  ['08', '画整体架构图', '对照本站 overall-architecture.svg，自己画一张带仓库名的架构图。'],
  ['09', '梳理通信路径', '写出一次任务从 UI 到 LLM 再回到 UI 的完整调用链。'],
  ['10', '读 Agent Loop', '理解推理—行动—观察循环，写出循环的四类终止条件。'],
  ['11', '实现循环骨架', '用伪代码或 TypeScript 写一个最多 8 轮的 Loop，含最大轮数与错误退出。'],
  ['12', '读 LLM 与工具调用', '记录 LLM 如何表达工具调用，以及重试、telemetry 的职责归属。'],
  ['13', '读 Action / Observation', '为你的 Mini Agent 定义 Action 与 Observation 类型。'],
  ['14', '读 Tool System', '记录 Tool、Executor、Security 三者的分工。'],
  ['15', '实现 read_file', '加入路径规范化与越界拒绝，编写三个测试用例。'],
  ['16', '实现 write_file', '加入 Schema 校验与原子写入思路，记录失败时的 Observation 格式。'],
  ['17', '读 Workspace 文章', '比较 LocalWorkspace、DockerWorkspace、RemoteAPIWorkspace 的适用场景。'],
  ['18', '限制工作目录', '让你的所有文件工具只能访问一个临时目录，并验证越界访问被拒绝。'],
  ['19', '读 Sandbox 安全', '写出宿主机运行与容器运行的威胁差异清单。'],
  ['20', '容器化执行', '按官方 quickstart 理解 uid 10001、挂载目录与 /alive 检查的作用。'],
  ['21', '读 Agent Server', '记录 REST 与 WebSocket 各负责什么，列出鉴权相关环境变量。'],
  ['22', '调用服务信息端点', '在本地或示例环境中调用 /server_info，记录返回字段。'],
  ['23', '练习鉴权', '理解 X-Session-API-Key 与 OH_SECRET_KEY 的区别，写出 401 排查步骤。'],
  ['24', '读 Event System', '为你的 Loop 增加事件类型枚举与事件持久化结构。'],
  ['25', '读 Canvas 状态同步', '理解前端如何通过事件流更新 Conversation UI。'],
  ['26', '读 Automation', '设计 cron 与 webhook 两种触发器的数据结构。'],
  ['27', '实现事件推送', '用 WebSocket（或本地 EventEmitter 模拟）把事件推给一个简单页面。'],
  ['28', '集成修复任务', '制造一个失败测试，让 Agent 读取错误、修改代码并重新运行测试。'],
  ['29', '写评估报告', '记录成功率、测试通过率、耗时、Token 与错误率，比较两次改动。'],
  ['30', '输出设计文档', '总结你的 Agent 框架设计：模块边界、执行流程、安全策略与下一步计划。'],
];

export function renderLearningPath(): string {
  return `
<div class="page-head">
  <div class="section-eyebrow">Learning Path</div>
  <h1>从读者到构建者：九阶段学习路线</h1>
  <p>每个阶段都给出学习目标、推荐文章、代码实践、预期成果与自测问题。完成 30 天计划后，你应该拥有一份自己的 Agent 系统设计与一个可运行的教学实现。</p>
</div>
<h2 style="font-size:22px;margin-top:34px">阶段总览</h2>
${LEVELS.map((l, i) => `
<details class="level-card" ${i === 0 ? 'open' : ''}>
  <summary class="level-head"><span class="level-num">${String(i + 1).padStart(2, '0')}</span><span><h3>${escapeHtml(l.title)}</h3><p>${escapeHtml(l.goal)}</p></span><span class="chev">▾</span></summary>
  <div class="level-body">
    <h4>推荐文章</h4><ul>${l.articles.map((id) => `<li><a href="#/article/${id}">${escapeHtml(id)}</a></li>`).join('')}</ul>
    <h4>代码实践</h4><p style="margin:0;color:var(--text-soft)">${escapeHtml(l.practice)}</p>
    <h4>预期成果</h4><p style="margin:0;color:var(--text-soft)">${escapeHtml(l.outcome)}</p>
    <h4>自测问题</h4><ul>${l.questions.map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ul>
  </div>
</details>`).join('')}
<h2 style="font-size:22px;margin-top:38px">30 天学习计划</h2>
<p style="color:var(--text-soft);font-size:13.5px">每天都有明确产出。建议每天 45–90 分钟，周末用于运行代码与整理笔记。</p>
<div class="day-grid">
  ${DAYS.map(([day, title, desc]) => `<div class="day-card"><span class="day-no">DAY ${day}</span><h4>${escapeHtml(title)}</h4><p>${escapeHtml(desc)}</p></div>`).join('')}
</div>`;
}
