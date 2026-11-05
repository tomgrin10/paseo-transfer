# Navigation verification

Verified the actual plugin in two isolated Paseo 0.15.0 daemons ("Laptop" and "Build server") connected to one web app, with synthetic workspaces and provider data, at 1440×900 and 390×844, light and dark.

- The Transfer header button opens the popup for its workspace; on phones it is in the workspace actions menu and opens as a sheet.
- ⌘K **Transfer a workspace** opens the Transfer screen (`addScreen`); inside a workspace, **Transfer this workspace** opens it with that workspace selected. The screen header reads Transfer.
- The optional sidebar row (`addSidebarHeaderItem`) opens the same screen and counts running transfers.
- Settings → Plugins → Transfer → Display holds both switches; ⌘K **Transfer: settings** opens it. Hiding the header button or the sidebar row does not stop either feature.
- Existing saved preferences keep their values. Button lifecycle regressions cover registrations discovered while hidden, retaining the latest descriptor, duplicate prevention, restoration and teardown.

Screenshots: [desktop](screenshots/display-settings-desktop.png), [compact](screenshots/display-settings-mobile.png). Screenshots contain synthetic data. No main daemon restart or real-agent messages were used.
