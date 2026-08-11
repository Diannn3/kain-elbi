<script lang="ts">
	import { processAndStripPhoto } from '../../lib/photo-processing';
	import { uploadCommunityPhoto } from '../../lib/community/backend';
	import { CONTRIBUTOR_TERMS_VERSION } from '../../lib/compliance';

	export let placeId: string;
	export let onUploadSuccess: (() => void) | undefined = undefined;

	let inputRef: HTMLInputElement;
	let state: 'idle' | 'processing' | 'uploading' | 'success' | 'error' = 'idle';
	let errorMessage = '';
	let termsAccepted = false;

	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		state = 'processing';
		errorMessage = '';

		try {
			// Process and compress image (strips EXIF)
			const processedFile = await processAndStripPhoto(file);
			
			state = 'uploading';
			await uploadCommunityPhoto(placeId, processedFile, CONTRIBUTOR_TERMS_VERSION);
			
			state = 'success';
			if (onUploadSuccess) onUploadSuccess();
			
			// Reset after 3 seconds
			setTimeout(() => {
				if (state === 'success') state = 'idle';
			}, 3000);
		} catch (error) {
			console.error('Upload failed:', error);
			state = 'error';
			errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.';
			
			// Reset error state after 5 seconds
			setTimeout(() => {
				if (state === 'error') state = 'idle';
			}, 5000);
		} finally {
			if (target) target.value = ''; // clear input
		}
	}

	function triggerUpload() {
		if ((state === 'idle' || state === 'error') && termsAccepted) {
			inputRef?.click();
		}
	}
</script>

<div class="photo-uploader">
	<input 
		bind:this={inputRef} 
		type="file" 
		accept="image/jpeg, image/png, image/webp" 
		on:change={handleFileChange}
		class="hidden-input" 
	/>

	<label class="terms-ack">
		<input type="checkbox" bind:checked={termsAccepted} disabled={state === 'processing' || state === 'uploading'} />
		<span>
			I took this photo or have permission to submit it, and I agree to the
			<a href="/contributor-terms" target="_blank" rel="noopener noreferrer">Contributor Terms</a>.
		</span>
	</label>

	<button 
		class="upload-btn" 
		class:processing={state === 'processing' || state === 'uploading'}
		class:success={state === 'success'}
		class:error={state === 'error'}
		on:click={triggerUpload}
		disabled={state === 'processing' || state === 'uploading' || state === 'success' || !termsAccepted}
	>
		{#if state === 'idle'}
			<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
			<span>Add a Photo</span>
		{:else if state === 'processing'}
			<svg class="icon spinning" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
			<span>Optimizing...</span>
		{:else if state === 'uploading'}
			<svg class="icon bouncing" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
			<span>Uploading...</span>
		{:else if state === 'success'}
			<svg class="icon text-green-500" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
			<span>Photo submitted!</span>
		{:else if state === 'error'}
			<svg class="icon text-red-500" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
			<span>{errorMessage || 'Upload failed'}</span>
		{/if}
	</button>
</div>

<style>
	.photo-uploader {
		display: inline-block;
	}

	.hidden-input {
		display: none;
	}

	.terms-ack {
		display: flex;
		align-items: flex-start;
		gap: 0.55rem;
		max-width: 30rem;
		margin-bottom: 0.65rem;
		color: var(--color-text-muted);
		font-size: 0.78rem;
		line-height: 1.45;
	}

	.terms-ack input {
		width: 1rem;
		height: 1rem;
		margin-top: 0.12rem;
		accent-color: var(--brand-maroon-deep);
	}

	.terms-ack a {
		color: var(--brand-maroon-deep);
		text-underline-offset: 0.16em;
	}

	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 9999px;
		color: var(--color-text);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.upload-btn:hover:not(:disabled) {
		background-color: var(--color-surface-hover);
		border-color: var(--color-border-hover);
	}

	.upload-btn:disabled {
		cursor: not-allowed;
		opacity: 0.8;
	}

	.upload-btn.success {
		background-color: #ecfdf5;
		border-color: #10b981;
		color: #065f46;
	}

	.upload-btn.error {
		background-color: #fef2f2;
		border-color: #ef4444;
		color: #991b1b;
	}

	/* Keep Lucide defaults if imported */
	:global(.icon) {
		flex-shrink: 0;
	}

	:global(.spinning) {
		animation: spin 1s linear infinite;
	}

	:global(.bouncing) {
		animation: bounce 1s infinite alternate;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	@keyframes bounce {
		from { transform: translateY(0); }
		to { transform: translateY(-3px); }
	}
</style>
