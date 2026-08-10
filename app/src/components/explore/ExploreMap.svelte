<script lang="ts">
	import { onMount } from 'svelte';
	import { brand } from '../../lib/brand';
	import { loadMapLibre } from '../../lib/maplibre-loader';
	import type { Place } from '../../lib/types';
	let { places, selectedId, onSelect, onUnavailable }: { places: Place[]; selectedId?: string; onSelect: (place: Place) => void; onUnavailable: () => void } = $props();
	let mapElement: HTMLDivElement;
	let map = $state.raw<import('maplibre-gl').Map | undefined>();
	let ready = $state(false);

	$effect(() => {
		if (!ready || !map) return;
		const source = map.getSource('explore-places') as import('maplibre-gl').GeoJSONSource | undefined;
		if (!source) return;
		source.setData({ type: 'FeatureCollection', features: places.map((place) => ({
			type: 'Feature' as const,
			geometry: { type: 'Point' as const, coordinates: [place.lon, place.lat] },
			properties: { id: place.id, selected: place.id === selectedId ? 1 : 0 },
		})) });
	});

	$effect(() => {
		if (!ready || !map || !selectedId) return;
		const place = places.find((item) => item.id === selectedId);
		if (!place) return;
		map.easeTo({ center: [place.lon, place.lat], zoom: Math.max(map.getZoom(), 16.5), duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350 });
	});

	onMount(() => {
		let disposed = false;
		async function start() {
			try {
				const canvas = document.createElement('canvas');
				if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) throw new Error('WebGL unavailable');
				// MapTiler origin restrictions are blocking deployments, so we use a free frictionless basemap instead.
				const style = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
				const maplibre = await loadMapLibre();
				if (disposed) return;
				map = new maplibre.Map({
					container: mapElement,
					style,
					center: [121.243, 14.169], zoom: 14.4,
					maxBounds: [[121.21, 14.13], [121.28, 14.20]], cooperativeGestures: true,
					dragRotate: false, pitchWithRotate: false, respectPrefersReducedMotion: true, attributionControl: false,
				});
				map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
				map.addControl(new maplibre.AttributionControl({ compact: true, customAttribution: '© Carto · © OpenStreetMap contributors · Overture Maps' }));
				map.on('load', () => {
					if (!map) return;
					map.addSource('explore-places', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
					map.addLayer({ id: 'explore-places-halo', type: 'circle', source: 'explore-places', paint: {
						'circle-radius': ['case', ['==', ['get', 'selected'], 1], 13, 0],
						'circle-color': brand.cream,
						'circle-stroke-color': brand.maroonDeep,
						'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2, 0],
					} });
					map.addLayer({ id: 'explore-places-dots', type: 'circle', source: 'explore-places', paint: {
						'circle-radius': ['case', ['==', ['get', 'selected'], 1], 9, 6],
						'circle-color': ['case', ['==', ['get', 'selected'], 1], brand.orange, brand.cream],
						'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], brand.charcoal, brand.maroonDeep],
						'circle-stroke-width': 2,
					} });
					map.addLayer({ id: 'explore-places-hit', type: 'circle', source: 'explore-places', paint: { 'circle-radius': 20, 'circle-color': brand.charcoal, 'circle-opacity': 0.01 } });
					map.on('click', 'explore-places-hit', (event) => {
						const id = event.features?.[0]?.properties?.id;
						const place = places.find((item) => item.id === String(id));
						if (place) onSelect(place);
					});
					map.on('mouseenter', 'explore-places-hit', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
					map.on('mouseleave', 'explore-places-hit', () => { if (map) map.getCanvas().style.cursor = ''; });
					ready = true;
				});
				map.on('error', (event) => {
					if (/401|403|style|fetch|network|unauthorized/i.test(event.error?.message ?? '')) onUnavailable();
				});
			} catch { onUnavailable(); }
		}
		start();
		return () => { disposed = true; map?.remove(); };
	});
</script>
<div class="map" bind:this={mapElement} aria-label="Map of food places in Explore"></div>
<style>.map{position:absolute;inset:0;width:100%;height:100%;background:var(--brand-sand)} :global(.maplibregl-ctrl-attrib){font-family:var(--font-body)}</style>
