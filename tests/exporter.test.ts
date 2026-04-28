import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { exportGraphFromVault } from "../scripts/exporter-core";

async function makeVault(files: Record<string, string>) {
  const root = join(tmpdir(), `skip-vault-${crypto.randomUUID()}`);
  await mkdir(root, { recursive: true });

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }

  return {
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

describe("exportGraphFromVault", () => {
  it("exports the five legal SKIP relationships from frontmatter wiki links", async () => {
    const vault = await makeVault({
      "00_Sources/chatgpt-skip-discussion.md": `---
type: source
source_type: chatgpt
status: raw
topics: [pkm, graph]
extracts_to:
  - "[[multilayer-graph]]"
---
Body links such as [[ignored-body-link]] are ignored.
`,
      "10_Knowledge/multilayer-graph.md": `---
type: knowledge
knowledge_type: concept
status: active
topics: [graph, pkm]
supports_ideas:
  - "[[3d-knowledge-topology]]"
used_by_projects:
  - "[[skip-topology-demo]]"
---
`,
      "20_Ideas/3d-knowledge-topology.md": `---
type: idea
idea_stage: developing
topics: [obsidian]
implemented_by_projects:
  - "[[skip-topology-demo]]"
---
`,
      "30_Projects/skip-topology-demo.md": `---
type: project
status: active
progress: 20
topics: [obsidian, pkm]
produces_sources:
  - "[[skip-demo-log-2026-04-29]]"
next_action: "Build the first 3D viewer demo"
---
`,
      "00_Sources/skip-demo-log-2026-04-29.md": `---
type: source
source_type: project_log
status: raw
topics: [pkm]
generated_by_project: "[[skip-topology-demo]]"
---
`,
    });

    try {
      const graph = await exportGraphFromVault(vault.root);

      expect(graph.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "multilayer-graph",
            title: "Multilayer Graph",
            type: "knowledge",
            layer: "knowledge",
            path: "10_Knowledge/multilayer-graph.md",
          }),
          expect.objectContaining({
            id: "skip-demo-log-2026-04-29",
            type: "source",
            generated: true,
          }),
        ]),
      );
      expect(graph.links).toEqual(
        expect.arrayContaining([
          { source: "chatgpt-skip-discussion", target: "multilayer-graph", type: "source_to_knowledge" },
          { source: "multilayer-graph", target: "3d-knowledge-topology", type: "knowledge_to_idea" },
          { source: "multilayer-graph", target: "skip-topology-demo", type: "knowledge_to_project" },
          { source: "3d-knowledge-topology", target: "skip-topology-demo", type: "idea_to_project" },
          { source: "skip-topology-demo", target: "skip-demo-log-2026-04-29", type: "project_to_source" },
        ]),
      );
      expect(graph.links.some((link) => link.target === "ignored-body-link")).toBe(false);
    } finally {
      await vault.cleanup();
    }
  });

  it("fails loudly when frontmatter creates a forbidden relationship", async () => {
    const vault = await makeVault({
      "00_Sources/raw-note.md": `---
type: source
extracts_to:
  - "[[demo-project]]"
---
`,
      "30_Projects/demo-project.md": `---
type: project
---
`,
    });

    try {
      await expect(exportGraphFromVault(vault.root)).rejects.toThrow(
        "Illegal source_to_knowledge edge raw-note -> demo-project targets project",
      );
    } finally {
      await vault.cleanup();
    }
  });

  it("fails loudly when a relationship points at a missing note", async () => {
    const vault = await makeVault({
      "10_Knowledge/multilayer-graph.md": `---
type: knowledge
supports_ideas:
  - "[[missing-idea]]"
---
`,
    });

    try {
      await expect(exportGraphFromVault(vault.root)).rejects.toThrow(
        "Missing target note missing-idea referenced by multilayer-graph",
      );
    } finally {
      await vault.cleanup();
    }
  });

  it("writes graph.json to the requested output path", async () => {
    const vault = await makeVault({
      "00_Sources/source.md": `---
type: source
extracts_to:
  - "[[knowledge]]"
---
`,
      "10_Knowledge/knowledge.md": `---
type: knowledge
sources:
  - "[[source]]"
---
`,
    });

    try {
      const outputPath = join(vault.root, "graph.json");
      await exportGraphFromVault(vault.root, outputPath);
      const parsed = JSON.parse(await readFile(outputPath, "utf8"));
      expect(parsed.links).toContainEqual({
        source: "source",
        target: "knowledge",
        type: "source_to_knowledge",
      });
    } finally {
      await vault.cleanup();
    }
  });
});
