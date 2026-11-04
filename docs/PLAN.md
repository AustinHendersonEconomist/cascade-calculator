# Work programme: credits sprint (November 2026)

Branch: `claude/cloud-code-credits-bf8mky`. This file is updated as work proceeds so that
the programme can be resumed if the session ends before the finish line.

## Workstreams

| # | Workstream | Deliverables | Status |
|---|------------|--------------|--------|
| 1 | Evidence verification | `docs/evidence-verification.md`: study-by-study check of the 18 DOIs cited on the site (bibliographic details, design, endpoint, how the site characterises it, discrepancies, recommended wording). Framed as a second, independent AI-assisted source check to *support*, not replace, human verification. | Done (e499740) |
| 2 | Probabilistic sensitivity analysis (PSA) | `psa.mjs` (seeded RNG, beta/gamma/lognormal/normal/uniform/triangular distributions, Monte Carlo over `model.compute`), CEAC/acceptability curve over the monetary value of a QALY, EVPI, single-parameter EVPPI (nonparametric binning estimator), PSA panel in the calculator, `tests/` with `node --test`. | Done |
| 3 | Journal-ready manuscript | `manuscript/`: methods/software paper describing CASCADE and the PSA extension, CHEERS 2022 checklist, references (BibTeX), rendered via pandoc. Draft for the author's revision; it does not replace manuscript draft v3. | Done (draft) |
| 4 | Creative project: "A Day in Room 12" | Interactive, time-resolved classroom air simulator (`classroom-day.html`): a well-mixed box model of CO₂, PM2.5 and infectious quanta over a school day with a schedule of lessons, breaks, window opening and HEPA operation; animated room, live gauges and a Wells–Riley dose curve. Makes the "operating times matter" point from the research page tangible. | Planned |
| 5 | Stretch goals | (a) Audit the JBEP supplemental materials document in `Research`; (b) a value-of-information "what research should NZ fund next?" explainer; (c) accessibility and mobile QA across all pages. | Planned |

## Principles
- No change alters the calculator's default deterministic results or model/link schema 0.7.
- Every new number has a stated source or is labelled as an assumption.
- Tests run with `node --test tests/`.

## Log
- 2026-11-04: Repository reviewed; plan written.
- 2026-11-04: Push to GitHub refused (403: Claude GitHub App lacks access to the repo). Work is committed locally on the branch; push once access is restored.
- 2026-11-04: Evidence log complete. The session's network blocks Crossref, PubMed and publisher sites, so verification used web-search indexes. Main finding: Lei (2024) and Wang (2026) are one trial. SICAS-2 and FRESH labels fixed.
- 2026-11-04: PSA engine and UI complete; 29 tests pass (`npm test`). Default-envelope results: S1 P(NPV>0)=29.6%, EVPI 228 MU/cohort; S2 90.4%; S5 (null RR, lognormal SD 0.3) has a very wide NPV interval because the matched-ratio route applies uncertainty to all baseline episodes.
- 2026-11-04: Methodological findings while building the PSA: (1) the binning EVPPI estimator overstates weak parameters by orders of magnitude when one parameter dominates; switched to spline regression. (2) A mean-centred lognormal tilts a null ratio towards benefit; switched to median-centred. Manuscript drafted (`manuscript/`), rendered to docx/pdf/html with CHEERS checklist.
