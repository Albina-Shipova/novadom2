"""Read-only public HTTP checks; writes evidence to .responsive-audit/live-seo.json."""
import concurrent.futures
import datetime
import json
import ssl
import socket
import urllib.request
import urllib.error
from urllib.parse import urlparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = json.loads((ROOT / 'seo-config.json').read_text(encoding='utf-8'))['domain']
BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User']


def fetch(item):
    url, agent = item
    request = urllib.request.Request(url, headers={'User-Agent': agent, 'Accept-Encoding': 'gzip'})
    redirects = []
    class RecordRedirects(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            redirects.append({'status': code, 'from': req.full_url, 'to': newurl})
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    try:
        response = urllib.request.build_opener(RecordRedirects()).open(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    except Exception as error:
        return {'url': url, 'agent': agent, 'error': str(error)}
    with response:
        return {'url': url, 'agent': agent, 'status': response.status, 'final_url': response.url,
                'headers': dict(response.headers), 'bytes_read': len(response.read()), 'redirects': redirects}


items = [(DOMAIN + path, 'NovaDom-SEO-Check/1.0') for path in
         ['/', '/index.html', '/contacts.html', '/robots.txt', '/sitemap.xml', '/llms.txt', '/seo-check-nonexistent-20261111']]
items.append((DOMAIN.replace('https://', 'http://') + '/contacts.html?seo_probe=1', 'NovaDom-SEO-Check/1.0'))
items += [(DOMAIN + path, bot) for bot in BOTS for path in ['/', '/contacts.html']]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    results = list(executor.map(fetch, items))
host = urlparse(DOMAIN).hostname
try:
    with socket.create_connection((host, 443), timeout=15) as sock:
        with ssl.create_default_context().wrap_socket(sock, server_hostname=host) as secure:
            certificate = secure.getpeercert()
            tls = {'verified': True, 'expires': certificate['notAfter'], 'protocol': secure.version()}
except Exception as error:
    tls = {'verified': False, 'error': str(error)}
evidence = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'domain': DOMAIN, 'tls': tls, 'requests': results,
            'scope': 'Requests with named User-Agent strings; these are not requests from provider IP ranges.'}
output = ROOT / '.responsive-audit/live-seo.json'
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding='utf-8')
print('TLS:', json.dumps(tls))
for result in results:
    headers = {key.lower(): value for key, value in result.get('headers', {}).items()}
    print(result['agent'], result['url'], result.get('status', result.get('error')), result.get('final_url', ''),
          'robots=' + headers.get('x-robots-tag', '(absent)'), 'encoding=' + headers.get('content-encoding', '(absent)'))
