import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import http from 'highlight.js/lib/languages/http';
import { escapeHtml, withBase } from './base';

hljs.registerLanguage('python', python);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('http', http);
hljs.registerLanguage('shell', bash);

marked.setOptions({ gfm: true, breaks: false });

const renderer = new marked.Renderer();

(renderer as any).code = (token: any): string => {
  const text: string = token?.text ?? '';
  const rawLang: string = (token?.lang ?? '').split(/\s+/)[0];
  const lang = rawLang.replace(/^language-/, '');
  let highlighted = escapeHtml(text);
  let valid = false;
  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(text, { language: lang, ignoreIllegals: true }).value;
      valid = true;
    } catch {
      highlighted = escapeHtml(text);
    }
  }
  return `<div class="code-block"><div class="code-head"><span class="code-lang">${escapeHtml(lang || 'text')}${valid ? '' : ''}</span><button type="button" class="copy-btn" data-copy="code" aria-label="复制代码">复制</button></div><pre><code class="hljs${valid ? ` language-${escapeHtml(lang)}` : ''}">${highlighted}</code></pre></div>`;
};

(renderer as any).image = (token: any): string => {
  const href: string = token?.href ?? '';
  const title: string = token?.title ?? '';
  const text: string = token?.text ?? '';
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
  return `<img src="${withBase(href)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" decoding="async" />`;
};

(renderer as any).link = (token: any): string => {
  const href: string = token?.href ?? '';
  const text: string = token?.text ?? '';
  const external = /^https?:\/\//.test(href);
  const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${escapeHtml(href)}"${attrs}>${text}</a>`;
};

export function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '');
}

export function renderMarkdown(markdown: string): string {
  return marked.parse(stripFrontmatter(markdown), { renderer }) as string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}
