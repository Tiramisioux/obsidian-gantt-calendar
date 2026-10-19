/**
 * fork: open the calendar scoped to a note's kontext/projekt (Tiramisioux,
 * 2026-10-15) — the calendar twin of the 3D graph fork's "Open in 3D graph".
 * The tree comes from the vault's contract (.obsidian/vault-struktur.json) through
 * the vendored library (vault_struktur.js): `vs.resolve(path)` says which area,
 * kontext and project a path belongs to, archived projects included — an archived
 * project scopes exactly like an active one.
 *
 * Scope from a file or folder (same rules as the 3D graph fork's scope):
 *   a project folder (<area>/<PROJ>[/…], <area>/_archive/<PROJ>, 02 kontext/<PROJ>) → that project
 *   a kontext folder (an area of a fixed kontext, a 02 kontext folder)               → that context
 *   any other folder                                                                 → tasks under it
 *   a note with `projekt: "#PROJ"`                                                   → that project
 *   a note in a project folder (no `projekt`)                                        → that project
 *   a note at kontext level, or with `kontext:` only                                 → that context
 *   any other note                                                                   → its own tasks
 *
 * A task is IN a project scope when it is tagged #PROJ or #PROJ/<sub>, or its
 * note says `projekt: "#PROJ…"` / `delprojekt: "#PROJ/…"`, or its path resolves to
 * the project (subprojects included). Context scope: #CTX(/…), `kontext:
 * CTX`, or a path that resolves to the kontext. Outside the scope, a day another project has
 * booked is still shown, as a "blocked" copy (forkBlocked) in a lighter tint:
 * an inspelningstillfälle (#lila) always — it takes the whole day, times or
 * not — and a meeting (#röd) only when it is all-day (no clock time on any of
 * its dates; user, 2026-10-15).
 *
 * Pure: no Obsidian API (the plugin passes the folder test and frontmatter).
 */
import type { GCTask } from '../types';
import { vaultColorOfTask } from './vaultColors';
import type VaultStruktur from './vault_struktur';

/** the tree contract, built by the plugin from .obsidian/vault-struktur.json */
export type Struktur = VaultStruktur.Struktur;

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

/** a vault path without leading/trailing slashes, NFC */
const norm = (path: string) => nfc(path).replace(/^\/+|\/+$/g, '');

/** Is `folder` the kontext's own folder (an area of a fixed kontext, `02 area/K`, `02 area/_archive/K`)? */
function isKontextFolder(folder: string, kontext: string, vs: Struktur): boolean {
	return folder === vs.kontext_folder(kontext, false) || folder === vs.kontext_folder(kontext, true);
}

export function scopeFor(path: string, isFolder: boolean, fm: Frontmatter, vs: Struktur): ForkScope {
	const p = norm(path);
	const r = vs.resolve(p);
	const name = p.split('/').pop() || path;
	if (isFolder) {
		if (r.projekt && !r['kontextnivå']) {
			return { kind: 'project', label: r.projekt, ctx: r.kontext ?? undefined, proj: r.projekt };
		}
		if (r.kontext && r['kontextnivå'] && r.roll === null && isKontextFolder(p, r.kontext, vs)) {
			return { kind: 'context', label: r.kontext, ctx: r.kontext };
		}
		return { kind: 'folder', label: name, path: p };
	}
	const proj = fmTags(fm?.projekt)[0]?.split('/')[0];
	const kontext = fmTags(fm?.kontext)[0];
	const ctxFromPath = r.kontext ?? undefined;
	if (proj && proj !== (kontext || ctxFromPath)) {
		return { kind: 'project', label: proj, ctx: kontext || ctxFromPath, proj };
	}
	if (r.projekt && !r['kontextnivå']) {
		return { kind: 'project', label: r.projekt, ctx: r.kontext ?? undefined, proj: r.projekt };
	}
	const ctx = proj || kontext || ctxFromPath;
	if (ctx) return { kind: 'context', label: ctx, ctx };
	return { kind: 'note', label: name.replace(/\.md$/, ''), path: p };
}

const tagIn = (tags: readonly string[] | undefined, name: string) =>
	(tags ?? []).some((t) => { const n = nfc(t); return n === name || n.startsWith(name + '/'); });

/** 'in' — part of the scope · 'blocked' — another project's #lila day · null — hidden */
export function classifyTask(task: GCTask, scope: ForkScope, fmOf: (path: string) => Frontmatter, vs: Struktur): 'in' | 'blocked' | null {
	const path = nfc(task.filePath);
	let inside = false;
	if (scope.kind === 'project' && scope.proj) {
		const p = scope.proj;
		const fm = fmOf(task.filePath);
		const r = vs.resolve(path);
		inside = tagIn(task.tags, p)
			|| fmTags(fm?.projekt).some((t) => t === p || t.startsWith(p + '/'))
			|| fmTags(fm?.delprojekt).some((t) => t.startsWith(p + '/'))
			|| (r.projekt === p && (!scope.ctx || r.kontext === scope.ctx));
	} else if (scope.kind === 'context' && scope.ctx) {
		const c = scope.ctx;
		inside = tagIn(task.tags, c)
			|| fmTags(fmOf(task.filePath)?.kontext).includes(c)
			|| vs.resolve(path).kontext === c;
	} else if (scope.kind === 'folder' && scope.path) {
		inside = path.startsWith(scope.path + '/');
	} else if (scope.kind === 'note' && scope.path) {
		inside = path === scope.path;
	}
	if (inside) return 'in';
	return blocksDay(task) ? 'blocked' : null;
}

/** All-day = no date of the task carries a clock time. */
export function isAllDay(task: GCTask): boolean {
	return !Object.values(task.datePrecision ?? {}).includes('time');
}

/** Does another project's task book its day? #lila always, #röd when all-day. */
export function blocksDay(task: GCTask): boolean {
	const key = vaultColorOfTask(task.tags)?.key;
	return key === 'lila' || (key === 'rod' && isAllDay(task));
}

/** The scoped task list: in-scope tasks as they are, blocked ones as marked copies. */
export function applyScope(tasks: GCTask[], scope: ForkScope, fmOf: (path: string) => Frontmatter, vs: Struktur): GCTask[] {
	const out: GCTask[] = [];
	for (const t of tasks) {
		const c = classifyTask(t, scope, fmOf, vs);
		if (c === 'in') out.push(t);
		else if (c === 'blocked') out.push({ ...t, forkBlocked: true });
	}
	return out;
}
