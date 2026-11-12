# Working on Transfer

Use the official split Paseo plugin SDK: `index.server.ts` registers handlers, `index.client.tsx` registers the native surface, `shared/` contains runtime-neutral contracts. Never introduce a local SDK declaration shim.

Connected hosts reuse the authenticated per-installation RPC federation adapted from Transcript Search. `client/federation.ts` keys capabilities by server ID and reacquires them for each request; never fall back by name or to the current host. `server/connected.ts` validates the requested server ID, runs slow operations as polled tasks, and spools bounded checksummed chunks in private temporary directories. Keep the app open during connected transfers; closing a popup is safe. Home directories, system roots, and home ancestors must be rejected before recursive scanning.

`server/worker.ts` runs both locally and over SSH. `scripts/build.mjs` generates the committed `shared/worker-source.ts`. Run `npm run prepare` after any worker change and include the generated file in the commit. This keeps Git installs independent of npm preparation.

Use Paseo CLI/API operations to create workspaces, import agents, and archive sources. Agent registry files may be read for persistence handles, but must never be written. Provider credentials and MCP configuration do not transfer. Child CLI calls scrub originating agent scope, daemon password, and Codex thread IDs.

A transfer must use a new destination. Preserve staged/unstaged changes and verify files, Git HEAD/index, native transcripts, imports, and registration. Archive a source only after verification and a fresh source checksum. Never remove a source yourself. Preserve a registered partial target after failure.

Run `npm run verify`. For provider or import changes, run `npm run test:live` with authenticated provider CLIs; use isolated homes, clean them afterward, and never print credentials. The SSH fixture uses a temporary loopback server and pins its host key. `scripts/ui-preview.tsx` renders the actual component with fixture RPC responses.

Use host theme tokens and cross-platform React Native controls. Test desktop and compact layouts. Reload only this plugin (`paseo plugin reload transfer`); restarting the main daemon kills active agents.

## Automated npm releases

- The public install command is `paseo plugin install paseo-transfer`. Keep it in the README and keep Other plugins as its final section.
- Releases need Tom's manual permission. Features and fixes ship as betas (`X.Y.Z-beta.N`, npm `beta` tag) by default. A stable version, npm `latest`, or a hotfix needs Tom's explicit OK for that exact version before it is tagged; never infer it from a plan. For this directory-installed plugin, installing merged main on Tom's VM counts as a beta.
- Prereleases publish with `--tag beta`, and the workflow verifies after publishing that a prerelease is never `latest` (see Release notes and channels).
- Update package.json and package-lock.json together for a release. Tag the exact clean main commit as vX.Y.Z and push the tag.
- .github/workflows/publish-npm.yml validates the tag, runs verification and package inspection, and publishes with npm Trusted Publishing through GitHub OIDC. Do not publish manually.
- Keep npm publisher permissions scoped to tomgrin10/paseo-transfer and publish-npm.yml. No long-lived npm token is needed in GitHub.
- Wait for the workflow and registry integrity check before updating an installed copy; the workflow creates the GitHub release. Test the bare package-name installer in an isolated Paseo home; never restart the user's daemon.

## Release notes and channels

Publishing runs paseo-plugin-kit's reusable workflow (`.github/workflows/publish-npm.yml` calls `tomgrin10/paseo-plugin-kit/.github/workflows/publish-npm.yml@vX`). It uses the `paseo-kit` bin from the `paseo-plugin-kit` devDependency. Bump the workflow tag and the devDependency together.

- **Channels.** A version with a prerelease part (`X.Y.Z-beta.N`, `-rc.N`) publishes to npm's `beta` dist-tag and is a GitHub prerelease. A stable version publishes to `latest`. After publishing, on the retry path too, `paseo-kit check-dist-tag` fails the run if the dist-tag is wrong or a prerelease is `latest`.
- **Betas** get generated notes: the titles of the PRs merged since the previous tag, grouped `feat` → New, `fix` → Fixed, anything else user-visible → Improved. `docs`, `chore`, `ci`, `test`, `refactor` and `build` PRs, bots and merge lines are dropped. So write PR titles as a sentence a user can read.
- **Stable and rc** need curated notes: add `release-notes/<version>.md` (an rc uses its final version's file) before tagging. Start with one summary sentence, then `### New`, `### Improved` and `### Fixed` with plain-words bullets, omitting empty groups. `paseo-kit release-notes --check <tag>` fails such a tag before anything is published.
- The workflow creates the GitHub release, or updates an existing one, with that body. Preview it with `npx paseo-kit release-notes <tag>`.
