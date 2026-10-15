// fork: hide the calendar bridge's sync id in the calendar (user, 2026-10-15:
// "can we hide the id in obsidian?"). obsidian-reminders-bridge appends a
// hidden `(id:: a1b2c3)` to every synced todo line; the parser keeps it in the
// description, so it showed in card text, tooltips, drag chips and gantt bar
// names ("Arbetsmöte (id:: f0cc25)"). Display only — the description itself
// (and so every write-back: tick, drag, resize, edit) keeps the id, or the
// sync would lose track of the todo.
const PAREN_FIELD = /\s*\((?:[\p{L}\p{N}_-]+)::[^)]*\)/gu;

export function forkDisplayText(description: string | undefined | null): string {
	return (description || '').replace(PAREN_FIELD, '').replace(/\s{2,}/g, ' ').trim();
}
