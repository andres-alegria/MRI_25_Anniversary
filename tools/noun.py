#!/usr/bin/env python3
"""
A bridge to the Noun Project icon API, for the story clips.

The API is v2, secured with OAuth 1.0a. Everything here is signed with the
standard library, so there is nothing to install.

    export NOUN_PROJECT_KEY=...            (or ~/.noun-project.json)
    export NOUN_PROJECT_SECRET=...

    python3 tools/noun.py usage
    python3 tools/noun.py search "glacier" --styles line --weight 16-26 --svg
    python3 tools/noun.py similar 1234567 --query "drone"
    python3 tools/noun.py get 1234567
    python3 tools/noun.py credits

SPENDING, WHICH IS THE WHOLE DESIGN HERE
Noun Project bills two kinds of request very differently. A *service* call —
any search — is $0.0025, and the free trial allows 2,000 a month. An *icon*
call — anything carrying an icon id, so `get`, `similar` and the recolouring
endpoint — is $0.0095, and the free trial allows only **150 a month**.

So this module does three things to stay inside that:
  - `search --svg` asks for the vectors in the search response, which is a
    service call. That is the cheap way to get artwork, and it is the default
    route to a usable file.
  - everything fetched is cached under tools/noun-cache/ and never fetched
    twice. Delete the cache and you pay again.
  - every call is written to a local ledger, so `usage` can show what this
    machine has spent without asking the server.

Icons come back black on transparent, so `place()` recolours them locally
rather than spending an icon call on the server's recolouring endpoint.

LICENCE, WHICH IS NOT SETTLED
The API licence is royalty-free and allows commercial use, but the terms also
list "distributing icons, including for free" as an unacceptable use — and
this repository is public. Embedding an icon inside a finished figure is
ordinary licensed use; publishing a folder of downloaded icon files is closer
to the line. The cache is therefore git-ignored: the finished clips may be
committed, the raw icons are not. Confirm the reading with Noun Project before
the publication ships.

Every icon's attribution string is kept with it, and `credits` prints the list
for the icons actually used.
"""
import base64
import hashlib
import hmac
import json
import os
import pathlib
import re
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = 'https://api.thenounproject.com'
ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / 'tools' / 'noun-cache'
MANIFEST = ROOT / 'tools' / 'noun-icons.json'      # the icons this project actually uses
ICON_CALL, SERVICE_CALL = 0.0095, 0.0025           # $ per call, for the ledger


# --- credentials ------------------------------------------------------------
def creds():
    """Key and secret, from the environment or a file outside this repository.

    Never put these in the repo: it is public, and anyone with the pair can
    spend against the account."""
    k, s = os.environ.get('NOUN_PROJECT_KEY'), os.environ.get('NOUN_PROJECT_SECRET')
    if k and s:
        return k, s
    for p in (pathlib.Path.home() / '.noun-project.json',
              pathlib.Path.home() / '.config' / 'noun-project.json'):
        if p.exists():
            d = json.loads(p.read_text())
            if d.get('key') and d.get('secret'):
                return d['key'], d['secret']
    raise SystemExit(
        'No Noun Project credentials.\n'
        '  Make a key at https://thenounproject.com/developers/apps/ , then either\n'
        '    export NOUN_PROJECT_KEY=... NOUN_PROJECT_SECRET=...\n'
        '  or write ~/.noun-project.json:  {"key": "...", "secret": "..."}\n'
        '  (chmod 600 it; never inside this repository, which is public)')


# --- OAuth 1.0a, signed by hand ---------------------------------------------
def _q(s):
    """RFC 3986 percent-encoding: unreserved is A-Za-z0-9-._~ and nothing else."""
    return urllib.parse.quote(str(s), safe='')


def _auth_header(method, url, params, key, secret):
    oauth = {'oauth_consumer_key': key,
             'oauth_nonce': secrets.token_hex(12),          # the docs ask for 8+ characters
             'oauth_signature_method': 'HMAC-SHA1',
             'oauth_timestamp': str(int(time.time())),
             'oauth_version': '1.0'}
    allp = dict(params); allp.update(oauth)
    # RFC 5849 sorts on the *encoded* names, not the raw ones
    enc = sorted((_q(k), _q(v)) for k, v in allp.items())
    norm = '&'.join('%s=%s' % kv for kv in enc)
    base = '&'.join([method.upper(), _q(url), _q(norm)])
    sig = hmac.new((_q(secret) + '&').encode(), base.encode(), hashlib.sha1).digest()
    oauth['oauth_signature'] = base64.b64encode(sig).decode()
    return 'OAuth ' + ', '.join('%s="%s"' % (_q(k), _q(v)) for k, v in sorted(oauth.items()))


def _ledger(path, kind):
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / 'ledger.json'
    log = json.loads(f.read_text()) if f.exists() else {'calls': []}
    log['calls'].append({'at': time.strftime('%Y-%m-%d %H:%M'), 'path': path, 'kind': kind})
    f.write_text(json.dumps(log, indent=1))


def call(path, _kind=None, **params):
    """One signed GET. `_kind` is 'icon' or 'service', for the local ledger."""
    key, secret = creds()
    params = {k: v for k, v in params.items() if v is not None}
    url = BASE + path
    hdr = _auth_header('GET', url, params, key, secret)
    qs = '&'.join('%s=%s' % kv for kv in sorted((_q(k), _q(v)) for k, v in params.items()))
    req = urllib.request.Request(url + ('?' + qs if qs else ''),
                                 headers={'Authorization': hdr, 'Accept': 'application/json',
                                          'User-Agent': 'MRI25-mountain-art/1.0'})
    kind = _kind or ('icon' if re.search(r'/icon/\d', path) else 'service')
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            body = r.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')[:400]
        if e.code == 401:
            raise SystemExit('401 from Noun Project — the key/secret pair was rejected.\n' + detail)
        if e.code == 429:
            raise SystemExit('429 — over the hourly, daily or monthly limit. `usage` shows where.\n' + detail)
        raise SystemExit('HTTP %s from %s\n%s' % (e.code, path, detail))
    _ledger(path, kind)
    return json.loads(body)


# --- cache ------------------------------------------------------------------
def _cached(name, make):
    f = CACHE / name
    if f.exists():
        return json.loads(f.read_text())
    f.parent.mkdir(parents=True, exist_ok=True)
    data = make()
    f.write_text(json.dumps(data, indent=1))
    return data


def _key(**kw):
    return hashlib.sha1(json.dumps(kw, sort_keys=True).encode()).hexdigest()[:16]


def search(query, styles=None, weight=None, limit=24, svg=False, public_domain=None):
    """Search — a *service* call. With svg=True the vectors come back in the
    response, which is the cheap way to get artwork out of this API."""
    name = 'searches/%s.json' % _key(q=query, s=styles, w=weight, n=limit, svg=svg, pd=public_domain)
    return _cached(name, lambda: call(
        '/v2/icon', _kind='service', query=query, styles=styles, line_weight=weight,
        limit=limit, thumbnail_size=200, blacklist=1,
        include_svg=1 if svg else None, limit_to_public_domain=public_domain))


def similar(icon_id, query=None, limit=24):
    """Icons matched to another icon's *design style* — an *icon* call, and the
    reason this API can hold twenty-five clips together: pick one icon whose
    drawing you like, then pull every other motif in that style."""
    name = 'similar/%s.json' % _key(i=icon_id, q=query, n=limit)
    return _cached(name, lambda: call(
        '/v2/icon/%d/more-like-this' % int(icon_id), _kind='icon',
        query=query, limit=limit, thumbnail_size=200, blacklist=1))


def icon(icon_id):
    """One icon with its SVG — an *icon* call. Prefer `search --svg` when you
    can: it costs a quarter as much and the trial allows thirteen times more."""
    name = 'icons/%s.json' % int(icon_id)
    return _cached(name, lambda: call('/v2/icon/%d' % int(icon_id), _kind='icon',
                                      thumbnail_size=200, include_svg=1))


def usage():
    return call('/v2/client/usage', _kind='service')


# --- turning a Noun icon into something the artwork can place ---------------
_ATTRIB = re.compile(r'<text\b.*?</text>|<metadata\b.*?</metadata>|<title\b.*?</title>|'
                     r'<desc\b.*?</desc>|<!--.*?-->', re.S | re.I)
_FILL = re.compile(r'\s(fill|stroke|style|class)="[^"]*"', re.I)


def normalise(svg_text):
    """Strip a Noun Project SVG back to geometry.

    Their files carry the creator credit as a <text> node inside the artwork,
    and colour on every path. Both have to go: the credit belongs in the
    caption, not in the picture, and the colour has to come from our palette."""
    body = svg_text
    m = re.search(r'<svg\b([^>]*)>(.*)</svg>', body, re.S | re.I)
    if not m:
        raise ValueError('not an SVG')
    attrs, inner = m.group(1), m.group(2)
    inner = _ATTRIB.sub('', inner)
    inner = _FILL.sub('', inner)
    vb = re.search(r'viewBox="([-\d.\s]+)"', attrs)
    if vb:
        box = [float(v) for v in vb.group(1).split()]
    else:
        w = re.search(r'\swidth="([\d.]+)', attrs); h = re.search(r'\sheight="([\d.]+)', attrs)
        box = [0, 0, float(w.group(1)) if w else 100, float(h.group(1)) if h else 100]
    return box, inner.strip()


def place(svg_text, x, y, height, colour, anchor='bottom', opacity=1.0):
    """A Noun icon as a group, scaled to `height` px and set on (x, y).

    anchor 'bottom' stands it on the point, as a thing on the ground does;
    'centre' hangs it around the point, for something in the air."""
    (bx, by, bw, bh), inner = normalise(svg_text)
    s = height / bh
    ox = x - (bx + bw / 2) * s
    oy = y - (by + bh) * s if anchor == 'bottom' else y - (by + bh / 2) * s
    op = '' if opacity >= 1 else f' fill-opacity="{opacity}"'
    return (f'<g transform="translate({ox:.2f} {oy:.2f}) scale({s:.5f})" fill="{colour}"{op}>'
            f'{inner}</g>')


def load(slot):
    """The SVG for a slot in tools/noun-icons.json, from the cache."""
    man = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    ent = man.get(slot)
    if not ent:
        raise SystemExit('no icon chosen for %r — add it to %s' % (slot, MANIFEST.name))
    f = CACHE / 'svg' / ('%s.svg' % ent['id'])
    if not f.exists():
        raise SystemExit('icon %s is not in the cache — run: python3 tools/noun.py get %s'
                         % (ent['id'], ent['id']))
    return f.read_text()


def fetch_svg(item):
    """The vector for a search result, if this plan is allowed one.

    It does not come back inline: the response carries `icon_url`, a signed
    link to the cleaned SVG that expires within the hour, so it is pulled down
    as soon as it arrives. On the free trial only public-domain icons carry
    it at all — everything else gives a 200 px PNG and nothing more."""
    if item.get('svg'):
        return item['svg']
    url = item.get('icon_url')
    if not url:
        return None
    with urllib.request.urlopen(url, timeout=40) as r:
        return r.read().decode('utf-8')


def stash_svg(icon_id, svg_text, meta=None):
    if svg_text:
        (CACHE / 'svg').mkdir(parents=True, exist_ok=True)
        (CACHE / 'svg' / ('%s.svg' % icon_id)).write_text(svg_text)
    if meta:
        (CACHE / 'meta').mkdir(parents=True, exist_ok=True)
        (CACHE / 'meta' / ('%s.json' % icon_id)).write_text(json.dumps(meta, indent=1))


# --- a contact sheet, so icons can be chosen by eye -------------------------
def sheet(results, out, title=''):
    """An HTML page of the results, with ids under each one.

    Thumbnail URLs from the API expire within the hour, so they are pulled down
    beside the page; the page then works offline and can be reopened."""
    (CACHE / 'thumbs').mkdir(parents=True, exist_ok=True)
    cells = []
    for it in results.get('icons', []):
        iid = it['id']
        local = CACHE / 'thumbs' / ('%s.png' % iid)
        if not local.exists() and it.get('thumbnail_url'):
            try:
                with urllib.request.urlopen(it['thumbnail_url'], timeout=30) as r:
                    local.write_bytes(r.read())
            except Exception:
                pass
        style = ', '.join(s.get('style', '') + (' %s' % s.get('line_weight', '')
                                                if s.get('line_weight') else '')
                          for s in it.get('styles', [])) or '—'
        cells.append(
            '<figure><img src="thumbs/%s.png" alt=""><figcaption><b>%s</b>'
            '<span>%s</span><span class="s">%s</span></figcaption></figure>'
            % (iid, iid, it.get('term', ''), style))
    html = ("""<!doctype html><meta charset="utf-8"><title>Noun Project — %s</title>
<style>
 /* adjust the sheet's look here */
 body{margin:0;padding:24px;background:#12161a;color:#e8eef3;
      font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif}
 h1{font-size:16px;font-weight:600;margin:0 0 18px;letter-spacing:.04em;text-transform:uppercase}
 .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:14px}
 figure{margin:0;background:#1d242a;border-radius:8px;padding:10px;text-align:center}
 img{width:100%%;height:92px;object-fit:contain;filter:invert(1)}
 figcaption{display:flex;flex-direction:column;gap:2px;margin-top:8px;font-size:11px}
 b{font:600 12px ui-monospace,monospace;color:#9fd0ef}
 span{color:#9aa6ae} .s{color:#66727a;font-size:10px}
</style><h1>%s — %d of %s</h1><div class="g">%s</div>"""
            % (title, title, len(results.get('icons', [])), results.get('total', '?'), ''.join(cells)))
    pathlib.Path(out).write_text(html)
    return out


# --- credits ----------------------------------------------------------------
def credits():
    """The attribution line for every icon this project actually uses."""
    man = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    rows = []
    for slot, ent in sorted(man.items()):
        meta = CACHE / 'meta' / ('%s.json' % ent['id'])
        d = json.loads(meta.read_text()) if meta.exists() else {}
        rows.append((slot, ent['id'], ent.get('attribution') or d.get('attribution', '?'),
                     ent.get('license') or d.get('license_description', '?')))
    return rows


# --- CLI --------------------------------------------------------------------
def _spent():
    f = CACHE / 'ledger.json'
    if not f.exists():
        return 0, 0
    calls = json.loads(f.read_text())['calls']
    return sum(c['kind'] == 'icon' for c in calls), sum(c['kind'] == 'service' for c in calls)


def main(argv):
    if not argv:
        print(__doc__); return 0
    cmd = argv[0]
    if cmd == 'usage':
        u = usage()
        i, s = _spent()
        print(json.dumps(u, indent=1))
        print('\nthis machine, since the cache was made: %d icon calls, %d service calls '
              '(about $%.2f)' % (i, s, i * ICON_CALL + s * SERVICE_CALL))
        return 0
    if cmd == 'search':
        q = argv[1]
        a = {argv[i]: argv[i + 1] for i in range(2, len(argv) - 1, 2) if argv[i].startswith('--')}
        res = search(q, styles=a.get('--styles'), weight=a.get('--weight'),
                     limit=int(a.get('--limit', 24)), svg='--svg' in argv)
        out = sheet(res, CACHE / ('sheet-%s.html' % re.sub(r'\W+', '-', q)), q)
        got = 0
        for it in res.get('icons', []):
            try:
                v = fetch_svg(it)
            except Exception:
                v = None
            stash_svg(it['id'], v, it)
            got += bool(v)
        print('%d of %s results — %s' % (len(res.get('icons', [])), res.get('total', '?'), out))
        if not got and res.get('icons'):
            print('  (no vectors: on the free trial only public-domain icons carry one)')
        return 0
    if cmd == 'similar':
        res = similar(int(argv[1]), query=(argv[argv.index('--query') + 1] if '--query' in argv else None))
        out = sheet(res, CACHE / ('sheet-like-%s.html' % argv[1]), 'like %s' % argv[1])
        print('%d results — %s' % (len(res.get('icons', [])), out))
        return 0
    if cmd == 'get':
        d = icon(int(argv[1]))
        it = d.get('icon', d)
        v = fetch_svg(it)
        stash_svg(it['id'], v, it)
        print('cached icon %s — %s%s' % (it.get('id'), it.get('attribution', ''),
                                         '' if v else '  (PNG only on this plan)'))
        return 0
    if cmd == 'credits':
        for slot, iid, attr, lic in credits():
            print('%-18s %-10s %s  [%s]' % (slot, iid, attr, lic))
        return 0
    print(__doc__)
    return 1


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
