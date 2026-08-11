<script lang="ts">
	import { onDestroy } from 'svelte';
	import { processAndStripPhoto } from '../../lib/photo-processing';
	import { uploadCommunityPhoto } from '../../lib/community/backend';
	import { CONTRIBUTOR_TERMS_VERSION } from '../../lib/compliance';

	let { placeId, onUploadSuccess }: { placeId: string; onUploadSuccess?: () => void | Promise<void> } = $props();
	let inputRef = $state<HTMLInputElement>();
	let state = $state<'idle' | 'processing' | 'uploading' | 'success' | 'error'>('idle');
	let errorMessage = $state('');
	let termsAccepted = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	function scheduleReset(delay: number) {
		if (resetTimer) clearTimeout(resetTimer);
		resetTimer = setTimeout(() => { state = 'idle'; errorMessage = ''; }, delay);
	}

	async function handleFileChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		state = 'processing';
		errorMessage = '';
		try {
			const processedFile = await processAndStripPhoto(file);
			state = 'uploading';
			await uploadCommunityPhoto(placeId, processedFile, CONTRIBUTOR_TERMS_VERSION);
			state = 'success';
			await onUploadSuccess?.();
			scheduleReset(3000);
		} catch (error) {
			state = 'error';
			errorMessage = error instanceof Error ? error.message : 'Photo upload failed. Try again.';
			scheduleReset(5000);
		} finally {
			target.value = '';
		}
	}

	function triggerUpload() { if (state === 'idle' && termsAccepted) inputRef?.click(); }
	onDestroy(() => { if (resetTimer) clearTimeout(resetTimer); });
</script>

<div class="photo-uploader">
	<input bind:this={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onchange={handleFileChange} class="hidden-input" />
	<label class="terms-ack">
		<input type="checkbox" bind:checked={termsAccepted} disabled={state === 'processing' || state === 'uploading'} />
		<span>I took this photo or have permission to submit it, and I agree to the <a href="/contributor-terms" target="_blank" rel="noopener noreferrer">Contributor Terms</a>.</span>
	</label>
	<button type="button" class:processing={state === 'processing' || state === 'uploading'} onclick={triggerUpload} disabled={state !== 'idle' || !termsAccepted}>
		<span aria-hidden="true">{state === 'processing' || state === 'uploading' ? '↻' : '＋'}</span>
		{state === 'processing' ? 'Optimizing…' : state === 'uploading' ? 'Uploading…' : 'Add a photo'}
	</button>
	<p class="upload-status" class:success={state === 'success'} class:error={state === 'error'} aria-live="polite" role={state === 'error' ? 'alert' : 'status'}>
		{state === 'success' ? 'Photo submitted for moderation.' : state === 'error' ? errorMessage : ''}
	</p>
</div>

<style>
	.photo-uploader { display: grid; justify-items: start; gap: var(--space-2); }
	.hidden-input { display: none; }
	.terms-ack { display: flex; align-items: flex-start; gap: var(--space-2); max-width: 30rem; color: var(--color-text-muted); font-size: 0.75rem; line-height: 1.5; }
	.terms-ack input { width: 1.25rem; height: 1.25rem; flex: none; margin-top: 1px; accent-color: var(--color-primary); }
	.terms-ack a { color: var(--color-primary); text-underline-offset: 0.16em; }
	button { min-height: var(--tap-target); display: inline-flex; align-items: center; gap: var(--space-2); padding: 0 var(--space-4); border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); background: var(--color-surface-raised); color: var(--color-primary); font-weight: 720; transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease; }
	button:hover:not(:disabled) { border-color: var(--color-border-hover); background: var(--color-surface-hover); }
	button:disabled { cursor: not-allowed; opacity: 0.58; }
	button.processing span { animation: spin 1s linear infinite; }
	.upload-status { min-height: 1.2em; margin: 0; font-size: 0.75rem; line-height: 1.4; }
	.upload-status.success { color: var(--color-status-success); }
	.upload-status.error { color: var(--color-status-error); }
	@keyframes spin { to { transform: rotate(360deg); } }
	@media (prefers-reduced-motion: reduce) { button.processing span { animation: none; } }
</style>
