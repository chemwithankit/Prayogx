#!/usr/bin/env python3
"""Visual assets in experience pages (tools/visual_assets.py): the provenance record, the page packaging check and the
check_library hook. Fixtures only - temporary files, a 2 x 2 PNG made here; no provider, no network, no credits.
The real repository is only read. Sections: A the record, B the registry, C the page, D conventions shared with the
audio library, E nothing else changed.

The recorder side (an embedded image reaching the reel footage) is tests/visual_asset_capture.js.

Run:  python3 tests/test_visual_assets.py
"""
import base64
import copy
import json
import os
import struct
import sys
import tempfile
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
sys.path.insert(0, os.path.join(ROOT, "tools", "reel-maker"))
import visual_assets as V  # noqa: E402
import audio as AU  # noqa: E402

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


def png(w=2, h=2, rgb=(212, 30, 160)):
    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + \
        chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def fixture_root():
    root = tempfile.mkdtemp(prefix="px-visual-")
    os.makedirs(os.path.join(root, "tools", "visual-assets"))
    os.makedirs(os.path.join(root, "licences"))
    data = png()
    with open(os.path.join(root, "tools", "visual-assets", "vis-test-swatch.png"), "wb") as f:
        f.write(data)
    with open(os.path.join(root, "licences", "test-provider.md"), "w") as f:
        f.write("TEST FIXTURE - not a real licence\n")
    return root, data


ROOT_T, DATA = fixture_root()
GOOD = {"assetId": "vis-test-swatch", "mediaType": "image/png", "source": "generated",
        "generator": "tests/test_visual_assets.py (fixture)", "license": "PrayogX original (test fixture)",
        "licenseVerified": True, "commercialUse": True, "permittedUse": ["web", "app", "instagram", "youtube"],
        "attributionRequired": False, "attributionText": "",
        "file": "tools/visual-assets/vis-test-swatch.png", "sha256": V.sha256_bytes(DATA)}
EXTERNAL = dict(GOOD, source="external", provider="test-provider", model="test-model",
                licenseDocument="licences/test-provider.md")
del EXTERNAL["generator"]


def probs(**change):
    a = copy.deepcopy(GOOD)
    for k, v in change.items():
        if v is None:
            a.pop(k, None)
        else:
            a[k] = v
    return V.asset_problems(a, ROOT_T)


def refused(name, needle, problems):
    chk(name, any(needle in p for p in problems), problems)


# ------------------------------------------------------------------ A. the record
print("=== A. the record")
chk("a generated image with its generator, verified licence, web + instagram + youtube use and matching sha256 passes",
    V.asset_problems(GOOD, ROOT_T) == [], V.asset_problems(GOOD, ROOT_T))
chk("an external (provider-made) image with provider, model and a licence document kept in the repository passes",
    V.asset_problems(EXTERNAL, ROOT_T) == [], V.asset_problems(EXTERNAL, ROOT_T))
refused("licence not verified is refused", "licence not verified", probs(licenseVerified=False))
refused("licenseVerified must be literally true", "licence not verified", probs(licenseVerified="yes"))
refused("no commercial use is refused", "commercial use not permitted", probs(commercialUse=False))
refused("no licence text is refused", "no licence text", probs(license=" "))
refused("missing youtube use is refused (reels record the page)", "youtube", probs(permittedUse=["web", "instagram"]))
refused("missing web use is refused (the page is on the web)", "web", probs(permittedUse=["instagram", "youtube"]))
refused("attribution required without text is refused", "attribution", probs(attributionRequired=True))
refused("a generated asset without its generator is refused", "generator", probs(generator=None))
refused("an unknown source is refused", "source", probs(source="downloaded"))
ext_no_doc = dict(EXTERNAL, licenseDocument="licences/missing.md")
refused("an external asset without a licence document in the repository is refused", "licence document",
        V.asset_problems(ext_no_doc, ROOT_T))
ext_no_model = dict(EXTERNAL); del ext_no_model["model"]
refused("an external asset without provider and model is refused", "provider and model", V.asset_problems(ext_no_model, ROOT_T))
refused("a sha256 that does not match the file is refused", "sha256 does not match", probs(sha256="0" * 64))
refused("a malformed sha256 is refused", "64 lower-case hex", probs(sha256="ABC"))
refused("a file outside tools/visual-assets/ is refused", "kept under", probs(file="assets/vis-test-swatch.png"))
refused("a missing file is refused", "file missing", probs(file="tools/visual-assets/vis-test-gone.png"))
refused("an extension that disagrees with mediaType is refused", "extension", probs(mediaType="image/jpeg"))
refused("video is refused (it needs an owner-approved exception)", "video", probs(mediaType="video/mp4"))
refused("SVG is not an approved type", "mediaType", probs(mediaType="image/svg+xml"))
refused("an unknown field is refused (no speculative metadata)", "not a visual asset field", probs(tags=["x"]))
refused("experiences, concepts or media ids do not belong on an asset", "not a visual asset field", probs(conceptId="CPT-CHE-X"))
refused("an id that is not vis-<slug> is refused", "assetId", probs(assetId="Swatch"))
big = os.path.join(ROOT_T, "tools", "visual-assets", "vis-test-big.png")
with open(big, "wb") as f:
    f.write(b"\0" * (V.MAX_BYTES + 1))
refused("an asset larger than the embedding limit is refused", "at most",
        probs(file="tools/visual-assets/vis-test-big.png", sha256=V.sha256_bytes(b"\0" * (V.MAX_BYTES + 1))))
lib = {"vis-test-swatch": GOOD}
chk("check_asset returns the record for an approved asset", V.check_asset(lib, "vis-test-swatch", ROOT_T)["sha256"] == GOOD["sha256"])
for name, l, aid in (("an unlisted asset", lib, "vis-unknown"), ("an unlicensed asset", {"vis-test-swatch": dict(GOOD, licenseVerified=False)}, "vis-test-swatch")):
    try:
        V.check_asset(l, aid, ROOT_T)
        chk("check_asset refuses " + name, False)
    except V.VisualAssetError as exc:
        chk("check_asset refuses " + name, True, exc)

# ------------------------------------------------------------------ B. the registry
print("=== B. the registry")
real = json.load(open(os.path.join(ROOT, V.LIBRARY), encoding="utf-8"))
chk("the real registry exists, is valid, and lists no asset yet (nothing has been approved)",
    V.library_problems(ROOT) == [] and real.get("assets") == [], V.library_problems(ROOT))
chk("...and names no provider (none is configured)", "higgsfield" not in json.dumps(real).lower())
with open(os.path.join(ROOT_T, "tools", "visual_library.json"), "w") as f:
    json.dump({"assets": [GOOD, GOOD]}, f)
refused("a registry listing an asset twice is refused", "listed twice", V.library_problems(ROOT_T))
with open(os.path.join(ROOT_T, "tools", "visual_library.json"), "w") as f:
    json.dump({"assets": "none"}, f)
refused("a registry whose assets are not a list is refused", "must be a list", V.library_problems(ROOT_T))

# ------------------------------------------------------------------ C. the page
print("=== C. the page")
B64 = base64.b64encode(DATA).decode()
META = '<meta name="px-visual-asset" content="vis-test-swatch">'
PAGE = ('<!doctype html><html><head>%s</head><body><canvas id="labcv"></canvas><script>var IMG = new Image();'
        'IMG.src = "data:image/png;base64,%s";</script></body></html>') % (META, B64)
chk("a page that declares an approved asset and embeds its exact bytes passes", V.page_problems(PAGE, lib, ROOT_T) == [],
    V.page_problems(PAGE, lib, ROOT_T))
chk("a page that declares nothing is not this check's business (existing pages unaffected)",
    V.page_problems(PAGE.replace(META, ""), {}, ROOT_T) == [])
other = base64.b64encode(png(rgb=(0, 0, 0))).decode()
refused("a page embedding different bytes than the approved file is refused", "approved bytes",
        V.page_problems(PAGE.replace(B64, other), lib, ROOT_T))
refused("a page embedding the bytes under another media type is refused", "approved bytes",
        V.page_problems(PAGE.replace("data:image/png", "data:image/webp"), lib, ROOT_T))
refused("a page declaring an unlisted asset is refused", "not in", V.page_problems(PAGE.replace("vis-test-swatch\"", "vis-nope\""), lib, ROOT_T))
for remote in ('<img src="https://cdn.example/a.png">', '<div style="background:url(//cdn.example/a.png)"></div>',
               '<script>IMG.src = "http://example.org/a.png";</script>', '<video poster="https://x/p.png"></video>'):
    refused("a declaring page that loads a visual from the network is refused: " + remote[:28],
            "from the network", V.page_problems(PAGE.replace("</body>", remote + "</body>"), lib, ROOT_T))
chk("declaring the same asset twice is harmless", V.page_problems(PAGE.replace(META, META + META), lib, ROOT_T) == [])
real_lib = V.load_library(ROOT)
pages = []
for dp, _d, fs in os.walk(os.path.join(ROOT, "simulations")):
    if "index.html" in fs:
        pages.append(open(os.path.join(dp, "index.html"), encoding="utf-8").read())
chk("no existing simulation page declares a visual asset, so none is affected (%d pages)" % len(pages),
    pages and all(V.declared(h) == [] and V.page_problems(h, real_lib, ROOT) == [] for h in pages))

# ------------------------------------------------------------------ D. conventions shared with the audio library
print("=== D. shared conventions")
swatch = os.path.join(ROOT_T, GOOD["file"])
chk("sha256 is computed exactly as the audio library does (audio.sha256_file)", AU.sha256_file(swatch) == GOOD["sha256"])
chk("records use the audio library's field names for licence and use", all(k in V.FIELDS for k in (
    "assetId", "license", "licenseVerified", "licenseDocument", "commercialUse", "permittedUse",
    "attributionRequired", "attributionText", "file", "sha256", "generator", "provider", "model")))
audio_lib = AU.load_library()
for aid, role in (("prayogx-score-v2", "music"), ("prayogx-sfx-v1", "sfx"), ("voice-higgsfield-elevenlabs-v4", "voice")):
    try:
        AU.check_asset(audio_lib, aid, role)
        chk("the audio library still accepts %s (%s)" % (aid, role), True)
    except AU.ProvenanceError as exc:
        chk("the audio library still accepts %s (%s)" % (aid, role), False, exc)

# ------------------------------------------------------------------ E. nothing else changed, nothing at run time
print("=== E. scope")
src = open(os.path.join(ROOT, "tools", "visual_assets.py"), encoding="utf-8").read()
imports = sorted(set(l.split()[1].split(".")[0] for l in src.splitlines() if l.startswith(("import ", "from "))))
chk("the module uses the standard library only (no network, no provider client)",
    imports == ["base64", "hashlib", "json", "os", "re"], imports)
chk("it never calls a provider, the network or a subprocess",
    not any(w in src for w in ("urllib", "requests", "subprocess", "socket", "higgsfield")))
lib_src = open(os.path.join(ROOT, "tools", "check_library.py"), encoding="utf-8").read()
chk("check_library runs the visual check for the registry and every page", "visual_assets.library_problems(ROOT)" in lib_src
    and "visual_assets.page_problems(" in lib_src)

print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
