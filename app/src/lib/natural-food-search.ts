import type { Category, MealTag, Place } from './types';

export interface NaturalFoodIntent {
  original: string;
  textQuery: string;
  maxBudget?: number;
  category?: Category;
  mealTags: MealTag[];
  quick: boolean;
  openNow: boolean;
  interpreted: string[];
}

const TAG_TERMS: Array<{ tag: MealTag; terms: string[]; label: string }> = [
  { tag: 'rice-meal', terms: ['rice meal', 'rice meals', 'ulam', 'silog', 'tapsilog', 'tocilog', 'longsilog', 'kanin'], label: 'Rice meal' },
  { tag: 'snack', terms: ['snack', 'snacks', 'merienda', 'meryenda', 'quick bite'], label: 'Snack' },
  { tag: 'coffee', terms: ['coffee shop', 'coffee', 'cafe', 'café', 'kape', 'latte', 'espresso'], label: 'Coffee' },
  { tag: 'dessert', terms: ['dessert', 'desserts', 'ice cream', 'cake', 'sweet', 'sweets'], label: 'Dessert' },
  { tag: 'heavy-meal', terms: ['heavy meal', 'filling', 'busog', 'big serving', 'large serving'], label: 'Heavy meal' },
  { tag: 'quick-meal', terms: ['quick meal', 'mabilis', 'fast', 'grab and go', 'grab-and-go'], label: 'Quick meal' },
  { tag: 'bakery', terms: ['bread', 'bakery', 'pastry', 'pastries'], label: 'Bakery' },
  { tag: 'drinks', terms: ['drink', 'drinks', 'milktea', 'milk tea', 'boba', 'juice', 'shake'], label: 'Drinks' },
];

function normalized(value: string): string {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termRegex(term: string, global = false): RegExp {
  const escaped = escapeRegex(normalized(term)).replace(/\\ /g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, global ? 'g' : '');
}

function containsTerm(query: string, term: string): boolean {
  return termRegex(term).test(query);
}

function removeTerm(query: string, term: string): string {
  return query.replace(termRegex(term, true), (_match, prefix: string) => prefix || ' ');
}

const BUDGET_PATTERNS = [
  /(?:under|below|less than|max|budget(?: of)?|up to|<=?)\s*₱?\s*(\d{2,4})/i,
  /₱\s*(\d{2,4})\s*(?:max|or less|below|under)/i,
  /(?:mga|around)\s*₱?\s*(\d{2,4})/i,
] as const;

function extractBudget(query: string): number | undefined {
  for (const pattern of BUDGET_PATTERNS) {
    const match = query.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value >= 40 && value <= 3000) return value;
  }
  return undefined;
}

export function removeBudgetIntent(input: string): string {
  let result = normalized(input);
  for (const pattern of BUDGET_PATTERNS) result = result.replace(pattern, ' ');
  return result.replace(/\s+/g, ' ').trim();
}

function stripIntentTerms(query: string, budget?: number): string {
  let result = budget ? removeBudgetIntent(query) : normalized(query);
  for (const group of TAG_TERMS) {
    for (const term of group.terms) result = removeTerm(result, term);
  }
  result = result
    .replace(/\b(open now|currently open)\b/g, ' ')
    .replace(/\b(cheap|budget|mura|affordable|sulit|quick|near|nearby|around|food|place|restaurant|resto|kainan|where|find|me|show|pang|na|ng|for|a|the)\b/g, ' ');
  return result.replace(/\s+/g, ' ').trim();
}

export function removeMealTypeIntent(input: string): string {
  let result = normalized(input);
  for (const group of TAG_TERMS) {
    for (const term of group.terms) result = removeTerm(result, term);
  }
  result = result.replace(/(^|[^a-z0-9])(quick|mabilis)(?=$|[^a-z0-9])/g, (_match, prefix: string) => prefix || ' ');
  return result.replace(/\s+/g, ' ').trim();
}

export function removeOpenNowIntent(input: string): string {
  return normalized(input)
    .replace(/(^|[^a-z0-9])(open now|currently open)(?=$|[^a-z0-9])/g, (_match, prefix: string) => prefix || ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseNaturalFoodQuery(input: string): NaturalFoodIntent {
  const query = normalized(input);
  const maxBudget = extractBudget(query);
  const mealTags = TAG_TERMS
    .filter((group) => group.terms.some((term) => containsTerm(query, term)))
    .map((group) => group.tag);
  const quick = /(^|[^a-z0-9])(quick|mabilis)(?=$|[^a-z0-9])/.test(query)
    || mealTags.includes('quick-meal');
  if (quick && !mealTags.includes('quick-meal')) mealTags.push('quick-meal');
  const openNow = /(^|[^a-z0-9])(open now|currently open)(?=$|[^a-z0-9])/.test(query);

  let category: Category | undefined;
  if (containsTerm(query, 'cafe') || containsTerm(query, 'café') || containsTerm(query, 'coffee shop')) category = 'cafe';
  else if (containsTerm(query, 'bakery')) category = 'bakery_deli';
  else if (containsTerm(query, 'fast food')) category = 'fast_food';

  const interpreted: string[] = [];
  if (maxBudget) interpreted.push(`≤ ₱${maxBudget}`);
  if (category === 'cafe') interpreted.push('Café');
  if (category === 'bakery_deli') interpreted.push('Bakery');
  for (const tag of mealTags) {
    const label = TAG_TERMS.find((group) => group.tag === tag)?.label;
    if (label && !interpreted.includes(label)) interpreted.push(label);
  }
  if (openNow) interpreted.push('Open now');

  return {
    original: input,
    textQuery: stripIntentTerms(query, maxBudget),
    ...(maxBudget ? { maxBudget } : {}),
    ...(category ? { category } : {}),
    mealTags,
    quick,
    openNow,
    interpreted,
  };
}

export function placeMealTags(place: Place): Set<MealTag> {
  const tags = new Set<MealTag>(place.mealTags ?? []);
  const text = normalized([place.name, ...(place.aliases ?? []), ...place.cuisine, ...(place.dishes ?? []).flatMap((dish) => [dish.name, ...(dish.tags ?? [])])].join(' '));
  for (const group of TAG_TERMS) {
    if (group.terms.some((term) => containsTerm(text, term))) tags.add(group.tag);
  }
  if (place.category === 'cafe') tags.add('coffee');
  if (place.category === 'bakery_deli') tags.add('bakery');
  if (place.category === 'fast_food' || place.category === 'kiosk_stall') tags.add('quick-meal');
  return tags;
}

export function matchesMealTags(place: Place, tags: readonly MealTag[]): boolean {
  if (!tags.length) return true;
  const actual = placeMealTags(place);
  return tags.every((tag) => actual.has(tag));
}

export function placeFitsNaturalBudget(place: Place, intent: Pick<NaturalFoodIntent, 'maxBudget' | 'textQuery'>): boolean {
  const budget = intent.maxBudget;
  if (!budget) return true;
  const text = normalized(intent.textQuery);
  if (text && place.dishes?.length) {
    const matching = place.dishes.filter((dish) => {
      const document = normalized([dish.name, ...(dish.tags ?? [])].join(' '));
      return text.split(' ').filter(Boolean).every((token) => document.includes(token));
    });
    if (matching.length) {
      const priced = matching.filter((dish) => Number.isFinite(dish.pricePhp));
      if (!priced.length) return false;
      return priced.some((dish) => (dish.pricePhp ?? Number.POSITIVE_INFINITY) <= budget);
    }
  }
  return Boolean(place.price && place.price.mealLowPhp <= budget);
}
