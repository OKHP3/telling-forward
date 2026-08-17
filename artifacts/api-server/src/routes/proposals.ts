import { Router, type IRouter } from "express";
import { ListProposalsResponse, GetProposalParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /api/proposals — stub until the GitHub sync layer feeds data
router.get("/", (req, res) => {
  req.log.debug("listProposals stub");
  res.json(ListProposalsResponse.parse([]));
});

// GET /api/proposals/:id
router.get("/:id", (req, res) => {
  const params = GetProposalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid proposal id" });
    return;
  }
  req.log.debug({ proposalId: params.data.id }, "getProposal stub");
  res.status(501).json({ error: "Not implemented yet" });
});

export default router;
