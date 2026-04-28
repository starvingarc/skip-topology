# SKIP Topology Spec

SKIP Topology organizes Obsidian-style notes into four semantic node types: Source, Knowledge, Idea, and Project.

The system is not a general backlink graph. It tracks directed development:

```text
Source -> Knowledge -> Idea
Knowledge -> Project
Idea -> Project
Project -> Source
```

Version 1 is a local MVP. It reads Markdown frontmatter from `vault/`, exports a strict `graph.json`, and renders the result in a 3D web viewer.

## Prior Art

The project uses `react-force-graph-3d` directly and keeps SKIP's data model separate from general graph plugins. MIT projects such as `obsidian-3d-graph` and `obsidian-TagsRoutes` are architectural references. GPL/AGPL projects are interaction and UX references only.
