# ClinicalTrials.gov Query-to-Visualization Agent — Project Spec

> Engineering spec for the take-home assignment.
> Backend service that converts natural-language clinical-trial questions into structured visualization outputs backed by the ClinicalTrials.gov API.

---

## 1. Goal & Scope

Build a **backend service** that:

1. Accepts a natural-language query (plus optional structured filters) about clinical trials.
2. Interprets the query using an LLM (constrained, schema-validated).
3. Retrieves relevant data from the ClinicalTrials.gov API.
4. Decides whether a visualization is needed, and which type best answers the question.
5. Returns a **structured visualization specification** (type, title, encoding, data, meta) that any frontend can render without ambiguity.

A frontend is **not required**. A small Next.js demo is a bonus.

**Out of scope:**
- Persistent database / user accounts
- Production-grade auth (the service is stateless and public for the demo)
- Real-time streaming responses
- Full RAG over trial documents (we only call the structured API)

---

## 2. Architecture Overview

```
┌──────────────┐    ┌────────────────────┐    ┌──────────────────────────┐
│  HTTP Client │ ─► │  NestJS Controller │ ─► │  Query Orchestrator      │
└──────────────┘    │  POST /api/query   │    │  (Agent Service)         │
                    └────────────────────┘    └──────────┬───────────────┘
                                                         │
                                  ┌──────────────────────┼──────────────────────┐
                                  ▼                      ▼                      ▼
                        ┌──────────────────┐  ┌─────────────────────┐  ┌──────────────────┐
                        │ LLM Planner      │  │ ClinicalTrials API  │  │ Aggregator       │
                        │ (OpenAI +        │  │ Client              │  │ (group, bucket,  │
                        │  Zod schema)     │  │ (paginated)         │  │  network build)  │
                        └──────────────────┘  └─────────────────────┘  └──────────────────┘
                                                         │
                                                         ▼
                                                ┌──────────────────┐
                                                │ Viz Spec Builder │
                                                │ + Citation Linker│
                                                └──────────────────┘
```

### Pipeline (single request lifecycle)

1. **Validate input** — DTO + class-validator on the controller.
2. **Plan** — Call OpenAI with a strict JSON schema; output is a `QueryPlan` (intent, filters, viz hints).
3. **Validate plan** — Parse the LLM output with Zod. On failure, retry once with the validation error appended; then 422.
4. **Fetch** — Translate the plan into one or more ClinicalTrials.gov API calls. Paginate up to a configurable cap.
5. **Aggregate** — Pure-TS reducers group/bucket/count the raw studies. The LLM never sees the data.
6. **Build viz spec** — Select the visualization type (LLM hint + rule-based override) and shape the data into the canonical spec.
7. **Attach citations** — For each datum, link the contributing `nct_id`s with short excerpts (bonus).
8. **Respond** — Return the spec + metadata.

### Design principle: the LLM is a translator, not a data source

The LLM only converts text → query plan. It never produces numbers, never summarizes trial content, never decides counts. This is the single most important hallucination-prevention choice in the system and is called out explicitly in the README.

---

## 3. Tech Stack

Always install the **latest stable versions** of each package (`pnpm add <pkg>@latest`). Pin them in `pnpm-lock.yaml`. The table below names the technology — the version is whatever is current at install time.

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript (latest) | Strong types match a schema-heavy problem |
| Repo layout | pnpm workspaces monorepo | Backend + frontend + shared types under one repo |
| Package manager | pnpm (latest) | Workspace support, fast installs, smaller Docker images |
| Backend framework | NestJS (latest, v11+) | DI, modules, providers, controllers — matches my nestar repo style |
| LLM | OpenAI SDK (latest) — `gpt-4o-mini` or `gpt-4o` | Provided API key; structured outputs supported |
| Schema validation | Zod (latest) | Validates LLM output + internal shapes; works in backend AND frontend |
| HTTP client | Axios via `@nestjs/axios` (latest) | Standard NestJS integration |
| Caching | In-memory LRU (optional) | Avoid re-hitting the API in dev |
| Logging | Nest built-in Logger | Lightweight; no external service |
| Frontend framework | Next.js (latest, App Router) | Bonus demo UI |
| UI styling | Tailwind CSS (latest) | Utility-first, fast to ship |
| UI components | shadcn/ui (latest) | Headless Radix-based components — looks polished out of the box |
| Charts | Recharts (latest) | Bar, line, scatter, geo-friendly |
| Network graph | react-force-graph or vis-network (latest) | For the network_graph viz |
| Backend deployment | Render (web service) | Single URL, free tier OK |
| Frontend deployment | Vercel | Native Next.js host |
| Containerization | Dockerfile + docker-compose | Reviewer can run with one command |

---

## 4. Request / Response Schemas

### 4.1 Request schema

`POST /api/query`

```ts
// Request body
{
  query: string;            // REQUIRED. Natural-language question.
  filters?: {               // OPTIONAL. Pre-applied filters that override LLM extraction.
    condition?: string;
    drug_name?: string;     // a.k.a. intervention
    sponsor?: string;
    phase?: ("EARLY_PHASE1" | "PHASE1" | "PHASE2" | "PHASE3" | "PHASE4" | "NA")[];
    status?: ("RECRUITING" | "COMPLETED" | "TERMINATED" | "ACTIVE_NOT_RECRUITING" | "WITHDRAWN" | "NOT_YET_RECRUITING")[];
    country?: string;
    start_year?: number;    // inclusive
    end_year?: number;      // inclusive
  };
  options?: {
    max_studies?: number;   // default 500, hard cap 1000
    include_citations?: boolean; // default true
    preferred_viz?:         // optional hint; the agent may override
      | "bar_chart"
      | "grouped_bar_chart"
      | "time_series"
      | "histogram"
      | "scatter_plot"
      | "network_graph"
      | "geo_map";
  };
}
```

**Validation rules:**
- `query` non-empty, ≤ 500 chars.
- `start_year` ≤ `end_year` when both present.
- `max_studies` between 10 and 1000.

### 4.2 Response schema

```ts
// 200 OK
{
  visualization: {
    type: VizType;            // see enum above
    title: string;            // human-readable, derived from intent + filters
    encoding: Encoding;       // shape depends on viz type — see Section 5
    data: DataPoint[];        // array of records; shape matches encoding
  };
  meta: {
    source: "clinicaltrials.gov";
    api_version: "v2";
    filters_applied: Record<string, unknown>;
    query_interpretation: string;     // 1-sentence plain-English restatement
    total_studies_scanned: number;
    total_studies_used: number;       // after filtering
    assumptions: string[];            // e.g., "Excluded trials with unknown phase"
    generated_at: string;             // ISO 8601
    latency_ms: number;
  };
  citations?: Citation[];             // present iff include_citations=true
}

// Citation (deep traceability — bonus)
type Citation = {
  datum_key: string;        // e.g., "phase=PHASE3" or "year=2021" or "edge:sponsorA->drugX"
  references: {
    nct_id: string;
    excerpt: string;        // ≤ 200 chars from a relevant field
    field: string;          // which API field the excerpt came from
  }[];
};

// Error response
// 4xx / 5xx
{
  error: {
    code: "INVALID_INPUT" | "PLAN_VALIDATION_FAILED" | "UPSTREAM_FAILURE" | "NO_DATA" | "INTERNAL";
    message: string;
    details?: unknown;
  };
}
```

---

## 5. Visualization Types & Encodings

The viz spec is **canonical** — the frontend should be able to render any supported type from `{type, encoding, data}` alone.

### 5.1 `bar_chart`
```ts
encoding: { x: { field: string; label?: string }, y: { field: string; label?: string } }
data: { [xField]: string | number; [yField]: number }[]
```
Example queries: *"How are trials for Pembrolizumab distributed across phases?"*

### 5.2 `grouped_bar_chart`
```ts
encoding: {
  x: { field: string; label?: string },
  y: { field: string; label?: string },
  series: { field: string; label?: string }
}
data: { [xField]: string; [seriesField]: string; [yField]: number }[]
```
Example queries: *"Compare phase distribution for Drug A vs Drug B."*

### 5.3 `time_series`
```ts
encoding: {
  x: { field: "year" | "month"; label?: string },
  y: { field: string; label?: string },
  series?: { field: string; label?: string }   // optional multi-line
}
data: { [xField]: number | string; [yField]: number; [seriesField]?: string }[]
meta.time_granularity: "year" | "month";
```
Example queries: *"How has the number of pembrolizumab trials changed per year since 2015?"*

### 5.4 `histogram`
```ts
encoding: { x: { field: string; bin: { size: number } }, y: { field: "count" } }
data: { bin_start: number; bin_end: number; count: number }[]
```
Example queries: *"Distribution of enrollment counts for Alzheimer's trials."*

### 5.5 `scatter_plot`
```ts
encoding: {
  x: { field: string },
  y: { field: string },
  size?: { field: string },
  color?: { field: string }
}
data: { [xField]: number; [yField]: number; ... }[]
```
Example queries: *"Enrollment vs duration for cancer trials."*

### 5.6 `network_graph` — **the differentiator**
```ts
encoding: {
  nodes: { id_field: "id"; label_field: "label"; group_field: "type" },
  edges: { source_field: "source"; target_field: "target"; weight_field: "weight" }
}
data: {
  nodes: { id: string; label: string; type: "sponsor" | "drug" | "condition" | "investigator" | "site"; size?: number }[];
  edges: { source: string; target: string; weight: number }[];
}
```
Example queries: *"Show a network of sponsors and drugs for melanoma trials."*

### 5.7 `geo_map`
```ts
encoding: { location: { field: "country" }, value: { field: "trial_count" } }
data: { country: string; iso3?: string; trial_count: number }[]
```
Example queries: *"Which countries have the most recruiting trials for ALS?"*

---

## 6. The LLM Query Planner

### 6.1 Output schema (Zod)

```ts
const QueryPlanSchema = z.object({
  intent: z.enum([
    "distribution",        // group by single dimension
    "comparison",          // group by two dimensions
    "time_trend",          // group over time
    "geographic",          // group by country
    "relationship",        // network between entities
    "ranking",             // top-N
  ]),
  primary_entity: z.object({
    type: z.enum(["drug", "condition", "sponsor", "country", "phase", "status"]),
    value: z.string().nullable(),
  }),
  group_by: z.array(z.enum([
    "phase", "status", "country", "sponsor_class", "intervention_type",
    "year", "month", "condition", "sponsor", "drug"
  ])).min(1).max(2),
  filters: z.object({
    condition: z.string().nullable(),
    drug_name: z.string().nullable(),
    sponsor: z.string().nullable(),
    country: z.string().nullable(),
    phase: z.array(z.string()).default([]),
    status: z.array(z.string()).default([]),
    start_year: z.number().int().min(1900).max(2100).nullable(),
    end_year: z.number().int().min(1900).max(2100).nullable(),
  }),
  suggested_viz: z.enum([
    "bar_chart", "grouped_bar_chart", "time_series",
    "histogram", "scatter_plot", "network_graph", "geo_map"
  ]),
  title_hint: z.string().min(3).max(120),
  interpretation: z.string().min(5).max(240),
});
```

### 6.2 System prompt (canonical form)

```
You are a query planner for a clinical-trials data visualization system.
You DO NOT answer the user's question. You translate it into a structured plan.
You DO NOT invent data. You only describe what to fetch and how to group it.

Given a user question about clinical trials, output ONLY a JSON object matching
this schema (no prose, no markdown):

{schema_as_text}

Rules:
- "primary_entity.value" is the literal noun the user named (e.g., "Pembrolizumab"). If none, set null.
- "filters" must echo any explicit constraints from the question. Do not invent.
- "suggested_viz" should match the intent: distribution→bar_chart, comparison→grouped_bar_chart,
  time_trend→time_series, geographic→geo_map, relationship→network_graph.
- "interpretation" is a single sentence restating the user's question in plain English.
- If the question is ambiguous, pick the most common reasonable interpretation
  and note it in "interpretation".

Few-shot examples:
[3 examples covering bar / time_series / network]
```

### 6.3 Validation flow

1. Call OpenAI with `response_format: { type: "json_schema", json_schema: { strict: true, schema: ... } }`. The JSON Schema is hand-authored to mirror `QueryPlanSchema` while complying with OpenAI's strict-mode constraints (every object has `additionalProperties: false`, every field is in `required`, nullables use `type: [<base>, "null"]`).
2. Parse output with `QueryPlanSchema.safeParse` — this enforces the length/array-size constraints (e.g. `group_by` must have 1–2 items, `title_hint` 3–120 chars) that strict mode can't express.
3. On Zod failure: one retry with the error message appended to the user prompt.
4. On second failure: return 422 `PLAN_VALIDATION_FAILED`.

---

## 7. ClinicalTrials.gov Client

Uses the v2 API: `https://clinicaltrials.gov/api/v2/studies`

### Key endpoints used
- `GET /studies` — search with `query.term`, `filter.overallStatus`, `filter.phase`, `filter.geo`, etc.
- `GET /studies/{nctId}` — fetch full record (only for citation expansion when needed)

### Fields requested
We use the `fields` parameter to limit payload size. Default field set:
```
NCTId, BriefTitle, OverallStatus, Phase, StartDate, CompletionDate,
LeadSponsorName, LeadSponsorClass, Condition, InterventionName, InterventionType,
LocationCountry, EnrollmentCount, StudyType
```

### Pagination
- Page size: 100 (API max is 1000 but smaller pages = faster timeouts).
- Loop until `nextPageToken` is absent or `max_studies` cap reached.
- Total scan capped at 1000 by default — documented as a limitation.

### Translation from plan → API params
| Plan filter | API param |
|---|---|
| `drug_name` | `query.intr=<value>` |
| `condition` | `query.cond=<value>` |
| `sponsor` | `query.lead=<value>` |
| `country` | `filter.geo=distance(<country>,...)` or `query.locn=<country>` |
| `phase` | `filter.advanced=AREA[Phase]<phase>` |
| `status` | `filter.overallStatus=<status>` |
| `start_year` / `end_year` | post-filter in memory after fetch |

---

## 8. Aggregation Layer

Pure TypeScript reducers. **No LLM here.** All deterministic.

### Supported aggregators

| Aggregator | Output |
|---|---|
| `groupByPhase(studies)` | `{ phase, trial_count }[]` |
| `groupByStatus(studies)` | `{ status, trial_count }[]` |
| `groupByCountry(studies)` | `{ country, trial_count }[]` |
| `groupBySponsor(studies, topN=20)` | `{ sponsor, trial_count }[]` |
| `groupBySponsorClass(studies)` | `{ sponsor_class, trial_count }[]` |
| `groupByInterventionType(studies)` | `{ intervention_type, trial_count }[]` |
| `bucketByYear(studies, field='StartDate')` | `{ year, trial_count }[]` |
| `histogramOf(studies, field='EnrollmentCount', binSize=100)` | bins |
| `comparisonOf(studies, dimA, dimB)` | grouped bar data |
| `buildNetwork(studies, {sourceField, targetField})` | `{ nodes, edges }` |

### Network graph construction (sponsor ↔ drug example)
1. For each study: emit one edge per (sponsor, intervention) pair.
2. Deduplicate edges, summing weights.
3. Build nodes from unique IDs; tag with `type` for color-coding.
4. Trim long tail: keep top-N edges by weight (default 100) to avoid hairballs.

---

## 9. Citation Linker (Bonus)

For each datum in the final spec, attach the contributing trials.

Implementation:
- During aggregation, keep a side map: `bucketKey → Set<nctId>`.
- After spec is built, walk `data[]`, look up the bucket key, and emit up to 5 citations per datum.
- For each citation, pull a relevant excerpt:
  - Time-series datum (year=2021) → `BriefTitle` of one trial that started in 2021
  - Phase datum (PHASE3) → "Phase 3" appearance in `BriefTitle` or `Phase` field value
  - Network edge → `BriefTitle` of one trial linking those two entities

Cap total citations at 50 per response to control payload size.

---

## 10. Monorepo / Folder Structure

The repo is a **pnpm workspaces monorepo** with three packages:

- `apps/backend` — NestJS service (follows the `nestar` repo style: `src/` with modules, each module has its own `*.module.ts`, `*.service.ts`, `*.controller.ts`, and a sub-folder for `dto/`, `schemas/`, etc.)
- `apps/web` — Next.js demo UI with Tailwind + shadcn (follows the `nestar-next` repo style: a top-level `libs/` directory holding `components/`, `enums/`, `hooks/`, `types/`)
- `packages/shared` — Shared types, enums, and Zod schemas consumed by **both** apps via a workspace dependency (`@ct-agent/shared`)

### Top-level layout

```
ct-agent/                              # monorepo root
├── apps/
│   ├── backend/                       # NestJS service (style of nestar repo)
│   └── web/                           # Next.js demo UI (style of nestar-next repo)
├── packages/
│   └── shared/                        # Cross-package types, enums, Zod schemas
├── examples/                          # 5 example queries (input + output JSON)
├── pnpm-workspace.yaml
├── package.json                       # workspaces root, "packageManager": "pnpm@..."
├── tsconfig.base.json                 # shared compiler options
├── docker-compose.yml                 # spins up backend (+ optional web)
├── .env.example
├── .prettierrc                        # matches nestar repo
├── .eslintrc.js                       # matches nestar repo
└── README.md
```

### `apps/backend/` (NestJS — style of `nestar` repo)

Each domain is its own module folder with `*.module.ts`, `*.service.ts`, and (where applicable) `*.controller.ts`. Same naming convention as nestar.

```
apps/backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   │
│   ├── config/
│   │   ├── config.module.ts
│   │   └── env.validation.ts          # Zod-validated env vars
│   │
│   ├── query/                         # main entry: POST /api/query
│   │   ├── query.module.ts
│   │   ├── query.controller.ts
│   │   ├── query.service.ts           # orchestrator (planner → fetch → aggregate → build)
│   │   └── dto/
│   │       ├── query-request.dto.ts   # class-validator DTO
│   │       └── query-response.dto.ts
│   │
│   ├── planner/                       # LLM query planner
│   │   ├── planner.module.ts
│   │   ├── planner.service.ts         # OpenAI call + Zod validation + retry
│   │   ├── schemas/
│   │   │   └── query-plan.schema.ts   # re-exports from @ct-agent/shared
│   │   └── prompts/
│   │       ├── system-prompt.ts
│   │       └── few-shot-examples.ts
│   │
│   ├── clinicaltrials/                # ClinicalTrials.gov API client
│   │   ├── clinicaltrials.module.ts
│   │   ├── clinicaltrials.service.ts  # axios wrapper + pagination
│   │   ├── mappers/
│   │   │   └── plan-to-params.mapper.ts
│   │   └── types/
│   │       └── study.types.ts
│   │
│   ├── aggregator/                    # pure-TS reducers (no LLM)
│   │   ├── aggregator.module.ts
│   │   ├── aggregator.service.ts
│   │   └── strategies/
│   │       ├── group-by-phase.strategy.ts
│   │       ├── group-by-status.strategy.ts
│   │       ├── group-by-country.strategy.ts
│   │       ├── group-by-sponsor.strategy.ts
│   │       ├── bucket-by-year.strategy.ts
│   │       ├── histogram.strategy.ts
│   │       ├── comparison.strategy.ts
│   │       └── build-network.strategy.ts
│   │
│   ├── visualization/                 # picks viz type, shapes spec, links citations
│   │   ├── visualization.module.ts
│   │   ├── visualization.service.ts   # viz-builder
│   │   └── citation-linker.service.ts
│   │
│   └── common/                        # cross-cutting concerns
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── interceptors/
│       │   └── logging.interceptor.ts
│       ├── pipes/
│       │   └── zod-validation.pipe.ts
│       └── errors.ts
│
├── test/
│   ├── planner.spec.ts                # mocked OpenAI; Zod validation paths
│   ├── aggregator.spec.ts             # pure-function unit tests
│   └── clinicaltrials.spec.ts         # mocked axios
│
├── Dockerfile
├── nest-cli.json
├── package.json                       # "@ct-agent/shared": "workspace:*"
├── tsconfig.json
└── tsconfig.build.json
```

### `apps/web/` (Next.js — style of `nestar-next` repo)

Mirrors the nestar-next pattern: top-level `libs/` directory with `components/`, `hooks/`, `types/`, `enums/`. Uses **App Router** (latest Next.js convention) plus Tailwind and shadcn/ui.

```
apps/web/
├── app/                               # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                       # the demo: textbox → chart
│   ├── globals.css                    # Tailwind directives
│   └── api/
│       └── proxy/route.ts             # optional: proxies to backend to hide CORS
│
├── libs/                              # same pattern as nestar-next
│   ├── components/
│   │   ├── ui/                        # shadcn-generated primitives (button, input, card, etc.)
│   │   ├── query/
│   │   │   ├── QueryInput.tsx         # textbox + submit
│   │   │   └── ResultPanel.tsx
│   │   ├── viz/
│   │   │   ├── BarChartView.tsx       # Recharts
│   │   │   ├── GroupedBarChartView.tsx
│   │   │   ├── TimeSeriesView.tsx
│   │   │   ├── HistogramView.tsx
│   │   │   ├── ScatterPlotView.tsx
│   │   │   ├── GeoMapView.tsx
│   │   │   ├── NetworkGraphView.tsx   # react-force-graph
│   │   │   └── VisualizationRenderer.tsx  # switch on viz.type → correct view
│   │   ├── citations/
│   │   │   └── CitationList.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   ├── hooks/
│   │   ├── useQueryAgent.ts           # calls backend /api/query
│   │   └── useDeviceDetect.ts
│   ├── api/
│   │   └── client.ts                  # axios/fetch wrapper
│   ├── enums/                         # frontend-specific enums (if any)
│   └── config.ts                      # API base URL, defaults
│
├── public/
├── components.json                    # shadcn config
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── package.json                       # "@ct-agent/shared": "workspace:*"
└── tsconfig.json
```

### `packages/shared/` (cross-app types & schemas)

The single source of truth for anything both backend and frontend need: viz spec types, the request/response shapes, the Zod query-plan schema, and shared enums. Both apps import via `@ct-agent/shared`.

```
packages/shared/
├── src/
│   ├── index.ts                       # barrel re-exports
│   ├── types/
│   │   ├── visualization.types.ts     # VizType, Encoding, DataPoint, VizSpec
│   │   ├── query.types.ts             # QueryRequest, QueryResponse, ErrorResponse
│   │   ├── citation.types.ts
│   │   └── study.types.ts
│   ├── schemas/
│   │   ├── query-plan.schema.ts       # Zod — used by backend to validate LLM output
│   │   ├── query-request.schema.ts    # Zod — used by both backend (DTO) and frontend (form)
│   │   └── viz-spec.schema.ts
│   └── enums/
│       ├── viz-type.enum.ts           # bar_chart, time_series, network_graph, ...
│       ├── phase.enum.ts              # PHASE1, PHASE2, ...
│       ├── status.enum.ts             # RECRUITING, COMPLETED, ...
│       └── intent.enum.ts             # distribution, comparison, time_trend, ...
├── package.json                       # "name": "@ct-agent/shared", "main": "src/index.ts"
└── tsconfig.json
```

### Workspace wiring

`pnpm-workspace.yaml` at the root:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Root `package.json` scripts:
```json
{
  "name": "ct-agent",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev:backend": "pnpm --filter backend start:dev",
    "dev:web": "pnpm --filter web dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test"
  }
}
```

Each app declares the shared package as a workspace dep:
```json
"dependencies": { "@ct-agent/shared": "workspace:*" }
```

### Why this layout matches the assignment

- **Backend modular structure** mirrors `nestar`: each concern is its own module with `*.module.ts` / `*.service.ts` / `*.controller.ts`. Easy to extend with new query types or viz types — just add a strategy file.
- **Frontend `libs/` pattern** mirrors `nestar-next`: components organized by domain (`viz/`, `query/`, `citations/`), hooks separated, config centralized.
- **Shared package** means the frontend's `VizSpec` type is **literally the same TypeScript type** the backend returns — no drift, no manual sync. Reviewers see this immediately as serious system design.
- **Latest versions** of NestJS, Next.js, Tailwind, shadcn, Zod, TypeScript installed via `pnpm add <pkg>@latest`.

---



## 11. Example Queries to Support (in README)

These are the 5 examples to ship in `/examples` with full input + output JSON:

| # | Query | Viz |
|---|---|---|
| 1 | "How are trials for Pembrolizumab distributed across phases?" | bar_chart |
| 2 | "How has the number of trials for Pembrolizumab changed per year since 2015?" | time_series |
| 3 | "Compare phase distribution for Pembrolizumab vs Nivolumab." | grouped_bar_chart |
| 4 | "Which countries have the most recruiting trials for Alzheimer's disease?" | geo_map |
| 5 | "Show a network of sponsors and drugs for melanoma trials since 2020." | network_graph |

---

## 12. Error Handling

| Condition | HTTP | Code |
|---|---|---|
| Missing/invalid `query` | 400 | `INVALID_INPUT` |
| LLM output fails Zod twice | 422 | `PLAN_VALIDATION_FAILED` |
| ClinicalTrials.gov 4xx/5xx | 502 | `UPSTREAM_FAILURE` |
| Zero studies match | 200 | (empty `data` + `meta.assumptions` note) |
| Uncaught | 500 | `INTERNAL` |

Every error response uses the canonical error shape (Section 4.2).

---

## 13. Configuration (.env)

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
CT_API_BASE_URL=https://clinicaltrials.gov/api/v2
PORT=3000
MAX_STUDIES_DEFAULT=500
MAX_STUDIES_HARD_CAP=1000
LOG_LEVEL=info
```

Validate at boot with a Zod env schema; fail fast if `OPENAI_API_KEY` is missing.

---

## 14. Deployment

### Local (monorepo)

From the repo root:

```bash
cp .env.example .env       # fill in OPENAI_API_KEY
corepack enable            # enables pnpm
pnpm install               # installs all workspaces
pnpm dev:backend           # runs NestJS in watch mode
pnpm dev:web               # (in another terminal) runs Next.js
```

Or with Docker:

```bash
docker compose up          # starts backend (and optionally web)
```

### Backend on Render

- Type: Web Service, Node runtime.
- Root directory: `apps/backend` (or use a Dockerfile build).
- Build command: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter backend build`
- Start command: `pnpm --filter backend start:prod`
- Env vars: `OPENAI_API_KEY`, `OPENAI_MODEL`, `CT_API_BASE_URL`, `PORT`.
- Health check: `GET /health` returns `{ status: "ok" }`.

### Frontend on Vercel (bonus demo)

- Root directory: `apps/web`.
- Framework preset: Next.js.
- Install command: `corepack enable && pnpm install --frozen-lockfile`
- Build command: `pnpm --filter web build`
- Env var: `NEXT_PUBLIC_API_URL=https://<your-render-url>`.

---

## 15. README Sections (deliverable)

The `README.md` shipped in the zip must contain, in order:

1. **Overview** — one paragraph of what it is.
2. **Quickstart** — exact commands to run locally + Docker option + live URL if deployed.
3. **Architecture diagram** — the ASCII diagram from Section 2.
4. **Request/Response schema** — full schemas from Section 4 with one example each.
5. **Supported visualization types** — table from Section 5.
6. **Supported query classes** — table from Section 11 with example phrasings.
7. **Key design decisions & tradeoffs:**
   - LLM is a translator, not a data source (explain the hallucination-prevention rationale)
   - Zod validation on every LLM output with one-retry policy
   - Aggregation is pure TypeScript, deterministic, unit-testable
   - In-memory filtering for date ranges instead of fragile API filter strings
   - Network graph truncated to top-N edges to stay legible
   - Citations attached post-hoc via a bucketKey→nctId side-map
8. **Limitations & future work:**
   - Hard cap of 1000 studies per query (could stream with cursors)
   - Country normalization is naive (no ISO-3 mapping yet)
   - No cross-query memoization yet
   - Few-shot prompt is hand-tuned; could become a learned router
   - Network graphs lack a clustering pass
9. **AI tools used:**
   - Briefly: which tools (Claude, Cursor, etc.), what they generated vs what was hand-designed
   - Honest statement: the schemas, prompt, and architecture are designed deliberately; boilerplate (DTOs, scaffolding, Dockerfile) was AI-assisted
10. **Validation / how I verified correctness:**
    - Unit tests for aggregators (golden inputs → expected outputs)
    - Manual spot-checks of 5 example queries against ClinicalTrials.gov website
    - Zod schema tests for malformed LLM output

---

## 16. Evaluation Criteria Mapping

How each rubric item is addressed:

| Criterion | Weight | Where it's earned |
|---|---|---|
| System Design | 35% | Modular NestJS layout (§10), clean orchestrator pattern (§2), canonical viz spec (§5) |
| AI/Agent Design | 20% | LLM-as-translator pattern (§2), Zod validation + retry (§6.3), no LLM in data path (§8) |
| Code Quality | 20% | Unit tests (§10), DTOs + class-validator, typed everything, README clarity |
| Query/Viz Coverage | 15% | 7 viz types (§5), 5 demoed query classes (§11), network graph for differentiation |
| I/O Design | 10% | Documented schemas (§4), canonical encoding object, frontend-friendly data shape |
| **Bonus: Citations** | — | §9, attached as `citations[]` in every response by default |

---

## 17. Submission Checklist

- [ ] GitHub repo (public on submit) OR zip file
- [ ] Monorepo with `apps/backend`, `apps/web`, `packages/shared`, `pnpm-workspace.yaml`
- [ ] `README.md` with all 10 sections
- [ ] `examples/` with 5 JSON files (input + output pairs)
- [ ] `Dockerfile` + `docker-compose.yml`
- [ ] `.env.example`
- [ ] Working `pnpm install && pnpm dev:backend`
- [ ] Backend deployed on Render — URL in README
- [ ] (Bonus) Frontend deployed on Vercel — URL in README
- [ ] Submitted via Ashby before the 24-hour window closes

