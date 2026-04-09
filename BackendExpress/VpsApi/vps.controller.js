// src/controllers/vps.controller.js
import { randomUUID } from "crypto";
import Vps from "../models/Vps.js";
import {
  createVps,
  execInVps,
  startVps,
  stopVps,
  deleteVps,
} from "../core/vps.service.js";

// SSE helper
function sendSSE(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ─── POST /api/vps/create ─────────────────────────────────────────────────────
// Provisions a new VPS container. Streams provisioning logs via SSE.
export async function createVpsHandler(req, res) {
  const userId = req.user.userId;

  // SSE stream so the frontend can show live provisioning steps
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const { name = "my-vps" } = req.body;
  const vpsId = randomUUID();

  try {
    sendSSE(res, "status", { message: "🐳 Creating VPS container..." });

    const { containerId, port, url, subdomain, workspacePath } = await createVps({ vpsId, name });

    sendSSE(res, "status", { message: `✅ Container started on port ${port}` });
    sendSSE(res, "status", { message: "🌐 nginx reverse proxy is running on :80 → :3000" });
    sendSSE(res, "status", { message: "📁 Workspace mounted at /home/user" });

    // Save to DB
    const vps = await Vps.create({
      name,
      containerId,
      port,
      url,
      subdomain,
      workspacePath,
      owner: userId,
      status: "running",
    });

    sendSSE(res, "done", {
      message: "VPS ready!",
      vps: {
        _id:          vps._id,
        name:         vps.name,
        url:          vps.url,
        subdomain:    vps.subdomain,
        port:         vps.port,
        status:       vps.status,
        containerId:  vps.containerId,
        createdAt:    vps.createdAt,
      },
    });
  } catch (err) {
    console.error("[vps] create error:", err);
    sendSSE(res, "error", { message: err.message });
  } finally {
    res.end();
  }
}

// ─── GET /api/vps ─────────────────────────────────────────────────────────────
// List all VPS instances for the logged-in user.
export async function listVps(req, res) {
  try {
    const vpsList = await Vps.find({ owner: req.user.userId })
      .sort({ createdAt: -1 })
      .select("name url subdomain port status containerId createdAt");
    res.json({ vps: vpsList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── GET /api/vps/:id ─────────────────────────────────────────────────────────
export async function getVpsById(req, res) {
  try {
    const vps = await Vps.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!vps) return res.status(404).json({ message: "VPS not found" });
    res.json({ vps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── POST /api/vps/:id/exec ───────────────────────────────────────────────────
// Run a shell command inside the VPS and stream output via SSE.
// Body: { cmd: "npm install" }
export async function execInVpsHandler(req, res) {
  const { cmd } = req.body;

  if (!cmd?.trim()) return res.status(400).json({ error: "cmd is required" });

  // SSE stream for live output
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const vps = await Vps.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!vps) {
      sendSSE(res, "error", { message: "VPS not found" });
      return res.end();
    }
    if (vps.status !== "running") {
      sendSSE(res, "error", { message: "VPS is not running" });
      return res.end();
    }

    sendSSE(res, "cmd", { cmd });

    const exitCode = await execInVps(vps.containerId, cmd, (stream, line) => {
      sendSSE(res, "output", { stream, line });
    });

    sendSSE(res, "done", { exitCode });
  } catch (err) {
    sendSSE(res, "error", { message: err.message });
  } finally {
    res.end();
  }
}

// ─── POST /api/vps/:id/start ──────────────────────────────────────────────────
export async function startVpsHandler(req, res) {
  try {
    const vps = await Vps.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!vps) return res.status(404).json({ message: "VPS not found" });

    await startVps(vps.containerId);
    await Vps.updateOne({ _id: vps._id }, { status: "running" });

    res.json({ message: "VPS started", url: vps.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── POST /api/vps/:id/stop ───────────────────────────────────────────────────
export async function stopVpsHandler(req, res) {
  try {
    const vps = await Vps.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!vps) return res.status(404).json({ message: "VPS not found" });

    await stopVps(vps.containerId);
    await Vps.updateOne({ _id: vps._id }, { status: "stopped" });

    res.json({ message: "VPS stopped" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── DELETE /api/vps/:id ──────────────────────────────────────────────────────
export async function deleteVpsHandler(req, res) {
  try {
    const vps = await Vps.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!vps) return res.status(404).json({ message: "VPS not found" });

    await deleteVps(vps.containerId, vps.workspacePath);
    await Vps.deleteOne({ _id: vps._id });

    res.json({ message: "VPS deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
