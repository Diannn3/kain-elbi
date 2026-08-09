<script lang="ts">
	import { onMount } from 'svelte';

	let {
		name,
		lat,
		lon,
	}: {
		name: string;
		lat: number;
		lon: number;
	} = $props();

	let mapElement: HTMLDivElement;
	let state = $state<'starting' | 'ready' | 'failed'>('starting');
	let map = $state.raw<import('maplibre-gl').Map | undefined>();

	onMount(() => {
		let disposed = false;
		let observer: ResizeObserver | undefined;

		async function start() {
			try {
				const canvas = document.createElement('canvas');
				if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) throw new Error('WebGL unavailable');
				const mapTilerKey = import.meta.env.PUBLIC_MAPTILER_KEY?.trim();
				if (!mapTilerKey) throw new Error('PUBLIC_MAPTILER_KEY is not configured');

				const maplibre = await import('maplibre-gl');
				await import('maplibre-gl/dist/maplibre-gl.css');
				if (disposed) return;

				map = new maplibre.Map({
					container: mapElement,
					style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(mapTilerKey)}`,
					center: [lon, lat],
					zoom: 17,
					interactive: false,
					attributionControl: false,
					respectPrefersReducedMotion: true,
				});
				map.addControl(new maplibre.AttributionControl({ compact: true, customAttribution: '© MapTiler · © OpenStreetMap contributors' }));

				const marker = document.createElement('div');
				marker.className = 'place-location-marker';
				marker.setAttribute('aria-hidden', 'true');
				new maplibre.Marker({ element: marker }).setLngLat([lon, lat]).addTo(map);

				observer = new ResizeObserver(() => map?.resize());
				observer.observe(mapElement);
				map.once('load', () => { if (!disposed) state = 'ready'; });
				map.on('error', (event) => {
					if (/401|403|style/i.test(event.error?.message ?? '')) state = 'failed';
				});
			} catch {
				state = 'failed';
			}
		}

		start();
		return () => {
			disposed = true;
			observer?.disconnect();
			map?.remove();
			map = undefined;
		};
	});
</script>

<div class="location-map" data-map-state={state} aria-label={`Map location for ${name}`}>
	<div class="map-canvas" bind:this={mapElement} aria-hidden={state !== 'ready'}></div>
	{#if state !== 'ready'}
		<div class="map-fallback" aria-hidden="true">
			<span class="pin"><i></i></span>
			<p>{state === 'failed' ? 'Map preview unavailable' : 'Loading location…'}</p>
		</div>
	{/if}
</div>

<style>
	.location-map { position: relative; min-height: 15rem; overflow: hidden; border-radius: var(--radius-lg); background: var(--brand-sand); }
	.map-canvas { position: absolute; inset: 0; }
	.map-fallback { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: var(--space-3); background: radial-gradient(circle at 50% 45%, rgb(230 106 25 / 0.12), transparent 7rem), var(--brand-sand); color: var(--color-text-muted); text-align: center; }
	.map-fallback p { margin: 0; font-size: 0.75rem; }
	.pin { position: relative; display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: 50% 50% 50% 0; background: var(--brand-maroon-deep); rotate: -45deg; box-shadow: 0 0.7rem 1.4rem rgb(71 12 17 / 0.2); }
	.pin i { width: 0.9rem; height: 0.9rem; border-radius: 50%; background: var(--brand-orange); }
	:global(.place-location-marker) { width: 2rem; height: 2rem; border: 0.35rem solid var(--brand-cream); border-radius: 50%; background: var(--brand-orange); box-shadow: 0 0.45rem 1.2rem rgb(71 12 17 / 0.3); }
	:global(.maplibregl-ctrl-attrib) { font-size: 9px; }
	@media (min-width: 760px) { .location-map { min-height: 20rem; } }
</style>
