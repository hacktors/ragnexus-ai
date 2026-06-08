import { readdirSync, statSync } from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const ignoredDirs = new Set(["node_modules", "uploads"]);

const collectJsFiles = (directory) => {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...collectJsFiles(path.join(directory, entry.name)));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
};

const jsFiles = collectJsFiles(backendRoot);

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: backendRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const uploadDir = path.join(backendRoot, "uploads");
if (!statSync(uploadDir, { throwIfNoEntry: false })?.isDirectory()) {
  console.error("Expected backend/uploads to exist. Keep backend/uploads/.gitkeep committed.");
  process.exit(1);
}

console.log(`Backend build check passed for ${jsFiles.length} JavaScript files.`);
