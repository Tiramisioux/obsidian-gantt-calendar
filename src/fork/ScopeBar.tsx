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
			<span className="gc-scope-chip" title="Dagar som andra projekt bokat visas ljusare: inspelningstillfällen (#lila) alltid, möten (#röd) när de är heldag">
				<span className="gc-scope-chip__label">{what}</span>
				<button
					type="button"
					className="gc-scope-chip__clear"
					aria-label="Visa alla projekt"
					title="Visa alla projekt"
					onClick={() => useCalendarStore.getState().setForkScope(null, null)}
				>×</button>
			</span>
			<span className="gc-scope-bar__legend">ljusare = dagen bokad i annat projekt (inspelning, heldagsmöte)</span>
		</div>
	);
}
