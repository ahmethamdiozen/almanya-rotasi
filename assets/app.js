/* Almanya Rotası — tek sayfa uygulama (hash rotaları, derleme adımı yok). */
(function () {
  'use strict';

  const main = document.getElementById('main');
  const DONE_KEY = 'almanya-rotasi.done.v1';
  const data = { journey: null, guides: null, map: null, glossary: null };

  /* ---------- yardımcılar ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Türkçe ve Almanca harfleri sadeleştirerek arama yapar ("Burgeramt" ~ "Bürgeramt", "ogrenci" ~ "öğrenci").
  const fold = (s) => String(s)
    .toLocaleLowerCase('tr')
    .replace(/ß/g, 'ss')
    .replace(/[ıİ]/g, 'i')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  const slugify = (s) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function loadDone() {
    try { return new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]')); } catch (e) { return new Set(); }
  }
  let done = loadDone();
  function saveDone() {
    try { localStorage.setItem(DONE_KEY, JSON.stringify([...done])); } catch (e) { /* özel pencere: yalnızca bu oturumda tutulur */ }
  }
  const taskKey = (ch, t) => ch.id + '/' + t.slug;
  function toggleDone(key) {
    if (done.has(key)) done.delete(key); else done.add(key);
    saveDone();
    return done.has(key);
  }

  function chapterStats(ch) {
    const req = ch.tasks.filter((t) => t.required);
    const reqDone = req.filter((t) => done.has(taskKey(ch, t))).length;
    return { req: req.length, reqDone, complete: reqDone === req.length };
  }

  const ICONS = {
    time: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>',
    cost: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
    process: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
    why: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    passport: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/><path d="M22 9v6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
    bank: '<path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',
    house: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    city: '<path d="M3 21V9l5-3v15M8 21V4h8v17M16 21V10l5 2v9M3 21h18"/><path d="M11 8h2M11 12h2M11 16h2"/>',
  };
  const icon = (name, cls = 'icon') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  const checkSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';

  function setTitle(t) { document.title = t ? `${t} | Almanya Rotası` : 'Almanya Rotası'; }
  function setNav(section) {
    document.querySelectorAll('.main-nav a').forEach((a) => {
      if (a.dataset.nav === section) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function render(html, { title, section, focus = true }) {
    main.innerHTML = html;
    setTitle(title);
    setNav(section);
    window.scrollTo(0, 0);
    if (focus) main.focus({ preventScroll: true });
  }
  function notFound(msg) {
    render(`<div class="wrap narrow"><div class="page-head"><h1>Sayfa bulunamadı</h1>
      <p class="lead">${esc(msg || 'Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.')}</p>
      <p><a class="btn" href="#/yol-haritasi">Yol haritasına dön</a></p></div></div>`, { title: 'Bulunamadı' });
  }

  /* ---------- veri ---------- */
  function findGuide(cat, slug) { return data.guides.guides.find((g) => g.category === cat && g.slug === slug); }
  function catLabel(slug) { const c = data.guides.categories.find((x) => x.slug === slug); return c ? c.label : slug; }
  function guideHref(g) { return `#/rehberler/${g.category}/${g.slug}`; }
  function taskHref(ch, t) { return `#/yol-haritasi/${ch.id}/${t.slug}`; }
  function allTasks() {
    const out = [];
    data.journey.chapters.forEach((ch) => ch.tasks.forEach((t) => out.push({ ch, t })));
    return out;
  }

  /* ---------- Yol haritası ---------- */
  function currentChapterIndex() {
    const i = data.journey.chapters.findIndex((ch) => !chapterStats(ch).complete);
    return i === -1 ? data.journey.chapters.length - 1 : i;
  }

  function progressBar(doneN, total, label) {
    const pct = total ? Math.round((doneN / total) * 100) : 0;
    return `<div class="progress" role="group" aria-label="${esc(label)}">
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${doneN}" aria-label="${esc(label)}">
        <div class="progress-fill${doneN === total && total ? ' full' : ''}" style="width:${pct}%"></div></div>
      <span class="progress-label">${doneN}/${total}</span></div>`;
  }

  function viewJourney() {
    const chapters = data.journey.chapters;
    const cur = currentChapterIndex();
    let reqAll = 0, reqDoneAll = 0;
    chapters.forEach((ch) => { const s = chapterStats(ch); reqAll += s.req; reqDoneAll += s.reqDone; });
    const totalTasks = chapters.reduce((n, ch) => n + ch.tasks.length, 0);

    const stops = chapters.map((ch, i) => {
      const s = chapterStats(ch);
      const state = s.complete ? 'done' : i === cur ? 'current' : '';
      return `<li class="stop ${state}">
        <div class="stop-dot" aria-hidden="true">${s.complete ? checkSvg.replace('<svg', '<svg width="18" height="18" stroke="#fff" stroke-width="3" fill="none"') : ch.order}</div>
        <article class="stop-card">
          <p class="chapter-no">Bölüm ${ch.order}${i === cur && !s.complete ? '<span class="here">Buradasınız</span>' : ''}</p>
          <h2><a href="#/yol-haritasi/${ch.id}">${esc(ch.title)}</a></h2>
          <p>${esc(ch.description)}</p>
          <div class="stop-meta">
            ${progressBar(s.reqDone, s.req, `Bölüm ${ch.order} zorunlu görev ilerlemesi`)}
            <a class="btn${i === cur ? '' : ' ghost'}" href="#/yol-haritasi/${ch.id}">Bölümü aç</a>
          </div>
        </article></li>`;
    }).join('');

    render(`<div class="wrap narrow">
      <div class="page-head">
        <h1>Yol Haritası</h1>
        <p class="lead">Almanya'da İngilizce eğitim veren bir yüksek lisans programına giden yol: hazırlıktan yerleşmeye 5 bölüm, ${totalTasks} görev.</p>
      </div>
      <div class="overall">
        <strong>Zorunlu görevlerdeki ilerlemeniz</strong>
        ${progressBar(reqDoneAll, reqAll, 'Toplam zorunlu görev ilerlemesi')}
        <p class="meta-line">İşaretledikleriniz yalnızca bu tarayıcıda saklanır.</p>
      </div>
      <ol class="route" aria-label="Bölümler">${stops}</ol>
    </div>`, { title: 'Yol Haritası', section: 'yol-haritasi' });
  }

  function miniLine(activeIdx) {
    const chs = data.journey.chapters;
    return `<nav class="mini-line" aria-label="Bölümler arası geçiş">${chs.map((ch, i) => {
      const s = chapterStats(ch);
      const node = i === activeIdx
        ? `<span class="cur" aria-current="page" title="Bölüm ${ch.order}: ${esc(ch.title)}">${ch.order}</span>`
        : `<a class="${s.complete ? 'done' : ''}" href="#/yol-haritasi/${ch.id}" title="Bölüm ${ch.order}: ${esc(ch.title)}" aria-label="Bölüm ${ch.order}: ${esc(ch.title)}">${ch.order}</a>`;
      return (i ? '<i aria-hidden="true"></i>' : '') + node;
    }).join('')}</nav>`;
  }

  function taskRow(ch, t) {
    const key = taskKey(ch, t);
    const isDone = done.has(key);
    return `<li class="task-row ${t.required ? 'req' : 'opt'}${isDone ? ' is-done' : ''}">
      <button class="check" type="button" data-key="${esc(key)}" aria-pressed="${isDone}" aria-label="${esc(t.title)}: tamamlandı olarak işaretle"><span>${checkSvg}</span></button>
      <a class="task-link" href="${taskHref(ch, t)}">${esc(t.title)}</a>
      <span class="chev">${icon('chev')}</span></li>`;
  }

  function viewChapter(chId) {
    const chs = data.journey.chapters;
    const idx = chs.findIndex((c) => c.id === chId);
    if (idx === -1) return notFound('Bu bölüm bulunamadı.');
    const ch = chs[idx];
    const s = chapterStats(ch);
    const req = ch.tasks.filter((t) => t.required);
    const opt = ch.tasks.filter((t) => !t.required);
    const prev = chs[idx - 1], next = chs[idx + 1];

    render(`<div class="wrap narrow">
      <a class="back" href="#/yol-haritasi">${icon('left')} Yol Haritası</a>
      <div class="page-head">
        ${miniLine(idx)}
        <h1>Bölüm ${ch.order}: ${esc(ch.title)}</h1>
        <p class="lead">${esc(ch.description)}</p>
        <div id="chapter-progress">${progressBar(s.reqDone, s.req, 'Zorunlu görev ilerlemesi')}</div>
        <p class="meta-line">İlerleme yalnızca zorunlu görevleri sayar.</p>
      </div>
      <section class="task-group" aria-labelledby="req-h">
        <h2 id="req-h">Zorunlu <small>${req.length} görev</small></h2>
        <ul class="task-list">${req.map((t) => taskRow(ch, t)).join('')}</ul>
      </section>
      ${opt.length ? `<section class="task-group" aria-labelledby="opt-h">
        <h2 id="opt-h">Opsiyonel <small>${opt.length} görev</small></h2>
        <ul class="task-list">${opt.map((t) => taskRow(ch, t)).join('')}</ul>
      </section>` : ''}
      <nav class="chapter-nav" aria-label="Bölüm gezinmesi">
        ${prev ? `<a class="btn ghost" href="#/yol-haritasi/${prev.id}">${icon('left')} Önceki bölüm</a>` : '<span></span>'}
        ${next ? `<a class="btn" href="#/yol-haritasi/${next.id}">Sonraki bölüm ${icon('right')}</a>` : ''}
      </nav>
    </div>`, { title: `Bölüm ${ch.order}: ${ch.title}`, section: 'yol-haritasi' });

    main.querySelectorAll('.check').forEach((btn) => btn.addEventListener('click', () => {
      const on = toggleDone(btn.dataset.key);
      btn.setAttribute('aria-pressed', String(on));
      btn.closest('.task-row').classList.toggle('is-done', on);
      const st = chapterStats(ch);
      document.getElementById('chapter-progress').innerHTML = progressBar(st.reqDone, st.req, 'Zorunlu görev ilerlemesi');
    }));
  }

  function viewTask(chId, slug) {
    const chs = data.journey.chapters;
    const idx = chs.findIndex((c) => c.id === chId);
    const ch = chs[idx];
    const t = ch && ch.tasks.find((x) => x.slug === slug);
    if (!t) return notFound('Bu görev bulunamadı.');
    const key = taskKey(ch, t);
    const tIdx = ch.tasks.indexOf(t);
    const nextTask = ch.tasks[tIdx + 1];
    const nextCh = chs[idx + 1];

    const labels = { time: 'Süre', cost: 'Maliyet', process: 'Süreç', why: 'Neden' };
    const facts = ['time', 'cost', 'process', 'why'].filter((k) => t.overview[k]).map((k) =>
      `<div class="fact">${icon(k)}<dt>${labels[k]}</dt><dd>${esc(t.overview[k])}</dd></div>`).join('');

    const steps = t.steps.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('');
    const faqs = t.faqs.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
    const related = (data.map[key] || []).map((ref) => {
      const [c, s] = ref.split('/');
      const g = findGuide(c, s);
      return g ? `<a href="${guideHref(g)}"><strong>${esc(g.title)}</strong><span>${esc(catLabel(g.category))}</span></a>` : '';
    }).join('');

    let nextLink = '';
    if (nextTask) nextLink = `<a class="btn" href="${taskHref(ch, nextTask)}">Sonraki görev: ${esc(nextTask.title)} ${icon('right')}</a>`;
    else if (nextCh) nextLink = `<a class="btn" href="#/yol-haritasi/${nextCh.id}">Sonraki bölüm: ${esc(nextCh.title)} ${icon('right')}</a>`;
    else nextLink = `<a class="btn" href="#/yol-haritasi">Yol haritasına dön ${icon('right')}</a>`;

    const isDone = done.has(key);
    render(`<div class="wrap narrow">
      <a class="back" href="#/yol-haritasi/${ch.id}">${icon('left')} Bölüm ${ch.order}: ${esc(ch.title)}</a>
      <div class="task-head">
        <span class="tag ${t.required ? 'req' : 'opt'}" style="justify-self:start">${t.required ? 'Zorunlu görev' : 'Önerilen görev'}</span>
        <h1>${esc(t.title)}</h1>
        <button type="button" class="btn ghost mark-btn" aria-pressed="${isDone}">${isDone ? 'Tamamlandı ✓' : 'Tamamlandı olarak işaretle'}</button>
        <p class="task-intro">${esc(t.intro)}</p>
      </div>
      <section class="panel" aria-labelledby="ov-h"><h2 id="ov-h">Genel bakış</h2><dl class="facts">${facts}</dl></section>
      <section class="panel" aria-labelledby="st-h"><h2 id="st-h">Adım adım</h2><ol class="steps">${steps}</ol></section>
      <section class="panel" aria-labelledby="faq-h"><h2 id="faq-h">Sık sorulan sorular</h2>${faqs}</section>
      ${related ? `<section class="panel" aria-labelledby="rel-h"><h2 id="rel-h">İlgili rehberler</h2><div class="related">${related}</div></section>` : ''}
      <div class="next-task">${nextLink}</div>
    </div>`, { title: t.title, section: 'yol-haritasi' });

    const btn = main.querySelector('.mark-btn');
    btn.addEventListener('click', () => {
      const on = toggleDone(key);
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'Tamamlandı ✓' : 'Tamamlandı olarak işaretle';
    });
  }

  /* ---------- Rehberler ---------- */
  function guideCard(g, { showCat = true, snippet = '' } = {}) {
    return `<li><a class="guide-card" href="${guideHref(g)}">
      ${showCat ? `<span class="tag">${esc(catLabel(g.category))}</span>` : ''}
      <strong>${esc(g.title)}</strong><span class="desc">${esc(g.description)}</span>${snippet}</a></li>`;
  }

  const heroLines = `<svg class="lines" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" fill="none" stroke="#fff" stroke-width="6">
    <path d="M-20 160 H180 L260 80 H620"/><path d="M-20 40 H120 L200 120 H420 L480 60 H620"/><path d="M300 -20 V220"/>
    <g fill="#fff"><circle cx="180" cy="160" r="9"/><circle cx="260" cy="80" r="9"/><circle cx="300" cy="80" r="9"/><circle cx="300" cy="120" r="9"/><circle cx="420" cy="120" r="9"/><circle cx="120" cy="40" r="9"/></g></svg>`;

  // Arama dizini: alanlar önceden sadeleştirilir.
  let index = null;
  function buildIndex() {
    index = data.guides.guides.map((g) => ({
      g,
      title: fold(g.title),
      desc: fold(g.description),
      tags: fold(g.tags.concat(g.tags_en).join(' ')),
      body: fold(g.body.replace(/\]\([^)]*\)/g, ']').replace(/[#*_`|>]/g, ' ')),
      rawBody: g.body.replace(/\]\([^)]*\)/g, ']').replace(/[#*_`|>[\]]/g, ' ').replace(/\s+/g, ' '),
    }));
  }
  function search(q) {
    const terms = fold(q).split(/\s+/).filter((w) => w.length > 1);
    if (!terms.length) return [];
    const res = [];
    for (const e of index) {
      let score = 0, ok = true;
      for (const w of terms) {
        let s = 0;
        if (e.title.includes(w)) s += 10;
        if (e.tags.includes(w)) s += 6;
        if (e.desc.includes(w)) s += 4;
        if (e.body.includes(w)) s += 1 + Math.min(4, e.body.split(w).length - 2);
        if (!s) { ok = false; break; }
        score += s;
      }
      if (ok) res.push({ e, score, terms });
    }
    return res.sort((a, b) => b.score - a.score);
  }
  // Gövdede ilk eşleşmenin çevresinden kısa bir alıntı üretir.
  function snippetFor(e, terms) {
    const foldedRaw = fold(e.rawBody);
    let pos = -1, len = 0;
    for (const w of terms) { const p = foldedRaw.indexOf(w); if (p !== -1 && (pos === -1 || p < pos)) { pos = p; len = w.length; } }
    if (pos === -1 || e.title.includes(terms[0])) return '';
    const start = Math.max(0, pos - 70), end = Math.min(e.rawBody.length, pos + len + 90);
    const text = e.rawBody.slice(start, end);
    const a = pos - start;
    return `<span class="snippet">${start ? '…' : ''}${esc(text.slice(0, a))}<mark>${esc(text.slice(a, a + len))}</mark>${esc(text.slice(a + len))}${end < e.rawBody.length ? '…' : ''}</span>`;
  }

  function guidesHomeBody(q) {
    if (q && q.trim()) {
      const results = search(q);
      return `<section class="section" aria-live="polite">
        <h2>Arama sonuçları</h2>
        <p class="result-count">“${esc(q)}” için ${results.length} rehber bulundu.</p>
        ${results.length ? `<ul class="guide-list">${results.map((r) => guideCard(r.e.g, { snippet: snippetFor(r.e, r.terms) })).join('')}</ul>`
          : '<p class="empty">Eşleşen rehber yok. Daha kısa bir kelime deneyin ya da aşağıdaki kategorilere göz atın.</p>'}
      </section>`;
    }
    const cats = data.guides.categories.map((c) => `<a class="cat" href="#/rehberler/${c.slug}">
      <span class="cat-icon">${icon(c.icon, 'x')}</span><strong>${esc(c.label)}</strong><span>${c.count} rehber</span></a>`).join('');
    const popular = data.guides.guides.filter((g) => g.popular);
    return `<section class="section" aria-labelledby="cat-h"><h2 id="cat-h">Kategoriler</h2><div class="cat-grid">${cats}</div></section>
      <section class="section" aria-labelledby="pop-h"><h2 id="pop-h">Popüler rehberler</h2>
        <ul class="guide-list two">${popular.map((g) => guideCard(g)).join('')}</ul></section>`;
  }

  function viewGuidesHome(q) {
    render(`<section class="guides-hero">${heroLines}<div class="wrap">
        <h1>Almanya'ya taşınma rehberleri</h1>
        <p>Vize, para, barınma ve aradaki her şey: ${data.guides.guides.length} rehber, ${data.guides.categories.length} kategori.</p>
        <form class="search" role="search" id="search-form">
          ${icon('search', 'x')}
          <label for="q" class="skip" style="position:absolute;left:-999px">Rehberlerde ara</label>
          <input id="q" type="search" name="q" placeholder="Ara: Anmeldung, bloke hesap, vergi…" autocomplete="off" value="${esc(q || '')}">
          ${q ? '<button type="button" id="clear">Temizle</button>' : ''}
        </form>
      </div></section>
      <div class="wrap" id="guides-body">${guidesHomeBody(q)}</div>`,
    { title: q ? `“${q}” araması` : 'Rehberler', section: 'rehberler', focus: !q });

    const input = document.getElementById('q');
    const body = document.getElementById('guides-body');
    let timer;
    const update = () => {
      const v = input.value;
      body.innerHTML = guidesHomeBody(v);
      const target = v.trim() ? `#/rehberler?q=${encodeURIComponent(v.trim())}` : '#/rehberler';
      history.replaceState(null, '', target);
      setTitle(v.trim() ? `“${v.trim()}” araması` : 'Rehberler');
    };
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 150); });
    document.getElementById('search-form').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); update(); });
    const clear = document.getElementById('clear');
    if (clear) clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
    if (q) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  }

  function viewCategory(cat) {
    const c = data.guides.categories.find((x) => x.slug === cat);
    if (!c) return notFound('Bu kategori bulunamadı.');
    const list = data.guides.guides.filter((g) => g.category === cat).sort((a, b) => a.order - b.order);
    const others = data.guides.categories.filter((x) => x.slug !== cat)
      .map((x) => `<a href="#/rehberler/${x.slug}">${esc(x.label)}</a>`).join('');
    render(`<div class="wrap narrow">
      <nav class="crumbs" aria-label="Konum"><a href="#/rehberler">Rehberler</a><span aria-hidden="true">/</span><span>${esc(c.label)}</span></nav>
      <div class="page-head"><h1>${esc(c.label)}</h1><p class="lead">${list.length} rehber</p></div>
      <ul class="guide-list">${list.map((g) => guideCard(g, { showCat: false })).join('')}</ul>
      <section class="section" aria-labelledby="more-h"><h2 id="more-h">Diğer konular</h2><div class="other-cats">${others}</div></section>
    </div>`, { title: c.label, section: 'rehberler' });
  }

  function renderMarkdown(md) {
    const html = marked.parse(md, { gfm: true });
    const tpl = document.createElement('div');
    tpl.innerHTML = html;
    const used = new Set();
    const toc = [];
    tpl.querySelectorAll('h2').forEach((h) => {
      let id = slugify(h.textContent) || 'bolum';
      while (used.has(id)) id += '-2';
      used.add(id);
      h.id = id;
      toc.push({ id, text: h.textContent });
    });
    tpl.querySelectorAll('table').forEach((t) => {
      const w = document.createElement('div');
      w.className = 'table-wrap';
      t.replaceWith(w);
      w.appendChild(t);
    });
    tpl.querySelectorAll('a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
    return { html: tpl.innerHTML, toc };
  }

  const fmtDate = (iso) => {
    try { return new Date(iso + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return iso; }
  };

  function viewGuide(cat, slug) {
    const g = findGuide(cat, slug);
    if (!g) return notFound('Bu rehber bulunamadı.');
    const { html, toc } = renderMarkdown(g.body);
    const linked = allTasks().filter(({ ch, t }) => (data.map[taskKey(ch, t)] || []).includes(`${cat}/${slug}`));
    const tocHtml = toc.length ? `<aside class="toc" aria-label="Bu sayfada"><div class="toc-inner">
        <details open id="toc-details"><summary>Bu sayfada</summary>
        <ol>${toc.map((x) => `<li><a href="#/rehberler/${cat}/${slug}" data-target="${x.id}">${esc(x.text)}</a></li>`).join('')}</ol></details>
        <a class="to-top" href="#/rehberler/${cat}/${slug}" data-target="top">↑ Başa dön</a></div></aside>` : '';

    render(`<div class="wrap" id="top">
      <nav class="crumbs" aria-label="Konum"><a href="#/rehberler">Rehberler</a><span aria-hidden="true">/</span><a href="#/rehberler/${cat}">${esc(catLabel(cat))}</a></nav>
      <div class="page-head narrow" style="margin:0;max-width:760px">
        <h1>${esc(g.title)}</h1>
        <p class="lead">${esc(g.description)}</p>
        <p class="meta-line">Kaynak tarihi: ${esc(fmtDate(g.date))}</p>
      </div>
      <div class="guide-layout">
        <div>
          <article class="prose">${html}</article>
          ${linked.length ? `<section class="linked-tasks panel" aria-labelledby="lt-h"><h2 id="lt-h">Yol haritasında ilgili görevler</h2>
            <div class="related">${linked.map(({ ch, t }) => `<a href="${taskHref(ch, t)}"><strong>${esc(t.title)}</strong><span>Bölüm ${ch.order}: ${esc(ch.title)}</span></a>`).join('')}</div></section>` : ''}
        </div>
        ${tocHtml}
      </div>
    </div>`, { title: g.title, section: 'rehberler' });

    // İçindekiler: hash rotasını bozmadan başlığa kaydır.
    main.querySelectorAll('[data-target]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const el = a.dataset.target === 'top' ? document.body : document.getElementById(a.dataset.target);
      if (!el) return;
      el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      if (a.dataset.target !== 'top') { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    }));
    // Küçük ekranda içindekiler kapalı başlasın.
    const det = document.getElementById('toc-details');
    if (det && matchMedia('(max-width: 979px)').matches) det.open = false;
    // Okunan bölümü içindekilerde vurgula.
    const links = [...main.querySelectorAll('.toc li a')];
    if (links.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.dataset.target === en.target.id));
        });
      }, { rootMargin: '0px 0px -70% 0px' });
      main.querySelectorAll('.prose h2').forEach((h) => io.observe(h));
    }
  }

  function viewGlossary() {
    const items = data.glossary.terms.map((t) => `<div><dt lang="de">${esc(t.term)}</dt><dd>${esc(t.tr)}${t.detail ? `<small>${esc(t.detail)}</small>` : ''}</dd></div>`).join('');
    render(`<div class="wrap narrow">
      <div class="page-head"><h1>Almanca terimler sözlüğü</h1>
      <p class="lead">Sitede Almanca bırakılan resmi terimler ve Türkçe karşılıkları. Her sayfada bir terimin ilk geçtiği yerde bu karşılık parantez içinde verilir.</p></div>
      <dl class="glossary">${items}</dl></div>`, { title: 'Sözlük', section: '' });
  }

  /* ---------- yönlendirme ---------- */
  function route() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const params = new URLSearchParams(query || '');
    if (!parts.length) { location.replace('#/yol-haritasi'); return; }
    const [sec, a, b] = parts;
    if (sec === 'yol-haritasi') {
      if (b) return viewTask(a, b);
      if (a) return viewChapter(a);
      return viewJourney();
    }
    if (sec === 'rehberler') {
      if (b) return viewGuide(a, b);
      if (a) return viewCategory(a);
      return viewGuidesHome(params.get('q') || '');
    }
    if (sec === 'sozluk') return viewGlossary();
    notFound();
  }

  async function init() {
    try {
      const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
      const [journey, guides, map, glossary] = await Promise.all([
        get('data/journey.tr.json'), get('data/guides.tr.json'), get('data/task-guide-map.json'), get('data/glossary.tr.json'),
      ]);
      Object.assign(data, { journey, guides, map: map.map, glossary });
      buildIndex();
      window.addEventListener('hashchange', route);
      route();
    } catch (err) {
      main.innerHTML = `<div class="wrap narrow"><div class="page-head"><h1>İçerik yüklenemedi</h1>
        <p class="lead">Veri dosyaları okunamadı. Sayfayı yenileyin; sorun sürerse siteyi bir web sunucusu üzerinden açtığınızdan emin olun.</p></div></div>`;
      console.error(err);
    }
  }
  init();
})();
