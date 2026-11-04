# Work programme: credits sprint (November 2026)

Branch: `claude/cloud-code-credits-bf8mky`. This file is updated as work proceeds so that
the programme can be resumed if the session ends before the finish line.

## Workstreams

| # | Workstream | Deliverables | Status |
|---|------------|--------------|--------|
| 1 | Evidence verification | `docs/evidence-verification.md`: study-by-study check of the 18 DOIs cited on the site (bibliographic details, design, endpoint, how the site characterises it, discrepancies, recommended wording). Framed as a second, independent AI-assisted source check to *support*, not replace, human verification. | Planned |
| 2 | Probabilistic sensitivity analysis (PSA) | `psa.mjs` (seeded RNG, beta/gamma/lognormal/normal/uniform/triangular distributions, Monte Carlo over `model.compute`), CEAC/acceptability curve over the monetary value of a QALY, EVPI, single-parameter EVPPI (nonparametric binning estimator), PSA panel in the calculator, `tests/` with `node --test`. | Planned |
| 3 | Journal-ready manuscript | `manuscript/`: methods/software paper describing CASCADE and the PSA extension, CHEERS 2022 checklist, references (BibTeX), rendered via pandoc. Draft for the author's revision; it does not replace manuscript draft v3. | Planned |
| 4 | Creative project: "A Day in Room 12" | Interactive, time-resolved classroom air simulator (`classroom-day.html`): a well-mixed box model of CO₂, PM2.5 and infectious quanta over a school day with a schedule of lessons, breaks, window opening and HEPA operation; animated room, live gauges and a Wells–Riley dose curve. Makes the "operating times matter" point from the research page tangible. | Planned |
| 5 | Stretch goals | (a) Audit the JBEP supplemental materials document in `Research`; (b) a value-of-information "what research should NZ fund next?" explainer; (c) accessibility and mobile QA across all pages. | Planned |

## Principles
- No change alters the calculator's default deterministic results or model/link schema 0.7.
- Every new number has a stated source or is labelled as an assumption.
- Tests run with `node --test tests/`.

## Log
- 2026-11-04: Repository reviewed; plan written.
