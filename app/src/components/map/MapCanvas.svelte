<script lang="ts">
	import { onMount } from 'svelte';
	import type { Anchor, SmartPick } from '../../lib/types';

	let {
		origin,
		destination,
		picks,
		selectedId,
		onSelect,
		onUnavailable,
	}: {
		origin: Anchor;
		destination?: Anchor;
		picks: SmartPick[];
		selectedId?: string;
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

		activeMarkers.forEach((m) => m.remove());
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
			element.setAttribute('aria-label', kind === 'place'
				? `${options?.selected ? 'Selected' : 'Focus'} ${options?.name ?? `ranked place ${label}`} on the map`
				: label);
			if (kind === 'place') element.setAttribute('aria-pressed', String(options?.selected === true));
			if (action) element.addEventListener('click', action);
			const m = new maplibreModule.Marker({ element }).setLngLat([lon, lat]).addTo(map);
			activeMarkers.push(m);
		}

		addMarker('A', origin.lon, origin.lat, 'origin');
		if (destination) addMarker('B', destination.lon, destination.lat, 'destination');

		const topLimit = 15;
		const renderPicks = new Set<string>();
		
		picks.slice(0, topLimit).forEach(p => renderPicks.add(p.place.id));
		
		let selectedPickIndex = -1;
		if (selectedId) {
			selectedPickIndex = picks.findIndex(p => p.place.id === selectedId);
			if (selectedPickIndex >= 0) {
				renderPicks.add(selectedId);
			}
		}

		picks.forEach((pick, index) => {
			if (renderPicks.has(pick.place.id)) {
				addMarker(String(index + 1), pick.place.lon, pick.place.lat, 'place', () => onSelect(pick), {
					id: pick.place.id,
					name: pick.place.name,
					selected: pick.place.id === selectedId,
				});
			}
		});

		const routeCoords = [
			[origin.lon, origin.lat],
			...(selectedPickIndex >= 0 
				? [[picks[selectedPickIndex].place.lon, picks[selectedPickIndex].place.lat]]
				: picks.slice(0, 1).map((pick) => [pick.place.lon, pick.place.lat])
			),
			...(destination ? [[destination.lon, destination.lat]] : []),
		];
		
		const routeSource = map.getSource('route-context') as import('maplibre-gl').GeoJSONSource;
		if (routeSource) {
			routeSource.setData({
				type: 'Feature',
				properties: {},
				geometry: { type: 'LineString', coordinates: routeCoords }
			});
		}

		const backgroundFeatures = picks
			.map((pick, index) => ({ pick, rank: index + 1 }))
			.filter((item) => !renderPicks.has(item.pick.place.id))
			.map((item) => ({
				type: 'Feature' as const,
				geometry: { type: 'Point' as const, coordinates: [item.pick.place.lon, item.pick.place.lat] },
				properties: { id: item.pick.place.id, rank: item.rank }
			}));

		const otherSource = map.getSource('other-picks') as import('maplibre-gl').GeoJSONSource;
		if (otherSource) {
			otherSource.setData({
				type: 'FeatureCollection',
				features: backgroundFeatures
			});
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
				zoom: Math.max(currentMap.getZoom(), 17),
				padding: { top: 72, right: 48, bottom: 96, left: 48 },
				duration: reducedMotion ? 0 : 650,
			});
		});

		return () => {
			cancelAnimationFrame(frame);
			currentMap.off('moveend', onMoveEnd);
		};
	});

	onMount(() => {
		let disposed = false;
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
				map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'bottom-right');
				map.addControl(new maplibre.AttributionControl({ compact: true, customAttribution: '© MapTiler · © OpenStreetMap contributors · Overture Maps' }));

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
						paint: { 'line-color': '#176b3a', 'line-width': 3, 'line-dasharray': [2, 2] },
					});

					map.addSource('other-picks', {
						type: 'geojson',
						data: { type: 'FeatureCollection', features: [] }
					});
					map.addLayer({
						id: 'other-picks-circles',
						type: 'circle',
						source: 'other-picks',
						paint: {
							'circle-radius': 5,
							'circle-color': '#eab308',
							'circle-stroke-width': 1.5,
							'circle-stroke-color': '#ffffff'
						}
					});

					map.on('click', 'other-picks-circles', (e) => {
						const feature = e.features?.[0];
						if (feature?.properties?.id) {
							const pick = picks.find((p) => p.place.id === feature.properties.id);
							if (pick) onSelect(pick);
						}
					});
					
					map.on('mouseenter', 'other-picks-circles', () => {
						if (map) map.getCanvas().style.cursor = 'pointer';
					});
					map.on('mouseleave', 'other-picks-circles', () => {
						if (map) map.getCanvas().style.cursor = '';
					});

					const bounds = new maplibre.LngLatBounds();
					const allPoints = [[origin.lon, origin.lat]];
					if (destination) allPoints.push([destination.lon, destination.lat]);
					picks.forEach((p) => allPoints.push([p.place.lon, p.place.lat]));
					allPoints.forEach((point) => bounds.extend(point as [number, number]));
					map.fitBounds(bounds, { padding: 70, maxZoom: 16, duration: 0 });

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
	aria-label="Interactive map of route candidates"
></div>

<style>
	.map-canvas { position: absolute; inset: 0; background: var(--mist); }
	:global(.map-marker) { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; padding: 0; border: 0; color: white; background: transparent; font: 800 0.82rem/1 var(--font-display); }
	:global(.map-marker__badge) { display: grid; place-items: center; width: 100%; height: 100%; border: 3px solid white; border-radius: 50%; box-shadow: 0 5px 16px hsl(154 76% 8% / 0.25); background: var(--forest); transition: transform 180ms ease, box-shadow 180ms ease; }
	:global(button.map-marker) { cursor: pointer; }
	:global(button.map-marker:focus-visible .map-marker__badge) { outline: 3px solid var(--sun); outline-offset: 3px; }
	:global(.map-marker--place) { width: 2.75rem; height: 2.75rem; color: var(--forest); }
	:global(.map-marker--place .map-marker__badge) { background: var(--sun); }
	:global(.map-marker--destination .map-marker__badge) { background: var(--leaf); }
	:global(.map-marker.is-selected) { z-index: 4; }
	:global(.map-marker.is-selected .map-marker__badge) { transform: scale(1.22); box-shadow: 0 0 0 5px hsl(44 96% 49% / .3), 0 9px 24px hsl(154 76% 8% / .4); }
	:global(.maplibregl-ctrl-attrib) { font-family: var(--font-body); }
	@media (prefers-reduced-motion: reduce) { :global(.map-marker__badge) { transition: none; } }
</style>
