# Almanya Rotası

Almanya'da yüksek lisans yapmak isteyenler için Türkçe yol haritası ve rehberler. Expatrio StudyBuddy'nin "Journey Checklist" (5 bölüm, 51 görev) ve "Guides" (8 kategori, 64 rehber) bölümlerinin Türkçe çevirisini tek bir statik sitede birleştirir.

## Site yapısı

- **Yol Haritası** (`#/yol-haritasi`): 5 bölüm bir hat şeması üzerinde duraklar olarak gösterilir. Bölüm sayfasında zorunlu ve opsiyonel görevler; ilerleme çubuğu yalnızca zorunlu görevleri sayar. Görev sayfasında giriş, genel bakış, adım adım, SSS, ilgili rehberler ve sonraki görev bulunur. Tamamlanan görevler tarayıcıda (`localStorage`) saklanır.
- **Rehberler** (`#/rehberler`): arama (başlık, açıklama, etiket ve gövdede; Türkçe/Almanca harfleri sadeleştirir), 8 kategori, popüler rehberler, rehber sayfasında "Bu sayfada" içindekiler listesi.
- **Sözlük** (`#/sozluk`): metinde Almanca bırakılan terimlerin Türkçe karşılıkları.

Derleme adımı yoktur: `index.html`, `assets/` ve `data/` doğrudan GitHub Pages'ten sunulur.

## Klasörler

| Yol | İçerik |
|---|---|
| `index.html`, `assets/` | Site (sade HTML/CSS/JS, Markdown için `marked`) |
| `data/journey.tr.json` | Yol haritası verisi (derlenmiş) |
| `data/guides.tr.json` | Rehber verisi (derlenmiş) |
| `data/glossary.tr.json` | Almanca terim sözlüğü |
| `data/task-guide-map.json` | Görev → ilgili rehberler eşlemesi |
| `data/product-mentions.json` | Kaynakta Expatrio ürünlerine yönlendiren yerlerin listesi |
| `translations/` | Elle yazılmış Türkçe çeviriler (bölüm başına JSON, rehber başına Markdown) |
| `tools/` | Veri derleme ve kontrol betikleri |
| `INCELEME.md` | Eşleme ve ürün yönlendirmeleri listesi (kontrol için) |

## Veriyi yeniden derlemek

İngilizce kaynak paket (`journey/journey.json`, `guides/guides.json`) bu depoda yer almaz; yerelde proje köküne konmalıdır.

```sh
python3 tools/check_journey.py      # çevirilerin yapısını kaynakla karşılaştırır
python3 tools/check_guides.py       # rehber başlık/tablo/bağlantı sayılarını karşılaştırır
python3 tools/build_data.py         # data/*.tr.json dosyalarını üretir, sözlük açıklamalarını ekler
python3 tools/product_mentions.py   # data/product-mentions.json
python3 tools/review_report.py      # INCELEME.md
```

Yerelde denemek için: `python3 -m http.server` ve `http://localhost:8000`.

## Çeviri kuralları

- Almanca resmi terimler Almanca bırakıldı; her sayfada ilk düz metin geçişinde `data/glossary.tr.json` içindeki Türkçe karşılık parantezle eklenir (başlık, tablo, bağlantı ve tırnak içi arama kalıplarına eklenmez).
- Tutarlar, tarihler ve dış bağlantılar değiştirilmedi; sayılar Türkçe yazımla verildi (ör. 11.904 EUR, €18,36).
- Rehberlerdeki `faqs` (cevapsız sorular) ve `upsellModule` alanları sitede kullanılmadı.
- Expatrio ürün yönlendirmeleri nötr dille ("ör. Expatrio") verildi; liste `INCELEME.md` içinde.

## Uyarı

İçerik Expatrio'ya aittir ve kaynak tarihindeki (Ekim 2026) bilgileri yansıtır. Tutarlar, tarihler ve kurallar değişebilir; işlem yapmadan önce resmi kaynaklardan doğrulayın. Bu site hukuki tavsiye değildir.
