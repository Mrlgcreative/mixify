# Mixify

Front-end d'un lecteur de streaming musical inspiré de Spotify, avec une
fonctionnalité clé : **l'Auto-Mix**, un enchaînement automatique avec fondu
intelligent (crossfade + beat-sync) calculé en Web Audio API.

## Stack

| Besoin            | Choix                                          |
| ----------------- | ---------------------------------------------- |
| Framework         | React 18 + TypeScript strict                   |
| Build             | Vite 6                                         |
| Styles            | Tailwind CSS 3 + variables CSS (thème à chaud) |
| État              | Zustand (store du lecteur + file d'attente)    |
| Icônes            | lucide-react                                   |
| Audio             | Web Audio API (double deck + gains)            |

## Démarrage

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm test           # tests unitaires du moteur de fondu (node:test)
```

Sans configuration, l'application tourne en **mode démonstration** : catalogue
local et pistes audio **synthétisées dans le navigateur** (WAV PCM, tempo
exact). L'Auto-Mix est donc réellement vérifiable sans serveur ni réseau.

## Structure

```
src/
├── api/
│   ├── demoAudio.ts        # synthèse WAV locale (mode démo)
│   ├── demoCatalog.ts      # catalogue de démonstration
│   ├── itunesApi.ts        # adaptateur iTunes (défaut, artistes reconnus)
│   ├── jamendoApi.ts       # adaptateur Jamendo (catalogue libre complet)
│   ├── jamendoApi.test.ts  # tests du mappage (fixtures réelles)
│   ├── spotifyApi.ts       # adaptateur Spotify (compte utilisateur)
│   ├── spotifyAuth.ts      # flux OAuth PKCE (connexion, callback, refresh)
│   └── musicApi.ts         # contrat MusicApi + sélection de l'implémentation
├── audio/
│   ├── crossfade.ts        # calcul pur : courbes, tempo, alignement
│   ├── crossfade.test.ts   # tests unitaires (node:test)
│   └── engine.ts           # moteur Web Audio à double deck
├── components/
│   ├── AutoMix/            # AutoMixToggle, CrossfadeSettings
│   ├── Header/             # header sticky (historique + recherche)
│   ├── Logo/               # logo SVG interchangeable
│   ├── Player/             # barre de lecture, seek bar, analyseur FFT
│   ├── Queue/              # panneau latéral (file + réglages)
│   ├── Sidebar/            # navigation + playlists
│   └── common/             # Cover, Carousel, MediaCard, TrackList
├── hooks/useMusicApi.ts    # hooks d'accès à l'API (loading / error / abort)
├── store/playerStore.ts    # store Zustand : lecteur + file d'attente
├── theme/theme.ts          # couleurs, rayons, logo, accent à chaud
├── types/music.ts          # Track, Album, Artist, Playlist, PlayerState…
├── utils/                  # formatage temps, guards de types
├── views/                  # Home, Search, Library
└── App.tsx                 # layout + navigation (historique local)
```

## Comment fonctionne l'Auto-Mix

1. **Deux decks** : chaque `<audio>` passe par un `GainNode` → `AnalyserNode` →
   master. Le titre suivant est préchargé dans le deck libre.
2. **Fenêtre de fondu** : à `durée du fondu` secondes de la fin du titre
   courant, le moteur plan la transition (`src/audio/engine.ts`).
3. **Courbes à puissance constante** (`sin`/`cos`) : le niveau perçu ne creuse
   jamais au milieu du fondu, contrairement à une interpolation linéaire. Les
   rampes sont programmées sur l'horloge de l'`AudioContext` (précision
   échantillon).
4. **Beat-sync** : le tempo du titre entrant est aligné sur celui du titre
   sortant (plafonné à ±8 % pour préserver le pitch) et son premier downbeat est
   calé sur un downbeat du titre sortant (`planBeatSync` dans
   `src/audio/crossfade.ts`).
5. **Repli sûr** : si le flux entrant échoue ou n'est pas prêt, le fondu est
   annulé et le titre courant se termine seul (pas de trou de silence).

La durée du fondu est réglable de **0 à 12 s** (panneau latéral → *Réglages*),
et l'état est persisté dans `localStorage`.

## Thème

`src/theme/theme.ts` est la source de vérité des couleurs. Les valeurs sont
écrites dans des variables CSS (`--primary`, `--bg`, `--card`…) que Tailwind
consomme (`tailwind.config.ts`). Pour changer la couleur primaire — remplacer
le vert `#1DB954` — :

```ts
export const theme = { colors: { primary: '#8B5CF6', /* … */ } };
```

ou, sans toucher au code, via la pastille « Couleur d'accentuation » de
l'onglet *Réglages* (le changement est immédiat et persiste). Le logo
(`src/components/Logo/Logo.tsx`) est un SVG inline qui utilise les mêmes
variables : le remplacer par une image se fait en une ligne.

## Catalogue réel sans backend

Source choisie via `VITE_MUSIC_API` dans `.env.local` (`VITE_API_BASE_URL`,
s'il est défini, prime toujours pour héberger vos propres titres) :

| Valeur     | Catalogue                                              | Lecture            |
| ---------- | ------------------------------------------------------ | ------------------ |
| `itunes` **(défaut)** | Artistes reconnus, classements fr/ng/us/ru, **sans clé** | Extraits de 30 s ⚠️ |
| `jamendo`  | ≈ 500 000 titres Creative Commons (client_id requis)    | Intégrale (mp3)    |
| `spotify`  | Votre compte : playlists, likés, écoutes récentes (OAuth) | Extraits de 30 s ⚠️ |
| `demo`     | Local + audio synthétisé, 100 % hors-ligne             | Intégrale (synthé) |

### iTunes — artistes reconnus (défaut)

`src/api/itunesApi.ts` consomme l'[API publique Apple](https://developer.apple.com/documentation/itunes_search_api)
(sans clé ni OAuth) : `/search` (titres, albums, artistes) et les flux RSS
`/{pays}/rss/topsongs|topalbums` pour les rayons « Top France / Top Afrique
(Nigeria) / Top États-Unis / Top Russie », réutilisés comme playlists de la
bibliothèque. Vérifié en réel avant câblage :

| Point                     | Résultat                                                    |
| ------------------------- | ----------------------------------------------------------- |
| CORS sur `/search` et les flux RSS | `access-control-allow-origin: *` (pas de proxy) |
| CORS sur le CDN audio `audio-ssl.itunes.apple.com` | `*` — MediaElementSource non teinté, pas de silence |
| Format audio              | extrait m4a mesuré à **30.000998 s** (`duration` = durée jouée) |
| Chansons complètes        | ❌ aucune API gratuite ne livre les titres des majors        |
| BPM / playlists publiques | ❌ ni tempo, ni API de playlists : les classements en tiennent lieu (le BPM est estimé côté client, voir plus bas) |

L'Auto-Mix fonctionne sur ces extraits (le fondu s'arme sur `el.duration`
réel), mais chaque titre s'arrête à 30 s : pour des morceaux complets, il faut
le backend (ci-dessous) ou `VITE_MUSIC_API=jamendo`.

### Jamendo — lecture intégrale, catalogue libre

Créez un `client_id` gratuit sur [devportal.jamendo.com](https://devportal.jamendo.com)
puis :

```bash
printf 'VITE_MUSIC_API=jamendo\nVITE_JAMENDO_CLIENT_ID=xxxxxxxx\n' > .env.local
npm run dev
```

`src/api/jamendoApi.ts` implémente `MusicApi` et se contente de mapper les
réponses vers `Track` / `Album` / `Playlist`. Ce qui a été vérifié avant câblage
(en-têtes réels, pas de suppositions) :

| Point                  | Résultat                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| CORS sur `api.jamendo.com` | `access-control-allow-origin: *`                                  |
| CORS sur le CDN audio  | host racine `storage.jamendo.com` → `*` fiable (les hotes `prod-N` renvoient un ACAO périmé : l'adaptateur réécrit l'URL) |
| Format audio           | mp3 complet (`mp31`/`mp32`), pas un extrait de 30 s                    |
| BPM                    | **non exposé** par l'API (seulement `musicinfo.speed`, 5 paliers)      |

### Spotify — votre compte (flux OAuth PKCE)

```bash
printf 'VITE_MUSIC_API=spotify\nVITE_SPOTIFY_CLIENT_ID=xxxxxxxx\n' > .env.local
npm run dev
```

1. Créez une app sur [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) ;
2. déclarez son **Redirect URI** exactement comme l'URI affichée par Mixify
   (en dev : `http://localhost:5173/` — le port doit correspondre) ;
3. collez le Client ID dans `.env.local`, lancez l'app et cliquez sur
   « Connexion » dans la sidebar.

`src/api/spotifyAuth.ts` implémente le flux PKCE **sans serveur** : aller chez
Spotify, retour `?code=` échangé contre les jetons avant le premier rendu
(URL nettoyée d'office), auto-refresh du jeton d'accès (1 h) et déconnexion.
Le `client_secret` n'existe pas — il ne doit jamais arriver côté front.
`src/api/spotifyApi.ts` mappe ensuite recherche / playlists / bibliothèque /
écoutes récentes vers `MusicApi` (pistes BPM : estimé côté client, voir plus
bas).

⚠️ **Extraits de 30 s retirés** : depuis novembre 2024, Spotify ne fournit plus
`preview_url` aux applications nouvelles. Les titres reviennent alors sans flux
audio : rayons et recherche les excluent, un clic dans une playlist affiche la
notice « aucun extrait ». Avec une application antérieure ou une extension
Spotify accordée, la lecture fonctionne normalement. Aucun endpoint public ne
remplace ces extraits.

Aucune API gratuite n'expose de BPM : l'Auto-Mix l'estime donc **côté client**
(`src/audio/tempo.ts`) à partir du signal lui-même — enveloppe d'attaques puis
filtre en peigne (70–180 BPM + phase), mené indépendamment sur chaque moitié de
la fenêtre d'analyse ; les deux moitiés doivent s'accorder pour retenir
l'estimation. Un BPM fourni par l'API (`Track.bpm`, mode `demo` ou backend
maison) prime toujours. Sans BPM fiable — bruit, silence, intros sans
pulsation — le fondu garde le chemin égal-puissance : jamais de tempo inventé.

> Les fiches de playlist Jamendo n'ont pas d'image d'API : la couverture est
> reprise du premier titre, `Cover.tsx` se charge du dégradé de repli. La
> bibliothèque « favoris » reste vide tant qu'il n'y a pas de bouton « J'aime »
> (ce serait du flux OAuth2). Les pochettes réelles (iTunes, Jamendo) existent
> dans les données mais ne sont **pas encore branchées** à `MediaCard`.

## Brancher un vrai backend

Renseignez `VITE_API_BASE_URL` (voir `.env.example`) : l'app bascule
automatiquement sur `HttpMusicApi`. Le contrat attendu est :

| Méthode                | Endpoint REST                       | Retour                  |
| ---------------------- | ----------------------------------- | ----------------------- |
| `getHome()`            | `GET /home`                         | `HomeFeed`              |
| `search(q)`            | `GET /search?q=`                    | `SearchResults`         |
| `getPlaylist(id)`      | `GET /playlists/:id`                | `Playlist`              |
| `getLibrary()`         | `GET /library`                      | `Library`               |
| `getStreamUrl(track)`  | `GET /tracks/:id/stream`            | `{ url }`               |

`VITE_WS_URL` active en plus un abonnement WebSocket (`api.subscribe`) pour
recevoir des événements serveur (`now-playing`, `queue-update`, `lyrics`).

> **CORS obligatoire** : le moteur Web Audio a besoin de convertir le média en
> nœud audio. Un flux servi sans en-tête `Access-Control-Allow-Origin` est
> « tainted » et produit du silence. Passez par un backend qui relaie les
> streams (ou activez des CORS sur le CDN).

## Limites connues

- Pas de routeur : la navigation utilise un historique local (`App.tsx`).
  Pour des URLs partageables, brancher `react-router-dom` sur les trois vues.
- Les pochettes sont des dégradés génératifs (pas d'images) pour rester
  hors-ligne ; les vraies couvertures arrivent via `coverUrl`.
- Pas de paroles synchronisées : le type `ServerEvent` prévoit l'événement
  `lyrics`, mais aucun panneau n'est encore branché.
