# SKIP Topology

Source-Knowledge-Idea-Project Topology is a local-first prototype for tracing how source material becomes reusable knowledge, how knowledge produces ideas, how ideas enter projects, and how projects generate new source material.

## Quick Start

```bash
npm install
npm run export:graph
npm run dev
```

The viewer reads `public/graph.json`, which is generated from frontmatter in `vault/`.

## Core Loop

```text
Source -> Knowledge
Knowledge -> Idea
Knowledge -> Project
Idea -> Project
Project -> Source
```

The `Project -> Source` edge closes the loop: execution produces new traceable material.

## Scripts

- `npm run export:graph`: parse the sample vault and write `public/graph.json`
- `npm run dev`: run the Vite 3D viewer
- `npm run build`: type-check and build the viewer
- `npm run test`: run exporter and layout tests
