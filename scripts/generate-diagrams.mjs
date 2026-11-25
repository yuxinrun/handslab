import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = join(root, 'public', 'diagrams');
mkdirSync(outDir, { recursive: true });

const C = {
  bg: '#f8fafc', card: '#ffffff', ink: '#0f172a', sub: '#475569', muted: '#94a3b8', line: '#64748b', grid: '#e2e8f0',
  blue: '#2563eb', blueBg: '#dbeafe', purple: '#7c3aed', purpleBg: '#ede9fe', cyan: '#0891b2', cyanBg: '#cffafe',
  green: '#059669', greenBg: '#d1fae5', amber: '#d97706', amberBg: '#fef3c7', red: '#dc2626', redBg: '#fee2e2',
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const palette = {
  blue: [C.blue, C.blueBg], purple: [C.purple, C.purpleBg], cyan: [C.cyan, C.cyanBg],
  green: [C.green, C.greenBg], amber: [C.amber, C.amberBg], red: [C.red, C.redBg],
};

function render({ title, subtitle = '', width = 980, height = 560, groups = [], nodes = [], edges = [], notes = [] }) {
  const defs = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${C.line}"/></marker><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="${C.grid}" stroke-width="0.6"/></pattern></defs>`;
  const groupSvg = groups.map((g) => {
    const [stroke, fill] = palette[g.color || 'blue'];
    return `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="14" fill="${fill}" fill-opacity="0.28" stroke="${stroke}" stroke-opacity="0.5" stroke-dasharray="6 5"/><text x="${g.x + 14}" y="${g.y + 22}" font-size="12" font-weight="700" fill="${stroke}">${esc(g.label)}</text>`;
  }).join('\n');

  const edgeSvg = edges.map((e) => {
    const d = e.d || `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`;
    const dash = e.dashed ? ' stroke-dasharray="6 5"' : '';
    let label = '';
    if (e.label) {
      const lx = e.lx ?? (e.x1 + e.x2) / 2;
      const ly = e.ly ?? (e.y1 + e.y2) / 2 - 8;
      const w = e.label.length * 12 + 14;
      label = `<rect x="${lx - w / 2}" y="${ly - 14}" width="${w}" height="20" rx="6" fill="${C.bg}" opacity="0.96"/><text x="${lx}" y="${ly}" font-size="11" fill="${C.sub}" text-anchor="middle">${esc(e.label)}</text>`;
    }
    return `<path d="${d}" fill="none" stroke="${C.line}" stroke-width="1.8" marker-end="url(#arrow)"${dash}/>${label}`;
  }).join('\n');

  const nodeSvg = nodes.map((n) => {
    const [stroke, fill] = palette[n.color || 'blue'];
    const lines = String(n.label).split('\n');
    const subLines = String(n.sub || '').split('\n');
    const cy = n.y + n.h / 2;
    const start = cy - ((lines.length - 1) * 18 + (subLines.length ? 16 : 0)) / 2 + 5;
    const texts = lines.map((l, i) => `<text x="${n.x + n.w / 2}" y="${start + i * 18}" font-size="${n.small ? 12 : 14}" font-weight="700" fill="${C.ink}" text-anchor="middle">${esc(l)}</text>`).join('');
    const subs = subLines.map((l, i) => `<text x="${n.x + n.w / 2}" y="${start + lines.length * 18 + i * 14}" font-size="10.5" fill="${C.sub}" text-anchor="middle">${esc(l)}</text>`).join('');
    return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="11" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/><rect x="${n.x}" y="${n.y}" width="4" height="${n.h}" rx="2" fill="${stroke}"/>${texts}${subs}`;
  }).join('\n');

  const noteSvg = notes.length
    ? `<g transform="translate(40,${height - 26 - (notes.length - 1) * 17})">${notes.map((t, i) => `<text x="0" y="${i * 17}" font-size="11.5" fill="${C.sub}">• ${esc(t)}</text>`).join('')}</g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(title)}" style="max-width:100%;height:auto">
${defs}
<rect width="${width}" height="${height}" fill="${C.bg}"/><rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.75"/>
<text x="40" y="46" font-size="21" font-weight="800" fill="${C.ink}">${esc(title)}</text>
${subtitle ? `<text x="40" y="68" font-size="12" fill="${C.sub}">${esc(subtitle)}</text>` : ''}
<line x1="40" y1="80" x2="${width - 40}" y2="80" stroke="${C.grid}" stroke-width="1.5"/>
${groupSvg}
${edgeSvg}
${nodeSvg}
${noteSvg}
</svg>`;
}

const H = (x, y, w, h, label, sub, color = 'blue') => ({ x, y, w, h, label, sub, color });
const E = (x1, y1, x2, y2, label, opts = {}) => ({ x1, y1, x2, y2, label, ...opts });
const D = (d, label, opts = {}) => ({ d, label, ...opts });

const diagrams = {
  'overall-architecture': {
    title: 'OpenHands 当前整体架构',
    subtitle: '多仓库协作：界面层 / 服务层 / SDK 层 / 执行层（2026-11 研究快照）',
    height: 620,
    nodes: [
      H(40, 110, 210, 72, 'Agent Canvas', 'OpenHands/OpenHands\nReact + TypeScript', 'blue'),
      H(300, 110, 210, 72, 'Automation Server', 'OpenHands/automation\ncron / webhook / dispatch', 'amber'),
      H(560, 110, 170, 72, 'Extensions', 'skills / plugins\nOpenHands/extensions', 'purple'),
      H(770, 110, 170, 72, 'CLI / 自定义客户端', 'OpenHands CLI\nCustom Client', 'cyan'),
      H(250, 250, 460, 80, 'Agent Server', 'openhands-agent-server · REST + WebSocket\n多用户会话 · API Key 鉴权', 'blue'),
      H(40, 400, 250, 78, 'Software Agent SDK', 'openhands.sdk\nAgent / Conversation / LLM / Events', 'purple'),
      H(365, 400, 250, 78, 'Tool System', 'openhands.tools\nAction / Observation / Executor', 'cyan'),
      H(690, 400, 250, 78, 'Workspace', 'Local / Docker / Remote\n文件系统 · 命令 · 网络边界', 'green'),
      H(200, 520, 250, 66, 'LLM Providers', '模型推理与工具决策', 'amber'),
      H(530, 520, 250, 66, 'Sandbox', 'Docker / VM / 云端执行环境', 'red'),
    ],
    edges: [
      E(145, 182, 380, 250, 'TypeScript Client'),
      E(405, 182, 470, 250, 'dispatch'),
      E(645, 182, 520, 250, 'skills', { dashed: true }),
      E(770, 146, 710, 250, 'REST / WS'),
      E(400, 330, 260, 400, '执行 conversation'),
      E(560, 330, 490, 400, '调用工具'),
      E(710, 330, 815, 400, 'workspace ops'),
      E(290, 478, 330, 520, 'LLM 请求'),
      E(815, 478, 650, 520, '隔离执行'),
    ],
    notes: ['前端不直接执行_agent_动作，也不提供 sandbox', 'SDK 是 Agent 行为的 source of truth'],
  },

  'multi-repo': {
    title: 'OpenHands 多仓库职责边界',
    subtitle: '把“界面、执行、调度、扩展”放进不同仓库，避免单体耦合',
    height: 560,
    nodes: [
      H(50, 120, 200, 84, 'OpenHands/OpenHands', 'Agent Canvas UI\n本地栈编排 · backend 切换', 'blue'),
      H(370, 120, 220, 84, 'software-agent-sdk', 'Python SDK · Agent Server\nTypeScript Client（已迁入）', 'purple'),
      H(690, 120, 240, 84, 'automation', 'scheduler · dispatcher\nhistory · webhooks', 'amber'),
      H(200, 320, 240, 84, 'extensions', 'skills · plugins · apps\ncatalog / marketplace', 'green'),
      H(550, 320, 200, 84, 'typescript-client', '已迁移到 SDK 仓库\nclients/typescript', 'cyan', 'cyan'),
    ],
    edges: [
      E(250, 162, 370, 162, 'REST / WebSocket'),
      E(590, 162, 690, 162, '派发 conversation'),
      E(370, 204, 320, 320, '加载 skills', { dashed: true }),
      E(690, 204, 680, 320, 'catalog', { dashed: true }),
      E(590, 362, 750, 362, 'merged', { dashed: true }),
    ],
    notes: ['README 明确要求：变更提交到拥有该行为的仓库', 'TypeScript Client 原仓库 README 仅保留迁移说明'],
  },

  'agent-loop': {
    title: 'Agent Loop：推理—行动—观察循环',
    subtitle: 'Agent 调用 LLM 决策，通过 Tool 执行 Action，再用 Observation 进入下一轮',
    height: 520,
    nodes: [
      H(40, 150, 150, 76, 'User Task', '用户目标', 'blue'),
      H(230, 150, 150, 76, 'LLM Decision', '下一步做什么', 'purple'),
      H(420, 150, 150, 76, 'Tool Call', '执行 Action', 'cyan'),
      H(610, 150, 150, 76, 'Observation', '返回结果', 'green'),
      H(790, 150, 150, 76, 'Final Answer', '任务完成', 'amber'),
    ],
    edges: [
      E(190, 188, 230, 188), E(380, 188, 420, 188), E(570, 188, 610, 188), E(760, 188, 790, 188),
      D('M 685 226 L 685 290 L 305 290 L 305 226', '继续推理', { dashed: true, lx: 495, ly: 282 }),
    ],
    notes: ['循环终止由 LLM 表达“完成”或外部停止条件决定', '每一轮都会产生事件，供 UI 与日志消费'],
  },

  'action-observation': {
    title: 'Action / Observation 模型',
    subtitle: '工具调用的结构化输入输出契约',
    height: 500,
    nodes: [
      H(60, 140, 190, 80, 'LLM 决策', '生成结构化 Action', 'purple'),
      H(320, 140, 200, 80, 'Tool Executor', '校验 · 执行 · 捕获错误', 'cyan'),
      H(590, 140, 200, 80, 'Observation', '输出 · 退出码 · 错误', 'green'),
      H(320, 300, 200, 76, 'Workspace', 'local / container / remote', 'amber'),
    ],
    edges: [
      E(250, 180, 320, 180, 'Action'), E(520, 180, 590, 180, '结果'),
      E(420, 220, 420, 300, '读写文件 / 执行命令'),
      D('M 690 220 L 690 370 L 155 370 L 155 220', '反馈给 LLM 进入下一轮', { dashed: true, lx: 420, ly: 362 }),
    ],
    notes: ['Action 与 Observation 都是可被事件系统记录的强类型对象'],
  },

  'tool-system': {
    title: 'Tool System 架构',
    subtitle: '注册、发现、执行、错误处理的统一抽象',
    height: 540,
    groups: [{ x: 40, y: 110, w: 410, h: 330, label: 'SDK 核心抽象', color: 'purple' }],
    nodes: [
      H(70, 150, 160, 72, 'Agent', '选择工具', 'purple'),
      H(270, 150, 150, 72, 'Tool', 'name / schema', 'purple'),
      H(70, 270, 160, 72, 'Executor', '执行与超时', 'cyan'),
      H(270, 270, 150, 72, 'Security', '风险评估', 'red'),
      H(500, 150, 190, 72, 'TerminalTool', '命令执行', 'blue'),
      H(500, 250, 190, 72, 'FileEditorTool', '文件编辑', 'blue'),
      H(500, 350, 190, 72, 'MCP Tools', '外部协议集成', 'green'),
      H(740, 250, 190, 72, 'Workspace', '实际执行环境', 'amber'),
    ],
    edges: [
      E(230, 186, 270, 186), E(345, 222, 150, 270, '分派'), E(230, 306, 345, 306, '校验'),
      E(420, 186, 500, 186), E(420, 286, 500, 286), E(420, 386, 500, 386),
      E(690, 286, 740, 286, '执行于'),
    ],
    notes: ['工具与 Agent 在同一 workspace 环境中运行', 'MCP 集成属于 SDK 文档中的 Tool System 范畴'],
  },

  workspace: {
    title: 'Workspace 抽象与实现',
    subtitle: '同一份 Agent 代码，只需替换 workspace 类型即可切换执行环境',
    height: 500,
    nodes: [
      H(350, 110, 280, 74, 'Workspace（抽象）', 'working_dir · 文件 · 命令 · 事件', 'purple'),
      H(50, 270, 200, 82, 'LocalWorkspace', '宿主机进程\nopenhands.sdk 内置', 'blue'),
      H(300, 270, 200, 82, 'DockerWorkspace', '容器生命周期\nopenhands.workspace', 'cyan'),
      H(550, 270, 200, 82, 'RemoteAPIWorkspace', 'HTTP 连接远程 Server\nopenhands.workspace', 'green'),
      H(790, 270, 150, 82, 'RemoteWorkspace', '基础远程类', 'amber'),
    ],
    edges: [
      E(420, 184, 150, 270), E(490, 184, 400, 270), E(560, 184, 650, 270), E(630, 184, 830, 270),
    ],
    notes: ['官方结论：LocalWorkspace → DockerWorkspace → RemoteAPIWorkspace 可平滑切换'],
  },

  'docker-sandbox': {
    title: 'Docker Sandbox 安全边界',
    subtitle: 'Agent Canvas 官方推荐：容器 uid 10001，只挂载必要 workspace',
    height: 540,
    groups: [
      { x: 40, y: 110, w: 900, h: 360, label: 'Host / Docker Engine', color: 'blue' },
      { x: 100, y: 170, w: 780, h: 260, label: 'Container（独立 Agent Server）', color: 'cyan' },
    ],
    nodes: [
      H(140, 220, 200, 74, 'Agent Server', '/alive 健康检查', 'blue'),
      H(390, 220, 200, 74, 'Workspace', '/projects 挂载目录', 'green'),
      H(140, 330, 200, 74, 'File System', '容器内隔离视图', 'cyan'),
      H(390, 330, 200, 74, 'Network', '默认受限出口', 'amber'),
      H(640, 330, 180, 74, 'Secrets', '环境变量 / 卷', 'red'),
    ],
    edges: [
      E(340, 257, 390, 257), E(240, 294, 240, 330), E(490, 294, 490, 330), E(590, 367, 640, 367, '按需注入', { dashed: true }),
    ],
    notes: ['宿主机目录权限需授权 uid 10001 读写', '/alive 约 30 秒无响应则容器退出，便于显式恢复'],
  },

  'agent-server': {
    title: 'Agent Server 架构',
    subtitle: 'FastAPI HTTP/WebSocket 服务，隔离应用后端与 Agent 执行环境',
    height: 540,
    nodes: [
      H(40, 140, 170, 76, 'Clients', 'Canvas / CLI / 自定义', 'blue'),
      H(250, 140, 190, 76, 'API Layer', 'REST + WebSocket\n/api/* · /server_info', 'purple'),
      H(480, 140, 190, 76, 'Conversation', '生命周期 · 事件流', 'cyan'),
      H(710, 140, 190, 76, 'SDK Agent', 'LLM + Tools', 'green'),
      H(250, 300, 190, 76, 'Auth', 'X-Session-API-Key', 'red'),
      H(480, 300, 190, 76, 'Workspace', '文件 / Bash / Git', 'amber'),
      H(710, 300, 190, 76, 'Storage', 'workspace/conversations', 'blue'),
    ],
    edges: [
      E(210, 178, 250, 178), E(440, 178, 480, 178), E(670, 178, 710, 178),
      E(345, 216, 345, 300, '鉴权'), E(575, 216, 575, 300), E(805, 216, 805, 300, '持久化'),
      E(670, 338, 440, 338, '工具读写', { dashed: true }),
    ],
    notes: ['默认无鉴权；对外暴露必须设置 OH_SESSION_API_KEYS_* 与 OH_SECRET_KEY'],
  },

  'rest-websocket': {
    title: 'REST 与 WebSocket 通信模型',
    subtitle: '命令走 REST，状态与事件走流式通道',
    height: 500,
    groups: [
      { x: 60, y: 120, w: 370, h: 300, label: 'REST：请求 / 响应', color: 'blue' },
      { x: 550, y: 120, w: 370, h: 300, label: 'WebSocket：事件流', color: 'cyan' },
    ],
    nodes: [
      H(90, 170, 130, 66, 'Client', 'POST /api/...', 'blue'),
      H(280, 170, 130, 66, 'Agent Server', '处理请求', 'purple'),
      H(90, 290, 130, 66, '响应', 'JSON 结果', 'green'),
      H(580, 170, 130, 66, 'Client', '订阅事件', 'cyan'),
      H(790, 170, 110, 66, 'Server', '推送', 'cyan'),
      H(580, 290, 130, 66, 'UI 状态', '实时更新', 'green'),
      H(790, 290, 110, 66, 'Events', 'action / observation', 'amber'),
    ],
    edges: [
      E(220, 203, 280, 203, '请求'), E(345, 236, 155, 290, '返回'),
      E(710, 203, 790, 203), E(845, 236, 645, 290, 'stream'), E(710, 323, 790, 323, '渲染'),
    ],
    notes: ['具体 WebSocket 路由以官方 OpenAPI / 源码为准，本文不臆测路径'],
  },

  'conversation-lifecycle': {
    title: 'Conversation 生命周期',
    subtitle: '从创建、运行到暂停/恢复与结束',
    height: 480,
    nodes: [
      H(40, 160, 140, 72, 'Created', 'POST /api/conversations', 'blue'),
      H(230, 160, 140, 72, 'Message', 'POST .../events', 'purple'),
      H(420, 160, 140, 72, 'Running', 'POST .../run', 'cyan'),
      H(610, 160, 140, 72, 'Paused', 'POST .../pause', 'amber'),
      H(790, 160, 140, 72, 'Finished', '状态更新事件', 'green'),
      H(420, 320, 140, 72, 'Stored', '事件持久化', 'blue'),
    ],
    edges: [
      E(180, 196, 230, 196), E(370, 196, 420, 196), E(560, 196, 610, 196), E(750, 196, 790, 196),
      E(490, 232, 490, 320, '持久化'),
      D('M 680 232 L 680 400 L 490 400 L 490 392', '恢复运行', { dashed: true, lx: 585, ly: 392 }),
    ],
    notes: ['端点名称来自官方 Agent Server API Reference'],
  },

  'event-stream': {
    title: 'Event Stream 时序',
    subtitle: '客户端、服务端、Agent 与工具之间的事件流动',
    height: 560,
    groups: [{ x: 40, y: 100, w: 900, h: 390, label: '一次任务的时间轴（从上到下）', color: 'cyan' }],
    nodes: [
      H(70, 140, 170, 48, 'Client', '', 'blue'), H(300, 140, 170, 48, 'Agent Server', '', 'purple'),
      H(530, 140, 170, 48, 'Agent', '', 'cyan'), H(760, 140, 170, 48, 'Tool / Workspace', '', 'green'),
      H(70, 400, 170, 52, 'Event Store', '持久化轨迹', 'amber'), H(530, 400, 170, 52, 'UI', '实时渲染', 'blue'),
    ],
    edges: [
      E(155, 206, 385, 206, 'UserMessage'),
      E(385, 250, 615, 250, 'run'),
      E(615, 292, 845, 292, 'Action'),
      E(845, 334, 615, 334, 'Observation'),
      D('M 385 250 L 385 400 L 240 400', '写入事件', { dashed: true, lx: 300, ly: 392 }),
      D('M 385 334 L 385 426 L 530 426', '推送', { dashed: true, lx: 455, ly: 418 }),
    ],
    notes: ['事件类型示意：ConversationStarted / ActionRequested / ObservationReceived / ConversationFinished'],
  },

  'agent-canvas': {
    title: 'Agent Canvas 前端架构',
    subtitle: 'React + TypeScript：UI / 状态 / API 适配器三层解耦',
    height: 520,
    nodes: [
      H(50, 130, 180, 74, 'UI 组件', 'chat · terminal · files · settings', 'blue'),
      H(290, 130, 180, 74, '状态层', 'Zustand stores · React Query hooks', 'purple'),
      H(530, 130, 180, 74, 'API 适配器', 'src/api/ 服务封装', 'cyan'),
      H(770, 130, 160, 74, 'Backends', '多 Agent Server 切换', 'green'),
      H(290, 300, 180, 74, 'i18n / mocks', '翻译与 MSW', 'amber'),
      H(530, 300, 180, 74, 'CLI / Launcher', 'bin/ · scripts/', 'blue'),
    ],
    edges: [
      E(230, 167, 290, 167), E(470, 167, 530, 167), E(710, 167, 770, 167),
      E(380, 204, 380, 300), E(620, 204, 620, 300),
    ],
    notes: ['前端不执行 Agent 动作、不提供 sandbox', 'runtime_services 由后端暴露并注入会话上下文'],
  },

  'automation-workflow': {
    title: 'Automation 工作流',
    subtitle: '决定“何时运行”，Agent Server 决定“运行什么”',
    height: 520,
    nodes: [
      H(40, 140, 160, 72, 'Triggers', 'cron / webhook', 'amber'),
      H(250, 140, 170, 72, 'Automation API', 'FastAPI · CRUD', 'purple'),
      H(470, 140, 170, 72, 'Scheduler', 'scheduler.py', 'blue'),
      H(690, 140, 170, 72, 'Dispatcher', 'dispatcher.py', 'cyan'),
      H(470, 310, 170, 72, 'Agent Server', '执行 conversation', 'green'),
      H(690, 310, 170, 72, 'Run History', '状态与结果', 'blue'),
      H(250, 310, 170, 72, 'Sandbox', '生命周期编排', 'red'),
    ],
    edges: [
      E(200, 176, 250, 176), E(420, 176, 470, 176), E(640, 176, 690, 176),
      E(775, 212, 555, 310, '派发'), E(640, 346, 690, 346, '记录'),
      E(420, 346, 470, 346, '隔离', { dashed: true }),
    ],
    notes: ['Automation 服务处于 Beta，API 可能变更', '扩展配置（skills）位于 OpenHands/extensions'],
  },

  'coding-agent-flow': {
    title: 'Coding Agent 完整任务流程',
    subtitle: '从用户一句话到代码提交的全链路',
    height: 560,
    nodes: [
      H(40, 120, 150, 64, '用户请求', 'Issue / 对话', 'blue'),
      H(220, 120, 150, 64, '上下文装配', '仓库 + skills', 'purple'),
      H(400, 120, 150, 64, 'LLM 规划', '选择工具', 'cyan'),
      H(580, 120, 150, 64, '读取代码', 'grep / read', 'green'),
      H(760, 120, 150, 64, '修改文件', 'edit tool', 'amber'),
      H(580, 300, 150, 64, '运行测试', 'terminal tool', 'blue'),
      H(760, 300, 150, 64, '观察失败', 'error output', 'red'),
      H(400, 300, 150, 64, '迭代修复', '下一轮循环', 'purple'),
      H(220, 300, 150, 64, '生成结果', '总结 / diff', 'green'),
      H(40, 300, 150, 64, '人工确认', '可选审批', 'amber'),
    ],
    edges: [
      E(190, 152, 220, 152), E(370, 152, 400, 152), E(550, 152, 580, 152), E(730, 152, 760, 152),
      E(835, 184, 655, 300, '执行测试'), E(730, 332, 550, 332, '失败反馈'),
      E(400, 332, 370, 332, '重新推理', { dashed: true }), E(220, 332, 190, 332),
    ],
    notes: ['这是一个教学流程示意，不等同于官方源码中的固定阶段实现'],
  },

  'security-boundary': {
    title: 'Coding Agent 安全边界',
    subtitle: '每一层都应默认最小权限',
    height: 540,
    groups: [
      { x: 40, y: 110, w: 900, h: 360, label: 'Host（宿主机：用户数据与密钥）', color: 'red' },
      { x: 100, y: 170, w: 780, h: 260, label: 'Container（Agent 执行环境）', color: 'amber' },
      { x: 160, y: 220, w: 660, h: 170, label: 'Workspace（仅挂载必要目录）', color: 'green' },
    ],
    nodes: [
      H(190, 260, 180, 60, 'File System', '读写受控目录', 'green'),
      H(410, 260, 180, 60, 'Command', '命令风险', 'red'),
      H(630, 260, 150, 60, 'Network', '出口限制', 'amber'),
    ],
    edges: [
      E(370, 290, 410, 290, '执行'), E(590, 290, 630, 290, '访问'),
      D('M 280 170 L 280 120', '显式挂载', { dashed: true, lx: 300, ly: 145 }),
    ],
    notes: ['绝不默认把宿主机 root 权限交给 Agent', 'Prompt Injection 与恶意仓库内容是独立威胁面'],
  },

  'mini-agent': {
    title: 'Mini Coding Agent 教学架构',
    subtitle: '用最小依赖复刻 Agent Loop 的核心机制',
    height: 500,
    nodes: [
      H(60, 140, 170, 76, 'CLI 输入', '用户任务', 'blue'),
      H(280, 140, 170, 76, 'Loop', '最多 N 轮', 'purple'),
      H(500, 140, 170, 76, 'LLM', '返回 JSON Action', 'cyan'),
      H(720, 140, 170, 76, 'Tools', 'read / write / shell', 'green'),
      H(280, 310, 170, 76, 'Observation', '文本结果', 'amber'),
      H(500, 310, 170, 76, 'Workspace', '限定 working_dir', 'blue'),
    ],
    edges: [
      E(230, 178, 280, 178), E(450, 178, 500, 178), E(670, 178, 720, 178),
      E(805, 216, 365, 310, '结果回填'), E(585, 216, 585, 310, '文件操作'),
      D('M 365 348 L 365 400 L 280 400 L 280 386', '下一轮', { dashed: true, lx: 325, ly: 392 }),
    ],
    notes: ['教学实现，不是 OpenHands 官方源码', '重点理解契约与边界，而非追求功能完整'],
  },
};

for (const [name, def] of Object.entries(diagrams)) {
  writeFileSync(join(outDir, `${name}.svg`), render(def), 'utf8');
}
console.log(`[diagrams] ${Object.keys(diagrams).length} SVG -> public/diagrams`);
