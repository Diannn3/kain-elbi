<script lang="ts">
	let {
		label = 'Share',
		title = 'UPPETITE',
		text = '',
		path = '',
		compact = false,
		mobileIconOnly = false,
		variant = 'secondary',
	}: {
		label?: string;
		title?: string;
		text?: string;
		path?: string;
		compact?: boolean;
		mobileIconOnly?: boolean;
		variant?: 'secondary' | 'quiet';
	} = $props();

	let status = $state('');
	let resetting: ReturnType<typeof setTimeout> | undefined;

	function resolvedUrl() {
		if (typeof window === 'undefined') return path;
		return path ? new URL(path, window.location.origin).toString() : window.location.href;
	}

	async function copyFallback(url: string) {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(url);
			return;
		}

		const textarea = document.createElement('textarea');
		textarea.value = url;
		textarea.setAttribute('readonly', '');
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.append(textarea);
		textarea.select();
		document.execCommand('copy');
		textarea.remove();
	}

	async function share() {
		const url = resolvedUrl();
		if (!url) return;

		clearTimeout(resetting);

		if (typeof navigator.share === 'function') {
			try {
				await navigator.share({ title, text: text || undefined, url });
				status = 'Shared';
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') return;
				try {
					await copyFallback(url);
					status = 'Link copied';
				} catch {
					status = 'Could not share';
				}
			}
		} else {
			try {
				await copyFallback(url);
				status = 'Link copied';
			} catch {
				status = 'Could not share';
			}
		}

		resetting = setTimeout(() => { status = ''; }, 2_000);
	}
</script>

<button
	type="button"
	class:compact
	class:mobile-icon-only={mobileIconOnly}
	class:quiet={variant === 'quiet'}
	data-status={status ? (status === 'Could not share' ? 'error' : 'success') : 'idle'}
	class="share-button"
	onclick={share}
	aria-label={label}
>
	<svg aria-hidden="true" viewBox="0 0 24 24">
		<circle cx="18" cy="5" r="2.5" />
		<circle cx="6" cy="12" r="2.5" />
		<circle cx="18" cy="19" r="2.5" />
		<path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
	</svg>
	<span class="share-status-glyph" aria-hidden="true">{status === 'Could not share' ? '!' : status ? '✓' : ''}</span>
	<span class="share-label">{status || label}</span>
</button>
<span class="sr-only" aria-live="polite">{status}</span>

<style>
	.share-button {
		width: 100%;
		min-height: 3.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: 0 var(--space-4);
		border: 1px solid var(--brand-maroon-deep);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--brand-maroon-deep);
		font: 740 0.88rem/1 var(--font-display);
		cursor: pointer;
	}
	.share-button:hover { background: var(--brand-sand); }
	.share-button.compact {
		width: auto;
		min-height: var(--tap-target);
		padding-inline: var(--space-3);
		border-radius: 999px;
		font-size: 0.78rem;
		white-space: nowrap;
	}
	.share-button.quiet {
		width: auto;
		min-height: var(--tap-target);
		justify-content: flex-start;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.share-button svg {
		width: 1.15rem;
		height: 1.15rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.share-status-glyph { display: none; }

	@media (max-width: 759px) {
		.share-button.mobile-icon-only {
			position: relative;
			width: var(--tap-target);
			height: var(--tap-target);
			min-width: var(--tap-target);
			min-height: var(--tap-target);
			padding: 0;
			border-radius: 0.8rem;
		}

		.share-button.mobile-icon-only .share-label {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border: 0;
		}

		.share-button.mobile-icon-only[data-status='success'] svg,
		.share-button.mobile-icon-only[data-status='error'] svg { display: none; }
		.share-button.mobile-icon-only[data-status='success'] .share-status-glyph,
		.share-button.mobile-icon-only[data-status='error'] .share-status-glyph {
			display: grid;
			place-items: center;
			font: 800 1rem/1 var(--font-display);
		}
	}
</style>
