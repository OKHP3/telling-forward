# Provenance Convention

Every accepted story submission must remain recoverable from the durable
creative record and its review evidence. The application may index this data,
but the index must be rebuildable.

An acceptance record binds:

- the storyworld and source path;
- contributor and co-creator attribution;
- reviewing steward;
- decision timestamp;
- pull request number when one exists;
- the resulting canon commit SHA; and
- the exact accepted decision `accepted-into-canon`.

The acceptance commit carries the marker:

`telling-forward:accepted-contribution:v1`

It also carries single-line trailers for `Submission-Id`,
`Platform-Attribution`, `Title-B64`, and `Display-Name-B64`. Trailer values
must not contain raw multiline user text or secrets. The application provenance
record is the signed, account-aware decision record; commit trailers are the
GitHub-recoverable rebuild aid.

Structural checks may verify that a marker and required trailer keys are
present. They must not decide whether a contribution deserves canon or whether
rights were granted.