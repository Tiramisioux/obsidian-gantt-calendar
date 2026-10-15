/**
 * fork: the plugin's own id (must equal manifest.json "id" — tests/fork.test.ts
 * checks it). Upstream looks itself up as 'gantt-calendar' in several places;
 * under the fork's id those lookups found nothing (or the disabled original),
 * so they all go through this constant.
 */
export const GC_PLUGIN_ID = 'gantt-calendar-tiramisioux';
