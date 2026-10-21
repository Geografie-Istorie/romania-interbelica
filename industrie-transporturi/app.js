'use strict';

/* ==========================================================================
   app.js — Industrializarea României interbelice (1920–1938) · versiunea 2
   --------------------------------------------------------------------------
    1. Utilitare
    2. Pornire și încărcarea datelor (date.json)
    3. „Ziarul interbelic” (editorial)
    4. Secțiunea A — Chart.js: boom-ul industrial
    5. Secțiunea B — HTML5 Canvas: fluxul petrolului
    6. Sunete — Web Audio (tren, sondă) și muzică de epocă (gramofon)
    7. Secțiunea C — SVG: harta (modulară: desenare · tooltip · regiuni · filtru · pop-up)
    8. Ghid audio din pop-up („Ascultă istoria”, cu filtru de radio)
    9. Secțiunea D — Simulatorul „Fii Ministrul Industriei în 1936!”
   10. Export (CSV) și tipărire (PDF)
   11. Bibliografie

   Regulă de echipă: cifrele istorice și coeficienții jocului trăiesc DOAR în date.json.
   Aici scriem logică, nu statistici.
   ========================================================================== */

/* ---------- 1. UTILITARE ---------- */

const NS_SVG = 'http://www.w3.org/2000/svg';
const REDUS_MISCARE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ETICHETE_INCREDERE = {
  verificat: 'verificat',
  derivat: 'derivat (calculat)',
  estimat: 'estimat – de verificat'
};

let DATE = null; // conținutul din date.json
let C = {};      // culorile și fonturile citite din style.css

const $ = (selector) => document.querySelector(selector);

const format = (v, zecimale = 2) =>
  v == null ? '—' : Number(v).toLocaleString('ro-RO', { maximumFractionDigits: zecimale });

/** Număr cu semn explicit (+12 / −3) — folosit la soldul bugetar. */
const cuSemn = (v, zecimale = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + format(Math.abs(v), zecimale);

/** Creează un element HTML. Textul se pune cu textContent (sigur, fără innerHTML). */
function el(tag, props = {}, ...copii) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  copii.flat().filter((c) => c != null && c !== false).forEach((c) => e.append(c));
  return e;
}

/** Creează un element SVG. */
function svgEl(tag, props = {}) {
  const e = document.createElementNS(NS_SVG, tag);
  for (const [k, v] of Object.entries(props)) e.setAttribute(k, v);
  return e;
}

const interval = (de, pana) => Array.from({ length: pana - de + 1 }, (_, i) => de + i);
const punct = (serie, an) => serie.date.find((p) => p.an === an) || null;
const areDate = (serie) => serie.date.some((p) => p.valoare != null);
const limiteaza = (x, min, max) => Math.min(max, Math.max(min, x));
const insigna = (incredere) =>
  el('span', { class: `insigna insigna-${incredere}`, text: ETICHETE_INCREDERE[incredere] || incredere });

/** Sursa bibliografică după id (sau null). */
const sursaDupaId = (id) => DATE.bibliografie.find((b) => b.id === id) || null;

/** „Surse: Calcan 2005, EVZ” — legături către lista din secțiunea „Surse și date”. */
function linkuriSurse(ids, clasa = 'ziar-surse') {
  const surse = ids.map(sursaDupaId).filter(Boolean);
  if (!surse.length) return null;
  const p = el('p', { class: clasa }, 'Surse: ');
  surse.forEach((s, i) => {
    if (i) p.append(', ');
    p.append(el('a', { href: `#sursa-${s.id}`, text: s.scurt || s.titlu }));
  });
  return p;
}

/** Cadrul (min/max lon/lat) al unei liste de puncte [lon, lat]. */
function cadruDin(puncte) {
  const lon = puncte.map((p) => p[0]);
  const lat = puncte.map((p) => p[1]);
  return { lonMin: Math.min(...lon), lonMax: Math.max(...lon), latMin: Math.min(...lat), latMax: Math.max(...lat) };
}

/**
 * Proiecție simplă (lon, lat) → (x, y), cu corecția cos(latitudine) ca harta să nu fie turtită.
 * Funcționează la fel pentru Canvas și pentru SVG.
 */
function creeazaProiectie(cadru, latime, inaltime, margine) {
  const k = Math.cos((((cadru.latMin + cadru.latMax) / 2) * Math.PI) / 180);
  const w = (cadru.lonMax - cadru.lonMin) * k;
  const h = cadru.latMax - cadru.latMin;
  const scala = Math.min((latime - 2 * margine) / w, (inaltime - 2 * margine) / h);
  const dx = (latime - w * scala) / 2;
  const dy = (inaltime - h * scala) / 2;
  return (lon, lat) => [dx + (lon - cadru.lonMin) * k * scala, dy + (cadru.latMax - lat) * scala];
}

/* ---------- 2. PORNIRE ---------- */

/** Transformă o eroare de sintaxă JSON într-un mesaj cu linie și coloană (Chrome le dă singur, Firefox/Safari nu). */
function descrieEroareJson(eroare, text) {
  let mesaj = String(eroare && eroare.message ? eroare.message : eroare);
  const poz = /position (\d+)/.exec(mesaj);
  if (poz && !/line \d+/.test(mesaj)) {
    const inainte = text.slice(0, Number(poz[1]));
    const linie = inainte.split('\n').length;
    const coloana = inainte.length - inainte.lastIndexOf('\n');
    mesaj += ` (linia ${linie}, coloana ${coloana})`;
  }
  return mesaj;
}

/** Citește și verifică un text JSON; dacă nu e valid, aruncă o eroare cu `fel = 'json'`. */
function analizeazaJson(text) {
  try {
    return JSON.parse(text);
  } catch (eroare) {
    const e = new Error(descrieEroareJson(eroare, text));
    e.fel = 'json';
    throw e;
  }
}

async function incarcaDate() {
  const raspuns = await fetch('date.json');   // pe file:// browserul respinge cererea (TypeError)
  if (!raspuns.ok) {
    const e = new Error(`date.json: HTTP ${raspuns.status}`);
    e.fel = 'http';
    throw e;
  }
  return analizeazaJson(await raspuns.text());
}

/** Bandă roșie cu mesaj; întoarce elementul, ca să-l putem șterge mai târziu. */
function arataEroare(mesaj, ...extra) {
  const banda = el('div', { class: 'eroare', role: 'alert' }, el('strong', { text: 'Ceva nu a mers. ' }), mesaj, ...extra);
  $('#continut').prepend(banda);
  return banda;
}

/**
 * Plasă de siguranță pentru deschiderea paginii direct din folder (file://), când browserul
 * nu lasă pagina să citească date.json: utilizatorul alege el fișierul, fără server.
 */
function ofertaAlegereFisier(mesaj) {
  const camp = el('input', { type: 'file', accept: '.json,application/json', id: 'alegeDate' });
  const banda = arataEroare(mesaj, el('p', {},
    el('label', { for: 'alegeDate', text: 'Alege fișierul date.json din același folder: ' }), camp));
  camp.addEventListener('change', async () => {
    const fisier = camp.files && camp.files[0];
    if (!fisier) return;
    try {
      DATE = analizeazaJson(await fisier.text());
    } catch (eroare) {
      banda.remove();
      ofertaAlegereFisier(`Fișierul ales nu este JSON valid: ${eroare.message}. Verifică virgulele și ghilimelele și șterge comentariile (// sau /* */).`);
      return;
    }
    banda.remove();
    porniesteCuDate();
  });
}

function arataEroareDate(eroare) {
  if (location.protocol !== 'file:') console.error(eroare);   // pe file:// e un caz așteptat, nu o eroare
  if (eroare.fel === 'json') {
    arataEroare(`date.json nu este JSON valid: ${eroare.message}. Verifică virgulele și ghilimelele și șterge comentariile (// sau /* */).`);
  } else if (location.protocol === 'file:') {
    ofertaAlegereFisier('Pagina e deschisă direct din folder (file://), iar browserul nu lasă pagina să citească singură date.json. ' +
      'Poți alege fișierul manual mai jos sau poți porni un server local (python -m http.server 8000, apoi http://localhost:8000).');
  } else {
    ofertaAlegereFisier(`Nu pot încărca date.json (${eroare.message}). Verifică dacă fișierul se află în același folder cu index.html și dacă serverul rulează; ` +
      'sau alege fișierul manual:');
  }
}

/** Pornește un modul în siguranță: dacă unul se strică, celelalte merg mai departe. */
function ruleaza(nume, functie) {
  try {
    functie();
  } catch (eroare) {
    console.error(`[${nume}]`, eroare);
    arataEroare(`Modulul „${nume}” nu a putut porni (detalii în consola browserului).`);
  }
}

async function porneste() {
  const stil = getComputedStyle(document.documentElement);
  const v = (nume) => stil.getPropertyValue(nume).trim();
  C = {
    hartie: v('--hartie'), hartie2: v('--hartie-2'), cerneala: v('--cerneala'),
    rosu: v('--rosu'), rosuDeschis: v('--rosu-deschis'), alama: v('--alama'),
    petrol: v('--petrol'), otel: v('--otel'),
    fontTitlu: v('--font-titlu'), fontText: v('--font-text')
  };

  // Din file:// browserul oricum refuză fetch('date.json'): mergem direct la alegerea manuală a fișierului.
  if (location.protocol === 'file:') {
    arataEroareDate(new Error('file://'));
    return;
  }
  try {
    DATE = await incarcaDate();
  } catch (eroare) {
    arataEroareDate(eroare);
    return;
  }
  porniesteCuDate();
}

/** Pornește toate modulele după ce datele sunt încărcate (din fetch sau din fișierul ales manual). */
function porniesteCuDate() {
  ruleaza('Ziar', initEditorial);
  if (typeof Chart !== 'undefined') {
    ruleaza('Secțiunea A', initSectiuneA);
  } else {
    arataEroare('Biblioteca Chart.js nu s-a încărcat (verifică conexiunea la internet sau linkul CDN din index.html).');
  }
  ruleaza('Secțiunea B', initSectiuneB);
  ruleaza('Secțiunea C', initSectiuneC);
  ruleaza('Secțiunea D', initSimulator);
  ruleaza('Bibliografie', initBibliografie);
  ruleaza('Muzică', initMuzica);
  ruleaza('Export', initExport);
}

document.addEventListener('DOMContentLoaded', porneste);

/* ---------- 3. „ZIARUL INTERBELIC” ---------- */

function initEditorial() {
  const e = DATE.editorial;
  if (!e) { $('#ziar').hidden = true; return; }

  $('#ziarTitlu').textContent = e.titlu_ziar;
  $('#ziarSubtitlu').textContent = e.subtitlu;
  $('#ziarLinie').replaceChildren(...e.linie.map((text) => el('li', { text })));
  $('#ziarColoane').replaceChildren(...e.articole.map((a) =>
    el('article', { class: 'ziar-articol' },
      el('h3', { text: a.titlu }),
      el('p', { text: a.text }),
      linkuriSurse(a.surse || []))));
  $('#ziarNota').textContent = e.nota_pastisa;
}

/* ---------- 4. SECȚIUNEA A — Chart.js ---------- */

const A = { cheie: 'petrol_extractie', anFinal: 1938, tip: 'line', grafic: null, puncte: [] };

function initSectiuneA() {
  const { an_start, an_sfarsit } = DATE.meta;
  A.anFinal = an_sfarsit;

  Chart.defaults.font.family = C.fontText;
  Chart.defaults.color = C.cerneala;

  // lista de indicatori, grupată pe domenii
  const sel = $('#selIndicator');
  const grupuri = {
    industrie: el('optgroup', { label: 'Industrie' }),
    transport: el('optgroup', { label: 'Transporturi' })
  };
  for (const [cheie, serie] of Object.entries(DATE.serii)) {
    if (!serie.sectiuni.includes('A')) continue;
    const text = serie.titlu + (areDate(serie) ? '' : ' (în curs de colectare)');
    (grupuri[serie.domeniu] || grupuri.industrie).append(el('option', { value: cheie, text }));
  }
  sel.append(grupuri.industrie, grupuri.transport);
  sel.value = A.cheie;
  sel.addEventListener('change', () => { A.cheie = sel.value; deseneazaA(); });

  // cursorul de ani
  const rng = $('#rngAn');
  rng.min = an_start;
  rng.max = an_sfarsit;
  rng.value = an_sfarsit;
  rng.addEventListener('input', () => { A.anFinal = Number(rng.value); deseneazaA(); });

  // linie / coloane
  document.querySelectorAll('[data-tip]').forEach((buton) =>
    buton.addEventListener('click', () => {
      A.tip = buton.dataset.tip;
      document.querySelectorAll('[data-tip]').forEach((b) => b.setAttribute('aria-pressed', String(b === buton)));
      deseneazaA();
    })
  );

  deseneazaA();
}

function deseneazaA() {
  const serie = DATE.serii[A.cheie];
  const ani = interval(DATE.meta.an_start, A.anFinal);
  A.puncte = ani.map((an) => punct(serie, an));
  const valori = A.puncte.map((p) => (p ? p.valoare : null));
  const verificat = A.puncte.map((p) => Boolean(p && p.incredere === 'verificat'));

  // punctele pline = verificat; cele goale / deschise = derivat sau estimat
  const dataset = A.tip === 'bar'
    ? {
        data: valori,
        backgroundColor: verificat.map((ok) => (ok ? C.rosu : C.rosuDeschis)),
        borderColor: C.rosu, borderWidth: 1, borderRadius: 1
      }
    : {
        data: valori,
        borderColor: C.rosu, borderWidth: 2.5, tension: 0.25, spanGaps: true,
        pointRadius: 5, pointHoverRadius: 7, pointBorderWidth: 2, pointBorderColor: C.rosu,
        pointBackgroundColor: verificat.map((ok) => (ok ? C.rosu : C.hartie2))
      };
  dataset.label = serie.titlu;

  const config = {
    type: A.tip,
    data: { labels: ani, datasets: [dataset] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: REDUS_MISCARE ? 0 : 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          // același aer ca tooltip-ul hărții: fundal închis, margine din alamă
          backgroundColor: '#2a2622', borderColor: C.alama, borderWidth: 1,
          titleFont: { family: C.fontTitlu, size: 14 }, padding: 10, cornerRadius: 2,
          callbacks: {
            label: (ctx) => `${format(ctx.parsed.y)} ${serie.unitate}`,
            afterLabel: (ctx) => {
              const p = A.puncte[ctx.dataIndex];
              return p ? [ETICHETE_INCREDERE[p.incredere], p.nota].filter(Boolean) : '';
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: A.tip === 'bar', title: { display: true, text: serie.unitate } }
      }
    }
  };

  if (A.grafic && A.grafic.config.type === config.type) {
    A.grafic.data = config.data;       // același tip: actualizăm datele, cu animație
    A.grafic.options = config.options;
    A.grafic.update();
  } else {
    if (A.grafic) A.grafic.destroy();  // tip nou (linie ↔ coloane): refacem graficul
    A.grafic = new Chart($('#graficBoom'), config);
  }

  $('#graficBoom').setAttribute('aria-label',
    `Grafic ${A.tip === 'bar' ? 'cu coloane' : 'liniar'}: ${serie.titlu} (${serie.unitate}), ${DATE.meta.an_start}–${A.anFinal}`);
  actualizeazaTextA(serie, valori);
}

function actualizeazaTextA(serie, valori) {
  const p = A.puncte[A.puncte.length - 1]; // punctul din anul selectat
  const areValoare = Boolean(p && p.valoare != null);

  $('#outAn').textContent = A.anFinal;
  $('#kpiAn').textContent = A.anFinal;
  $('#kpiValoare').textContent = areValoare ? `${format(p.valoare)} ${serie.unitate}` : 'fără date';
  $('#kpiIncredere').replaceChildren(areValoare ? insigna(p.incredere) : '—');

  const note = [];
  const nr = valori.filter((x) => x != null).length;
  if (!areDate(serie)) {
    note.push('Această serie nu are încă date: Statisticianul o completează în date.json.');
  } else {
    if (nr < valori.length) note.push(`Serie parțială: ${nr} din ${valori.length} ani au valori.`);
    if (A.puncte.some((x) => x && x.incredere !== 'verificat')) {
      note.push('Punctele goale (sau coloanele deschise) sunt valori provizorii sau calculate.');
    }
  }
  if (serie.nota) note.push(serie.nota);
  $('#notaA').textContent = note.join(' ');

  // contextul istoric până în anul selectat (cele mai recente 4 repere)
  const lista = $('#repereA');
  lista.replaceChildren();
  DATE.repere
    .filter((r) => r.an >= DATE.meta.an_start && r.an <= A.anFinal)
    .sort((a, b) => b.an - a.an)
    .slice(0, 4)
    .forEach((r) => lista.append(el('li', {}, el('strong', { text: `${r.an} — ` }), r.text)));
}

/* ---------- 5. SECȚIUNEA B — HTML5 Canvas ---------- */

const B = {
  an: 0, joaca: false, cronometru: null, vizibil: true, murdar: true,
  latime: 0, inaltime: 0, proiectie: null,
  noduri: new Map(), rute: [], dunare: [],
  valoare: 0, max: 1, anMax: 0, cv: null, ctx: null
};

const POZITII_ETICHETE = { dr: [10, 4, 'left'], st: [-10, 4, 'right'], sus: [0, -12, 'center'], jos: [0, 22, 'center'] };

function initSectiuneB() {
  B.cv = $('#canvasFlux');
  B.ctx = B.cv.getContext('2d');

  const valori = DATE.serii.petrol_extractie.date.filter((p) => p.valoare != null);
  B.max = Math.max(...valori.map((p) => p.valoare));
  B.anMax = valori.find((p) => p.valoare === B.max).an;
  B.an = B.anMax;

  const rng = $('#rngAnFlux');
  rng.min = DATE.meta.an_start;
  rng.max = DATE.meta.an_sfarsit;
  rng.addEventListener('input', () => setAnB(Number(rng.value)));
  $('#btnJoaca').addEventListener('click', comutaJoaca);
  $('#chkSunet').addEventListener('change', actualizeazaSunetB); // un gest al utilizatorului: browserul permite sunetul

  new ResizeObserver(redimensioneazaB).observe(B.cv.parentElement);
  new IntersectionObserver(([intrare]) => { B.vizibil = intrare.isIntersecting; }).observe(B.cv);

  redimensioneazaB();
  setAnB(B.an);
  requestAnimationFrame(bucla);
}

function redimensioneazaB() {
  const dpr = window.devicePixelRatio || 1;
  const lat = Math.max(280, Math.floor(B.cv.parentElement.clientWidth));
  if (lat === B.latime && B.proiectie) return;
  const inal = Math.round(lat * (lat < 560 ? 0.9 : 0.54));

  B.latime = lat;
  B.inaltime = inal;
  B.cv.width = Math.round(lat * dpr);   // rezoluție reală (ecrane retina)
  B.cv.height = Math.round(inal * dpr);
  B.cv.style.height = `${inal}px`;
  B.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const flux = DATE.flux;
  B.proiectie = creeazaProiectie(flux.cadru, lat, inal, 46);
  B.noduri = new Map(flux.noduri.map((n) => {
    const [x, y] = B.proiectie(n.lon, n.lat);
    return [n.id, { ...n, x, y }];
  }));
  B.dunare = flux.dunarea.map(([lon, lat2]) => B.proiectie(lon, lat2));
  B.rute = flux.rute.map((r) => {
    const pct = r.traseu.map((id) => { const n = B.noduri.get(id); return [n.x, n.y]; });
    let lungime = 0;
    for (let i = 1; i < pct.length; i++) {
      lungime += Math.hypot(pct[i][0] - pct[i - 1][0], pct[i][1] - pct[i - 1][1]);
    }
    return { ...r, pct, lungime };
  });
  B.murdar = true;
}

function setAnB(an) {
  B.an = an;
  const p = punct(DATE.serii.petrol_extractie, an);
  B.valoare = p && p.valoare != null ? p.valoare : 0;

  $('#rngAnFlux').value = an;
  $('#outAnFlux').textContent = an;
  $('#infoFlux').replaceChildren(
    el('strong', { text: `${an}: ` }),
    `extracție de ${format(B.valoare)} milioane tone de țiței (${Math.round((B.valoare / B.max) * 100)}% din maximul interbelic, atins în ${B.anMax}). `,
    p ? insigna(p.incredere) : null
  );
  B.murdar = true;
}

function comutaJoaca() {
  B.joaca = !B.joaca;
  clearInterval(B.cronometru);
  const buton = $('#btnJoaca');
  buton.textContent = B.joaca ? '⏸ Pauză' : '▶ Redă anii';
  buton.setAttribute('aria-pressed', String(B.joaca));

  if (B.joaca) {
    if (B.an >= DATE.meta.an_sfarsit) setAnB(DATE.meta.an_start);
    B.cronometru = setInterval(() => {
      if (B.an >= DATE.meta.an_sfarsit) comutaJoaca();
      else setAnB(B.an + 1);
    }, 900);
  }
  actualizeazaSunetB();
}

/** Sunetele merg doar cât timp rulează animația ȘI caseta „Sunete” e bifată. */
function actualizeazaSunetB() {
  const dorit = B.joaca && $('#chkSunet').checked;
  if (dorit) {
    Sunet.porneste(() => ({
      intensitate: B.max ? B.valoare / B.max : 0,
      vizibil: B.vizibil && !document.hidden
    }));
  } else {
    Sunet.opreste();
  }
}

function bucla(ms) {
  if (B.vizibil && !document.hidden) {
    if (!REDUS_MISCARE) deseneazaB(ms / 1000);
    else if (B.murdar) { deseneazaB(0); B.murdar = false; } // fără mișcare: redesenăm doar la schimbări
  }
  requestAnimationFrame(bucla);
}

/** Poziția (x, y, unghi) la distanța d de-a lungul unei rute. */
function pozitiePeRuta(ruta, d) {
  let parcurs = 0;
  for (let i = 1; i < ruta.pct.length; i++) {
    const [x0, y0] = ruta.pct[i - 1];
    const [x1, y1] = ruta.pct[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (d <= parcurs + seg || i === ruta.pct.length - 1) {
      const u = seg === 0 ? 0 : Math.min(1, (d - parcurs) / seg);
      return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, Math.atan2(y1 - y0, x1 - x0)];
    }
    parcurs += seg;
  }
  return [0, 0, 0];
}

function traseaza(ctx, pct) {
  ctx.beginPath();
  pct.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

function deseneazaB(t) {
  const { ctx, latime: W, inaltime: H } = B;
  ctx.clearRect(0, 0, W, H);

  // Marea Neagră
  const xMare = B.proiectie(DATE.flux.litoral_lon, 44)[0];
  ctx.fillStyle = 'rgba(53, 78, 99, 0.16)';
  ctx.fillRect(xMare, 0, W - xMare, H);
  ctx.save();
  ctx.translate((xMare + W) / 2 + 4, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = C.otel;
  ctx.font = `italic 15px ${C.fontTitlu}`;
  ctx.textAlign = 'center';
  ctx.fillText('Marea Neagră', 0, 0);
  ctx.restore();

  // Dunărea
  ctx.save();
  ctx.strokeStyle = 'rgba(53, 78, 99, 0.5)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  traseaza(ctx, B.dunare);
  ctx.restore();
  ctx.fillStyle = C.otel;
  ctx.font = `italic 13px ${C.fontTitlu}`;
  ctx.textAlign = 'left';
  const [dx, dy] = B.dunare[2];
  ctx.fillText('Dunărea', dx - 10, dy + 22);

  // liniile rutelor
  for (const r of B.rute) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (r.mod === 'conducta') {
      ctx.strokeStyle = C.petrol;
      ctx.lineWidth = 3.5;
      traseaza(ctx, r.pct);
    } else {
      ctx.strokeStyle = C.cerneala;
      ctx.lineWidth = 4;
      traseaza(ctx, r.pct);
      ctx.strokeStyle = C.hartie;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      traseaza(ctx, r.pct);
    }
    ctx.restore();
  }

  // particulele: puncte aurii pe conducte, trenuri cisternă pe calea ferată
  const intensitate = B.valoare / B.max;
  const factor = Math.max(0.6, Math.min(1, W / 700));
  for (const r of B.rute) {
    const conducta = r.mod === 'conducta';
    const n = Math.max(1, Math.round(intensitate * r.pondere * (conducta ? 16 : 5)));
    const viteza = conducta ? 38 : 64; // px pe secundă
    for (let i = 0; i < n; i++) {
      const f = (i / n + (t * viteza) / r.lungime) % 1;
      const [x, y, unghi] = pozitiePeRuta(r, f * r.lungime);
      if (conducta) {
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = C.alama;
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(unghi);
        for (let vag = 0; vag < 3; vag++) {
          ctx.fillStyle = vag === 0 ? C.petrol : C.rosu; // primul vagon = locomotiva
          ctx.fillRect((-18 + vag * 12) * factor, -3.5 * factor, 10 * factor, 7 * factor);
        }
        ctx.restore();
      }
    }
  }

  // nodurile (câmpuri, rafinării, orașe, porturi)
  const culoriNoduri = { camp: C.alama, rafinarie: C.rosu, oras: C.cerneala, port: C.otel, nod: C.cerneala };
  ctx.font = `600 13px ${C.fontText}`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.hartie;
  for (const n of B.noduri.values()) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = culoriNoduri[n.tip] || C.cerneala;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.hartie2;
    ctx.stroke();

    const [ox, oy, aliniere] = POZITII_ETICHETE[n.eticheta] || POZITII_ETICHETE.dr;
    ctx.textAlign = aliniere;
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.hartie;
    ctx.strokeText(n.nume, n.x + ox, n.y + oy);
    ctx.fillStyle = C.cerneala;
    ctx.fillText(n.nume, n.x + ox, n.y + oy);
  }
}

/* ---------- 6. SUNETE (Web Audio) ȘI MUZICĂ DE EPOCĂ ---------- */

/*
   Browserele nu permit sunet până când utilizatorul face un gest (click, bifare).
   De aceea AudioContext se creează abia la primul click pe „Redă anii” / pe gramofon.
   Efectele (tren, sondă) sunt SINTETIZATE în cod — nu folosim înregistrări, deci nu avem
   probleme de drepturi de autor.
*/

let _contextAudio = null;
let _zgomot = null;

/** Un singur AudioContext pentru toată pagina. */
function obtineContextAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_contextAudio) {
    try { _contextAudio = new AC(); } catch (eroare) { console.warn('AudioContext indisponibil', eroare); return null; }
  }
  if (_contextAudio.state === 'suspended') _contextAudio.resume();
  return _contextAudio;
}

/** O secundă de zgomot alb, refolosită pentru „ciuf” și pentru șuierul de radio. */
function obtineZgomot(ctx) {
  if (!_zgomot) {
    const n = ctx.sampleRate;
    _zgomot = ctx.createBuffer(1, n, n);
    const date = _zgomot.getChannelData(0);
    for (let i = 0; i < n; i++) date[i] = Math.random() * 2 - 1;
  }
  return _zgomot;
}

function aceeasiOrigine(cale) {
  try { return new URL(cale, location.href).origin === location.origin; } catch (e) { return false; }
}

const Sunet = {
  ctx: null, master: null, activ: false, numar: 0, timere: {}, stare: () => ({ intensitate: 0.5, vizibil: true }),

  /** Pregătește contextul audio (apelat dintr-un gest al utilizatorului). */
  asigura() {
    const ctx = obtineContextAudio();
    if (!ctx) return false;
    if (this.ctx !== ctx) {
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = (DATE.audio && DATE.audio.efecte && DATE.audio.efecte.volum) ?? 0.25;
      this.master.connect(ctx.destination);
    }
    return true;
  },

  /** `citesteStare()` întoarce { intensitate: 0..1, vizibil: bool } — cât de intens e fluxul acum. */
  porneste(citesteStare) {
    this.opreste();
    if (!this.asigura()) return;
    this.stare = citesteStare;
    this.activ = true;
    this.fluier();
    // Două ritmuri independente: locomotiva (mai repede) și pompa sondei (mai rar).
    // Cu cât producția anului e mai mare, cu atât intervalul dintre sunete e mai mic.
    this.ritm('tren', 560, 300, (i) => this.suflu(0.35 + 0.65 * i));
    this.ritm('sonda', 1500, 800, (i) => this.pompa(0.45 + 0.55 * i));
  },

  opreste() {
    this.activ = false;
    Object.values(this.timere).forEach(clearTimeout);
    this.timere = {};
  },

  ritm(nume, baza, scadere, joaca) {
    const pas = () => {
      if (!this.activ) return;
      const s = this.stare();
      if (s.vizibil) joaca(limiteaza(s.intensitate, 0, 1));
      this.timere[nume] = setTimeout(pas, baza - scadere * limiteaza(s.intensitate, 0, 1));
    };
    pas();
  },

  /** „Ciuf” de locomotivă cu abur: zgomot filtrat, cu atac scurt și declin rapid. */
  suflu(vol) {
    const c = this.ctx, t = c.currentTime;
    const sursa = c.createBufferSource();
    sursa.buffer = obtineZgomot(c);
    const filtru = c.createBiquadFilter();
    filtru.type = 'bandpass';
    filtru.frequency.value = 650 + Math.random() * 500;
    filtru.Q.value = 0.7;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    sursa.connect(filtru).connect(g).connect(this.master);
    sursa.start(t, Math.random() * 0.8);
    sursa.stop(t + 0.2);
    this.numar++;
  },

  /** Pompa unei sonde: o bubuitură joasă (sinus care coboară de la 90 la 42 Hz). */
  pompa(vol) {
    const c = this.ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.32);
    this.numar++;
  },

  /** Fluierul locomotivei, la pornirea animației (două note în acord). */
  fluier() {
    const c = this.ctx, t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.08);
    g.gain.setValueAtTime(0.35, t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    g.connect(this.master);
    [392, 494].forEach((frecventa) => {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = frecventa;
      o.connect(g);
      o.start(t);
      o.stop(t + 0.85);
    });
  }
};

/* --- Muzica de epocă (butonul „gramofon”) --- */

const Muzica = {
  audio: null, activ: false, cronometruMesaj: null,

  volum() { return (DATE.audio && DATE.audio.fundal && DATE.audio.fundal.volum) ?? 0.1; },

  /** Când vorbește ghidul, muzica se aude mai încet. */
  estompeaza(da) {
    if (this.audio) this.audio.volume = da ? this.volum() * 0.3 : this.volum();
  },

  mesaj(text, ms = 7000) {
    const p = $('#gramofonMesaj');
    p.textContent = text;
    p.hidden = false;
    clearTimeout(this.cronometruMesaj);
    if (ms) this.cronometruMesaj = setTimeout(() => { p.hidden = true; }, ms);
  },

  seteaza(activ) {
    this.activ = activ;
    const buton = $('#btnGramofon');
    buton.setAttribute('aria-pressed', String(activ));
    buton.setAttribute('aria-label', activ ? 'Oprește muzica de epocă' : 'Pornește muzica de epocă');
  },

  comuta() {
    const f = DATE.audio && DATE.audio.fundal;
    if (!f || !f.fisier) {
      this.mesaj('Nicio înregistrare adăugată încă. Pune un fișier cu licență clară (domeniu public, Creative Commons sau al vostru) în assets/audio/ și completează „audio.fundal” în date.json.', 12000);
      return;
    }
    if (this.activ) {
      this.audio.pause();
      this.seteaza(false);
      return;
    }
    if (!this.audio) {
      this.audio = new Audio(f.fisier);
      this.audio.loop = true;
      this.audio.addEventListener('error', () => {
        this.seteaza(false);
        this.mesaj(`Nu pot încărca fișierul audio „${f.fisier}”. Verifică numele și calea din date.json.`, 10000);
      });
    }
    this.audio.volume = this.volum();                 // 10% — muzica rămâne doar fundal
    this.audio.play()
      .then(() => {
        this.seteaza(true);
        const credit = [f.titlu, f.credit].filter(Boolean).join(' — ');
        if (credit) this.mesaj(`Se aude: ${credit}`);
      })
      .catch((eroare) => {
        console.warn('Redarea muzicii a eșuat', eroare);
        this.seteaza(false);
      });
  }
};

function initMuzica() {
  $('#btnGramofon').addEventListener('click', () => Muzica.comuta());
}

/* ---------- 7. SECȚIUNEA C — SVG: harta ---------- */

/*
   Harta e împărțită în module mici, ca să le poată lucra mai mulți colegi:
     deseneazaHarta()        — conturul, regiunile și orașele
     initTooltipPlutitor()   — caseta care urmărește cursorul + aprinderea regiunii
     filtrareDinamicaHarta() — filtrul pe ramuri industriale
     initPopup()             — fereastra cu detalii (click pe oraș)
*/

const HARTA = {
  svg: null, tooltip: null,
  orase: new Map(),     // id centru → { centru, g }
  regiuni: new Map(),   // nume regiune → elementul <text> din SVG
  filtru: 'toate',
  px: 0, py: 0, raf: 0
};

function initSectiuneC() {
  HARTA.svg = $('#hartaSvg');
  HARTA.tooltip = $('#tooltipHarta');
  deseneazaHarta();
  initTooltipPlutitor();
  initFiltruIndustrie();
  initPopup();
}

/* 7.1 Desenarea hărții */
function deseneazaHarta() {
  const svg = HARTA.svg;
  const L = 800;
  const H = 600;
  svg.setAttribute('viewBox', `0 0 ${L} ${H}`);

  const contur = DATE.harta.contur_1930;
  const proiectie = creeazaProiectie(cadruDin(contur), L, H, 30);

  // conturul țării
  const d = contur
    .map(([lon, lat], i) => {
      const [x, y] = proiectie(lon, lat);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';
  svg.append(svgEl('path', { d, class: 'contur' }));

  // numele regiunilor istorice — păstrăm referința, ca să le „aprindem” la hover pe un oraș
  for (const r of DATE.harta.regiuni) {
    const [x, y] = proiectie(r.lon, r.lat);
    const text = svgEl('text', { x: x.toFixed(1), y: y.toFixed(1), class: 'regiune' });
    text.textContent = r.nume;
    svg.append(text);
    HARTA.regiuni.set(r.nume, text);
  }

  // centrele industriale (interactive)
  for (const c of DATE.harta.centre) {
    const [x, y] = proiectie(c.lon, c.lat);
    const stanga = c.eticheta === 'st';
    const g = svgEl('g', {
      class: 'oras', tabindex: '0', role: 'button',
      'data-id': c.id,
      'aria-label': `${c.nume} — ${c.firma}. Deschide detaliile`
    });
    g.append(
      svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 20, class: 'oras-zona' }),
      svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 10, class: 'oras-halo' }),
      svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 5.5, class: 'oras-punct' })
    );
    const eticheta = svgEl('text', {
      x: (x + (stanga ? -13 : 13)).toFixed(1),
      y: (y + 5).toFixed(1),
      'text-anchor': stanga ? 'end' : 'start'
    });
    eticheta.textContent = c.nume;
    g.append(eticheta);

    g.addEventListener('click', () => deschidePopup(c));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); deschidePopup(c); }
    });
    svg.append(g);
    HARTA.orase.set(c.id, { centru: c, g });
  }
}

/* 7.2 Tooltip plutitor + aprinderea regiunii */

/** Aprinde (on = true) sau stinge textul regiunii istorice din care face parte centrul. */
function aprindeRegiune(numeRegiune, on) {
  const text = HARTA.regiuni.get(numeRegiune);
  if (text) text.classList.toggle('regiune-activa', on);
}

/** Pune tooltip-ul lângă cursor; dacă n-ar încăpea pe ecran, îl răsfrânge pe cealaltă parte. */
function pozitioneazaTooltip(x, y) {
  const t = HARTA.tooltip;
  const w = t.offsetWidth;
  const h = t.offsetHeight;
  const dist = 16;
  const rasfrangeX = x + dist + w > window.innerWidth - 8;
  const rasfrangeY = y + dist + h > window.innerHeight - 8;
  const stanga = rasfrangeX ? x - dist - w : x + dist;
  const sus = rasfrangeY ? y - dist - h : y + dist;
  t.style.left = `${Math.max(8, stanga)}px`;
  t.style.top = `${Math.max(8, sus)}px`;
  t.style.transformOrigin = `${rasfrangeX ? 'right' : 'left'} ${rasfrangeY ? 'bottom' : 'top'}`;
}

/** Mișcarea mouse-ului produce zeci de evenimente pe secundă; le „strângem” într-un singur cadru. */
function mutaTooltip(x, y) {
  HARTA.px = x;
  HARTA.py = y;
  if (HARTA.raf) return;
  HARTA.raf = requestAnimationFrame(() => {
    HARTA.raf = 0;
    pozitioneazaTooltip(HARTA.px, HARTA.py);
  });
}

function arataTooltip(c, x, y) {
  const t = HARTA.tooltip;
  t.replaceChildren(
    el('span', { class: 'tt-regiune', text: c.regiune }),
    el('span', { class: 'tt-nume', text: c.nume }),
    el('span', { class: 'tt-rand' }, el('b', { text: 'Concern: ' }), c.firma),
    el('span', { class: 'tt-rand' }, el('b', { text: 'Rol economic: ' }), c.rol),
    el('span', { class: 'tt-sfat', text: 'Click pentru detalii' })
  );
  pozitioneazaTooltip(x, y);        // întâi poziția, apoi apariția → fără „salt” din colțul ecranului
  t.classList.add('vizibil');
  t.setAttribute('aria-hidden', 'false');
}

function ascundeTooltip() {
  HARTA.tooltip.classList.remove('vizibil');
  HARTA.tooltip.setAttribute('aria-hidden', 'true');
}

function initTooltipPlutitor() {
  for (const { centru: c, g } of HARTA.orase.values()) {
    // Mouse sau stylus: tooltip care urmărește cursorul. Pe touch nu îl arătăm (tap = pop-up direct).
    g.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      arataTooltip(c, e.clientX, e.clientY);
      aprindeRegiune(c.regiune, true);
    });
    g.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      mutaTooltip(e.clientX, e.clientY);
    });
    g.addEventListener('pointerleave', () => {
      ascundeTooltip();
      aprindeRegiune(c.regiune, false);
    });
    // Tastatura: același efect, ancorat lângă oraș (nu există cursor)
    g.addEventListener('focus', () => {
      const r = g.getBoundingClientRect();
      arataTooltip(c, r.right, r.bottom);
      aprindeRegiune(c.regiune, true);
    });
    g.addEventListener('blur', () => {
      ascundeTooltip();
      aprindeRegiune(c.regiune, false);
    });
  }
}

/* 7.3 Filtrul pe ramuri industriale */

/**
 * Evidențiază orașele care aparțin ramurii alese și estompează restul.
 * valoareFiltru = id-ul unei ramuri din date.json → harta.ramuri (ex. "petrol", "siderurgie")
 *                 sau "toate" pentru a reveni la harta completă.
 */
function filtrareDinamicaHarta(valoareFiltru) {
  const toate = !valoareFiltru || valoareFiltru === 'toate';
  HARTA.filtru = toate ? 'toate' : valoareFiltru;

  const evidentiate = [];
  for (const { centru: c, g } of HARTA.orase.values()) {
    const potrivit = toate || (c.ramuri || []).includes(valoareFiltru);
    g.classList.toggle('atenuat', !toate && !potrivit);      // CSS: .oras.atenuat { opacity: 0.15 }
    g.classList.toggle('accentuat', !toate && potrivit);     // CSS: halo auriu care pulsează
    if (!toate && potrivit) evidentiate.push(c.nume);
  }

  // mesaj pentru ecran și pentru cititoarele de ecran
  const status = $('#statusFiltru');
  if (toate) {
    status.textContent = `Se văd toate cele ${HARTA.orase.size} centre industriale.`;
  } else {
    const ramura = DATE.harta.ramuri.find((r) => r.id === valoareFiltru);
    const nume = ramura ? ramura.nume : valoareFiltru;
    status.textContent = evidentiate.length
      ? `Ramura „${nume}”: ${evidentiate.length} ${evidentiate.length === 1 ? 'centru evidențiat' : 'centre evidențiate'} — ${evidentiate.join(', ')}.`
      : `Ramura „${nume}”: niciun centru din această hartă.`;
  }

  // ține dropdown-ul în acord cu filtrul, dacă funcția e apelată din alt loc din cod
  const sel = $('#filtruIndustrie');
  if (sel && sel.value !== HARTA.filtru && [...sel.options].some((o) => o.value === HARTA.filtru)) {
    sel.value = HARTA.filtru;
  }
}

function initFiltruIndustrie() {
  const sel = $('#filtruIndustrie');
  // opțiunile vin din date.json, deci un coleg poate adăuga o ramură fără să atingă codul
  for (const r of DATE.harta.ramuri) {
    sel.append(el('option', { value: r.id, text: r.nume }));
  }
  sel.addEventListener('change', () => filtrareDinamicaHarta(sel.value));
  filtrareDinamicaHarta('toate');
}

/* 7.4 Pop-up cu detalii */

function initPopup() {
  const popup = $('#popup');
  const inchide = () => {
    Ghid.opreste();
    if (typeof popup.close === 'function') popup.close();
    else popup.removeAttribute('open');
  };
  $('#popupInchide').addEventListener('click', inchide);
  // click pe fundalul întunecat (în afara ferestrei) închide pop-up-ul
  popup.addEventListener('click', (e) => {
    const r = popup.getBoundingClientRect();
    const inAfara = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (e.target === popup && inAfara) inchide();
  });
  popup.addEventListener('close', () => Ghid.opreste()); // și la Esc
}

function deschidePopup(c) {
  const popup = $('#popup');
  ascundeTooltip();
  aprindeRegiune(c.regiune, false);
  Ghid.opreste();
  $('#popupCorp').replaceChildren(...construiestePopup(c));
  if (typeof popup.showModal === 'function') popup.showModal();
  else popup.setAttribute('open', '');
}

function construiestePopup(c) {
  const parti = [
    el('p', { class: 'eticheta-sectiune', text: `${c.regiune} · ${c.rol}` }),
    el('h3', { id: 'popupTitlu', text: `${c.nume} — ${c.firma}` })
  ];

  // ghid audio: fișier înregistrat (c.audio.fisier) sau, în lipsă, vocea sintetică a browserului
  const areFisier = Boolean(c.audio && c.audio.fisier);
  const areVoce = 'speechSynthesis' in window;
  if (areFisier || areVoce) {
    const buton = el('button', {
      type: 'button', class: 'btn btn-audio', 'aria-pressed': 'false',
      'data-eticheta': '📻 Ascultă istoria'
    }, '📻 Ascultă istoria');
    buton.addEventListener('click', () => Ghid.comuta(c, buton));
    parti.push(el('div', { class: 'ghid-audio' }, buton, el('p', {
      class: 'ghid-nota',
      text: areFisier
        ? 'Înregistrare redată cu filtru de radio din anii ’30.'
        : 'Voce sintetică a browserului (fără filtru de radio). Pentru efectul de radio, adăugați o înregistrare în date.json → centre → audio.'
    })));
  }

  // imaginea de epocă (câmpul "imagine" din date.json); până atunci, un spațiu rezervat
  if (c.imagine) {
    parti.push(el('figure', {},
      el('img', { src: c.imagine.fisier, alt: c.imagine.alt, loading: 'lazy' }),
      el('figcaption', { text: c.imagine.credit })));
  } else {
    parti.push(el('div', {
      class: 'loc-imagine',
      text: 'Imagine de epocă de adăugat (Creatorul Multimedia): salvează fișierul în assets/img/ și completează câmpul „imagine” din date.json.'
    }));
  }

  if (c.fapte.length) {
    parti.push(el('ul', {}, c.fapte.map((f) => el('li', {}, f.text, insigna(f.incredere)))));
  }

  if (c.statistici.length) {
    const tabel = el('table', {},
      el('thead', {}, el('tr', {}, el('th', { text: 'Indicator' }), el('th', { text: 'Valoare' }), el('th', { text: 'An' }))),
      el('tbody', {}, c.statistici.map((s) =>
        el('tr', {},
          el('td', { text: s.eticheta }),
          el('td', {}, s.valoare_text ?? `${format(s.valoare, 2)} ${s.unitate}`, insigna(s.incredere)),
          el('td', { text: s.an })))));
    parti.push(tabel);
  } else {
    parti.push(el('p', { class: 'nota', text: 'Statistici în curs de colectare: Statisticianul le adaugă în date.json (câmpul „statistici”).' }));
  }
  return parti;
}

/* ---------- 8. GHID AUDIO („Ascultă istoria”) ---------- */

/** Textul citit de ghid: transcrierea din date.json sau, în lipsă, o compunem din fișa orașului. */
function textGhid(c) {
  if (c.audio && c.audio.transcriere) return c.audio.transcriere;
  const stat = c.statistici.map((s) =>
    `${s.eticheta}: ${s.valoare_text ?? `${format(s.valoare, 2)} ${s.unitate}`}, în ${s.an}.`);
  return [`${c.nume}. ${c.firma}.`, `${c.rol}.`, ...c.fapte.map((f) => f.text), ...stat].join(' ');
}

const Ghid = {
  audio: null, noduri: [], zgomotSursa: null, buton: null,

  comuta(c, buton) {
    if (this.buton === buton) { this.opreste(); return; }   // al doilea click = oprire
    this.opreste();
    this.buton = buton;
    buton.setAttribute('aria-pressed', 'true');
    buton.textContent = '⏹ Oprește ghidul';

    if (c.audio && c.audio.fisier) this.reda(c.audio.fisier, buton);
    else if ('speechSynthesis' in window) this.vorbeste(textGhid(c));
    else this.opreste();
  },

  /** Înregistrare + „filtru de radio”: trece-sus 320 Hz → trece-jos 3200 Hz → saturație ușoară + șuier. */
  reda(fisier, buton) {
    const setari = (DATE.audio && DATE.audio.ghid) || {};
    const a = new Audio(fisier);
    this.audio = a;
    a.addEventListener('ended', () => this.opreste());
    a.addEventListener('error', () => {
      const nota = buton.parentElement.querySelector('.ghid-nota');
      if (nota) nota.textContent = `Nu pot încărca fișierul „${fisier}”. Verifică calea din date.json.`;
      this.opreste();
    });

    // MediaElementSource funcționează doar pentru fișiere de pe același site și nu din file://
    const ctx = setari.filtru_radio && location.protocol !== 'file:' && aceeasiOrigine(fisier)
      ? obtineContextAudio() : null;
    if (ctx) this.lantRadio(ctx, a, setari.volum ?? 0.9);
    else a.volume = setari.volum ?? 0.9;

    Muzica.estompeaza(true);
    a.play().catch((eroare) => { console.warn('Ghid audio:', eroare); this.opreste(); });
  },

  lantRadio(ctx, element, volum) {
    const sursa = ctx.createMediaElementSource(element);
    const trecesus = ctx.createBiquadFilter();
    trecesus.type = 'highpass';
    trecesus.frequency.value = 320;
    const trecejos = ctx.createBiquadFilter();
    trecejos.type = 'lowpass';
    trecejos.frequency.value = 3200;

    // curbă tanh: sunet ușor „încălzit”, ca la lămpile aparatelor vechi
    const saturatie = ctx.createWaveShaper();
    const puncte = 1024;
    const curba = new Float32Array(puncte);
    for (let i = 0; i < puncte; i++) {
      const x = (i / (puncte - 1)) * 2 - 1;
      curba[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
    }
    saturatie.curve = curba;

    const g = ctx.createGain();
    g.gain.value = volum;
    sursa.connect(trecesus).connect(trecejos).connect(saturatie).connect(g).connect(ctx.destination);

    // șuierul de fond al radioului (zgomot alb filtrat, foarte încet)
    const zgomot = ctx.createBufferSource();
    zgomot.buffer = obtineZgomot(ctx);
    zgomot.loop = true;
    const filtruZgomot = ctx.createBiquadFilter();
    filtruZgomot.type = 'bandpass';
    filtruZgomot.frequency.value = 2200;
    const gZgomot = ctx.createGain();
    gZgomot.gain.value = 0.012;
    zgomot.connect(filtruZgomot).connect(gZgomot).connect(ctx.destination);
    zgomot.start();

    this.zgomotSursa = zgomot;
    this.noduri = [sursa, trecesus, trecejos, saturatie, g, filtruZgomot, gZgomot];
  },

  vorbeste(text) {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ro-RO';
    const voce = s.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('ro'));
    if (voce) u.voice = voce;
    u.rate = 0.95;
    u.onend = u.onerror = () => this.opreste();
    Muzica.estompeaza(true);
    s.speak(u);
  },

  opreste() {
    if (this.audio) { this.audio.pause(); this.audio = null; }
    if (this.zgomotSursa) { try { this.zgomotSursa.stop(); } catch (e) { /* deja oprit */ } this.zgomotSursa = null; }
    this.noduri.forEach((n) => { try { n.disconnect(); } catch (e) { /* deja deconectat */ } });
    this.noduri = [];
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    Muzica.estompeaza(false);
    if (this.buton) {
      this.buton.setAttribute('aria-pressed', 'false');
      this.buton.textContent = this.buton.dataset.eticheta || '📻 Ascultă istoria';
      this.buton = null;
    }
  }
};

/* ---------- 9. SECȚIUNEA D — SIMULATORUL „FII MINISTRUL INDUSTRIEI ÎN 1936!” ---------- */

const SIM = { campuri: {}, carduri: {}, productie: 0 };

/**
 * Modelul jocului — o funcție pură: primește deciziile și coeficienții din date.json,
 * întoarce rezultatele. Fiind pură, o putem testa ușor: modelSim({ investitii: 50, taxa: 10, cfr: 50 }, p, 8.78).
 */
function modelSim(intrari, p, productie) {
  const invN = intrari.investitii / 100;
  const cfrN = intrari.cfr / 100;
  const invRef = p.investitii_referinta / 100;
  const cfrRef = p.cfr_referinta / 100;

  // Taxa mare scumpește țițeiul românesc → cumpărătorii se îndreaptă spre alți furnizori
  const factorExport = Math.max(0, 1 - p.sensibilitate_export * (intrari.taxa - p.taxa_referinta));
  // Dacă CFR nu poate duce țițeiul la port, exportul e limitat de capacitatea de transport
  const capacitate = Math.min(1, 1 - p.sensibilitate_capacitate * (cfrRef - cfrN));
  const idxExport = factorExport * Math.max(0, capacitate);
  const idxRafinare = 1 + p.castig_rafinare * (invN - invRef);
  const idxTransport = 1 + p.castig_transport * (cfrN - cfrRef);

  const venitProductie = 100 * (
    p.pondere_rafinare * idxRafinare + p.pondere_transport * idxTransport + p.pondere_export * idxExport);

  // Bugetul: o bază fixă + încasările din taxa de export; cheltuielile sunt investițiile + CFR
  const venitTaxa = intrari.taxa * p.cota_export * factorExport * p.venit_taxa_per_punct;
  const venitTaxaRef = p.taxa_referinta * p.cota_export * p.venit_taxa_per_punct;
  const cheltuieli = (intrari.investitii + intrari.cfr) / 2;
  const sold = p.buget_baza + venitTaxa - cheltuieli;
  const deficit = Math.max(0, -sold);

  return {
    venit: venitProductie + p.pondere_fiscal * (venitTaxa - venitTaxaRef) - p.penalizare_deficit * deficit,
    modernizare: 100 * (p.pondere_mod_inv * invN + (1 - p.pondere_mod_inv) * cfrN),
    exportMt: productie * p.cota_export * idxExport,
    sold, deficit, idxExport, idxRafinare, idxTransport, venitTaxa, cfrN, invN
  };
}

/** Alege mesajul final (prima condiție îndeplinită, în ordinea gravității). */
function mesajSim(r, praguri) {
  if (r.deficit > praguri.deficit_mare) {
    return ['Deficit bugetar!', `Ai cheltuit cu ${format(r.deficit, 1)} puncte mai mult decât ai încasat. În joc, deficitul scade venitul național: statul ar trebui să se împrumute sau să mărească alte taxe.`];
  }
  if (r.cfrN < praguri.gatuire) {
    return ['Gâtuire în transport!', 'Sondele produc, dar vagoanele-cisternă și conductele nu fac față: țițeiul se adună la rafinării și ajunge greu în portul Constanța.'];
  }
  if (r.idxExport < praguri.export_prost) {
    return ['Exporturi în scădere!', 'Taxa pe export a scumpit țițeiul românesc și cumpărătorii străini caută alți furnizori; statul încasează mai puțin decât ai fi crezut.'];
  }
  if (r.venit >= praguri.venit_bun && r.modernizare >= praguri.modernizare_buna) {
    return ['Echilibru reușit!', 'Rafinării moderne, transport care ține pasul și o taxă care nu sperie cumpărătorii: venitul crește fără să se rupă bugetul.'];
  }
  if (r.modernizare >= praguri.modernizare_buna) {
    return ['Modernizare scumpă.', 'Industria și transporturile s-au modernizat, dar costurile încă nu se văd în venitul național. Merită răbdare… sau o taxă mai bine calibrată.'];
  }
  return ['Politică prudentă.', 'Rezultatele sunt apropiate de situația de referință. Încearcă să crești investițiile și bugetul CFR, dar ține un ochi pe buget.'];
}

function initSimulator() {
  const S = DATE.simulator;
  const p0 = punct(DATE.serii.petrol_extractie, S.an_referinta);
  SIM.productie = p0 ? p0.valoare : 0;

  $('#simAvertisment').textContent =
    `${S.avertisment} (În ${S.an_referinta}, extracția a fost de ${format(SIM.productie)} milioane tone.)`;

  // controalele (glisoarele) vin din date.json
  const zona = $('#simControale');
  for (const c of S.controale) {
    const id = `sim-${c.id}`;
    const iesire = el('output', { class: 'sim-valoare', for: id });
    const glisor = el('input', { type: 'range', id, min: c.min, max: c.max, step: c.pas, value: c.implicit });
    zona.append(el('div', { class: 'sim-comanda' },
      el('label', { for: id, text: c.eticheta }), iesire, glisor,
      el('p', { class: 'sim-descriere', text: c.descriere })));
    SIM.campuri[c.id] = { glisor, iesire, unitate: c.unitate, implicit: c.implicit };
    glisor.addEventListener('input', actualizeazaSim);
  }

  // cele 4 „carduri” cu rezultate
  const definitii = [
    ['venit', 'Venit național (indice)', '100 = referință'],
    ['modernizare', 'Rata de modernizare', '%'],
    ['export', 'Țiței exportat', 'milioane tone'],
    ['sold', 'Sold bugetar', 'puncte de buget']
  ];
  const rezultate = $('#simRezultate');
  for (const [id, eticheta, unitate] of definitii) {
    const numar = el('span', { class: 'sim-numar', text: '—' });
    const bara = el('i');
    const card = el('div', { class: 'sim-card' },
      el('span', { class: 'sim-eticheta', text: eticheta }),
      numar, el('span', { class: 'sim-unitate', text: unitate }),
      el('div', { class: 'bara' }, bara));
    rezultate.append(card);
    SIM.carduri[id] = { card, numar, bara };
  }

  // „realitatea istorică” de comparat cu rezultatul jocului
  $('#simRealitate').replaceChildren(...S.realitate.map((r) =>
    el('li', {}, r.text + ' ', linkuriSurse([r.sursa], 'sim-sursa-inline'))));

  $('#simReset').addEventListener('click', () => {
    Object.values(SIM.campuri).forEach((c) => { c.glisor.value = c.implicit; });
    actualizeazaSim();
  });
  actualizeazaSim();
}

function actualizeazaSim() {
  const S = DATE.simulator;
  const intrari = {};
  for (const [id, c] of Object.entries(SIM.campuri)) {
    intrari[id] = Number(c.glisor.value);
    c.iesire.textContent = `${format(intrari[id], 0)}${c.unitate}`;
  }
  const r = modelSim(intrari, S.parametri, SIM.productie);

  const arataCard = (id, text, procentBara, stare) => {
    const k = SIM.carduri[id];
    k.numar.textContent = text;
    k.bara.style.width = `${limiteaza(procentBara, 0, 100)}%`;
    k.card.classList.toggle('bun', stare === 'bun');
    k.card.classList.toggle('rau', stare === 'rau');
  };
  arataCard('venit', format(r.venit, 1), ((r.venit - 60) / 80) * 100, r.venit >= 100 ? 'bun' : r.venit < 90 ? 'rau' : '');
  arataCard('modernizare', format(r.modernizare, 0), r.modernizare, r.modernizare >= S.praguri.modernizare_buna ? 'bun' : '');
  arataCard('export', format(r.exportMt, 2), (r.exportMt / SIM.productie) * 100, r.idxExport < S.praguri.export_prost ? 'rau' : '');
  arataCard('sold', cuSemn(r.sold, 1), 50 + r.sold, r.sold < 0 ? 'rau' : '');

  const [titlu, text] = mesajSim(r, S.praguri);
  $('#simMesaj').replaceChildren(el('strong', { text: `${titlu} ` }), text);
}

/* ---------- 10. EXPORT (CSV) ȘI TIPĂRIRE (PDF) ---------- */

/** O celulă CSV: numere cu virgulă zecimală (Excel-RO), text în ghilimele dacă e nevoie. */
function celulaCsv(v) {
  if (v == null || v === '') return '';
  let s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  // protecție: textul care începe cu = + - @ ar putea fi luat de Excel drept formulă
  if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function numeSurse(ids) {
  return ids.map((id) => (sursaDupaId(id) || {}).scurt || id).join(' + ');
}

/** Toate cifrele din date.json, într-un singur tabel „lung”: un rând = o valoare. */
function construiesteCsv() {
  const SEP = ';';
  const randuri = [['Categorie', 'Indicator', 'Unitate', 'An', 'Valoare', 'Grad de încredere', 'Sursa (sursele)', 'Notă']];
  const domenii = { industrie: 'Industrie', transport: 'Transporturi' };

  for (const serie of Object.values(DATE.serii)) {
    const cat = domenii[serie.domeniu] || serie.domeniu;
    const surse = numeSurse(serie.surse || []);
    if (!serie.date.length) {
      randuri.push([cat, serie.titlu, serie.unitate, '', '', '', surse, `Serie în curs de colectare. ${serie.nota || ''}`.trim()]);
      continue;
    }
    for (const p of serie.date) {
      randuri.push([cat, serie.titlu, serie.unitate, p.an, p.valoare, p.incredere, surse, p.nota || '']);
    }
  }
  for (const centru of DATE.harta.centre) {
    for (const s of centru.statistici) {
      randuri.push(['Centru industrial', `${centru.nume} — ${s.eticheta}`, s.unitate || '', s.an,
        s.valoare ?? s.valoare_text, s.incredere, numeSurse(s.sursa ? [s.sursa] : []), `${centru.firma}`]);
    }
  }
  for (const r of DATE.repere) {
    randuri.push(['Reper istoric', r.text, '', r.an, '', '', numeSurse([r.sursa]), '']);
  }
  return randuri.map((rand) => rand.map(celulaCsv).join(SEP)).join('\r\n');
}

function descarcaCsv() {
  const csv = construiesteCsv();
  // „﻿” (BOM) face ca Excel să citească corect diacriticele UTF-8
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const legatura = el('a', { href: url, download: 'anuar_statistic_interbelic.csv' });
  document.body.append(legatura);
  legatura.click();
  legatura.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('#notaExport').textContent = `Fișier generat: anuar_statistic_interbelic.csv (${csv.split('\r\n').length - 1} rânduri de date). Deschide-l în Excel sau Google Sheets.`;
}

/** Înainte de tipărire, graficele canvas devin imagini (canvas-urile se tipăresc nesigur). */
function pregatestePrint() {
  $('#dataPrint').textContent = new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
  try {
    if (A.grafic) {
      A.grafic.update('none');
      $('#imgGraficPrint').src = A.grafic.toBase64Image();
    }
    if (B.cv) {
      deseneazaB(0);
      $('#imgFluxPrint').src = B.cv.toDataURL('image/png');
    }
  } catch (eroare) {
    console.warn('Pregătirea pentru tipărire a întâmpinat o problemă', eroare);
  }
}

function initExport() {
  $('#btnCsv').addEventListener('click', descarcaCsv);
  $('#btnPrint').addEventListener('click', () => { pregatestePrint(); window.print(); });
  window.addEventListener('beforeprint', pregatestePrint); // și pentru Ctrl+P
}

/* ---------- 11. BIBLIOGRAFIE ---------- */

function initBibliografie() {
  const lista = $('#listaBiblio');
  DATE.bibliografie.forEach((b) => {
    const titlu = b.url
      ? el('a', { href: b.url, target: '_blank', rel: 'noopener noreferrer', text: b.titlu })
      : el('span', { text: b.titlu });
    lista.append(el('li', { id: `sursa-${b.id}` },
      b.autor ? `${b.autor} — ` : null,
      titlu,
      ` (${b.an}). `,
      el('span', { class: 'tip-sursa', text: b.tip }),
      b.nota ? ` ${b.nota}` : null));
  });
}
