let maplibrePromise: Promise<typeof import('maplibre-gl')> | undefined;

export function loadMapLibre(): Promise<typeof import('maplibre-gl')> {
	maplibrePromise ??= Promise.all([
		import('maplibre-gl'),
		import('maplibre-gl/dist/maplibre-gl.css'),
		import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
	]).then(([maplibre, , worker]) => {
		maplibre.setWorkerUrl(worker.default);
		return maplibre;
	});

	return maplibrePromise;
}
