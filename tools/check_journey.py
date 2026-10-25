"""Çeviri dosyalarının kaynakla yapısal olarak eşleştiğini kontrol eder."""
import json, sys, glob
src = json.load(open('journey/journey.json'))
ok = True
for i, ch in enumerate(src['chapters'], 1):
    try:
        tr = json.load(open(f'translations/journey/ch{i}.json'))
    except FileNotFoundError:
        print(f'ch{i}: henüz yok'); continue
    except json.JSONDecodeError as e:
        print(f'ch{i}: JSON hatası {e}'); ok = False; continue
    for t in ch['tasks']:
        tt = tr['tasks'].get(t['slug'])
        if not tt:
            print(f'ch{i} {t["slug"]}: eksik'); ok = False; continue
        if set(tt['overview']) != set(t['overview']):
            print(f'ch{i} {t["slug"]}: overview alanları farklı'); ok = False
        if len(tt['steps']) != len(t['steps']) or len(tt['faqs']) != len(t['faqs']):
            print(f'ch{i} {t["slug"]}: adım/SSS sayısı farklı'); ok = False
    extra = set(tr['tasks']) - {t['slug'] for t in ch['tasks']}
    if extra: print(f'ch{i}: fazla görev {extra}'); ok = False
    print(f'ch{i}: kontrol edildi')
sys.exit(0 if ok else 1)
