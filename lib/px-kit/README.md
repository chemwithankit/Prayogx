# PrayogX Experience Kit (Phase 1)

Small ES5 modules that a standalone experience page **copies in** between markers. No loader, no network,
no build step: the page stays one self-contained `index.html`.

```
/* PX-KIT obs@1 BEGIN */
…exact copy of lib/px-kit/obs@1.js…
/* PX-KIT obs@1 END */
```

Status: **Phase 1.** The toy harness `tests/kit/toy/index.html` uses every module. One page uses one block:
CON-CHE-CALORIMETER-01's explainer mode (media production only, off for learners) embeds `cam@1` for its named camera
shots. Every other page is unchanged; `tests/kit/test_px_kit.py` fails on any other page or block. Existing pages are
frozen and are never retrofitted.

## Layers

```
MODEL (ENGINE)  →  SCIENTIFIC OBSERVABLES (OBS)  →  PRESENTATION (draw, guide text, camera)
                      ↑                                 │
           ACTIONS (ACT.do) ← learner / Director / tests / recorder
```

- **ENGINE** computes. It is pure and knows nothing of the page.
- **OBS** is the one scientific truth per frame. Every consumer reads the same snapshot.
- **Presentation** only reads observables. It never reads ENGINE, never copies a model constant, and never
  prints a scientific number that did not come from an observable.
- **ACT** is the only path that changes state. **DIR** (the Director) plays films through ACT and never
  touches scientific state. **CAM** is renderer-independent camera math. **CLOCK** is the only time source.

## Modules and exact APIs

| Module | Bytes (with comments / no comments / gzip) | Purpose |
|---|---|---|
| `clock@1` | 2413 / 1446 / 1118 | deterministic time |
| `obs@1` | 5258 / 3671 / 1987 | observables, formatting, provenance |
| `act@1` | 9000 / 6735 / 3197 | actions, the learning script, next action, replay |
| `dir@1` | 6041 / 4714 / 2102 | the Director (films) |
| `cam@1` | 3412 / 2599 / 1406 | camera shots and moves |
| **total** | **26124 / 19165 / 9810** | |

### `CLOCK` (clock@1)
- `CLOCK.create({substep?, maxDt = 0.05})` → `c` with `c.t`, `c.frame`, `c.speed`, `c.paused`
  - `c.step(dt)` caps `dt` at `maxDt`, scales by `speed`, advances `t` (not while paused), always increments
    `frame`, and calls each `c.on` subscriber with `(h, t)`. With `substep` set, time moves only in whole
    fixed substeps of that size and the remainder carries to the next frame, so a time-stepped model gives
    the same result at 30, 50 or 60 fps. Returns the time advanced.
  - `c.on(fn)`, `c.pause(on)`, `c.setSpeed(k)`, `c.reset()`
- `CLOCK.approach(cur, target, rate, dt)` exponential approach, frame-rate independent.
- `CLOCK.drive(c, onFrame, before?)` runs the page loop from `requestAnimationFrame` timestamps.
  Under the recorder's manual clock this makes every run frame-exact.

### `OBS` (obs@1)
- `OBS.STATUS` = measured | calculated | illustrative | idealized | hypothetical | exaggerated;
  `OBS.KINDS` = sci | ui | decor.
- `OBS.create()` → `O`
  - `O.def(id, {unit, meaning, status, signed?, sign?, decimals = 2, plus?, from(ctx, get)})` — id like
    `water.T`; duplicate or malformed ids throw. `from` may read earlier observables through `get(id)`.
  - `O.frame(ctx)` computes every value once, in definition order (non-finite values throw).
  - `O.v(id)` raw value; `O.num(id)` the number and `O.f(id)` number and unit, both at the observable's
    `decimals` (U+2212 minus, no −0, `+` when `plus`); `O.present(id, progress, start?)` the revealed value
    and `O.fp(id, progress, start?)` its text, a *presentation* reveal from `start` (default 0) that never
    changes the observable.
  - `O.meta(id)`, `O.ids()`, `O.snapshot()` `{id: value}`, `O.flat()` `{obs_water_T: value}` (the recorder
    keeps only flat fields).
  - `O.shown(text, kind)` records a visible string as `{text, kind, from}`, where `from` holds the
    `f/num/fp` strings printed since the previous `shown()` call (the observable strings that text was built
    from); `O.shownList()`, `O.emitted()` (every string `f/num/fp` printed this frame); `O.frames`.

### `ACT` (act@1)
- `ACT.create({state: S, script, obs, clock, busy?, onScene?, onAction?})` → `A`; `S.scene` (index) and
  `S.flags` are required.
  - `A.def(id, {run(S, args), when?(S, args), args?: [allowed values], whileBusy?})`, `A.pred(name, fn(S))`.
  - Conditions are **objects**: `{all:[…]}`, `{any:[…]}`, `{not:c}`, `{flag:"x"}` / `{flag:"!x"}`,
    `{obs:"id", op:">=", value, tol?}`, `{pred:"name"}`, `{idle:true}`. Unknown keys and strings throw;
    nothing is ever evaluated.
  - Built-in `advance`: moves to the next scene when the current scene's `exit` holds.
  - `A.check(id, args)` → reason or `null`; `A.do(id, args, source)` with source
    learner | director | test | recorder → `{ok, reason?}`, logged as `{f, t, id, args, source}`.
  - `A.next()` → `{id, args, label}` from the scene's `next` rules; `A.doNext(source)`.
  - `A.hitsReset()`, `A.hit(rect, id, args)`, `A.at(x, y)` canvas tap regions.
  - `A.log()`, `A.reset()`, `A.replayer(entries)` → a function to call before each clock step; it
    re-applies non-Director entries when simulation time reaches their `t`, so a session replays the same
    at any frame rate; `A.scene()`, `A.validate(guideIds)` → list of problems;
    `A.syncNextUI({button, sticky, stage, primary, idleText})`.
- Script shape: `{scenes: [{id, objective, allow: [ids], next: [{if?, act, args?, label}], exit?, guide?,
  milestone?}]}`. Every scene but the last needs `exit`.

### `DIR` (dir@1)
- `DIR.create({state: S, act, clock, cam?, onEnd?})` → `D`; status in `S.dir` = `{film, i, mode, mark, marks,
  shot, focus, say, hint, error, done}` (serialisable).
  - `D.load(name, steps)` validates every step: exactly one of `do` / `wait` / `shot` / `focus` / `say` /
    `mark` / `end`; a wait has exactly one of `idle` / `obs` / `pred` / `learner` / `seconds`, optional
    `timeout` (> 0) and `hint`.
  - `D.play(name, mode)` with mode media | classroom | learner; `D.stop()`, `D.reset()`, `D.playing()`,
    `D.tap()` (classroom: the teacher releases a learner wait); `D.update()` once per frame.
  - `do` goes through `act.do(…, "director")`: a refused action stops the film with an error. A learner
    wait is passed in media mode, released by `tap()` in classroom mode, and in learner mode needs a
    *learner* action matching the id (`fill*` prefixes allowed). A timeout with a hint shows the hint and
    keeps waiting; without one it stops with an error. A bad step stops the film; it never throws into the
    frame loop.

### `CAM` (cam@1)
- `CAM.create(shots, {portrait?(), maxYaw = 0.6, maxPitch = 0.25})` with `shots = {name: {eye, at, fov,
  tall?: {eye, at, fov}}}` → `cam`
  - `cam.resolve(name)` (the tall variant on portrait screens), `cam.set(name)`, `cam.go(name, dur, lift?)`
    (cubic ease, the target leads the eye, optional lift arc), `cam.update(dt)`, `cam.flying()`,
    `cam.user(dyaw, dpitch)` (cancels a move where it is, clamped), `cam.resetUser()`,
    `cam.view()` → `{eye, at, fov, shot}`, `cam.state()`. `CAM.ease(t)`.
- Pure math: no renderer, no canvas, no 3-D engine. A 2.5-D or a 3-D renderer projects `view()` itself.

## The ENGINE contract

```
/* ENGINE-BEGIN */
var ENGINE = (function () {
  var C = 4.2;                                   /* named constants, exposed on the object */
  function run(params, t) { … return {…}; }      /* pure: the same inputs give the same result */
  return { C: C, run: run };
})();
/* ENGINE-END */
```

- `run(params, t?)` is pure and total over the whole input range. A time-stepped model may instead expose
  `step(ms, dt)` (mutates only its own model state `ms`) and `derive(ms, params)`.
- Constants are exported on `ENGINE` so tests can find copies of them in presentation code.
- No DOM, no clock, no randomness, no presentation progress.

## The PX contract (what tests, the recorder and the reel tools rely on)

`window.PX` must provide:

| Member | Meaning |
|---|---|
| `start()` | reset and play the default film in media mode (the recorder calls it) |
| `reset()`, `lesson(mode)` | reset; play the lesson film in learner / classroom mode |
| `RUN.done` | the default film ended (the recorder's default done condition) |
| `state()` | `{phase, stage, t, busy, mark, marks, shot, focus, say, hint, dirError, done, obs, obs_*}` |
| `obs(id)`, `answer()` | an observable's value; the key result as text, from OBS |
| `next()`, `doNext()` | the next action; do it as the learner |
| `snapshot()` | full serialisable state for replay comparison |
| `texts()`, `emitted()` | visible strings with their kind; numbers printed from observables this frame |
| `log()`, `replay(entries)` | the action log; reset and replay a log |
| `anchors()` | screen points of labelled apparatus (camera framing checks) |
| `kit` | `{OBS, ACT, DIR, CAM, CLOCK, SCRIPT, GUIDES}` instances |
| `speed(k)`, `setSpeed(k)`, `minLabelPx()`, `stage()` | as before |

The page also has `#labcv` (the experience canvas), marks every element holding scientific text with
`data-sci`, and wraps drawing code in `/* PRESENT-BEGIN */ … /* PRESENT-END */`.

The standard learner flow also expects `#nextbtn` (the guide's NEXT button) and `#stickybtn` (the sticky
next-action button), both kept by `ACT.syncNextUI()`. The 390 px contract requires one of them to be on
screen, without scrolling, when the experience is in view. The default film moves the camera at least once,
so the camera-override check has a scripted move to interrupt.

### Rules every page keeps
1. Every state change goes through `ACT.do()`. Buttons, canvas taps, the Director, tests and replays alike.
2. Every scientific number on screen comes from an observable in that frame (`O.f`, `O.num`, `O.fp`), formatted
   just before its text is recorded with `O.shown(text, "sci")`; once those strings are removed, no digit may
   remain. A `data-sci` element shows only a text recorded as `"sci"` that frame. Chemical formulas use
   subscript glyphs (H₂O). UI numbers (step counters, scene
   numbers) are `"ui"`; scale ticks and decoration are `"decor"`.
3. Observables never hold animation progress. A reveal is `O.present()` / `O.fp()`.
4. Time only from `CLOCK`. No `Date`, no `performance.now` in model or presentation.
5. Predicates are named functions; conditions and films are data.

## Distribution and versions

```
python3 tools/px_kit.py check [FILE …]   # every block matches a recorded version (default: whole tree)
python3 tools/px_kit.py embed FILE       # replace each block in FILE with its canonical copy
python3 tools/px_kit.py hash [--write]   # record canonical hashes in VERSIONS.json
python3 tools/px_kit.py size
```

- `VERSIONS.json` records the SHA-256 and size of each `<name>@<version>`. Once a version is released
  (committed), it never changes: `hash --write` refuses, and a change becomes `<name>@<version+1>`.
- A page pins its versions and upgrades only on purpose, page by page.
- `tools/check_library.py` runs `px_kit.problems()`: an edited copy, an unrecorded version, a malformed or
  duplicated block, or a changed canonical file fails the library check.

## Tests

| Command | What it proves |
|---|---|
| `node tests/kit/kit_unit.js` | each module in isolation (77 checks) |
| `node tests/kit/kit_toy.js` | the shared contracts (`tests/kit/contracts.js`) on the toy, incl. the real `recorder.js` twice (40 checks) |
| `python3 tests/kit/test_px_kit.py` | versions, tamper detection, the check_library hook (18 checks) |

`tests/kit/contracts.js` exports `all(browser, file, options)`; a later experience page runs the same
contracts with its own learner session and lesson clicks.
