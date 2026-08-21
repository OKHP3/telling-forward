import { desc, eq } from "drizzle-orm";
import {
  db,
  contributorNotificationsTable,
  type ContributorNotificationKind,
} from "@workspace/db";

export const contributorNotificationCopy: Record<
  ContributorNotificationKind,
  { title: string; body: string }
> = {
  received: {
    title: "We received your scene",
    body: "Your scene is safely in the storyworld's review queue.",
  },
  "being-reviewed": {
    title: "Your scene is being reviewed",
    body: "A human steward is looking at your scene now.",
  },
  "creative-question": {
    title: "We have one creative question for you",
    body: "A human steward left a question to help shape the next revision.",
  },
  "official-story": {
    title: "Your scene is now part of the official story",
    body: "A human steward accepted your scene into the storyworld canon.",
  },
  "alternate-path": {
    title: "Your scene is published as an alternate path",
    body: "Your scene is available as a different path through the storyworld.",
  },
};

export async function emitContributorNotification(input: {
  contributorId: number | null | undefined;
  proposalId: number;
  kind: ContributorNotificationKind;
  eventKey: string;
  body?: string;
}): Promise<void> {
  if (!input.contributorId) return;
  const copy = contributorNotificationCopy[input.kind];
  await db
    .insert(contributorNotificationsTable)
    .values({
      contributorId: input.contributorId,
      proposalId: input.proposalId,
      kind: input.kind,
      title: copy.title,
      body: input.body ?? copy.body,
      eventKey: input.eventKey,
    })
    .onConflictDoNothing({ target: contributorNotificationsTable.eventKey });
}

export async function listContributorNotifications(contributorId: number) {
  return db
    .select()
    .from(contributorNotificationsTable)
    .where(eq(contributorNotificationsTable.contributorId, contributorId))
    .orderBy(desc(contributorNotificationsTable.createdAt));
}