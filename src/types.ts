export type SkipNodeType = "source" | "knowledge" | "idea" | "project";

export type SkipLayer = SkipNodeType;

export type SkipLinkType =
  | "source_to_knowledge"
  | "knowledge_to_idea"
  | "knowledge_to_project"
  | "idea_to_project"
  | "project_to_source";

export interface SkipNode {
  id: string;
  title: string;
  type: SkipNodeType;
  layer: SkipLayer;
  topics?: string[];
  status?: string;
  progress?: number;
  path: string;
  generated?: boolean;
  sourceType?: string;
  knowledgeType?: string;
  ideaStage?: string;
  nextAction?: string;
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

export interface SkipLink {
  source: string;
  target: string;
  type: SkipLinkType;
}

export interface SkipGraph {
  nodes: SkipNode[];
  links: SkipLink[];
}
