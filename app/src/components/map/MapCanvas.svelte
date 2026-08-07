<script lang="ts">
	import { onMount } from 'svelte';
	import type { Anchor, SmartPick } from '../../lib/types';

	let {
		origin,
		destination,
		picks,
		selectedId,
		routeCoordinates,
		onSelect,
		onUnavailable,
	}: {
		origin: Anchor;
		destination?: Anchor;
		picks: SmartPick[];
		selectedId?: string;
		routeCoordinates?: Array<[number, number]>;
		onSelect: (pick: SmartPick) => void;
		onUnavailable: () => void;
	} = $props();

	let mapElement: HTMLDivElement;
	let mapState = $state<'starting' | 'ready' | 'failed'>('starting');
	let map = $state.raw<import('maplibre-gl').Map | undefined>();
	let maplibreModule = $state.raw<typeof import('maplibre-gl') | undefined>();
	let activeMarkers: import('maplibre-gl').Marker[] = [];
	let cameraFocusedId = $state('');
	let cameraZoom = $state('');
	let lastFocusedId: string | undefined;

	$effect(() => {
		if (mapState !== 'ready' || !map || !maplibreModule) return;

		activeMarkers.forEach((marker) => marker.remove());
		activeMarkers = [];

		function addMarker(
			label: string,
			lon: number,
			lat: number,
			kind: string,
			action?: () => void,
			options?: { id?: string; name?: string; selected?: boolean },
		) {
			const element = document.createElement(action ? 'button' : 'div');
			element.className = `map-marker map-marker--${kind}`;
			const badge = document.createElement('span');
			badge.className = 'map-marker__badge';
			badge.textContent = label;
			badge.setAttribute('aria-hidden', 'true');
			element.append(badge);
			if (element instanceof HTMLButtonElement) element.type = 'button';
			if (options?.id) element.dataset.placeId = options.id;
			element.classList.toggle('is-selected', options?.selected === true);
			element.setAttribute(
				'aria-label',
				kind === 'place'
					? `Route fit #${label}: ${options?.name ?? 'food place'}${options?.selected ? ', selected' : ''}`
					: label === 'A' ? `Origin: ${origin.name}` : destination ? `Next class: ${destination.name}` : label,
			);
			if (kind === 'place') element.setAttribute('aria-pressed', String(options?.selected === true));
			if (action) element.addEventListener('click', action);
			const marker = new maplibreModule.Marker({ element }).setLngLat([lon, lat]).addTo(map);
			activeMarkers.push(marker);
		}

		addMarker('A', origin.lon, origin.lat, 'origin');
		if (destination) addMarker('B', destination.lon, destination.lat, 'destination');

		const topLimit = 15;
		const renderPicks = new Set<string>();
		picks.slice(0, topLimit).forEach((pick) => renderPicks.add(pick.place.id));

		let selectedPickIndex = -1;
		if (selectedId) {
			selectedPickIndex = picks.findIndex((pick) => pick.place.id === selectedId);
			if (selectedPickIndex >= 0) renderPicks.add(selectedId);
		}

		picks.forEach((pick, index) => {
			if (!renderPicks.has(pick.place.id)) return;
			addMarker(String(index + 1), pick.place.lon, pick.place.lat, 'place', () => onSelect(pick), {
				id: pick.place.id,
				name: pick.place.name,
				selected: pick.place.id === selectedId,
			});
		});

		const focusPick = selectedPickIndex >= 0 ? picks[selectedPickIndex] : picks[0];
		const contextCoords: number[][] = [[origin.lon, origin.lat]];
		if (focusPick) contextCoords.push([focusPick.place.lon, focusPick.place.lat]);
		if (destination) contextCoords.push([destination.lon, destination.lat]);

		// Only routeCoordinates from Room TBA are drawn as a solid route. The fallback
		// context polyline is intentionally dashed and must never be presented as turn-by-turn walking directions.
		const contextSource = map.getSource('route-context') as import('maplibre-gl').GeoJSONSource;
		const actualSource = map.getSource('route-actual') as import('maplibre-gl').GeoJSONSource;
		const hasActualRoute = Boolean(routeCoordinates && routeCoordinates.length >= 2);
		if (contextSource) {
			contextSource.setData({
				type: 'Feature',
				properties: {},
				geometry: { type: 'LineString', coordinates: hasActualRoute ? [] : contextCoords },
			});
		}
		if (actualSource) {
			actualSource.setData({
				type: 'Feature',
				properties: {},
				geometry: { type: 'LineString', coordinates: hasActualRoute ? routeCoordinates! : [] },
			});
		}

		const backgroundFeatures = picks
			.map((pick, index) => ({ pick, rank: index + 1 }))
			.filter((item) => !renderPicks.has(item.pick.place.id))
			.map((item) => ({
				type: 'Feature' as const,
				geometry: { type: 'Point' as const, coordinates: [item.pick.place.lon, item.pick.place.lat] },
				properties: { id: item.pick.place.id, rank: item.rank },
			}));

		const otherSource = map.getSource('other-picks') as import('maplibre-gl').GeoJSONSource;
		if (otherSource) {
			otherSource.setData({ type: 'FeatureCollection', features: backgroundFeatures });
		}
	});

	$effect(() => {
		const currentMap = map;
		const id = selectedId;
		if (mapState !== 'ready' || !currentMap || !id || id === lastFocusedId) return;
		const pick = picks.find((candidate) => candidate.place.id === id);
		if (!pick) return;

		lastFocusedId = id;
		cameraFocusedId = '';
		cameraZoom = '';
		const onMoveEnd = () => {
			cameraFocusedId = id;
			cameraZoom = currentMap.getZoom().toFixed(2);
		};
		currentMap.once('moveend', onMoveEnd);
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const frame = requestAnimationFrame(() => {
			currentMap.easeTo({
				center: [pick.place.lon, pick.place.lat],
				zoom: Math.max(currentMap.getZoom(), 16.8),
				padding: { top: 72, right: 48, bottom: 210, left: 48 },
				duration: reducedMotion ? 0 : 520,
			});
		});

		return () => {
			cancelAnimationFrame(frame);
			currentMap.off('moveend', onMoveEnd);
		};
	});

	onMount(() => {
		let disposed = false;
		let resizeObserver: ResizeObserver | undefined;
		const unavailable = () => {
			if (disposed) return;
			mapState = 'failed';
			onUnavailable();
		};

		async function start() {
			try {
				const canvas = document.createElement('canvas');
				if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) throw new Error('WebGL unavailable');
				const mapTilerKey = import.meta.env.PUBLIC_MAPTILER_KEY?.trim();
				if (!mapTilerKey) throw new Error('PUBLIC_MAPTILER_KEY is not configured');

				const maplibre = await import('maplibre-gl');
				maplibreModule = maplibre;
				await import('maplibre-gl/dist/maplibre-gl.css');
				if (disposed) return;

				const style = `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(mapTilerKey)}`;
				map = new maplibre.Map({
					container: mapElement,
					style,
					center: [origin.lon, origin.lat],
					zoom: 15.5,
					maxBounds: [[121.215, 14.135], [121.275, 14.195]],
					cooperativeGestures: true,
					dragRotate: false,
					pitchWithRotate: false,
					respectPrefersReducedMotion: true,
					attributionControl: false,
				});
				map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
				map.addControl(new maplibre.AttributionControl({ compact: true, customAttribution: '© MapTiler · © OpenStreetMap contributors · Overture Maps' }));

				resizeObserver = new ResizeObserver(() => map?.resize());
				resizeObserver.observe(mapElement);

				map.on('load', () => {
					if (!map) return;
					map.addSource('route-context', {
						type: 'geojson',
						data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
					});
					map.addLayer({
						id: 'route-context-line',
						type: 'line',
						source: 'route-context',
						paint: { 'line-color': '#176b3a', 'line-width': 3, 'line-opacity': 0.72, 'line-dasharray': [2, 2] },
					});

					map.addSource('route-actual', {
						type: 'geojson',
						data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
					});
					map.addLayer({
						id: 'route-actual-line',
						type: 'line',
						source: 'route-actual',
						paint: {
							'line-color': '#0f5c33',
							'line-width': 5,
							'line-opacity': 0.9,
						},
					});

					map.addSource('other-picks', {
						type: 'geojson',
						data: { type: 'FeatureCollection', features: [] },
					});
					map.addLayer({
						id: 'other-picks-circles',
						type: 'circle',
						source: 'other-picks',
						paint: {
							'circle-radius': 6,
							'circle-color': '#eab308',
							'circle-stroke-width': 2,
							'circle-stroke-color': '#ffffff',
						},
					});
					// The visible dot stays compact while this nearly-transparent layer gives
					// touch users a forgiving ~40px hit area.
					map.addLayer({
						id: 'other-picks-hit',
						type: 'circle',
						source: 'other-picks',
						paint: { 'circle-radius': 20, 'circle-color': '#000000', 'circle-opacity': 0.01 },
					});

					const selectBackgroundPick = (event: import('maplibre-gl').MapMouseEvent & { features?: import('maplibre-gl').MapGeoJSONFeature[] }) => {
						const id = event.features?.[0]?.properties?.id;
						if (!id) return;
						const pick = picks.find((candidate) => candidate.place.id === String(id));
						if (pick) onSelect(pick);
					};
					map.on('click', 'other-picks-hit', selectBackgroundPick);
					map.on('mouseenter', 'other-picks-hit', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
					map.on('mouseleave', 'other-picks-hit', () => { if (map) map.getCanvas().style.cursor = ''; });

					const bounds = new maplibre.LngLatBounds();
					const visibleContext = [[origin.lon, origin.lat] as [number, number]];
					if (destination) visibleContext.push([destination.lon, destination.lat]);
					picks.slice(0, 30).forEach((pick) => visibleContext.push([pick.place.lon, pick.place.lat]));
					visibleContext.forEach((point) => bounds.extend(point));
					map.fitBounds(bounds, { padding: { top: 64, right: 48, bottom: 190, left: 48 }, maxZoom: 16, duration: 0 });
					mapState = 'ready';
				});
				map.on('error', (event) => {
					if (/401|403|style/i.test(event.error?.message ?? '')) unavailable();
				});
			} catch {
				unavailable();
			}
		}

		start();
		return () => {
			disposed = true;
			resizeObserver?.disconnect();
			map?.remove();
		};
	});
</script>

<div
	class="map-canvas"
	bind:this={mapElement}
	data-map-state={mapState}
	data-camera-focus={cameraFocusedId}
	data-map-zoom={cameraZoom}
	aria-label="Interactive map of route-fit food candidates"
></div>

<style>
	.map-canvas { position: absolute; inset: 0; background: var(--mist); }
	:global(.map-marker) { display: grid; place-items: center; width: var(--tap-target); height: var(--tap-target); padding: 0; border: 0; color: white; background: transparent; font: 800 0.82rem/1 var(--font-display); }
	:global(.map-marker__badge) { display: grid; place-items: center; width: 2.55rem; height: 2.55rem; border: 3px solid white; border-radius: 50%; box-shadow: 0 5px 16px hsl(154 76% 8% / 0.25); background: var(--forest); transition: transform 180ms ease, box-shadow 180ms ease; }
	:global(button.map-marker) { cursor: pointer; }
	:global(button.map-marker:focus-visible .map-marker__badge) { outline: 3px solid var(--sun); outline-offset: 3px; }
	:global(.map-marker--place) { color: var(--forest); }
	:global(.map-marker--place .map-marker__badge) { background: var(--sun); }
	:global(.map-marker--destination .map-marker__badge) { background: var(--leaf); }
	:global(.map-marker.is-selected) { z-index: 4; }
	:global(.map-marker.is-selected .map-marker__badge) { transform: scale(1.18); box-shadow: 0 0 0 5px hsl(44 96% 49% / 0.3), 0 9px 24px hsl(154 76% 8% / 0.4); }
	:global(.maplibregl-ctrl-top-right) { top: 0.6rem; right: 0.6rem; }
	:global(.maplibregl-ctrl-attrib) { font-family: var(--font-body); }
	@media (prefers-reduced-motion: reduce) { :global(.map-marker__badge) { transition: none; } }
</style>
