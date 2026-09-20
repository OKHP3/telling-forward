# Dependency convergence — September 20, 2026

PRs 17–22 are combined with the current main branch for fresh ingestion, browser,
and workspace validation. The ingestion changes retain the pinned model revision,
size, and digest; PR checks use synthetic fixtures and metadata without fetching
model weights or ingesting manuscripts.

## Mobile compatibility decision

PR 24 is declined as a mixed SDK upgrade. Its Expo 57 declaration is combined
with Expo 58 CLI/modules and React Native 0.87.1. Expo 57.0.23's published
`bundledNativeModules.json` instead specifies React 19.2.3, React Native 0.86.3,
and SDK 57 modules. The proposed dependency set is not an accepted migration.

The app remains on Expo SDK 54, React 19.1.0, and React Native 0.81.5. Its
existing file-system and speech declarations had drifted to SDK 57; they are
restored to SDK 54's declared SDK 54 file-system and ~14.0.8 speech lines. Glass effect moves to
~0.1.8, also declared by Expo 54.0.27's published compatibility table.
Expo's compatibility check further advances the current SDK patch to 54.0.37,
constants to ~18.0.14, and file-system to ~19.0.24.

A future SDK migration must select one SDK's complete native dependency matrix,
migrate the existing expo-av recorder to supported media APIs, and validate
recording, playback, authentication, file access, offline cache, and navigation
on physical iOS and Android devices. Workspace builds and browser tests do not
establish that native device acceptance. No SDK-major migration is approved by
this cleanup.

Primary compatibility evidence: the npm-published `expo@54.0.27` and
`expo@57.0.23` packages, specifically `bundledNativeModules.json` and Expo's
own CLI dependency. The declined branch tip and README stash are retained in
private recovery refs and a verified repository bundle.
