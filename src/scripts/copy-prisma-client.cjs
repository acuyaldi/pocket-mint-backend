const { cpSync, existsSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");

const source = resolve(process.cwd(), "src/generated/prisma");
const destinationRoot = resolve(process.cwd(), "dist/generated");
const destination = resolve(destinationRoot, "prisma");

if (!existsSync(source)) {
  throw new Error(
    "Generated Prisma Client not found. Run `npx prisma generate` first.",
  );
}

mkdirSync(destinationRoot, { recursive: true });

cpSync(source, destination, {
  recursive: true,
  force: true,
});

console.log("Prisma Client copied to dist/generated/prisma");