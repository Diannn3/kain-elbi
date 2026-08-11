<script lang="ts">
	import { onMount } from 'svelte';
	import { brand } from '../../lib/brand';
	import { loadMapLibre } from '../../lib/maplibre-loader';
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

			const markerLabel = document.createElement('span');
			markerLabel.className = 'map-marker__label';
			markerLabel.textContent = label;
			markerLabel.setAttribute('aria-hidden', 'true');
			badge.append(markerLabel);
			element.append(badge);

			if (element instanceof HTMLButtonElement) element.type = 'button';
			if (options?.id) element.dataset.placeId = options.id;
			element.classList.toggle('is-selected', options?.selected === true);
			element.setAttribute(
				'aria-label',
				kind === 'place'
					? `Route fit #${label}: ${options?.name ?? 'food place'}${options?.selected ? ', selected' : ''}`
					: label === 'A'
						? `Origin: ${origin.name}`
						: destination
							? `Next class: ${destination.name}`
							: label,
			);
			if (kind === 'place') element.setAttribute('aria-pressed', String(options?.selected === true));
			if (action) element.addEventListener('click', action);

			const marker = new maplibreModule.Marker({ element }).setLngLat([lon, lat]).addTo(map);
			activeMarkers.push(marker);
		}

		addMarker('A', origin.lon, origin.lat, 'origin');
		if (destination) addMarker('B', destination.lon, destination.lat, 'destination');

		/* Preserve the existing marker-performance contract: render the top 15 DOM
		   candidates, plus the selected candidate if it falls outside that group. */
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
		const compactMobileMap = window.matchMedia('(max-width: 759px)').matches;
		const frame = requestAnimationFrame(() => {
			currentMap.easeTo({
				center: [pick.place.lon, pick.place.lat],
				zoom: Math.max(currentMap.getZoom(), 16.8),
				padding: compactMobileMap
					? { top: 52, right: 32, bottom: 88, left: 32 }
					: { top: 72, right: 48, bottom: 210, left: 48 },
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
		let resizeFrame = 0;
		let lastWidth = -1;
		let lastHeight = -1;
		const unavailable = () => {
			if (disposed) return;
			mapState = 'failed';
			onUnavailable();
		};

		async function start() {
			try {
				const canvas = document.createElement('canvas');
				if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) throw new Error('WebGL unavailable');
				// MapTiler origin restrictions are blocking deployments, so we use a free frictionless basemap instead.
				const style = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

				const maplibre = await loadMapLibre();
				maplibreModule = maplibre;
				if (disposed) return;
				const compactMobileMap = window.matchMedia('(max-width: 759px)').matches;
				map = new maplibre.Map({
					container: mapElement,
					style,
					center: [origin.lon, origin.lat],
					zoom: 15.5,
					maxBounds: [[121.215, 14.135], [121.275, 14.195]],
					cooperativeGestures: !compactMobileMap,
					dragRotate: false,
					pitchWithRotate: false,
					respectPrefersReducedMotion: true,
					attributionControl: false,
				});
				map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
				map.addControl(new maplibre.AttributionControl({
					compact: true,
					customAttribution: '© Carto · © OpenStreetMap contributors · Overture Maps',
				}));

				resizeObserver = new ResizeObserver((entries) => {
					const rect = entries[0]?.contentRect;
					const width = Math.round(rect?.width ?? mapElement.clientWidth);
					const height = Math.round(rect?.height ?? mapElement.clientHeight);
					if (!width || !height || (width === lastWidth && height === lastHeight)) return;
					lastWidth = width;
					lastHeight = height;
					if (resizeFrame) cancelAnimationFrame(resizeFrame);
					resizeFrame = requestAnimationFrame(() => {
						resizeFrame = 0;
						map?.resize();
					});
				});
				resizeObserver.observe(mapElement);

				map.on('load', () => {
					try {
						if (!map) return;
						map.addSource('route-context', {
							type: 'geojson',
							data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
						});
						map.addLayer({
							id: 'route-context-line',
							type: 'line',
							source: 'route-context',
							paint: {
								'line-color': brand.orange,
								'line-width': 3,
								'line-dasharray': [2, 2],
							},
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
								'line-color': brand.orange,
								'line-width': 3,
							},
						});
						map.addSource('other-picks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
						map.addLayer({
							id: 'other-picks-halo',
							type: 'circle',
							source: 'other-picks',
							paint: {
								'circle-radius': ['case', ['==', ['get', 'selected'], 1], 13, 0],
								'circle-color': brand.cream,
								'circle-stroke-color': brand.maroonDeep,
								'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2, 0],
							},
						});
						map.addLayer({
							id: 'other-picks-circles',
							type: 'circle',
							source: 'other-picks',
							paint: {
								'circle-radius': ['case', ['==', ['get', 'selected'], 1], 9, 6],
								'circle-color': ['case', ['==', ['get', 'selected'], 1], brand.orange, brand.cream],
								'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], brand.charcoal, brand.maroonDeep],
								'circle-stroke-width': 2,
							},
						});
						map.addLayer({
							id: 'other-picks-hit',
							type: 'circle',
							source: 'other-picks',
							paint: {
								'circle-radius': 20,
								'circle-color': brand.charcoal,
								'circle-opacity': 0.01,
							},
						});

						map.on('click', 'other-picks-hit', (event) => {
							const id = event.features?.[0]?.properties?.id;
							const pick = picks.find((item) => item.place.id === String(id));
							if (pick) onSelect(pick);
						});

						map.on('mouseenter', 'other-picks-hit', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
						map.on('mouseleave', 'other-picks-hit', () => { if (map) map.getCanvas().style.cursor = ''; });

						const bounds = new maplibre.LngLatBounds();
						const visibleContext = [[origin.lon, origin.lat] as [number, number]];
						if (destination) visibleContext.push([destination.lon, destination.lat]);
						picks.slice(0, 30).forEach((pick) => visibleContext.push([pick.place.lon, pick.place.lat]));
						visibleContext.forEach((point) => bounds.extend(point));

						if (bounds.isEmpty()) return;

						const compactMobileMap = window.matchMedia('(max-width: 759px)').matches;
						map.fitBounds(bounds, {
							padding: compactMobileMap
								? { top: 52, right: 36, bottom: 128, left: 36 }
								: { top: 64, right: 48, bottom: 190, left: 48 },
							maxZoom: 16,
							duration: 0,
						});
						mapState = 'ready';
					} catch (err) {
						console.error('Error initializing map layers/bounds:', err);
						unavailable();
					}
				});

				map.on('error', (event) => {
					console.error('MapLibre error:', event);
					if (/401|403|style|fetch|network|unauthorized/i.test(event.error?.message ?? '')) unavailable();
				});
			} catch (err) {
				console.error('Fatal map startup error:', err);
				unavailable();
			}
		}

		start();
		return () => {
			disposed = true;
			if (resizeFrame) cancelAnimationFrame(resizeFrame);
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
	.map-canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: var(--brand-sand);
	}

	:global(.map-marker) {
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--brand-maroon-deep);
		font: 800 0.82rem / 1 var(--font-display);
	}

	:global(.map-marker__badge) {
		display: grid;
		place-items: center;
		width: 2.55rem;
		height: 2.55rem;
		border: 2px solid var(--brand-maroon-deep);
		border-radius: 50%;
		background: var(--brand-cream);
		box-shadow: 0 5px 16px rgb(92 16 22 / 0.24);
		transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
	}

	:global(.map-marker__label) {
		display: grid;
		place-items: center;
	}

	:global(button.map-marker) {
		cursor: pointer;
	}

	:global(button.map-marker:focus-visible) {
		outline: none;
	}

	:global(button.map-marker:focus-visible .map-marker__badge) {
		outline: 3px solid var(--brand-orange);
		outline-offset: 3px;
		box-shadow: 0 0 0 2px var(--brand-cream), 0 7px 18px rgb(92 16 22 / 0.28);
	}

	/* Origin — olive waypoint ring. */
	:global(.map-marker--origin) {
		color: var(--brand-olive);
	}

	:global(.map-marker--origin .map-marker__badge) {
		border: 4px solid var(--brand-olive);
		background: var(--brand-cream);
		color: var(--brand-olive);
	}

	/* Candidates — cream circle with maroon rank. */
	:global(.map-marker--place) {
		color: var(--brand-maroon-deep);
	}

	:global(.map-marker--place .map-marker__badge) {
		border-color: var(--brand-maroon-deep);
		background: var(--brand-cream);
		color: var(--brand-maroon-deep);
	}

	/* Selected candidate — orange fill, charcoal rank, cream halo. */
	:global(.map-marker.is-selected) {
		z-index: 4;
		color: var(--brand-charcoal);
	}

	:global(.map-marker.is-selected .map-marker__badge) {
		border: 3px solid var(--brand-cream);
		background: var(--brand-orange);
		color: var(--brand-charcoal);
		transform: scale(1.18);
		box-shadow:
			0 0 0 5px rgb(255 249 241 / 0.72),
			0 9px 24px rgb(92 16 22 / 0.34);
	}

	/* Destination — cream map pin with a maroon outline. */
	:global(.map-marker--destination) {
		color: var(--brand-maroon-deep);
	}

	:global(.map-marker--destination .map-marker__badge) {
		width: 2.5rem;
		height: 2.5rem;
		border: 3px solid var(--brand-maroon-deep);
		border-radius: 50% 50% 50% 0;
		background: var(--brand-cream);
		color: var(--brand-maroon-deep);
		transform: rotate(-45deg);
		box-shadow: 0 6px 18px rgb(92 16 22 / 0.26);
	}

	:global(.map-marker--destination .map-marker__label) {
		transform: rotate(45deg);
	}

	:global(.maplibregl-ctrl-top-right) {
		top: 0.6rem;
		right: 0.6rem;
	}

	:global(.maplibregl-ctrl-attrib) {
		font-family: var(--font-body);
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.map-marker__badge) {
			transition: none;
		}
	}
</style>
