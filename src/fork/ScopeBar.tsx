import type { JSX } from 'react';
import { useCalendarStore } from '../ui/store/calendarStore';

/**
 * fork: a thin bar under the toolbar while the calendar is opened on a
 * kontext/projekt — what is shown, and × to show every project again. Its own
 * row (not in the toolbar), since the toolbar's centre collapses to nothing
 * in a narrow pane.
 */
export function ForkScopeBar(): JSX.Element | null {
	const scope = useCalendarStore((s) => s.forkScope);
	if (!scope) return null;
	const what = scope.kind === 'project' ? `${scope.label}${scope.ctx ? ` · ${scope.ctx}` : ''} — med delprojekt`
		: scope.kind === 'context' ? `${scope.label} — hela kontexten`
		: scope.label;
	return (
		<div className="gc-scope-bar">
			<span className="gc-scope-chip" title="Andra projekts inspelningstillfällen (#lila) visas ljusare">
				<span className="gc-scope-chip__label">{what}</span>
				<button
					type="button"
					className="gc-scope-chip__clear"
					aria-label="Visa alla projekt"
					title="Visa alla projekt"
					onClick={() => useCalendarStore.getState().setForkScope(null, null)}
				>×</button>
			</span>
			<span className="gc-scope-bar__legend">ljuslila = inspelning i annat projekt</span>
		</div>
	);
}
