<script lang="ts">
	let {
		label = 'Share',
		title = 'UPPETITE',
		text = '',
		path = '',
		compact = false,
		variant = 'secondary',
	}: {
		label?: string;
		title?: string;
		text?: string;
		path?: string;
		compact?: boolean;
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
	class:quiet={variant === 'quiet'}
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
	<span>{status || label}</span>
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
</style>
