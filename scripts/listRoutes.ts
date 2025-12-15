import { readdirSync, statSync } from 'fs';
import { join } from 'path';

type RouteInfo = { kind: 'page' | 'api'; path: string };

const projectRoot = process.cwd();
const out: RouteInfo[] = [];

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else {
      if (/app\/.*\/page\.(t|j)sx?$/.test(full)) {
        out.push({ kind: 'page', path: full.split(/app\/?/)[1].replace(/\/page\.(t|j)sx?$/, '') || '/' });
      }
      if (/app\/api\/.*\/route\.(t|j)s$/.test(full)) {
        out.push({ kind: 'api', path: '/api/' + full.split(/app\/api\/?/)[1].replace(/\/route\.(t|j)s$/, '') });
      }
      if (/pages\/api\/.*\.(t|j)sx?$/.test(full)) {
        out.push({ kind: 'api', path: full.split(/pages\/?/)[1].replace(/\.(t|j)sx?$/, '') });
      }
      if (/pages\/.*\.(t|j)sx?$/.test(full) && !/pages\/api\//.test(full)) {
        const relative = full.split(/pages\/?/)[1].replace(/\.(t|j)sx?$/, '');
        out.push({ kind: 'page', path: relative === 'index' ? '/' : '/' + relative.replace(/\/index$/, '') });
      }
    }
  }
}

['app', 'pages'].forEach(d => {
  try { walk(join(projectRoot, d)); } catch {}
});

const unique = new Map<string, RouteInfo>();
for (const r of out) unique.set(r.kind + r.path, r);

console.table(Array.from(unique.values()).sort((a, b) => a.path.localeCompare(b.path)));yarn tsx scripts/listRoutes.ts