# RenderBench Project Homepage

Interactive academic project website for **RenderBench: Benchmarking Render-to-Real Video Transfer with Editable Scene Reconstructions** (CVPR 2027).

## Highlights

- **Interactive Multi-View 3D Mall Explorer (`Views A–H`)**: Clickable calibrated camera markers overlaid on the 3D reconstructed mall map paired with a smooth hardware-accelerated drag split-curtain (`3D Proxy` / `Real GT` vs. `Seedance 2.5`, `MiniMax H3`, `Wan2.2-VACE`, `Cosmos-Transfer2.5`, plus `0s / 2s / 4s` timestamps on View D).
- **Three-Engine Granularity Studio (`Three.js` · `Eevee` · `Cycles`)**: Interactive upstream proxy & downstream generation switcher with live 20-window matched scores.
- **Synchronized 1080p Video Theater**: Embedded 24 fps benchmark video demonstrations (`demo1`, `demo2`, `demo3`) with 1-click scene chapter jumps and playback speed controls.
- **Live Leaderboard, 6-Axis Polygon Radar & Aggregation Weight Switch**: Interactive toggle between **Equal Source-Group (15 groups)** and **Equal Window (138 windows)** demonstrating the exact `+1.762 → −1.779` `ΔE₀₀` rank reversal, alongside Human Davidson Elo (`20w`) and Calibrated `Qwen3.8-Flash` VLM Elo (`118w`).
- **Controlled 3D Diagnostics Explorer**: Interactive bootstrap CI plots for `R1–R9` rendering interventions and `P0–P5` prompt strategies, plus the three counterfactual 3D trajectory regimes.
- **Anonymous Preview Ready**: Displays anonymous CVPR 2027 submission metadata and BibTeX.

## Local Preview

```bash
cd renderbench-homepage
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Deployment (GitHub Pages)

1. Push this directory to a repository (or its `docs/` folder / `gh-pages` branch).
2. Enable **Settings → Pages → Deploy from branch**. No build step or Node.js bundler is required.
