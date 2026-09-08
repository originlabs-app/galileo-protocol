"""Read-only checks of the built article. Run after npm run build; no browser/server."""
import hashlib
import json
import re
import subprocess
from pathlib import Path
from bs4 import BeautifulSoup

site = Path(__file__).resolve().parents[4]
slug = '2026-09-08-material-marker-or-chip-dpp-binding'
source = site / 'content/blog' / (slug + '.mdx')
meta = json.loads(subprocess.check_output([
    'node', '-e', "const m=require('gray-matter'),f=require('fs');console.log(JSON.stringify(m(f.readFileSync(process.argv[1],'utf8')).data))", str(source)
], cwd=site))
body = source.read_text().split('---', 2)[2]
assert 45 <= len(meta['title']) <= 60
assert 120 <= len(meta['description']) <= 158
assert meta['date'] == slug[:10] and meta['modified'] >= meta['date']
assert '—' not in body and 'style={{' not in body
built = site / '.next/server/app'
html_path = built / 'blog' / (slug + '.html')
soup = BeautifulSoup(html_path.read_text(), 'html.parser')
url = 'https://www.galileoprotocol.io/blog/' + slug
assert soup.title.get_text() == meta['title']
assert soup.find('link', rel='canonical')['href'] == url
assert soup.find('meta', attrs={'name':'description'})['content'] == meta['description']
assert soup.find('meta', property='og:type')['content'] == 'article'
assert soup.find('meta', property='og:title')['content'] == meta['title']
assert soup.find('meta', property='og:image')['content'].endswith(meta['coverImage'])
assert soup.find('meta', attrs={'name':'twitter:image'})['content'].endswith(meta['coverImage'])
ld = [json.loads(x.string) for x in soup.find_all('script',type='application/ld+json')]
nodes = [node for document in ld for node in document.get('@graph', [document])]
by_type = {x.get('@type'):x for x in nodes if isinstance(x,dict)}
assert {'BlogPosting','BreadcrumbList','FAQPage'} <= set(by_type)
assert by_type['BlogPosting']['headline'] == meta['title']
assert by_type['BlogPosting']['datePublished'].startswith(meta['date'])
assert by_type['BlogPosting']['dateModified'].startswith(meta['modified'])
assert by_type['BreadcrumbList']['itemListElement'][-1]['item'] == url
faqs = by_type['FAQPage']['mainEntity']
assert len(faqs) == len(meta['faq']) == 4
for f, structured in zip(meta['faq'], faqs):
    assert structured['name'] == f['question']
    assert structured['acceptedAnswer']['text'] == f['answer']
    heading = next(h for h in soup.find_all('h3') if h.get_text() == f['question'])
    assert heading.find_next_sibling('p').get_text() == f['answer']
    assert '### '+f['question']+'\n\n'+f['answer']+'\n' in body
for path in sorted(set(re.findall(r'\]\((/[^)]+)\)',body))):
    assert (built / (path.lstrip('/')+'.html')).is_file(), path
    assert soup.find('a',href=path), path
for discovery in ['sitemap.xml','llms.txt','llms-full.txt']:
    assert url in (built / (discovery+'.body')).read_text(), discovery
assert meta['title'] in (built/'llms-full.txt.body').read_text()
robots = (built/'robots.txt.body').read_text()
for crawler in ['GPTBot','ClaudeBot','PerplexityBot','Google-Extended']:
    assert crawler in robots
assert 'https://www.galileoprotocol.io/sitemap.xml' in robots
hero = site / 'public' / meta['coverImage'].lstrip('/')
assert len(hero.read_bytes()) == 71074
assert hashlib.sha256(hero.read_bytes()).hexdigest() == 'ec15a4830a84a0a63b4254914a561cd5c69dffb6eb0398054ba3b0428a878a66'
svg = soup.find('svg',attrs={'aria-labelledby':'supplier-trial-title supplier-trial-desc'})
assert svg and svg['role'] == 'img' and svg.find('title') and svg.find('desc')
assert {'block','w-full','max-w-sm','mx-auto','my-8'} <= set(svg['class'])
assert svg['font-family'] == 'system-ui, sans-serif'
assert all(len(t.get_text()) <= 35 for t in svg.find_all('text'))
assert 'Observed test result:' in soup.get_text()
assert 'All observation fields below are deliberately blank.' in soup.get_text()
assert 'This example is fictional' in soup.get_text()
print(json.dumps({
    'status':'PASS',
    'articleSourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
    'builtHtmlSha256':hashlib.sha256(html_path.read_bytes()).hexdigest(),
    'titleLength':len(meta['title']), 'descriptionLength':len(meta['description']),
    'faqCount':len(faqs), 'canonical':url,
    'checks':['frontmatter','canonical, OG and Twitter hero','BlogPosting, BreadcrumbList, FAQPage','visible FAQ equals frontmatter and JSON-LD','internal link build targets','sitemap, robots, llms, llms-full','hero hash and size','static SVG accessibility and class attributes','blank observation fields and fictional label'],
    'limits':['Built HTML verification only, no served UAT.','Actual SVG font bounds, four-edge margins and 1440/390 browser layout remain UNVERIFIED by author; reserved for coordinator.','No supplier trials performed.']
},indent=2))
