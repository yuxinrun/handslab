import { articles } from '../data/articles.generated';
import { CORE_MODULES, OFFICIAL_DOCS, OFFICIAL_REPOS, SITE } from '../data/site';
import { asset, escapeHtml } from '../utils/base';

const practice = [
  { title: 'Mini Coding Agent', desc: '从零实现 Agent Loop、工具调用与 Action / Observation，用不到 300 行代码理解核心机制。', link: '#/article/practice/01-mini-coding-agent', icon: '◆' },
  { title: 'Shell 工具与执行隔离', desc: '实现一个可执行命令的工具，并为它加上工作目录限制与超时控制。', link: '#/article/tools/01-tool-system-design', icon: '⌘' },
  { title: 'WebSocket 事件推送', desc: '把 Agent 的每一步决策变成事件流，让前端实时感知执行状态。', link: '#/article/events/05-event-system', icon: '↗' },
];

const recommended = [
  'getting-started/01-what-is-openhands',
  'architecture/01-overall-architecture',
  'architecture/04-software-agent-sdk',
  'agent-core/02-agent-loop',
  'tools/01-tool-system-design',
  'workspace/02-workspace-architecture',
  'server/03-rest-api',
  'practice/01-mini-coding-agent',
];

function repoColor(index: number): string {
  return ['#3b6df6', '#7c4dff', '#06b6d4', '#f59e0b', '#10b981'][index % 5];
}

export function renderHome(): string {
  const recHtml = recommended.map((id, i) => {
    const a = articles.find((x) => x.id === id);
    if (!a) return '';
    return `<li><a href="#/article/${a.id}"><span class="day-no">${String(i + 1).padStart(2, '0')}</span> ${escapeHtml(a.title)}</a></li>`;
  }).join('');

  return `
<section class="hero">
  <div class="hero-grid"></div>
  <div class="hero-inner">
    <div>
      <span class="hero-kicker"><span class="pulse"></span> 源码驱动 · 持续研究 · ${SITE.researchDate}</span>
      <h1>HandsLab</h1>
      <h2>深入 OpenHands，理解 AI Software Engineering Agent 的工程架构。</h2>
      <p>从 Agent Loop、Tool System 到 Workspace、Sandbox 和 Agent Server，通过源码研究与实战，掌握构建下一代 Coding Agent 的核心方法。</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#/article/getting-started/01-what-is-openhands">开始学习 →</a>
        <a class="btn btn-ghost" href="#/article/architecture/01-overall-architecture">探索架构</a>
        <a class="btn btn-ghost" href="${SITE.repo}" target="_blank" rel="noopener noreferrer">GitHub 项目</a>
      </div>
      <div class="hero-stats">
        <div><strong>${articles.length}</strong><span>深度中文文章</span></div>
        <div><strong>16</strong><span>本地 SVG 架构图</span></div>
        <div><strong>6</strong><span>浏览器交互实验室</span></div>
        <div><strong>30</strong><span>天学习计划</span></div>
      </div>
    </div>
    <div class="hero-visual">
      <div class="hero-visual-card">
        <img src="${asset('/images/hero-agent.svg')}" alt="HandsLab Agent 执行流程主视觉" width="880" height="520" />
        <div class="hero-caption">Agent Loop · Tool System · Workspace · Event Stream</div>
      </div>
    </div>
  </div>
</section>

<section class="home-section">
  <div class="section-head">
    <div class="section-eyebrow">About HandsLab</div>
    <h2>一个面向 AI Agent 开发者的中文知识库</h2>
    <p>HandsLab 不是新闻聚合站，也不是 API 文档翻译。我们以 OpenHands 的官方仓库与源码为证据，拆解 Coding Agent 是如何被真正工程化的：从界面到服务、从推理循环到沙箱边界、从事件流到自动化调度。</p>
  </div>
  <div class="card-grid">
    <div class="info-card"><div class="card-icon">◈</div><h3>只写经过核验的内容</h3><p>每篇文章标注研究日期、适用版本与官方源码路径。无法从当前源码确认的内容，明确标注“待核实”。</p></div>
    <div class="info-card"><div class="card-icon">⌁</div><h3>区分历史与当前架构</h3><p>OpenHands 已从单仓库演进为多仓库体系。我们明确区分 Agent Canvas、SDK、Agent Server 与旧版 Runtime。</p></div>
    <div class="info-card"><div class="card-icon">⬡</div><h3>从理解到动手</h3><p>架构文章讲清组件边界，实战文章给出可运行代码。教学实现会明确标注与官方实现的差异。</p></div>
  </div>
</section>

<section class="home-section alt">
  <div class="section-inner">
    <div class="section-head">
      <div class="section-eyebrow">Architecture Overview</div>
      <h2>OpenHands 当前架构一图看懂</h2>
      <p>Agent Canvas 负责交互，Agent Server 负责服务化，Software Agent SDK 定义 Agent 行为，Workspace 决定执行环境，Automation 决定何时运行。</p>
    </div>
    <figure class="arch-figure">
      <img src="${asset('/diagrams/overall-architecture.svg')}" alt="OpenHands 当前整体架构图" loading="lazy" />
      <figcaption>图 1：OpenHands 多仓库协作架构（研究快照 ${SITE.researchDate}）</figcaption>
    </figure>
  </div>
</section>

<section class="home-section">
  <div class="section-head">
    <div class="section-eyebrow">Core Modules</div>
    <h2>核心技术模块</h2>
    <p>理解这六个模块，就理解了 OpenHands 的工程全貌。点击卡片进入对应源码仓库。</p>
  </div>
  <div class="card-grid">
    ${CORE_MODULES.map((m) => `
      <div class="info-card">
        <div class="card-icon">${{ canvas: '▣', sdk: '◇', server: '⌘', automation: '◷', extensions: '✦', client: '⟐' }[m.icon]}</div>
        <h3>${escapeHtml(m.label)}</h3>
        <p>${escapeHtml(m.desc)}</p>
        <code>${escapeHtml(m.repo)}</code>
      </div>`).join('')}
  </div>
</section>

<section class="home-section alt">
  <div class="section-inner">
    <div class="section-head">
      <div class="section-eyebrow">Learning Path</div>
      <h2>九个阶段，从读者到构建者</h2>
      <p>每一阶段都有学习目标、推荐文章、代码实践与自测问题。完整 30 天计划见学习路线页面。</p>
    </div>
    <div class="path-steps">
      <div class="path-step"><h3>理解 Agent 基础</h3><p> Agent / Coding Agent / SWE Agent 的边界与典型任务。</p></div>
      <div class="path-step"><h3>理解 OpenHands 架构</h3><p>多仓库职责、组件通信与一次任务的完整时序。</p></div>
      <div class="path-step"><h3>理解 Agent Core</h3><p>Agent Loop、LLM 决策、Action / Observation 与状态管理。</p></div>
      <div class="path-step"><h3>理解 Tool System</h3><p>注册、Schema、执行器、错误处理与 MCP 集成。</p></div>
      <div class="path-step"><h3>理解 Workspace 与 Sandbox</h3><p>本地、容器、远程环境与文件系统隔离。</p></div>
      <div class="path-step"><h3>理解 Agent Server</h3><p>REST / WebSocket、鉴权与多用户隔离。</p></div>
      <div class="path-step"><h3>理解 Automation</h3><p>定时、Webhook、派发与运行历史。</p></div>
      <div class="path-step"><h3>构建 Mini Coding Agent</h3><p>用最小实现复刻核心循环与工具契约。</p></div>
      <div class="path-step"><h3>构建完整 Agent 系统</h3><p>服务化、事件流、安全边界与可观测性。</p></div>
    </div>
    <p style="margin-top:24px"><a class="btn btn-light" href="#/learning-path">查看 30 天学习计划 →</a></p>
  </div>
</section>

<section class="home-section">
  <div class="section-head">
    <div class="section-eyebrow">Hands-on Practice</div>
    <h2>实战项目</h2>
    <p>所有代码都是教学实现，用于理解机制；它们不是 OpenHands 官方源码。</p>
  </div>
  <div class="card-grid">
    ${practice.map((p) => `<div class="info-card"><div class="card-icon">${p.icon}</div><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.desc)}</p><a class="card-link" href="${p.link}">阅读实战 →</a></div>`).join('')}
  </div>
</section>

<section class="home-section alt">
  <div class="section-inner">
    <div class="section-head">
      <div class="section-eyebrow">Interactive Lab</div>
      <h2>交互实验室</h2>
      <p>六组纯浏览器端模拟，不连接真实后端、不执行系统命令。用于把抽象概念变成可观察的状态变化。</p>
    </div>
    <div class="card-grid">
      <div class="info-card"><h3>Agent Loop Simulator</h3><p>逐步观察任务从用户输入到最终答案的完整循环。</p><a class="card-link" href="#/labs?lab=loop">打开实验 →</a></div>
      <div class="info-card"><h3>Architecture Explorer</h3><p>点击组件，查看职责、输入输出、上下游与源码仓库。</p><a class="card-link" href="#/labs?lab=architecture">打开实验 →</a></div>
      <div class="info-card"><h3>Tool Calling Simulator</h3><p>模拟 read_file、write_file 与 execute_command 的调用。</p><a class="card-link" href="#/labs?lab=tools">打开实验 →</a></div>
      <div class="info-card"><h3>Event Timeline</h3><p>点击事件，查看一次会话中的事件详情与数据结构。</p><a class="card-link" href="#/labs?lab=events">打开实验 →</a></div>
      <div class="info-card"><h3>Sandbox Explorer</h3><p>用可点击的 SVG 理解容器、网络与密钥的边界。</p><a class="card-link" href="#/labs?lab=sandbox">打开实验 →</a></div>
      <div class="info-card"><h3>Agent Evaluation Lab</h3><p>切换示例数据，比较成功率、耗时、Token 与成本。</p><a class="card-link" href="#/labs?lab=evaluation">打开实验 →</a></div>
    </div>
  </div>
</section>

<section class="home-section">
  <div class="split">
    <div>
      <div class="section-head">
        <div class="section-eyebrow">Source Access</div>
        <h2>源码阅读入口</h2>
        <p>以下 commit 为本次研究时记录的 main 分支快照，后续官方仓库可能继续演进。</p>
      </div>
      <div class="repo-list">
        ${OFFICIAL_REPOS.map((r, i) => `
          <a class="repo-item" href="${r.url}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit">
            <span class="repo-dot" style="background:${repoColor(i)}"></span>
            <span><strong>${escapeHtml(r.name)}</strong><p>${escapeHtml(r.role)}</p><code>${escapeHtml(r.commit.slice(0, 12))} · ${escapeHtml(r.date)}</code></span>
          </a>`).join('')}
      </div>
    </div>
    <div>
      <div class="section-head">
        <div class="section-eyebrow">Recommended Order</div>
        <h2>推荐学习顺序</h2>
        <p>如果只能读八篇，就从这些开始。</p>
      </div>
      <div class="info-card" style="padding:18px 22px">
        <ol style="padding-left:20px;margin:0;color:var(--text-soft);font-size:13.5px">${recHtml}</ol>
      </div>
      <div class="section-head" style="margin-top:30px">
        <div class="section-eyebrow">Official Docs</div>
        <h2 style="font-size:22px">官方文档</h2>
      </div>
      <div class="info-card" style="padding:18px 22px">
        <ul style="padding-left:20px;margin:0;font-size:13.5px">${OFFICIAL_DOCS.map((d) => `<li><a href="${d.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(d.label)}</a></li>`).join('')}</ul>
      </div>
    </div>
  </div>
</section>

<section class="home-section" style="padding-top:0">
  <div class="home-cta">
    <h2>准备好构建自己的 Coding Agent 了吗？</h2>
    <p>先理解机制，再动手实现，最后回到源码验证你的判断。</p>
    <a class="btn btn-primary" href="#/article/practice/01-mini-coding-agent">从 Mini Agent 开始 →</a>
  </div>
</section>

<footer class="home-footer">
  <div class="footer-inner">
    <div><strong>HandsLab</strong> · 深入 OpenHands，理解 AI Software Engineering Agent 的工程架构。<br />内容基于公开官方仓库与文档研究，非 OpenHands 官方项目。</div>
    <div><span class="ver-badge">v${SITE.version}</span> · 研究日期 ${SITE.researchDate}<br /><a href="${SITE.repo}" target="_blank" rel="noopener noreferrer">GitHub</a> · <a href="#/learning-path">学习路线</a> · <a href="#/labs">实验室</a></div>
  </div>
</footer>`;
}
