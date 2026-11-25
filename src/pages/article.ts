import type { ArticleMeta } from '../data/articles.generated';
import { CATEGORY_LABELS, SITE } from '../data/site';
import { asset, escapeHtml } from '../utils/base';
import { slugify } from '../utils/markdown';

export interface TocItem { level: number; id: string; text: string }

export function buildToc(container: HTMLElement): TocItem[] {
  const items: TocItem[] = [];
  const used = new Set<string>();
  container.querySelectorAll<HTMLElement>('h2, h3').forEach((heading) => {
    const text = heading.textContent?.trim() || 'section';
    let id = slugify(text);
    if (used.has(id)) {
      let n = 2;
      while (used.has(`${id}-${n}`)) n += 1;
      id = `${id}-${n}`;
    }
    used.add(id);
    heading.id = id;
    items.push({ level: heading.tagName === 'H2' ? 2 : 3, id, text });
  });
  return items;
}

export function tocHtml(items: TocItem[]): string {
  if (!items.length) return '<div class="toc-empty">本文暂无小节目录</div>';
  return `<div class="toc-title">本页目录</div><ul>${items.map((item) =>
    `<li class="${item.level === 3 ? 'toc-h3' : ''}"><a href="#${item.id}" data-toc="${item.id}">${escapeHtml(item.text)}</a></li>`
  ).join('')}</ul>`;
}

export function renderArticle(
  meta: ArticleMeta,
  bodyHtml: string,
  prev: ArticleMeta | undefined,
  next: ArticleMeta | undefined,
  favorite: boolean,
): string {
  const category = CATEGORY_LABELS[meta.category] || meta.category;
  const figure = meta.diagram
    ? `<figure class="article-figure"><img src="${asset(meta.diagram)}" alt="${escapeHtml(meta.title)}架构图" loading="lazy" /><figcaption>图： ${escapeHtml(meta.title)} — 本地绘制 SVG</figcaption></figure>`
    : '';
  const tags = meta.tags.length ? `<span>${meta.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(' ')}</span>` : '';

  return `
<div class="article-wrap">
  <nav class="breadcrumbs" aria-label="面包屑">
    <a href="#/">首页</a><span>/</span><a href="#/articles?category=${encodeURIComponent(meta.category)}">${escapeHtml(category)}</a><span>/</span><span>${escapeHtml(meta.title)}</span>
  </nav>
  <article class="article">
    <header class="article-header">
      <span class="article-kicker">${escapeHtml(category)} · HandsLab</span>
      <h1>${escapeHtml(meta.title)}</h1>
      <p class="article-desc">${escapeHtml(meta.description)}</p>
      <div class="article-meta">
        <span>更新：${escapeHtml(meta.updated)}</span><span>约 ${meta.readingTime} 分钟</span>${tags}
      </div>
      <div class="article-actions">
        <button type="button" class="fav-btn ${favorite ? 'on' : ''}" id="fav-btn" aria-pressed="${favorite}">
          ${favorite ? '★ 已收藏' : '☆ 收藏本文'}
        </button>
      </div>
    </header>
    ${figure}
    <div class="prose" id="prose">${bodyHtml}</div>
    <footer class="article-footer">
      <div class="pager">
        ${prev ? `<a class="prev" href="#/article/${prev.id}"><span>← 上一篇</span><strong>${escapeHtml(prev.title)}</strong></a>` : '<span></span>'}
        ${next ? `<a class="next" href="#/article/${next.id}"><span>下一篇 →</span><strong>${escapeHtml(next.title)}</strong></a>` : '<span></span>'}
      </div>
      <div class="research-note">
        源码与文档研究快照：${SITE.researchDate}。本文所述 API、目录与行为均以该日期前后的官方仓库与文档为依据；OpenHands 持续演进，后续版本可能发生变化。教学示例均明确标注，不代表官方源码。
      </div>
    </footer>
  </article>
</div>`;
}
