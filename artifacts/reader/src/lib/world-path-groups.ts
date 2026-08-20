import {
  isAlternateState,
  isCanonState,
  isDevelopmentState,
} from "@workspace/api-client-react";

export type ReaderPathLike = {
  state: string;
};

export function groupReaderPaths<T extends ReaderPathLike>(
  paths: T[] | undefined,
) {
  return {
    canonPaths: paths?.filter((path) => isCanonState(path.state)) ?? [],
    alternatePaths:
      paths?.filter((path) => isAlternateState(path.state)) ?? [],
    otherPaths:
      paths?.filter((path) => isDevelopmentState(path.state)) ?? [],
  };
}