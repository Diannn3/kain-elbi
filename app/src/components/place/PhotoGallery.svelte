<script lang="ts">
	import { onMount } from 'svelte';
	import { communityBackendConfig, loadCommunityPhotos } from '../../lib/community/backend';
	import { communityFeatures, isPhotoFeatureAvailable } from '../../lib/community/config';
	import PhotoUploader from './PhotoUploader.svelte';

	let { placeId, placeName, allowUpload = true }: { placeId: string; placeName: string; allowUpload?: boolean } = $props();
	const photosAvailable = isPhotoFeatureAvailable(communityFeatures.photos, communityBackendConfig().configured);
	const uploadEnabled = $derived(photosAvailable && allowUpload);
	let photos = $state<string[]>([]);
	let loading = $state(photosAvailable);
	let loadError = $state('');
	let gallery = $state<HTMLDivElement>();

	function scrollGallery(event: KeyboardEvent) {
		if (!gallery || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
		event.preventDefault();
		gallery.scrollBy({ left: event.key === 'ArrowRight' ? 240 : -240, behavior: 'smooth' });
	}

	async function fetchPhotos() {
		if (!photosAvailable) return;
		loading = true;
		loadError = '';
		try {
			photos = await loadCommunityPhotos(placeId);
		} catch {
			loadError = 'Community photos could not be loaded.';
		} finally {
			loading = false;
		}
	}

	onMount(() => { void fetchPhotos(); });
</script>

{#if photosAvailable}
	<section class="photo-gallery-section" aria-labelledby="community-photo-heading" aria-busy={loading}>
		<header>
			<div>
				<p>Community photos</p>
				<h3 id="community-photo-heading">See {placeName}</h3>
			</div>
			{#if uploadEnabled}<PhotoUploader {placeId} onUploadSuccess={fetchPhotos} />{/if}
		</header>

		{#if loading}
			<div class="gallery-skeleton" role="status"><span></span><span></span><span class="sr-only">Loading community photos…</span></div>
		{:else if photos.length > 0}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (scroll region implements arrow-key browsing) -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions (scroll region implements arrow-key browsing) -->
			<div class="gallery" role="region" tabindex="0" bind:this={gallery} onkeydown={scrollGallery} aria-label={`Community photos of ${placeName}. Use the left and right arrow keys to browse.`}>
				{#each photos as photoUrl (photoUrl)}
					<figure><img src={photoUrl} alt={`Community photo of ${placeName}`} width="640" height="480" loading="lazy" decoding="async" /></figure>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<p>No community photos yet. Add a recent storefront or food photo—please avoid faces and private information.</p>
			</div>
		{/if}
		{#if loadError}<p class="load-error" role="alert">{loadError}</p>{/if}
	</section>
{/if}

<style>
	.photo-gallery-section { margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px solid var(--color-border); }
	header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); }
	header p { margin: 0 0 var(--space-1); color: var(--color-accent-text); font: 760 0.75rem/1 var(--font-display); letter-spacing: 0.08em; text-transform: uppercase; }
	header h3 { margin: 0; color: var(--color-primary); font: 760 1.125rem/1.1 var(--font-display); }
	.gallery, .gallery-skeleton { display: flex; gap: var(--space-4); padding-bottom: var(--space-2); overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-inline: contain; }
	.gallery figure, .gallery-skeleton span { flex: 0 0 min(15rem, 78vw); aspect-ratio: 4 / 3; margin: 0; border-radius: var(--radius-sm); overflow: hidden; scroll-snap-align: start; background: var(--color-surface-hover); }
	.gallery img { width: 100%; height: 100%; object-fit: cover; transition: transform 160ms ease; }
	.gallery figure:hover img, .gallery figure:focus-within img { transform: scale(1.025); }
	.gallery-skeleton span { background: linear-gradient(90deg, var(--color-surface-muted), var(--color-surface-raised), var(--color-surface-muted)); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
	.empty-state { padding: var(--space-5) 0; border-block: 1px solid var(--color-border); color: var(--color-text-muted); }
	.empty-state p, .load-error { max-width: 42rem; margin: 0; line-height: 1.55; }
	.load-error { margin-top: var(--space-3); color: var(--color-status-error); }
	@keyframes shimmer { to { background-position: -200% 0; } }
	@media (max-width: 520px) { header { align-items: stretch; flex-direction: column; } }
	@media (prefers-reduced-motion: reduce) { .gallery img, .gallery-skeleton span { transition: none; animation: none; } }
</style>
