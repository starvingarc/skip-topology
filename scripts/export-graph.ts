import { resolve } from "node:path";
import { exportGraphFromVault } from "./exporter-core";

const vaultRoot = resolve(process.cwd(), "vault");
const outputPath = resolve(process.cwd(), "public", "graph.json");

try {
  const graph = await exportGraphFromVault(vaultRoot, outputPath);
  console.log(`Exported ${graph.nodes.length} nodes and ${graph.links.length} links to ${outputPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
