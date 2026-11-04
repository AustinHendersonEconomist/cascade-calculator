# Manuscript

Draft methods paper: *What would we need to know? Probabilistic and value-of-information analysis for school clean-air investment decisions* (target: *Applied Health Economics and Health Policy*).

| File | Content |
|---|---|
| `manuscript.md` | Source (Pandoc Markdown, citations in `references.bib`) |
| `manuscript.docx`, `manuscript.pdf`, `manuscript.html` | Rendered versions |
| `supplement-cheers.*` | Supplementary Table S1, CHEERS 2022 checklist |
| `analysis/run-analyses.mjs` | Reproduces every number (writes `analysis/results.json`; draws to `analysis/draws-*.csv`, git-ignored) |
| `analysis/figures.py` | Figures 1–4, S1 and the Python EVPPI cross-check |

## Rebuild

```sh
node manuscript/analysis/run-analyses.mjs
python3 manuscript/analysis/figures.py   # needs numpy, matplotlib
cd manuscript && pandoc manuscript.md --citeproc --csl vancouver-brackets.csl -o manuscript.docx
pandoc manuscript.md --citeproc --csl vancouver-brackets.csl -s --mathml --css manuscript.css --embed-resources -o manuscript.html
```

PDF: print `manuscript.html` from Chromium (A4). Placeholders marked `[To be completed]` need author input (funding, conflicts, contributions, AI-use statement).
