import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import guildsRouter from "./guilds";
import configRouter from "./config";
import embedsRouter from "./embeds";
import statsRouter from "./stats";
import { attachUser } from "../middlewares/auth";

const router: IRouter = Router();

// Attach Discord user to all requests
router.use(attachUser);

router.use(healthRouter);
router.use(authRouter);
router.use(guildsRouter);
router.use(configRouter);
router.use(embedsRouter);
router.use(statsRouter);

export default router;
