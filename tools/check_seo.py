"""Validate generated SEO, sitemap coverage and local links without dependencies."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote
import xml.etree.ElementTree as ET
import urllib.robotparser
import re

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = json.loads((ROOT / 'seo-config.json').read_text(encoding='utf-8'))['domain']


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.tags = []
        self.scripts = []
        self.in_schema = False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.in_schema = True

    def handle_endtag(self, tag):
        if tag == 'script':
            self.in_schema = False

    def handle_data(self, data):
        if self.in_schema:
            self.scripts.append(json.loads(data))


errors = []
files = [ROOT / 'index.html', ROOT / 'portfolio.html', ROOT / 'contacts.html'] + sorted((ROOT / 'assets/projects').glob('*.html'))
pages = {f: Page(f.read_text(encoding='utf-8')) for f in files}
titles, descriptions, urls = set(), set(), set()
for file, page in pages.items():
    path = file.relative_to(ROOT).as_posix()
    url = DOMAIN + ('/' if path == 'index.html' else '/' + path)
    urls.add(url)
    def check(condition, message):
        if not condition:
            errors.append(f'{path}: {message}')
    check(sum(t == 'h1' for t, a in page.tags) == 1, 'expected one H1')
    check([(a.get('href')) for t, a in page.tags if t == 'link' and a.get('rel') == 'canonical'] == [url], 'canonical mismatch')
    metas = {a.get('name', a.get('property')): a.get('content') for t, a in page.tags if t == 'meta'}
    check(metas.get('og:url') == url, 'og:url mismatch')
    check(bool(metas.get('description')), 'missing description')
    check(metas.get('description') not in descriptions, 'duplicate description')
    descriptions.add(metas.get('description'))
    check(metas.get('og:description') == metas.get('description'), 'social description mismatch')
    check(len(page.scripts) == 1 and len(page.scripts[0]['@graph']) >= 3, 'missing JSON-LD graph')
    check(any(t == 'link' and a.get('rel') == 'describedby' and a.get('href') == DOMAIN + '/llms.txt' for t, a in page.tags), 'missing llms discovery link')
    check(any(t == 'link' and a.get('rel') == 'preload' and a.get('as') == 'image' for t, a in page.tags), 'missing hero preload')
    check(any(t == 'link' and a.get('rel') == 'icon' and a.get('type') == 'image/svg+xml' for t, a in page.tags), 'missing SVG favicon')
    check(all('defer' in a for t, a in page.tags if t == 'script' and 'script.js' in a.get('src', '')), 'main script must be deferred')
    if path != 'index.html':
        check(any(t == 'nav' and a.get('aria-label') == 'Хлебные крошки' for t, a in page.tags), 'missing visible breadcrumbs')
    for key in ['og:image', 'twitter:image']:
        image = metas.get(key, '')
        check(image.startswith(DOMAIN + '/'), f'{key} must be absolute')
        check((ROOT / unquote(urlparse(image).path).lstrip('/')).is_file(), f'{key} file missing')
    for tag, attrs in page.tags:
        if tag == 'img':
            check('alt' in attrs, 'image missing alt attribute')
        for attr in (['href'] if tag in ['a', 'link'] else ['src'] if tag in ['img', 'script'] else []):
            value = attrs.get(attr, '')
            absolute = urlparse(urljoin(url, value))
            if absolute.netloc != urlparse(DOMAIN).netloc or not value:
                continue
            target = ROOT / unquote(absolute.path).lstrip('/')
            if absolute.path == '/':
                target = ROOT / 'index.html'
            check(target.is_file(), f'broken {attr}: {value}')
            if tag == 'a' and absolute.fragment and target in pages:
                ids = {a.get('id') for t, a in pages[target].tags}
                check(unquote(absolute.fragment) in ids, f'broken anchor: {value}')

sitemap = ET.parse(ROOT / 'sitemap.xml')
locations = [n.text for n in sitemap.findall('{*}url/{*}loc')]
if set(locations) != urls or len(locations) != len(urls):
    errors.append('sitemap coverage mismatch')
if 'Sitemap: ' + DOMAIN + '/sitemap.xml' not in (ROOT / 'robots.txt').read_text(encoding='utf-8'):
    errors.append('robots sitemap mismatch')
robots = urllib.robotparser.RobotFileParser()
robots.parse((ROOT / 'robots.txt').read_text(encoding='utf-8').splitlines())
for agent in ['Googlebot', 'YandexBot', 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User']:
    for path in ['/', '/contacts.html', '/portfolio.html', '/llms.txt', '/sitemap.xml']:
        if not robots.can_fetch(agent, DOMAIN + path):
            errors.append(f'{agent}: public URL blocked: {path}')
    for path in ['/.git/config', '/.aws/credentials', '/tools/seo.py', '/.responsive-audit/live-seo.json', '/deploy/nginx-seo.conf.example']:
        if robots.can_fetch(agent, DOMAIN + path):
            errors.append(f'{agent}: private path allowed: {path}')
llms = (ROOT / 'llms.txt').read_text(encoding='utf-8')
if not llms.startswith('# Нова Дом'):
    errors.append('llms must have studio heading')
for url in re.findall(r'\]\((https?://[^)]+)\)', llms):
    parsed = urlparse(url)
    if parsed.netloc == urlparse(DOMAIN).netloc:
        target = ROOT / parsed.path.lstrip('/') if parsed.path != '/' else ROOT / 'index.html'
        if not target.is_file():
            errors.append('broken llms link: ' + url)
if any(p['@type'] == 'AutoRepair' for page in pages.values() for schema in page.scripts for p in schema['@graph']):
    errors.append('incorrect AutoRepair schema copied from reference')
error_page = Page((ROOT / '404.html').read_text(encoding='utf-8'))
if not any(t == 'meta' and a.get('name') == 'robots' and 'noindex' in a.get('content', '') for t, a in error_page.tags):
    errors.append('404 must have noindex')
if errors:
    print('\n'.join(errors))
    raise SystemExit(1)
print(f'PASS: {len(files)} pages, metadata, links, schema, breadcrumbs, preloads, SVG favicon, deferred scripts, sitemap, AI robots rules, llms.txt and 404.')
