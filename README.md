# ClinicalTrials.gov Query-to-Visualization Agent

A backend service that converts natural-language questions about clinical trials into
**structured visualization specifications** backed by the live ClinicalTrials.gov v2 API.
The LLM is used **only as a translator** (text → query plan); it never produces numbers
or summarizes trial content.

## Live deployment

- Backend API: https://clinical-trials-agent-backend.onrender.com
- Frontend demo: https://web-six-umber-cggiotta9d.vercel.app

---

## Quickstart

```bash
# 1. Configure
cp .env.example .env
# edit .env and set OPENAI_API_KEY

# 2. Install
corepack enable           # enables pnpm
pnpm install

# 3. Run (dev)
pnpm dev:backend          # NestJS in watch mode on PORT (default 3000)
pnpm dev:web              # Next.js demo UI on port 3001
```

Or with Docker:

```bash
docker compose up --build
```

Smoke test:

```bash
curl -s http://localhost:3000/health
# { "status": "ok", ... }

curl -s -X POST http://localhost:3000/api/query \
  -H 'content-type: application/json' \
  -d '{"query":"How are trials for Pembrolizumab distributed across phases?"}' | jq .
```

---

## Architecture

```
┌──────────────┐    ┌────────────────────┐    ┌──────────────────────────┐
│  HTTP Client │ ─► │  NestJS Controller │ ─► │  Query Orchestrator      │
└──────────────┘    │  POST /api/query   │    │  (QueryService)          │
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

### Request lifecycle

1. Validate request (NestJS DTO + class-validator).
2. **Plan** with OpenAI using **strict `json_schema` structured outputs**; output is then re-validated by a Zod schema (for length / array-size constraints that strict mode can't express).
3. On Zod failure, retry once with the validation error appended. Second failure → 422.
4. **Fetch** matching studies from ClinicalTrials.gov, paginated (page size 100).
5. **Aggregate** in pure TypeScript (no LLM).
6. **Build viz spec** — type chosen from intent (+ optional user override), data shaped per encoding.
7. **Attach citations** (top-K NCT IDs per datum) using a `bucketKey → Set<nctId>` side map.

---

## Request / Response

### `POST /api/query`

**Request:**

```json
{
  "query": "How has the number of trials for Pembrolizumab changed per year since 2015?",
  "filters": {
    "drug_name": "Pembrolizumab",
    "start_year": 2015
  },
  "options": {
    "max_studies": 500,
    "include_citations": true
  }
}
```

**Request schema:**

| Field | Type | Required | Validation / meaning |
|---|---:|---:|---|
| `query` | `string` | yes | Natural-language clinical-trials question, 1-500 characters. |
| `filters.condition` | `string` | no | Disease/condition term sent to ClinicalTrials.gov `query.cond`. |
| `filters.drug_name` | `string` | no | Drug/intervention term sent to ClinicalTrials.gov `query.intr`. |
| `filters.sponsor` | `string` | no | Lead sponsor term sent to ClinicalTrials.gov `query.lead`. |
| `filters.country` | `string` | no | Location term sent to ClinicalTrials.gov `query.locn`. |
| `filters.phase` | `Phase[]` | no | Any of `EARLY_PHASE1`, `PHASE1`, `PHASE2`, `PHASE3`, `PHASE4`, `NA`; max 10. |
| `filters.status` | `Status[]` | no | Any of `RECRUITING`, `COMPLETED`, `TERMINATED`, `ACTIVE_NOT_RECRUITING`, `WITHDRAWN`, `NOT_YET_RECRUITING`; max 10. |
| `filters.start_year` | `integer` | no | Inclusive lower bound, 1900-2100. Applied post-fetch to normalized start dates. |
| `filters.end_year` | `integer` | no | Inclusive upper bound, 1900-2100; must be greater than or equal to `start_year`. |
| `options.max_studies` | `integer` | no | Fetch cap, 10-1000. Defaults to `MAX_STUDIES_DEFAULT`, hard-capped by `MAX_STUDIES_HARD_CAP`. |
| `options.include_citations` | `boolean` | no | Defaults to `true`; when true, returns source records per visual datum. |
| `options.preferred_viz` | `VizType` | no | Optional override among `bar_chart`, `grouped_bar_chart`, `time_series`, `histogram`, `scatter_plot`, `network_graph`, `geo_map`. |

**Response (200):**

```json
{
  "visualization": {
    "type": "time_series",
    "title": "Pembrolizumab trials per year (since 2015)",
    "encoding": {
      "x": { "field": "year", "label": "Year" },
      "y": { "field": "trial_count", "label": "Number of trials" }
    },
    "data": [
      { "year": 2015, "trial_count": 23 },
      { "year": 2016, "trial_count": 41 }
    ]
  },
  "meta": {
    "source": "clinicaltrials.gov",
    "api_version": "v2",
    "filters_applied": { "drug_name": "Pembrolizumab", "start_year": 2015 },
    "query_interpretation": "Count Pembrolizumab trials grouped by start year, from 2015 onward.",
    "total_studies_scanned": 500,
    "total_studies_used": 487,
    "assumptions": [
      "Excluded 13 trial(s) outside the requested year range (post-fetch)."
    ],
    "generated_at": "2026-05-25T15:00:00.000Z",
    "latency_ms": 2310,
    "time_granularity": "year"
  },
  "citations": [
    {
      "datum_key": "year=2016",
      "references": [
        {
          "nct_id": "NCT02XXXXXXX",
          "excerpt": "2016-01-01 — A Study of Pembrolizumab in ...",
          "field": "StartDate"
        }
      ]
    }
  ]
}
```

**Error response (4xx/5xx):**

```json
{ "error": { "code": "UPSTREAM_FAILURE", "message": "ClinicalTrials.gov request failed (503): ..." } }
```

Error codes: `INVALID_INPUT`, `PLAN_VALIDATION_FAILED`, `UPSTREAM_FAILURE`, `NO_DATA`, `INTERNAL`.

### Response schema notes

`visualization.type` selects the renderer. `visualization.encoding` maps fields to visual
channels (`x`, `y`, `series`, `location`, `value`, `nodes`, `edges`). `visualization.data`
is either an array of rows for chart/map types, or `{ "nodes": [...], "edges": [...] }`
for `network_graph`. `meta.filters_applied`, `meta.query_interpretation`, and
`meta.assumptions` explain how the query was interpreted and whether the scan was truncated.
When present, `citations[]` maps each datum key (for example `phase=PHASE2` or
`edge:sponsor:Acme->drug:X`) to up to five contributing ClinicalTrials.gov records with
`nct_id`, source `field`, and a short field/value excerpt.

---

## Visualization types

| Type | Use case |
|---|---|
| `bar_chart` | Single-dimension distribution / ranking |
| `grouped_bar_chart` | Two-dimension comparison (e.g., drug A vs drug B by phase) |
| `time_series` | Trial counts over years |
| `histogram` | Distribution of a numeric field (e.g., enrollment) |
| `scatter_plot` | Two numeric variables (e.g., enrollment vs duration) |
| `network_graph` | Bipartite relationships (sponsors ↔ drugs, etc.) |
| `geo_map` | Counts by country |

The viz spec is **canonical**: any frontend can render from `{type, encoding, data}` alone.

---

## Supported query classes

| # | Example query | Viz |
|---|---|---|
| 1 | "How are trials for Pembrolizumab distributed across phases?" | `bar_chart` |
| 2 | "How has the number of trials for Pembrolizumab changed per year since 2015?" | `time_series` |
| 3 | "Compare phase distribution for Pembrolizumab vs Nivolumab." | `grouped_bar_chart` |
| 4 | "Which countries have the most recruiting trials for Alzheimer's disease?" | `geo_map` |
| 5 | "Show a network of sponsors and drugs for melanoma trials since 2020." | `network_graph` |

---

## Key design decisions & tradeoffs

- **LLM is a translator, not a data source.** It only produces a `QueryPlan`. All counts,
  groupings, and time bins are computed by deterministic TypeScript reducers from the raw
  ClinicalTrials.gov payload. This is the single most important hallucination-prevention
  choice in the system.
- **Strict JSON-schema structured outputs + Zod belt-and-suspenders.** The planner calls
  OpenAI with `response_format: { type: "json_schema", strict: true }` so the model can't
  emit wrong-shape JSON. The same payload is then re-validated by `QueryPlanSchema` to
  enforce length/array-size constraints OpenAI's strict mode can't express. On parse failure
  the planner retries once with the validation errors appended; a second failure returns
  `422 PLAN_VALIDATION_FAILED`.
- **Aggregation is pure TypeScript.** Each strategy returns `{ data, buckets }`, where
  `buckets` is a `bucketKey → Set<nctId>` map used for downstream citation linking.
  All strategies are unit-tested with golden inputs.
- **In-memory date filtering.** `start_year` / `end_year` filters are applied post-fetch
  because the API's date filter expression is fragile. The cost (a few extra studies in
  memory) is reported as an explicit assumption in `meta.assumptions`.
- **Network graph truncation.** Top-N edges by weight (default 100) are kept to avoid a
  hairball. Node `size` is summed edge weight.
- **Comparison fan-out.** When the planner picks a `comparison` intent against `drug`,
  `condition`, or `sponsor`, the orchestrator extracts the two compared terms from the
  plan's title/interpretation and OR-expands them into the corresponding CT.gov v2 query
  parameter (`query.intr` / `query.cond` / `query.lead`). It also passes the term list as
  a series-filter into the aggregator so sub-conditions ("Breast Cancer", "Lung Cancer", …)
  collapse back to the user's parent label ("cancer"). The expansion is reported in
  `meta.assumptions`.
- **Truncation transparency.** If the fetch loop stops because `max_studies` was reached
  while CT.gov still had a `nextPageToken`, the response surfaces
  `"Scan stopped at max_studies=N; more matches may exist on ClinicalTrials.gov."` in
  `meta.assumptions` — even when CT.gov doesn't report `totalCount`.
- **Citations attached post-hoc.** Each datum's key (e.g. `phase=PHASE3`, `year=2021`,
  `edge:sponsor:Acme->drug:X`) maps to the contributing NCT IDs, then we pull up to 5
  excerpts per datum, capped at 50 total to control payload size.

---

## Limitations & future work

- Hard cap of 1000 studies per query (configurable; could stream with cursors).
- Country normalization is naive — no ISO-3 mapping or alias collapse yet.
- No cross-query memoization / caching layer yet.
- The few-shot prompt is hand-tuned; it could become a learned router.
- Network graphs lack a clustering pass.

---

## AI tools used

- **Claude Code (Opus 4.7)** generated the bulk of the scaffolding: NestJS module wiring,
  DTOs, Dockerfile, test stubs, and the routine TypeScript types.
- The **schemas (Zod), the system prompt, and the architecture** were designed deliberately;
  AI implemented them after the design was set.

---

## Verifying correctness

- **Unit tests** for every aggregator and the planner retry path:
  ```bash
  pnpm --filter backend test
  ```
- **Manual spot-checks** of the 5 example queries against ClinicalTrials.gov website.
- **Zod schema tests** for malformed LLM output (planner.spec.ts).

---

## Repository layout

```
clinical-trials-agent/
├── apps/
│   └── backend/                       # NestJS service
├── packages/
│   └── shared/                        # @ct-agent/shared — cross-app types, enums, Zod schemas
├── examples/                          # Example query bodies plus outputs/ with actual JSON responses
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── docker-compose.yml
└── .env.example
```
