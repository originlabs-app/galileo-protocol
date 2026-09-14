"""Check complete initial HTML from a Next production build, optionally over HTTP.
Run from website: python3 scripts/check-seo.py [--origin http://127.0.0.1:8474]
--baseline permits only the exact pre-existing broken link pairs in that report.
Without it, any broken internal link fails the check.
"""
import argparse, json, re, sys
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, urljoin, unquote
from urllib.request import urlopen
from urllib.error import HTTPError
import xml.etree.ElementTree as ET

class Page(HTMLParser):

    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.canonical = []
        self.meta = {}
        self.links = []
        self.schemas = []
        self.title = ''
        self.ids = set()
        self.h1 = []
        self.in_title = False
        self.in_h1 = False
        self.in_schema = False
        self.buffer = ''
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.add(a['id'])
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical.append(a.get('href'))
        if tag == 'meta':
            self.meta.setdefault(a.get('name', a.get('property')), []).append(a.get('content', ''))
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])
        if tag == 'title':
            self.in_title = True
        if tag == 'h1':
            self.in_h1 = True
            self.h1.append('')
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.in_schema = True
            self.buffer = ''

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.in_h1:
            self.h1[-1] += data
        if self.in_schema:
            self.buffer += data

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'h1':
            self.in_h1 = False
        if tag == 'script' and self.in_schema:
            self.schemas.append(json.loads(self.buffer))
            self.in_schema = False

def run():
    args = argparse.ArgumentParser()
    args.add_argument('--origin')
    args.add_argument('--output')
    args.add_argument('--baseline')
    opt = args.parse_args()
    root = Path('.next/server/app')
    errors = []
    rows = []
    pages = {}
    probes = []

    def read(path):
        if opt.origin:
            try:
                with urlopen(opt.origin + path, timeout=15) as r:
                    return (r.status, r.read().decode())
            except HTTPError as e:
                return (e.code, e.read().decode())
        file = root / ('index.html' if path == '/' else path.lstrip('/') + '.html')
        return (200, file.read_text()) if file.exists() else (404, '')
    xml = urlopen(opt.origin + '/sitemap.xml', timeout=15).read() if opt.origin else (root / 'sitemap.xml.body').read_bytes()
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    entries = ET.fromstring(xml).findall('s:url', ns)
    urls = [e.findtext('s:loc', namespaces=ns) for e in entries]
    assert len(urls) == len(set(urls)) and len(urls) > 80
    site = 'https://www.galileoprotocol.io'
    for e, url in zip(entries, urls):
        u = urlsplit(url)
        path = u.path or '/'
        status, html = read(path)
        p = Page(html)
        pages[path] = p
        bad = []
        if status != 200:
            bad.append(f'HTTP {status}')
        if u.netloc != 'www.galileoprotocol.io' or u.query or u.fragment or (path != '/' and path.endswith('/')):
            bad.append('unclean sitemap URL')
        if p.canonical != [url]:
            bad.append(f'canonical {p.canonical}')
        if not p.meta.get('og:title') or p.meta.get('twitter:title') != p.meta.get('og:title'):
            bad.append('sharing titles inconsistent')
        if p.meta.get('og:description') != p.meta.get('description') or p.meta.get('twitter:description') != p.meta.get('description'):
            bad.append('sharing descriptions inconsistent')
        if path == '/' and p.h1 != ['Open protocol for luxury product authentication']:
            bad.append('home heading')
        if p.meta.get('og:url') != [url]:
            bad.append(f"og:url {p.meta.get('og:url')}")
        if not p.title.strip() or len(p.meta.get('description', [])) != 1 or (not p.meta['description'][0].strip()):
            bad.append('title/description missing')
        if any(('noindex' in x for x in p.meta.get('robots', []))):
            bad.append('noindex')
        lastmod = e.findtext('s:lastmod', namespaces=ns)
        expected = None
        if path.startswith('/blog/'):
            source = Path('content/blog') / (path.split('/')[-1] + '.mdx')
            text = source.read_text().split('---')[1]
            dates = dict(re.findall('^(date|modified):\\s*[\\"\\\']?(\\d{4}-\\d{2}-\\d{2})', text, re.M))
            expected = dates.get('modified', dates.get('date'))
        elif path.startswith('/specifications/'):
            stem = Path('../specifications') / path.removeprefix('/specifications/')
            source = Path(str(stem) + '.md')
            if source.is_file():
                match = re.search('\\*\\*Last Updated:\\*\\*\\s*(\\d{4}-\\d{2}-\\d{2})', source.read_text())
                expected = match[1] if match else None
        if (lastmod[:10] if lastmod else None) != expected:
            bad.append(f'lastmod {lastmod}, source {expected}')
        for schema in p.schemas:
            for node in schema.get('@graph', [schema]):
                if node.get('@type') == 'BlogPosting' and node.get('mainEntityOfPage', {}).get('@id') != url:
                    bad.append('article schema URL')
                if node.get('@type') == 'WebPage' and node.get('url', node.get('@id')) != url:
                    bad.append('page schema URL')
                if node.get('@type') == 'BreadcrumbList' and node['itemListElement'][-1]['item'] != url:
                    bad.append('breadcrumb URL')
        rows.append(dict(url=url, status=status, canonical=p.canonical, og=p.meta.get('og:url'), title=p.title, description=p.meta.get('description'), h1=p.h1, lastmod=lastmod, errors=bad))
        errors.extend((f'{path}: {b}' for b in bad))
    for f in Path('src/app').rglob('page.tsx'):
        route = '/' + str(f.parent.relative_to('src/app'))
        if route == '/.':
            route = '/'
        if '[' not in route and route not in pages:
            errors.append(f'route omitted: {route}')
    for file in root.rglob('*.html'):
        route = '/' + str(file.relative_to(root)).removesuffix('.html')
        route = '/' if route == '/index' else route
        if route not in ['/_not-found', '/_global-error', '/404', '/500'] and route not in pages:
            errors.append(f'built route omitted: {route}')
    broken = []
    for path, p in pages.items():
        for href in p.links:
            u = urlsplit(urljoin(site + path, href))
            if u.netloc != 'www.galileoprotocol.io':
                continue
            target = unquote(u.path) or '/'
            if target in pages:
                continue
            if (Path('public') / target.lstrip('/')).is_file():
                continue
            broken.append({'from': path, 'href': href})
    known = set()
    if opt.baseline:
        known = {(r['from'], r['href']) for r in json.loads(Path(opt.baseline).read_text())['broken_internal_links'] if r['href'].startswith('.')}
    errors.extend((f'unresolved internal link: {r}' for r in broken if (r['from'], r['href']) not in known))
    if opt.origin:
        for path in [p + '?utm_source=seo-test&category=identity' for p in pages]:
            status, html = read(path)
            p = Page(html)
            probes.append(dict(path=path, status=status, canonical=p.canonical, og=p.meta.get('og:url'), robots=p.meta.get('robots')))
            expected = site + path.split('?')[0].rstrip('/')
            if status != 200 or p.canonical != [expected] or p.meta.get('og:url') != [expected]:
                errors.append(f'parameter variant: {path}')
        for path in ['/admin', '/account', '/api/private', '/blog/not-a-post', '/specifications/not-a-category', '/specifications/architecture/hybrid-architecture/extra', '/specifications/schemas/dpp-core.schema']:
            status, html = read(path)
            p = Page(html)
            probes.append(dict(path=path, status=status, canonical=p.canonical, robots=p.meta.get('robots')))
            if status != 404 or not any(('noindex' in x for x in p.meta.get('robots', []))) or p.canonical:
                errors.append(f"non-public {path}: HTTP {status}, canonical {p.canonical}, robots {p.meta.get('robots')}")
    if opt.origin:
        for row in broken:
            target = urlsplit(urljoin(site + row['from'], row['href'])).path
            row['http_status'] = read(target)[0]
    report = {'urls': len(urls), 'errors': errors, 'broken_internal_links': broken, 'pages': rows, 'probes': probes}
    if opt.output:
        Path(opt.output).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'urls': len(urls), 'errors': len(errors), 'broken_internal_links': len(broken), 'sample_errors': errors[:5]}, indent=2))
    return bool(errors)
if __name__ == '__main__':
    sys.exit(run())
