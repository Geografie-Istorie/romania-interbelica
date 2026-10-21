(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var cssVar = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };

  /* Indexul evenimentului în care intră fiecare regiune în componență */
  var joinIdx = {};
  EVENTS.forEach(function (e, i) {
    e.adds.forEach(function (id) { if (!(id in joinIdx)) joinIdx[id] = i; });
  });
  var props = {};
  REGIONS.features.forEach(function (f) { props[f.properties.id] = f.properties; });
  var TOTAL = REGIONS.features.length;

  var cur = 4; /* pornește de la 1 dec. 1918: România Mare */
  var selected = null;
  var playing = false;
  var timer = null;
  var animatedFor = -1;

  try {
    var h = location.hash.replace("#", "");
    EVENTS.forEach(function (e, i) { if (e.id === h) cur = i; });
  } catch (err) { /* hash indisponibil */ }

  /* ---------- Harta ---------- */
  var map = L.map("map", {
    zoomControl: true,
    attributionControl: false,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    minZoom: 5,
    maxZoom: 9,
    maxBounds: [[41.2, 16.5], [51.0, 34.5]],
    maxBoundsViscosity: 0.8
  });
  var FIT = [[43.3, 20.2], [48.6, 30.6]];
  map.fitBounds(FIT, { padding: [14, 14] });

  var regionLayers = {};
  L.geoJSON(REGIONS, {
    style: function () { return { weight: 1.5 }; },
    onEachFeature: function (f, layer) {
      regionLayers[f.properties.id] = layer;
      layer.on("click", function (ev) {
        L.DomEvent.stopPropagation(ev);
        select(f.properties.id);
      });
    }
  }).addTo(map);

  NEIGHBOURS.forEach(function (n) {
    L.marker([n.lat, n.lon], {
      icon: L.divIcon({ className: "nb-label", html: n.name, iconSize: [140, 16], iconAnchor: [70, 8] }),
      interactive: false,
      keyboard: false
    }).addTo(map);
  });

  var cityLayer = L.layerGroup().addTo(map);
  map.on("click", function () { select(null); });

  /* ---------- Desen ---------- */
  function styleRegions() {
    var stroke = cssVar("--stroke");
    var ghost = cssVar("--ghost");
    var ink = cssVar("--ink");
    var retrigger = animatedFor !== cur;
    REGIONS.features.forEach(function (f) {
      var p = f.properties;
      var layer = regionLayers[p.id];
      var inside = joinIdx[p.id] <= cur;
      var isSel = selected === p.id;
      if (inside) {
        layer.setStyle({
          fillColor: cssVar(GROUPS[p.group].varName), fillOpacity: 0.85,
          color: isSel ? ink : stroke, weight: isSel ? 3 : 1.6, dashArray: null
        });
      } else {
        layer.setStyle({
          fillColor: ghost, fillOpacity: 0.07, color: ghost, weight: isSel ? 2.5 : 1, dashArray: "3 4"
        });
      }
      var el = layer.getElement && layer.getElement();
      if (el && retrigger) {
        el.classList.remove("fresh");
        void el.getBoundingClientRect();
        if (inside && EVENTS[cur].adds.indexOf(p.id) !== -1) el.classList.add("fresh");
      }
      if (isSel) layer.bringToFront();
    });
    animatedFor = cur;
  }

  function drawCities() {
    cityLayer.clearLayers();
    var seats = $("adminToggle").checked ? ADMIN[EVENTS[cur].admin].seats : {};
    var ink = cssVar("--ink");
    var accent = cssVar("--accent");
    var stroke = cssVar("--stroke");
    CITIES.forEach(function (c) {
      if (!(joinIdx[c.region] <= cur)) return;
      var seat = seats[c.id];
      var dir = c.lon > 29.5 ? "left" : "right";
      var m = L.circleMarker([c.lat, c.lon], {
        radius: c.major ? 4.5 : 3, color: stroke, weight: 1.5, fillColor: ink, fillOpacity: 1
      });
      m.bindTooltip(seat ? c.name + "<small>" + seat + "</small>" : c.name, {
        permanent: !!(c.major || seat), direction: dir, className: "city-tip",
        offset: [dir === "left" ? -5 : 5, 0]
      });
      m.addTo(cityLayer);
      if (seat) {
        L.circleMarker([c.lat, c.lon], { radius: 9.5, color: accent, weight: 2, fill: false, interactive: false }).addTo(cityLayer);
      }
    });
  }

  /* ---------- Panou ---------- */
  function renderEvent() {
    var e = EVENTS[cur];
    var chips = "";
    if (e.adds.length) {
      chips = '<div class="chips">' + e.adds.map(function (id) {
        var p = props[id];
        return '<span class="chip"><i style="background:var(' + GROUPS[p.group].varName + ')"></i>' + p.name + "</span>";
      }).join("") + "</div>";
    }
    $("eventCard").innerHTML = '<p class="eyebrow">' + e.date + "</p><h2>" + e.title + "</h2><p>" + e.text + "</p>" + chips;
    var a = ADMIN[e.admin];
    $("adminCard").innerHTML = '<p class="eyebrow">Organizare administrativă</p><h2>' + a.title + "</h2><p>" + a.text + "</p>";
  }

  function inCount() {
    var n = 0;
    for (var id in joinIdx) { if (joinIdx[id] <= cur) n++; }
    return n;
  }

  function renderList() {
    var ul = $("regionList");
    ul.innerHTML = "";
    REGIONS.features.forEach(function (f) {
      var p = f.properties;
      var j = joinIdx[p.id];
      var inside = j <= cur;
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-pressed", selected === p.id ? "true" : "false");
      b.innerHTML = '<span class="sw" style="background:var(' + GROUPS[p.group].varName + ');' + (inside ? "" : "opacity:.35") + '"></span>' +
        "<span>" + p.name + "</span>" +
        '<span class="state' + (inside ? " in" : "") + '">' + (inside ? "din " : "la ") + EVENTS[j].short + "</span>";
      b.addEventListener("click", function () { select(selected === p.id ? null : p.id); });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  function renderDetail() {
    var box = $("regionDetail");
    if (!selected) { box.textContent = "Alege o regiune din listă sau de pe hartă."; return; }
    var p = props[selected];
    var j = joinIdx[selected];
    var status;
    if (j > cur) status = "Intră în componența României la " + EVENTS[j].date + ".";
    else if (j === 0) status = "Face parte din Vechiul Regat.";
    else status = "În componența României din " + EVENTS[j].date + ".";
    box.innerHTML = '<p><strong>' + p.name + "</strong></p><p>" + status + "</p><p class=\"muted\">" + p.note + "</p>";
  }

  function renderBadge() {
    $("badgeWhen").textContent = EVENTS[cur].date;
    $("badgeCount").textContent = inCount() + " / " + TOTAL + " regiuni";
  }

  function renderTicks() {
    var t = $("ticks");
    t.innerHTML = "";
    EVENTS.forEach(function (e, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tick";
      b.textContent = e.short;
      b.title = e.title;
      b.addEventListener("click", function () { go(i); });
      t.appendChild(b);
    });
  }

  function updateTicks() {
    var t = $("ticks");
    var kids = t.children;
    for (var i = 0; i < kids.length; i++) {
      if (i === cur) kids[i].setAttribute("aria-current", "true"); else kids[i].removeAttribute("aria-current");
    }
    var el = kids[cur];
    if (el) t.scrollLeft = el.offsetLeft - t.clientWidth / 2 + el.clientWidth / 2;
  }

  function renderLegend() {
    var html = "";
    Object.keys(GROUPS).forEach(function (k) {
      html += '<span><i class="sw" style="background:var(' + GROUPS[k].varName + ')"></i>' + GROUPS[k].label + "</span>";
    });
    html += '<span><i class="sw ghost"></i>încă nu în componență</span>';
    html += '<span><i class="sw ring"></i>sediu administrativ</span>';
    $("legend").innerHTML = html;
  }

  function refresh() {
    styleRegions();
    drawCities();
    renderEvent();
    renderList();
    renderDetail();
    renderBadge();
    updateTicks();
    var e = EVENTS[cur];
    var s = $("slider");
    s.value = cur;
    s.setAttribute("aria-valuetext", e.date + ": " + e.title);
    $("prev").disabled = cur === 0;
    $("next").disabled = cur === EVENTS.length - 1;
  }

  /* ---------- Acțiuni ---------- */
  function go(i) {
    cur = Math.max(0, Math.min(EVENTS.length - 1, i));
    refresh();
    try { history.replaceState(null, "", "#" + EVENTS[cur].id); } catch (err) { /* ignorat */ }
  }

  function select(id) {
    selected = id;
    styleRegions();
    renderList();
    renderDetail();
    if (id && regionLayers[id]) {
      map.flyToBounds(regionLayers[id].getBounds(), { padding: [60, 60], maxZoom: 7.5, duration: 0.6 });
    } else if (!id) {
      /* revine la vederea de ansamblu doar dacă harta a fost apropiată */
      if (map.getZoom() > 7.75) map.flyToBounds(FIT, { padding: [14, 14], duration: 0.6 });
    }
  }

  function stop() {
    playing = false;
    clearInterval(timer);
    timer = null;
    $("play").setAttribute("aria-pressed", "false");
    $("play").textContent = "Redă";
  }

  function togglePlay() {
    if (playing) { stop(); return; }
    if (cur >= EVENTS.length - 1) go(0);
    playing = true;
    $("play").setAttribute("aria-pressed", "true");
    $("play").textContent = "Pauză";
    timer = setInterval(function () {
      if (cur >= EVENTS.length - 1) { stop(); return; }
      go(cur + 1);
    }, 5200);
  }

  $("slider").addEventListener("input", function (ev) { stop(); go(parseInt(ev.target.value, 10)); });
  $("prev").addEventListener("click", function () { stop(); go(cur - 1); });
  $("next").addEventListener("click", function () { stop(); go(cur + 1); });
  $("play").addEventListener("click", togglePlay);
  $("adminToggle").addEventListener("change", drawCities);

  /* ---------- Tema și dimensiuni ---------- */
  var recolor = function () { styleRegions(); drawCities(); };
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", recolor);
  } catch (err) { /* ignorat */ }
  new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  if (window.ResizeObserver) {
    new ResizeObserver(function () { map.invalidateSize(); }).observe($("map"));
  }
  window.addEventListener("load", function () { map.invalidateSize(); map.fitBounds(FIT, { padding: [14, 14] }); });

  /* ---------- Pornire ---------- */
  $("slider").max = EVENTS.length - 1;
  renderTicks();
  renderLegend();
  refresh();
})();