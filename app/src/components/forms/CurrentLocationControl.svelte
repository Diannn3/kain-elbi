<script lang="ts">
	import { onMount } from 'svelte';
	import type { LocationFailureReason } from '../../lib/location-service';

	type BrowserGeolocationElement = HTMLElement & {
		position?: GeolocationPosition | null;
		error?: GeolocationPositionError | null;
	};

	interface Props {
		active: boolean;
		locating: boolean;
		errorKind: LocationFailureReason | null;
		errorMessage: string;
		describedBy: string;
		onModernIntent: () => number;
		onModernPosition: (position: GeolocationPosition, requestId: number) => void;
		onModernError: (error: GeolocationPositionError, requestId: number) => void;
		onLegacyRequest: () => void;
	}

	let {
		active,
		locating,
		errorKind,
		errorMessage,
		describedBy,
		onModernIntent,
		onModernPosition,
		onModernError,
		onLegacyRequest,
	}: Props = $props();

	let modernSupported = $state(false);
	let modernRequestId = 0;

	onMount(() => {
		modernSupported = 'HTMLGeolocationElement' in window;
	});

	function wireGeolocation(node: HTMLElement) {
		const supportsModern = () => 'HTMLGeolocationElement' in window;
		const beginPointerIntent = () => {
			if (supportsModern()) modernRequestId = onModernIntent();
		};
		const beginKeyboardIntent = (event: KeyboardEvent) => {
			if (!supportsModern()) return;
			if (event.key === 'Enter' || event.key === ' ') modernRequestId = onModernIntent();
		};
		const handleLocation = (event: Event) => {
			const target = event.currentTarget as BrowserGeolocationElement;
			const requestId = modernRequestId || onModernIntent();
			modernRequestId = 0;
			if (target.position) {
				onModernPosition(target.position, requestId);
				return;
			}
			if (target.error) onModernError(target.error, requestId);
		};

		node.addEventListener('pointerdown', beginPointerIntent, true);
		node.addEventListener('keydown', beginKeyboardIntent, true);
		node.addEventListener('location', handleLocation);

		return {
			destroy() {
				node.removeEventListener('pointerdown', beginPointerIntent, true);
				node.removeEventListener('keydown', beginKeyboardIntent, true);
				node.removeEventListener('location', handleLocation);
			},
		};
	}

	const canRetry = $derived(errorKind !== 'unsupported' && errorKind !== 'insecure' && errorKind !== 'outside_supported_area');
</script>

<div
	class="current-location-control"
	data-current-location-control
	data-active={active ? 'true' : 'false'}
	data-locating={locating ? 'true' : 'false'}
>
	<svelte:element
		this={'geolocation'}
		use:wireGeolocation
		accuracymode="precise"
		class={active ? 'native-geolocation active' : 'native-geolocation'}
		aria-describedby={describedBy}
	>
		<button
			class={active ? 'fallback-location active' : 'fallback-location'}
			type="button"
			disabled={locating}
			aria-pressed={active}
			aria-describedby={describedBy}
			onclick={onLegacyRequest}
		>
			<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Zm0-8.5A2.5 2.5 0 1 0 12 7a2.5 2.5 0 0 0 0 5.5Z" /></svg>
			<span>{locating ? 'Finding your location…' : 'Use my current location'}</span>
		</button>
	</svelte:element>

	{#if errorMessage}
		<div class="location-recovery" data-location-recovery>
			<p>{errorMessage}</p>
			{#if modernSupported}
				<small>Use the location control above to try again after changing the permission.</small>
			{:else if canRetry}
				<button type="button" onclick={onLegacyRequest}>Try again</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.current-location-control {
		display: grid;
		justify-items: start;
		gap: 0.45rem;
		min-width: 0;
	}

	.native-geolocation,
	.fallback-location {
		min-height: var(--tap-target);
		max-width: 100%;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-surface-raised);
		color: var(--color-text-muted);
		font: 700 0.82rem/1 var(--font-body);
	}

	.native-geolocation {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		justify-self: start;
		padding-inline: var(--space-3);
		background: var(--color-surface-raised);
		color: var(--color-primary);
	}

	.native-geolocation.active,
	.fallback-location.active {
		border-color: var(--color-border-strong);
		background: var(--color-surface-muted);
		color: var(--color-primary);
		box-shadow: inset 0 0 0 1px var(--color-border-strong);
	}

	.fallback-location {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		width: auto;
		padding: 0 var(--space-3);
		cursor: pointer;
	}

	.fallback-location:disabled {
		cursor: wait;
		opacity: 0.72;
	}

	.fallback-location svg {
		width: 1.1rem;
		height: 1.1rem;
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
	}

	.location-recovery {
		max-width: 30rem;
		padding: 0.7rem 0.8rem;
		border-left: 0.22rem solid var(--brand-orange);
		background: var(--brand-sand);
		color: var(--color-primary);
		font-size: 0.76rem;
		line-height: 1.45;
	}

	.location-recovery p,
	.location-recovery small {
		display: block;
		margin: 0;
	}

	.location-recovery small {
		margin-top: 0.3rem;
		color: var(--color-text-muted);
	}

	.location-recovery button {
		min-height: 2.35rem;
		margin-top: 0.5rem;
		padding: 0 0.8rem;
		border: 1px solid var(--color-border-strong);
		border-radius: 999px;
		background: var(--color-surface-raised);
		color: var(--color-primary);
		font-weight: 720;
		cursor: pointer;
	}
</style>
