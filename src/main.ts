import './styles/main.css';
import { articles } from './data/articles.generated';
import { CATEGORY_LABELS, CATEGORY_ORDER, SITE } from './data/site';
import { escapeHtml } from './utils/base';
import { renderMarkdown } from './utils/markdown';
import { renderHome } from './pages/home';
import { buildToc, renderArticle, tocHtml, type TocItem } from './pages/article';
import { initLabs, renderLabs } from './pages/labs';
import { renderLearningPath } from './pages/learning-path';
import type { LabKey } from './pages/labs';

type Route =
  | { name: 'home' }
  | { name: 'article'; id: string }
  | { name: 'labs'; lab: LabKey }
  | { name: 'learning' }
  | { name: 'articles'; category?: string }
  | { name: 'search' }
  | { name: '404' };

const FAV_KEY = 'handslab-favorites';
const THEME_KEY = 'handslab-theme';
const mdModules = import.meta.glob('/content/**/*.md', { query: '?raw', import: 'default' });

const app = document.getElementById('app') as HTMLElement;
app.innerHTML = `
<div id="progress-bar"></div>
<header class="topbar">
  <div class="topbar-inner">
    <button type="button" class="icon-btn menu-toggle" id="menu-toggle" aria-label="打开导航菜单">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <a class="brand" href="#/"><span class="brand-mark">H</span><span>HandsLab</span></a>
    <nav class="top-nav">
      <a href="#/" data-nav="home">首页</a>
      <a href="#/article/architecture/01-overall-architecture" data-nav="architecture">架构</a>
      <a href="#/labs" data-nav="labs">实验室</a>
      <a href="#/learning-path" data-nav="learning">学习路线</a>
    </nav>
    <div class="top-actions">
      <button type="button" class="search-trigger" id="search-trigger" aria-label="搜索文章">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <span>搜索文章</span><kbd>/</kbd>
      </button>
      <button type="button" class="icon-btn" id="theme-toggle" aria-label="切换主题"></button>
      <a class="github-btn" href="${SITE.repo}" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>
  </div>
</header>
<div class="shell">
  <aside class="sidebar" id="sidebar" aria-label="章节导航"></aside>
  <main class="main" id="main"></main>
  <aside class="toc" id="toc" aria-label="本页目录"></aside>
</div>
<div id="drawer-overlay"></div>
<button type="button" id="back-to-top" aria-label="返回顶部">↑</button>
<div class="modal" id="search-modal" role="dialog" aria-modal="true" aria-label="站内搜索">
  <div class="modal-card">
    <div class="modal-input-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input type="search" id="search-input" placeholder="搜索标题、描述、标签或正文摘要…" autocomplete="off" />
      <kbd>ESC</kbd>
    </div>
    <div class="search-results" id="search-results"></div>
    <div class="search-hint">本地搜索索引 · 共 ${articles.length} 篇 · 不需要后端服务</div>
  </div>
</div>
<div class="toast" id="toast"></div>`;

const mainEl = document.getElementById('main') as HTMLElement;
const sidebarEl = document.getElementById('sidebar') as HTMLElement;
const tocEl = document.getElementById('toc') as HTMLElement;

function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') as string[]; } catch { return []; }
}

function toggleFavorite(id: string): boolean {
  const favs = getFavorites();
  const index = favs.indexOf(id);
  if (index >= 0) favs.splice(index, 1); else favs.push(id);
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* ignore */ }
  return index < 0;
}

function showToast(message: string): void {
  const toast = document.getElementById('toast') as HTMLElement;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1600);
}

function parseRoute(): Route {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  if (path === '/' || path === '/index.html') return { name: 'home' };
  if (path.startsWith('/article/')) return { name: 'article', id: decodeURIComponent(path.slice('/article/'.length)) };
  if (path === '/labs') return { name: 'labs', lab: (params.get('lab') as LabKey) || 'loop' };
  if (path === '/learning-path') return { name: 'learning' };
  if (path === '/articles') return { name: 'articles', category: params.get('category') || undefined };
  if (path === '/search') return { name: 'search' };
  return { name: '404' };
}

function renderSidebar(route: Route): void {
  const activeId = route.name === 'article' ? route.id : '';
  const favs = getFavorites();
  const quick = [
    { href: '#/', label: '⌂  首页', key: 'home' },
    { href: '#/article/architecture/01-overall-architecture', label: '◈  架构总览', key: 'architecture' },
    { href: '#/labs', label: '⬡  交互实验室', key: 'labs' },
    { href: '#/learning-path', label: '◷  学习路线', key: 'learning' },
  ];
  const quickHtml = quick.map((q) => {
    const active = (route.name === 'home' && q.key === 'home') || (route.name === 'labs' && q.key === 'labs') || (route.name === 'learning' && q.key === 'learning');
    return `<a class="quick-link ${active ? 'active' : ''}" href="${q.href}"><span class="qi">${q.label.slice(0, 1)}</span>${q.label.slice(2)}</a>`;
  }).join('');

  const groups = CATEGORY_ORDER.map((cat) => {
    const list = articles.filter((a) => a.category === cat);
    if (!list.length) return '';
    const open = list.some((a) => a.id === activeId) || cat === 'getting-started' || cat === 'architecture';
    return `<details class="side-group" ${open ? 'open' : ''}>
      <summary>${escapeHtml(CATEGORY_LABELS[cat] || cat)}<span class="chev">▶</span></summary>
      <div class="side-links">${list.map((a) => `<a class="side-link ${a.id === activeId ? 'active' : ''}" href="#/article/${a.id}">${escapeHtml(a.title)}${favs.includes(a.id) ? '<span class="fav-star">★</span>' : ''}</a>`).join('')}</div>
    </details>`;
  }).join('');

  const favGroup = favs.length ? `<details class="side-group" open><summary>我的收藏<span class="chev">▶</span></summary><div class="side-links">${favs.filter((id) => articles.some((a) => a.id === id)).map((id) => {
    const a = articles.find((x) => x.id === id)!;
    return `<a class="side-link ${id === activeId ? 'active' : ''}" href="#/article/${id}">★ ${escapeHtml(a.title)}</a>`;
  }).join('')}</div></details>` : '';

  sidebarEl.innerHTML = `<div class="sidebar-title">导航</div><div class="side-quick">${quickHtml}</div><div class="sidebar-title">教程目录</div>${groups}${favGroup}
    <div class="side-note"><strong>研究快照</strong><br />${SITE.researchDate} · v${SITE.version}<br />源码引用与版本说明见文章页脚。</div>`;
}

function renderArticlesIndex(category?: string): string {
  const cats = category ? [category] : CATEGORY_ORDER.filter((c) => articles.some((a) => a.category === c));
  return `<div class="page-head"><div class="section-eyebrow">Article Index</div><h1>${category ? escapeHtml(CATEGORY_LABELS[category] || category) : '全部文章'}</h1><p>共 ${category ? articles.filter((a) => a.category === category).length : articles.length} 篇。所有文章均基于官方仓库与文档研究编写。</p></div>
  ${cats.map((cat) => {
    const list = articles.filter((a) => a.category === cat);
    if (!list.length) return '';
    return `<section style="margin-bottom:30px"><h2 style="font-size:19px;border-bottom:1px solid var(--border);padding-bottom:8px">${escapeHtml(CATEGORY_LABELS[cat] || cat)}</h2><div class="card-grid">${list.map((a) => `<div class="info-card"><h3><a href="#/article/${a.id}" style="color:var(--text)">${escapeHtml(a.title)}</a></h3><p>${escapeHtml(a.description)}</p><span style="font-size:11px;color:var(--text-muted)">约 ${a.readingTime} 分钟 · ${a.updated}</span></div>`).join('')}</div></section>`;
  }).join('')}`;
}

function render404(): string {
  return `<div class="not-found"><div class="code">404</div><h1>这个页面不在知识库里</h1><p style="color:var(--text-soft)">可能是链接拼写有误，或者文章已经移动。你可以回到首页，或使用站内搜索。</p><p><a class="btn btn-light" href="#/">返回首页</a> <a class="btn btn-light" href="#" id="nf-search">搜索文章</a></p></div>`;
}

function setMeta(title: string, description: string): void {
  document.title = title;
  const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (desc) desc.content = description;
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (og) og.content = title;
}

function closeDrawer(): void {
  sidebarEl.classList.remove('open');
  document.getElementById('drawer-overlay')?.classList.remove('open');
}

async function renderRoute(): Promise<void> {
  closeDrawer();
  const route = parseRoute();
  document.body.dataset.page = route.name === 'learning' ? 'learning' : route.name === 'labs' ? 'labs' : route.name === '404' ? '404' : route.name === 'article' ? 'article' : route.name === 'home' ? 'home' : 'index';
  document.querySelectorAll<HTMLAnchorElement>('.top-nav a').forEach((a) => {
    const key = a.dataset.nav;
    a.classList.toggle('active', (key === 'home' && route.name === 'home') || (key === 'architecture' && route.name === 'article' && route.id.startsWith('architecture/')) || (key === 'labs' && route.name === 'labs') || (key === 'learning' && route.name === 'learning'));
  });
  renderSidebar(route);
  tocEl.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

  if (route.name === 'home') {
    setMeta(SITE.title, SITE.description);
    mainEl.innerHTML = renderHome();
  } else if (route.name === 'article') {
    const meta = articles.find((a) => a.id === route.id);
    if (!meta) {
      setMeta('文章未找到 - HandsLab', '未找到该文章。');
      mainEl.innerHTML = render404();
      document.body.dataset.page = '404';
      return;
    }
    setMeta(`${meta.title} - HandsLab`, meta.description);
    mainEl.innerHTML = '<div class="lab-panel">正在加载文章…</div>';
    const loader = mdModules[meta.path] as (() => Promise<unknown>) | undefined;
    if (!loader) {
      mainEl.innerHTML = render404();
      return;
    }
    const raw = String(await loader());
    const bodyHtml = renderMarkdown(raw);
    const index = articles.findIndex((a) => a.id === meta.id);
    mainEl.innerHTML = renderArticle(meta, bodyHtml, articles[index - 1], articles[index + 1], getFavorites().includes(meta.id));
    const tocItems: TocItem[] = buildToc(mainEl);
    tocEl.innerHTML = tocHtml(tocItems);
    const favBtn = document.getElementById('fav-btn');
    favBtn?.addEventListener('click', () => {
      const added = toggleFavorite(meta.id);
      favBtn.classList.toggle('on', added);
      favBtn.setAttribute('aria-pressed', String(added));
      favBtn.textContent = added ? '★ 已收藏' : '☆ 收藏本文';
      renderSidebar(route);
      showToast(added ? '已加入收藏' : '已取消收藏');
    });
  } else if (route.name === 'labs') {
    setMeta('交互实验室 - HandsLab', '六组浏览器端交互模拟：Agent Loop、架构探索、工具调用、事件时间线、沙箱边界与 Agent 评估。');
    mainEl.innerHTML = renderLabs();
    initLabs(route.lab);
  } else if (route.name === 'learning') {
    setMeta('学习路线 - HandsLab', '九阶段学习路线与 30 天学习计划，从 Agent 基础到构建完整 Coding Agent 系统。');
    mainEl.innerHTML = renderLearningPath();
  } else if (route.name === 'articles') {
    setMeta('文章索引 - HandsLab', 'HandsLab 全部中文技术文章索引。');
    mainEl.innerHTML = renderArticlesIndex(route.category);
  } else if (route.name === 'search') {
    openSearch();
    mainEl.innerHTML = renderArticlesIndex();
  } else {
    setMeta('404 - HandsLab', '页面未找到。');
    mainEl.innerHTML = render404();
  }
  updateProgress();
}

function updateProgress(): void {
  const bar = document.getElementById('progress-bar') as HTMLElement;
  const top = document.getElementById('back-to-top') as HTMLElement;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = `${max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0}%`;
  top.classList.toggle('visible', window.scrollY > 400);
}

function highlight(text: string, query: string): string {
  const escaped = escapeHtml(text);
  if (!query) return escaped;
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${q})`, 'ig'), '<em>$1</em>');
}

function runSearch(query: string): void {
  const results = document.getElementById('search-results') as HTMLElement | null;
  if (!results) return;
  const q = query.trim().toLowerCase();
  const matched = q
    ? articles.filter((a) => `${a.title} ${a.description} ${a.tags.join(' ')} ${a.excerpt} ${a.category}`.toLowerCase().includes(q))
    : articles.slice(0, 12);
  if (!matched.length) {
    results.innerHTML = '<div class="search-empty">没有匹配的文章。试试 “Agent Loop”、“Workspace” 或 “安全”。</div>';
    return;
  }
  results.innerHTML = matched.map((a) => `<a class="search-result" href="#/article/${a.id}"><strong>${highlight(a.title, query)}</strong><span>${highlight(a.description || a.excerpt.slice(0, 110), query)}</span></a>`).join('');
}

function openSearch(): void {
  const modal = document.getElementById('search-modal') as HTMLElement;
  const input = document.getElementById('search-input') as HTMLInputElement;
  modal.classList.add('open');
  input.value = '';
  runSearch('');
  window.setTimeout(() => input.focus(), 30);
}

function closeSearch(): void {
  document.getElementById('search-modal')?.classList.remove('open');
}

function updateThemeIcon(): void {
  const btn = document.getElementById('theme-toggle') as HTMLButtonElement;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.innerHTML = dark
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z"/></svg>';
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

document.getElementById('menu-toggle')?.addEventListener('click', () => {
  sidebarEl.classList.toggle('open');
  document.getElementById('drawer-overlay')?.classList.toggle('open', sidebarEl.classList.contains('open'));
});
document.getElementById('drawer-overlay')?.addEventListener('click', closeDrawer);
sidebarEl.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('a')) closeDrawer();
});
document.getElementById('search-trigger')?.addEventListener('click', openSearch);
document.getElementById('search-modal')?.addEventListener('click', (event) => {
  if (event.target === document.getElementById('search-modal')) closeSearch();
});
document.getElementById('search-input')?.addEventListener('input', (event) => runSearch((event.target as HTMLInputElement).value));
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  updateThemeIcon();
});
document.getElementById('back-to-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.getElementById('nf-search')?.addEventListener('click', (event) => { event.preventDefault(); openSearch(); });

document.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement;
  const tocLink = target.closest<HTMLAnchorElement>('a[data-toc]');
  if (tocLink) {
    event.preventDefault();
    document.getElementById(tocLink.dataset.toc || '')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('#toc a').forEach((a) => a.classList.toggle('active', a === tocLink));
    return;
  }
  const copyBtn = target.closest<HTMLButtonElement>('.copy-btn');
  if (copyBtn) {
    const block = copyBtn.closest('.code-block');
    const code = block?.querySelector('code')?.textContent || '';
    await copyText(code);
    copyBtn.textContent = '已复制';
    copyBtn.classList.add('done');
    window.setTimeout(() => { copyBtn.textContent = '复制'; copyBtn.classList.remove('done'); }, 1600);
  }
});

document.addEventListener('keydown', (event) => {
  const modal = document.getElementById('search-modal');
  if (event.key === 'Escape') { closeSearch(); return; }
  const tag = (event.target as HTMLElement).tagName;
  if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !modal?.classList.contains('open')) {
    event.preventDefault();
    openSearch();
  }
});

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
window.addEventListener('hashchange', () => { void renderRoute(); });

updateThemeIcon();
if (!location.hash) history.replaceState(null, '', '#/');
void renderRoute();
