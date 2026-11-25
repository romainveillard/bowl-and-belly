# Contributing to Bowl & Belly

Thanks for helping out. Bowl & Belly is a small, self-hosted app, so the aim is to keep it simple to run and simple to work on.

## Before you start

- **Bug fixes and small improvements:** open a PR directly.
- **New features or behaviour changes:** open an issue first so we can agree on the approach. Scope, the data model and UX decisions live in [`docs/design.md`](docs/design.md); if your change alters one of those decisions, update the doc in the same PR.

## Getting set up

You need Node 24 (see `.nvmrc`).

- Install: `npm install`
- Run locally: `npm run dev`, then open http://localhost:5173. The API runs on port 3000 and stores its SQLite file in `data/`, or in the folder `DATA_DIR` names.
- Try it with data: `npm run demo` writes three pets and three months of history into `data-demo/` (replacing what was there), then starts the same dev servers on it.
- Test: `npm test`
- Lint and typecheck: `npm run lint`, `npm run format:check` and `npm run typecheck`. `npm run format` fixes formatting.
- Production build: `npm run build`, then `npm start`
- Container image: `docker build -t bowl-and-belly .`, or with Podman `podman build --format docker -t bowl-and-belly .`. Podman's default OCI format drops the image's `HEALTHCHECK`, so the container would never report its health.
- UI review: `npm run dev` shows the [Agentation](https://github.com/benjitaylor/agentation) toolbar. Click elements to annotate them, then Copy to get notes with the React component names for each, ready to paste to a coding agent. It is a dev dependency under the PolyForm Shield licence, not MIT: it only loads in development, and production builds and the container image never include it.

## Making changes

- **One PR per feature.** Keep unrelated changes out of it. We may ask to split a PR when it really needs it, but that's the exception.
- **Commits:** small and logical, each one building on its own. Database migrations go in their own commit, generated with Drizzle Kit and never edited by hand.
- **Language:** British English in code comments, docs, commit messages and UI text (colour, behaviour, organisation). Code identifiers and third-party names keep their original spelling.
- **Translations:** every user-facing string goes through i18next. Add the English (`en-GB`) string; add the French one too if you can, otherwise say so in the PR and we'll fill it in.
- **Comments:** explain why, not what. If the code reads clearly, it needs no comment.

## Tests

Test code that has real logic in it: calorie targets, daily totals, stock adjustments, day boundaries, branching rules. Don't add tests for simple things like plain CRUD routes, field mapping or static markup. A good test pins something the type checker can't catch.

## Pull requests

Fill in the PR template. Keep the description short and written for a human reviewer. Screenshots help for any UI change, ideally on a phone-width screen too.

## Licence

By contributing, you agree that your contributions are licensed under the project's [MIT licence](LICENSE).
