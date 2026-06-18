# CASCADE clean-air-in-schools calculator

Interactive companion to the CASCADE decision model (Henderson et al., in preparation): a
single-page, dependency-free calculator that turns a classroom's measured air-quality
improvement into an economic case for a clean-air intervention.

**Live tool:** https://austinhendersoneconomist.github.io/cascade-calculator/

## What it does
- Enter measured air-quality gains (baseline ventilation, delivered clean-air gain, CO2
  reduction, feasibility) and read off net social benefit, benefit-cost ratio, break-even
  transmission reduction, and a benefit composition (averted illness / cognitive gain /
  community transmission) net of cost.
- The four keystone parameters (kappa, sigma, pi, rho_c) are flagged as not-yet-well-estimated;
  a Monte-Carlo band shows how the answer moves across their plausible ranges.
- Presets for HEPA, mechanical ventilation, natural ventilation, and outdoor classrooms.
- "Copy shareable link" encodes the current scenario in the URL for reproducibility.

## Important
All values are **illustrative placeholders in generic monetary units (MU)**, not findings and
not jurisdiction-specific. The tool demonstrates the *structure* of the economic case; the
flagged parameters are exactly what a definitive primary study would estimate. Once they are
pinned down, a school could measure only its own air-quality improvement and read a credible
economic estimate off the model.

## Files
- `index.html` — the entire app (no build step, no dependencies, works offline).

Equations match `verification/phase25_model_numerics.py` in the manuscript repository.
