"""Build data/learn/worksheets/<slug>.json from the compact data/learn/worksheets/_source.txt (format in its header).
Title, class, subject, chapter and objective come from the topic's data/learn/topics/<slug>.json."""
import json, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "data", "learn", "worksheets")


def main():
    cur, out = None, {}
    for ln in open(os.path.join(D, "_source.txt"), encoding="utf-8"):
        ln = ln.rstrip("\n")
        if not ln or ln.startswith("#"):
            continue
        if ln.startswith("@"):
            cur = ln[1:].strip()
            out.setdefault(cur, {"fill": [], "tf": [], "ar": [], "mcq": [], "num": [], "short": [], "pairs": [], "xe": ""})
            continue
        k, rest = ln.split(" ", 1)
        w = out[cur]
        if k == "F":
            q, a = rest.rsplit("|", 1); w["fill"].append({"q": q, "a": a})
        elif k == "T":
            q, a, e = rest.split("|", 2); w["tf"].append({"q": q, "a": a == "T", "explain": e})
        elif k == "M":
            q, o, a, e = rest.split("|", 3); w["mcq"].append({"q": q, "options": o.split(";"), "answer": int(a) - 1, "explain": e})
        elif k == "A":   # assertion | reason | 1-4 (both true & explains / both true, not explains / A true R false / A false R true) | why
            a, r, n, e = rest.split("|", 3); w["ar"].append({"a": a, "r": r, "answer": int(n) - 1, "explain": e})
        elif k == "N":   # numerical: question | step; step; ... | final answer
            q, st, a = rest.split("|", 2); w["num"].append({"q": q, "steps": [x.strip() for x in st.split(";")], "answer": a})
        elif k == "S":
            q, s = rest.split("|", 1); w["short"].append({"q": q, "lines": 5, "solution": s})
        elif k == "X":
            l, r = rest.split(" => "); w["pairs"].append((l, r))
        elif k == "XE":
            w["xe"] = rest
    for slug, w in out.items():
        t = json.load(open(os.path.join(ROOT, "data", "learn", "topics", slug + ".json"), encoding="utf-8"))
        right = [r for _, r in w["pairs"]]
        order = list(range(len(right)))
        random.Random(slug).shuffle(order)            # deterministic shuffle of Column B
        if order == sorted(order):
            order = order[1:] + order[:1]
        shown = [right[i] for i in order]
        ws = {"slug": slug, "title": t["title"], "class": t["class"], "subject": t["subject"], "chapter": t["chapter"],
              "objective": t["summary"], "fill": w["fill"], "tf": w["tf"], "ar": w["ar"], "mcq": w["mcq"], "num": w["num"], "short": w["short"],
              "match": {"left": [l for l, _ in w["pairs"]], "right": shown,
                        "answer": [order.index(i) for i in range(len(right))], "explain": w["xe"]}}
        with open(os.path.join(D, slug + ".json"), "w", encoding="utf-8") as fh:
            json.dump(ws, fh, ensure_ascii=False, indent=1)
            fh.write("\n")
    print(len(out), "worksheets")


if __name__ == "__main__":
    main()
