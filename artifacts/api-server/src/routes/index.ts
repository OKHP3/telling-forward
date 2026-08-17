import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storyworldsRouter from "./storyworlds";
import proposalsRouter from "./proposals";
import transcribeRouter from "./transcribe";
import seedRouter from "./seed";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/storyworlds", storyworldsRouter);
router.use("/proposals", proposalsRouter);
router.use("/", transcribeRouter);

// Dev-only seed route — not available in production
if (process.env["NODE_ENV"] !== "production") {
  router.use("/dev", seedRouter);
}

export default router;
