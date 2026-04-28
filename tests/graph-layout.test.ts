import { describe, expect, it } from "vitest";
import { applySkipLayout, getProjectFocusGraph } from "../src/graph-layout";
import type { SkipGraph } from "../src/types";

const graph: SkipGraph = {
  nodes: [
    { id: "source-a", title: "Source A", type: "source", layer: "source", path: "00_Sources/source-a.md" },
    { id: "source-b", title: "Source B", type: "source", layer: "source", path: "00_Sources/source-b.md", generated: true },
    { id: "knowledge-a", title: "Knowledge A", type: "knowledge", layer: "knowledge", path: "10_Knowledge/knowledge-a.md" },
    { id: "idea-a", title: "Idea A", type: "idea", layer: "idea", path: "20_Ideas/idea-a.md" },
    { id: "project-a", title: "Project A", type: "project", layer: "project", path: "30_Projects/project-a.md" },
    { id: "project-b", title: "Project B", type: "project", layer: "project", path: "30_Projects/project-b.md" },
  ],
  links: [
    { source: "source-a", target: "knowledge-a", type: "source_to_knowledge" },
    { source: "knowledge-a", target: "idea-a", type: "knowledge_to_idea" },
    { source: "knowledge-a", target: "project-a", type: "knowledge_to_project" },
    { source: "idea-a", target: "project-a", type: "idea_to_project" },
    { source: "project-a", target: "source-b", type: "project_to_source" },
  ],
};

describe("SKIP graph layout", () => {
  it("pins source, knowledge, idea, and project nodes to the SKIP spatial layers", () => {
    const laidOut = applySkipLayout(graph);

    expect(laidOut.nodes.find((node) => node.id === "source-a")).toMatchObject({ y: -2, fy: -2 });
    expect(laidOut.nodes.find((node) => node.id === "knowledge-a")).toMatchObject({ y: 0, fy: 0 });
    expect(laidOut.nodes.find((node) => node.id === "idea-a")).toMatchObject({ y: 2, fy: 2 });
    expect(laidOut.nodes.find((node) => node.id === "project-a")).toMatchObject({ x: -4, fx: -4 });
  });

  it("returns a local project focus graph with upstream knowledge, upstream ideas, and generated sources", () => {
    const focus = getProjectFocusGraph(graph, "project-a");

    expect(focus.nodes.map((node) => node.id).sort()).toEqual([
      "idea-a",
      "knowledge-a",
      "project-a",
      "source-b",
    ]);
    expect(focus.links.map((link) => link.type).sort()).toEqual([
      "idea_to_project",
      "knowledge_to_project",
      "project_to_source",
    ]);
  });
});
