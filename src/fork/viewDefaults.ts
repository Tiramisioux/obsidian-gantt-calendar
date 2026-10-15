// fork: the gantt view always opens on ALL tags (user, 2026-10-15: "let the
// default gantt view be all tags (so no tags selected means all tags are
// shown)"). A tag picked in the gantt view filters for the session but is not
// restored at the next start — the saved selection (e.g. ['UND']) is dropped
// when the filters are hydrated. Other views keep their saved tag filters.
import type { ViewFilterState, ViewScope } from '../ui/store/calendarStore';

export function forkGanttOpensUnfiltered(
	filters?: Partial<Record<ViewScope, ViewFilterState>> | null
): Partial<Record<ViewScope, ViewFilterState>> | null | undefined {
	const g = filters?.gantt;
	if (!g || !g.tag || g.tag.selectedTags.length === 0) return filters;
	return { ...filters, gantt: { ...g, tag: { ...g.tag, selectedTags: [] } } };
}
