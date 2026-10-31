# Mixify Mobile (React Native / Expo)

Portage mobile de l'interface web Mixify : fond sombre, or congolais
`#F3C24B`, cartes arrondies Inter. Même ordre d'onglets que la barre mobile
web : Rechercher, Classement, Accueil (centre), Bibliothèque, Artiste
(comptes artiste/développeur/admin).

## Démarrer

```bash
cd mobile-rn
npm install --legacy-peer-deps   # conflit react / react-dom du monorepo parent
npx expo start                   # Expo Go ou development build
```

Pour la lecture en arrière-plan et les contrôles sur l'écran verrouillé
(`expo-audio`), il faut un development build :

```bash
npx expo run:android
# ou
npx eas-cli@latest build --profile development --platform android
```

## API

Par défaut : `https://mixifybackend.vercel.app`.
Surcharge possible sans toucher au code :

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000 npx expo start
```

Sur un téléphone physique, `localhost` pointe vers le téléphone : utilise
l'IP LAN de la machine qui fait tourner le backend. Android bloque le HTTP
en clair hors Expo Go ; pour un build local en HTTP, ajoute
`android.usesCleartextTraffic: true` dans `app.json` (jamais en production).

## Vérifications

```bash
npx tsc --noEmit
npx expo lint
npx expo export --platform android   # build de contrôle
```

## Structure

- `src/app/` : routes Expo Router — onglets protégés par session, profil,
  fiche artiste, playlist, lecteur plein écran.
- `src/components/<Nom>/<Nom>.tsx` : UI réutilisable (Cover générative,
  TrackList, Header, MobileNav, lecteur, onboarding, auth).
- `src/views/<Écran>/` : écrans — Accueil, Recherche, Classement,
  Bibliothèque, ArtistStudio (4 onglets), Profile (7 onglets), etc.
- `src/store/` : contextes auth, favoris, abonnements, lecteur, recherche.
- `src/api/musicApi.ts` : client du backend, mapping snake_case → modèles.
- `src/theme/theme.ts` : couleurs, rayons, polices (miroir du web).
- `src/lib/` : formatage, confirmations natives, agrégats de statistiques.

## Parcours d'entrée

Sans session : écran de bienvenue, question « Es-tu artiste ? », puis
authentification dédiée à l'espace choisi (connexion ou inscription). Le
retour matériel Android remonte les étapes ; le choix du rôle n'est jamais
mélangé au formulaire.

L'inscription est elle-même découpée : 2 étapes pour un auditeur (compte,
informations) et 3 pour un artiste (compte, informations, profil public).
Après l'inscription par email, l'utilisateur doit confirmer son adresse depuis
le lien reçu avant de se connecter. L'écran d'authentification permet de
renvoyer le lien ; les comptes existants restent accessibles.

## Périmètre

Livré : accueil, recherche, classement, bibliothèque (favoris + playlists),
lecteur plein écran, session email/mot de passe, profil complet (7 onglets),
espace artiste (vue d'ensemble, édition des morceaux, profil, parrainage),
publication d'un morceau (sélecteur de fichier, envoi vers R2 avec progression).

Différé :

- pochette et images de profil/bannière : champs URL en attendant
  `expo-image-picker` ;
- rendu sonore AutoMix / fondus enchaînés : réglage conservé, pas encore
  appliqué à la lecture ;
- connexion Google native, mode hors-ligne, couleurs d'accent dynamiques.

Le parrainage mobile utilise le même code que le web (slug d'artiste) et le
lien `https://mixify.imasomo.com/?ref=<slug>` ; le code peut aussi être saisi
à l'inscription ou lu depuis un lien `mixify://`. La certification automatique
à 3 filleuls dépend de la table Forge `referrals`
(voir `../referrals_migration.sql`).

La politique de confidentialité et les parcours de suppression du compte sont
accessibles depuis l'écran de connexion/inscription et **Profil > Paramètres**.
Les pages publiques sont servies par l'API configurée avec
`EXPO_PUBLIC_API_URL` (par défaut `https://mixifybackend.vercel.app`).
