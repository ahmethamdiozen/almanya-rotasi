"""Rehber çevirilerini kaynakla yapısal olarak karşılaştırır: başlıklar, tablo satırları, liste öğeleri, bağlantılar."""
import json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from build_data import parse_front_matter

ROOT = Path(__file__).resolve().parent.parent
src = json.load(open(ROOT / 'guides/guides.json'))

def shape(md):
    lines = md.split('\n')
    return {
        'h2': sum(l.startswith('## ') for l in lines),
        'h3': sum(l.startswith('### ') for l in lines),
        'table': sum(l.lstrip().startswith('|') for l in lines),
        'list': sum(bool(re.match(r'\s*([-*]|\d+\.)\s', l)) for l in lines),
        'links': sorted(re.findall(r'\]\(([^)]+)\)', md)),
    }

bad = done = 0
for g in src['guides']:
    p = ROOT / f'translations/guides/{g["category"]}/{g["slug"]}.md'
    if not p.exists():
        continue
    done += 1
    meta, body = parse_front_matter(p.read_text())
    for k in ('title', 'description', 'tags'):
        if not meta.get(k):
            print(f'{p.name}: {k} eksik'); bad += 1
    a, b = shape(g['body']), shape(body)
    for k in a:
        if a[k] != b[k]:
            bad += 1
            print(f'{g["category"]}/{g["slug"]}: {k} farklı -> kaynak {a[k] if k != "links" else set(a[k]) - set(b[k])} / çeviri {b[k] if k != "links" else set(b[k]) - set(a[k])}')
print(f'{done}/{len(src["guides"])} rehber kontrol edildi, {bad} sorun')
sys.exit(1 if bad else 0)
