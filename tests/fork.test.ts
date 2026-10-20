/**
 * fork (Tiramisioux): tags in any script, the vault's colour convention,
 * month-view day marks, the vault's slot order on write-back, own plugin id.
 */
import { parseSingleTaskLine } from '../src/tasks/taskParser/main';
import { serializeTask } from '../src/tasks/taskSerializer';
import { extractTags, removeTags } from '../src/tasks/taskParser/utils';
import { vaultColorOfTag, vaultColorOfTask, dayMarks, dayMarkBackground, dayMarkInk, VAULT_COLORS } from '../src/fork/vaultColors';
import { scopeFor, applyScope, type Struktur } from '../src/fork/scope';
import VaultStruktur from '../src/fork/vault_struktur';
import type { GCTask } from '../src/types';
import { GC_PLUGIN_ID } from '../src/fork/pluginId';
import { forkOpenUnfiltered } from '../src/fork/viewDefaults';
import { forkDisplayText } from '../src/fork/displayText';
import { forkTagTextOn } from '../src/fork/tagText';
import { App } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';

const app = {} as App;

// fork: the tree contract the scope tests run on (C1 of the vault restructure) and a small new-tree vault.
const CONTRACT = {
	version: 1,
	'områden': [{ mapp: '01_HEM', kontext: 'HEM' }, { mapp: '02_PROJEKT', kontext: null }, { mapp: '03_RISE', kontext: 'RISE' }],
	arkiv: '_archive', anteckningar: 'notes', analog: 'analog', analogrot: '_analoga anteckningar',
	mallar: '_templates', hubmall: '_templates/projekt_task_template.md', inkorg: '_inbox.md',
	otaggat: '04_INBOX', standardkontext: 'RISE',
};
const TREE = [
	'01_HEM/_inbox.md', '01_HEM/BOKLÅN/20260101000000 HEM BOKLÅN hub.md', '01_HEM/BOKLÅN/notes/n.md',
	'01_HEM/_archive/GAMMALT/notes/old.md',
	'03_RISE/_inbox.md', '03_RISE/UND/20260101000001 RISE UND hub.md', '03_RISE/UND/notes/a.md',
	'03_RISE/_archive/GAMLA/notes/x.md', '03_RISE/_archive/ANDRA/notes/n.md',
	'02_PROJEKT/NORDKAPAREN/20260624000000 NORDKAPAREN hub.md', '02_PROJEKT/NORDKAPAREN/_inbox.md',
	'02_PROJEKT/NORDKAPAREN/notes/n.md', '02_PROJEKT/NORDKAPAREN/DOK/20260624000001 NORDKAPAREN DOK hub.md',
	'02_PROJEKT/NORDKAPAREN/DOK/notes/n.md', '02_PROJEKT/NORDKAPAREN/_archive/FORSTUDIE/notes/n.md',
	'02_PROJEKT/CINEMATE/DEV/20260709140002 CINEMATE DEV hub.md',
	'02_PROJEKT/_archive/GÄDDKUNGEN/20260101000002 GÄDDKUNGEN hub.md', '02_PROJEKT/_archive/GÄDDKUNGEN/notes/x.md',
	'04_INBOX/lös.md',
];

/** a Struktur over an in-memory vault: `tree` lists files; entries ending in "/" are empty folders */
function makeStruktur(cfg: Record<string, unknown>, tree: string[]): Struktur {
	const kids = new Map<string, Map<string, boolean>>([['', new Map()]]);
	const add = (p: string, isDir: boolean) => {
		let cur = '';
		const parts = p.split('/');
		parts.forEach((part, i) => {
			const next = cur ? cur + '/' + part : part;
			const dir = i < parts.length - 1 || isDir;
			if (!kids.has(cur)) kids.set(cur, new Map());
			kids.get(cur)!.set(part, dir);
			if (dir && !kids.has(next)) kids.set(next, new Map());
			cur = next;
		});
	};
	for (const e of tree) add(e.replace(/\/+$/, ''), e.endsWith('/'));
	return VaultStruktur.from_config(cfg, (rel) => {
		const k = kids.get(rel);
		return k ? [...k.entries()].map(([name, dir]) => ({ name, dir })) : null;
	});
}
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
		'03_RISE/_inbox.md': { kontext: 'RISE', projekt: '#RISE' },
	};
	const fmOf = (p: string) => FM[p];
	const vs = makeStruktur(CONTRACT, TREE);

	it('scope from a hub / note / folder / context note / loose note', () => {
		expect(scopeFor('02_PROJEKT/NORDKAPAREN/DOK/20260624000000 NORDKAPAREN DOK hub.md', false,
			{ kontext: 'NORDKAPAREN', projekt: '#DOK', typ: 'hub' }, vs))
			.toEqual({ kind: 'project', label: 'DOK', ctx: 'NORDKAPAREN', proj: 'DOK' });
		expect(scopeFor('03_RISE/UND/notes/a.md', false, {}, vs))
			.toEqual({ kind: 'project', label: 'UND', ctx: 'RISE', proj: 'UND' });
		expect(scopeFor('03_RISE/UND/notes', true, null, vs))
			.toEqual({ kind: 'project', label: 'UND', ctx: 'RISE', proj: 'UND' });
		expect(scopeFor('03_RISE', true, null, vs)).toEqual({ kind: 'context', label: 'RISE', ctx: 'RISE' });
		expect(scopeFor('03_RISE/_inbox.md', false, FM['03_RISE/_inbox.md'], vs))
			.toEqual({ kind: 'context', label: 'RISE', ctx: 'RISE' });
		expect(scopeFor('Clippings/klipp.md', false, FM['Clippings/klipp.md'], vs))
			.toEqual({ kind: 'project', label: 'DOK', ctx: 'NORDKAPAREN', proj: 'DOK' });
		expect(scopeFor('04_INBOX/lös.md', false, {}, vs)).toEqual({ kind: 'note', label: 'lös', path: '04_INBOX/lös.md' });
		// the archive folder itself and an area's loose folder are plain folders, not a kontext
		expect(scopeFor('03_RISE/_archive', true, null, vs).kind).toBe('folder');
		expect(scopeFor('02_PROJEKT', true, null, vs).kind).toBe('folder');
		expect(scopeFor('02_PROJEKT/NORDKAPAREN/notes', true, null, vs).kind).toBe('folder');
	});

	it('an archived project scopes exactly like an active one', () => {
		const want = { kind: 'project', label: 'GAMLA', ctx: 'RISE', proj: 'GAMLA' };
		expect(scopeFor('03_RISE/_archive/GAMLA', true, null, vs)).toEqual(want);
		expect(scopeFor('03_RISE/_archive/GAMLA/notes', true, null, vs)).toEqual(want);
		expect(scopeFor('03_RISE/_archive/GAMLA/notes/x.md', false, {}, vs)).toEqual(want);
		expect(scopeFor('02_PROJEKT/NORDKAPAREN/_archive/FORSTUDIE', true, null, vs))
			.toEqual({ kind: 'project', label: 'FORSTUDIE', ctx: 'NORDKAPAREN', proj: 'FORSTUDIE' });
		const scope = scopeFor('03_RISE/_archive/GAMLA', true, null, vs);
		const out = applyScope([
			task('03_RISE/_archive/GAMLA/notes/x.md', []),     // inside the archived folder
			task('a.md', ['GAMLA']),                            // tag
			task('03_RISE/UND/notes/a.md', []),                 // another project of the same kontext
			task('03_RISE/_archive/ANDRA/notes/n.md', []),      // another archived project
		], scope, fmOf, vs);
		expect(out.map((t) => t.filePath)).toEqual(['03_RISE/_archive/GAMLA/notes/x.md', 'a.md']);
	});

	it('02 kontexts: kontext level, projects inside, archived whole kontext, archived 02 project', () => {
		expect(scopeFor('02_PROJEKT/NORDKAPAREN', true, null, vs)).toEqual({ kind: 'context', label: 'NORDKAPAREN', ctx: 'NORDKAPAREN' });
		expect(scopeFor('02_PROJEKT/_archive/GÄDDKUNGEN', true, null, vs)).toEqual({ kind: 'context', label: 'GÄDDKUNGEN', ctx: 'GÄDDKUNGEN' });
		expect(scopeFor('02_PROJEKT/NORDKAPAREN/DOK', true, null, vs)).toEqual({ kind: 'project', label: 'DOK', ctx: 'NORDKAPAREN', proj: 'DOK' });
		// kontext-level note whose frontmatter names the kontext as its project: still the kontext
		expect(scopeFor('02_PROJEKT/NORDKAPAREN/20260624000000 NORDKAPAREN hub.md', false, { kontext: 'NORDKAPAREN', projekt: '#NORDKAPAREN' }, vs))
			.toEqual({ kind: 'context', label: 'NORDKAPAREN', ctx: 'NORDKAPAREN' });
		// a note in a 02 project (project folder one level below the kontext)
		expect(scopeFor('02_PROJEKT/NORDKAPAREN/DOK/notes/n.md', false, {}, vs))
			.toEqual({ kind: 'project', label: 'DOK', ctx: 'NORDKAPAREN', proj: 'DOK' });
		// the archived kontext's tasks are in its context scope, the active kontext's are not
		const ctxScope = scopeFor('02_PROJEKT/_archive/GÄDDKUNGEN', true, null, vs);
		const out = applyScope([
			task('02_PROJEKT/_archive/GÄDDKUNGEN/notes/x.md', []),
			task('02_PROJEKT/NORDKAPAREN/notes/n.md', []),
		], ctxScope, fmOf, vs);
		expect(out.map((t) => t.filePath)).toEqual(['02_PROJEKT/_archive/GÄDDKUNGEN/notes/x.md']);
		// 02 project scope: its own folder (and nothing of the kontext level)
		const proj = applyScope([
			task('02_PROJEKT/NORDKAPAREN/DOK/notes/n.md', []),
			task('02_PROJEKT/NORDKAPAREN/notes/n.md', []),
			task('02_PROJEKT/NORDKAPAREN/_archive/FORSTUDIE/notes/n.md', []),
		], scopeFor('02_PROJEKT/NORDKAPAREN/DOK', true, null, vs), fmOf, vs);
		expect(proj.map((t) => t.filePath)).toEqual(['02_PROJEKT/NORDKAPAREN/DOK/notes/n.md']);
	});

	it('project scope: tags (subprojects too), frontmatter, folder; other lila days blocked', () => {
		const scope = scopeFor('02_PROJEKT/NORDKAPAREN/DOK', true, null, vs);
		const tasks = [
			task('a.md', ['röd', 'DOK', 'NORDKAPAREN']),                         // tag
			task('b.md', ['lila', 'DOK', 'DOK/styrelsemöte_oktober']),           // subproject tag
			task('Clippings/klipp.md', []),                                       // note's projekt
			task('x/delprojekt.md', []),                                          // note's delprojekt
			task('02_PROJEKT/NORDKAPAREN/DOK/notes/n.md', []),                    // folder
			task('c.md', ['lila', 'UND', 'RISE']),                                // other project's shoot → blocked
			{ ...task('d.md', ['röd', 'UND', 'RISE']), datePrecision: { dueDate: 'time' as const } }, // other project's timed meeting → hidden
			task('e.md', ['DOKUMENT']),                                           // not DOK
		];
		const out = applyScope(tasks, scope, fmOf, vs);
		expect(out.map((t) => [t.filePath, !!t.forkBlocked])).toEqual([
			['a.md', false], ['b.md', false], ['Clippings/klipp.md', false], ['x/delprojekt.md', false],
			['02_PROJEKT/NORDKAPAREN/DOK/notes/n.md', false], ['c.md', true],
		]);
		expect(tasks[5].forkBlocked).toBeUndefined();                          // a copy, not the store's task
	});

	it('blocked days: #lila always (times or not), #röd only all-day', () => {
		const scope = scopeFor('02_PROJEKT/NORDKAPAREN/DOK', true, null, vs);
		const line = (l: string) => parseSingleTaskLine(l, 'o.md', 'o.md', 1, ['dataview'])!;
		const out = applyScope([
			line('- [ ] inspelning #lila #UND [start:: 2026-10-20 10:00] [due:: 2026-10-20 13:00]'),
			line('- [ ] heldagsmöte #röd #UND [due:: 2026-10-21]'),
			line('- [ ] möte kl 10 #röd #UND [due:: 2026-10-22 10:00]'),
		], scope, fmOf, vs);
		expect(out.map((t) => [t.description, !!t.forkBlocked])).toEqual([['inspelning', true], ['heldagsmöte', true]]);
		const light = dayMarks(out.filter((t) => t.description === 'heldagsmöte'));
		expect(light.map((m) => [m.color.key, m.light])).toEqual([['rod', true]]);
	});

	it('context scope: #CTX, kontext:, the kontext folder (archived projects included)', () => {
		const scope = scopeFor('02_PROJEKT/NORDKAPAREN', true, null, vs);
		const out = applyScope([
			task('a.md', ['NORDKAPAREN']), task('Clippings/klipp.md', []),
			task('02_PROJEKT/NORDKAPAREN/_inbox.md', []), task('z.md', ['RISE']),
			task('02_PROJEKT/NORDKAPAREN/_archive/FORSTUDIE/notes/n.md', []),
		], scope, fmOf, vs);
		expect(out.map((t) => t.filePath)).toEqual(['a.md', 'Clippings/klipp.md', '02_PROJEKT/NORDKAPAREN/_inbox.md',
			'02_PROJEKT/NORDKAPAREN/_archive/FORSTUDIE/notes/n.md']);
		const rise = applyScope([task('03_RISE/_archive/GAMLA/notes/x.md', []), task('03_RISE/UND/notes/a.md', []), task('01_HEM/BOKLÅN/notes/n.md', [])],
			scopeFor('03_RISE', true, null, vs), fmOf, vs);
		expect(rise.map((t) => t.filePath)).toEqual(['03_RISE/_archive/GAMLA/notes/x.md', '03_RISE/UND/notes/a.md']);
	});

	it('NFD paths and tags (macOS) match their NFC scope', () => {
		const scope = scopeFor('01_HEM/BOKLÅN', true, null, vs);
		const nfd = '01_HEM/BOKLÅN/notes/n.md';
		expect(applyScope([task(nfd, []), task('q.md', ['BOKLÅN'])], scope, fmOf, vs).length).toBe(2);
	});

	it('resolve parity: every resolve case of the shared case file gives the same answer through the vendored library', () => {
		const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'vault_struktur_cases.json'), 'utf8'));
		const shared = makeStruktur(data.config, data.tree);
		const cases = data.cases.filter((c: { fn: string }) => c.fn === 'resolve');
		const wrong = cases.filter((c: { args: string[]; expect: unknown }) => JSON.stringify(shared.resolve(c.args[0])) !== JSON.stringify(c.expect));
		expect(cases.length).toBeGreaterThanOrEqual(40);
		expect(wrong).toEqual([]);
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
		const scope = scopeFor('02_PROJEKT/NORDKAPAREN/DOK', true, null, makeStruktur(CONTRACT, TREE));
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
