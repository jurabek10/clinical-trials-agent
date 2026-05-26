# Example queries

Each `0*.json` file is a ready-to-POST body for `POST /api/query`.
The matching actual outputs from a live run are in `outputs/*.output.json`.

```bash
for f in examples/0*.json; do
  echo "=== $f ==="
  curl -s -X POST http://localhost:3000/api/query \
    -H 'content-type: application/json' \
    -d @"$f" | jq '{type: .visualization.type, title: .visualization.title, used: .meta.total_studies_used}'
done
```

Expected visualization types:

| Request | Output | Type |
|---|---|---|
| `01-pembrolizumab-by-phase.json` | `outputs/01-pembrolizumab-by-phase.output.json` | `bar_chart` |
| `02-pembrolizumab-per-year.json` | `outputs/02-pembrolizumab-per-year.output.json` | `time_series` |
| `03-pembrolizumab-vs-nivolumab.json` | `outputs/03-pembrolizumab-vs-nivolumab.output.json` | `grouped_bar_chart` |
| `04-alzheimers-recruiting-by-country.json` | `outputs/04-alzheimers-recruiting-by-country.output.json` | `geo_map` |
| `05-melanoma-sponsor-drug-network.json` | `outputs/05-melanoma-sponsor-drug-network.output.json` | `network_graph` |
