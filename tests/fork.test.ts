/**
 * fork (Tiramisioux): tags in any script, the vault's colour convention,
 * month-view day marks, the vault's slot order on write-back, own plugin id.
 */
import { parseSingleTaskLine } from '../src/tasks/taskParser/main';
import { serializeTask } from '../src/tasks/taskSerializer';
import { extractTags, removeTags } from '../src/tasks/taskParser/utils';
import { vaultColorOfTag, vaultColorOfTask, dayMarks, dayMarkBackground, dayMarkInk, VAULT_COLORS } from '../src/fork/vaultColors';
import { scopeFor, applyScope } from '../src/fork/scope';
import type { GCTask } from '../src/types';
import { GC_PLUGIN_ID } from '../src/fork/pluginId';
import { forkOpenUnfiltered } from '../src/fork/viewDefaults';
import { forkDisplayText } from '../src/fork/displayText';
import { forkTagTextOn } from '../src/fork/tagText';
import { App } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';

const app = {} as App;
const LINE = '- [ ] styrelsemöte oktober #lila #DOK #DOK/styrelsemöte_oktober #NORDKAPAREN [due:: 2026-10-15 10:00]';

describe('fork: tags in any script', () => {
	it('Swedish letters stay inside the tag', () => {
		expect(extractTags('x #röd #grå #grön #blå #DOK/styrelsemöte_oktober #Åsa_Öberg'))
			.toEqual(['röd', 'grå', 'grön', 'blå', 'DOK/styrelsemöte_oktober', 'Åsa_Öberg']);
	});

	it('removing tags leaves no fragments (was "öte_oktober")', () => {
		expect(removeTags('styrelsemöte oktober #DOK/styrelsemöte_oktober #röd').trim()).toBe('styrelsemöte oktober');
	});

	it('NFD names (o + U+0308, as macOS hands them out) stay whole; hyphen allowed', () => {
		expect(extractTags('#röd #DOK/e-post_ny_rutin')).toEqual(['röd', 'DOK/e-post_ny_rutin']);
	});

	it('CJK + ASCII tags still work (upstream behaviour)', () => {
		expect(extractTags('任务 #前端 #vue3 开发')).toEqual(['前端', 'vue3']);
	});

	it('the vault line parses: description + every tag', () => {
		const t = parseSingleTaskLine(LINE, 'n.md', 'n.md', 1, ['dataview']);
		expect(t).not.toBeNull();
		expect(t!.description).toBe('styrelsemöte oktober');
		expect(t!.tags).toEqual(['lila', 'DOK', 'DOK/styrelsemöte_oktober', 'NORDKAPAREN']);
	});
});

describe('fork: write-back keeps the vault slot order', () => {
	it('description → tags → fields, nothing lost', () => {
		const t = parseSingleTaskLine(LINE, 'n.md', 'n.md', 1, ['dataview'])!;
		const out = serializeTask(app, t, {}, 'dataview');
		expect(out).toBe('[ ] styrelsemöte oktober #lila #DOK #DOK/styrelsemöte_oktober #NORDKAPAREN [due:: 2026-10-15 10:00]');
	});

	it('a start date added in the calendar goes after the tags', () => {
		const t = parseSingleTaskLine(LINE, 'n.md', 'n.md', 1, ['dataview'])!;
		const out = serializeTask(app, t, { startDate: new Date(2026, 9, 15, 10, 0) , datePrecision: { startDate: 'time', dueDate: 'time' } }, 'dataview');
		expect(out.startsWith('[ ] styrelsemöte oktober #lila #DOK #DOK/styrelsemöte_oktober #NORDKAPAREN [')).toBe(true);
		expect(out).toContain('[start:: 2026-10-15 10:00]');
	});
});

describe('fork: vault colours', () => {
	it('colour tags → the snippet colours; case, # and NFD tolerated', () => {
		expect(vaultColorOfTag('#Röd')).toBe(VAULT_COLORS['röd']);
		expect(vaultColorOfTag('röd')?.bg).toBe('#f8d7da');
		expect(vaultColorOfTag('lila')?.ink).toBe('#5c3a78');
		expect(vaultColorOfTag('DOK')).toBeNull();
	});

	it("a task's colour = its first colour tag", () => {
		expect(vaultColorOfTask(['DOK', 'lila', 'röd'])?.key).toBe('lila');
		expect(vaultColorOfTask(['DOK'])).toBeNull();
		expect(vaultColorOfTask(undefined)).toBeNull();
	});

	it('day marks: one colour → plain; röd + lila on one day → lila only (the day is blocked)', () => {
		expect(dayMarks([{ tags: ['röd'] }, { tags: ['blå'] }]).map((m) => m.color.key)).toEqual(['rod']);
		const both = dayMarks([{ tags: ['röd', 'DOK'] }, { tags: ['lila'] }, { tags: undefined }]);
		expect(both.map((m) => [m.color.key, m.light])).toEqual([['lila', false]]);
		expect(dayMarkBackground([{ color: VAULT_COLORS['lila'], light: false }])).toBe('#e6d9f6');
		expect(dayMarkBackground(both)).toBe('#e6d9f6');
		expect(dayMarkBackground([])).toBeUndefined();
		expect(dayMarkInk(both)).toBe('#5c3a78');
		// another project's shoot (blocked) still outranks an own meeting
		expect(dayMarks([{ tags: ['röd'] }, { tags: ['lila'], forkBlocked: true }]).map((m) => [m.color.key, m.light])).toEqual([['lila', true]]);
		// stripes stay possible in principle (two marks of other kinds) — none today
		expect(dayMarkBackground([{ color: VAULT_COLORS['lila'], light: false }, { color: VAULT_COLORS['röd'], light: false }]))
			.toBe('linear-gradient(90deg, #e6d9f6 0% 50%, #f8d7da 50% 100%)');
	});

	it('a lila day from another project only (blocked) → the lighter tint', () => {
		const light = dayMarks([{ tags: ['lila'], forkBlocked: true }]);
		expect(light.map((m) => m.light)).toEqual([true]);
		expect(dayMarkBackground(light)).toBe('color-mix(in srgb, #e6d9f6 50%, var(--background-primary))');
		expect(dayMarks([{ tags: ['lila'], forkBlocked: true }, { tags: ['lila'] }])[0].light).toBe(false);
	});
});

describe('fork: scope (open the calendar on a kontext/projekt)', () => {
	const task = (filePath: string, tags: string[]): GCTask =>
		({ filePath, fileName: filePath.split('/').pop()!, lineNumber: 1, content: '', description: 'x',
		   completed: false, priority: 'normal', tags } as GCTask);
	const FM: Record<string, Record<string, unknown>> = {
		'Clippings/klipp.md': { kontext: 'NORDKAPAREN', projekt: '#DOK' },
		'05_PERSONER/Benny/Benny.md': { kontext: 'NORDKAPAREN', projekt: ['#DOK'], typ: 'person' },
		'x/delprojekt.md': { delprojekt: '#DOK/vinga' },
		'03_PROJEKTPLANERING/RISE/_inbox.md': { kontext: 'RISE', projekt: '#RISE' },
	};
	const fmOf = (p: string) => FM[p];

	it('scope from a hub / note / folder / context note / loose note', () => {
		expect(scopeFor('03_PROJEKTPLANERING/NORDKAPAREN/DOK/20260624000000 NORDKAPAREN DOK hub.md', false,
			{ kontext: 'NORDKAPAREN', projekt: '#DOK', typ: 'hub' }))
			.toEqual({ kind: 'project', label: 'DOK', ctx: 'NORDKAPAREN', proj: 'DOK' });
		expect(scopeFor('03_PROJEKTPLANERING/RISE/UND/notes/a.md', false, {}))
			.toEqual({ kind: 'project', label: 'UND', ctx: 'RISE', proj: 'UND' });
		expect(scopeFor('03_PROJEKTPLANERING/RISE/UND/notes', true, null))
			.toEqual({ kind: 'project', label: 'UND', ctx: 'RISE', proj: 'UND' });
		expect(scopeFor('03_PROJEKTPLANERING/RISE', true, null)).toEqual({ kind: 'context', label: 'RISE', ctx: 'RISE' });
		expect(scopeFor('03_PROJEKTPLANERING/RISE/_inbox.md', false, FM['03_PROJEKTPLANERING/RISE/_inbox.md']))
			.toEqual({ kind: 'context', label: 'RISE', ctx: 'RISE' });
		expect(scopeFor('Clippings/klipp.md', false, FM['Clippings/klipp.md']))
			.toEqual({ kind: 'project', label: 'DOK', ctx: 'NORDKAPAREN', proj: 'DOK' });
		expect(scopeFor('04_INBOX/lös.md', false, {})).toEqual({ kind: 'note', label: 'lös', path: '04_INBOX/lös.md' });
		expect(scopeFor('03_PROJEKTPLANERING/_done/RISE/X', true, null).kind).toBe('folder');
	});

	it('project scope: tags (subprojects too), frontmatter, folder; other lila days blocked', () => {
		const scope = scopeFor('03_PROJEKTPLANERING/NORDKAPAREN/DOK', true, null);
		const tasks = [
			task('a.md', ['röd', 'DOK', 'NORDKAPAREN']),                         // tag
			task('b.md', ['lila', 'DOK', 'DOK/styrelsemöte_oktober']),           // subproject tag
			task('Clippings/klipp.md', []),                                       // note's projekt
			task('x/delprojekt.md', []),                                          // note's delprojekt
			task('03_PROJEKTPLANERING/NORDKAPAREN/DOK/notes/n.md', []),           // folder
			task('c.md', ['lila', 'UND', 'RISE']),                                // other project's shoot → blocked
			{ ...task('d.md', ['röd', 'UND', 'RISE']), datePrecision: { dueDate: 'time' as const } }, // other project's timed meeting → hidden
			task('e.md', ['DOKUMENT']),                                           // not DOK
		];
		const out = applyScope(tasks, scope, fmOf);
		expect(out.map((t) => [t.filePath, !!t.forkBlocked])).toEqual([
			['a.md', false], ['b.md', false], ['Clippings/klipp.md', false], ['x/delprojekt.md', false],
			['03_PROJEKTPLANERING/NORDKAPAREN/DOK/notes/n.md', false], ['c.md', true],
		]);
		expect(tasks[5].forkBlocked).toBeUndefined();                          // a copy, not the store's task
	});

	it('blocked days: #lila always (times or not), #röd only all-day', () => {
		const scope = scopeFor('03_PROJEKTPLANERING/NORDKAPAREN/DOK', true, null);
		const line = (l: string) => parseSingleTaskLine(l, 'o.md', 'o.md', 1, ['dataview'])!;
		const out = applyScope([
			line('- [ ] inspelning #lila #UND [start:: 2026-10-20 10:00] [due:: 2026-10-20 13:00]'),
			line('- [ ] heldagsmöte #röd #UND [due:: 2026-10-21]'),
			line('- [ ] möte kl 10 #röd #UND [due:: 2026-10-22 10:00]'),
		], scope, fmOf);
		expect(out.map((t) => [t.description, !!t.forkBlocked])).toEqual([['inspelning', true], ['heldagsmöte', true]]);
		const light = dayMarks(out.filter((t) => t.description === 'heldagsmöte'));
		expect(light.map((m) => [m.color.key, m.light])).toEqual([['rod', true]]);
	});

	it('context scope: #CTX, kontext:, the context folder', () => {
		const scope = scopeFor('03_PROJEKTPLANERING/NORDKAPAREN', true, null);
		const out = applyScope([
			task('a.md', ['NORDKAPAREN']), task('Clippings/klipp.md', []),
			task('03_PROJEKTPLANERING/NORDKAPAREN/_inbox.md', []), task('z.md', ['RISE']),
		], scope, fmOf);
		expect(out.map((t) => t.filePath)).toEqual(['a.md', 'Clippings/klipp.md', '03_PROJEKTPLANERING/NORDKAPAREN/_inbox.md']);
	});

	it('NFD paths and tags (macOS) match their NFC scope', () => {
		const scope = scopeFor('03_PROJEKTPLANERING/HEM/BOKLÅN', true, null);
		const nfd = '03_PROJEKTPLANERING/HEM/BOKLÅN/notes/n.md';
		expect(applyScope([task(nfd, []), task('q.md', ['BOKLÅN'])], scope, fmOf).length).toBe(2);
	});
});

describe('fork: own plugin id', () => {
	it('GC_PLUGIN_ID equals manifest.json id', () => {
		const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
		expect(GC_PLUGIN_ID).toBe(manifest.id);
	});
});

describe('fork: a scope replaces the saved tag filters without touching them', () => {
	it('ignored while the scope is open, a new choice applies, back after ×', () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { useCalendarStore, selectViewFilter } = require('../src/ui/store/calendarStore');
		const st = useCalendarStore.getState();
		st.setTagFilter('month', { selectedTags: ['DOM_MUZYKA'], operator: 'OR' });
		const scope = scopeFor('03_PROJEKTPLANERING/NORDKAPAREN/DOK', true, null);
		useCalendarStore.getState().setForkScope(scope, (t: GCTask[]) => t);
		const a = selectViewFilter(useCalendarStore.getState(), 'month');
		expect(a.tag.selectedTags).toEqual([]);
		expect(selectViewFilter(useCalendarStore.getState(), 'month')).toBe(a);      // stable for zustand
		expect(useCalendarStore.getState().viewFilters.month.tag.selectedTags).toEqual(['DOM_MUZYKA']); // saved untouched
		useCalendarStore.getState().setTagFilter('month', { selectedTags: ['lila'], operator: 'OR' });
		expect(selectViewFilter(useCalendarStore.getState(), 'month').tag.selectedTags).toEqual(['lila']); // narrowing inside the scope
		useCalendarStore.getState().setTagFilter('month', { selectedTags: ['DOM_MUZYKA'], operator: 'OR' });
		useCalendarStore.getState().setForkScope(null, null);
		expect(selectViewFilter(useCalendarStore.getState(), 'month').tag.selectedTags).toEqual(['DOM_MUZYKA']);
		expect(useCalendarStore.getState().viewTasks).toBe(useCalendarStore.getState().tasks);
	});
});


describe('fork: gantt and month views open on all tags', () => {
	const f = (tags: string[]): any => ({ status: { selectedStatuses: ['todo', 'done'] }, tag: { selectedTags: tags, operator: 'OR' }, sort: { field: 'dueDate', order: 'asc' } });
	const saved: any = { gantt: f(['UND']), month: f(['NORDKAPAREN', 'DOK', 'UND']), week: f(['DOK']) };
	it('drops the saved gantt and month tag selections, keeps operator/status/sort', () => {
		const out: any = forkOpenUnfiltered(saved);
		expect(out.gantt.tag.selectedTags).toEqual([]);
		expect(out.month.tag.selectedTags).toEqual([]);
		expect(out.month.tag.operator).toBe('OR');
		expect(out.month.status).toEqual(saved.month.status);
	});
	it('leaves the other views\' tag filters alone', () => {
		expect((forkOpenUnfiltered(saved) as any).week.tag.selectedTags).toEqual(['DOK']);
	});
	it('no saved filters / nothing selected → unchanged', () => {
		expect(forkOpenUnfiltered(null)).toBeNull();
		const clean: any = { gantt: f([]), week: f(['DOK']) };
		expect(forkOpenUnfiltered(clean)).toBe(clean);
	});
});

describe('fork: sync id hidden in the calendar, kept in the line', () => {
	it('strips (id:: …) from what is shown', () => {
		expect(forkDisplayText('Arbetsmöte (id:: f0cc25)')).toBe('Arbetsmöte');
		expect(forkDisplayText('möte (id:: ab12cd) med Johan')).toBe('möte med Johan');
	});
	it('leaves ordinary parentheses alone', () => {
		expect(forkDisplayText('backup A (offline)')).toBe('backup A (offline)');
	});
	it('the parsed description keeps the id, so write-back keeps it', () => {
		const LINE = '- [ ] Arbetsmöte #röd #UND [due:: 2026-10-16 10:00] (id:: f0cc25)';
		const t = parseSingleTaskLine(LINE, 'n.md', 'n.md', 1, ['dataview'])!;
		expect(t.description).toContain('(id:: f0cc25)');
		expect(forkDisplayText(t.description)).toBe('Arbetsmöte');
		expect(serializeTask(app, t, { dueDate: new Date(2026, 9, 17, 10, 0), datePrecision: { dueDate: 'time' } } as any, 'dataview')).toContain('(id:: f0cc25)');
	});
});


describe('fork: calendar cards show only the colours', () => {
	it('tag text is off unless switched on', () => {
		expect(forkTagTextOn({})).toBe(false);
		expect(forkTagTextOn(undefined)).toBe(false);
		expect(forkTagTextOn({ forkShowTagText: true })).toBe(true);
	});
});
