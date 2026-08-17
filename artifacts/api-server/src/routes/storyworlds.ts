import { Router, type IRouter } from "express";
import {
  ListStoryworldsResponse,
  GetStoryworldParams,
  ListStoryPathsParams,
  ListStoryPathsResponse,
  ListContributionsParams,
  ListContributionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /api/storyworlds — stub until the GitHub sync layer feeds data
router.get("/", (req, res) => {
  req.log.debug("listStoryworlds stub");
  res.json(ListStoryworldsResponse.parse([]));
});

// GET /api/storyworlds/:id
router.get("/:id", (req, res) => {
  const params = GetStoryworldParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid storyworld id" });
    return;
  }
  req.log.debug({ storyworldId: params.data.id }, "getStoryworld stub");
  res.status(501).json({ error: "Not implemented yet" });
});

// GET /api/storyworlds/:id/paths
router.get("/:id/paths", (req, res) => {
  const params = ListStoryPathsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid storyworld id" });
    return;
  }
  req.log.debug({ storyworldId: params.data.id }, "listStoryPaths stub");
  res.json(ListStoryPathsResponse.parse([]));
});

// GET /api/storyworlds/:id/paths/:pathId/contributions
router.get("/:id/paths/:pathId/contributions", (req, res) => {
  const params = ListContributionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid storyworld or path id" });
    return;
  }
  req.log.debug(
    { storyworldId: params.data.id, pathId: params.data.pathId },
    "listContributions stub",
  );
  res.json(ListContributionsResponse.parse([]));
});

export default router;
