import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync
} from "node:fs";
import { join } from "node:path";

const dashboardRoot = process.cwd();
const standaloneRoot = join(dashboardRoot, ".next", "standalone");
const sourceStatic = join(dashboardRoot, ".next", "static");
const targetStatic = join(standaloneRoot, ".next", "static");
const sourcePublic = join(dashboardRoot, "public");
const targetPublic = join(standaloneRoot, "public");

if (!existsSync(join(standaloneRoot, "server.js"))) {
  throw new Error("Next.js standalone server was not generated.");
}

rmSync(targetStatic, { force: true, recursive: true });
mkdirSync(join(standaloneRoot, ".next"), { recursive: true });
cpSync(sourceStatic, targetStatic, { recursive: true });

if (existsSync(sourcePublic)) {
  rmSync(targetPublic, { force: true, recursive: true });
  cpSync(sourcePublic, targetPublic, { recursive: true });
}

console.log("Standalone dashboard assets prepared.");
