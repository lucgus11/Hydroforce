// HydroForce Service Worker
// Stratégie: Cache-First pour assets, Network-First pour pages

const CACHE_NAME = 'hydroforce-v1';
const OFFLINE_URL = '/';

const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Messages de harcèlement escaladants ──────────────────────────────────────
const HARASSMENT_MESSAGES = {
  tier1: [ // 30–60 min
    { title: '💧 Hé, t\'as oublié quelque chose…', body: 'Un verre d\'eau t\'attend. Il se sent seul.' },
    { title: '💧 Rappel amical', body: 'Ton corps est à 60% d\'eau. Et ça baisse.' },
    { title: '💧 Petit check hydratation', body: 'La dernière fois que t\'as bu, c\'était… il y a trop longtemps.' },
  ],
  tier2: [ // 60–90 min
    { title: '⚠️ ALERTE MODÉRÉE', body: 'Tes lèvres sont en train de devenir du papier de verre. Bois.' },
    { title: '⚠️ Tes reins ont envoyé un message', body: '"On fait la gueule. Cordialement, les reins."' },
    { title: '⚠️ Situation préoccupante', body: 'Même les cactus boivent de temps en temps. Sois au moins aussi malin qu\'un cactus.' },
  ],
  tier3: [ // 90–120 min
    { title: '🚨 URGENCE HYDRIQUE', body: 'TU ES UN RAISIN. TU ÉTAIS UN GRAIN DE RAISIN. TU DEVIENS UNE RAISIN SEC. BOIS.' },
    { title: '🚨 SOS REINS EN DÉTRESSE', body: 'Ils filtrent 180 litres par jour pour toi et tu ne leur offres même pas un verre. Honte.' },
    { title: '🚨 AVIS DE DÉSHYDRATATION', body: 'Ton cerveau rétrécit. Littéralement. C\'est de la science. BOIS DE L\'EAU.' },
  ],
  tier4: [ // 120+ min
    { title: '☠️ NIVEAU MOMIE ÉGYPTIENNE', body: 'À ce stade, les archéologues pourraient t\'exposer dans un musée. Va boire.' },
    { title: '☠️ ALERTE ROUGE MAXIMALE', body: 'L\'OMS a été contactée. Les Nations Unies se réunissent. Tout ça parce que tu ne bois pas d\'eau.' },
    { title: '☠️ MESSAGE DE TES CELLULES', body: '"On démissionne toutes. Collectivement. Avec préavis. Dernière chance."' },
    { title: '☠️ APOCALYPSE HYDRIQUE', body: 'Dieu a regardé ta fiche d\'hydratation. Il est déçu. Profondément déçu.' },
    { title: '☠️ RAPPORT MÉDICAL FICTIF', body: 'Diagnostic: Stupidité aqueuse avancée. Traitement: 1 verre d\'eau. Immédiatement.' },
  ],
};

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch (Cache-First pour assets, Network-First pour navigation) ───────────
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      });
    })
  );
});

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: '💧 HydroForce', body: 'Bois de l\'eau.', tier: 1 };
  if (event.data) {
    try { data = event.data.json(); } catch {}
  }
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: data.tier >= 3 ? [200, 100, 200, 100, 400, 100, 400] : [200, 100, 200],
    tag: 'hydroforce-reminder',
    renotify: true,
    requireInteraction: data.tier >= 3,
    actions: [
      { action: 'drink', title: '💧 J\'AI BU !', icon: '/icons/icon-96.png' },
      { action: 'snooze', title: '😴 10 min...', icon: '/icons/icon-96.png' },
    ],
    data: { tier: data.tier, timestamp: Date.now() },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'drink') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        const existingClient = clients.find(c => c.url.includes(self.location.origin));
        if (existingClient) {
          existingClient.focus();
          existingClient.postMessage({ type: 'DRINK_LOGGED' });
        } else {
          self.clients.openWindow('/?action=drink');
        }
      })
    );
  } else if (event.action === 'snooze') {
    // Snooze 10 min — le client gère le re-scheduling
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach(c => c.postMessage({ type: 'SNOOZE_10' }));
    });
  } else {
    event.waitUntil(self.clients.openWindow('/'));
  }
});

// ── Message from client (schedule notification) ───────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, tier } = event.data;
    const messages = getMessagesForTier(tier);
    const msg = messages[Math.floor(Math.random() * messages.length)];
    setTimeout(() => {
      self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: tier >= 3 ? [200, 100, 200, 100, 400, 100, 400] : [200, 100, 200],
        tag: 'hydroforce-reminder',
        renotify: true,
        requireInteraction: tier >= 3,
        actions: [
          { action: 'drink', title: '💧 J\'AI BU !' },
          { action: 'snooze', title: '😴 10 min...' },
        ],
        data: { tier, timestamp: Date.now() },
      });
    }, delay);
  }
});

function getMessagesForTier(tier) {
  if (tier >= 4) return HARASSMENT_MESSAGES.tier4;
  if (tier === 3) return HARASSMENT_MESSAGES.tier3;
  if (tier === 2) return HARASSMENT_MESSAGES.tier2;
  return HARASSMENT_MESSAGES.tier1;
}
