"""Generate static SEO metadata: python tools/seo.py [--domain https://example.ru]."""
import argparse
import html
import json
import re
import mimetypes
from pathlib import Path
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'seo-config.json'


def plain(value):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', value)).split())


def generate(domain):
    files = [ROOT / 'index.html', ROOT / 'portfolio.html', ROOT / 'contacts.html']
    files += sorted((ROOT / 'assets/projects').glob('*.html'))
    pages = []
    for file in files:
        source = file.read_text(encoding='utf-8')
        title = plain(re.search(r'<title>(.*?)</title>', source, re.S).group(1))
        description = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', source).group(1))
        heading = plain(re.search(r'<h1[^>]*>(.*?)</h1>', source, re.S).group(1))
        path = file.relative_to(ROOT).as_posix()
        url = domain + ('/' if path == 'index.html' else '/' + path)
        if path.startswith('assets/projects/'):
            introduction = plain(re.search(r'<h1[^>]*>.*?</h1>\s*<p>(.*?)</p>', source, re.S).group(1))
            description = f'{heading}: {introduction} Галерея интерьера в портфолио студии «Нова Дом».'
        image_tag = re.search(r'<img\b[^>]*fetchpriority="high"[^>]*>', source)
        image_src = re.search(r'src="([^"]+)"', image_tag.group()).group(1)
        image = urljoin(domain + '/' + path, image_src)
        image_alt = plain(re.search(r'alt="([^"]*)"', image_tag.group()).group(1))
        width = re.search(r'\bwidth="(\d+)"', image_tag.group()).group(1)
        height = re.search(r'\bheight="(\d+)"', image_tag.group()).group(1)
        if path == 'index.html':
            image = domain + '/assets/client/og-novadom.jpg'
            image_alt = 'Нова Дом — студия дизайна интерьеров Анны Царевой. Тула и Москва.'
            width, height = '1200', '630'
        pages.append(dict(file=file, source=source, title=title, description=description,
                          heading=heading, path=path, url=url, image=image, image_alt=image_alt,
                          image_width=width, image_height=height, hero_src=image_src))

    organization = {
        '@type': 'Organization', '@id': domain + '/#studio', 'name': 'Нова Дом',
        'url': domain + '/', 'description': 'Студия дизайна интерьеров Анны Царевой в Туле и Москве.',
        'logo': domain + '/assets/client/logo.png', 'telephone': '+79207539997',
        'founder': {'@type': 'Person', 'name': 'Анна Царева'},
        'areaServed': [{'@type': 'City', 'name': 'Тула'}, {'@type': 'City', 'name': 'Москва'}],
        'sameAs': ['https://t.me/Anna_Tsareva', 'https://yandex.ru/maps/org/nova_dom/93283220697/'],
        'contactPoint': {'@type': 'ContactPoint', 'telephone': '+79207539997',
                         'contactType': 'customer service', 'availableLanguage': 'Russian'}
    }
    for page in pages:
        source = page['source']
        graph = [organization, {'@type': 'WebSite', '@id': domain + '/#website',
                 'url': domain + '/', 'name': 'Нова Дом', 'inLanguage': 'ru-RU',
                 'publisher': {'@id': domain + '/#studio'}}]
        kind = 'CollectionPage' if page['path'] == 'portfolio.html' else 'ContactPage' if page['path'] == 'contacts.html' else 'WebPage'
        webpage = {'@type': kind, '@id': page['url'] + '#webpage', 'url': page['url'],
                   'name': page['title'], 'description': page['description'], 'inLanguage': 'ru-RU',
                   'isPartOf': {'@id': domain + '/#website'}, 'about': {'@id': domain + '/#studio'},
                   'primaryImageOfPage': {'@type': 'ImageObject', 'url': page['image']}}
        graph.append(webpage)
        if page['path'] != 'index.html':
            crumbs = [{'@type': 'ListItem', 'position': 1, 'name': 'Главная', 'item': domain + '/'}]
            if page['path'].startswith('assets/projects/'):
                crumbs.append({'@type': 'ListItem', 'position': 2, 'name': 'Проекты', 'item': domain + '/portfolio.html'})
            crumbs.append({'@type': 'ListItem', 'position': len(crumbs) + 1,
                           'name': page['heading'] if len(crumbs) == 2 else ('Проекты' if kind == 'CollectionPage' else 'Контакты'), 'item': page['url']})
            graph.append({'@type': 'BreadcrumbList', '@id': page['url'] + '#breadcrumbs', 'itemListElement': crumbs})
            webpage['breadcrumb'] = {'@id': page['url'] + '#breadcrumbs'}
        if kind == 'CollectionPage':
            graph.append({'@type': 'ItemList', '@id': page['url'] + '#projects',
                          'name': 'Проекты интерьеров студии Нова Дом', 'numberOfItems': len(pages) - 3,
                          'itemListElement': [{'@type': 'ListItem', 'position': i + 1,
                                              'name': p['heading'], 'url': p['url']} for i, p in enumerate(pages[3:])]})
            webpage['mainEntity'] = {'@id': page['url'] + '#projects'}
        if page['path'] == 'index.html':
            for name in ['Дизайн-проект интерьера', 'Планировочное решение', '3D-визуализация', 'Авторский надзор', 'Комплектация интерьера']:
                graph.append({'@type': 'Service', 'name': name, 'serviceType': name,
                              'provider': {'@id': domain + '/#studio'}, 'url': domain + '/#services',
                              'areaServed': ['Тула', 'Москва']})
        esc = lambda value: html.escape(value, quote=True)
        source = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m[1] + esc(page['description']) + m[2], source, count=1)
        for prop, value in [('og:title', page['title']), ('og:description', page['description'])]:
            source = re.sub(r'(<meta property="' + prop + r'" content=")[^"]*(")', lambda m: m[1] + esc(value) + m[2], source, count=1)
        block = '\n'.join([
            '    <!-- SEO: generated by tools/seo.py -->',
            f'    <link rel="canonical" href="{esc(page["url"])}">',
            f'    <link rel="describedby" href="{domain}/llms.txt" type="text/plain" title="Информация о студии для ИИ">',
            f'    <link rel="icon" href="{urljoin(page["url"], "../../assets/client/logo-symbol.svg" if page["path"].startswith("assets/projects/") else "assets/client/logo-symbol.svg")}" type="image/svg+xml">',
            f'    <link rel="preload" as="image" href="{esc(page["hero_src"])}" fetchpriority="high">',
            '    <meta name="robots" content="index, follow, max-image-preview:large">',
            '    <meta property="og:locale" content="ru_RU">',
            f'    <meta property="og:url" content="{esc(page["url"])}">',
            f'    <meta property="og:image" content="{esc(page["image"])}">',
            f'    <meta property="og:image:width" content="{page["image_width"]}">',
            f'    <meta property="og:image:height" content="{page["image_height"]}">',
            f'    <meta property="og:image:type" content="{mimetypes.guess_type(page["image"])[0]}">',
            f'    <meta property="og:image:alt" content="{esc(page["image_alt"])}">',
            '    <meta name="twitter:card" content="summary_large_image">',
            f'    <meta name="twitter:title" content="{esc(page["title"])}">',
            f'    <meta name="twitter:description" content="{esc(page["description"])}">',
            f'    <meta name="twitter:image" content="{esc(page["image"])}">',
            f'    <meta name="twitter:image:alt" content="{esc(page["image_alt"])}">',
            '    <script type="application/ld+json">',
            json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=2).replace('</', '<\\/'),
            '    </script>', '    <!-- /SEO -->'])
        source = re.sub(r'\n    <!-- SEO: generated by tools/seo.py -->.*?<!-- /SEO -->', '', source, flags=re.S)
        source = re.sub(r'(href="(?:\.\./)*styles\.css)(?:\?[^\"]*)?"', r'\1?v=20261111-ai-seo"', source)
        source = re.sub(r'<script src="([^"]*script\.js[^\"]*)"(?! defer)', r'<script src="\1" defer', source)
        if page['path'] != 'index.html':
            is_project = page['path'].startswith('assets/projects/')
            prefix = '../../' if is_project else ''
            breadcrumb = '<nav class="seo-breadcrumbs" aria-label="Хлебные крошки"><a href="' + prefix + 'index.html">Главная</a><span aria-hidden="true">/</span>'
            if is_project:
                breadcrumb += '<a href="../../portfolio.html">Проекты</a><span aria-hidden="true">/</span>'
            breadcrumb += '<span aria-current="page">' + esc(page['heading'] if is_project else 'Проекты' if kind == 'CollectionPage' else 'Контакты') + '</span></nav>'
            marked = '<!-- SEO breadcrumbs -->' + breadcrumb + '<!-- /SEO breadcrumbs -->'
            if '<!-- SEO breadcrumbs -->' in source:
                source = re.sub(r'<!-- SEO breadcrumbs -->.*?<!-- /SEO breadcrumbs -->', lambda m: marked, source, flags=re.S)
            elif is_project:
                source = re.sub(r'<a class="project-back"[^>]*>.*?</a>', lambda m: marked, source, count=1)
            elif kind == 'CollectionPage':
                source = source.replace('<div><h1 id="portfolio-title">', '<div>' + marked + '<h1 id="portfolio-title">')
            else:
                source = source.replace('<p class="kicker">связаться</p>', marked + '<p class="kicker">связаться</p>')
        source = source.replace('</head>', block + '\n</head>')
        page['file'].write_text(source, encoding='utf-8', newline='\n')

    exclusions = ['/.git/', '/.responsive-audit/', '/.agents/', '/.codex/', '/.claude/', '/.aws/',
                  '/tools/', '/deploy/', '/debug.log', '/SOURCE_NOTES.md', '/SEO.md', '/seo-config.json']
    rules = ''.join('Disallow: ' + path + '\n' for path in exclusions) + 'Allow: /\n'
    bots = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User']
    # Repeat exclusions: named groups do not inherit the wildcard group's rules.
    robots = 'User-agent: *\n' + rules + '\n# AI search and user-requested fetches\n'
    robots += ''.join('User-agent: ' + bot + '\n' for bot in bots) + rules
    robots += '\n# Reports remain crawlable so their noindex directive can be read.\n'
    robots += '\nSitemap: ' + domain + '/sitemap.xml\n'
    (ROOT / 'robots.txt').write_text(robots, encoding='utf-8')
    llms = '# Нова Дом — студия дизайна интерьеров Анны Царевой\n\n'
    llms += '> Дизайн жилых, коммерческих и общественных интерьеров. Студия работает в Туле, Москве и выезжает на объекты в другие регионы.\n\n'
    llms += 'Телефон: +7 (920) 753-99-97. Встречи по записи. Ежедневно 09:00–18:00.\n'
    llms += 'Личный Telegram для консультации: https://t.me/Anna_asten. Канал с проектами: https://t.me/Anna_Tsareva.\n'
    llms += 'Услуги: планировочное решение, дизайн-проект, 3D-визуализация, подбор материалов, авторский надзор и комплектация.\n'
    llms += 'Состав, стоимость и условия согласуются перед началом работы; актуальные пакеты опубликованы в разделе услуг.\n\n'
    llms += '## Основные страницы\n'
    for p, name, summary in [(pages[0], 'Главная', 'Студия, услуги и стоимость, об Анне Царевой, отзывы и ответы на вопросы.'),
                             (pages[1], 'Портфолио', 'Квартиры, дома, отдельные комнаты и офисы.'),
                             (pages[2], 'Контакты', 'Телефон, Telegram, MAX и формат встречи.')]:
        llms += f'- [{name}]({p["url"]}): {summary}\n'
    llms += f'- [Услуги и стоимость]({domain}/#services): состав пакетов и условия работы.\n\n'
    llms += '## Проекты\n'
    for p in pages[3:]:
        llms += f'- [{p["heading"]}]({p["url"]}): {p["description"]}\n'
    llms += f'\n## Полный список страниц\n- [Карта сайта]({domain}/sitemap.xml): канонические адреса страниц.\n'
    (ROOT / 'llms.txt').write_text(llms, encoding='utf-8')
    ns = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    image_ns = 'http://www.google.com/schemas/sitemap-image/1.1'
    ET.register_namespace('', ns)
    ET.register_namespace('image', image_ns)
    sitemap = ET.Element('{' + ns + '}urlset')
    for page in pages:
        entry = ET.SubElement(sitemap, '{' + ns + '}url')
        ET.SubElement(entry, '{' + ns + '}loc').text = page['url']
        image = ET.SubElement(entry, '{' + image_ns + '}image')
        ET.SubElement(image, '{' + image_ns + '}loc').text = page['image']
    ET.indent(sitemap)
    ET.ElementTree(sitemap).write(ROOT / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    print(f'Updated SEO on {len(pages)} pages: {domain}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--domain')
    args = parser.parse_args()
    config = json.loads(CONFIG.read_text(encoding='utf-8'))
    domain = (args.domain or config['domain']).rstrip('/')
    parsed = urlparse(domain)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.port:
        parser.error('Use an HTTPS origin without a path, query, port or credentials.')
    generate(domain)
    CONFIG.write_text(json.dumps({'domain': domain}, indent=2) + '\n', encoding='utf-8')
