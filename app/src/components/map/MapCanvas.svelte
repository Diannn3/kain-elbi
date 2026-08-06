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

	onMount(() => {
		let disposed = false;
		let map: import('maplibre-gl').Map | undefined;

		async function start() {
			try {
				const canvas = document.createElement('canvas');
				if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) throw new Error('WebGL unavailable');
				const mapTilerKey = import.meta.env.PUBLIC_MAPTILER_KEY?.trim();
				if (!mapTilerKey) throw new Error('PUBLIC_MAPTILER_KEY is not configured');

				const { default: maplibregl } = await import('maplibre-gl');
				await import('maplibre-gl/dist/maplibre-gl.css');
				if (disposed) return;

				const style = `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(mapTilerKey)}`;

				map = new maplibregl.Map({
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
				map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
				map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© MapTiler · © OpenStreetMap contributors · Overture Maps' }));

				map.on('load', () => {
					if (!map) return;
					const coordinates = [
						[origin.lon, origin.lat],
						...(selectedId ? picks.filter((pick) => pick.place.id === selectedId) : picks.slice(0, 1)).map((pick) => [pick.place.lon, pick.place.lat]),
						...(destination ? [[destination.lon, destination.lat]] : []),
					];
					map.addSource('route-context', {
						type: 'geojson',
						data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } },
					});
					map.addLayer({
						id: 'route-context-line',
						type: 'line',
						source: 'route-context',
						paint: { 'line-color': '#176b3a', 'line-width': 3, 'line-dasharray': [2, 2] },
					});

					function marker(label: string, lon: number, lat: number, kind: string, action?: () => void) {
						const element = document.createElement(action ? 'button' : 'div');
						element.className = `map-marker map-marker--${kind}`;
						element.textContent = label;
						element.setAttribute('aria-label', kind === 'place' ? `Select ranked place ${label}` : label);
						if (action) element.addEventListener('click', action);
						new maplibregl.Marker({ element }).setLngLat([lon, lat]).addTo(map!);
					}
					marker('A', origin.lon, origin.lat, 'origin');
					if (destination) marker('B', destination.lon, destination.lat, 'destination');
					picks.forEach((pick, index) => marker(String(index + 1), pick.place.lon, pick.place.lat, 'place', () => onSelect(pick)));

					const bounds = new maplibregl.LngLatBounds();
					coordinates.concat(picks.map((pick) => [pick.place.lon, pick.place.lat])).forEach((point) => bounds.extend(point as [number, number]));
					map.fitBounds(bounds, { padding: 70, maxZoom: 16, duration: 0 });
				});
				map.on('error', (event) => {
					if (/401|403|style/i.test(event.error?.message ?? '')) onUnavailable();
				});
			} catch {
				onUnavailable();
			}
		}

		start();
		return () => {
			disposed = true;
			map?.remove();
		};
	});
</script>

<div class="map-canvas" bind:this={mapElement} aria-label="Interactive map of route candidates"></div>

<style>
	.map-canvas { position: absolute; inset: 0; background: var(--mist); }
	:global(.map-marker) { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; padding: 0; border: 3px solid white; border-radius: 50%; box-shadow: 0 5px 16px hsl(154 76% 8% / 0.25); color: white; background: var(--forest); font: 800 0.82rem/1 var(--font-display); }
	:global(button.map-marker) { cursor: pointer; }
	:global(.map-marker--place) { width: 2.75rem; height: 2.75rem; color: var(--forest); background: var(--sun); }
	:global(.map-marker--destination) { background: var(--leaf); }
	:global(.maplibregl-ctrl-attrib) { font-family: var(--font-body); }
</style>
