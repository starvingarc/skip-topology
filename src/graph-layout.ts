import type { SkipGraph, SkipLink, SkipNode, SkipNodeType } from "./types";

const LAYER_Y: Record<Exclude<SkipNodeType, "project">, number> = {
  idea: 2,
  knowledge: 0,
  source: -2,
};

const PROJECT_X = -4;

export function applySkipLayout(graph: SkipGraph): SkipGraph {
  const groups = new Map<SkipNodeType, SkipNode[]>();

  for (const node of graph.nodes) {
    const nodes = groups.get(node.type) ?? [];
    nodes.push(node);
    groups.set(node.type, nodes);
  }

  const laidOutNodes = graph.nodes.map((node) => {
    const siblings = groups.get(node.type) ?? [];
    const index = siblings.findIndex((sibling) => sibling.id === node.id);
    const spread = Math.max(2, siblings.length - 1);
    const centered = index - (siblings.length - 1) / 2;

    if (node.type === "project") {
      const y = Number((centered * 1.15).toFixed(3));
      const z = Number((((index % 2 === 0 ? 1 : -1) * 1.4) + centered * 0.35).toFixed(3));
      return {
        ...node,
        x: PROJECT_X,
        y,
        z,
        fx: PROJECT_X,
      };
    }

    const radius = 1.5 + spread * 0.2;
    const angle = (Math.PI * 2 * index) / Math.max(1, siblings.length);
    const x = Number((Math.cos(angle) * radius + centered * 0.35).toFixed(3));
    const z = Number((Math.sin(angle) * radius).toFixed(3));
    const y = LAYER_Y[node.type];

    return {
      ...node,
      x,
      y,
      z,
      fx: x,
      fy: y,
      fz: z,
    };
  });

  return {
    nodes: laidOutNodes,
    links: graph.links.map((link) => ({ ...link })),
  };
}

export function getProjectFocusGraph(graph: SkipGraph, projectId: string): SkipGraph {
  const focusLinks = graph.links.filter((link) => {
    const source = getEndpointId(link.source);
    const target = getEndpointId(link.target);

    return (
      target === projectId &&
      (link.type === "knowledge_to_project" || link.type === "idea_to_project")
    ) || (source === projectId && link.type === "project_to_source");
  });

  const nodeIds = new Set<string>([projectId]);
  for (const link of focusLinks) {
    nodeIds.add(getEndpointId(link.source));
    nodeIds.add(getEndpointId(link.target));
  }

  return {
    nodes: graph.nodes.filter((node) => nodeIds.has(node.id)).map((node) => ({ ...node })),
    links: focusLinks.map((link) => normalizeLink(link)),
  };
}

export function getEndpointId(endpoint: string | { id?: string }): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id ?? "";
}

function normalizeLink(link: SkipLink): SkipLink {
  return {
    source: getEndpointId(link.source),
    target: getEndpointId(link.target),
    type: link.type,
  };
}
