# Evidence verification log: sources cited in CASCADE 0.8

**Prepared:** 4 November 2026
**Scope:** the 18 DOI-linked reports cited on `index.html` (Evidence section and the evidence–claim table) and referred to on `research.html`.
**Status:** second-pass, AI-assisted source check. **It does not replace independent human verification.** The site's statement that human verification is pending should stay until the author has reviewed this log against the full texts.

---

## 1. Method

1. I extracted every `doi.org` link from the site and matched it to the label the site uses (e.g., "SICAS", "FRESH").
2. For each DOI, I retrieved bibliographic metadata and abstract-level content using web search. This session's network policy blocked direct access to Crossref, PubMed and publisher pages. As a result, the checks rest on indexed abstracts, repository records (PMC, institutional repositories, RePEc), trial registries and, where unavoidable, secondary summaries.
3. For each report, I checked four things:
   - **(a) Bibliographic integrity:** whether the DOI resolves to the work the label implies.
   - **(b) Design and endpoint:** what was studied and measured.
   - **(c) Characterisation:** whether the site's sentence about the report is consistent with the report's own abstract.
   - **(d) Role in the calculator:** whether the way the report constrains the calculator is defensible.
4. Each report received a verdict:
   - **Consistent:** the site's characterisation matches the abstract-level evidence.
   - **Consistent, wording change advised:** accurate, but a more precise label or qualifier would help readers.
   - **Not verifiable here:** the claim depends on full-text detail (e.g., a specific sample size or an unreported CI) that I could not access. The author should check these against the full text.

**Limitation:** abstract-level checks can miss problems in the full text, such as changes to outcome definitions, subgroup restrictions or errata. Items marked "not verifiable here" are the priority for human review.

---

## 2. Summary

| Verdict | Count | Reports |
|---|---|---|
| Consistent | 11 | Mendell; Gilraine; ATENC!Ó (Gignac); Banholzer; Simona; Wargocki; Haverinen-Shaughnessy; Chetty; Watts; Yang; Buonanno (headline figure) |
| Consistent, wording change advised | 4 | SICAS → SICAS-2; FRESH (first author Rosbach); Lei and Wang (same trial); Petersen |
| Not verifiable here (full text required) | 3 claims | Jeong (n = 27 cognitive participants; no concurrent sham arm); Twardella and Petersen ("exclusions"); Buonanno (absence of a CI for the preferred RR) |
| Bibliographic error | 0 | — |

No DOI was found to point to the wrong work, and no site characterisation was found to be contradicted by the source's abstract.

**Main substantive finding:** the Lei et al. (2024) and Wang et al. (2026) reports appear to come from the **same cluster-randomised crossover trial**. They share the design (classroom plus bedroom purification, 76-day intervention phases, 88-day washout) and the Fudan/Shanghai setting. Their analysed samples differ (79 and 57 children). The site already says "linked reports are not independent trials". It should name this pair explicitly so that readers do not count the respiratory (Lei) and achievement (Wang) findings as independent replications.

**Count discrepancy:** the site says the review covers "16 reports", but 18 DOIs are linked. The likely explanation is that two valuation sources (Chetty et al., 2011; Watts, 2020) were cited to justify *not* applying an earnings return, rather than appraised as clean-air evidence. The site should say so, e.g., "16 appraised reports, plus two valuation sources".

---

## 3. Study-by-study record

References are listed in APA 7th-edition style. "Site" quotes the current wording on `index.html`.

### 3.1 Environment (exposure) evidence

**Simona, Bartell & Vieira (2025): "Simona et al."**
Simona, A., Bartell, S. M., & Vieira, V. M. (2025). Classroom air quality in a randomized crossover trial with portable HEPA air cleaners. *Journal of Exposure Science & Environmental Epidemiology*. https://doi.org/10.1038/s41370-025-00743-9 (PMC12234348)
- *Design:* randomised trial in 17 Los Angeles Unified elementary schools, July 2022 to June 2023. It compared 99 classrooms with HEPA-filter air cleaners against 87 with non-HEPA-filter units (Blueair Classic 605), all in buildings that already had MERV-13 HVAC filtration.
- *Result:* PM2.5 was 39.9% lower in HEPA classrooms (absolute difference 0.581 µg/m³), and outdoor PM2.5 infiltration was 13.8–82.4% lower.
- *Site:* "incremental particle reduction with portable filtration."
- **Verdict: Consistent.** "Incremental" is apt, because the comparator already had MERV-13 filtration and a non-HEPA cleaner. Consider adding that the absolute difference was small (≈0.6 µg/m³) at low baseline concentrations. This supports the site's rule that particle reduction is not a health effect.

**Rosbach et al. (2013): "FRESH"**
Rosbach, J. T. M., Vonk, M., Duijm, F., van Ginkel, J. T., Gehring, U., & Brunekreef, B. (2013). A ventilation intervention study in classrooms to improve indoor air quality: The FRESH study. *Environmental Health, 12*, 110. https://doi.org/10.1186/1476-069X-12-110
- *Design:* CO₂-controlled mechanical ventilation intervention in 18 classrooms of 17 Dutch schools, using a longitudinal crossover design, with six control schools.
- *Result:* the device did not reliably achieve the two target CO₂ levels, although classroom CO₂ could be lowered.
- *Site:* "FRESH shows why achieved ventilation conditions matter more than nominal targets."
- **Verdict: Consistent, wording change advised.** The characterisation is faithful. Label the link "Rosbach et al. (FRESH)" so that readers can locate it, because a web search for "FRESH" alone often turns up an unrelated Wargocki and Wyon commentary.

### 3.2 Health and absence evidence

**Phipatanakul et al. (2021): "SICAS"**
Phipatanakul, W., Koutrakis, P., Coull, B. A., Petty, C. R., Gaffin, J. M., Sheehan, W. J., … for the SICAS-2 investigators (2021). Effect of school integrated pest management or classroom air filter purifiers on asthma symptoms in students with active asthma: A randomized clinical trial. *JAMA, 326*(9), 839–850. https://doi.org/10.1001/jama.2021.11559 (NCT02291302)
- *Design:* 2 × 2 factorial randomised trial with 236 students with active asthma in 41 urban elementary schools in the northeastern US, 2015–2020. Classroom HEPA purifiers were compared with sham purifiers.
- *Result:* the primary outcome was symptom-days per two weeks: 1.6 with HEPA vs 1.8 with sham, not significant. Secondary outcomes, including asthma-related school absence, were mostly null, with small means (≈0.07–0.18 days per two weeks) and wide dispersion.
- *Site:* "SICAS reports uncertain asthma symptom and asthma-absence effects."
- **Verdict: Consistent, wording change advised.** The trial's name is **SICAS-2**; SICAS-1 was an earlier observational cohort. Relabel the link "SICAS-2". *(Applied in this branch.)*
- *Related outputs the author may wish to cite:*
  - Sun et al. (2025, *JAMA Network Open*, https://doi.org/10.1001/jamanetworkopen.2025.36951): a secondary analysis that found no reduction in the odds of high airborne viral exposure with HEPA (OR 0.50, 95% CI 0.08–3.25), a 32.8% reduction in viral diversity, and no association of that diversity reduction with absence.
  - Samnaliev et al. (2025, *Allergy and Asthma Proceedings, 46*(3), 257–266, https://doi.org/10.2500/aap.2025.46.250018): a societal-perspective cost-effectiveness analysis of SICAS-2 that reports an ICER of US$19,667/QALY for IPM + HEPA. This is the closest published economic evaluation to CASCADE and should be discussed in the manuscript (see `manuscript/`). Its short horizon (mean follow-up 166 days) and the null primary trial effect are relevant to interpreting it.

**Mendell et al. (2013): "Mendell"**
Mendell, M. J., Eliseeva, E. A., Davies, M. M., Spears, M., Lobscheid, A., Fisk, W. J., & Apte, M. G. (2013). Association of classroom ventilation with reduced illness absence: A prospective study in California elementary schools. *Indoor Air, 23*(6), 515–528. https://doi.org/10.1111/ina.12042
- *Design:* prospective observational study of more than 150 classrooms over two years, with ventilation estimated from indoor CO₂ against estimated outdoor CO₂.
- *Result:* each additional 1 L/s/person was associated with a 1.6% reduction in illness absence, up to at least 15 L/s/person.
- *Site:* "Mendell's ventilation association concerns illness absence."
- **Verdict: Consistent.** The authors themselves state that the association may not be causal, which supports the site's "association" wording.

**Banholzer et al. (2024): "Banholzer"**
Banholzer, N., Jent, P., Bittel, P., Zürcher, K., Furrer, L., Bertschinger, S., … Fenner, L. (2024). Air cleaners and respiratory infections in schools: A modeling study based on epidemiologic, environmental, and molecular data. *Open Forum Infectious Diseases, 11*(4), ofae169. https://doi.org/10.1093/ofid/ofae169
- *Design:* seven-week crossover in two Swiss secondary-school classes in winter 2022/23, analysed with a Bayesian model.
- *Result:* particle concentration fell by 77% (95% CrI 63–86%). Respiratory-infection absences were 22 without air cleaners vs 13 with them. The modelled infection RR was 0.73 (95% CrI 0.44–1.18).
- *Site:* "Banholzer's respiratory result is exploratory and model-dependent."
- **Verdict: Consistent.** The title itself describes it as a modelling study, and the credible interval includes 1.

**Lei et al. (2024): "Lei"**
Lei, J., … Kan, H. (2024). Respiratory benefits of multisetting air purification in children: A cluster randomized crossover trial. *JAMA Pediatrics*. https://doi.org/10.1001/jamapediatrics.2024.5049 (NCT04835337)
- *Design:* double-blind cluster-randomised crossover trial with 79 healthy children (mean age 10.3 years) in Shanghai. Classroom plus bedroom purification for 76 days was compared with sham, with an 88-day washout.
- *Result:* personal PM2.5 fell by 45%. FEV₁, FVC and PEF improved, and FeNO fell by 22%.
- *Site:* "Physiological changes in Lei and Yang do not directly calibrate clinical episodes or QALYs."
- **Verdict: Consistent, wording change advised.** Lei and Wang (below) appear to be the same trial; state this on the site.

**Yang et al. (2021): "Yang"**
Yang, X., Wang, Q., Han, F., Dong, B., Wen, B., Li, L., … Xu, D. (2021). Pulmonary benefits of intervention with air cleaner among schoolchildren in Beijing: A randomized double-blind crossover study. *Environmental Science & Technology*. https://doi.org/10.1021/acs.est.1c03146
- *Design:* randomised double-blind crossover in 125 children aged 9–12 at a Beijing boarding school.
- *Result:* the outcomes were lung-function measures.
- *Site:* as for Lei.
- **Verdict: Consistent.** The volume and page details reported by secondary indexes (56, 7185–7193) are inconsistent with a September 2021 publication date. Check the final pagination at the publisher before citing it in the manuscript.

**Buonanno et al. (2022): "Buonanno"**
Buonanno, G., Ricolfi, L., Morawska, L., & Stabile, L. (2022). Increasing ventilation reduces SARS-CoV-2 airborne transmission in schools: A retrospective cohort study in Italy's Marche region. *Frontiers in Public Health, 10*, 1087087. https://doi.org/10.3389/fpubh.2022.1087087
- *Design:* retrospective cohort comparing 316 mechanically ventilated classrooms with 10,125 naturally ventilated classrooms. The unit of analysis was case clusters.
- *Result:* the relative risk was at least 74% lower with mechanical ventilation.
- *Site:* "Buonanno concerns observational COVID-specific classroom clusters; the preferred RR has no reported CI."
- **Verdict: Consistent on design and headline figure.** I could not verify the claim that no CI was reported from the abstract. The phrase "at least 74%" suggests a bound rather than an interval, but confirm this in the full text.

### 3.3 Learning and attention evidence

**Gignac et al. (2021): "ATENC!Ó"**
Gignac, F., Barrera-Gómez, J., Persavento, C., Solé, C., Tena, È., López-Vicente, M., … Basagaña, X. (2021). Short-term effect of air pollution on attention function in adolescents (ATENC!Ó): A randomized controlled trial in high schools in Barcelona, Spain. *Environment International, 156*, 106614. https://doi.org/10.1016/j.envint.2021.106614
- *Design:* randomised trial with 2,123 adolescents aged 13–16 in 33 Barcelona high schools. Within each class, pupils were split between a classroom with a filtering air cleaner and a classroom with a recirculation-only unit, for 1.5 hours of exposure.
- *Result:* particles were 89% lower and black carbon 87% lower. Reaction-time variability changed by +1.37% (95% CI −2.81% to 5.56%), i.e., no effect.
- *Site:* "ATENC!Ó's acute attention estimate is uncertain."
- **Verdict: Consistent.** "Uncertain" is accurate, but "null and imprecise" would be more informative.

**Gilraine (2025): "Gilraine"**
Gilraine, M. (2025). Air filters, pollution, and student achievement. *Journal of Human Resources, 60*(5), 1469–1506. https://doi.org/10.3368/jhr.0421-11642R2
- *Design:* spatial regression discontinuity around the Aliso Canyon gas leak, after which air filters were installed in every classroom within five miles.
- *Result:* test scores rose by 0.1–0.2 SD.
- *Site:* "Gilraine's final paper … report[s] achievement effects, but do[es] not establish a transferable durable gain per ppm."
- **Verdict: Consistent.** "Final paper" correctly distinguishes the 2025 print version from the 2023 online-first and earlier working-paper versions.

**Wang et al. (2026): "Wang"**
Wang, … (2026). Cognitive benefits of air purification among schoolchildren: A randomized, double-blind, crossover trial. *The Innovation, 7*, 101304. https://doi.org/10.1016/j.xinn.2026.101304
- *Design:* same structure as Lei et al. (classroom plus bedroom, 76-day phases, 88-day washout), with 57 participants.
- *Result:* standardised Chinese score +0.22, total score +0.20, plus rank and executive-function gains.
- *Site:* "Wang's school-and-home trial report[s] achievement effects."
- **Verdict: Consistent, wording change advised.** State that this report and Lei (2024) are linked outputs of one trial. Indexes disagree on the issue (7(2) vs 7(5)), and one reference list gives a different article number (101234). Confirm the citation at the publisher. Full author list required.

**Wargocki et al. (2020): "Wargocki"**
Wargocki, P., Porras-Salazar, J. A., Contreras-Espinoza, S., & Bahnfleth, W. (2020). The relationships between classroom air quality and children's performance in school. *Building and Environment, 173*, 106749. https://doi.org/10.1016/j.buildenv.2020.106749
- *Design:* synthesis of about 20 studies.
- *Result:* exposure–response relationships linking CO₂ to task speed, errors, test scores and attendance.
- *Site:* "Wargocki synthesises heterogeneous task outcomes."
- **Verdict: Consistent.** The authors explicitly present their relationships as inputs to cost–benefit analysis. That makes the site's decision *not* to apply them automatically a deliberate methodological choice, which the manuscript should justify explicitly (see the manuscript, Section 2.4).

**Haverinen-Shaughnessy et al. (2011): "Haverinen-Shaughnessy"**
Haverinen-Shaughnessy, U., Moschandreas, D. J., & Shaughnessy, R. J. (2011). Association between substandard classroom ventilation rates and students' academic achievement. *Indoor Air, 21*(2), 121–131. https://doi.org/10.1111/j.1600-0668.2010.00686.x
- *Design:* cross-sectional study of one fifth-grade classroom in each of 100 schools.
- *Result:* a linear association between ventilation and pass rates over 0.9–7.1 L/s/person.
- *Site:* "selected-range pass-rate associations."
- **Verdict: Consistent.**

**Petersen et al. (2016): "Petersen"**
Petersen, S., Jensen, K. L., Pedersen, A. L. S., & Rasmussen, H. S. (2016). The effect of increased classroom ventilation rate indicated by reduced CO₂ concentration on the performance of schoolwork by children. *Indoor Air, 26*(3), 366–379. https://doi.org/10.1111/ina.12210
- *Design:* double-blind crossover in four classes at two Danish schools.
- *Result:* speed on schoolwork tasks improved by up to about 7%.
- *Site:* "Petersen and Twardella require attention to exclusions."
- **Verdict: Consistent, wording change advised.** I could not verify the "exclusions" claim at abstract level. State what the exclusions are (e.g., excluded pupils or tests) so that the caution can be checked.

**Twardella et al. (2012): "Twardella"**
Twardella, D., Matzen, W., Lahrz, T., Burghardt, R., Spegel, H., Hendrowarsito, L., Frenzel, A. C., & Fromme, H. (2012). Effect of classroom air quality on students' concentration: Results of a cluster-randomized cross-over experimental study. *Indoor Air, 22*(5), 378–387. https://doi.org/10.1111/j.1600-0668.2012.00774.x
- *Design:* cluster-randomised crossover in 20 mechanically ventilated Bavarian classrooms. Median CO₂ was about 2,115 ppm in the "worse" condition and about 1,045 ppm in the "better" one. The sample was 2,366 d2-tests from 417 pupils.
- *Result:* no effect on the primary CP score; errors rose by 1.65 (95% CI 0.42–2.87).
- *Site:* see Petersen.
- **Verdict: Consistent** on design and result. "Exclusions" could not be verified (see Petersen).

**Jeong et al. (2026): "Jeong"**
Jeong, … (2026). Protective effect of reduced particulate matter exposure on pulmonary function and cognitive performance among school children. *Environmental Research, 303*, 124796. https://doi.org/10.1016/j.envres.2026.124796
- *Design:* crossover trial in Seoul classrooms varying air-purifier CADR and the number of units.
- *Site:* "Jeong has only 27 cognitive participants and no concurrent sham arm."
- **Verdict: Not verifiable here.** The bibliographic record matches, but I could not reach the sample size or comparator from the abstract. The full author list is also required.

### 3.4 Valuation sources

**Chetty et al. (2011): "Chetty's classroom-quality estimate"**
Chetty, R., Friedman, J. N., Hilger, N., Saez, E., Schanzenbach, D. W., & Yagan, D. (2011). How does your kindergarten classroom affect your earnings? Evidence from Project STAR. *Quarterly Journal of Economics, 126*(4), 1593–1660. https://doi.org/10.1093/qje/qjr041
- *Design:* Project STAR random assignment linked to tax records.
- *Result:* class quality affects earnings at age 27 despite test-score fade-out.
- *Site:* "Chetty's classroom-quality estimate is not a transferable causal earnings return per score SD."
- **Verdict: Consistent.** The fade-out with re-emergence result reinforces the site's caution: score effects and earnings effects are not linked by a stable per-SD conversion.

**Watts (2020): "Watts"**
Watts, T. W. (2020). Academic achievement and economic attainment: Reexamining associations between test scores and long-run earnings. *AERA Open, 6*(2). https://doi.org/10.1177/2332858420928985 (corrigendum: https://doi.org/10.1177/2332858420953168)
- *Result:* the score–earnings association weakens substantially once family background, cognitive ability and socioemotional skills are controlled for.
- *Site:* "Watts is explicitly associational."
- **Verdict: Consistent.** Cite the corrigendum alongside the article.

---

## 4. Recommended site changes

| # | Location | Change | Applied? |
|---|---|---|---|
| R1 | Evidence card 02 | Relabel "SICAS" as "SICAS-2" | Yes (this branch) |
| R2 | Evidence card 01 | Relabel "FRESH" as "Rosbach et al. (FRESH)" | Yes (this branch) |
| R3 | Evidence intro | Say "16 appraised reports, plus two valuation sources (Chetty; Watts)" | Yes (this branch) |
| R4 | Evidence card 03 or table | Add "Lei (2024) and Wang (2026) report different outcomes from one trial" | Yes (this branch) |
| R5 | Evidence table | Consider citing Samnaliev et al. (2025) as the closest published economic evaluation, and Sun et al. (2025) as a SICAS-2 viral-exposure analysis | Author decision |
| R6 | Evidence table | State what the Petersen and Twardella exclusions are | Author (full text needed) |
| R7 | — | Confirm Jeong n = 27 and the comparator; confirm Buonanno has no CI | Author (full text needed) |

## 5. Checklist for the human verifier

- [ ] Confirm the exact titles and full author lists for Gignac et al. (2021), Wang et al. (2026), Lei et al. (2024) and Jeong et al. (2026).
- [ ] Confirm the Yang et al. (2021) volume and pages.
- [ ] Confirm the Wang et al. (2026) issue and article number.
- [ ] Confirm R6 and R7 against the full texts.
- [ ] Confirm that Lei and Wang come from the same trial registration (NCT04835337).
- [ ] Once these are done, change the site status from "human verification pending" to "verified on [date] by [name]".
