<script lang="ts">
	let online = $state(true);
	let visible = $state(false);
	let updateReady = $state(false);
	let waiting = $state<ServiceWorker | null>(null);

	$effect(() => {
		online = navigator.onLine;
		visible = !online;
		const update = () => {
			online = navigator.onLine;
			visible = !online;
		};
		window.addEventListener('online', update);
		window.addEventListener('offline', update);
		navigator.serviceWorker?.getRegistration().then((registration) => {
			if (!registration) return;
			if (registration.waiting) { waiting = registration.waiting; updateReady = true; }
			registration.addEventListener('updatefound', () => {
				const worker = registration.installing;
				worker?.addEventListener('statechange', () => {
					if (worker.state === 'installed' && navigator.serviceWorker.controller) { waiting = worker; updateReady = true; }
				});
			});
		});
		return () => {
			window.removeEventListener('online', update);
			window.removeEventListener('offline', update);
		};
	});

	function applyUpdate() {
		waiting?.postMessage({ type: 'SKIP_WAITING' });
		navigator.serviceWorker?.addEventListener('controllerchange', () => window.location.reload(), { once: true });
	}
</script>

{#if visible}
	<p class="offline" role="status">Offline · cached routes remain available</p>
{/if}
{#if updateReady}
	<button class="update" type="button" onclick={applyUpdate}>Update available · Refresh</button>
{/if}

<style>
	.offline { position: fixed; z-index: 80; top: calc(0.75rem + env(safe-area-inset-top)); left: 50%; margin: 0; padding: 0.6rem 0.9rem; border-radius: 999px; background: var(--forest); color: white; font-size: 0.76rem; font-weight: 700; box-shadow: 0 0.6rem 1.5rem hsl(154 40% 8% / 0.2); transform: translateX(-50%); }
	.update { position: fixed; z-index: 80; right: 1rem; bottom: calc(5.25rem + env(safe-area-inset-bottom)); min-height: 2.75rem; padding: .55rem .85rem; border: 0; border-radius: 999px; color: var(--forest); background: var(--sun); box-shadow: 0 .6rem 1.5rem hsl(154 40% 8% / .2); font-size: .75rem; font-weight: 750; }
</style>
