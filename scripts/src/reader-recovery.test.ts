import assert from "node:assert/strict";
import test from "node:test";
import {
  getPathRecoveryHref,
  isValidReaderId,
  readerRecoveryCopy,
  retryReaderRouteQuery,
  shouldShowPathNotFound,
  shouldShowWorldNotFound,
} from "../../artifacts/reader/src/lib/recovery-state";

test("a bad world ID leads readers to the editorial recovery page", () => {
  const hasValidWorldId = isValidReaderId(Number("not-a-world"));
  const showRecovery = shouldShowWorldNotFound({
    hasValidWorldId,
    hasWorld: false,
    isLoadingWorld: false,
    hasWorldError: false,
  });

  assert.equal(showRecovery, true);
  assert.equal(readerRecoveryCopy.world.heading, "A Lost Record");
  assert.match(readerRecoveryCopy.world.message, /could not be found in the archive/i);
  assert.equal(readerRecoveryCopy.world.action, "Return to Discovery");
});

test("an API 404 for a world leads readers to the editorial recovery page", () => {
  const showRecovery = shouldShowWorldNotFound({
    hasValidWorldId: true,
    hasWorld: false,
    isLoadingWorld: false,
    hasWorldError: true,
  });

  assert.equal(showRecovery, true);
  assert.equal(retryReaderRouteQuery(0, { status: 404 }), false);
});

test("a bad path ID leads readers back to discovery", () => {
  const hasValidIds = isValidReaderId(7) && isValidReaderId(Number("missing"));
  const showRecovery = shouldShowPathNotFound({
    hasValidIds,
    hasWorld: false,
    isLoadingWorld: false,
    hasWorldError: false,
    hasPathsError: false,
    pathsLoaded: false,
    pathExists: false,
  });

  assert.equal(showRecovery, true);
  assert.equal(getPathRecoveryHref({ hasValidIds, worldId: 7 }), "/");
  assert.equal(readerRecoveryCopy.path.heading, "Path Not Found");
  assert.match(readerRecoveryCopy.path.message, /could not be located/i);
});

test("an API 404 while finding a path leads readers back to its world", () => {
  const showRecovery = shouldShowPathNotFound({
    hasValidIds: true,
    hasWorld: true,
    isLoadingWorld: false,
    hasWorldError: false,
    hasPathsError: true,
    pathsLoaded: false,
    pathExists: false,
  });

  assert.equal(showRecovery, true);
  assert.equal(getPathRecoveryHref({ hasValidIds: true, worldId: 7 }), "/worlds/7");
});

test("temporary Reader API failures retain the normal retry allowance", () => {
  assert.equal(retryReaderRouteQuery(0, { status: 503 }), true);
  assert.equal(retryReaderRouteQuery(2, new Error("Network interrupted")), true);
  assert.equal(retryReaderRouteQuery(3, { status: 503 }), false);
});

test("a deleted path in an existing world leads readers back to that world", () => {
  const showRecovery = shouldShowPathNotFound({
    hasValidIds: true,
    hasWorld: true,
    isLoadingWorld: false,
    hasWorldError: false,
    hasPathsError: false,
    pathsLoaded: true,
    pathExists: false,
  });

  assert.equal(showRecovery, true);
  assert.equal(getPathRecoveryHref({ hasValidIds: true, worldId: 7 }), "/worlds/7");
  assert.equal(readerRecoveryCopy.path.actionForWorld, "Return to World");
});