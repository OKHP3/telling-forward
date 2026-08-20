import assert from "node:assert/strict";
import test from "node:test";
import { groupReaderPaths } from "../../artifacts/reader/src/lib/world-path-groups";

const paths = [
  { id: 1, title: "The Open Door", state: "open" },
  { id: 2, title: "The Accepted Door", state: "published-canon" },
  { id: 3, title: "The Other Door", state: "published-alternate" },
] as const;

test("Reader world groups open and published-canon paths under Canon", () => {
  const groups = groupReaderPaths(paths);

  assert.deepEqual(
    groups.canonPaths.map((path) => path.title),
    ["The Open Door", "The Accepted Door"],
  );
  assert.deepEqual(groups.alternatePaths, [paths[2]]);
  assert.deepEqual(groups.otherPaths, []);
});

test("Reader world keeps published alternates out of Canon", () => {
  const groups = groupReaderPaths([
    { id: 3, title: "The Other Door", state: "published-alternate" },
  ]);

  assert.deepEqual(groups.canonPaths, []);
  assert.deepEqual(groups.alternatePaths.map((path) => path.title), [
    "The Other Door",
  ]);
});