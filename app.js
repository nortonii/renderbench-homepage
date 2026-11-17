(function () {
  const DATA = window.RENDERBENCH_DATA;

  const VIEW_META = {
    A: { title: 'Escalator', desc: 'Sweeping atrium view with moving escalator riders & warm storefront glow' },
    B: { title: 'Lower Atrium', desc: 'Wide floor perspective across glass balustrades and tiled atrium walkway' },
    C: { title: 'Shop 1', desc: 'Close architectural facade with specular glass display and interior signage' },
    D: { title: 'Crowd (3-Engine)', desc: 'Curved upper mezzanine & distant crowd (supports 0s / 2s / 4s & 3-engine zoom)' },
    E: { title: 'Shop 2', desc: 'Warm interior boutique frontage and recessed ceiling illumination' },
    F: { title: 'Counter', desc: 'Service counter foreground geometry with multi-layer depth occlusion' },
    G: { title: 'Concourse', desc: 'Longitudinal concourse corridor testing perspective & vanishing-point stability' },
    H: { title: 'Stairs', desc: 'Multi-level staircase & escalator bank with articulated pedestrians' }
  };

  const STREAM_LABELS = {
    Proxy: '3D Proxy (Eevee R0)',
    GT: 'Real Target (GT)',
    Seedance: 'Seedance 2.5',
    H3: 'MiniMax H3',
    Wan: 'Wan2.2-VACE',
    Cosmos: 'Cosmos-Transfer2.5'
  };

  const MODEL_META = {
    h3: { name: 'MiniMax H3 (A)', short: 'MiniMax H3', color: '#f43f5e', isRef: false },
    seedance: { name: 'Seedance 2.5 (A)', short: 'Seedance 2.5', color: '#f59e0b', isRef: false },
    wan: { name: 'Wan2.2-VACE (B)', short: 'Wan2.2-VACE', color: '#10b981', isRef: false },
    cosmos_depth: { name: 'Cosmos-Transfer2.5 (B)', short: 'Cosmos-2.5', color: '#38bdf8', isRef: false },
    hold_a: { name: 'Static First-Frame (A)', short: 'Static t=0 (A)', color: '#94a3b8', isRef: true },
    proxy_rgb_a: { name: 'Untransferred Proxy (A)', short: '3D Proxy (A)', color: '#a78bfa', isRef: true }
  };

  /* ---------------- 1. Anonymous BibTeX ---------------- */
  const bibtexCode = document.getElementById('bibtexCode');

  function renderBibtex() {
    bibtexCode.textContent = `@inproceedings{anonymous2027renderbench,
  title     = {RenderBench: Benchmarking Render-to-Real Video Transfer with Editable Scene Reconstructions},
  author    = {Anonymous},
  booktitle = {CVPR 2027 Submission},
  year      = {2027}
}`;
  }
  renderBibtex();

  document.getElementById('copyBibBtn').addEventListener('click', (e) => {
    navigator.clipboard.writeText(bibtexCode.textContent);
    const btn = e.currentTarget;
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1600);
  });

  /* ---------------- 2. Reusable Drag Curtain Helper ---------------- */
  function attachCurtain(viewportEl, leftWrapEl, dividerEl, handleEl, initialPct) {
    let pct = initialPct;
    function setPct(next) {
      pct = Math.max(3, Math.min(97, next));
      leftWrapEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      dividerEl.style.left = `${pct}%`;
      handleEl.style.left = `${pct}%`;
    }
    setPct(pct);

    let dragging = false;
    function updateFromEvent(e) {
      const rect = viewportEl.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      setPct(((clientX - rect.left) / rect.width) * 100);
    }
    viewportEl.addEventListener('pointerdown', (e) => {
      dragging = true;
      viewportEl.setPointerCapture(e.pointerId);
      updateFromEvent(e);
    });
    viewportEl.addEventListener('pointermove', (e) => {
      if (dragging) updateFromEvent(e);
    });
    viewportEl.addEventListener('pointerup', () => { dragging = false; });
    viewportEl.addEventListener('pointercancel', () => { dragging = false; });
  }

  attachCurtain(
    document.getElementById('mainCurtain'),
    document.getElementById('curtainLeftWrap'),
    document.getElementById('curtainDivider'),
    document.getElementById('curtainHandle'),
    50
  );

  attachCurtain(
    document.getElementById('engineCurtain'),
    document.getElementById('engCurtainLeft'),
    document.getElementById('engDivider'),
    document.getElementById('engHandle'),
    32
  );

  /* ---------------- 3. Multi-View 3D Mall Map + Split Comparator ---------------- */
  let activeView = 'A';
  let leftStream = 'Proxy';
  let rightStream = 'Seedance';
  let viewDTime = '2s';

  const mapStage = document.getElementById('mallMapStage');
  const viewPills = document.getElementById('viewPills');
  const activeCamCoords = document.getElementById('activeCamCoords');
  const curtainLeftImg = document.getElementById('curtainLeftImg');
  const curtainRightImg = document.getElementById('curtainRightImg');
  const badgeLeft = document.getElementById('badgeLeft');
  const badgeRight = document.getElementById('badgeRight');
  const viewDTimeControls = document.getElementById('viewDTimeControls');
  const curtainCaption = document.getElementById('curtainCaption');

  function resolveFramePath(view, stream, t) {
    if (view === 'D' && t !== '2s') {
      if (['GT', 'Proxy', 'Seedance'].includes(stream)) {
        return `assets/mall/D_${stream}_${t}.webp`;
      }
    }
    return `assets/mall/${view}_${stream}_2s.webp`;
  }

  function syncMallStudio() {
    const meta = VIEW_META[activeView];
    const anchor = DATA.mallAnchors[activeView];
    activeCamCoords.textContent = `Cam ${activeView} · ${meta.title}`;
    const worldEl = document.getElementById('activeCamWorld');
    const descEl = document.getElementById('activeCamDesc');
    if (worldEl && anchor && anchor.world) {
      worldEl.textContent = `xyz = (${anchor.world.join(', ')})`;
    }
    if (descEl) {
      descEl.textContent = `${meta.desc}. Shared 3D scene geometry & actor animations across all 8 views.`;
    }

    document.querySelectorAll('.cam-pin').forEach((el) => {
      el.classList.toggle('active', el.dataset.view === activeView);
    });
    document.querySelectorAll('.view-pill').forEach((el) => {
      el.classList.toggle('active', el.dataset.view === activeView);
    });

    const useTime = activeView === 'D' && ['GT', 'Proxy', 'Seedance'].includes(rightStream) ? viewDTime : '2s';
    viewDTimeControls.style.display = activeView === 'D' ? 'flex' : 'none';

    curtainLeftImg.src = resolveFramePath(activeView, leftStream, useTime);
    curtainRightImg.src = resolveFramePath(activeView, rightStream, useTime);
    badgeLeft.textContent = `${STREAM_LABELS[leftStream]} · View ${activeView}`;
    badgeRight.textContent = `${STREAM_LABELS[rightStream]} · t=${useTime.replace('s', '.0s')}`;
    curtainCaption.innerHTML = `<strong>View ${activeView} (${meta.title}):</strong> ${meta.desc}.`;
  }

  let tourTimer = null;
  const autoTourBtn = document.getElementById('autoTourBtn');
  const viewKeys = Object.keys(VIEW_META);
  if (autoTourBtn) {
    autoTourBtn.addEventListener('click', () => {
      if (tourTimer) {
        clearInterval(tourTimer);
        tourTimer = null;
        autoTourBtn.classList.remove('active');
        autoTourBtn.textContent = '▶ Auto-Tour A–H';
      } else {
        autoTourBtn.classList.add('active');
        autoTourBtn.textContent = '⏸ Stop Tour';
        tourTimer = setInterval(() => {
          const nextIdx = (viewKeys.indexOf(activeView) + 1) % viewKeys.length;
          activeView = viewKeys[nextIdx];
          syncMallStudio();
        }, 2200);
      }
    });
  }

  Object.keys(VIEW_META).forEach((v) => {
    const anchor = DATA.mallAnchors[v];
    if (anchor) {
      const pin = document.createElement('button');
      pin.className = 'cam-pin';
      pin.dataset.view = v;
      pin.style.left = `${anchor.uv[0] * 100}%`;
      pin.style.top = `${anchor.uv[1] * 100}%`;
      pin.textContent = v;
      pin.title = `View ${v}: ${VIEW_META[v].title}`;
      pin.addEventListener('click', () => {
        if (tourTimer) autoTourBtn.click();
        activeView = v;
        syncMallStudio();
      });
      mapStage.appendChild(pin);
    }

    const pill = document.createElement('button');
    pill.className = 'view-pill';
    pill.dataset.view = v;
    pill.innerHTML = `<span class="mono" style="color:var(--cyan);margin-right:4px;">${v}</span>${VIEW_META[v].title}`;
    pill.addEventListener('click', () => {
      activeView = v;
      syncMallStudio();
    });
    viewPills.appendChild(pill);
  });

  document.querySelectorAll('[data-left]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-left]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      leftStream = btn.dataset.left;
      syncMallStudio();
    });
  });

  document.querySelectorAll('[data-right]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-right]').forEach((b) => b.classList.remove('active-right'));
      btn.classList.add('active-right');
      rightStream = btn.dataset.right;
      syncMallStudio();
    });
  });

  document.querySelectorAll('[data-time]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-time]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      viewDTime = btn.dataset.time;
      syncMallStudio();
    });
  });

  syncMallStudio();

  /* ---------------- 4. Three-Engine Granularity Studio ---------------- */
  const ENGINE_INFO = {
    threejs: {
      label: 'Three.js (WebGL Raster)',
      proxyImg: 'assets/mall/D_threejs_2s.webp',
      genImg: 'assets/mall/D_Seedance_threejs_2s.webp',
      spec: 'Identical 3D mesh & camera trajectory; unshadowed WebGL raster transport without ray-traced bounce light.',
      insight: '<strong>Finding:</strong> On Three.js, Seedance 2.5 achieves the best overall LPIPS (<code>0.276</code>) and ΔE₀₀ (<code>8.696</code>)—unshadowed WebGL raster shading avoids synthetic specular cues that otherwise compete with the <code>t=0</code> appearance frame <code>I^ref</code>.'
    },
    eevee: {
      label: 'Blender Eevee (Real-Time PBR)',
      proxyImg: 'assets/mall/D_eevee_2s.webp',
      genImg: 'assets/mall/D_Seedance_eevee_2s.webp',
      spec: 'Real-time PBR shading with screen-space reflections, baked materials, and raster shadow maps.',
      insight: '<strong>Finding:</strong> Under Eevee real-time PBR, MiniMax H3 ties/leads LPIPS (<code>0.309</code>) and dominates structural Edge F1 (<code>0.502</code>), while Wan2.2-VACE reaches its highest cross-engine Edge F1 (<code>0.421</code>).'
    },
    cycles: {
      label: 'Blender Cycles (Path-Traced GI)',
      proxyImg: 'assets/mall/D_cycles_2s.webp',
      genImg: 'assets/mall/D_Seedance_cycles_2s.webp',
      spec: 'Physically based multi-bounce global illumination, ray-traced reflections, and soft area-light penumbrae.',
      insight: '<strong>Finding:</strong> Multi-bounce global illumination in Cycles yields Seedance 2.5\'s lowest color error across all engines (<code>8.666</code> ΔE₀₀), while MiniMax H3 maintains rock-solid boundary preservation (<code>~0.50</code> Edge F1) across every engine.'
    }
  };

  function renderEngineStudio(eng) {
    const info = ENGINE_INFO[eng];
    document.getElementById('engProxyLabel').textContent = `Upstream Proxy · ${info.label}`;
    document.getElementById('engProxyImg').src = info.proxyImg;
    document.getElementById('engGenImg').src = info.genImg;
    const specEl = document.getElementById('engProxySpec');
    if (specEl) specEl.textContent = info.spec;
    document.getElementById('engBadgeRight').textContent = `${eng === 'threejs' ? 'Three.js' : eng === 'eevee' ? 'Eevee' : 'Cycles'} → Seedance 2.5`;
    document.getElementById('engTableTitle').textContent = `20-Window Matched Scores (${info.label})`;
    document.getElementById('engInsight').innerHTML = info.insight;

    const scores = DATA.engine20[eng];
    const order = ['h3', 'seedance', 'wan', 'cosmos_depth'];
    const bestLpips = Math.min(...order.map((k) => scores[k].lpips_gt));
    const bestDe = Math.min(...order.map((k) => scores[k].delta_e_2000_gt));
    const bestEdge = Math.max(...order.map((k) => scores[k].edge_f1_gt));

    const tbody = document.getElementById('engTableBody');
    tbody.innerHTML = order.map((k) => {
      const s = scores[k];
      return `<tr>
        <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${MODEL_META[k].color};margin-right:6px;"></span>${MODEL_META[k].short}</td>
        <td class="${s.lpips_gt === bestLpips ? 'best-val' : ''}">${s.lpips_gt.toFixed(3)}</td>
        <td class="${s.delta_e_2000_gt === bestDe ? 'best-val' : ''}">${s.delta_e_2000_gt.toFixed(3)}</td>
        <td class="${s.edge_f1_gt === bestEdge ? 'best-val' : ''}">${s.edge_f1_gt.toFixed(3)}</td>
      </tr>`;
    }).join('');
  }

  document.querySelectorAll('#engineTabs .engine-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#engineTabs .engine-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      renderEngineStudio(tab.dataset.engine);
    });
  });
  renderEngineStudio('threejs');

  /* ---------------- 5. Synchronized 1080p Video Theater ---------------- */
  const VIDEO_SOURCES = {
    demo1: 'assets/videos/demo1_cross_scene_main_evaluation.mp4',
    demo2: 'assets/videos/demo2_three_engines_granularity.mp4',
    demo3: 'assets/videos/demo3_mall_multiview_six_views.mp4'
  };
  const videoEl = document.getElementById('benchmarkVideo');
  const videoChapters = document.getElementById('videoChapters');

  document.querySelectorAll('#videoTabs .engine-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#videoTabs .engine-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const key = tab.dataset.video;
      videoEl.src = VIDEO_SOURCES[key];
      videoChapters.style.visibility = key === 'demo1' ? 'visible' : 'hidden';
      videoEl.play().catch(() => {});
    });
  });

  document.querySelectorAll('[data-seek]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-seek]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      videoEl.currentTime = parseFloat(btn.dataset.seek);
      videoEl.play().catch(() => {});
    });
  });

  document.querySelectorAll('[data-rate]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-rate]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      videoEl.playbackRate = parseFloat(btn.dataset.rate);
    });
  });

  /* ---------------- 6. Polygon Radar + Leaderboard + Weight Paradox ---------------- */
  let weightMode = 'group';
  let sortCol = 'lpips_gt';
  let sortAsc = true;
  let highlightedModel = null;

  const METRIC_CFG = [
    { key: 'lpips_gt', label: 'LPIPS Q↑', lowerBetter: true },
    { key: 'ms_ssim_gt', label: 'MS-SSIM↑', lowerBetter: false },
    { key: 'delta_e_2000_gt', label: 'Color Q↑', lowerBetter: true },
    { key: 'edge_f1_gt', label: 'Edge F1↑', lowerBetter: false },
    { key: 'depth_si_rmse', label: 'Depth Q↑', lowerBetter: true },
    { key: 'instance_miou', label: 'Inst mIoU↑', lowerBetter: false }
  ];

  function getVal(mod, mKey) {
    return weightMode === 'group'
      ? DATA.equalGroup138[mod][mKey].mean
      : DATA.equalWindow138[mod][mKey];
  }

  function renderRadar() {
    const svg = document.getElementById('radarSvg');
    const models = ['h3', 'seedance', 'wan', 'cosmos_depth'];
    const cx = 190, cy = 172, R = 118;

    // Direction-aligned normalized quality across the 4 generative models
    const norm = {};
    METRIC_CFG.forEach((mc) => {
      const vals = models.map((m) => getVal(m, mc.key));
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const span = Math.max(1e-6, maxV - minV);
      norm[mc.key] = {};
      models.forEach((m) => {
        const raw = getVal(m, mc.key);
        const q = mc.lowerBetter ? (maxV - raw) / span : (raw - minV) / span;
        norm[mc.key][m] = 0.24 + 0.72 * q;
      });
    });

    let html = '';
    [0.25, 0.5, 0.75, 1.0].forEach((ring) => {
      const pts = METRIC_CFG.map((_, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / METRIC_CFG.length;
        return `${(cx + R * ring * Math.cos(ang)).toFixed(1)},${(cy + R * ring * Math.sin(ang)).toFixed(1)}`;
      }).join(' ');
      html += `<polygon points="${pts}" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="1"/>`;
    });

    METRIC_CFG.forEach((mc, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / METRIC_CFG.length;
      const x2 = cx + R * Math.cos(ang);
      const y2 = cy + R * Math.sin(ang);
      const lx = cx + (R + 28) * Math.cos(ang);
      const ly = cy + (R + 22) * Math.sin(ang);
      html += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(148,163,184,0.2)" stroke-width="1"/>`;
      html += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" fill="#cbd5e1" font-size="11.5" font-weight="600">${mc.label}</text>`;
    });

    models.forEach((m) => {
      const isDim = highlightedModel && highlightedModel !== m;
      const pts = METRIC_CFG.map((mc, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / METRIC_CFG.length;
        const rad = R * norm[mc.key][m];
        return `${(cx + rad * Math.cos(ang)).toFixed(1)},${(cy + rad * Math.sin(ang)).toFixed(1)}`;
      }).join(' ');
      const col = MODEL_META[m].color;
      html += `<polygon points="${pts}" fill="${col}" fill-opacity="${isDim ? 0.04 : 0.17}" stroke="${col}" stroke-width="${highlightedModel === m ? 3.2 : 2.1}" stroke-opacity="${isDim ? 0.25 : 0.95}"/>`;
      METRIC_CFG.forEach((mc, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / METRIC_CFG.length;
        const rad = R * norm[mc.key][m];
        html += `<circle cx="${(cx + rad * Math.cos(ang)).toFixed(1)}" cy="${(cy + rad * Math.sin(ang)).toFixed(1)}" r="3.4" fill="${col}" opacity="${isDim ? 0.25 : 1}"/>`;
      });
    });

    svg.innerHTML = html;

    const legend = document.getElementById('radarLegend');
    legend.innerHTML = models.map((m) => `
      <span class="legend-item" data-rmodel="${m}" style="border-color:${highlightedModel === m ? MODEL_META[m].color : 'var(--border)'}">
        <span class="legend-dot" style="background:${MODEL_META[m].color}"></span>
        <span>${MODEL_META[m].short}</span>
      </span>
    `).join('');

    legend.querySelectorAll('.legend-item').forEach((el) => {
      el.addEventListener('mouseenter', () => { highlightedModel = el.dataset.rmodel; renderRadar(); });
      el.addEventListener('mouseleave', () => { highlightedModel = null; renderRadar(); });
    });
  }

  function renderLeaderboard() {
    const genKeys = ['h3', 'seedance', 'wan', 'cosmos_depth'];
    const refKeys = ['hold_a', 'proxy_rgb_a'];
    const allKeys = [...genKeys, ...refKeys];

    if (sortCol !== 'name') {
      allKeys.sort((a, b) => {
        if (MODEL_META[a].isRef !== MODEL_META[b].isRef) return MODEL_META[a].isRef ? 1 : -1;
        const va = getVal(a, sortCol);
        const vb = getVal(b, sortCol);
        return sortAsc ? va - vb : vb - va;
      });
    }

    const bestByMetric = {};
    METRIC_CFG.forEach((mc) => {
      const vals = genKeys.map((k) => getVal(k, mc.key));
      bestByMetric[mc.key] = mc.lowerBetter ? Math.min(...vals) : Math.max(...vals);
    });

    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = allKeys.map((k) => {
      const meta = MODEL_META[k];
      const cells = METRIC_CFG.map((mc) => {
        const v = getVal(k, mc.key);
        const isBest = !meta.isRef && v === bestByMetric[mc.key];
        const sdHtml = weightMode === 'group'
          ? ` <span class="sd-sub">±${DATA.equalGroup138[k][mc.key].sd.toFixed(3)}</span>`
          : '';
        return `<td class="${isBest ? 'best-val' : ''}">${v.toFixed(3)}${sdHtml}</td>`;
      }).join('');
      return `<tr class="${meta.isRef ? 'ref-row' : ''}">
        <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${meta.color};margin-right:7px;"></span>${meta.name}</td>
        ${cells}
      </tr>`;
    }).join('');

    const h3De = getVal('h3', 'delta_e_2000_gt');
    const sdDe = getVal('seedance', 'delta_e_2000_gt');
    const diff = (h3De - sdDe).toFixed(3);
    const banner = document.getElementById('paradoxBanner');
    if (weightMode === 'group') {
      banner.innerHTML = `<span><strong>Equal Source-Group Weighting (Main Protocol):</strong> Prevents 86 tabletop manipulation windows from dominating scene diversity. <strong>Seedance 2.5</strong> wins ΔE₀₀ color accuracy (<code>9.470</code> vs. <code>11.232</code>).</span><span class="mono" style="font-weight:700;color:#34d399;">H3 − Seedance ΔE₀₀ = +${diff}</span>`;
    } else {
      banner.innerHTML = `<span><strong>Equal Window Weighting (Rank Reversal!):</strong> 86 static-camera manipulation windows (62.3%) dominate the mean, flipping the color winner to <strong>MiniMax H3</strong> (<code>7.112</code> vs. <code>8.891</code>)!</span><span class="mono" style="font-weight:700;color:#fb7185;">H3 − Seedance ΔE₀₀ = ${diff}</span>`;
    }
  }

  document.querySelectorAll('#weightToggle .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#weightToggle .seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      weightMode = btn.dataset.weight;
      renderLeaderboard();
      renderRadar();
    });
  });

  document.querySelectorAll('#mainLeaderboard th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      const mc = METRIC_CFG.find((x) => x.key === col);
      if (sortCol === col) {
        sortAsc = !sortAsc;
      } else {
        sortCol = col;
        sortAsc = mc ? mc.lowerBetter : true;
      }
      renderLeaderboard();
    });
  });

  renderRadar();
  renderLeaderboard();

  /* ---------------- 7. Human & Calibrated VLM Elo Bars ---------------- */
  function renderElo(poolKey) {
    const pool = DATA.elo[poolKey];
    const order = ['seedance', 'h3', 'wan', 'cosmos_depth'].sort((a, b) => pool[b].elo - pool[a].elo);
    const maxScale = 1750;
    const container = document.getElementById('eloBars');
    container.innerHTML = order.map((k) => {
      const item = pool[k];
      const pct = Math.max(4, (item.elo / maxScale) * 100);
      const ciLeft = Math.max(0, (item.ci[0] / maxScale) * 100);
      const ciWidth = Math.max(1, ((item.ci[1] - item.ci[0]) / maxScale) * 100);
      return `<div class="elo-row">
        <div class="elo-row-head">
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${MODEL_META[k].color};margin-right:7px;"></span>${MODEL_META[k].short}</span>
          <span class="mono">${item.elo} <span style="color:var(--text-2);font-size:0.75rem;">[${item.ci[0]}, ${item.ci[1]}]</span></span>
        </div>
        <div class="elo-track">
          <div class="elo-bar" style="width:${pct.toFixed(1)}%;background:${MODEL_META[k].color};opacity:0.82;"></div>
          <div class="elo-ci" style="left:${ciLeft.toFixed(1)}%;width:${ciWidth.toFixed(1)}%;"></div>
        </div>
      </div>`;
    }).join('');
  }

  document.querySelectorAll('#eloPoolTabs .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#eloPoolTabs .seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderElo(btn.dataset.elo);
    });
  });
  renderElo('human_amended');

  /* ---------------- 8. Controlled Prompt & Rendering Diagnostics SVG ---------------- */
  let diagStudy = 'rendering';
  let diagMetric = 'lpips_gt';
  let diagModel = 'seedance';

  const COND_NAMES = {
    P0: 'P0 · Minimal',
    P1: 'P1 · Ref Roles',
    P2: 'P2 · Spatial/Contact',
    P3: 'P3 · Action/Timing',
    P4: 'P4 · Photo Style',
    P5: 'P5 · Failure Prev.',
    R1: 'R1 · No Texture',
    R2: 'R2 · Clay Shade',
    R3: 'R3 · No Ambient',
    R4: 'R4 · Flat Light',
    R5: 'R5 · No Shadows',
    R6: 'R6 · Low Exposure',
    R7: 'R7 · High Exposure',
    R8: 'R8 · Low Contrast',
    R9: 'R9 · Desaturated'
  };

  function renderDiagnostics() {
    const list = (diagStudy === 'prompt' ? DATA.promptDeltas : DATA.renderingDeltas)
      .filter((d) => d.model === diagModel && d.metric === diagMetric)
      .sort((a, b) => a.candidate.localeCompare(b.candidate));

    const svg = document.getElementById('diagSvg');
    const W = 920, H = 270;
    const padL = 150, padR = 90, padT = 24, padB = 34;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxAbs = Math.max(0.06, ...list.map((d) => Math.max(Math.abs(d.ci[0]), Math.abs(d.ci[1]), Math.abs(d.delta)))) * 1.15;
    const xOf = (v) => padL + ((v + maxAbs) / (2 * maxAbs)) * plotW;
    const zeroX = xOf(0);

    let html = `
      <rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" rx="8" fill="rgba(255,255,255,0.02)" stroke="rgba(148,163,184,0.14)"/>
      <line x1="${zeroX.toFixed(1)}" y1="${padT}" x2="${zeroX.toFixed(1)}" y2="${padT + plotH}" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.4"/>
      <text x="${zeroX.toFixed(1)}" y="${H - 10}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="JetBrains Mono">0.000 (Baseline ${diagStudy === 'prompt' ? 'P6' : 'R0'})</text>
    `;

    [-0.75, -0.4, 0.4, 0.75].forEach((frac) => {
      const v = frac * maxAbs;
      const x = xOf(v);
      html += `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${padT + plotH}" stroke="rgba(148,163,184,0.08)"/>`;
      html += `<text x="${x.toFixed(1)}" y="${H - 10}" text-anchor="middle" fill="#64748b" font-size="10.5" font-family="JetBrains Mono">${v >= 0 ? '+' : ''}${v.toFixed(3)}</text>`;
    });

    const rowH = plotH / Math.max(1, list.length);
    list.forEach((d, idx) => {
      const cy = padT + (idx + 0.5) * rowH;
      const x1 = xOf(d.ci[0]);
      const x2 = xOf(d.ci[1]);
      const xm = xOf(d.delta);
      const improved = diagMetric === 'lpips_gt' ? d.delta < 0 : d.delta > 0;
      const sig = (d.ci[0] > 0 && d.ci[1] > 0) || (d.ci[0] < 0 && d.ci[1] < 0);
      const col = !sig ? '#94a3b8' : improved ? '#34d399' : '#fb7185';

      const barX = Math.min(zeroX, xm);
      const barW = Math.max(2, Math.abs(xm - zeroX));

      html += `<text x="${padL - 12}" y="${(cy + 4).toFixed(1)}" text-anchor="end" fill="#e2e8f0" font-size="12" font-weight="600">${COND_NAMES[d.candidate] || d.candidate}</text>`;
      html += `<rect x="${barX.toFixed(1)}" y="${(cy - 6).toFixed(1)}" width="${barW.toFixed(1)}" height="12" rx="3" fill="${col}" fill-opacity="0.32"/>`;
      html += `<line x1="${x1.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${col}" stroke-width="2.2"/>`;
      html += `<line x1="${x1.toFixed(1)}" y1="${(cy - 4).toFixed(1)}" x2="${x1.toFixed(1)}" y2="${(cy + 4).toFixed(1)}" stroke="${col}" stroke-width="2"/>`;
      html += `<line x1="${x2.toFixed(1)}" y1="${(cy - 4).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${(cy + 4).toFixed(1)}" stroke="${col}" stroke-width="2"/>`;
      html += `<circle cx="${xm.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5" fill="${col}"/>`;
      html += `<text x="${W - padR + 10}" y="${(cy + 4).toFixed(1)}" fill="${col}" font-size="11.5" font-family="JetBrains Mono" font-weight="700">${d.delta >= 0 ? '+' : ''}${d.delta.toFixed(3)}</text>`;
    });

    svg.innerHTML = html;
  }

  document.querySelectorAll('#diagStudyTabs .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#diagStudyTabs .seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      diagStudy = btn.dataset.study;
      renderDiagnostics();
    });
  });

  document.querySelectorAll('#diagMetricTabs .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#diagMetricTabs .seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      diagMetric = btn.dataset.dmetric;
      renderDiagnostics();
    });
  });

  document.querySelectorAll('#diagModelTabs .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#diagModelTabs .seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      diagModel = btn.dataset.dmodel;
      renderDiagnostics();
    });
  });
  renderDiagnostics();

  /* ---------------- 9. Pipeline Toggle & Fullscreen Lightbox ---------------- */
  const pipelineImg = document.getElementById('pipelineImg');
  const pipelineFrame = document.getElementById('pipelineFrame');
  const pipelineCaption = document.getElementById('pipelineCaption');

  document.querySelectorAll('#pipelineSwitch .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pipelineSwitch .seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.pipe;
      const srcMap = {
        siggraph: 'assets/figures/siggraph_teaser.webp',
        simple: 'assets/figures/pipeline_simple.webp',
        detailed: 'assets/figures/pipeline_detailed.webp'
      };
      const capMap = {
        siggraph: '<strong>Figure 1 · SIGGRAPH-Style Hero Teaser:</strong> Left: Passive 2D controls bake source light without scene edits, while static <code>t=0</code> holds lock view and motion. Center: RenderBench pairs camera/pose tracking and agent Blender authoring with two-stage review (<code>L1</code> geometry/cameras, <code>L2</code> actors, <code>L3</code> Three.js/Eevee/Cycles, R1–R9 edits, and counterfactual 3D paths). Right: Held-out <code>t&gt;0</code> evaluation across six metrics and human/VLM Elo.',
        simple: '<strong>Concise 4-Stage Overview:</strong> From a real video and its unscored <code>t=0</code> reference frame (1), coding-agent Blender scripting with two-stage human review recovers an editable dynamic 3D scene (2) to drive multi-engine proxy renders across four video generators (3) and six-metric + human/VLM evaluation on held-out <code>t&gt;0</code> frames (4).',
        detailed: '<strong>Figure S9 · Expanded 7-Stage Generation &amp; Evaluation Pipeline:</strong> Detailed view of two-stage human-reviewed 3D scene &amp; pose reconstruction across Three.js, Eevee, and Cycles, native conditioning interfaces, and contrast-stretched three-granularity polygon radar charts.'
      };
      pipelineImg.src = srcMap[mode];
      pipelineFrame.dataset.lightbox = srcMap[mode];
      pipelineCaption.innerHTML = capMap[mode];
    });
  });

  const lightbox = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  document.querySelectorAll('[data-lightbox]').forEach((el) => {
    el.addEventListener('click', () => {
      lightboxImg.src = el.dataset.lightbox;
      lightbox.classList.add('open');
    });
  });
  lightbox.addEventListener('click', () => {
    lightbox.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') lightbox.classList.remove('open');
  });
})();
