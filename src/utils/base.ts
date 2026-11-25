const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export function withBase(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('#')) return path;
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function asset(path: string): string {
  return withBase(path);
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch] as string));
}
