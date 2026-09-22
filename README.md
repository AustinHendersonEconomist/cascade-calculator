# CASCADE clean-air decision explorer

[Open the calculator](https://austinhendersoneconomist.github.io/cascade-calculator/)

CASCADE explores the conditions under which a specified school clean-air intervention could justify its costs. It is a companion to a methodological framework in development, with a targeted narrative synthesis and hypothetical demonstrations.

## Pages

- **Calculator:** explicit costs, outcome assumptions, break-even thresholds, deterministic sensitivity analysis, saved comparisons and scenario exports.
- **Research:** the framework, evidence compatibility, valuation scope and worked manuscript examples.
- **NZ classroom:** a separate cost and break-even application in New Zealand dollars for a defined older classroom. Sources and supplier prices are dated 13 September 2026.

## Interpretation

The calculator uses generic monetary units (MU), not a calibrated currency or school-specific benefit estimate. Choose one outcome route: an assumption-based steady-state airflow scenario, an endpoint-compatible infection episode-rate ratio, or an absence ratio. The latter two require justified inputs; no study is automatically selected.

There is no automatic CO₂-to-learning conversion, attendance-to-earnings calculation or onward-transmission multiplier. Optional terminal achievement is valued once for the stated cohort and horizon. Null and adverse effects are supported. Sensitivity bounds are not confidence intervals or probability distributions. Annual service costing is distinct from an upfront school purchase budget.

The evidence synthesis is purposive and AI-assisted; independent human verification remains pending. Positive calculated net values are conditional scenarios, not findings that an intervention is cost-beneficial in practice.

## Running locally

Serve the repository with a static HTTP server, for example `python -m http.server 8000`, then open `http://localhost:8000/`. ES modules require HTTP rather than a file URL. No build step or external dependencies are required. Calculations run in the browser; there are no accounts or analytics.

## Version

Website release 0.8, 22 September 2026. The calculator retains model/link schema 0.7. Earlier 0.6-era assumptions are not silently converted. This release replaces the earlier learning and transmission assumptions with explicit conditional inputs and endpoint-specific interpretation.

Release validation included 43 calculator tests (including independent manuscript parity checks), 16 NZ arithmetic/boundary assertions, local link checks and desktop/mobile browser checks. These checks establish implementation consistency, not empirical validity. Earlier website versions remain available in Git history.
