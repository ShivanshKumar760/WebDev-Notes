// src/core/vps.service.js
import Docker from "dockerode";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const docker = new Docker();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Root folder where each VPS user workspace lives on the host
const VPS_WORKSPACE_ROOT = path.join(__dirname, "../../vps_workspaces");

// ─── Port helper ──────────────────────────────────────────────────────────────

async function findFreePort(start = 7000) {
  const net = await import("net");
  return new Promise((resolve) => {
    const server = net.default.createServer();
    server.listen(start, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", () => resolve(findFreePort(start + 1)));
  });
}

// ─── Create VPS ───────────────────────────────────────────────────────────────

/**
 * Spin up a new VPS container for a user.
 * Returns { containerId, port, url, subdomain, workspacePath }
 *
 * The container runs ubuntu-vps image which has:
 *   - nginx listening on :80 and reverse-proxying to :3000
 *   - Node 20, git, curl pre-installed
 *   - User's workspace bind-mounted at /home/user
 */
export async function createVps({ vpsId, name }) {
  const workspacePath = path.join(VPS_WORKSPACE_ROOT, vpsId);
  await fs.mkdir(workspacePath, { recursive: true });

  // Write a starter README so /home/user isn't empty
  await fs.writeFile(
    path.join(workspacePath, "README.md"),
    `# ${name}\n\nYour VPS is ready!\n\nFiles here are persisted at: vps_workspaces/${vpsId}/\n`
  );

  const hostPort = await findFreePort(7000);
  const subdomain = `vps-${vpsId.slice(0, 8)}`;

  const container = await docker.createContainer({
    Image: "ubuntu-vps",
    Tty: false,
    ExposedPorts: { "80/tcp": {} },
    HostConfig: {
      Binds: [`${workspacePath}:/home/user`],
      PortBindings: { "80/tcp": [{ HostPort: String(hostPort) }] },
    },
    // Name the container so it's identifiable in `docker ps`
    name: `vps-${vpsId.slice(0, 8)}`,
  });

  await container.start();

  // Give nginx a moment to start
  await new Promise(r => setTimeout(r, 1000));

  const url = `http://${subdomain}.localhost:${hostPort}`;

  return { containerId: container.id, port: hostPort, url, subdomain, workspacePath };
}

// ─── Exec command in VPS ──────────────────────────────────────────────────────

/**
 * Run a shell command inside a VPS container and stream output line by line.
 * onOutput(stream: 'stdout'|'stderr', line: string) is called for each line.
 * Returns the exit code.
 */
export async function execInVps(containerId, cmd, onOutput = () => {}) {
  const container = docker.getContainer(containerId);

  const exec = await container.exec({
    Cmd: ["bash", "-c", cmd],
    AttachStdout: true,
    AttachStderr: true,
    WorkingDir: "/home/user",
    Tty: false,
  });

  return new Promise((resolve, reject) => {
    exec.start({ hijack: true, stdin: false }, (err, stream) => {
      if (err) return reject(err);

      let stdoutBuf = "";
      let stderrBuf = "";

      container.modem.demuxStream(
        stream,
        {
          write(chunk) {
            stdoutBuf += chunk.toString();
            const lines = stdoutBuf.split("\n");
            stdoutBuf = lines.pop();
            for (const line of lines) {
              if (line.trim()) onOutput("stdout", line);
            }
          },
        },
        {
          write(chunk) {
            stderrBuf += chunk.toString();
            const lines = stderrBuf.split("\n");
            stderrBuf = lines.pop();
            for (const line of lines) {
              if (line.trim()) onOutput("stderr", line);
            }
          },
        }
      );

      stream.on("end", async () => {
        if (stdoutBuf.trim()) onOutput("stdout", stdoutBuf);
        if (stderrBuf.trim()) onOutput("stderr", stderrBuf);
        try {
          const info = await exec.inspect();
          resolve(info.ExitCode);
        } catch {
          resolve(0);
        }
      });

      stream.on("error", reject);
    });
  });
}

// ─── Start / Stop / Delete VPS ────────────────────────────────────────────────

export async function startVps(containerId) {
  const container = docker.getContainer(containerId);
  await container.start();
}

export async function stopVps(containerId) {
  const container = docker.getContainer(containerId);
  await container.stop({ t: 5 }).catch(() => {}); // ignore "not running" error
}

export async function deleteVps(containerId, workspacePath) {
  const container = docker.getContainer(containerId);
  await container.stop({ t: 3 }).catch(() => {});
  await container.remove({ force: true }).catch(() => {});
  // Remove workspace files from host
  await fs.rm(workspacePath, { recursive: true, force: true }).catch(() => {});
}

// ─── Get nginx URL for a running container ────────────────────────────────────

export async function getVpsUrl(containerId, subdomain) {
  const container = docker.getContainer(containerId);
  const data = await container.inspect();
  const portData = data.NetworkSettings.Ports["80/tcp"];
  if (!portData?.[0]?.HostPort) throw new Error("Port not mapped");
  const port = portData[0].HostPort;
  return `http://${subdomain}.localhost:${port}`;
}
