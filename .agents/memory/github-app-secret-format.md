---
name: GitHub App secret format
description: PEM keys entered through the workspace secret form may lose line breaks.
---

The GitHub App credential boundary should normalize PEM keys that arrive with
literal newline escapes or with the PEM body flattened between its BEGIN and
END markers.

**Why:** The secure secret-entry flow can preserve the key characters while
removing line breaks, which causes OpenSSL to reject an otherwise valid GitHub
App key before any GitHub request is made.

**How to apply:** Keep the key in workspace secrets only, normalize formatting
at the application boundary, and never log the key or write it to a project
file.