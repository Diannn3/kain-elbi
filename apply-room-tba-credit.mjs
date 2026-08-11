import { readFile, writeFile } from 'node:fs/promises';

const path = 'app/src/layouts/Layout.astro';
let source = await readFile(path, 'utf8');

function addImport(importLine, anchorLine) {
	if (source.includes(importLine)) return;
	if (!source.includes(anchorLine)) {
		throw new Error(`Could not find import anchor in ${path}: ${anchorLine}`);
	}
	source = source.replace(anchorLine, `${anchorLine}\n${importLine}`);
}

addImport(
	"import RoomTbaCreditTrigger from '../components/layout/RoomTbaCreditTrigger.astro';",
	"import DeveloperContactModal from '../components/layout/DeveloperContactModal.astro';",
);
addImport(
	"import RoomTbaCreditModal from '../components/layout/RoomTbaCreditModal.astro';",
	"import RoomTbaCreditTrigger from '../components/layout/RoomTbaCreditTrigger.astro';",
);

const oldFooter = '<p><a href="/contribute">Contribute to UPPETITE</a> · © OpenStreetMap contributors · Overture Maps</p>';
const newFooter = '<p><a href="/contribute">Contribute to UPPETITE</a> · <RoomTbaCreditTrigger /> · © OpenStreetMap contributors · Overture Maps</p>';

if (!source.includes(newFooter)) {
	if (!source.includes(oldFooter)) {
		throw new Error(`Could not find the expected current-main footer attribution line in ${path}.`);
	}
	source = source.replace(oldFooter, newFooter);
}

// Keep one global Room TBA dialog mount. Prefer placing it immediately after the existing
// Developer Contact modal, which current main already mounts globally.
source = source.replace(/\n?[ \t]*<RoomTbaCreditModal\s*\/>\s*/g, '\n');

const developerModalMount = '<DeveloperContactModal />';
if (source.includes(developerModalMount)) {
	source = source.replace(
		developerModalMount,
		`${developerModalMount}\n\t\t<RoomTbaCreditModal />`,
	);
} else {
	const scriptMatches = [...source.matchAll(/\n([ \t]*)<script\b/g)];
	const finalScript = scriptMatches.at(-1);
	if (!finalScript || finalScript.index === undefined) {
		throw new Error(`Could not find a global script block in ${path}.`);
	}
	const indent = finalScript[1];
	source =
		source.slice(0, finalScript.index) +
		`\n${indent}<RoomTbaCreditModal />` +
		source.slice(finalScript.index);
}

await writeFile(path, source, 'utf8');
process.stdout.write('Applied Room TBA copyright and attribution UI.\n');
