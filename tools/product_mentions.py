"""Kaynak metinde Expatrio ürünlerine yapılan açık yönlendirmeleri listeler (çeviride nötr dile çevrildiler)."""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATTERN = re.compile(r'Expatrio|Value Package|Studybuddy|StudyBuddy|Wishlist|Program Finder|study-finder|we keep it up to date', re.I)
FIELDS = {'intro': 'giriş', 'time': 'süre', 'cost': 'maliyet', 'process': 'süreç', 'why': 'neden'}

rows = []
journey = json.loads((ROOT / 'journey/journey.json').read_text())
for ch in journey['chapters']:
    for t in ch['tasks']:
        parts = [('giriş', t['intro'])] + [(FIELDS[k], v) for k, v in t['overview'].items()]
        parts += [(f'adım {s["n"]}', s['title'] + ' ' + s['text']) for s in t['steps']]
        parts += [(f'SSS {i}', f['q'] + ' ' + f['a']) for i, f in enumerate(t['faqs'], 1)]
        for where, text in parts:
            hits = sorted({m.group(0) for m in PATTERN.finditer(text)}, key=str.lower)
            if hits:
                rows.append({'bölüm': 'Yol Haritası', 'sayfa': f'{ch["id"]}/{t["slug"]}', 'yer': where, 'ifadeler': hits})

guides = json.loads((ROOT / 'guides/guides.json').read_text())
for g in guides['guides']:
    for i, para in enumerate(g['body'].split('\n')):
        hits = sorted({m.group(0) for m in PATTERN.finditer(para)}, key=str.lower)
        if hits:
            rows.append({'bölüm': 'Rehberler', 'sayfa': f'{g["category"]}/{g["slug"]}', 'yer': f'satır {i + 1}', 'ifadeler': hits})

out = {'not': 'Kaynakta Expatrio ürünlerine/özelliklerine açıkça yönlendiren yerler. Çeviride "ör. Expatrio" gibi nötr bir dille verildi; upsellModule alanları kullanılmadı.',
       'toplam': len(rows), 'kayitlar': rows}
(ROOT / 'data/product-mentions.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(len(rows))
for r in rows:
    print(f"{r['bölüm']:13} {r['sayfa']:55} {r['yer']:9} {', '.join(r['ifadeler'])}")
