#!/usr/bin/env python3
"""PrayogX Reel Maker - MP4 container checks and the edit-list strip for Instagram Reels.

    python3 tools/reel-maker/mp4tools.py inspect IN.mp4
    python3 tools/reel-maker/mp4tools.py strip-edits IN.mp4 --audio-priming 2112

Meta's Reels spec asks for no edit lists and the moov atom at the front. AVFoundation writes a one-entry edit list
on each track: the AAC encoder's priming on the audio (2112 samples) and, with frame reordering, a composition
offset on the video. The encoder runs without frame reordering and this tool removes the edts boxes (patching every
chunk offset). Apple's decoder still trims the standard priming without the edit list (validate.js proves the sync
on the decoded track); a decoder that does not would play the audio 44 ms late - within the ITU-R BT.1359
tolerance for late audio, and never early.
"""
import json
import struct
import sys

CONTAINERS = {b"moov", b"trak", b"mdia", b"minf", b"stbl", b"edts", b"dinf", b"mvex"}


def boxes(b, off, end):
    out = []
    while off + 8 <= end:
        size, typ = struct.unpack(">I4s", b[off:off + 8])
        hdr = 8
        if size == 1:
            size = struct.unpack(">Q", b[off + 8:off + 16])[0]; hdr = 16
        elif size == 0:
            size = end - off
        if size < hdr or off + size > end:
            raise ValueError("malformed box %r at %d" % (typ, off))
        out.append((typ, off, size, hdr))
        off += size
    return out


def walk(b, off, end, depth=0, path=()):
    for typ, o, s, h in boxes(b, off, end):
        yield typ, o, s, h, depth, path
        if typ in CONTAINERS:
            yield from walk(b, o + h, o + s, depth + 1, path + (typ,))


def inspect(b):
    top = [t.decode("latin1") for t, o, s, h in boxes(b, 0, len(b))]
    tracks, elst = [], 0
    moov = next((o, s, h) for t, o, s, h in boxes(b, 0, len(b)) if t == b"moov")
    for t, o, s, h in boxes(b, moov[0] + moov[2], moov[0] + moov[1]):
        if t != b"trak":
            continue
        info = {"handler": "", "editMediaTime": None}
        for t2, o2, s2, h2, d, p in walk(b, o + h, o + s):
            if t2 == b"hdlr":
                info["handler"] = b[o2 + h2 + 8:o2 + h2 + 12].decode("latin1")
            if t2 == b"elst":
                elst += 1
                ver, n = b[o2 + h2], struct.unpack(">I", b[o2 + h2 + 4:o2 + h2 + 8])[0]
                if n:
                    e = o2 + h2 + 8
                    info["editMediaTime"] = struct.unpack(">q" if ver else ">i", b[e + (8 if ver else 4):e + (16 if ver else 8)])[0]
        tracks.append(info)
    return {"topLevel": top, "moovBeforeMdat": "moov" in top and "mdat" in top and top.index("moov") < top.index("mdat"),
            "editLists": elst, "tracks": tracks}


def strip_edits(path, audio_priming=None):
    b = bytearray(open(path, "rb").read())
    info = inspect(b)
    if not info["moovBeforeMdat"]:
        raise ValueError("moov is not before mdat")
    aud = [t for t in info["tracks"] if t["handler"] == "soun"]
    if audio_priming is not None and aud and aud[0]["editMediaTime"] not in (None, audio_priming):
        raise ValueError("the audio edit list starts at %s samples, not the expected AAC priming of %s - sync unknown"
                         % (aud[0]["editMediaTime"], audio_priming))
    mo, ms, mh = next((o, s, h) for t, o, s, h in boxes(b, 0, len(b)) if t == b"moov")
    delta = sum(s for t, o, s, h, d, p in walk(b, mo + mh, mo + ms) if t == b"edts")
    if delta == 0:
        return dict(info, removedBytes=0)

    def rebuild(o, s, h):
        typ = bytes(b[o + 4:o + 8])
        if typ in (b"stco", b"co64"):
            body = bytearray(b[o + h:o + s])
            n = struct.unpack(">I", body[4:8])[0]
            w, fmt = (8, ">Q") if typ == b"co64" else (4, ">I")
            for i in range(n):
                k = 8 + i * w
                v = struct.unpack(fmt, body[k:k + w])[0]
                if v < mo + ms:
                    raise ValueError("a chunk offset points before the end of moov")
                body[k:k + w] = struct.pack(fmt, v - delta)
            return bytes(b[o:o + h]) + bytes(body)
        if typ not in CONTAINERS:
            return bytes(b[o:o + s])
        kids = b"".join(rebuild(o2, s2, h2) for t2, o2, s2, h2 in boxes(b, o + h, o + s) if t2 != b"edts")
        if h != 8:
            raise ValueError("64-bit container header not supported")
        return struct.pack(">I", 8 + len(kids)) + typ + kids

    moov = rebuild(mo, ms, mh)
    if len(moov) != ms - delta:
        raise ValueError("moov rebuilt to an unexpected size")
    out = bytes(b[:mo]) + moov + bytes(b[mo + ms:])
    after = inspect(out)
    if after["editLists"] or not after["moovBeforeMdat"]:
        raise ValueError("edit lists remain after the strip")
    with open(path, "wb") as f:
        f.write(out)
    return dict(after, removedBytes=delta, before=info)


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "inspect":
        print(json.dumps(inspect(open(sys.argv[2], "rb").read())))
    elif len(sys.argv) >= 3 and sys.argv[1] == "strip-edits":
        pr = int(sys.argv[sys.argv.index("--audio-priming") + 1]) if "--audio-priming" in sys.argv else None
        print(json.dumps(strip_edits(sys.argv[2], pr)))
    else:
        print(__doc__); sys.exit(2)
