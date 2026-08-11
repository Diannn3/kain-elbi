<script lang="ts">
	import { filterBuildingAnchors } from '../../lib/building-search';
	import type { Anchor } from '../../lib/types';

	interface Props {
		anchors: Anchor[];
		value: string;
		placeholder: string;
		ariaLabel: string;
		idPrefix: string;
		invalid?: boolean;
		describedBy?: string;
		onInput: (value: string) => void;
		onSelect: (anchor: Anchor) => void;
	}

	let {
		anchors,
		value,
		placeholder,
		ariaLabel,
		idPrefix,
		invalid = false,
		describedBy,
		onInput,
		onSelect,
	}: Props = $props();

	let rootRef = $state<HTMLDivElement>();
	let inputRef = $state<HTMLInputElement>();
	let open = $state(false);
	let activeIndex = $state(-1);
	let filterMode = $state<'all' | 'query'>('all');
	let placement = $state<'below' | 'above'>('below');
	let popupMaxHeight = $state(288);

	const filterQuery = $derived(filterMode === 'query' ? value : '');
	const matches = $derived(filterBuildingAnchors(anchors, filterQuery));
	const listboxId = $derived(`${idPrefix}-listbox`);
	const activeAnchor = $derived(activeIndex >= 0 ? matches[activeIndex] : undefined);
	const activeOptionId = $derived(activeAnchor ? optionId(activeAnchor) : undefined);

	function optionId(anchor: Anchor): string {
		return `${idPrefix}-option-${anchor.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
	}

	function selectedIndex(): number {
		const normalizedValue = value.trim().toLocaleLowerCase();
		if (!normalizedValue) return -1;
		return matches.findIndex(
			(anchor) => anchor.name.toLocaleLowerCase() === normalizedValue,
		);
	}

	function openList() {
		const normalizedValue = value.trim().toLocaleLowerCase();
		const hasExactSelection = Boolean(normalizedValue) && anchors.some(
			(anchor) => anchor.name.toLocaleLowerCase() === normalizedValue,
		);
		filterMode = hasExactSelection ? 'all' : 'query';
		open = true;
		const selected = selectedIndex();
		activeIndex = selected >= 0 ? selected : -1;
	}

	function updatePopupGeometry() {
		if (!rootRef || typeof window === 'undefined') return;
		const rect = rootRef.getBoundingClientRect();
		const viewportTop = window.visualViewport?.offsetTop ?? 0;
		const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
		const viewportBottom = viewportTop + viewportHeight;
		const gap = 8;
		const below = Math.max(0, viewportBottom - rect.bottom - gap);
		const above = Math.max(0, rect.top - viewportTop - gap);

		placement = below >= Math.min(240, above) ? 'below' : 'above';
		popupMaxHeight = Math.min(288, placement === 'below' ? below : above);
	}

	function closeList() {
		open = false;
		activeIndex = -1;
	}

	function handleInput(event: Event) {
		const nextValue = (event.currentTarget as HTMLInputElement).value;
		filterMode = 'query';
		onInput(nextValue);
		open = true;
		activeIndex = 0;
	}

	function select(anchor: Anchor) {
		onSelect(anchor);
		closeList();
	}

	function moveActive(delta: number) {
		if (!open) {
			openList();
			return;
		}
		if (matches.length === 0) return;
		if (activeIndex < 0) {
			activeIndex = delta > 0 ? 0 : matches.length - 1;
			return;
		}
		activeIndex = (activeIndex + delta + matches.length) % matches.length;
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				moveActive(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				moveActive(-1);
				break;
			case 'Enter':
				if (open && activeAnchor) {
					event.preventDefault();
					select(activeAnchor);
				}
				break;
			case 'Escape':
				if (open) {
					event.preventDefault();
					closeList();
				}
				break;
			case 'Home':
				if (open && matches.length > 0) {
					event.preventDefault();
					activeIndex = 0;
				}
				break;
			case 'End':
				if (open && matches.length > 0) {
					event.preventDefault();
					activeIndex = matches.length - 1;
				}
				break;
			case 'Tab':
				closeList();
				break;
		}
	}

	function toggleList(event: MouseEvent) {
		if (open) closeList();
		else openList();

		// Keyboard activation should return focus to the editable combobox so
		// arrow-key navigation works. Pointer activation intentionally keeps
		// focus on the toggle so Android can open the list without summoning
		// the software keyboard.
		if (event.detail === 0 && open) inputRef?.focus({ preventScroll: true });
	}

	function handleFocusOut(event: FocusEvent) {
		const root = event.currentTarget as HTMLElement;
		queueMicrotask(() => {
			if (!root.contains(document.activeElement)) closeList();
		});
	}

	$effect(() => {
		if (!open || typeof window === 'undefined') return;
		const viewport = window.visualViewport;
		const update = () => updatePopupGeometry();
		requestAnimationFrame(update);
		window.addEventListener('resize', update);
		viewport?.addEventListener('resize', update);
		viewport?.addEventListener('scroll', update);
		return () => {
			window.removeEventListener('resize', update);
			viewport?.removeEventListener('resize', update);
			viewport?.removeEventListener('scroll', update);
		};
	});

	$effect(() => {
		if (!open || !activeOptionId) return;
		queueMicrotask(() => {
			document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' });
		});
	});
</script>

<div bind:this={rootRef} class="building-combobox" data-building-combobox onfocusout={handleFocusOut}>
	<div class="search-field" class:open>
		<svg class="search-icon" aria-hidden="true" viewBox="0 0 24 24">
			<path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
		</svg>
		<input
			bind:this={inputRef}
			type="search"
			role="combobox"
			placeholder={placeholder}
			autocomplete="off"
			spellcheck="false"
			aria-label={ariaLabel}
			aria-invalid={invalid}
			aria-describedby={describedBy}
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={listboxId}
			aria-activedescendant={activeOptionId}
			value={value}
			oninput={handleInput}
			onfocus={openList}
			onclick={openList}
			onkeydown={handleKeydown}
		/>
		<button
			class="dropdown-toggle"
			type="button"
			aria-label={`${open ? 'Close' : 'Open'} ${ariaLabel} options`}
			aria-expanded={open}
			aria-controls={listboxId}
			onclick={toggleList}
		>
			<svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 7.5 5 5 5-5" /></svg>
		</button>
	</div>

	{#if open}
		<div class="options-popover" class:above={placement === 'above'} data-building-options>
			<div id={listboxId} class="options" role="listbox" aria-label={`${ariaLabel} options`} style={`max-height: ${popupMaxHeight}px`}>
				{#if matches.length > 0}
					{#each matches as anchor, index (anchor.id)}
						<button
							id={optionId(anchor)}
							type="button"
							role="option"
							tabindex="-1"
							aria-selected={anchor.name === value}
							class:active={index === activeIndex}
							class:selected={anchor.name === value}
							onmouseenter={() => (activeIndex = index)}
							onclick={() => select(anchor)}
						>
							<span>{anchor.name}</span>
							{#if anchor.name === value}<span class="check" aria-hidden="true">✓</span>{/if}
						</button>
					{/each}
				{:else}
					<p class="empty-state" role="status">No campus building matches “{value}”.</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.building-combobox {
		position: relative;
		width: 100%;
		min-width: 0;
	}

	.search-field {
		position: relative;
		display: flex;
		align-items: center;
		min-height: var(--tap-target);
	}

	.search-icon {
		position: absolute;
		z-index: 2;
		left: 0.9rem;
		width: 1.2rem;
		fill: none;
		stroke: var(--color-text-muted);
		stroke-width: 1.8;
		pointer-events: none;
	}

	.search-field input {
		width: 100%;
		min-height: var(--tap-target);
		padding: 0 3.1rem 0 2.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		outline: none;
		background: var(--color-surface-raised);
		color: var(--color-text);
		font: inherit;
		font-weight: 650;
		box-shadow: 0 0.35rem 1rem rgb(92 16 22 / 0.05);
		transition: border-color 140ms ease, box-shadow 140ms ease;
	}

	.search-field input::-webkit-search-cancel-button { display: none; }
	.search-field input::placeholder { color: hsl(150 8% 48%); font-weight: 500; }
	.search-field input:focus,
	.search-field.open input {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgb(230 105 28 / 0.24), 0 0.35rem 1rem rgb(92 16 22 / 0.06);
	}
	.search-field input[aria-invalid='true'] {
		border-color: hsl(2 70% 42%);
		box-shadow: 0 0 0 1px hsl(2 70% 42%);
	}

	.dropdown-toggle {
		position: absolute;
		z-index: 3;
		right: 0.3rem;
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: 0;
		border-radius: 0.75rem;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.dropdown-toggle:hover,
	.dropdown-toggle:focus-visible { background: var(--color-surface-muted); color: var(--color-primary); }
	.dropdown-toggle:focus-visible { outline: 2px solid var(--brand-orange); outline-offset: 1px; }
	.dropdown-toggle svg { width: 1.15rem; fill: none; stroke: currentColor; stroke-width: 2; transition: transform 140ms ease; }
	.search-field.open .dropdown-toggle svg { transform: rotate(180deg); }

	.options-popover {
		position: absolute;
		z-index: 50;
		top: calc(100% + 0.4rem);
		right: 0;
		left: 0;
		overflow: hidden;
		border: 1px solid var(--color-border-strong);
		border-radius: 1rem;
		background: var(--color-surface-raised);
		box-shadow: 0 1rem 2.5rem rgb(35 4 8 / 0.2);
	}

	.options-popover.above { top: auto; bottom: calc(100% + 0.4rem); }

	.options {
		display: grid;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-gutter: stable;
		padding: 0.35rem;
	}

	.options [role='option'] {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		min-height: var(--tap-target);
		padding: 0.7rem 0.8rem;
		border: 0;
		border-radius: 0.7rem;
		background: transparent;
		color: var(--color-text);
		font: 650 0.88rem/1.35 var(--font-body);
		text-align: left;
		cursor: pointer;
	}
	.options [role='option']:hover,
	.options [role='option'].active { background: var(--brand-sand); color: var(--color-primary); }
	.options [role='option'].selected { font-weight: 760; }
	.options [role='option'] .check { flex: none; color: var(--brand-orange); font-weight: 800; }

	.empty-state {
		margin: 0;
		padding: 1rem;
		color: var(--color-text-muted);
		font-size: 0.84rem;
		line-height: 1.45;
	}

	@media (min-width: 960px) {
		.search-field input { min-height: 3rem; }
	}

	@media (max-width: 420px) {
		.options [role='option'] { min-height: 3rem; font-size: 0.86rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.search-field input,
		.dropdown-toggle svg { transition: none; }
	}
</style>
