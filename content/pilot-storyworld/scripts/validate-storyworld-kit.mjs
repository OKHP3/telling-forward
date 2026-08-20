import { readFile } from "node:fs/promises";

const requiredFiles = [
  "storyworld.json",
  "CONTRIBUTING.md",
  "CANON-POLICY.md",
  "PROVENANCE.md",
  ".github/labels.json",
  ".github/CODEOWNERS.example",
  ".github/branch-protection.md",
  ".github/ISSUE_TEMPLATE/capsule.yml",
  ".github/ISSUE_TEMPLATE/story-submission.yml",
  ".github/workflows/validate-storyworld.yml",
];

const requiredLabels = [
  "capsule:character",
  "capsule:arc",
  "capsule:event",
  "capsule:arc-beat",
  "capsule:planned-event",
  "capsule:motif",
  "state:draft",
  "state:submitted",
  "state:under-review",
  "state:returned-with-notes",
  "state:accepted-into-canon",
  "state:published-alternate",
];

const errors = [];

async function text(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    errors.push(`missing required file: ${path}`);
    return "";
  }
}

const manifestText = await text("storyworld.json");
let manifest;
try {
  manifest = JSON.parse(manifestText);
} catch {
  errors.push("storyworld.json is not valid JSON");
}

if (manifest?.kit !== "telling-forward-storyworld") {
  errors.push("storyworld.json must declare kit=telling-forward-storyworld");
}
if (manifest?.provenanceContract !== "telling-forward:accepted-contribution:v1") {
  errors.push("storyworld.json must declare the v1 provenance contract");
}
if (manifest?.governance?.automaticCanon !== false) {
  errors.push("automatic canon must remain disabled");
}
if (manifest?.governance?.automaticRightsDecision !== false) {
  errors.push("automatic rights decisions must remain disabled");
}

let labels = [];
try {
  labels = JSON.parse(await text(".github/labels.json"));
} catch {
  errors.push(".github/labels.json is not valid JSON");
}
const labelNames = new Set(labels.map((label) => label?.name));
for (const label of requiredLabels) {
  if (!labelNames.has(label)) errors.push(`missing canonical label: ${label}`);
}
for (const label of labels) {
  if (!label?.name || !/^[0-9a-f]{6}$/i.test(label.color ?? "")) {
    errors.push("every label needs a name and six-digit hex color");
    break;
  }
}

const provenance = await text("PROVENANCE.md");
for (const phrase of [
  "telling-forward:accepted-contribution:v1",
  "Submission-Id",
  "Platform-Attribution",
  "canon commit SHA",
]) {
  if (!provenance.includes(phrase)) {
    errors.push(`PROVENANCE.md is missing required convention: ${phrase}`);
  }
}

const workflow = await text(".github/workflows/validate-storyworld.yml");
if (!workflow.includes("contents: read")) {
  errors.push("validation workflow must use read-only contents permission");
}
if (/merge|publish|accept|rights decision/i.test(workflow)) {
  errors.push("validation workflow must not contain editorial or rights actions");
}

if (errors.length) {
  console.error("Storyworld Kit baseline failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Storyworld Kit baseline is structurally valid.");