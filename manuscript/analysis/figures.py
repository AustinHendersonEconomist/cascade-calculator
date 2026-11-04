"""Produce manuscript figures and the regression-based EVPPI cross-check.

Usage: python3 manuscript/analysis/figures.py  (after run-analyses.mjs)
"""
import json, pathlib
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

HERE = pathlib.Path(__file__).resolve().parent
FIG = HERE.parent / "figures"
R = json.loads((HERE / "results.json").read_text())
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8.5, "axes.spines.top": False,
                     "axes.spines.right": False, "axes.linewidth": 0.6, "xtick.major.width": 0.6,
                     "ytick.major.width": 0.6, "savefig.dpi": 600, "savefig.bbox": "tight"})
TEAL, SAND, INK, GREY = "#1f5a52", "#c9a27f", "#142f35", "#8a9a95"
NAMES = {"S1": "S1 · Child health only", "S2": "S2 · Health and caregiver time", "S5": "S5 · Null infection effect"}

def save(fig, name):
    for ext in ("png", "pdf"):
        fig.savefig(FIG / f"{name}.{ext}")
    plt.close(fig)

def draws(sid):
    a = np.genfromtxt(HERE / f"draws-{sid}.csv", delimiter=",", names=True)
    return a

# Figure 1: model structure ---------------------------------------------------
fig, ax = plt.subplots(figsize=(7.2, 3.1)); ax.axis("off"); ax.set_xlim(0, 106); ax.set_ylim(0, 44)
def box(x, y, w, h, title, body, fc="#eef3ee"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4,rounding_size=1.2", fc=fc, ec=INK, lw=0.6))
    ax.text(x + w / 2, y + h - 2.2, title, ha="center", va="top", weight="bold", fontsize=7)
    ax.text(x + w / 2, y + h - 6.4, body, ha="center", va="top", fontsize=6.1, linespacing=1.35)
def arrow(x0, y0, x1, y1):
    ax.annotate("", (x1, y1), (x0, y0), arrowprops=dict(arrowstyle="-|>", lw=0.7, color=INK))
box(1, 24, 22, 18, "Route A: airflow", "Q₀ = 3.6 × occupants × q\nθ = 1 − Q₀/(Q₀ + ΔQ)\n× addressable fraction")
box(1, 2, 22, 18, "Routes B, C: study", "θ = 1 − RR, applied\nto the matched\nbaseline endpoint")
box(28, 13, 22, 18, "Physical change", "ΔE = baseline burden\n× cohort × θ\n(episodes or\nabsent days)")
box(55, 24, 22, 18, "Valuation", "healthcare + caregiver\n+ λ·QALY (optional)\nor absence value")
box(55, 2, 22, 18, "Costs", "capital × CRF(r, L)\n+ annual operation\n(annual service cost)")
box(82, 13, 23, 18, "Decision", "NPV = PV(values)\n− PV(costs);\nthresholds; PSA:\nCEAC, EVPI, EVPPI", fc="#e3ecd9")
arrow(23.8, 33, 27.4, 25); arrow(23.8, 11, 27.4, 19); arrow(50.8, 24, 54.4, 31); arrow(77.8, 33, 81.4, 25); arrow(77.8, 11, 81.4, 19)
ax.text(53, 43.5, "Optional terminal achievement difference, valued once at the horizon (not shown)", ha="center", fontsize=6.4, color=GREY, style="italic")
save(fig, "fig1-model-structure")

# Figure 2: NPV distributions -------------------------------------------------
fig, axes = plt.subplots(1, 3, figsize=(6.7, 2.5))
for ax, sid in zip(axes, ("S1", "S2", "S5")):
    d = draws(sid)["netPV"] / 1000; m = R["scenarios"][sid]["envelopes"]["moderate"]["npv"]
    lo, hi = np.quantile(d, [0.001, 0.999]); bins = np.linspace(lo, hi, 45)
    c, e = np.histogram(d, bins=bins, density=True); mid = (e[:-1] + e[1:]) / 2
    ax.bar(mid, c, width=np.diff(e), color=np.where(mid > 0, TEAL, SAND), lw=0)
    ax.axvline(0, color=INK, lw=0.7, ls="--"); ax.axvline(m["mean"] / 1000, color=INK, lw=1.1)
    ax.set_title(f"{NAMES[sid]}\nP(NPV > 0) = {m['pPositive']:.2f}", fontsize=7.4, loc="left"); ax.set_yticks([])
axes[0].set_ylabel("Density")
fig.supxlabel("Net present value (thousand MU)", fontsize=8.5, y=-0.02)
save(fig, "fig2-npv-distributions")

# Figure 3: CEAC --------------------------------------------------------------
fig, ax = plt.subplots(figsize=(3.4, 2.5))
for sid, ls in (("S1", "-"), ("S2", "--"), ("S5", ":")):
    c = R["scenarios"][sid]["envelopes"]["moderate"]["ceac"]
    ax.plot([p["lambda"] / 1000 for p in c], [p["p"] for p in c], ls, color=INK if sid != "S1" else TEAL, lw=1.3, label=NAMES[sid])
ax.axvline(30, color=GREY, lw=0.6); ax.text(31, 0.04, "λ = 30,000 MU", fontsize=6.5, color=GREY)
ax.set_xlabel("Monetary value of a QALY, λ (thousand MU)"); ax.set_ylabel("Probability INB > 0"); ax.set_ylim(0, 1.02)
ax.legend(frameon=False, fontsize=6.5, loc="lower right")
save(fig, "fig3-acceptability")

# Figure 4: EVPPI -------------------------------------------------------------
fig, axes = plt.subplots(2, 1, figsize=(5.2, 4.4))
fig.subplots_adjust(hspace=0.75)
for ax, sid in zip(axes, ("S1", "S5")):
    env = R["scenarios"][sid]["envelopes"]["moderate"]; rows = env["evppi"][:7][::-1]
    ax.barh([r["label"] for r in rows], [r["evppi"] for r in rows], color=TEAL, height=0.6)
    ax.axvline(env["evpi"], color=INK, ls="--", lw=0.8)
    ax.text(env["evpi"], len(rows) - 0.4, f" EVPI = {env['evpi']:,.0f}", fontsize=6.6, va="bottom", ha="right")
    ax.set_title(NAMES[sid], fontsize=7.8, loc="left"); ax.set_xlabel("Per-cohort EVPPI (MU)")
    ax.tick_params(axis="y", labelsize=6.8)
save(fig, "fig4-evppi")

# Supplementary figure S1: convergence ---------------------------------------
fig, axes = plt.subplots(1, 3, figsize=(6.7, 2.0))
for ax, sid in zip(axes, ("S1", "S2", "S5")):
    c = R["scenarios"][sid]["convergence"]; n = [x["n"] for x in c]
    ax.errorbar(n, [x["evpiMean"] for x in c], yerr=[1.96 * x["evpiSD"] for x in c], fmt="o-", ms=2.5, lw=0.8, color=TEAL, capsize=2)
    ax.set_xscale("log"); ax.set_title(NAMES[sid], fontsize=7.6, loc="left"); ax.set_xlabel("Iterations")
axes[0].set_ylabel("EVPI (MU), mean ± 1.96 SD\nacross five seeds")
save(fig, "figS1-convergence")

# EVPPI cross-check: regression (natural cubic spline) estimator -------------------
def spline_basis(x, k=6):
    knots = np.quantile(x, np.linspace(0, 1, k))
    def d(z, kk): return (np.clip(z - kk, 0, None) ** 3 - np.clip(z - knots[-1], 0, None) ** 3) / (knots[-1] - kk)
    cols = [np.ones_like(x), x] + [d(x, knots[j]) - d(x, knots[-2]) for j in range(k - 2)]
    return np.column_stack(cols)

check = {}
for sid in ("S1", "S2", "S5"):
    a = draws(sid); nb = a["netPV"]; env = R["scenarios"][sid]["envelopes"]["moderate"]; out = []
    for p in env["evppi"][:4]:
        x = a[p["key"]]; X = spline_basis((x - x.mean()) / x.std())
        fit = X @ np.linalg.lstsq(X, nb, rcond=None)[0]
        reg = max(0.0, np.mean(np.maximum(fit, 0)) - max(np.mean(fit), 0))
        out.append({"key": p["key"], "js_spline": p["evppi"], "js_binning": p["binned"], "py_spline": float(reg)})
    check[sid] = out
(HERE / "evppi-crosscheck.json").write_text(json.dumps(check, indent=1))
for sid, rows in check.items():
    print(sid, ", ".join(f"{r['key']}: js {r['js_spline']:.1f} / py {r['py_spline']:.1f} / bin {r['js_binning']:.1f}" for r in rows))
