// fork: calendar cards show only the colours, not the tag text (user,
// 2026-10-15: "the calendar view actually does not have to show the tags (or
// make a flip switch for me to turn tag text on/off)" … "only the colors").
// Off by default; the toolbar button (# icon) and the command "Visa/dölj
// taggtext i kalendern" flip it for every view at once. When on, each view's
// own "show tags" setting applies again. Tooltips keep listing the tags.
import { Notice } from 'obsidian';
import { useCalendarStore } from '../ui/store/calendarStore';

export function forkTagTextOn(settings: { forkShowTagText?: boolean } | undefined | null): boolean {
	return settings?.forkShowTagText === true;
}

export async function forkToggleTagText(plugin: { settings: { forkShowTagText?: boolean }; saveSettings: () => Promise<void> }): Promise<void> {
	plugin.settings.forkShowTagText = !forkTagTextOn(plugin.settings);
	await plugin.saveSettings();
	useCalendarStore.getState().bumpSettings(); // remount the views with the new setting
	new Notice(plugin.settings.forkShowTagText ? 'Kalendern: taggtext visas' : 'Kalendern: bara färger (taggtext dold)');
}
