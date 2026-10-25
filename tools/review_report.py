"""İnceleme raporu (INCELEME.md): görev→rehber eşlemesi ve ürün yönlendirmeleri listesi."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
journey = json.loads((ROOT / 'data/journey.tr.json').read_text())
guides = json.loads((ROOT / 'data/guides.tr.json').read_text())
mapping = json.loads((ROOT / 'data/task-guide-map.json').read_text())['map']
mentions = json.loads((ROOT / 'data/product-mentions.json').read_text())
titles = {f'{g["category"]}/{g["slug"]}': g['title'] for g in guides['guides']}

lines = ['# İnceleme notları', '',
         'Bu dosya `python3 tools/review_report.py` ile üretilir.', '',
         '## Görev → ilgili rehberler eşlemesi', '',
         'Kaynak: `data/task-guide-map.json`. Değiştirmek için o dosyayı düzenleyip siteyi yeniden yayınlamak yeterli.', '']
for ch in journey['chapters']:
    lines += [f'### Bölüm {ch["order"]}: {ch["title"]}', '']
    for t in ch['tasks']:
        refs = mapping.get(f'{ch["id"]}/{t["slug"]}', [])
        lines.append(f'- **{t["title"]}** → ' + '; '.join(titles[r] for r in refs))
    lines.append('')
lines += ['## Ürün yönlendirmeleri (Expatrio)', '',
          f'Kaynakta {mentions["toplam"]} yerde Expatrio ürünlerine/özelliklerine açık yönlendirme var '
          '(Blocked Account, Value Package, sigorta, banka hesabı, Studybuddy Wishlist, Program Finder bağlantıları). '
          'Çeviride bunlar "ör. Expatrio" gibi nötr bir dille verildi; `upsellModule` alanları hiç kullanılmadı.', '',
          '| Bölüm | Sayfa | Yer | Geçen ifadeler |', '|---|---|---|---|']
for r in mentions['kayitlar']:
    lines.append(f'| {r["bölüm"]} | `{r["sayfa"]}` | {r["yer"]} | {", ".join(r["ifadeler"])} |')
(ROOT / 'INCELEME.md').write_text('\n'.join(lines) + '\n')
print('INCELEME.md yazıldı')
