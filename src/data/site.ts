export const SITE = {
  name: 'HandsLab',
  title: 'HandsLab - OpenHands 深度解析与 AI Software Engineering Agent 实战教程',
  description: '深入 OpenHands，理解 AI Software Engineering Agent 的工程架构。',
  url: 'https://yuxinrun.github.io/handslab/',
  repo: 'https://github.com/yuxinrun/handslab',
  researchDate: '2026-11-25',
  version: '1.0.0',
};

export const CATEGORY_LABELS: Record<string, string> = {
  'getting-started': '入门指南',
  architecture: '整体架构',
  'agent-core': 'Agent Core',
  tools: 'Tool System',
  workspace: 'Workspace 与 Sandbox',
  conversation: 'Conversation 与事件',
  events: 'Conversation 与事件',
  server: 'Agent Server',
  canvas: 'Agent Canvas',
  automation: 'Automation',
  security: '安全专题',
  practice: '动手实战',
  research: '架构思想',
};

export const CATEGORY_ORDER = [
  'getting-started', 'architecture', 'agent-core', 'tools', 'workspace',
  'conversation', 'events', 'server', 'canvas', 'automation', 'security',
  'practice', 'research',
];

export interface OfficialRepo {
  name: string;
  url: string;
  role: string;
  commit: string;
  date: string;
}

export const OFFICIAL_REPOS: OfficialRepo[] = [
  {
    name: 'OpenHands/OpenHands',
    url: 'https://github.com/OpenHands/OpenHands',
    role: 'Agent Canvas 前端、用户控制中心、本地栈编排、backend 切换',
    commit: 'd56c1ab8e910500562cc157e13bdc8497283e032',
    date: '2026-11-25',
  },
  {
    name: 'OpenHands/software-agent-sdk',
    url: 'https://github.com/OpenHands/software-agent-sdk',
    role: 'Python SDK、Agent Server、Agents、Tools、Conversations、Workspaces、Events、TypeScript Client',
    commit: 'a053dbc47bfd98e96c621fa1b1e8d154abb1154c',
    date: '2026-11-24',
  },
  {
    name: 'OpenHands/automation',
    url: 'https://github.com/OpenHands/automation',
    role: 'Automation 定义、cron 调度、webhook、运行历史、任务派发',
    commit: '17fc93e057cbb102a53c4b356841578dbe9c9628',
    date: '2026-11-25',
  },
  {
    name: 'OpenHands/extensions',
    url: 'https://github.com/OpenHands/extensions',
    role: '公共扩展注册表：Skills、Plugins、Apps、Integrations、Marketplace',
    commit: 'd0902e63a40807d8259bef101a1d1600ce94bf88',
    date: '2026-11-24',
  },
  {
    name: 'OpenHands/typescript-client',
    url: 'https://github.com/OpenHands/typescript-client',
    role: 'README 标注已迁移至 software-agent-sdk 的 clients/typescript/（原仓库仅保留迁移说明）',
    commit: '待核实',
    date: '待核实',
  },
];

export const OFFICIAL_DOCS = [
  { label: '官方文档首页', url: 'https://docs.openhands.dev/' },
  { label: 'SDK 架构总览', url: 'https://docs.openhands.dev/sdk/arch/overview' },
  { label: 'Agent Server 文档', url: 'https://docs.openhands.dev/sdk/arch/agent-server' },
  { label: 'SDK Getting Started', url: 'https://docs.openhands.dev/sdk/getting-started' },
  { label: 'Agent Canvas 架构', url: 'https://github.com/OpenHands/OpenHands/blob/main/docs/architecture.md' },
  { label: 'Self Hosting', url: 'https://github.com/OpenHands/OpenHands/blob/main/docs/SELF_HOSTING.md' },
];

export const CORE_MODULES = [
  {
    label: 'Agent Canvas',
    repo: 'OpenHands/OpenHands',
    desc: '面向用户的控制台：会话、终端、文件、设置、backend 切换与自动化 UI。它不执行 Agent 动作。',
    icon: 'canvas',
    color: 'blue',
  },
  {
    label: 'Software Agent SDK',
    repo: 'OpenHands/software-agent-sdk',
    desc: 'Agent 行为的 source of truth：Agent、LLM、Conversation、Tool System、Events、Workspace、Security。',
    icon: 'sdk',
    color: 'purple',
  },
  {
    label: 'Agent Server',
    repo: 'software-agent-sdk / openhands-agent-server',
    desc: 'FastAPI HTTP/WebSocket 服务，暴露 conversation、file、bash、events 等 API，并支持 API Key 鉴权。',
    icon: 'server',
    color: 'cyan',
  },
  {
    label: 'Automation',
    repo: 'OpenHands/automation',
    desc: '决定“何时运行”：cron、webhook、run history、dispatcher 与 sandbox 生命周期编排。',
    icon: 'automation',
    color: 'amber',
  },
  {
    label: 'Extensions',
    repo: 'OpenHands/extensions',
    desc: '可复用 skills、plugins、apps 与集成 catalog，让能力可以跨 Agent 与客户端共享。',
    icon: 'extensions',
    color: 'green',
  },
  {
    label: 'TypeScript Client',
    repo: 'software-agent-sdk / clients/typescript',
    desc: '浏览器兼容的 Agent Server API 客户端，由 SDK 仓库维护，供 Agent Canvas 消费。',
    icon: 'client',
    color: 'red',
  },
];
