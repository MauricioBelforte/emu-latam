const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const PROJ_ROOT = path.resolve(ROOT, "..");

console.log("=== Empaquetando Emu Latam ===");

// 1. Build con electron-vite
console.log("\n[1/3] Build de la app...");
execSync("npx electron-vite build", { cwd: ROOT, stdio: "inherit" });

// 2. Package con @electron/packager
console.log("\n[2/3] Empaquetando con @electron/packager...");
const distDir = path.join(ROOT, "dist");
if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true });

execSync(
  `npx @electron/packager . "Emu Latam" --platform=win32 --arch=x64 --out=dist --prune --overwrite --executable-name="Emu Latam" --app-version="1.0.0"`,
  { cwd: ROOT, stdio: "inherit" }
);

// 3. Copiar extra resources
console.log("\n[3/3] Copiando recursos extra...");
const appDir = path.join(distDir, fs.readdirSync(distDir)[0]);
const resDir = path.join(appDir, "resources", "extraResources");
const extraDirs = ["backend", "retroarch", "relay-server"];

for (const dir of extraDirs) {
  const src = path.join(PROJ_ROOT, dir);
  const dst = path.join(resDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, { recursive: true });
    console.log(`  Copiado: ${dir}`);
  }
}

console.log("\n=== Listo! ===");
console.log(`EXE: ${path.join(appDir, "Emu Latam.exe")}`);
console.log(`Tamaño: ~${(fs.statSync(path.join(appDir, "Emu Latam.exe")).length / 1024 / 1024).toFixed(0)} MB + recursos`);
