import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [];
const warnings = [];

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const contentFiles = walk(join(root, 'content')).filter((f) => f.endsWith('.md'));
const ids = new Set();

for (const file of contentFiles) {
  const raw = readFileSync(file, 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) { errors.push(`缺少 frontmatter: ${relative(root, file)}`); continue; }
  const fields = Object.fromEntries(fm[1].split(/\r?\n/).map((l) => {
    const m = l.match(/^([A-Za-z_-]+):\s*(.*)$/);
    return m ? [m[1], m[2].trim()] : [];
  }));
  for (const key of ['title', 'description', 'category', 'order', 'updated']) {
    if (!fields[key]) errors.push(`${relative(root, file)} 缺少 ${key}`);
  }
  const id = relative(join(root, 'content'), file).replace(/\\/g, '/').replace(/\.md$/, '');
  ids.add(id);
  if (fields.diagram && !existsSync(join(root, 'public', fields.diagram.replace(/^\//, '')))) {
    errors.push(`${id} 的 diagram 不存在: ${fields.diagram}`);
  }
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
  for (const m of body.matchAll(/\]\(#\/article\/([^)]+)\)/g)) {
    if (!ids.has(m[1]) && !contentFiles.some((f) => f.replace(/\\/g, '/').endsWith(`${m[1]}.md`))) {
      errors.push(`${id} 内部链接指向不存在文章: ${m[1]}`);
    }
  }
  if (body.length < 2000) warnings.push(`${id} 正文较短 (${body.length} 字符)`);
}

const diagrams = readdirSync(join(root, 'public', 'diagrams')).filter((f) => f.endsWith('.svg'));
if (diagrams.length < 16) errors.push(`SVG 数量不足: ${diagrams.length}`);
for (const d of diagrams) {
  const svg = readFileSync(join(root, 'public', 'diagrams', d), 'utf8');
  if (!svg.includes('<svg') || !svg.includes('</svg>')) errors.push(`SVG 结构异常: ${d}`);
}

const screenshots = ['home-desktop.png', 'home-mobile.png', 'article-desktop.png', 'architecture.png', 'lab.png', 'learning-path.png'];
for (const s of screenshots) {
  const p = join(root, 'screenshots', s);
  if (!existsSync(p)) errors.push(`缺少截图: ${s}`);
  else if (statSync(p).size < 10_000) errors.push(`截图疑似空白: ${s} (${statSync(p).size} bytes)`);
}

const deploy = readFileSync(join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');
for (const token of ['actions/configure-pages@v5', 'actions/upload-pages-artifact@v3', 'actions/deploy-pages@v4', 'npm run build']) {
  if (!deploy.includes(token)) errors.push(`部署配置缺少: ${token}`);
}
const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8');
if (!vite.includes("base: '/handslab/'")) errors.push('vite base path 配置不正确');

const readme = readFileSync(join(root, 'README.md'), 'utf8');
for (const s of screenshots) if (!readme.includes(`screenshots/${s}`)) errors.push(`README 未引用截图: ${s}`);

console.log(`[validate] articles=${contentFiles.length}, diagrams=${diagrams.length}, screenshots=${screenshots.length}`);
warnings.forEach((w) => console.log(`[warn] ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`[error] ${e}`));
  process.exit(1);
}
console.log('[validate] all static checks passed');
