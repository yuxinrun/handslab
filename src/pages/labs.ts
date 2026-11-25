import { escapeHtml } from '../utils/base';

export type LabKey = 'loop' | 'architecture' | 'tools' | 'events' | 'sandbox' | 'evaluation';

const TABS: { key: LabKey; label: string }[] = [
  { key: 'loop', label: 'Agent Loop Simulator' },
  { key: 'architecture', label: 'Architecture Explorer' },
  { key: 'tools', label: 'Tool Calling Simulator' },
  { key: 'events', label: 'Event Timeline' },
  { key: 'sandbox', label: 'Sandbox Explorer' },
  { key: 'evaluation', label: 'Agent Evaluation Lab' },
];

const LOOP_STEPS = [
  { node: 'User Task', title: '用户提交任务', llm: '尚未调用', tool: '尚未调用', observation: '—', log: '任务："为当前仓库补充 README，并运行测试确认无回归。"' },
  { node: 'LLM Decision', title: 'LLM 决定下一步', llm: '读取仓库结构，再决定修改方案', tool: '尚未调用', observation: '—', log: 'LLM 输出：我需要先查看目录结构与现有文档。' },
  { node: 'Tool Call', title: '发起工具调用', llm: '选择 TerminalTool', tool: 'execute_command("ls -la")', observation: '执行中…', log: 'Action 被序列化并通过 Executor 校验。' },
  { node: 'Observation', title: '接收观察结果', llm: '等待下一轮推理', tool: 'execute_command("ls -la")', observation: 'exit_code=0，列出 12 个文件', log: 'Observation 被写回 Conversation 的事件历史。' },
  { node: 'Next Decision', title: '进入下一轮推理', llm: '发现缺少 README，决定写入文件', tool: 'write_file("README.md")', observation: '已读取目录结构', log: 'Agent 重新调用 LLM，输入包含上一轮 Observation。' },
  { node: 'Final Answer', title: '任务完成', llm: '输出总结', tool: 'write_file("README.md")', observation: '文件写入成功；测试通过', log: 'ConversationFinished 事件产生，UI 展示最终结果。' },
];

const ARCH_NODES = [
  { name: 'Agent Canvas', role: '渲染会话、终端、文件与设置 UI；把用户操作转换为 API 调用。不执行 Agent 动作。', input: '用户交互事件、后端返回的状态', output: 'REST 请求、WebSocket 订阅', upstream: '用户 / 集成 App', downstream: 'Agent Server、Automation Server', repo: 'OpenHands/OpenHands', tip: '读 docs/architecture.md 的 system boundary 段落。' },
  { name: 'TypeScript Client', role: '浏览器兼容的 Agent Server API 客户端，提供 typed browser access。', input: '前端方法调用', output: 'HTTP / WebSocket 请求', upstream: 'Agent Canvas', downstream: 'Agent Server', repo: 'software-agent-sdk / clients/typescript', tip: '原 typescript-client 仓库 README 已标注迁移。' },
  { name: 'Agent Server', role: 'FastAPI HTTP/WebSocket 服务，管理 conversation、文件、bash、事件与鉴权。', input: 'REST / WebSocket 请求', output: '事件流、文件与命令结果', upstream: 'Canvas / CLI / 自定义客户端', downstream: 'SDK Agent、Workspace', repo: 'software-agent-sdk / openhands-agent-server', tip: '核对 /api/conversations/* 与鉴权头 X-Session-API-Key。' },
  { name: 'Agent', role: '实现 reasoning-action loop：调用 LLM 决策，调用 Tool 执行，再用 Observation 继续推理。', input: '用户消息、事件历史', output: 'Action、状态更新事件', upstream: 'Conversation', downstream: 'LLM、Tool', repo: 'software-agent-sdk / openhands.sdk', tip: '对照官方 getting-started 示例中 Agent(llm=..., tools=[...]) 的构造方式。' },
  { name: 'Tool System', role: '定义 Action / Observation / Tool / Executor 的类型化契约，并内置校验与安全评估。', input: 'LLM 生成的结构化 Action', output: 'Observation', upstream: 'Agent', downstream: 'Workspace 环境', repo: 'software-agent-sdk / openhands.tools', tip: '工具在 Agent 所在环境运行，不是通过 workspace API “远程调用”。' },
  { name: 'Workspace', role: '抽象工作目录、文件系统与命令执行环境，可替换为本地、容器或远程实现。', input: '工具的文件 / 命令请求', output: '文件内容、退出码、错误', upstream: 'Tool Executor', downstream: 'Local FS / Docker / Remote Server', repo: 'openhands.sdk + openhands.workspace', tip: '比较 LocalWorkspace、DockerWorkspace、RemoteAPIWorkspace 的切换方式。' },
  { name: 'Automation', role: '决定何时运行：维护定义、cron 调度、webhook、运行历史并向 Agent Server 派发任务。', input: '定时 / webhook 事件', output: 'conversation 派发、运行记录', upstream: 'GitHub / Slack / 定时器', downstream: 'Agent Server、Sandbox', repo: 'OpenHands/automation', tip: '关注 scheduler.py 与 dispatcher.py 的职责边界。' },
  { name: 'Extensions', role: '公共扩展注册表，提供可复用 skills、plugins、apps 与集成 catalog。', input: 'Skill / Plugin / App 定义', output: '被 Agent 或 Canvas 加载的能力', upstream: '贡献者', downstream: 'SDK Agent、Canvas', repo: 'OpenHands/extensions', tip: 'skills/<id>/SKILL.md 是 skill 定义，plugins 还包含 hooks/ 与 scripts/。' },
];

const TOOLS = [
  { name: 'read_file', schema: '{ path: string }', sample: 'src/main.ts', output: '1  import { Agent } from "openhands.sdk";\n2  ...\n共 86 行，读取成功。' },
  { name: 'write_file', schema: '{ path: string, content: string }', sample: 'NOTES.md\n# 研究记录', output: '文件 NOTES.md 已写入，大小 42 字节。' },
  { name: 'execute_command', schema: '{ command: string, timeout?: number }', sample: 'npm test', output: 'exit_code=0\nTests: 24 passed, 0 failed\n耗时 3.4s' },
];

const EVENTS = [
  { type: 'ConversationStarted', source: 'Agent Server', detail: '会话创建完成，分配 conversation_id 并初始化事件存储。', payload: '{ "conversation_id": "conv-8f21", "status": "created" }' },
  { type: 'UserMessageReceived', source: 'Agent Canvas', detail: '用户消息被写入事件历史，触发 Agent 运行。', payload: '{ "role": "user", "text": "为仓库补充 README" }' },
  { type: 'ActionRequested', source: 'Agent / LLM', detail: 'LLM 返回结构化动作，请求执行工具。', payload: '{ "tool": "TerminalTool", "action": "ls -la" }' },
  { type: 'ActionStarted', source: 'Tool Executor', detail: '动作通过校验并开始执行，事件流推送到前端。', payload: '{ "status": "running", "started_at": "..." }' },
  { type: 'ActionCompleted', source: 'Tool Executor', detail: '工具执行结束，记录退出码与耗时。', payload: '{ "exit_code": 0, "duration_ms": 210 }' },
  { type: 'ObservationReceived', source: 'Agent', detail: '观察结果写回上下文，触发下一轮推理。', payload: '{ "observation": "...", "event_id": "evt-41" }' },
  { type: 'ConversationFinished', source: 'Agent', detail: '任务完成，产生最终状态更新事件。', payload: '{ "status": "finished", "summary": "README 已创建" }' },
];

const DATASETS = [
  { name: '基线 Agent', success: 62, pass: 58, time: 146, tokens: 18400, cost: 0.82, error: 21 },
  { name: '加入工具校验', success: 78, pass: 74, time: 121, tokens: 15600, cost: 0.69, error: 12 },
  { name: '完整方案（Workspace + 事件流）', success: 91, pass: 88, time: 94, tokens: 13200, cost: 0.61, error: 5 },
  { name: '回归示例', success: 54, pass: 49, time: 188, tokens: 24600, cost: 1.14, error: 29 },
];

export function renderLabs(): string {
  return `
<div class="page-head">
  <div class="section-eyebrow">Interactive Lab</div>
  <h1>交互实验室</h1>
  <p>六组纯浏览器端模拟：不连接 OpenHands 后端，不执行真实系统命令。它们用于把架构概念转译为可观察的状态变化。</p>
</div>
<div class="lab-tabs" role="tablist">
  ${TABS.map((t) => `<button type="button" class="lab-tab" data-lab="${t.key}" role="tab">${t.label}</button>`).join('')}
</div>
<div id="lab-panel" class="lab-panel" aria-live="polite"></div>`;
}

function loopPanel(): string {
  return `<h2>Agent Loop Simulator</h2><p>点击“下一步”，观察任务如何从用户输入经过 LLM 决策、工具调用与观察，最终变成答案。</p>
  <div class="lab-flow" id="loop-flow">${LOOP_STEPS.map((s, i) => `<span class="flow-node ${i === 0 ? 'active' : ''}" data-step="${i}">${s.node}</span>${i < LOOP_STEPS.length - 1 ? '<span class="flow-arrow">→</span>' : ''}`).join('')}</div>
  <div class="lab-controls"><button type="button" class="btn btn-light" id="loop-next">下一步 →</button><button type="button" class="btn btn-light" id="loop-reset">重置</button></div>
  <dl class="lab-state" id="loop-state"></dl>
  <div class="lab-log" id="loop-log"></div>`;
}

function architecturePanel(): string {
  return `<h2>Architecture Explorer</h2><p>点击左侧组件，查看它的职责、输入输出、上下游以及对应源码仓库。</p>
  <div class="arch-explorer"><div class="arch-nodes">${ARCH_NODES.map((n, i) => `<button type="button" class="arch-node ${i === 0 ? 'active' : ''}" data-arch="${i}">${n.name}</button>`).join('')}</div><div class="arch-detail" id="arch-detail"></div></div>`;
}

function toolsPanel(): string {
  return `<h2>Tool Calling Simulator</h2><p>选择一个工具并填写模拟输入。所有输出均为本地预置文本，不会执行任何真实命令。</p>
  <div class="tool-select">${TOOLS.map((t, i) => `<button type="button" class="lab-tab ${i === 0 ? 'active' : ''}" data-tool="${i}">${t.name}</button>`).join('')}</div>
  <label for="tool-input" style="font-size:12px;color:var(--text-muted)">模拟输入</label>
  <textarea class="tool-input" id="tool-input" spellcheck="false">${TOOLS[0].sample}</textarea>
  <div class="lab-controls"><button type="button" class="btn btn-light" id="tool-run">运行模拟调用</button></div>
  <div id="tool-result"></div>`;
}

function eventsPanel(): string {
  return `<h2>Event Timeline</h2><p>点击事件查看详细 payload。事件名称用于教学示意，实际事件类型请以 SDK 源码为准。</p>
  <div class="event-timeline">${EVENTS.map((e, i) => `<div class="event-item ${i === 0 ? 'active' : ''}"><button type="button" data-event="${i}">${e.type}</button></div>`).join('')}</div>
  <div id="event-detail" class="arch-detail"></div>`;
}

function sandboxPanel(): string {
  return `<h2>Sandbox Explorer</h2><p>点击 SVG 中的组件，查看它在安全边界中的位置与权限含义。灰色虚线表示默认拒绝，彩色实线表示受控允许。</p>
  <svg class="sandbox-svg" viewBox="0 0 760 400" role="img" aria-label="Sandbox 安全边界交互图">
    <rect x="10" y="10" width="740" height="380" rx="16" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="30" y="40" font-family="sans-serif" font-size="15" font-weight="800" fill="#0f172a">Host（宿主机）</text>
    <g class="hit" data-zone="host"><rect x="30" y="60" width="700" height="310" rx="13" fill="#fff" stroke="#94a3b8" stroke-dasharray="6 5"/><text x="50" y="84" font-family="sans-serif" font-size="12" fill="#64748b">用户文件 / 密钥 / Docker Engine</text></g>
    <g class="hit" data-zone="container"><rect x="70" y="105" width="620" height="235" rx="13" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/><text x="90" y="130" font-family="sans-serif" font-size="13" font-weight="700" fill="#1d4ed8">Container（Agent Server uid 10001）</text></g>
    <g class="hit" data-zone="workspace"><rect x="110" y="155" width="240" height="150" rx="11" fill="#ecfdf5" stroke="#059669" stroke-width="2"/><text x="230" y="200" font-family="sans-serif" font-size="14" font-weight="800" fill="#065f46" text-anchor="middle">Workspace</text><text x="230" y="222" font-family="sans-serif" font-size="11" fill="#047857" text-anchor="middle">/projects（仅挂载必要目录）</text></g>
    <g class="hit" data-zone="filesystem"><rect x="380" y="155" width="140" height="65" rx="10" fill="#ecfeff" stroke="#0891b2" stroke-width="2"/><text x="450" y="192" font-family="sans-serif" font-size="12" font-weight="700" fill="#0e7490" text-anchor="middle">File System</text></g>
    <g class="hit" data-zone="network"><rect x="540" y="155" width="120" height="65" rx="10" fill="#fffbeb" stroke="#d97706" stroke-width="2"/><text x="600" y="192" font-family="sans-serif" font-size="12" font-weight="700" fill="#b45309" text-anchor="middle">Network</text></g>
    <g class="hit" data-zone="secrets"><rect x="380" y="245" width="280" height="60" rx="10" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/><text x="520" y="281" font-family="sans-serif" font-size="12" font-weight="700" fill="#b91c1c" text-anchor="middle">Secrets（环境变量 / 卷）</text></g>
    <path d="M 350 230 L 380 188" stroke="#059669" stroke-width="2" fill="none"/>
    <path d="M 660 188 L 660 188" stroke="#d97706" stroke-width="2" fill="none"/>
  </svg>
  <div id="sandbox-detail" class="arch-detail" style="margin-top:16px"></div>`;
}

function evaluationPanel(): string {
  return `<h2>Agent Evaluation Lab</h2><p>切换示例数据集，比较不同工程方案下的质量与成本指标。数据为教学模拟，不代表官方基准。</p>
  <div class="lab-controls" id="eval-tabs">${DATASETS.map((d, i) => `<button type="button" class="lab-tab ${i === 0 ? 'active' : ''}" data-dataset="${i}">${d.name}</button>`).join('')}</div>
  <div id="eval-metrics"></div>`;
}

const PANELS: Record<LabKey, () => string> = {
  loop: loopPanel,
  architecture: architecturePanel,
  tools: toolsPanel,
  events: eventsPanel,
  sandbox: sandboxPanel,
  evaluation: evaluationPanel,
};

const SANDBOX_INFO: Record<string, string> = {
  host: '宿主机拥有全部权限。Agent 不应默认获得宿主机 root 或家目录的完整访问权。',
  container: '容器是主要隔离边界。官方 Docker 镜像使用 uid 10001，需显式授权 workspace 读写权限。',
  workspace: '仅挂载任务需要的目录。多个 conversation 共享同一 host workspace 时仍可能互相修改文件，应使用不同目录或 worktree。',
  filesystem: '容器内文件系统视图与宿主机隔离；bind mount 的范围决定 Agent 能看到什么。',
  network: '网络出口应按需限制。无论容器还是宿主机运行，都不应默认允许任意出站访问。',
  secrets: 'API Key 与 Secret 应通过受控注入提供，并避免写入仓库或事件轨迹。OH_SECRET_KEY 用于加密会话中的敏感值。',
};

function renderEval(index: number): void {
  const d = DATASETS[index];
  const metrics = [
    { label: 'Success Rate', value: `${d.success}%`, bar: d.success, note: '任务完成率' },
    { label: 'Test Pass Rate', value: `${d.pass}%`, bar: d.pass, note: '测试通过率' },
    { label: 'Execution Time', value: `${d.time}s`, bar: Math.min(100, Math.round(d.time / 2)), note: '平均执行时长' },
    { label: 'Token Usage', value: d.tokens.toLocaleString(), bar: Math.min(100, Math.round(d.tokens / 300)), note: '平均 Token 数' },
    { label: 'Cost', value: `$${d.cost.toFixed(2)}`, bar: Math.min(100, Math.round(d.cost * 60)), note: '单次任务成本' },
    { label: 'Error Rate', value: `${d.error}%`, bar: d.error, note: '工具 / 命令错误率' },
  ];
  const el = document.getElementById('eval-metrics');
  if (el) el.innerHTML = `<div class="metric-grid">${metrics.map((m) => `<div class="metric-card"><span>${m.label}</span><strong>${m.value}</strong><small>${m.note}</small><div class="bar"><i style="width:${m.bar}%"></i></div></div>`).join('')}</div><div class="lab-log">观察：工具校验与 Workspace 抽象通常能减少无效重试；但真实效果必须用你的任务集与模型配置重新测量。</div>`;
}

export function initLabs(initial: LabKey): void {
  let active: LabKey = TABS.some((t) => t.key === initial) ? initial : 'loop';
  const tabs = document.querySelectorAll<HTMLButtonElement>('.lab-tab[data-lab]');
  const panel = document.getElementById('lab-panel');

  function show(key: LabKey): void {
    active = key;
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.lab === key));
    if (!panel) return;
    panel.innerHTML = PANELS[key]();
    bindPanel(key);
    if (key === 'architecture') showArch(0);
    if (key === 'events') showEvent(0);
    if (key === 'sandbox') showSandbox('workspace');
    if (key === 'evaluation') renderEval(0);
    if (key === 'loop') showLoop(0);
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => {
    const key = tab.dataset.lab as LabKey;
    show(key);
    history.replaceState(null, '', `#/labs?lab=${key}`);
  }));

  function showLoop(index: number): void {
    const step = LOOP_STEPS[index];
    const state = document.getElementById('loop-state');
    const log = document.getElementById('loop-log');
    document.querySelectorAll('#loop-flow .flow-node').forEach((n) => n.classList.toggle('active', Number((n as HTMLElement).dataset.step) === index));
    if (state) state.innerHTML = `<dt>当前阶段</dt><dd>${step.node} — ${step.title}</dd><dt>LLM</dt><dd>${escapeHtml(step.llm)}</dd><dt>Tool Call</dt><dd>${escapeHtml(step.tool)}</dd><dt>Observation</dt><dd>${escapeHtml(step.observation)}</dd>`;
    if (log) log.textContent = `[${index + 1}/${LOOP_STEPS.length}] ${step.log}`;
  }

  function showArch(index: number): void {
    const n = ARCH_NODES[index];
    const el = document.getElementById('arch-detail');
    document.querySelectorAll('[data-arch]').forEach((b) => b.classList.toggle('active', Number((b as HTMLElement).dataset.arch) === index));
    if (el) el.innerHTML = `<h3>${n.name}</h3><dl><dt>职责</dt><dd>${n.role}</dd><dt>输入</dt><dd>${n.input}</dd><dt>输出</dt><dd>${n.output}</dd><dt>上游</dt><dd>${n.upstream}</dd><dt>下游</dt><dd>${n.downstream}</dd><dt>源码仓库</dt><dd><code>${n.repo}</code></dd><dt>研究建议</dt><dd>${n.tip}</dd></dl>`;
  }

  function showEvent(index: number): void {
    const e = EVENTS[index];
    const el = document.getElementById('event-detail');
    document.querySelectorAll('[data-event]').forEach((b) => b.classList.toggle('active', Number((b as HTMLElement).dataset.event) === index));
    document.querySelectorAll('.event-item').forEach((b, i) => b.classList.toggle('active', i === index));
    if (el) el.innerHTML = `<h3>${e.type}</h3><dl><dt>来源</dt><dd>${e.source}</dd><dt>说明</dt><dd>${e.detail}</dd><dt>示意 Payload</dt><dd><code>${escapeHtml(e.payload)}</code></dd></dl>`;
  }

  function showSandbox(zone: string): void {
    const el = document.getElementById('sandbox-detail');
    if (el) el.innerHTML = `<h3>${escapeHtml(zone.toUpperCase())}</h3><p style="margin:0;color:var(--text-soft);font-size:13px">${SANDBOX_INFO[zone] || ''}</p>`;
  }

  function bindPanel(key: LabKey): void {
    if (key === 'loop') {
      let step = 0;
      showLoop(step);
      document.getElementById('loop-next')?.addEventListener('click', () => { step = (step + 1) % LOOP_STEPS.length; showLoop(step); });
      document.getElementById('loop-reset')?.addEventListener('click', () => { step = 0; showLoop(step); });
      document.querySelectorAll<HTMLElement>('#loop-flow .flow-node').forEach((n) => n.addEventListener('click', () => { step = Number(n.dataset.step); showLoop(step); }));
    }
    if (key === 'architecture') {
      document.querySelectorAll<HTMLElement>('[data-arch]').forEach((b) => b.addEventListener('click', () => showArch(Number(b.dataset.arch))));
    }
    if (key === 'tools') {
      let selected = 0;
      document.querySelectorAll<HTMLElement>('[data-tool]').forEach((b) => b.addEventListener('click', () => {
        selected = Number(b.dataset.tool);
        document.querySelectorAll('[data-tool]').forEach((x) => x.classList.toggle('active', x === b));
        const input = document.getElementById('tool-input') as HTMLTextAreaElement | null;
        if (input) input.value = TOOLS[selected].sample;
      }));
      document.getElementById('tool-run')?.addEventListener('click', () => {
        const t = TOOLS[selected];
        const input = (document.getElementById('tool-input') as HTMLTextAreaElement | null)?.value || '';
        const result = document.getElementById('tool-result');
        if (!result) return;
        result.innerHTML = '<div class="lab-log">[1/3] 校验参数 Schema...\n[2/3] 创建 Tool Executor...\n[3/3] 执行中...</div>';
        window.setTimeout(() => {
          result.innerHTML = `<dl class="lab-state"><dt>工具</dt><dd>${t.name}</dd><dt>Schema</dt><dd>${escapeHtml(t.schema)}</dd><dt>输入</dt><dd>${escapeHtml(input)}</dd><dt>状态</dt><dd>completed（模拟）</dd><dt>Observation</dt><dd>${escapeHtml(t.output)}</dd></dl><div class="lab-log">[完成] 以上输出为本地预置文本，没有执行任何真实系统命令。</div>`;
        }, 420);
      });
    }
    if (key === 'events') {
      document.querySelectorAll<HTMLElement>('[data-event]').forEach((b) => b.addEventListener('click', () => showEvent(Number(b.dataset.event))));
    }
    if (key === 'sandbox') {
      document.querySelectorAll<SVGGElement>('.sandbox-svg .hit').forEach((g) => g.addEventListener('click', () => showSandbox(g.dataset.zone || '')));
    }
    if (key === 'evaluation') {
      document.querySelectorAll<HTMLElement>('[data-dataset]').forEach((b) => b.addEventListener('click', () => {
        const index = Number(b.dataset.dataset);
        document.querySelectorAll('[data-dataset]').forEach((x) => x.classList.toggle('active', x === b));
        renderEval(index);
      }));
    }
  }

  show(active);
}
