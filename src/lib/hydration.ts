// ── Constants (fallback values) ────────────────────────────────────────────
export const DEFAULT_DAILY_GOAL = 8;
export const DEFAULT_GLASS_ML   = 250;
export const ALERT_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutes

// Preset glass sizes offered in settings
export const GLASS_PRESETS: { label: string; ml: number }[] = [
  { label: 'Petit verre',     ml: 150 },
  { label: 'Standard',        ml: 250 },
  { label: 'Grand verre',     ml: 350 },
  { label: 'Bouteille',       ml: 500 },
  { label: 'Personnalisé',    ml: 0   }, // 0 = custom free input
];

// ── Harassment messages by tier ────────────────────────────────────────────
export interface HarassMessage {
  text: string;
  emoji: string;
  tier: 1 | 2 | 3 | 4;
}

export const HARASS_MESSAGES: HarassMessage[] = [
  // Tier 1: 30-60 min
  { tier: 1, emoji: '💧', text: 'Un verre d\'eau t\'attend. Il se sent abandonné.' },
  { tier: 1, emoji: '💧', text: 'Ton corps est à 60% d\'eau. Et ça diminue.' },
  { tier: 1, emoji: '💧', text: 'La plante de ton bureau boit plus que toi.' },

  // Tier 2: 60-90 min
  { tier: 2, emoji: '⚠️', text: 'Tes lèvres ressemblent à du papier de verre. Bois.' },
  { tier: 2, emoji: '⚠️', text: 'Tes reins m\'ont envoyé un SMS. Ils font la gueule.' },
  { tier: 2, emoji: '⚠️', text: 'Même les cactus boivent de temps en temps. Réfléchis.' },
  { tier: 2, emoji: '⚠️', text: 'Ton cerveau se contracte. De la science. Pas une blague.' },
  { tier: 2, emoji: '⚠️', text: 'Les médecins recommandent de boire. Les médecins qui existent.' },

  // Tier 3: 90-120 min
  { tier: 3, emoji: '🚨', text: 'TU ES EN TRAIN DE DEVENIR UNE RAISIN SEC. BOIS MAINTENANT.' },
  { tier: 3, emoji: '🚨', text: 'SOS REINS EN DÉTRESSE. RÉPONDS. SIGNE DE VIE.' },
  { tier: 3, emoji: '🚨', text: 'TON SANG EST DU SIROP. C\'EST MAUVAIS. BOIS.' },
  { tier: 3, emoji: '🚨', text: 'AVIS DE DÉSHYDRATATION AVANCÉE. TRAITEMENT: EAU. MAINTENANT.' },

  // Tier 4: 120+ min
  { tier: 4, emoji: '☠️', text: 'À ce stade, les archéologues pourraient t\'exposer dans un musée.' },
  { tier: 4, emoji: '☠️', text: 'L\'OMS a été notifiée. Les Nations Unies se réunissent d\'urgence.' },
  { tier: 4, emoji: '☠️', text: '"On démissionne toutes." — tes cellules, collectivement, avec préavis.' },
  { tier: 4, emoji: '☠️', text: 'Dieu a consulté ta fiche d\'hydratation. Il est déçu. Profondément.' },
  { tier: 4, emoji: '☠️', text: 'Diagnostic: Stupidité aqueuse terminale. Traitement: 1 verre. Maintenant.' },
  { tier: 4, emoji: '☠️', text: 'Tu n\'es plus une personne. Tu es une momie en temps réel.' },
];

// ── LocalStorage helpers ───────────────────────────────────────────────────
export interface HydrationState {
  glassesConsumed: number;
  lastDrinkTime: number;
  dailyDate: string;
  totalMlToday: number;
  notifPermission: NotificationPermission | 'default';
  // User-configurable settings (kept across day resets)
  dailyGoal: number;
  glassMl: number;
}

const LS_KEY = 'hydroforce_state';

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function loadState(): HydrationState {
  if (typeof window === 'undefined') return getDefaultState();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return getDefaultState();
    const parsed: HydrationState = JSON.parse(raw);
    // Keep settings but reset daily counters when day changes
    if (parsed.dailyDate !== getTodayDate()) {
      const fresh = getDefaultState(parsed.dailyGoal, parsed.glassMl);
      saveState(fresh);
      return fresh;
    }
    // Back-fill settings for older saves that lack these fields
    return {
      ...parsed,
      dailyGoal: parsed.dailyGoal ?? DEFAULT_DAILY_GOAL,
      glassMl:   parsed.glassMl   ?? DEFAULT_GLASS_ML,
    };
  } catch {
    return getDefaultState();
  }
}

export function saveState(state: HydrationState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

function getDefaultState(goal = DEFAULT_DAILY_GOAL, ml = DEFAULT_GLASS_ML): HydrationState {
  return {
    glassesConsumed: 0,
    lastDrinkTime: Date.now(),
    dailyDate: getTodayDate(),
    totalMlToday: 0,
    notifPermission: 'default',
    dailyGoal: goal,
    glassMl: ml,
  };
}

// ── Time helpers ───────────────────────────────────────────────────────────
export function getMinutesSinceLastDrink(lastDrinkTime: number): number {
  return Math.floor((Date.now() - lastDrinkTime) / 1000 / 60);
}

export function getHarassmentTier(minutesSince: number): 1 | 2 | 3 | 4 {
  if (minutesSince >= 120) return 4;
  if (minutesSince >= 90)  return 3;
  if (minutesSince >= 60)  return 2;
  return 1;
}

export function getRandomMessage(tier: 1 | 2 | 3 | 4): HarassMessage {
  const filtered = HARASS_MESSAGES.filter(m => m.tier === tier);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function formatTimeSince(minutes: number): string {
  if (minutes < 1) return 'quelques secondes';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}
