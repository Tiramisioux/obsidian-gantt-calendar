// fork: the gantt and month views always open on ALL tags (user, 2026-10-15:
// "let the default gantt view be all tags (so no tags selected means all tags
// are shown)", then "fix month view"). A tag picked there filters for the
// session but is not restored at the next start — the saved selection (gantt
// had ['UND'], month 11 project tags) is dropped when the filters are
// hydrated. The other views keep their saved tag filters.
import type { ViewFilterState, ViewScope } from '../ui/store/calendarStore';

export const FORK_UNFILTERED_AT_START: readonly ViewScope[] = ['gantt', 'month'];

export function forkOpenUnfiltered(
	filters?: Partial<Record<ViewScope, ViewFilterState>> | null
): Partial<Record<ViewScope, ViewFilterState>> | null | undefined {
	if (!filters) return filters;
	let out = filters;
	for (const scope of FORK_UNFILTERED_AT_START) {
		const f = out[scope];
		if (!f || !f.tag || f.tag.selectedTags.length === 0) continue;
		out = { ...out, [scope]: { ...f, tag: { ...f.tag, selectedTags: [] } } };
	}
	return out;
}
