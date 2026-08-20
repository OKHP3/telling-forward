export const readerRecoveryCopy = {
  world: {
    heading: "A Lost Record",
    message:
      "This world could not be found in the archive. It may have moved, or its address may be incomplete.",
    action: "Return to Discovery",
  },
  path: {
    heading: "Path Not Found",
    message:
      "This story path could not be located. You can return to the world and choose another path.",
    actionForWorld: "Return to World",
    actionForDiscovery: "Return to Discovery",
  },
} as const;

export function isValidReaderId(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function shouldShowWorldNotFound({
  hasValidWorldId,
  hasWorld,
  isLoadingWorld,
  hasWorldError,
}: {
  hasValidWorldId: boolean;
  hasWorld: boolean;
  isLoadingWorld: boolean;
  hasWorldError: boolean;
}): boolean {
  return !hasValidWorldId || hasWorldError || (!isLoadingWorld && !hasWorld);
}

export function shouldShowPathNotFound({
  hasValidIds,
  hasWorld,
  isLoadingWorld,
  hasWorldError,
  hasPathsError,
  pathsLoaded,
  pathExists,
}: {
  hasValidIds: boolean;
  hasWorld: boolean;
  isLoadingWorld: boolean;
  hasWorldError: boolean;
  hasPathsError: boolean;
  pathsLoaded: boolean;
  pathExists: boolean;
}): boolean {
  return (
    !hasValidIds ||
    hasWorldError ||
    hasPathsError ||
    (!isLoadingWorld && !hasWorld) ||
    (pathsLoaded && !pathExists)
  );
}

export function getPathRecoveryHref({
  hasValidIds,
  worldId,
}: {
  hasValidIds: boolean;
  worldId: number;
}): string {
  return hasValidIds ? `/worlds/${worldId}` : "/";
}

export function retryReaderRouteQuery(
  failureCount: number,
  error: unknown,
): boolean {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;

  // A missing record will not reappear on a retry. Stop immediately so the
  // reader sees the archival recovery page instead of an empty-looking world.
  if (status === 404) return false;

  // Preserve React Query's standard three attempts for temporary failures.
  return failureCount < 3;
}