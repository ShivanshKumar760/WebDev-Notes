// ─── Add to server.js ─────────────────────────────────────────────────────────

// 1. Import the VPS router
import vpsRouter from "./routes/vps.routes.js";

// 2. Create the vps_workspaces directory on startup (alongside uploads/workspaces)
["uploads", "workspaces", "dev_workspaces", "vps_workspaces"].forEach((dir) =>
  fs.mkdirSync(path.resolve(dir), { recursive: true })
);

// 3. Register the route
app.use("/api/vps", vpsRouter);

// ─── Updated full server.js for reference ─────────────────────────────────────
/*
import express from "express";
import mongoose from "mongoose";
import router      from "./routes/project.routes.js";
import authRouter  from "./routes/auth.routes.js";
import uploadRoute from "./routes/upload.routes.js";
import vpsRouter   from "./routes/vps.routes.js";   // ← NEW
import cors from "cors";
import fs   from "fs";
import path from "path";

["uploads", "workspaces", "dev_workspaces", "vps_workspaces"].forEach((dir) =>
  fs.mkdirSync(path.resolve(dir), { recursive: true })
);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api/auth",     authRouter);
app.use("/api/projects", router);
app.use("/api/upload",   uploadRoute);
app.use("/api/vps",      vpsRouter);   // ← NEW

const PORT = process.env.PORT || 5000;

async function startServer() {
  await mongoose.connect("mongodb://localhost:27017/vercel");
  console.log("Connected to MongoDB");
  app.listen(PORT, () => console.log(`Server on port ${PORT}`));
}

await startServer();
*/
