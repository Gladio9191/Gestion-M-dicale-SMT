import { Router, type IRouter } from "express";
import employeesRouter from "./employees";
import medicalRouter from "./medical";
import statsRouter from "./stats";
import hygieneRouter from "./hygiene";
import expertisesManualRouter from "./expertises-manual";
import registreRouter from "./registre";
import pointageRouter from "./pointage";
import telegramSendsRouter from "./telegram-sends";
import replitTelegramRouter from "./replit-telegram";
import replitImportSheetsRouter from "./replit-import-sheets";

// All routes under this router are mounted behind owner auth in app.ts.
const router: IRouter = Router();
router.use(employeesRouter);
router.use(medicalRouter);
router.use(statsRouter);
router.use(hygieneRouter);
router.use(expertisesManualRouter);
router.use(registreRouter);
router.use(pointageRouter);
router.use(telegramSendsRouter);
router.use(replitTelegramRouter);
router.use(replitImportSheetsRouter);
export default router;
