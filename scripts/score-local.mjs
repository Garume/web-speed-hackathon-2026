import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const applicationDir = path.resolve(repoRoot, "application");
const scoringToolDir = path.resolve(repoRoot, "scoring-tool");
const scoringCliPath = path.resolve(scoringToolDir, "node_modules", "tsx", "dist", "cli.mjs");

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function parseArgs(argv) {
  const scoringArgs = [];
  let applicationUrl = "http://127.0.0.1:3000";
  let keepServer = false;
  let shouldBuild = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--skipBuild" || arg === "--skip-build") {
      shouldBuild = false;
      continue;
    }

    if (arg === "--keepServer" || arg === "--keep-server") {
      keepServer = true;
      continue;
    }

    if (arg === "--applicationUrl" || arg === "--application-url") {
      const nextArg = argv[index + 1];
      if (nextArg == null) {
        throw new Error(`${arg} には URL が必要です`);
      }

      applicationUrl = nextArg;
      index += 1;
      continue;
    }

    scoringArgs.push(arg);
  }

  return { applicationUrl, keepServer, scoringArgs, shouldBuild };
}

function spawnProcess(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    shell: process.platform === "win32" && command.endsWith(".cmd"),
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(error);
  });

  return child;
}

async function runCommand(command, args, cwd) {
  const child = spawnProcess(command, args, cwd);

  const exitCode = await new Promise((resolve, reject) => {
    child.once("close", resolve);
    child.once("error", reject);
  });

  if (exitCode !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${exitCode}`);
  }
}

async function waitForServer(applicationUrl, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  const healthcheckUrl = new URL("/", applicationUrl);

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthcheckUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore while the server is booting
    }

    await sleep(1_000);
  }

  throw new Error(`Timed out while waiting for ${healthcheckUrl.href}`);
}

async function stopServer(serverProcess) {
  if (serverProcess == null || serverProcess.exitCode != null) {
    return;
  }

  if (process.platform === "win32") {
    await runCommand("taskkill", ["/pid", String(serverProcess.pid), "/t", "/f"], repoRoot).catch(
      () => {},
    );
    return;
  }

  serverProcess.kill("SIGTERM");
  await new Promise((resolve) => {
    serverProcess.once("close", resolve);
    setTimeout(resolve, 5_000);
  });
}

async function main() {
  const { applicationUrl, keepServer, scoringArgs, shouldBuild } = parseArgs(process.argv.slice(2));

  const finalScoringArgs = scoringArgs.includes("--applicationUrl")
    ? scoringArgs
    : ["--applicationUrl", applicationUrl, ...scoringArgs];

  if (shouldBuild) {
    await runCommand(pnpmCommand, ["run", "build"], applicationDir);
  }

  const serverProcess = spawnProcess(pnpmCommand, ["run", "start"], applicationDir);

  const cleanup = async () => {
    if (!keepServer) {
      await stopServer(serverProcess);
    }
  };

  process.once("SIGINT", async () => {
    await cleanup();
    process.exit(130);
  });
  process.once("SIGTERM", async () => {
    await cleanup();
    process.exit(143);
  });

  try {
    await waitForServer(applicationUrl);
    await runCommand(process.execPath, [scoringCliPath, "./src/index.ts", ...finalScoringArgs], scoringToolDir);
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
