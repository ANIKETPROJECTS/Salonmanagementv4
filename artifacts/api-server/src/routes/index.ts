import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import customersRouter from "./customers.js";
import staffRouter from "./staff.js";
import servicesRouter from "./services.js";
import productsRouter from "./products.js";
import appointmentsRouter from "./appointments.js";
import billsRouter from "./bills.js";
import membershipsRouter from "./memberships.js";
import dashboardRouter from "./dashboard.js";
import reportsRouter from "./reports.js";
import upgradationRouter from "./upgradation.js";
import vouchersRouter from "./vouchers.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(staffRouter);
router.use(servicesRouter);
router.use(productsRouter);
router.use(appointmentsRouter);
// upgradation report MUST be registered before billsRouter to avoid /:billId collision
router.use(upgradationRouter);
router.use(billsRouter);
router.use(membershipsRouter);
router.use(vouchersRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
