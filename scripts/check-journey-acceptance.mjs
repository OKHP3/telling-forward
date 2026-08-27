import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const defaultDocument = path.join(
  root,
  "docs/reviews/2026-08-20-telling-forward-journey-acceptance.md",
);
const documentPath = process.argv[2]
  ? path.resolve(root, process.argv[2])
  : defaultDocument;

const requiredFieldGroups = [
  {
    name: "published URL",
    labels: ["Published URL"],
  },
  {
    name: "published revision",
    labels: ["Published revision"],
  },
  {
    name: "storyworld fixture ID",
    labels: ["Storyworld fixture ID"],
  },
  {
    name: "capsule fixture IDs",
    labels: ["Capsule fixture IDs"],
  },
  {
    name: "path fixture IDs",
    labels: ["Path fixture IDs"],
  },
  {
    name: "contribution/proposal fixture IDs",
    labels: ["Contribution/proposal fixture IDs"],
  },
  {
    name: "participant roles",
    labels: [
      "Steward role/fixture",
      "Contributor role/fixture",
      "Reader role/fixture",
    ],
  },
  {
    name: "run start timestamp",
    labels: ["Run start (UTC)"],
    timestamp: true,
  },
  {
    name: "run end timestamp",
    labels: ["Run end (UTC)"],
    timestamp: true,
  },
  {
    name: "deployment lookup timestamp",
    labels: ["Deployment lookup timestamp (UTC)", "Deployment lookup timestamp"],
    timestamp: true,
  },
];

const placeholderPattern =
  /<[^>]+>|\bTBD\b|\bnone\b|\bnot\s+(?:created|run|retained|available|recruited|executed)\b|\bunknown\b/i;
const timestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function normalize(value) {
  return value.replaceAll("`", "").replace(/\s+/g, " ").trim();
}

function isMissing(value) {
  return !value || placeholderPattern.test(normalize(value));
}

function isTimestamp(value) {
  return timestampPattern.test(normalize(value));
}

function isTableSeparator(line) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
}

function parseTable(section) {
  const lines = section.split(/\r?\n/);
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].includes("|") || !isTableSeparator(lines[index + 1])) {
      continue;
    }

    const headers = lines[index]
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => normalize(cell).toLowerCase().replace(/[^a-z0-9]/g, ""));
    const rows = [];
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const line = lines[rowIndex].trim();
      if (!line.startsWith("|") || !line.endsWith("|")) break;
      const cells = line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => normalize(cell));
      if (cells.length === headers.length) {
        rows.push(Object.fromEntries(headers.map((header, cellIndex) => [
          header,
          cells[cellIndex],
        ])));
      }
    }
    return { headers, rows };
  }
  return null;
}

function sectionBetween(runText, headingPattern) {
  const heading = runText.search(headingPattern);
  if (heading === -1) return "";
  const contentStart = runText.indexOf("\n", heading);
  if (contentStart === -1) return "";
  const rest = runText.slice(contentStart + 1);
  const nextHeading = rest.search(/^###\s+/m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function parseFields(runText) {
  const lines = runText.split(/\r?\n/);
  const fields = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(
      /^\s*(?:-\s+)?\*\*(.+?):\*\*\s*(.*)$/,
    );
    if (!match) continue;

    const label = normalize(match[1]);
    const values = [match[2]];
    for (
      let continuation = index + 1;
      continuation < lines.length;
      continuation += 1
    ) {
      const line = lines[continuation];
      if (
        /^\s*(?:-\s+)?\*\*.+?:\*\*/.test(line) ||
        /^#{2,3}\s+/.test(line) ||
        /^\s*\|/.test(line)
      ) {
        break;
      }
      if (line.trim()) values.push(line.trim());
      index = continuation;
    }
    fields.set(label, normalize(values.join(" ")));
  }
  return fields;
}

function firstField(fields, labels) {
  for (const label of labels) {
    const value = fields.get(label);
    if (value !== undefined) return value;
  }
  return "";
}

function decisionFor(fields) {
  const value = firstField(fields, ["Decision"]).toLowerCase();
  return ["accepted", "partial", "blocked", "failed"].find((decision) =>
    new RegExp(`\\b${decision}\\b`).test(value),
  );
}

function hasObservedEvidence(value) {
  return /^observed(?:\s+production)?$/i.test(normalize(value));
}

function hasLocalControlEvidence(section) {
  return /\blocal control\b/i.test(section);
}

function validateRun(runText, runTitle) {
  const fields = parseFields(runText);
  const decision = decisionFor(fields);
  const issues = [];
  const warnings = [];
  const requiredValues = new Map();

  if (!decision) {
    issues.push("missing decision");
  }

  for (const group of requiredFieldGroups) {
    const value = firstField(fields, group.labels);
    if (group.labels.length > 1 && group.name === "participant roles") {
      const missingRoles = group.labels.filter((label) =>
        isMissing(fields.get(label) ?? ""),
      );
      if (missingRoles.length > 0) {
        requiredValues.set(group.name, missingRoles.join(", "));
      }
    } else if (isMissing(value)) {
      requiredValues.set(group.name, group.labels[0]);
    } else if (group.timestamp && !isTimestamp(value)) {
      requiredValues.set(group.name, `${group.labels[0]} is not ISO-8601 UTC`);
    }
  }

  const evidenceStatus = firstField(fields, ["Evidence status"]);
  if (!/\bobserved production\b/i.test(evidenceStatus)) {
    requiredValues.set("production evidence status", "Evidence status must be observed production");
  }

  const publicationUrl = firstField(fields, ["Published URL"]);
  if (
    !isMissing(publicationUrl) &&
    !/^https?:\/\/\S+$/i.test(normalize(publicationUrl))
  ) {
    requiredValues.set("published URL", "must be an externally reachable http(s) URL");
  }

  const routeSection = sectionBetween(runText, /^###\s+Journey route results\s*$/m);
  const routeTable = parseTable(routeSection);
  if (!routeTable) {
    requiredValues.set("route results", "Journey route results table");
  } else {
    const requiredRouteHeaders = [
      "role",
      "exactrouteurl",
      "result",
      "evidencetier",
      "timestamputc",
      "evidencereference",
    ];
    const missingHeaders = requiredRouteHeaders.filter(
      (header) => !routeTable.headers.includes(header),
    );
    if (missingHeaders.length > 0) {
      requiredValues.set(
        "route results",
        `missing columns: ${missingHeaders.join(", ")}`,
      );
    } else if (routeTable.rows.length < 8) {
      requiredValues.set(
        "route results",
        `expected 8 route rows, found ${routeTable.rows.length}`,
      );
    } else {
      const routeIssues = [];
      for (const [index, row] of routeTable.rows.entries()) {
        if (isMissing(row.exactrouteurl)) routeIssues.push(`row ${index + 1} route`);
        if (isMissing(row.result) || !/^pass$/i.test(row.result)) {
          routeIssues.push(`row ${index + 1} result`);
        }
        if (!hasObservedEvidence(row.evidencetier)) {
          routeIssues.push(`row ${index + 1} evidence tier`);
        }
        if (!isTimestamp(row.timestamputc)) {
          routeIssues.push(`row ${index + 1} timestamp`);
        }
        if (isMissing(row.evidencereference)) {
          routeIssues.push(`row ${index + 1} evidence reference`);
        }
      }
      if (routeIssues.length > 0) {
        requiredValues.set("route results", routeIssues.join("; "));
      }
    }
  }

  const permissionSection = sectionBetween(
    runText,
    /^###\s+Permission outcomes\s*$/m,
  );
  const permissionTable = parseTable(permissionSection);
  if (!permissionTable) {
    requiredValues.set("permission outcomes", "Permission outcomes table");
  } else {
    const requiredPermissionHeaders = [
      "rolefixture",
      "actualoutcomemessage",
      "evidencetier",
      "timestamputc",
    ];
    const missingHeaders = requiredPermissionHeaders.filter(
      (header) => !permissionTable.headers.includes(header),
    );
    if (missingHeaders.length > 0) {
      requiredValues.set(
        "permission outcomes",
        `missing columns: ${missingHeaders.join(", ")}`,
      );
    } else if (permissionTable.rows.length < 3) {
      requiredValues.set(
        "permission outcomes",
        `expected at least 3 role outcomes, found ${permissionTable.rows.length}`,
      );
    } else {
      const permissionIssues = [];
      const outcomes = [];
      for (const [index, row] of permissionTable.rows.entries()) {
        if (isMissing(row.rolefixture)) permissionIssues.push(`row ${index + 1} role`);
        if (isMissing(row.actualoutcomemessage)) {
          permissionIssues.push(`row ${index + 1} outcome`);
        } else {
          outcomes.push(row.actualoutcomemessage.toLowerCase());
        }
        if (!hasObservedEvidence(row.evidencetier)) {
          permissionIssues.push(`row ${index + 1} evidence tier`);
        }
        if (!isTimestamp(row.timestamputc)) {
          permissionIssues.push(`row ${index + 1} timestamp`);
        }
      }
      if (!outcomes.some((outcome) => /\ballowed\b|\bpermitted\b/.test(outcome))) {
        permissionIssues.push("no successful authorization outcome");
      }
      if (!outcomes.some((outcome) => /\bdenied\b|\bforbidden\b/.test(outcome))) {
        permissionIssues.push("no denied/invalid authorization outcome");
      }
      if (permissionIssues.length > 0) {
        requiredValues.set("permission outcomes", permissionIssues.join("; "));
      }
    }
  }

  const vocabularySection = sectionBetween(
    runText,
    /^###\s+Vocabulary observations\s*$/m,
  );
  const vocabularyTable = parseTable(vocabularySection);
  const expectedTerms = [
    "storyworld",
    "path",
    "saved moment",
    "capsule",
    "proposed canon",
  ];
  if (!vocabularyTable) {
    requiredValues.set("vocabulary observations", "Vocabulary observations table");
  } else {
    const termColumn = vocabularyTable.headers.find((header) =>
      ["termorconcept", "term"].includes(header),
    );
    const understoodColumn = vocabularyTable.headers.find((header) =>
      header.includes("participantunderstood"),
    );
    const wordingColumn = vocabularyTable.headers.find((header) =>
      header.includes("observedwording"),
    );
    if (!termColumn || !understoodColumn || !wordingColumn) {
      requiredValues.set(
        "vocabulary observations",
        "table needs term, participant understanding, and observed wording columns",
      );
    } else {
      const vocabularyIssues = [];
      const terms = new Set();
      for (const [index, row] of vocabularyTable.rows.entries()) {
        const term = row[termColumn].toLowerCase();
        terms.add(term);
        if (!/^(yes|no)$/i.test(row[understoodColumn])) {
          vocabularyIssues.push(`row ${index + 1} understanding`);
        }
        if (isMissing(row[wordingColumn])) {
          vocabularyIssues.push(`row ${index + 1} observation`);
        }
      }
      for (const term of expectedTerms) {
        if (!terms.has(term)) vocabularyIssues.push(`missing term ${term}`);
      }
      if (vocabularyIssues.length > 0) {
        requiredValues.set("vocabulary observations", vocabularyIssues.join("; "));
      }
    }
  }

  const attributionLabels = [
    "Narration attribution shown to contributor",
    "Narration attribution shown to reader",
    "Agent-assistance disclosure shown",
    "Steward/editor attribution shown",
    "Durable provenance reference",
    "Provenance recoverable independently of the merge service account",
    "Attribution/provenance evidence references",
  ];
  const missingAttribution = attributionLabels.filter((label) => {
    const value = fields.get(label) ?? "";
    if (label.includes("recoverable")) return !/^yes$/i.test(normalize(value));
    return isMissing(value);
  });
  if (missingAttribution.length > 0) {
    requiredValues.set("attribution/provenance", missingAttribution.join(", "));
  }

  const boundary = firstField(fields, [
    "Failure or partial boundary",
    "Failure/partial boundary",
  ]);
  const nextPrerequisite = firstField(fields, ["Next prerequisite"]);
  const boundaryHasFailure = boundary && !/^(?:none|no failure|not applicable)$/i.test(
    normalize(boundary),
  );
  if (boundaryHasFailure && isMissing(nextPrerequisite)) {
    issues.push("failure or partial boundary has no concrete next prerequisite");
  }

  const controlSection =
    sectionBetween(runText, /^###\s+Control evidence \(kept separate\)\s*$/m) ||
    sectionBetween(runText, /^###\s+Local control evidence\s*$/m);
  if (!controlSection || !hasLocalControlEvidence(controlSection)) {
    issues.push("local control evidence is not in a visibly separate control section");
  } else {
    const controlTable = parseTable(controlSection);
    if (controlTable?.headers.includes("evidencetier")) {
      const contaminatedRows = controlTable.rows.filter(
        (row) => !/^local control$/i.test(row.evidencetier),
      );
      if (contaminatedRows.length > 0) {
        issues.push(
          "local control section contains evidence that is not labeled Local control",
        );
      }
    }
  }

  for (const [name, detail] of requiredValues) {
    const message = `${name}: ${detail}`;
    if (decision === "accepted") issues.push(message);
    else warnings.push(message);
  }

  if (decision === "accepted" && !controlSection) {
    issues.push("accepted run has no separate local control evidence section");
  }

  return { decision, issues, warnings };
}

function extractRuns(document) {
  const matches = [...document.matchAll(/^##\s+Run:\s*(.+)$/gm)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? document.length;
    return { title: match[1].trim(), text: document.slice(start, end) };
  });
}

const document = await readFile(documentPath, "utf8");
const runs = extractRuns(document);
if (runs.length === 0) {
  console.error(`Journey acceptance validation failed: no "## Run:" records found in ${documentPath}`);
  process.exit(1);
}

let failures = 0;
console.log(`Journey acceptance validation: ${documentPath}`);
for (const run of runs) {
  const result = validateRun(run.text, run.title);
  if (result.issues.length > 0) failures += 1;
  const status = result.issues.length > 0 ? "FAIL" : "PASS";
  console.log(`- ${status} ${run.title} [${result.decision ?? "unknown"}]`);
  for (const issue of result.issues) console.log(`  - ERROR: ${issue}`);
  for (const warning of result.warnings) console.log(`  - INFO: incomplete non-accepted record: ${warning}`);
}

if (failures > 0) {
  console.error(`Journey acceptance validation failed for ${failures} run(s).`);
  process.exit(1);
}

console.log("Journey acceptance validation passed: no accepted run bypasses the evidence gate.");