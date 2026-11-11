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
- Prereleases publish with `--tag beta` (`scripts/check-dist-tag.mjs`), and the workflow verifies after publishing, on the retry path too, that the expected dist-tag points at the version and a prerelease is never `latest`. `scripts/release-channel.test.mjs` guards it. Mark the GitHub release a prerelease (the workflow's release job does).
- Update package.json and package-lock.json together for a release. Tag the exact clean main commit as vX.Y.Z and push the tag.
- .github/workflows/publish-npm.yml validates the tag, runs verification and package inspection, and publishes with npm Trusted Publishing through GitHub OIDC. Do not publish manually.
- Keep npm publisher permissions scoped to tomgrin10/paseo-transfer and publish-npm.yml. No long-lived npm token is needed in GitHub.
- Wait for the workflow and registry integrity check before creating a GitHub release or updating an installed copy. Test the bare package-name installer in an isolated Paseo home; never restart the user's daemon.

## Release notes

Every GitHub release, betas included, shows real notes in one shape across Tom's plugins. `scripts/release-notes.mjs`
(identical in each repo; keep the copies in sync) builds the body and the publish workflow creates the release with it:

```
<summary or "## What's new in X.Y.Z-beta.N">

### New        what a user can now do
### Improved   what got better
### Fixed      what stopped going wrong

## Install     the command for that channel, the Paseo minimum
```

- **Betas** are generated: the titles of the PRs merged since the previous tag, grouped by their prefix (`feat` is New,
  `fix` is Fixed, anything else user-visible is Improved). `docs`, `chore`, `ci`, `test`, `refactor` and `build`
  PRs, bots, merge lines and raw commit text never appear. So write PR titles as a sentence a user can read:
  `fix: remember which Follow-up plugin id answered`. No PR numbers, no em dashes.
- **Stable and rc** are curated: add `release-notes/<version>.md` (an rc uses its final version's file) before tagging. One
  summary sentence, then `### New`, `### Improved`, `### Fixed` with plain-words bullets for the person using the plugin,
  grouped by what they get and merged across every beta since the last stable. Omit empty groups. The publish workflow
  runs `node scripts/release-notes.mjs --check <tag>` first and fails a stable or rc tag that has no file, before anything
  is published.
- Releases that already exist: edit the body with `gh release edit <tag> --notes-file <file>`. Never touch the tag, assets
  or the prerelease/latest flags. In-app What's new popups stay major-only; this is GitHub only.
- `node --test scripts/release-notes.test.mjs` covers the generator and runs in `verify`.
