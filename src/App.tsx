import { useEffect, useMemo, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import { Box, FolderOpen, GitBranch, Layers3, RotateCcw } from "lucide-react";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { SkipGraph, SkipLinkType, SkipNode, SkipNodeType } from "./types";
import { applySkipLayout, getEndpointId, getProjectFocusGraph } from "./graph-layout";

type ViewMode = { type: "global" } | { type: "project"; projectId: string };

const NODE_COLORS: Record<SkipNodeType, string> = {
  source: "#3b82f6",
  knowledge: "#22c55e",
  idea: "#fb7185",
  project: "#8b5cf6",
};

const LINK_COLORS: Record<SkipLinkType, string> = {
  source_to_knowledge: "#3b82f6",
  knowledge_to_idea: "#22c55e",
  knowledge_to_project: "#22c55e",
  idea_to_project: "#f97316",
  project_to_source: "#8b5cf6",
};

export function App() {
  const [graph, setGraph] = useState<SkipGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<SkipNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>({ type: "global" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/graph.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Run npm run export:graph before opening the viewer.");
        }
        return response.json() as Promise<SkipGraph>;
      })
      .then((data) => {
        const laidOut = applySkipLayout(data);
        setGraph(laidOut);
        setSelectedNode(laidOut.nodes.find((node) => node.type === "project") ?? laidOut.nodes[0] ?? null);
      })
      .catch((loadError: Error) => setError(loadError.message));
  }, []);

  const displayedGraph = useMemo(() => {
    if (!graph) {
      return { nodes: [], links: [] };
    }

    if (viewMode.type === "project") {
      return applySkipLayout(getProjectFocusGraph(graph, viewMode.projectId));
    }

    return graph;
  }, [graph, viewMode]);

  const projectNodes = graph?.nodes.filter((node) => node.type === "project") ?? [];
  const selectedProjectId = viewMode.type === "project" ? viewMode.projectId : undefined;

  if (error) {
    return (
      <main className="empty-state">
        <Box aria-hidden="true" />
        <h1>SKIP Topology</h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="topology-stage" aria-label="SKIP topology graph">
        <header className="toolbar">
          <div>
            <h1>SKIP Topology</h1>
            <p>Source-Knowledge-Idea-Project topology</p>
          </div>
          <div className="toolbar-actions">
            <button
              className={viewMode.type === "global" ? "active" : ""}
              type="button"
              onClick={() => setViewMode({ type: "global" })}
              title="Global View"
            >
              <Layers3 size={17} />
              Global
            </button>
            <select
              aria-label="Project Focus"
              value={selectedProjectId ?? ""}
              onChange={(event) => {
                if (event.target.value) {
                  setViewMode({ type: "project", projectId: event.target.value });
                  setSelectedNode(graph?.nodes.find((node) => node.id === event.target.value) ?? null);
                }
              }}
            >
              <option value="">Project Focus</option>
              {projectNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.title}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setSelectedNode(null)} title="Clear selection">
              <RotateCcw size={17} />
            </button>
          </div>
        </header>

        <div className="graph-frame">
          <div className="layer-label idea">Idea Layer</div>
          <div className="layer-label knowledge">Knowledge Layer</div>
          <div className="layer-label source">Source Layer</div>
          <div className="layer-label project">Project Layer</div>
          <ForceGraph3D
            graphData={displayedGraph}
            backgroundColor="#0a0f1f"
            nodeRelSize={6}
            nodeOpacity={0.95}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.12}
            linkWidth={(link) => (link.type === "project_to_source" ? 1.8 : 1.25)}
            linkColor={(link) => LINK_COLORS[link.type as SkipLinkType]}
            nodeColor={(node) => NODE_COLORS[(node as SkipNode).type]}
            nodeThreeObject={(node) => createNodeLabel(node as SkipNode)}
            nodeThreeObjectExtend
            onNodeClick={(node) => {
              const skipNode = node as SkipNode;
              setSelectedNode(skipNode);
              if (skipNode.type === "project") {
                setViewMode({ type: "project", projectId: skipNode.id });
              }
            }}
            cooldownTicks={70}
          />
        </div>
      </section>

      <aside className="detail-panel" aria-label="Node details">
        <NodeDetails node={selectedNode} graph={graph} />
      </aside>
    </main>
  );
}

function createNodeLabel(node: SkipNode) {
  const element = document.createElement("div");
  element.className = `node-label ${node.type}${node.generated ? " generated" : ""}`;
  element.textContent = node.title;
  return new CSS2DObject(element);
}

function NodeDetails({ node, graph }: { node: SkipNode | null; graph: SkipGraph | null }) {
  if (!node || !graph) {
    return (
      <div className="panel-empty">
        <FolderOpen aria-hidden="true" />
        <p>Select a node to inspect its SKIP context.</p>
      </div>
    );
  }

  const incoming = graph.links.filter((link) => getEndpointId(link.target) === node.id);
  const outgoing = graph.links.filter((link) => getEndpointId(link.source) === node.id);

  return (
    <>
      <div className="detail-heading">
        <span className={`type-dot ${node.type}`} />
        <div>
          <h2>{node.title}</h2>
          <p>{node.type}</p>
        </div>
      </div>

      <dl className="metadata">
        <div>
          <dt>Status</dt>
          <dd>{node.status ?? "unspecified"}</dd>
        </div>
        {typeof node.progress === "number" ? (
          <div>
            <dt>Progress</dt>
            <dd>{node.progress}%</dd>
          </div>
        ) : null}
        <div>
          <dt>Path</dt>
          <dd>{node.path}</dd>
        </div>
        {node.nextAction ? (
          <div>
            <dt>Next Action</dt>
            <dd>{node.nextAction}</dd>
          </div>
        ) : null}
      </dl>

      <section>
        <h3>Topics</h3>
        <div className="tags">
          {(node.topics ?? ["untagged"]).map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
      </section>

      <section>
        <h3>Lineage</h3>
        <RelationList title="Incoming" links={incoming} />
        <RelationList title="Outgoing" links={outgoing} />
      </section>
    </>
  );
}

function RelationList({ title, links }: { title: string; links: Array<{ source: unknown; target: unknown; type: string }> }) {
  return (
    <div className="relation-group">
      <h4>
        <GitBranch size={14} />
        {title}
      </h4>
      {links.length === 0 ? (
        <p className="muted">None</p>
      ) : (
        <ul>
          {links.map((link) => (
            <li key={`${getEndpointId(link.source as string)}-${getEndpointId(link.target as string)}-${link.type}`}>
              <span>{getEndpointId(link.source as string)}</span>
              <strong>{link.type}</strong>
              <span>{getEndpointId(link.target as string)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
