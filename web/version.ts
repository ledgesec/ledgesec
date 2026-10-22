import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function readProductVersion(cwd = process.cwd()): string {
  const beside = join(cwd, "VERSION");
  const parent = join(cwd, "..", "VERSION");
  const path = existsSync(beside) ? beside : parent;
  if (!existsSync(path)) throw new Error("VERSION is missing");
  const text = readFileSync(path, "utf8").trim();
  if (text === "") throw new Error("VERSION is empty");
  return text;
}
