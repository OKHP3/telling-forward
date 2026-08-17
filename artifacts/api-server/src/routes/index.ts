import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storyworldsRouter from "./storyworlds";
import proposalsRouter from "./proposals";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/storyworlds", storyworldsRouter);
router.use("/proposals", proposalsRouter);

export default router;
