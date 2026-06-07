#!/usr/bin/env node
const { mkdirSync } = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const tmpDir = path.join(root, ".expo", "tmp");
mkdirSync(tmpDir, { recursive: true });

process.env.TMPDIR = process.env.TMPDIR || tmpDir;
process.chdir(root);

const port = process.env.PORT || "8081";
const expoArgs = ["exec", "expo", "start", "--web", "--port", port, ...process.argv.slice(2)];
const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", ["pnpm", ...expoArgs].join(" ")]
    : expoArgs;

const child = spawn(command, args, {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
