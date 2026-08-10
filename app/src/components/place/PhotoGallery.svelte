<script lang="ts">
	import { onMount } from 'svelte';
	import { loadCommunityPhotos } from '../../lib/community/backend';
	import PhotoUploader from './PhotoUploader.svelte';

	export let placeId: string;
	export let allowUpload = true;

	let photos: string[] = [];
	let loading = true;

	async function fetchPhotos() {
		loading = true;
		try {
			photos = await loadCommunityPhotos(placeId);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchPhotos();
	});

	function handleUploadSuccess() {
		// Even if the photo is pending moderation, we don't strictly need to refetch
		// since it won't be returned (status='pending'). But we could trigger a toast.
		console.log('Upload success triggered');
	}
</script>

{#if !loading && (photos.length > 0 || allowUpload)}
	<div class="photo-gallery-section">
		<div class="header">
			<h3>Photos</h3>
			{#if allowUpload}
				<PhotoUploader {placeId} onUploadSuccess={handleUploadSuccess} />
			{/if}
		</div>

		{#if photos.length > 0}
			<div class="gallery">
				{#each photos as photoUrl (photoUrl)}
					<div class="photo-card">
						<img src={photoUrl} alt="Community uploaded" loading="lazy" />
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
				<p>No photos yet. Be the first to add one!</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.photo-gallery-section {
		margin-top: 2rem;
		border-top: 1px solid var(--color-border);
		padding-top: 1.5rem;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}

	.gallery {
		display: flex;
		overflow-x: auto;
		gap: 1rem;
		padding-bottom: 0.5rem;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
	}

	.gallery::-webkit-scrollbar {
		height: 6px;
	}

	.gallery::-webkit-scrollbar-track {
		background: transparent;
	}

	.gallery::-webkit-scrollbar-thumb {
		background-color: var(--color-border);
		border-radius: 9999px;
	}

	.photo-card {
		flex: 0 0 240px;
		height: 180px;
		border-radius: 12px;
		overflow: hidden;
		scroll-snap-align: start;
		background-color: var(--color-surface-hover);
		position: relative;
	}

	.photo-card img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s ease;
	}

	.photo-card:hover img {
		transform: scale(1.05);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background-color: var(--color-surface);
		border: 1px dashed var(--color-border);
		border-radius: 12px;
		text-align: center;
		color: var(--color-text-muted);
	}

	:global(.empty-icon) {
		margin-bottom: 0.5rem;
		opacity: 0.5;
	}

	.empty-state p {
		font-size: 0.875rem;
		margin: 0;
	}
</style>
