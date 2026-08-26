# GEO share-of-voice

Monthly measurement of galileoprotocol.io / Galileo Protocol visibility in AI
assistants with web search (fetched / cited / mentioned), against the frozen
prompt panel in `PANEL.json`. This is the **measurement** signal; the
Trends/News watch in `blogidea.md` is the production signal.

## How it works

- `PANEL.json` is frozen: domain, brand regex, providers, prompts by category
  (marque / categorie / tache / geo). Its SHA-256 is recorded in every run;
  a run-to-run diff requires the same SHA-256. Never edit the panel to move a
  number.
- Each run lives in `runs/<YYYY-MM-DD>/`: raw API receipts in `receipts/`
  (cached; incomplete ones are replayed), `RESULTS.json` (deterministic
  classification + verdict PASS/FAIL/UNPROVEN) and `REPORT.md` (rates by
  provider and category, line-by-line comparison vs the previous run,
  caveats).

## Replay (monthly cadence)

```sh
python3 ~/.agents/skills/mesurer-part-de-voix-geo/scripts/geo_sov.py --site geo
```

See the `mesurer-part-de-voix-geo` skill for the full protocol.

## Required keys

`OPENAI_API_KEY` and `ANTHROPIC_API_KEY` from the environment (Pierre sources
them from `bench-providers.env`) — never committed, never printed.

**First run status: UNPROVEN** — `bench-providers.env` is not provisioned on
this machine yet, so no live call has been made. The first run happens once
the keys are available; until then there is no baseline, only the frozen
panel.
