---
name: start-stack
description: >-
    Démarre l'intégralité de la stack locale du projet (MariaDB + backend NestJS +
    frontend React/Vite via `docker compose up -d --build`), vérifie sa santé, et
    répare automatiquement tout composant défaillant. Le démarrage et le contrôle
    de santé sont délégués à des sous-agents Haiku ; le diagnostic et la réparation
    à un sous-agent Opus. À utiliser quand l'utilisateur demande de « démarrer la
    stack », « lancer le projet », « start the stack », ou de remettre la stack en
    état de marche.
user-invocable: true
---

# Démarrage + auto-réparation de la stack

Tu es l'**orchestrateur**. Tu ne fais pas le travail toi-même : tu délègues chaque
phase à un sous-agent via l'outil `task`, en imposant le **modèle** indiqué. Tu
boucles jusqu'à ce que la stack soit entièrement démarrée et saine, puis tu
t'arrêtes.

## Contexte de la stack

- Monorepo orchestré par le `docker-compose.yml` **à la racine du projet**
  (il n'y a pas de Makefile).
- `docker compose up -d --build` construit et lance trois services :
  `mariadb` (MariaDB 10.11), `backend` (API NestJS) et `frontend`
  (build React/Vite servi par nginx).
- Le **backend applique automatiquement les migrations et un seed idempotent au
  démarrage** (environnement `preprod`, 7 composants, utilisateur admin
  `admin` / `admin`). Aucune commande de migration manuelle n'est nécessaire.
- Prérequis : Docker Desktop en marche, et la CLI `docker` (avec `docker compose`).
- Un fichier `.env` à la racine est requis ; le créer depuis `.env.example` s'il
  manque (il fournit identifiants DB, `JWT_SECRET`, `VITE_API_URL`, etc.).
- Environnement Windows → utiliser PowerShell pour toutes les commandes.

### Services attendus et points de contrôle

| Service     | Conteneur  | Contrôle de santé (attendu)                          |
| ----------- | ---------- | ---------------------------------------------------- |
| Frontend    | `frontend` | `http://localhost` → HTTP 200                         |
| Backend API | `backend`  | `http://localhost:3000/api/health` → HTTP 200        |
| MariaDB     | `mariadb`  | conteneur `healthy`, port 3306 accessible            |

Notes utiles pour le diagnostic :
- L'API est préfixée par `/api` (ex. `/api/environments`, `/api/status?env=preprod`).
- Mises à jour temps réel via WebSocket sur `/ws/status?env=preprod`.
- `backend` dépend de `mariadb` étant `healthy` ; `frontend` dépend de `backend`.
  Un échec MariaDB fait donc typiquement échouer toute la chaîne.

## Procédure (à suivre dans l'ordre)

### Phase 1 — Démarrage (modèle Haiku)

Délègue à un sous-agent avec l'outil `task` :
- `agent_type: "task"`
- `model: "claude-haiku-4.5"`

Instructions à donner au sous-agent (contexte complet, il est sans état) :
1. Vérifier que Docker répond (`docker info`). S'il ne répond pas, signale-le
   clairement et arrête-toi (l'utilisateur doit lancer Docker Desktop).
2. Si `.env` est absent à la racine du projet, le créer :
   `Copy-Item .env.example .env`.
3. Lancer le démarrage : `docker compose up -d --build` (prévoir un délai long,
   le premier run télécharge des images et build backend + frontend —
   initial_wait ≥ 240 s).
4. Rapporter : le code de sortie de la commande, et la liste des conteneurs
   créés/démarrés telle qu'affichée en fin de build.

### Phase 2 — Contrôle de santé (modèle Haiku)

Délègue à un sous-agent avec l'outil `task` :
- `agent_type: "task"`
- `model: "claude-haiku-4.5"`

Instructions à donner au sous-agent :
1. Lister l'état des conteneurs :
   `docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"`.
2. Tester les endpoints HTTP (doivent renvoyer 200) :
   `http://localhost` (frontend) et `http://localhost:3000/api/health` (backend).
   Sous PowerShell, utiliser par ex.
   `(Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/health).StatusCode`.
3. Vérifier que `mariadb` est `healthy` (colonne Status de `docker compose ps`).
4. Rapporter une **liste précise et structurée** : pour chaque service du tableau
   ci-dessus → `OK` ou `KO` avec le symptôme exact (conteneur absent, `Restarting`,
   `Exited`, `unhealthy`, code HTTP ≠ 200, timeout, connexion refusée, etc.).

Tu (orchestrateur) interprètes le rapport :
- **Tous les services OK** → va à « Fin ».
- **Au moins un service KO** → va à la Phase 3.

### Phase 3 — Diagnostic et réparation (modèle Opus)

Délègue à un sous-agent avec l'outil `task` :
- `agent_type: "general-purpose"`
- `model: "claude-opus-4.8"`

Transmets-lui la **liste exacte des composants KO** issue de la Phase 2, le
tableau des services attendus, et ces instructions :
1. **Chercher** la cause racine : inspecter les logs du/des composant(s) en échec
   (`docker compose logs --tail 200 backend`, `... frontend`, `... mariadb`,
   `docker compose ps -a`), vérifier les ports occupés (80, 3000, 3306), l'état de
   `.env`, les images et les volumes (`docker volume ls`).
2. **Analyser** : identifier la cause précise (port déjà utilisé, variable
   d'environnement manquante/incorrecte dans `.env`, build backend/frontend en
   échec, MariaDB pas encore `healthy` au moment où le backend tente de se
   connecter, migration/seed du backend en échec, conteneur qui crash au démarrage,
   etc.).
3. **Réparer** de façon ciblée et la moins destructive possible : corriger la
   config `.env`, libérer un port, recréer un conteneur
   (`docker compose up -d --build --force-recreate <service>`), attendre que
   `mariadb` soit `healthy` puis relancer `backend`. En **dernier recours** :
   `docker compose down -v` suivi de `docker compose up -d --build` (⚠️ `-v`
   détruit le volume `mariadb_data` et donc les données ; les migrations + seed
   seront réappliqués au prochain démarrage du backend) — uniquement si nécessaire
   et après l'avoir justifié.
4. Re-vérifier que les composants ciblés sont revenus à l'état sain et rapporter
   ce qui a été corrigé.

Ne modifie pas le code applicatif ni les migrations/seed livrés pour « réparer » la
stack, sauf si le diagnostic prouve qu'un fichier est réellement en cause ; dans
ce cas, fais la correction minimale et explique-la.

### Boucle

Après la Phase 3, **relance la Phase 2** (contrôle de santé Haiku). Répète le
cycle Phase 2 → Phase 3 jusqu'à ce que tous les services soient OK. Limite à
**5 itérations** : si la stack n'est toujours pas saine après 5 cycles, arrête-toi
et présente à l'utilisateur un résumé des échecs persistants et des hypothèses
restantes.

## Fin

Le skill se termine **uniquement** quand le contrôle de santé confirme que tous
les services attendus sont OK. Fournis alors un récapitulatif final :
- la liste des services avec leur URL (`http://localhost`,
  `http://localhost:3000/api`, MariaDB sur `localhost:3306`),
- l'identifiant admin par défaut (`admin` / `admin`, environnement `preprod`),
- les réparations éventuellement appliquées,
- les commandes utiles : `docker compose logs -f`, `docker compose down`,
  `docker compose down -v` (réinitialisation complète, détruit les données).

## Règles

- Toujours respecter le modèle imposé par phase : **Haiku** pour démarrage et
  santé, **Opus** pour diagnostic/réparation.
- Donne à chaque sous-agent un contexte complet (il est sans état).
- Ne déclare jamais la stack « prête » sans une vérification de santé qui passe.
