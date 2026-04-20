# 💧 HydroForce — L'App d'Hydratation Qui Ne Te Lâche Pas

> Un système de harcèlement aquatique en mode Brutalist PWA.

---

## 🚀 Déploiement sur Vercel (Guide Complet)

### Prérequis
- Node.js 18+
- Compte GitHub
- Compte Vercel (gratuit)

### Étape 1 — Initialiser le projet localement

```bash
# Cloner / créer le repo
git init hydroforce && cd hydroforce

# Copier tous les fichiers dans ce dossier
# (ou décompresser le ZIP fourni)

# Installer les dépendances
npm install

# Tester en local
npm run dev
# → Ouvrir http://localhost:3000
```

### Étape 2 — Push sur GitHub

```bash
git add .
git commit -m "feat: HydroForce PWA init"

# Créer un repo GitHub (via github.com ou gh CLI)
gh repo create hydroforce --public --push --source=.

# Ou manuellement :
git remote add origin https://github.com/TON_USERNAME/hydroforce.git
git branch -M main
git push -u origin main
```

### Étape 3 — Déployer sur Vercel

**Option A — Via l'interface Vercel :**
1. Aller sur [vercel.com](https://vercel.com) → "New Project"
2. Importer ton repo GitHub `hydroforce`
3. Framework preset → **Next.js** (détecté automatiquement)
4. Cliquer **Deploy** → ✅

**Option B — Via CLI :**
```bash
npm i -g vercel
vercel login
vercel --prod
```

### Étape 4 — Vérifier la PWA

1. Ouvrir l'URL Vercel dans Chrome/Edge
2. DevTools → Application → Service Workers → Vérifier que le SW est actif
3. DevTools → Application → Manifest → Vérifier les icônes et le nom
4. Sur mobile : "Ajouter à l'écran d'accueil" pour l'expérience pleine

---

## ⚙️ Configuration

### Modifier le délai d'alerte

Dans `src/lib/hydration.ts` :
```typescript
export const ALERT_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutes → changer ici
```

### Modifier l'objectif journalier

```typescript
export const DAILY_GOAL = 8; // verres → changer ici
```

### Ajouter des messages de harcèlement

Dans le tableau `HARASS_MESSAGES` dans `src/lib/hydration.ts` :
```typescript
{ tier: 2, emoji: '⚠️', text: 'Ton message ici.' },
```
Les tiers 1-4 correspondent à 30/60/90/120+ minutes sans boire.

---

## 🏗️ Architecture

```
hydration-enforcer/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker (cache + notifications)
│   └── icons/                 # Icônes PWA (72/96/128/192/512px)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Layout racine (metadata PWA, SW registration)
│   │   ├── page.tsx           # Page principale
│   │   └── globals.css        # Styles globaux + animations Brutalist
│   ├── components/
│   │   └── HydroForce.tsx     # Composant principal (toute la logique)
│   └── lib/
│       └── hydration.ts       # Utilitaires, constantes, localStorage
├── next.config.js             # Config Next.js (headers SW)
├── tailwind.config.ts         # Config Tailwind + animations custom
├── vercel.json                # Config Vercel (headers, cache)
└── package.json
```

---

## 🔧 Fonctionnalités PWA

| Feature | Implémentation |
|---|---|
| **Notifications Push** | Service Worker + `showNotification()` |
| **Mode Hors-Ligne** | Cache-First strategy dans `sw.js` |
| **Installable** | `manifest.json` + critères PWA |
| **Wake Lock** | `navigator.wakeLock.request('screen')` |
| **Vibration** | `navigator.vibrate([200, 100, 200])` |
| **Persistance** | `localStorage` (reset auto à minuit) |
| **Bouton Volant** | `position: fixed` + random `top/left` |
| **Mode Alerte** | Animation CSS + body class `alert-mode` |

---

## 📱 Compatibilité

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Service Worker | ✅ | ✅ | ✅ 11.1+ | ✅ |
| Notifications | ✅ | ✅ | ❌ iOS | ✅ |
| Wake Lock | ✅ | ❌ | ❌ | ✅ |
| Vibration | ✅ | ✅ | ❌ | ✅ |
| Installation PWA | ✅ | ✅ | ✅ | ✅ |

> **Note Safari/iOS** : Les notifications push ne sont supportées qu'en PWA installée (iOS 16.4+). La vibration n'est pas disponible sur iOS.

---

## 🎨 Design System

- **Police display** : Bebas Neue (via Google Fonts)
- **Police code** : Share Tech Mono
- **Couleurs** :
  - `#C8FF00` — Acid Green (normal)
  - `#FF2D00` — Rouge Brutal (alerte)
  - `#0A0A0A` — Void Black (fond)
  - `#FFE600` — Warning Yellow (tier 2)
  - `#00F5FF` — Electric Cyan (accents)

---

## 📄 Licence

MIT — Fais-en ce que tu veux. Mais bois de l'eau d'abord.
