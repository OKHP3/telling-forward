import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storyworldsRouter from "./storyworlds";
import proposalsRouter from "./proposals";
import transcribeRouter from "./transcribe";
import seedRouter from "./seed";
import adminRouter from "./admin";
import meRouter from "./me";
import consentsRouter from "./consents";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/storyworlds", storyworldsRouter);
router.use("/proposals", proposalsRouter);
router.use("/", transcribeRouter);
router.use("/admin", adminRouter);
router.use("/me", meRouter);
router.use("/consents", consentsRouter);

// Dev-only seed route — not available in production
if (process.env["NODE_ENV"] !== "production") {
  router.use("/dev", seedRouter);
}

export default router;
