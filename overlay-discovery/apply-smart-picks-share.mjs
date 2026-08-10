import { readFile, writeFile } from 'node:fs/promises';

const path = 'app/src/components/results/SmartPicksApp.svelte';
let source = await readFile(path, 'utf8');

function replaceOnce(before, after, label) {
	const count = source.split(before).length - 1;
	if (count !== 1) throw new Error(`${label}: expected exactly one source match, found ${count}`);
	source = source.replace(before, after);
}

replaceOnce(
	"\timport PlaceSheet from '../place/PlaceSheet.svelte';\n\timport { appStorage } from '../../lib/storage.svelte';",
	"\timport PlaceSheet from '../place/PlaceSheet.svelte';\n\timport ShareButton from '../common/ShareButton.svelte';\n\timport { appStorage } from '../../lib/storage.svelte';",
	'ShareButton import',
);

replaceOnce(
	"\tconst remainingPicks = $derived(Math.max(0, picks.length - visiblePicks.length));\n\tconst routingNote = $derived(",
	"\tconst remainingPicks = $derived(Math.max(0, picks.length - visiblePicks.length));\n\tconst routeSharePath = $derived(\n\t\tcontext ? `/picks?${serializeSearchParams(context).toString()}` : '/picks',\n\t);\n\tconst routingNote = $derived(",
	'canonical route share path',
);

replaceOnce(
	"\t\t\t</div>\n\t\t</div>\n\t</header>\n\n\t<div class=\"results-sheet\">",
	"\t\t\t</div>\n\t\t\t<ShareButton\n\t\t\t\tlabel=\"Share route\"\n\t\t\t\ttitle=\"UPPETITE route\"\n\t\t\t\ttext={`${originName} → ${destinationName} · ${context?.breakMinutes ?? 45} min break`}\n\t\t\t\tpath={routeSharePath}\n\t\t\t\tcompact\n\t\t\t/>\n\t\t</div>\n\t</header>\n\n\t<div class=\"results-sheet\">",
	'route share control',
);

replaceOnce(
	"\t\tgap: 0.65rem;\n\t\tmargin-top: 0.65rem;",
	"\t\tgap: 0.65rem;\n\t\tflex-wrap: wrap;\n\t\tmargin-top: 0.65rem;",
	'context action wrapping',
);

replaceOnce(
	"\t\tmin-width: 0;\n\t\tgap: 0.45rem;\n\t}",
	"\t\tmin-width: 0;\n\t\tgap: 0.45rem;\n\t\tflex-wrap: wrap;\n\t}",
	'refinement wrapping',
);

await writeFile(path, source, 'utf8');
process.stdout.write('Applied Release 1 Smart Picks route-share integration.\n');
