#!/usr/bin/env python3
"""PrayogX 2.0 weekly analytics (READ-ONLY): YouTube Shorts, Instagram reels and Search Console for prayogx.co.in.

    python3 tools/analytics_report.py youtube  [--days 28]    views, average view %, watch time per Short
    python3 tools/analytics_report.py search   [--days 28]    Search Console clicks / impressions per page
    python3 tools/analytics_report.py instagram               latest Instagram snapshot (motion studio ig_track.py)
    python3 tools/analytics_report.py all

Writes <studio>/packages/analytics/<date>-<source>.json and prints a short table. Rows carry the reel ID and, for
new reels, the content package (roadmap) ID. Nothing is posted, changed or deleted anywhere; no website change.

One-time setup by the owner (read-only access): set YT_ANALYTICS=true in .env, run
`python3 tools/youtube_publish.py auth` once, and for Search Console set SEARCH_CONSOLE_SITE (for example
sc-domain:prayogx.co.in). Tokens stay in the existing token file outside the repo and are never printed.
"""
import argparse, glob, json, os, subprocess, sys, urllib.error, urllib.parse, urllib.request
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from px2_common import PACKAGES, REPO, STUDIO, load, read_env, save  # noqa: E402
import youtube_publish as YP  # noqa: E402

OUT = os.path.join(PACKAGES, 'analytics')


def client():
    cfg = YP.load_config()
    if not cfg.analytics:
        sys.exit('set YT_ANALYTICS=true in .env, then run python3 tools/youtube_publish.py auth once (read-only scopes)')
    return YP.YouTube(cfg, YP.HttpTransport())


READ_HOSTS = ('youtubeanalytics.googleapis.com', 'www.googleapis.com', 'searchconsole.googleapis.com')


def get(yt, url, body=None):
    """Read-only call to an official Google analytics host (the publisher's own host list stays unchanged)."""
    if urllib.parse.urlparse(url).hostname not in READ_HOSTS:
        sys.exit(f'refusing {url}: not a Google analytics host')
    h = {'Authorization': 'Bearer ' + yt.access_token()}
    if body is not None:
        h['Content-Type'] = 'application/json'
        body = json.dumps(body).encode()
    req = urllib.request.Request(url, data=body, headers=h, method='POST' if body else 'GET')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        d = json.loads(e.read().decode() or '{}')
        sys.exit(f'HTTP {e.code}: {d.get("error", {}).get("message", "")}')


def package_of():
    """reelId -> roadmap ID, from new packages only."""
    m = {}
    for p in glob.glob(os.path.join(PACKAGES, 'RM-*', 'package.json')):
        pk = load(p)
        m[pk['aliases'].get('reelId')] = pk['id']
    return m


def youtube(days):
    yt = client()
    pubs = [p for p in load(os.path.join(REPO, 'tools/reel-maker/publications.json'))['publications']
            if p.get('platform') == 'youtube' and p.get('videoId')]
    by_vid = {p['videoId']: p['simulationId'] for p in pubs}
    end, start = date.today(), date.today() - timedelta(days=days)
    q = urllib.parse.urlencode({'ids': 'channel==MINE', 'startDate': start, 'endDate': end, 'dimensions': 'video',
                                'metrics': 'views,averageViewPercentage,averageViewDuration,estimatedMinutesWatched,'
                                           'subscribersGained,shares', 'sort': '-views', 'maxResults': 200})
    d = get(yt, 'https://youtubeanalytics.googleapis.com/v2/reports?' + q)
    cols = [c['name'] for c in d.get('columnHeaders', [])]
    pk = package_of()
    rows = []
    for r in d.get('rows', []):
        row = dict(zip(cols, r))
        row['reelId'] = by_vid.get(row['video'], '')
        row['package'] = pk.get(row['reelId'], '')
        rows.append(row)
    return rows


def search(days):
    yt = client()
    site = read_env().get('SEARCH_CONSOLE_SITE')
    if not site:
        sys.exit('set SEARCH_CONSOLE_SITE in .env (e.g. sc-domain:prayogx.co.in)')
    end, start = date.today() - timedelta(days=2), date.today() - timedelta(days=days + 2)
    d = get(yt, f'https://www.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(site, safe="")}/searchAnalytics/query',
            {'startDate': str(start), 'endDate': str(end), 'dimensions': ['page'], 'rowLimit': 500})
    return [{'page': r['keys'][0], 'clicks': r['clicks'], 'impressions': r['impressions'],
             'ctr': round(r['ctr'], 4), 'position': round(r['position'], 1)} for r in d.get('rows', [])]


def instagram():
    subprocess.run([sys.executable, os.path.join(STUDIO, 'scripts', 'ig_track.py')], check=True, cwd=STUDIO)
    snap = sorted(glob.glob(os.path.join(STUDIO, 'cbse-series', 'ig-test', 'snapshots', '*.json')))[-1]
    d = load(snap)
    return [{k: r.get(k) for k in ('shortcode', 'posted', 'views', 'reach', 'saved', 'shares', 'ig_reels_avg_watch_time')}
            for r in d['reels']]


def show(name, rows, keys):
    save(os.path.join(OUT, f'{date.today()}-{name}.json'), rows)
    print(f'\n{name}: {len(rows)} rows  (saved to packages/analytics/{date.today()}-{name}.json)')
    for r in rows[:15]:
        print('  ' + '  '.join(str(r.get(k, ''))[:40] for k in keys))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('source', choices=['youtube', 'search', 'instagram', 'all'])
    ap.add_argument('--days', type=int, default=28)
    a = ap.parse_args()
    if a.source in ('youtube', 'all'):
        show('youtube', youtube(a.days), ['reelId', 'views', 'averageViewPercentage', 'averageViewDuration', 'package'])
    if a.source in ('search', 'all'):
        show('search', search(a.days), ['page', 'clicks', 'impressions', 'position'])
    if a.source in ('instagram', 'all'):
        show('instagram', instagram(), ['posted', 'views', 'reach', 'saved', 'shares', 'ig_reels_avg_watch_time'])


if __name__ == '__main__':
    main()
