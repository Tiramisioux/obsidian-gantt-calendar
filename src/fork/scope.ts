/**
 * fork: open the calendar scoped to a note's kontext/projekt (Tiramisioux,
 * 2026-10-15) — the calendar twin of the 3D graph fork's "Open in 3D graph".
 *
 * Scope from a file or folder (same rules as the 3D graph fork's scopeFor):
 *   a project folder 03_PROJEKTPLANERING/<CTX>/<PROJ>[/…]  → that project
 *   a context folder 03_PROJEKTPLANERING/<CTX>             → that context
 *   any other folder                                       → tasks under it
 *   a note with `projekt: "#PROJ"`                         → that project
 *   a note in a project folder (no `projekt`)              → that project
 *   a note in a context folder, or with `kontext:` only    → that context
 *   any other note                                         → its own tasks
 *
 * A task is IN a project scope when it is tagged #PROJ or #PROJ/<sub>, or its
 * note says `projekt: "#PROJ…"` / `delprojekt: "#PROJ/…"`, or it lives in the
 * project folder (subprojects included). Context scope: #CTX(/…), `kontext:
 * CTX`, or the context folder. Outside the scope, an inspelningstillfälle
 * (#lila) is still shown — those days are booked — as a "blocked" copy
 * (forkBlocked), drawn in a lighter tint.
 *
 * Pure: no Obsidian API (the plugin passes the folder test and frontmatter).
 */
import type { GCTask } from '../types';
import { vaultColorOfTask } from './vaultColors';

export const PLAN = '03_PROJEKTPLANERING';

export interface ForkScope {
	kind: 'project' | 'context' | 'folder' | 'note';
	/** chip text: 'DOK', 'NORDKAPAREN', a folder or note name */
	label: string;
	ctx?: string;
	proj?: string;
	/** folder scope: the folder; note scope: the note's path */
	path?: string;
}

export type Frontmatter = Record<string, unknown> | null | undefined;

const nfc = (s: string) => s.normalize('NFC');

/** frontmatter value(s) → bare names: '"#DOK/sub"' / ['#DOK'] → ['DOK/sub'] / ['DOK'] */
function fmTags(v: unknown): string[] {
	const list = Array.isArray(v) ? v : (v == null ? [] : [v]);
	return list.map((x) => nfc(String(x).trim().replace(/^#/, ''))).filter(Boolean);
}

/** '03_PROJEKTPLANERING/RISE/UND/notes/x.md' → ['RISE', 'UND', 'notes', 'x.md'] */
function planParts(path: string): string[] | null {
	const p = nfc(path);
	return p.startsWith(PLAN + '/') ? p.slice(PLAN.length + 1).split('/') : null;
}

const isHidden = (name: string) => name.startsWith('_') || name.startsWith('.');

export function scopeFor(path: string, isFolder: boolean, fm: Frontmatter): ForkScope {
	const parts = planParts(path);
	const name = nfc(path).split('/').pop() || path;
	if (isFolder) {
		if (parts && parts.length >= 2 && !isHidden(parts[0]) && !isHidden(parts[1])) {
			return { kind: 'project', label: parts[1], ctx: parts[0], proj: parts[1] };
		}
		if (parts && parts.length === 1 && !isHidden(parts[0])) {
			return { kind: 'context', label: parts[0], ctx: parts[0] };
		}
		return { kind: 'folder', label: name, path: nfc(path) };
	}
	const proj = fmTags(fm?.projekt)[0]?.split('/')[0];
	const kontext = fmTags(fm?.kontext)[0];
	const ctxFromPath = parts && parts.length >= 2 && !isHidden(parts[0]) ? parts[0] : undefined;
	if (proj && proj !== (kontext || ctxFromPath)) {
		return { kind: 'project', label: proj, ctx: kontext || ctxFromPath, proj };
	}
	if (parts && parts.length >= 3 && !isHidden(parts[0]) && !isHidden(parts[1])) {
		return { kind: 'project', label: parts[1], ctx: parts[0], proj: parts[1] };
	}
	const ctx = proj || kontext || ctxFromPath;
	if (ctx) return { kind: 'context', label: ctx, ctx };
	return { kind: 'note', label: name.replace(/\.md$/, ''), path: nfc(path) };
}

const tagIn = (tags: readonly string[] | undefined, name: string) =>
	(tags ?? []).some((t) => { const n = nfc(t); return n === name || n.startsWith(name + '/'); });

/** 'in' — part of the scope · 'blocked' — another project's #lila day · null — hidden */
export function classifyTask(task: GCTask, scope: ForkScope, fmOf: (path: string) => Frontmatter): 'in' | 'blocked' | null {
	const path = nfc(task.filePath);
	let inside = false;
	if (scope.kind === 'project' && scope.proj) {
		const p = scope.proj;
		const fm = fmOf(task.filePath);
		const parts = planParts(path);
		inside = tagIn(task.tags, p)
			|| fmTags(fm?.projekt).some((t) => t === p || t.startsWith(p + '/'))
			|| fmTags(fm?.delprojekt).some((t) => t.startsWith(p + '/'))
			|| (!!parts && parts.length >= 3 && parts[1] === p && (!scope.ctx || parts[0] === scope.ctx));
	} else if (scope.kind === 'context' && scope.ctx) {
		const c = scope.ctx;
		const parts = planParts(path);
		inside = tagIn(task.tags, c)
			|| fmTags(fmOf(task.filePath)?.kontext).includes(c)
			|| (!!parts && parts.length >= 2 && parts[0] === c);
	} else if (scope.kind === 'folder' && scope.path) {
		inside = path.startsWith(scope.path + '/');
	} else if (scope.kind === 'note' && scope.path) {
		inside = path === scope.path;
	}
	if (inside) return 'in';
	return vaultColorOfTask(task.tags)?.key === 'lila' ? 'blocked' : null;
}

/** The scoped task list: in-scope tasks as they are, blocked ones as marked copies. */
export function applyScope(tasks: GCTask[], scope: ForkScope, fmOf: (path: string) => Frontmatter): GCTask[] {
	const out: GCTask[] = [];
	for (const t of tasks) {
		const c = classifyTask(t, scope, fmOf);
		if (c === 'in') out.push(t);
		else if (c === 'blocked') out.push({ ...t, forkBlocked: true });
	}
	return out;
}
