# linked-me Admin

![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Angular Material](https://img.shields.io/badge/Angular_Material-20-757575?logo=angular&logoColor=white)
![Railway](https://img.shields.io/badge/deploy-Railway-0B0D0E?logo=railway&logoColor=white)

Interface d'administration pour la plateforme linked-me.

## Table of contents

- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Features](#features)
- [Internationalisation](#internationalisation)
- [Deployment](#deployment)
- [Git flow](#git-flow)

## Getting started

### Prerequisite

- Node.js 22+

### Installation

```bash
npm install
```

### Configuration

The app loads its runtime configuration from `public/config.json` at startup (via `APP_INITIALIZER`).

| Key      | Description                   |
| -------- | ----------------------------- |
| `apiUrl` | Base URL of the linked-me API |

In development, `public/config.json` is committed with a local fallback value and ignored from git tracking:

```bash
git update-index --assume-unchanged public/config.json
```

In production, `config.json` is generated at container startup from environment variables (see [Deployment](#deployment)).

### Run

```bash
# Development server
npm start

# Production build
npm run build
```

## Scripts

| Script          | Description                       |
| --------------- | --------------------------------- |
| `npm start`     | Start dev server (`ng serve`)     |
| `npm run build` | Production build                  |
| `npm run watch` | Build in watch mode (development) |
| `npm test`      | Run unit tests (Karma + Jasmine)  |
| `npm run lint`  | Run ESLint                        |

## Architecture

```
src/
├── app/
│   ├── core/               # Global services and guards
│   │   └── services/       #   AppConfig, Theme
│   ├── features/           # Lazy-loaded feature modules
│   │   ├── auth/           #   Authentication pages
│   │   ├── admin/          #   Admin section
│   │   │   ├── audit/      #     Audit logs
│   │   │   ├── roles/      #     Roles management
│   │   │   ├── tasks/      #     Scheduled tasks
│   │   │   └── users/      #     Users management
│   │   ├── dashboard/      #   Dashboard
│   │   ├── errors/         #   Error pages (401, 403, 404, WIP)
│   │   └── profile/        #   User profile
│   ├── layouts/            # Shell layouts (public / private)
│   └── shared/             # Shared components, pipes, utils
├── styles/
│   └── themes/             # Angular Material 3 theme (SCSS)
└── public/
    ├── config.json         # Runtime config (dev fallback)
    └── i18n/               # Translation files (fr, en)
```

## Features

### Authentication

Full auth flow backed by the linked-me API:

| Page            | Route                   |
| --------------- | ----------------------- |
| Login           | `/auth/login`           |
| Register        | `/auth/register`        |
| Verify email    | `/auth/verify-email`    |
| Email confirmed | `/auth/email-confirmed` |
| Forgot password | `/auth/forgot-password` |
| Reset password  | `/auth/reset-password`  |

### Error pages

| Page             | Route  |
| ---------------- | ------ |
| 401 Unauthorized | `/401` |
| 403 Forbidden    | `/403` |
| 404 Not Found    | `/**`  |
| Work in progress | `/wip` |

### Dashboard

| Page      | Route        |
| --------- | ------------ |
| Dashboard | `/dashboard` |

### Mon compte

Protected routes — requires `realm:profile` permission.

| Page            | Route          |
| --------------- | -------------- |
| Profile         | `/me`          |
| Change password | `/me/password` |
| Sessions        | `/me/sessions` |

### Admin

Protected routes under `/admin` — requires admin-level permissions.

| Section    | Route          |
| ---------- | -------------- |
| Users      | `/admin/users` |
| Roles      | `/admin/roles` |
| Audit logs | `/admin/audit` |
| Tasks      | `/admin/tasks` |

## Internationalisation

The app uses [Transloco](https://jsverse.github.io/transloco/) for i18n. Translation files are located in `public/i18n/`:

| File      | Language |
| --------- | -------- |
| `fr.json` | French   |
| `en.json` | English  |

API error codes returned by the server (e.g. `auth.login.invalid_credentials`) are mapped directly to translation keys under the `api.*` namespace.

## Deployment

Deployed on **Railway** via push to `master`.

The app is served as a static bundle behind **Nginx** inside a Docker container (multi-stage build).

At container startup, `docker-entrypoint.sh`:

1. Injects `$PORT` into the Nginx config
2. Generates `public/config.json` from environment variables

| Variable  | Description                                 |
| --------- | ------------------------------------------- |
| `API_URL` | Base URL of the linked-me API               |
| `PORT`    | Port Nginx listens on (injected by Railway) |

## Git flow

- `master` — production (protected, merge via PR only)
- `develop` — integration
- `feature/*` — feature branches from develop

Branch protection rules:

- `master`: PR required, CI must pass, branch must be up to date before merging
- `develop`: PR required, CI must pass

Merge strategy: feature → develop via **squash merge**, develop → master via **merge commit**.

CI pipeline:

- **All branches**: unit tests
- **`develop`**: lint
- **`master`**: production build

## Release workflow

Steps to release a new version to production:

**1. Bump the version on `develop`**

```bash
git checkout develop
git pull origin develop
npm version patch --no-git-tag-version   # or minor / major
git add package.json
git commit -m "chore: bump version to x.y.z"
git push origin develop
```

Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes.

**2. Open a PR from `develop` → `master` and merge (merge commit)**

**3. Tag `master`**

```bash
git checkout master
git pull origin master
git tag vx.y.z
git push origin vx.y.z
```

**4. Resync `develop` with `master`**

```bash
git checkout develop
git pull origin master --no-rebase
git push origin develop
```

**5. Create a GitHub Release** from the tag `vx.y.z` via the GitHub UI.

## Author

**Christophe Gasquez** — [GitHub](https://github.com/ChristopheGasquez)
