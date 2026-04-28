import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, sep } from "node:path";
import matter from "gray-matter";
import type { SkipGraph, SkipLink, SkipLinkType, SkipNode, SkipNodeType } from "../src/types";

type Frontmatter = Record<string, unknown>;

interface VaultNote {
  id: string;
  title: string;
  type: SkipNodeType;
  data: Frontmatter;
  path: string;
}

const NODE_TYPES = new Set<SkipNodeType>(["source", "knowledge", "idea", "project"]);

const RELATION_FIELDS: Array<{
  ownerType: SkipNodeType;
  field: string;
  linkType: SkipLinkType;
  direction: "outgoing" | "incoming";
  targetType: SkipNodeType;
}> = [
  { ownerType: "source", field: "extracts_to", linkType: "source_to_knowledge", direction: "outgoing", targetType: "knowledge" },
  { ownerType: "source", field: "generated_by_project", linkType: "project_to_source", direction: "incoming", targetType: "project" },
  { ownerType: "knowledge", field: "sources", linkType: "source_to_knowledge", direction: "incoming", targetType: "source" },
  { ownerType: "knowledge", field: "supports_ideas", linkType: "knowledge_to_idea", direction: "outgoing", targetType: "idea" },
  { ownerType: "knowledge", field: "used_by_projects", linkType: "knowledge_to_project", direction: "outgoing", targetType: "project" },
  { ownerType: "idea", field: "inspired_by_knowledge", linkType: "knowledge_to_idea", direction: "incoming", targetType: "knowledge" },
  { ownerType: "idea", field: "implemented_by_projects", linkType: "idea_to_project", direction: "outgoing", targetType: "project" },
  { ownerType: "project", field: "uses_knowledge", linkType: "knowledge_to_project", direction: "incoming", targetType: "knowledge" },
  { ownerType: "project", field: "implements_ideas", linkType: "idea_to_project", direction: "incoming", targetType: "idea" },
  { ownerType: "project", field: "produces_sources", linkType: "project_to_source", direction: "outgoing", targetType: "source" },
];

export async function exportGraphFromVault(vaultRoot: string, outputPath?: string): Promise<SkipGraph> {
  const markdownPaths = await findMarkdownFiles(vaultRoot);
  const notes = await Promise.all(markdownPaths.map((path) => readVaultNote(vaultRoot, path)));
  const validNotes = notes.filter((note): note is VaultNote => note !== null);
  const notesById = new Map(validNotes.map((note) => [note.id, note]));

  const links = collectLinks(validNotes, notesById);
  const generatedSourceIds = new Set(
    links.filter((link) => link.type === "project_to_source").map((link) => link.target),
  );

  const graph: SkipGraph = {
    nodes: validNotes.map((note) => toGraphNode(note, generatedSourceIds.has(note.id))),
    links,
  };

  if (outputPath) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(graph, null, 2)}\n`, "utf8");
  }

  return graph;
}

async function findMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => `${entry.parentPath}${sep}${entry.name}`)
    .filter((path) => !path.includes(`${sep}90_System${sep}templates${sep}`))
    .sort();
}

async function readVaultNote(root: string, absolutePath: string): Promise<VaultNote | null> {
  const raw = await readFile(absolutePath, "utf8");
  const parsed = matter(raw);
  const type = parsed.data.type;

  if (!NODE_TYPES.has(type as SkipNodeType)) {
    return null;
  }

  const id = slugFromPath(absolutePath);

  return {
    id,
    title: typeof parsed.data.title === "string" ? parsed.data.title : titleFromSlug(id),
    type: type as SkipNodeType,
    data: parsed.data,
    path: relative(root, absolutePath).split(sep).join("/"),
  };
}

function collectLinks(notes: VaultNote[], notesById: Map<string, VaultNote>): SkipLink[] {
  const dedupe = new Set<string>();
  const links: SkipLink[] = [];

  for (const note of notes) {
    const fields = RELATION_FIELDS.filter((field) => field.ownerType === note.type);

    for (const relation of fields) {
      const targets = extractWikiLinkIds(note.data[relation.field]);

      for (const referencedId of targets) {
        const referencedNote = notesById.get(referencedId);
        if (!referencedNote) {
          throw new Error(`Missing target note ${referencedId} referenced by ${note.id}`);
        }

        if (referencedNote.type !== relation.targetType) {
          throw new Error(
            `Illegal ${relation.linkType} edge ${note.id} -> ${referencedId} targets ${referencedNote.type}`,
          );
        }

        const source = relation.direction === "outgoing" ? note.id : referencedId;
        const target = relation.direction === "outgoing" ? referencedId : note.id;
        const key = `${source}|${target}|${relation.linkType}`;

        if (!dedupe.has(key)) {
          dedupe.add(key);
          links.push({ source, target, type: relation.linkType });
        }
      }
    }
  }

  return links.sort((a, b) => `${a.source}:${a.target}:${a.type}`.localeCompare(`${b.source}:${b.target}:${b.type}`));
}

function extractWikiLinkIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractWikiLinkIds(item));
  }

  if (typeof value !== "string") {
    return [];
  }

  const matches = [...value.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)];
  if (matches.length === 0 && value.trim().length > 0) {
    return [normalizeId(value)];
  }

  return matches.map((match) => normalizeId(match[1]));
}

function normalizeId(value: string): string {
  return value.trim().replace(/\.md$/i, "").split("/").at(-1) ?? value.trim();
}

function slugFromPath(path: string): string {
  const fileName = path.split(sep).at(-1) ?? path;
  return fileName.replace(/\.md$/i, "");
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toGraphNode(note: VaultNote, generated: boolean): SkipNode {
  return {
    id: note.id,
    title: note.title,
    type: note.type,
    layer: note.type,
    topics: stringArray(note.data.topics),
    status: typeof note.data.status === "string" ? note.data.status : undefined,
    progress: typeof note.data.progress === "number" ? note.data.progress : undefined,
    path: note.path,
    generated: note.type === "source" && generated ? true : undefined,
    sourceType: typeof note.data.source_type === "string" ? note.data.source_type : undefined,
    knowledgeType: typeof note.data.knowledge_type === "string" ? note.data.knowledge_type : undefined,
    ideaStage: typeof note.data.idea_stage === "string" ? note.data.idea_stage : undefined,
    nextAction: typeof note.data.next_action === "string" ? note.data.next_action : undefined,
  };
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? strings : undefined;
}
