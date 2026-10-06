# Rendering & media pipeline — research, benchmarks, decision

Status: **research report (2026-10-06), for the owner's decision. Nothing here is implemented.** Evidence labels:
**[M]** measured locally · **[E]** measured or documented externally · **[D]** documented by a project · **[est]**
engineering estimate derived from [M] numbers · **[hyp]** hypothesis.

## A. Executive summary

**What causes the bottleneck.** The media renderer is not the problem: it is a small scene (≈ 55 WebGL draw calls a
frame [M]). The time goes to two things the pipeline never needed to pay for:

1. **Software WebGL.** Headless Chromium (the recorder's Playwright build, Chromium 141) renders WebGL with
   **SwiftShader**, a CPU emulation of a GPU, by default [M][E]. One 1920×1080 frame of the calorimeter's heaviest
   scene takes **3.2–4.5 s** to render in software and **7 ms** on the machine's own GPU (ANGLE → Metal, Intel Iris
   Plus 645) — **≈ 450–640× faster** [M].
2. **The capture method.** The recorder saves each frame with a Playwright *element screenshot* as PNG:
   **0.75–0.95 s** per 1080p frame [M]. Reading the canvas directly (`toDataURL('image/png')`, lossless) takes
   **0.19–0.24 s**; a JPEG element screenshot **0.15–0.18 s**; canvas JPEG **≈ 0.1 s** [M].

Today ≈ 77 % of a frame is rendering and ≈ 22 % capture [M]. With the GPU on, rendering falls to < 1 % and capture
becomes almost the whole cost.

**Best solution: do not change the renderer, the engine, the Experience Kit or the scientific architecture.** Use the
GPU that is already in the machine, capture the canvas instead of screenshotting the page, and render frame segments in
parallel. All three are small, additive, default-off options in the existing recorder/browser launch.

**How much faster** (86 s, 2,589 frames, 9:16): today **≈ 3.9 h** [est from M] (16:9 measured **2 h 31 min** [M]) →
GPU only **≈ 40 min** → + canvas capture **≈ 12–15 min** (lossless) → + 4 parallel segments **≈ 5–8 min** [est from M].
That is **≈ 20–40× faster at identical visual quality**. Faster than real time is not reachable on this Intel
MacBook (capture ceiling ≈ 11 frames/s [M]); it is plausible on Apple Silicon [hyp].

## B. Current architecture diagnosis

Pipeline today: Experience page (standalone ES5, own WebGL renderer + 2-D canvas, explainer mode) → `recorder.js`
(Playwright Chromium, manual clock: `requestAnimationFrame`, `performance.now`, `Date.now` replaced; per frame: step
1/30 s, read `PX.state()`, element screenshot PNG) → `footage.json` + PNG frames → `encode.swift` (AVFoundation H.264
+ AAC) → `mp4tools.py` (no edit lists) → checks.

Machine: MacBook Pro, Intel Core i5-8257U (4 cores / 8 threads), 8 GB, Intel Iris Plus 645 (Metal 3), macOS 15.7 [M].

| Stage (per 1080p frame, scene 6 "heat") | SwiftShader (today) | GPU: ANGLE/Metal |
|---|---|---|
| step: page update + 2-D canvas + WebGL scene + composite | 3,292 ms (16:9) · 4,498 ms (9:16) | **7 ms** |
| `PX.state()` read | 6 ms | 4 ms |
| capture: element screenshot PNG (recorder today) | 950 ms (16:9) · 820 ms (9:16) | 891 · 753 ms |
| capture: element screenshot JPEG q92 | 178 · 182 ms | 151 · 156 ms |
| capture: canvas `toDataURL` PNG (lossless) | 236 · 194 ms | 241 · 194 ms |
| capture: canvas `toDataURL` JPEG q92 | 90 · 95 ms | 98 · 104 ms |

[M] 60 frames each, means. Full production run (16:9, all scenes): **9,063 s** = 3.5 s/frame including encode and
checks [M]. Encoding: `encode.swift` ≈ **14 frames/s** for 1080p whether fed PNG or JPEG (300 frames: 21.5 s vs
23.3 s) [M]; the full 2,589-frame encode took 572 s [M] — its per-frame CPU `CGContext.draw` into an ARGB buffer, not
the H.264 encoder, is the likely limit [hyp].

Workload per frame [M]: ≈ 55 `drawElements`, 3 `bufferData` (sprites), 1 WebGL→2-D `drawImage` (the composite), 1
`clear`. Not draw-call bound; on a CPU rasteriser it is fill-rate bound (≈ 2 M antialiased pixels shaded in software).

**Correction of an earlier hypothesis:** before measuring, I estimated capture at ≈ 70 % of the time. Measured, it is
≈ 22 % under SwiftShader; rendering dominates until the GPU is enabled.

## C. Research findings (what others do)

| System | What it does | Lesson for PrayogX |
|---|---|---|
| **Remotion** ([GPU](https://www.remotion.dev/docs/gpu), [gl options](https://www.remotion.dev/docs/gl-options), [performance](https://www.remotion.dev/docs/performance)) | headless Chromium renders React frames; frame-addressable (`useCurrentFrame`); `--concurrency` parallel tabs; JPEG default | [D] "In headless mode, Chromium disables the GPU, leading to a significant slowdown"; `--gl=angle` recommended on desktops; ANGLE memory leaks on long renders → split into segments; JPEG faster than PNG. Exactly our three levers. |
| **timesnap / timecut** ([repo](https://github.com/tungs/timesnap), [timecut](https://github.com/tungs/timecut)) | virtual-time override (like our recorder) + screenshots or **canvas capture mode** | [D] canvas capture "reads canvas data directly instead of … screen capturing and seems capable of running faster than real time"; the author notes Puppeteer screenshotting is the bottleneck ([note](https://medium.com/@stevetung/though-theoretically-possible-faster-than-real-time-capture-is-a-challenge-and-not-really-an-aim-3248b04250bd)). Matches our [M]. |
| **puppeteer-capture** ([repo](https://github.com/alexey-pelykh/puppeteer-capture)) | `HeadlessExperimental.beginFrame` frame-perfect capture | [D] Linux/Windows only, old headless shell; our manual clock already gives frame-exact determinism (60/60 identical [M]) — not needed. |
| **CCapture.js** ([repo](https://github.com/spite/ccapture.js/)) | in-page virtual clock + canvas capture at fixed frame rate | [D] same principle as our recorder: time is virtual, so speed is bounded only by render + capture. |
| **Motion Canvas** ([image sequence](https://motioncanvas.io/docs/rendering/image-sequence/)) | `time = frame / fps`, frames exported from canvas | frame-addressable, canvas-native export. |
| **Unity** ([captureFramerate](https://docs.unity3d.com/6000.2/Documentation/Manual/time-capture-frame-rate.html), [FFmpegOut](https://github.com/keijiro/FFmpegOut)) | `Time.captureFramerate` decouples game time from wall clock; GPU readback piped to an encoder | [D] engines solve offline rendering with the same clock decoupling we already have; their speed comes from a GPU + direct readback, not from a different scene model. |
| **Blender EEVEE** ([background rendering](https://devtalk.blender.org/t/blender-2-8-unable-to-open-a-display-by-the-rendering-on-the-background-eevee/1436)) | GPU real-time renderer, CLI renders | [E] EEVEE needs a display even in background mode; using it means re-modelling every apparatus and driving it from our science — duplicated truth. Rejected. |
| **Chromium SwiftShader policy** ([intent to remove](https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM), [docs](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md)) | automatic SwiftShader fallback for WebGL deprecated; opt-in `--enable-unsafe-swiftshader` | [D] software WebGL is a test fallback, not a production renderer; a future Chromium may refuse it without the flag. Our tests should not silently depend on it. |
| **Playwright GPU in headless** ([issue 11627](https://github.com/microsoft/playwright/issues/11627), [Krämer](https://michelkraemer.com/enable-gpu-for-slow-playwright-tests-in-headless-mode/)) | GPU off by default in headless; launch args enable it on macOS | [E] macOS users report working GPU via launch args; confirmed here: `--enable-gpu --use-angle=metal --ignore-gpu-blocklist` → "ANGLE Metal Renderer: Intel Iris Plus 645" [M]. |
| **WebGPU vs WebGL** ([benchmark repo](https://github.com/VictorQuerinoMartins/webgpu-vs-webgl-benchmark)) | gains concentrate in draw-call-heavy scenes | [E] wins come from lower per-draw CPU overhead with thousands of draws; our 55-draw scene does not have that problem. |
| **VideoToolbox** ([FFmpeg on Apple Silicon](https://codetv.dev/blog/hardware-acceleration-ffmpeg-apple-silicon)) | hardware H.264/HEVC | [E] hardware encoders are many times faster than x264; our AVFoundation encoder already uses the platform encoder — its bottleneck is the per-frame CPU draw [hyp]. |

## D. Architecture options

| # | Approach | Speed-up (86 s, 9:16) | Quality | Science | Determinism | Effort | Reuse of sims / Kit / recorder contract | Scales to 100+ | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| A | Optimise the WebGL renderer (fewer draws, smaller MSAA…) | ≤ 1.5× in software [est]; ~0 once on GPU (7 ms) | risk of loss | same | same | medium, per page | yes / yes / yes | per-page work | **No** — wrong bottleneck |
| B | **GPU in headless Chromium** (launch args) | **≈ 5×** alone [est from M: 0.77 s vs 4.5 s/frame] | **equivalent** (mean diff 1.6–1.9/255) [M] | same model | 60/60 identical per renderer [M] | tiny | full / full / full (launch option only) | yes | **Yes — step 1** |
| B+ | + **canvas capture** (lossless PNG via `toDataURL`, or JPEG) | **≈ 15–20×** [est from M: 0.21 s/frame] | identical (PNG) | same | same | small | full / full / additive recorder option | yes | **Yes — step 2** |
| B++ | + **parallel segments** (k pages; each steps the whole timeline at 7 ms/frame, captures 1/k) | **≈ 25–40×** [M: 4 pages 91 ms/frame with JPEG] | identical | same | same frames (deterministic clock) | small–medium | full / full / additive | yes | **Yes — step 3** |
| C | OffscreenCanvas / workers | ≈ 0 on top of B++ [est] | same | same | same | high (ES5 page restructure) | partial | — | No |
| D | WebGPU renderer | ≈ 0 for this scene on GPU (7 ms already) [est]; none without a GPU | same | same | driver-dependent | very high (rewrite renderer + shaders, Android support) | no | — | **Defer** |
| E | Separate media renderer sharing model/script/camera | only with B anyway | same | same | same | high | partial | yes | **Not needed**: the explainer mode already *is* a media runtime sharing model, observables, script and camera |
| F | Native engine (Blender/Godot/Unity/Unreal/Filament/wgpu) | high per frame, but B already gives 7 ms | potentially higher | **risk: second scene + science copy** | engine-dependent | very high, per experience | no | costly | **No** |
| G | Hybrid: pre-render static 3-D, composite dynamics | ≈ 0 beyond B (render is 7 ms) | risk (lighting/occlusion mismatches) | risk | complex | high | partial | — | **No** |
| H | Render once, reuse many (scene clips → several reels) | avoids re-render of shared scenes | identical | same | same | medium (compositor for reel-specific intro/outro) | yes | yes | **Later** — with B++ a reel costs minutes; build when reel count makes it worth it |

Web, Android and offline behaviour are untouched by B/B+/B++ (media-side only). Licensing: all within Chromium /
Playwright (BSD / Apache-2.0) already in use.

## E. Benchmark results (all [M], this MacBook, Chromium 141.0.7390.37, scene 6 "heat", 60 frames per cell)

- Renderer strings: default headless → `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`;
  with `--enable-gpu --use-angle=metal --ignore-gpu-blocklist` → `ANGLE (Intel, ANGLE Metal Renderer: Intel(R) Iris(TM)
  Plus Graphics 645)`; `--use-angle=gl` also reaches the GPU (OpenGL 4.1).
- Per-frame costs: table in §B. Note: the explainer canvas is always rendered at its full target size (1920×1080 or
  1080×1920), so the "960×540 viewport" runs differ only in screenshot size (372 vs 950 ms PNG), not in render cost.
- **Determinism:** two identical runs, 60 frames, canvas PNG hashes: SwiftShader **60/60** identical, GPU **60/60**
  identical (9:16).
- **Visual equivalence GPU vs SwiftShader** (same frame): mean absolute difference **1.56/255** (16:9), **1.87/255**
  (9:16); 1.4 % / 3.0 % of pixels differ by more than 16/255 — the procedural insulation speckle, antialiased edges and
  the burning sample's glow falloff. Visually equivalent side by side.
- **Parallel pages** (1080×1920, step + JPEG element screenshot per frame): SwiftShader 1/2/4 pages → 3,952 / 3,655 /
  3,699 ms per frame (no gain: CPU-bound). GPU 1/2/4 pages → **163 / 113 / 91 ms** per frame.
- **Encoding** (`encode.swift`, 1080p): 300 frames 21.5 s (PNG in) / 23.3 s (JPEG in) ≈ 14 fps; 2,589 frames 572 s.
- Learner pages: not affected (media-side change only); the learner identity gate for the explainer mode passed earlier
  (126 comparisons, 0 differences).

## F. Recommendation (one)

**Keep the renderer and the architecture; accelerate the capture pipeline.** Concretely, three additive,
default-off options for media production, each gated by the existing determinism tests:

1. **GPU launch option** for media rendering (`--enable-gpu --use-angle=metal --ignore-gpu-blocklist`), passed by the
   media generator to the browser launch (today `tests/_browser.js` takes no arguments from `recorder.js` — one small
   option, defaults unchanged). Learner tests keep their current browser unless the owner decides otherwise.
2. **Canvas capture** in the recorder (`record.capture: "canvas-png"` lossless by default; `"canvas-jpeg"` optional),
   reading `#labcv` directly instead of an element screenshot; the per-frame `PX.state()` record is unchanged.
3. **Segmented, resumable, parallel recording**: k pages each run the same deterministic timeline (stepping costs 7 ms
   a frame on the GPU), each saving only its share of frames and appending its own `footage` rows as it goes, so a
   stopped render resumes and segments merge into the same `footage.json`.

Why: it attacks the measured costs (software rendering, page screenshots) without touching the science, the Experience
Kit, the standalone/ES5/offline architecture, Android, or the learner experience. It is the smallest change with the
largest effect: rendering 450–640× faster per frame, capture 4× faster lossless, and frame-level parallelism.

Risks: GPU drivers differ between machines (equivalence by tolerance, exact only on one machine — pin the media
machine and record its renderer string in each manifest); ANGLE memory growth on long renders (segments mitigate it
[D]); future Chromium flag changes (the renderer string check catches a silent fallback to SwiftShader); the 8 GB
machine limits parallelism (4 pages measured fine).

## G. Proposed rendering architecture

```
Experience (standalone page: ENGINE model → observables → learning script → camera shots → its own WebGL renderer)
    │
    ├── Interactive runtime (learner)        unchanged: browser / Android WebView, offline, any GPU or none
    │
    └── Media runtime = the same page in explainer mode (PX.explainMode), driven by the recorder's manual clock
              │
              ├── k segments in parallel, GPU WebGL (ANGLE→Metal), canvas capture (lossless PNG)
              │       each: step every frame (7 ms), save its frames + PX.state() rows (resumable)
              ↓
         merge → footage.json + frames (one master per format: 9:16 native; 16:9 only when wanted)
              ↓
         encoder (AVFoundation/VideoToolbox; faster buffer path later) → master video
              ↓
         reels / shorts / stills / thumbnails (from the master or per-reel renders, which now cost minutes)
```

## H. Migration plan

- **Phase 0 — done:** benchmark (this report).
- **Phase 1 — proof (≈ ½ day):** GPU + canvas-PNG capture as default-off recorder options; render a 3–5 s 9:16 clip;
  check: renderer string is Metal, frames hash-identical across two runs, equivalence vs SwiftShader within tolerance,
  learner and kit tests unchanged.
- **Phase 2 — one experience:** the bomb-calorimeter reels (9:16) with Phase 1 options; time them.
- **Phase 3 — segments + resume + parallel** in the recorder, merge into `footage.json`; existing recorder determinism
  checks (`tests/kit/kit_toy.js`) extended to segmented runs.
- **Phase 4 — encoder:** faster pixel-buffer path in `encode.swift` (BGRA, buffer pool, no per-frame CGContext draw) if
  encoding becomes the largest stage [hyp].
- **Phase 5 — other experiences:** nothing per page; any page with `PX` + canvas benefits automatically.

Unchanged throughout: every simulation page, the Experience Kit, `PX.state()` contract, observables, Director, camera
system, standalone ES5 HTML, learner tests, Android/offline, publishing gates.

## I. Performance targets (derived from §E)

| | 86 s master, 2,589 frames, 9:16 | 30 s reel, 900 frames |
|---|---|---|
| Today | ≈ 3.9 h [est] (16:9: 2 h 31 min [M]) | ≈ 1.3 h [est] |
| Phase 1: GPU only (PNG screenshot) | ≈ 40 min [est] | ≈ 14 min |
| Phase 1: GPU + canvas PNG (lossless) | ≈ 12–15 min [est] (9 min capture + encode) | ≈ 4–5 min |
| Phase 3: + 4 parallel segments | ≈ 5–8 min [est] | ≈ 2–3 min |
| Ideal (faster than real time) | not reachable on this Intel MacBook: ≈ 11 frames/s capture ceiling [M]; plausible on Apple Silicon [hyp] | |

## J. Decision

| Component | Decision |
|---|---|
| WebGL (the pages' own renderer) | **KEEP** |
| WebGPU | **DEFER** (no benefit for 55-draw scenes; revisit only for draw-heavy experiences) |
| Three.js | **DEFER / not needed** |
| Experience Kit | **KEEP** |
| `recorder.js` | **CHANGE (additively, with approval):** GPU option, canvas capture, segments/resume; defaults unchanged |
| Browser runtime (headless Chromium/Playwright) | **KEEP**, with **GPU enabled for media** |
| Separate media renderer | **NOT NEEDED** (explainer mode shares the page's truth) |
| FFmpeg | **DEFER** (not installed; AVFoundation already in place) |
| GPU / hardware encoding | **KEEP** AVFoundation; **CHANGE later** its per-frame buffer path if encode dominates |
| Standalone HTML architecture | **KEEP** |
| Deterministic clock | **KEEP** (it is what makes parallel segments safe) |
| Observables | **KEEP** |
| Director | **KEEP** |
| Camera system | **KEEP** |
