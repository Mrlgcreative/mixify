# Mixify — Front

Front React + TypeScript du catalogue Mixify. Application séparée du backend
Next.js : elle consomme l'API en HTTP (`/api/...`) avec un token JWT.

Sa valeur propre : le **lecteur Web Audio** (double deck, fondu enchaîné,
beat-sync) et le mix trié par tempo à partir des BPM fournis par le catalogue.

## Stack

| Besoin   | Choix                                         |
| -------- | --------------------------------------------- |
| Framework | React 18 + TypeScript strict                 |
| Build    | Vite 6                                        |
| Styles   | Tailwind CSS 3 + variables CSS (thème à chaud) |
| État     | Zustand (lecteur, file d'attente, session)    |
| Audio    | Web Audio API (double deck + gains)           |

## Démarrage

```bash
npm install
cp .env.example .env.local     # VITE_API_BASE_URL=http://localhost:3001
npm run dev                    # http://localhost:5173
npm test                       # moteur de fondu (node:test)
npm run build                  # tsc -b && vite build
```

Le backend doit tourner sur `http://localhost:3001` (`npm run dev` dans le dépôt
Mixify). Le port **5173 est figé** (`strictPort`) : le CORS du backend et la
règle CORS du bucket R2 dépendent de cette origine exacte.

`VITE_API_BASE_URL` est lue **au build** : sur Vercel, renseignez-la avec le
domaine de l'API avant de déployer.

## Application mobile (Android)

Capacitor 8 empaquette le build Vite dans une WebView Android
(`com.imasomo.mixify`). iOS n'est pas configuré (build macOS/Xcode requis).

Prérequis : JDK 21, Android SDK (platform 36) et `ANDROID_HOME`.

```bash
# L'API doit être en HTTPS : la WebView refuse le HTTP en clair.
VITE_API_BASE_URL=https://api.example.com npm run mobile:sync

# APK de debug
JAVA_HOME=~/.jdks/jdk-21.0.12.1+1 ANDROID_HOME=~/Android/Sdk npm run mobile:apk
# → android/app/build/outputs/apk/debug/app-debug.apk
```

`mobile:sync` reconstruit le front et copie `dist/` dans le projet natif ;
`mobile:apk` fait de même puis lance Gradle. Après un changement de code, il
faut donc resynchroniser avant de reconstruire l'APK.

L'origine de la WebView Android est `https://localhost` (iOS :
`capacitor://localhost`). Elle doit figurer dans `ALLOWED_ORIGINS` côté backend
**et** dans la règle CORS du bucket R2, sinon les appels API et les uploads
échouent. La connexion Google est refusée par Google dans une WebView
(`disallowed_useragent`) : elle reste réservée au navigateur.

## Comptes et session

- Première visite : **onboarding** (3 écrans) puis **connexion** ou **inscription** ;
  l'application (accueil, recherche, bibliothèque) n'est accessible qu'avec un compte.
  Le drapeau `mixify.onboarded` évite de rejouer l'onboarding.
- Les deux appels concurrents de reprise de session (StrictMode) sont dédoublonnés :
  un jeton n'est effacé que si l'API répond **401**.
- Le JWT est conservé dans `localStorage` (`mixify.token`) et envoyé en
  `Authorization: Bearer`. Un XSS pourrait donc le lire ; si le front et l'API
  passent un jour sur un domaine commun, on pourra utiliser un cookie `httpOnly`.
- **Deux portails séparés**, avec une connexion en **2 étapes** (email, puis mot
  de passe) sur les deux :
  - « Auditeur » : inscription en **2 étapes** (compte, puis date de naissance —
    13 ans minimum) ;
  - « Artiste » : inscription en **3 étapes** (compte, identité avec date de
    naissance, puis profil public). Le portail artiste refuse les comptes
    auditeurs côté API (403).
- **Connexion Google** : disponible depuis le portail auditeur (connexion et
  inscription). Le backend porte le OAuth 2.0 (variables `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET` et `FRONT_URL`), puis renvoie le jeton au front dans le
  fragment d'URL (`#token=…`) — consommé puis effacé au démarrage. Un nouveau
  compte Google est créé en `utilisateur`, sans date de naissance (facultative
  côté API) ; l'inscription artiste se fait par email pour la collecter. Callback
  à déclarer dans la console Google :
  `http://localhost:3001/api/auth/google/callback`.

## Fonctionnalités

- **Favoris** : cœur sur chaque titre (listes), visible dans « Titres likés ».
- **Playlists** : création, renommage, suppression, ajout/retrait de titres
  depuis la page dédiée `/playlist/<id>` (URL partageable, boutons précédent/suivant
  du navigateur pris en charge).
- **Espace artiste** (rôles `artiste`, `developper`, `admin`) : un seul écran
  avec quatre onglets.
  - **Vue d'ensemble** : bannière, photo, bio, genres, liens, statistiques
    (morceaux, durée, albums, abonnés) et derniers titres.
  - **Morceaux** : catalogue personnel, filtre, lecture, édition des métadonnées
    (titre, album, genre, BPM, tonalité, année) et suppression du morceau + fichier.
  - **Publier** : choix d'un fichier audio, **écoute locale avant mise en ligne**,
    envoi direct vers R2 via URL présignée, puis **contrôle serveur** (propriété,
    format, taille) avant publication au catalogue. L'interface affiche les étapes
    de téléversement et de contrôle. Le profil artiste est créé automatiquement au
    premier envoi s'il n'existe pas encore.
  - **Profil** : création ou édition du profil public (nom, bio, genres, pays,
    site, photo, bannière, réseaux).

## Routes consommées

| Écran / action        | Requête                                              |
| --------------------- | ---------------------------------------------------- |
| Accueil, recherche    | `GET /api/tracks?search=`, `GET /api/artists?search=` |
| Lecture audio         | `audio_url` R2 renvoyée par l'API                    |
| Connexion             | `POST /api/auth/login` (`role: "artiste"` pour le portail artiste), puis `GET /api/auth/me` |
| Inscription           | `POST /api/auth/register` (`role: "utilisateur"` + `birth_date`, ou `"artiste"` + `birth_date` + `artist`) |
| Bibliothèque          | `GET /api/favorites`, `GET /api/playlists`           |
| Favoris               | `POST /api/favorites`, `DELETE /api/favorites?id=`   |
| Playlists             | `GET/POST/DELETE /api/playlists`, `PATCH /api/playlists/:id` |
| Détail d'une playlist | `GET /api/playlists/:id`                              |
| Espace artiste        | `GET /api/artists/me`, `POST /api/artists`, `PATCH /api/artists/:id` |
| Gestion des morceaux  | `PATCH /api/tracks/:id`, `DELETE /api/tracks/:id`     |
| Publication           | `POST /api/tracks/upload-url`, `PUT` R2, `POST /api/tracks` (avec `audio_key`) |

Le détail complet (codes, upload, quotas) est documenté par le backend sur
`http://localhost:3001/docs`.

### CORS

1. Backend : `ALLOWED_ORIGINS` doit contenir `http://localhost:5173`, le
   domaine du front en production et `https://localhost` pour l'app Android.
2. Bucket R2 : autoriser les mêmes origines en `GET`, `HEAD`, `PUT` — sans cela
   la lecture audio (Web Audio exige CORS) et l'upload présigné échouent.

## Structure

```
src/
├── api/musicApi.ts        # client HTTP, mappages backend -> types du front, token
├── audio/
│   ├── crossfade.ts       # calcul pur : courbes, tempo, alignement
│   ├── crossfade.test.ts  # tests unitaires (node:test)
│   ├── tempo.ts           # estimation de BPM côté client (repli)
│   └── engine.ts          # moteur Web Audio à double deck
├── components/
│   ├── Auth/              # écrans connexion / inscription, compte connecté
│   ├── Onboarding/        # première visite (3 étapes)
│   ├── AutoMix/           # AutoMixToggle, CrossfadeSettings
│   ├── Header/            # header sticky (historique + recherche)
│   ├── Player/            # barre de lecture, seek bar, analyseur FFT
│   ├── Queue/             # file d'attente
│   ├── Sidebar/           # navigation, playlists, compte
│   └── common/            # Cover, Carousel, MediaCard, TrackList
├── hooks/useMusicApi.ts   # chargement / erreur / réponses obsolètes
├── store/
│   ├── authStore.ts       # session (login, register, me, logout)
│   ├── libraryStore.ts    # favoris + révisions (rechargement bibliothèque)
│   └── playerStore.ts     # lecteur + file d'attente
├── types/                 # Track, Album, Artist, Playlist, AuthUser…
├── views/                 # Home, Search, Library, ArtistStudio (+ Publish intégré)
└── App.tsx                # onboarding -> auth -> layout, navigation locale
```

## Auto-Mix

1. Chaque titre est joué dans un `<audio>` → `GainNode` → `AnalyserNode` →
   master ; le suivant est préchargé dans le deck libre.
2. À `durée du fondu` secondes de la fin, les courbes `sin`/`cos` (puissance
   constante) sont programmées sur l'horloge de l'`AudioContext`.
3. Le tempo du titre entrant est aligné sur le sortant (±8 %, pitch préservé) et
   son premier downbeat est calé sur un downbeat sortant.
4. Sans BPM fourni par l'API, le tempo est estimé côté client
   (`src/audio/tempo.ts`) ; si l'estimation n'est pas fiable, le fondu reste
   égal-puissance.

Le fondu (0 à 12 s) est réglable dans les réglages de la file d'attente et
persisté dans `localStorage`.

## Limites actuelles

- Pas de routeur : la navigation utilise un historique local (`App.tsx`).
- Les pochettes sont des dégradés génératifs ; `cover_url` est mappé mais pas
  encore affiché.
- L'upload présigné exige la règle CORS `PUT` du bucket R2 (voir ci-dessus).
- Forge (base du backend) est parfois lent/instable : l'UI affiche l'erreur et
  permet de réessayer (publication, création de playlist).
