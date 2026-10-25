"""Çeviri dosyalarını kaynak yapıyla birleştirip sitenin okuduğu veri dosyalarını üretir.

Girdi:  journey/journey.json, guides/guides.json (İngilizce kaynak, yapı ve sıra için)
        translations/journey/ch{1..5}.json, translations/guides/*.md (Türkçe metin)
        data/glossary.tr.json (terim sözlüğü)
Çıktı:  data/journey.tr.json, data/guides.tr.json

Sözlük kuralı: Her sayfada (görev ya da rehber) bir Almanca terimin ilk geçtiği yere,
zaten parantezle açıklanmamışsa, " (Türkçe karşılık)" eklenir.

Kullanım: python3 tools/build_data.py [--allow-missing]
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALLOW_MISSING = '--allow-missing' in sys.argv

glossary = json.loads((ROOT / 'data/glossary.tr.json').read_text())['terms']
# Uzun terimler önce denensin (ör. "Haftpflichtversicherung" > "Haftpflicht").
glossary.sort(key=lambda t: -len(t['term']))

SUFFIX = r"(?:['’][^\s.,;:!?)\]*\"“”]+)?"


def term_regex(term):
    return re.compile(r'(?<![\w/.\-(])' + re.escape(term) + SUFFIX + r'(?![\w\-])')


TERM_RES = [(t, term_regex(t['term'])) for t in glossary]
# Terimin kendisi parantez içinde açıklama olarak geçiyorsa (ör. "göç dairesi (Ausländerbehörde)").
INSIDE_PAREN = {t['term']: re.compile(r'\(' + re.escape(t['term']) + r'[\s)]') for t in glossary}


class Annotator:
    """Tek bir sayfa için terimlerin ilk geçişini işaretler."""

    def __init__(self):
        self.done = set()

    def text(self, s):
        if not s:
            return s
        # Tırnak içindeki ifadeler (ör. arama kalıpları) olduğu gibi kalsın.
        quotes = []
        s = re.sub(r'"[^"]*"|“[^”]*”', lambda m: (quotes.append(m.group(0)), f'\x01{len(quotes)-1}\x01')[1], s)
        s = self._annotate(s)
        return re.sub(r'\x01(\d+)\x01', lambda m: quotes[int(m.group(1))], s)

    def _annotate(self, s):
        for t, rx in TERM_RES:
            term = t['term']
            if term in self.done:
                continue
            if INSIDE_PAREN[term].search(s):
                self.done.add(term)
                continue
            for m in rx.finditer(s):
                # Zaten bir parantezin içindeyse açıklama ekleme; sonraki geçişe bak.
                if s[:m.start()].count('(') > s[:m.start()].count(')'):
                    continue
                self.done.add(term)
                rest = s[m.end():]
                # Kapanış biçim işaretlerini (**, _) ve ek alan Türkçe ekini ('ta) atla,
                # sonra zaten parantez var mı bak.
                tail = re.match(r'[*_]*' + SUFFIX, rest).group(0)
                if not rest[len(tail):].lstrip().startswith('('):
                    insert_at = m.end() + len(tail)
                    s = s[:insert_at] + f' ({t["tr"]})' + s[insert_at:]
                break
        return s

    def markdown(self, md):
        out = []
        in_code = False
        for line in md.split('\n'):
            if line.startswith('```'):
                in_code = not in_code
            # Başlıklar ve tablolar sade kalsın; açıklama ilk düz metin geçişine eklenir.
            if in_code or line.lstrip().startswith(('#', '|')):
                out.append(line)
                continue
            # Bağlantıları (metin ve adres) koru: yer tutucuyla değiştir.
            urls = []
            masked = re.sub(r'\[[^\]]*\]\([^)]*\)', lambda m: (urls.append(m.group(0)), f'\x00{len(urls)-1}\x00')[1], line)
            masked = re.sub(r'https?://\S+', lambda m: (urls.append(m.group(0)), f'\x00{len(urls)-1}\x00')[1], masked)
            masked = self.text(masked)
            out.append(re.sub(r'\x00(\d+)\x00', lambda m: urls[int(m.group(1))], masked))
        return '\n'.join(out)


def build_journey():
    src = json.loads((ROOT / 'journey/journey.json').read_text())
    chapters = []
    for i, ch in enumerate(src['chapters'], 1):
        tr = json.loads((ROOT / f'translations/journey/ch{i}.json').read_text())
        tasks = []
        for t in ch['tasks']:
            tt = tr['tasks'][t['slug']]
            a = Annotator()
            intro = a.text(tt['intro'])
            overview = {k: a.text(tt['overview'][k]) for k in ('time', 'cost', 'process', 'why') if k in tt['overview']}
            steps = []
            for n, (title, text) in enumerate(tt['steps'], 1):
                steps.append({'n': n, 'title': title, 'text': a.text(text)})
            faqs = []
            for q, ans in tt['faqs']:
                faqs.append({'q': a.text(q), 'a': a.text(ans)})
            tasks.append({
                'order': t['order'],
                'slug': t['slug'],
                'required': t['required'],
                'title': tt['title'],
                'intro': intro,
                'overview': overview,
                'steps': steps,
                'faqs': faqs,
            })
        chapters.append({
            'order': ch['order'],
            'id': ch['id'],
            'title': tr['title'],
            'description': tr['description'],
            'declared': ch['declared'],
            'tasks': tasks,
        })
    out = {
        'source': src['source'],
        'journey_name': 'Almanya\'da yüksek lisans (İngilizce eğitim)',
        'language': 'tr',
        'chapters': chapters,
    }
    (ROOT / 'data/journey.tr.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    return sum(len(c['tasks']) for c in chapters)


def parse_front_matter(text):
    m = re.match(r'---\n(.*?)\n---\n', text, re.S)
    if not m:
        raise ValueError('front matter yok')
    meta = {}
    for line in m.group(1).split('\n'):
        k, _, v = line.partition(':')
        meta[k.strip()] = v.strip()
    return meta, text[m.end():].strip() + '\n'


GUIDE_LINK = re.compile(r'\]\(/guides/([\w-]+)/([\w-]+)/?\)')


def build_guides():
    src = json.loads((ROOT / 'guides/guides.json').read_text())
    cats_tr = json.loads((ROOT / 'translations/guides/_categories.json').read_text())
    known = {(g['category'], g['slug']) for g in src['guides']}
    guides, missing = [], []
    for g in src['guides']:
        p = ROOT / f'translations/guides/{g["category"]}/{g["slug"]}.md'
        if not p.exists():
            missing.append(f'{g["category"]}/{g["slug"]}')
            continue
        meta, body = parse_front_matter(p.read_text())

        def relink(m):
            if (m.group(1), m.group(2)) not in known:
                raise ValueError(f'{p.name}: bilinmeyen iç bağlantı {m.group(0)}')
            return f'](#/rehberler/{m.group(1)}/{m.group(2)})'

        body = GUIDE_LINK.sub(relink, body)
        a = Annotator()
        description = a.text(meta['description'])
        # Terimlerin zaten tablo halinde açıklandığı sözlük rehberinde ek parantez eklenmez.
        if meta.get('annotate') != 'no':
            body = a.markdown(body)
        guides.append({
            'order': g['order'],
            'category': g['category'],
            'slug': g['slug'],
            'title': meta['title'],
            'description': description,
            'tags': [t.strip() for t in meta.get('tags', '').split(',') if t.strip()],
            'tags_en': g['tags'],
            'date': g['date'],
            'popular': g['popular'],
            'body': body,
        })
    if missing and not ALLOW_MISSING:
        raise SystemExit(f'Çevirisi eksik rehberler ({len(missing)}): {", ".join(missing)}')
    categories = [{'slug': c['slug'], 'order': c['order'], 'label': cats_tr[c['slug']]['label'],
                   'icon': cats_tr[c['slug']]['icon'],
                   'count': sum(1 for g in guides if g['category'] == c['slug'])}
                  for c in src['categories']]
    out = {'source': src['source'], 'language': 'tr', 'categories': categories, 'guides': guides}
    (ROOT / 'data/guides.tr.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    return len(guides), missing


if __name__ == '__main__':
    n_tasks = build_journey()
    n_guides, missing = build_guides()
    print(f'journey: {n_tasks} görev, guides: {n_guides} rehber' + (f' (eksik {len(missing)})' if missing else ''))
