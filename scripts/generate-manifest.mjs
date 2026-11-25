import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const contentDir = join(root, 'content');
const outFile = join(root, 'src', 'data', 'articles.generated.ts');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, '');
    }
    data[m[1]] = value;
  }
  return data;
}

function excerptOf(raw) {
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

const files = walk(contentDir);
const articles = files.map((file) => {
  const raw = readFileSync(file, 'utf8');
  const meta = parseFrontmatter(raw);
  const rel = relative(contentDir, file).split(sep).join('/');
  const id = rel.replace(/\.md$/, '');
  return {
    id,
    path: `/content/${rel}`,
    title: meta.title || id,
    description: meta.description || '',
    category: meta.category || id.split('/')[0],
    order: Number(meta.order || 0),
    updated: meta.updated || '2026-11-25',
    diagram: meta.diagram || '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    readingTime: Math.max(1, Math.round(raw.length / 600)),
    excerpt: excerptOf(raw),
  };
});

articles.sort((a, b) => a.category.localeCompare(b.category) || a.order - b.order || a.id.localeCompare(b.id));

const body = `// 本文件由 scripts/generate-manifest.mjs 自动生成，请勿手动编辑。
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

export const articles: ArticleMeta[] = ${JSON.stringify(articles, null, 2)};
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://yuxinrun.github.io/handslab/#/</loc><priority>1.0</priority></url>
  <url><loc>https://yuxinrun.github.io/handslab/#/learning-path</loc><priority>0.8</priority></url>
  <url><loc>https://yuxinrun.github.io/handslab/#/labs</loc><priority>0.8</priority></url>
${articles.map((a) => `  <url><loc>https://yuxinrun.github.io/handslab/#/article/${a.id}</loc><lastmod>${a.updated}</lastmod><priority>0.7</priority></url>`).join('\n')}
</urlset>
`;

mkdirSync(join(root, 'src', 'data'), { recursive: true });
writeFileSync(outFile, body, 'utf8');
writeFileSync(join(root, 'public', 'sitemap.xml'), sitemap, 'utf8');
console.log(`[manifest] ${articles.length} articles -> ${relative(root, outFile)}`);
console.log('[manifest] sitemap.xml -> public/sitemap.xml');
