import { Router, type IRouter } from "express";
import healthRouter from "./health";
import employeesRouter from "./employees";
import medicalRouter from "./medical";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(employeesRouter);
router.use(medicalRouter);
router.use(statsRouter);

export default router;
