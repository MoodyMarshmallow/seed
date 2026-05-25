import { readFile, writeFile } from "node:fs/promises";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  throw new Error("Usage: filter-type-only-dot.mjs <input.dot> <output.dot>");
}

const input = await readFile(inputPath, "utf8");
const output = input
  .split("\n")
  .filter(
    (line) => !line.includes(" -> ") || line.includes('arrowhead="onormal"'),
  )
  .map((line) =>
    line.includes(".interface.ts")
      ? line.replace('fillcolor="#ddfeff"', 'fillcolor="#ccffcc"')
      : line,
  )
  .join("\n");

await writeFile(outputPath, output);
