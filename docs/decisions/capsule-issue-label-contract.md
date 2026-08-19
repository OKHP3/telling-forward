# Capsule Issue Label Contract

## Status

**Confirmed.** This contract implements the 2026-08-19 decision that GitHub
Issues are the canonical capsule store.

## Canonical labels

Every capsule Issue must carry exactly one required label in the form
`capsule:<type>`. The current, already-supported type values are:

- `capsule:character`
- `capsule:arc`
- `capsule:event`
- `capsule:arc-beat`
- `capsule:planned-event`
- `capsule:motif`

The type label is the capsule identity boundary. Concept Board and MCP reads
fetch Issues and retain only Issues with a `capsule:` prefix. A bare
`capsule` label is not a capsule type label and does not qualify.

The Author App currently creates `character`, `arc`, and `event` capsules.
The MCP and manuscript-ingestion paths currently create `character`,
`arc-beat`, `planned-event`, and `motif` capsules. This contract preserves
those existing producer vocabularies without adding new capsule types.

Optional metadata labels are:

- `role:<value>` for a character's story role
- `rung:<0-10>` for a capsule's maturity
- `state:draft` while a capsule remains a draft

The Issue body can hold the readable capsule content and provenance notes. No
`capsules` database table is created.

## Creation paths

The Author App, the MCP `create_draft_capsule` tool, and the manuscript
ingestion script all create the required `capsule:<type>` label. The MCP and
ingestion paths also apply `state:draft`.

## Legacy compatibility

Some earlier prototype Issues use `capsule` plus `kind:<type>`. That is a
legacy scheme, not a second accepted contract. It is intentionally excluded
from Concept Board and MCP capsule reads so untyped Issues cannot be mistaken
for canonical capsule data.

Do not bulk-edit or otherwise mutate existing repositories automatically. If
an owner wants to recover legacy capsules, first inventory the candidate
Issues, confirm each Issue's intended type with the steward, then add the
matching `capsule:<type>` label through an owner-approved migration. Preserve
the legacy labels until the owner explicitly approves their removal.
