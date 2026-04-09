// src/routes/vps.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  createVpsHandler,
  listVps,
  getVpsById,
  execInVpsHandler,
  startVpsHandler,
  stopVpsHandler,
  deleteVpsHandler,
} from "../controllers/vps.controller.js";

const router = Router();

// All VPS routes require authentication
router.use(authMiddleware);

router.post("/create",        createVpsHandler);   // provision new VPS (SSE)
router.get("/",               listVps);            // list user's VPS instances
router.get("/:id",            getVpsById);         // get single VPS details
router.post("/:id/exec",      execInVpsHandler);   // run shell cmd (SSE)
router.post("/:id/start",     startVpsHandler);    // start stopped VPS
router.post("/:id/stop",      stopVpsHandler);     // stop running VPS
router.delete("/:id",         deleteVpsHandler);   // delete VPS + workspace

export default router;
