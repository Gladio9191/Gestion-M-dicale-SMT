import { Router, type IRouter } from "express";
import healthRouter from "./health";
import employeesRouter from "./employees";
import medicalRouter from "./medical";
import statsRouter from "./stats";
import hygieneRouter from "./hygiene";
import expertisesManualRouter from "./expertises-manual";
import registreRouter from "./registre";

const router: IRouter = Router();

router.use(healthRouter);
router.use(employeesRouter);
router.use(medicalRouter);
router.use(statsRouter);
router.use(hygieneRouter);
router.use(expertisesManualRouter);
router.use(registreRouter);

export default router;
