# Data Model

## Node Types

- `source`: raw, traceable input or project-generated output.
- `knowledge`: reusable concepts, methods, frameworks, principles, definitions, or patterns.
- `idea`: generative concepts, hypotheses, design directions, research questions, or product concepts.
- `project`: execution layer that consumes knowledge and ideas, then produces sources.

## Legal Main Edges

- `source_to_knowledge`
- `knowledge_to_idea`
- `knowledge_to_project`
- `idea_to_project`
- `project_to_source`

## Export Rules

The exporter reads only frontmatter wiki links. Body links are ignored.

Illegal target types and missing notes fail the export command. This keeps SKIP as a constrained topology instead of a best-effort backlink graph.
