/**
 * fork: the vault's colour convention (Tiramisioux, 2026-10-15).
 *
 * A task's colour is its colour tag — one of the seven Swedish words below —
 * with the exact row colours of the vault snippet `highlight-tags.css`
 * (background tint + ink). #röd = a meeting, #lila = an inspelningstillfälle
 * (a shooting day); those two also mark their day in the month view.
 * Every other tag is a plain Obsidian tag (no hashed pastel colour).
 */

export interface VaultColor {
	/** ASCII key, used in CSS class names (gc-tag--vault-<key>) */
	key: string;
	/** row background */
	bg: string;
	/** text colour on that background */
	ink: string;
}

export const VAULT_COLORS: Readonly<Record<string, VaultColor>> = {
	'blå': { key: 'bla', bg: '#d0e7ff', ink: '#1c3d5a' },
	'gul': { key: 'gul', bg: '#fff3cd', ink: '#665c00' },
	'orange': { key: 'orange', bg: '#fde2cf', ink: '#995200' },
	'grå': { key: 'gra', bg: '#e5e5e5', ink: '#555555' },
	'röd': { key: 'rod', bg: '#f8d7da', ink: '#842029' },
	'lila': { key: 'lila', bg: '#e6d9f6', ink: '#5c3a78' },
	'grön': { key: 'gron', bg: '#d3f4d1', ink: '#205d28' },
};

/** Colours whose tasks mark their day in the month view, in stripe order. */
export const DAY_MARK_TAGS: readonly string[] = ['lila', 'röd'];

/** '#Röd', 'röd', 'röd' (macOS NFD) → 'röd' */
function normTag(tag: string): string {
	return tag.replace(/^#/, '').normalize('NFC').toLowerCase();
}

export function vaultColorOfTag(tag: string): VaultColor | null {
	return VAULT_COLORS[normTag(tag)] ?? null;
}

/** The task's colour: its first colour tag (tags are in line order). */
export function vaultColorOfTask(tags?: readonly string[] | null): VaultColor | null {
	for (const t of tags ?? []) {
		const c = vaultColorOfTag(t);
		if (c) return c;
	}
	return null;
}

/**
 * A lighter version of a colour — another project's #lila day in a scoped
 * calendar ("blocked"): half the tint, the ink softened toward the background.
 */
export function lightTint(c: VaultColor): { bg: string; ink: string } {
	return {
		bg: `color-mix(in srgb, ${c.bg} 50%, var(--background-primary))`,
		ink: `color-mix(in srgb, ${c.ink} 65%, var(--background-primary))`,
	};
}

export interface DayMark {
	color: VaultColor;
	/** only blocked tasks (other projects' #lila) carry this colour on the day */
	light: boolean;
}

/** The day marks for a day's tasks: the DAY_MARK_TAGS present, in that order. */
export function dayMarks(tasks: ReadonlyArray<{ tags?: readonly string[] | null; forkBlocked?: boolean }>): DayMark[] {
	const own = new Set<string>();
	const blocked = new Set<string>();
	for (const task of tasks) {
		for (const t of task.tags ?? []) (task.forkBlocked ? blocked : own).add(normTag(t));
	}
	return DAY_MARK_TAGS
		.filter((t) => own.has(t) || blocked.has(t))
		.map((t) => ({ color: VAULT_COLORS[t], light: !own.has(t) }));
}

/** CSS background for a marked date field: one colour, or equal hard stripes. */
export function dayMarkBackground(marks: readonly DayMark[]): string | undefined {
	if (marks.length === 0) return undefined;
	const bg = (m: DayMark) => (m.light ? lightTint(m.color).bg : m.color.bg);
	if (marks.length === 1) return bg(marks[0]);
	const step = 100 / marks.length;
	const stops = marks.map((m, i) => `${bg(m)} ${i * step}% ${(i + 1) * step}%`).join(', ');
	return `linear-gradient(90deg, ${stops})`;
}

/** The date number's colour on a marked field: the first mark's ink (softened if light). */
export function dayMarkInk(marks: readonly DayMark[]): string | undefined {
	if (marks.length === 0) return undefined;
	return marks[0].light ? lightTint(marks[0].color).ink : marks[0].color.ink;
}
