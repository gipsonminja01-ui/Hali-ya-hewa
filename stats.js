// Rekodi na takwimu za joto: wiki, siku na tarehe
(function () {
  const DAYS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];
  const DAYS_SHORT = ['Jpil', 'Jtatu', 'Jnne', 'Jtano', 'Alh', 'Ijm', 'Jmos'];
  const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
  let state = null, weekIndex = 0, selected = null;

  const $ = id => document.getElementById(id);
  const asDate = key => new Date(key + 'T12:00:00');
  const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmtDate = key => { const d = asDate(key); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const fmtShort = key => { const d = asDate(key); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const dayName = key => DAYS[asDate(key).getDay()];
  const t1 = v => v == null || isNaN(v) ? '–' : v.toFixed(1) + '°C';
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
  const meanOf = x => x.mean ?? (x.max + x.min) / 2;
  const kind = key => key < state.today ? 'Rekodi' : key === state.today ? 'Leo' : 'Utabiri';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function mondayOf(key) {
    const d = asDate(key), off = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - off);
    return keyOf(d);
  }

  function buildWeeks(daily) {
    const map = new Map();
    for (const x of daily) {
      if (x.max == null || x.min == null) continue;
      const w = mondayOf(x.date);
      if (!map.has(w)) map.set(w, []);
      map.get(w).push(x);
    }
    return [...map.entries()].map(([start, days]) => ({ start, days }));
  }

  function weekLabel(w) {
    const thisWeek = mondayOf(state.today);
    if (w.start === thisWeek) return 'Wiki hii';
    const diff = Math.round((asDate(w.start) - asDate(thisWeek)) / (7 * 864e5));
    if (diff === -1) return 'Wiki iliyopita';
    if (diff === 1) return 'Wiki ijayo';
    return diff < 0 ? `Wiki ${-diff} zilizopita` : `Baada ya wiki ${diff}`;
  }

  function render() {
    const w = state.weeks[weekIndex];
    if (!w) { $('tempStats').innerHTML = '<p>Hakuna data ya joto.</p>'; return; }
    const end = new Date(asDate(w.start)); end.setDate(end.getDate() + 6);
    $('weekTitle').textContent = `${weekLabel(w)} · ${fmtShort(w.start)} – ${fmtDate(keyOf(end))}`;
    $('prevWeek').disabled = weekIndex === 0;
    $('nextWeek').disabled = weekIndex === state.weeks.length - 1;

    const days = w.days;
    const hot = days.reduce((a, b) => b.max > a.max ? b : a);
    const cold = days.reduce((a, b) => b.min < a.min ? b : a);
    const wAvg = avg(days.map(meanOf));
    const prev = state.weeks[weekIndex - 1];
    let change = '<span>Hakuna wiki ya kulinganisha</span>';
    if (prev) {
      const diff = wAvg - avg(prev.days.map(meanOf));
      const arrow = diff > 0.05 ? '▲' : diff < -0.05 ? '▼' : '●';
      change = `<strong>${arrow} ${diff > 0 ? '+' : ''}${diff.toFixed(1)}°C</strong><span>Ukilinganisha na wiki iliyotangulia</span>`;
    }
    const recorded = days.filter(x => x.date < state.today).length;
    $('tempTiles').innerHTML = `
      <div class="summary-card"><span>Wastani wa joto la wiki</span><strong>${t1(wAvg)}</strong><span>${recorded} rekodi · ${days.length - recorded} utabiri/leo</span></div>
      <div class="summary-card"><span>🔥 Joto la juu zaidi</span><strong>${t1(hot.max)}</strong><span>${dayName(hot.date)}, ${fmtDate(hot.date)}</span></div>
      <div class="summary-card"><span>❄️ Joto la chini zaidi</span><strong>${t1(cold.min)}</strong><span>${dayName(cold.date)}, ${fmtDate(cold.date)}</span></div>
      <div class="summary-card"><span>Mabadiliko ya wastani</span>${change}</div>`;

    renderWeekChart(days);
    $('tempTable').innerHTML = `<table><thead><tr><th>Siku</th><th>Tarehe</th><th>Hali</th><th>Juu</th><th>Chini</th><th>Wastani</th><th>Aina</th></tr></thead><tbody>${days.map(x => `
      <tr class="${x.date === selected ? 'sel' : ''}" data-date="${x.date}" tabindex="0">
        <td><b>${dayName(x.date)}</b></td><td>${fmtDate(x.date)}</td>
        <td>${state.ico(x.code)} ${state.label(x.code)}</td>
        <td class="hot">${t1(x.max)}</td><td class="cold">${t1(x.min)}</td><td>${t1(meanOf(x))}</td>
        <td><span class="tag tag-${kind(x.date) === 'Rekodi' ? 'rec' : kind(x.date) === 'Leo' ? 'today' : 'fc'}">${kind(x.date)}</span></td>
      </tr>`).join('')}</tbody></table>`;
    $('tempTable').querySelectorAll('tr[data-date]').forEach(tr => {
      const pick = () => { selected = tr.dataset.date; render(); };
      tr.addEventListener('click', pick);
      tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    renderDay();
  }

  function renderWeekChart(days) {
    const W = 700, H = 260, top = 34, bottom = 46, left = 38, right = 10;
    const all = days.flatMap(x => [x.max, x.min]);
    let lo = Math.floor(Math.min(...all) / 5) * 5, hi = Math.ceil(Math.max(...all) / 5) * 5;
    if (hi - lo < 10) hi = lo + 10;
    const y = v => top + (hi - v) / (hi - lo) * (H - top - bottom);
    const slot = (W - left - right) / 7, bw = Math.min(26, slot * 0.4);
    let grid = '';
    for (let v = lo; v <= hi; v += 5) grid += `<line x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${left - 6}" y="${y(v) + 4}" text-anchor="end" class="axis">${v}°</text>`;
    const byDay = new Map(days.map(x => [(asDate(x.date).getDay() + 6) % 7, x]));
    let bars = '';
    for (let i = 0; i < 7; i++) {
      const cx = left + slot * i + slot / 2, x = byDay.get(i);
      const startKey = (() => { const d = asDate(days[0].date); d.setDate(d.getDate() + i - ((d.getDay() + 6) % 7)); return keyOf(d); })();
      bars += `<text x="${cx}" y="${H - 26}" text-anchor="middle" class="axis ${startKey === state.today ? 'axis-today' : ''}">${DAYS_SHORT[(i + 1) % 7]}</text><text x="${cx}" y="${H - 10}" text-anchor="middle" class="axis">${fmtShort(startKey)}</text>`;
      if (!x) continue;
      const y1 = y(x.max), y2 = y(x.min), fc = x.date >= state.today;
      bars += `<g class="bar ${x.date === selected ? 'sel' : ''}" data-date="${x.date}" tabindex="0">
        <rect x="${cx - slot / 2}" y="${top - 30}" width="${slot}" height="${H - top - bottom + 30}" class="hit"/>
        <rect x="${cx - bw / 2}" y="${y1}" width="${bw}" height="${Math.max(4, y2 - y1)}" rx="4" class="range ${fc ? 'fc' : ''}"/>
        <text x="${cx}" y="${y1 - 7}" text-anchor="middle" class="val">${Math.round(x.max)}°</text>
        <text x="${cx}" y="${y2 + 15}" text-anchor="middle" class="val val-min">${Math.round(x.min)}°</text>
        <title>${dayName(x.date)}, ${fmtDate(x.date)} — Juu ${t1(x.max)}, Chini ${t1(x.min)} (${kind(x.date)})</title></g>`;
    }
    $('weekChart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Joto la juu na la chini kwa kila siku ya wiki">${grid}${bars}</svg>`;
    $('weekChart').querySelectorAll('g.bar').forEach(g => {
      const pick = () => { selected = g.dataset.date; render(); };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
      g.addEventListener('mousemove', e => tip(e, g.querySelector('title').textContent));
      g.addEventListener('mouseleave', () => tip(null));
    });
  }

  function tip(e, text) {
    const t = $('tempTip');
    if (!e) { t.hidden = true; return; }
    const box = t.parentElement.getBoundingClientRect();
    t.textContent = text; t.hidden = false;
    t.style.left = Math.min(e.clientX - box.left + 12, box.width - 220) + 'px';
    t.style.top = (e.clientY - box.top - 40) + 'px';
  }

  function renderDay() {
    const key = selected, box = $('dayDetail');
    const hrs = state.hourly.filter(h => h.time.startsWith(key) && h.temp != null);
    if (!hrs.length) { box.innerHTML = ''; return; }
    const W = 700, H = 200, top = 24, bottom = 28, left = 38, right = 12;
    const temps = hrs.map(h => h.temp);
    let lo = Math.floor(Math.min(...temps) - 1), hi = Math.ceil(Math.max(...temps) + 1);
    const x = i => left + i / 23 * (W - left - right), y = v => top + (hi - v) / (hi - lo) * (H - top - bottom);
    const hour = h => +h.time.slice(11, 13);
    const pts = hrs.map(h => `${x(hour(h)).toFixed(1)},${y(h.temp).toFixed(1)}`).join(' ');
    const maxH = hrs.reduce((a, b) => b.temp > a.temp ? b : a), minH = hrs.reduce((a, b) => b.temp < a.temp ? b : a);
    let axis = '';
    for (let i = 0; i <= 24; i += 3) if (i < 24) axis += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="axis">${String(i).padStart(2, '0')}:00</text>`;
    const step = Math.max(1, Math.round((hi - lo) / 4));
    for (let v = lo; v <= hi; v += step) axis += `<line x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${left - 6}" y="${y(v) + 4}" text-anchor="end" class="axis">${v}°</text>`;
    const dots = hrs.map(h => `<g class="hr"><rect x="${x(hour(h)) - 13}" y="${top}" width="26" height="${H - top - bottom}" class="hit"/><circle cx="${x(hour(h))}" cy="${y(h.temp)}" r="4" class="dot"/><title>${h.time.slice(11, 16)} — ${t1(h.temp)} · ${state.label(h.code)}</title></g>`).join('');
    const mark = (h, cls, dy) => `<text x="${x(hour(h))}" y="${y(h.temp) + dy}" text-anchor="middle" class="val ${cls}">${Math.round(h.temp)}° (${h.time.slice(11, 16)})</text>`;
    box.innerHTML = `<h3>🕒 Joto kwa saa · ${dayName(key)}, ${fmtDate(key)} <span class="tag tag-${kind(key) === 'Rekodi' ? 'rec' : kind(key) === 'Leo' ? 'today' : 'fc'}">${kind(key)}</span></h3>
      <div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Joto kwa kila saa">${axis}<polyline points="${pts}" class="line"/>${dots}${mark(maxH, '', -10)}${mark(minH, 'val-min', 18)}</svg></div>
      <p class="rain-detail">Joto la juu: <b>${t1(maxH.temp)}</b> saa ${maxH.time.slice(11, 16)} · Joto la chini: <b>${t1(minH.temp)}</b> saa ${minH.time.slice(11, 16)} · Wastani: <b>${t1(avg(temps))}</b></p>`;
    box.querySelectorAll('g.hr').forEach(g => {
      g.addEventListener('mousemove', e => tip(e, g.querySelector('title').textContent));
      g.addEventListener('mouseleave', () => tip(null));
    });
  }

  window.showTempStats = function ({ daily, hourly, today, name, ico, label }) {
    const weeks = buildWeeks(daily);
    const sameplace = state && state.name === name;
    const keepWeek = sameplace ? state.weeks[weekIndex]?.start : null;
    state = { weeks, hourly, today, name, ico, label };
    const target = keepWeek || mondayOf(today);
    weekIndex = Math.max(0, weeks.findIndex(w => w.start === target));
    if (!sameplace || !daily.some(x => x.date === selected)) selected = today;
    if (!weeks[weekIndex]?.days.some(x => x.date === selected)) selected = weeks[weekIndex]?.days[0]?.date;
    $('tempPlace').textContent = `📍 ${name} · Rekodi za siku 28 zilizopita na utabiri wa siku 16 zijazo`;
    render();
  };

  function go(delta) {
    if (!state) return;
    const n = weekIndex + delta;
    if (n < 0 || n >= state.weeks.length) return;
    weekIndex = n;
    const days = state.weeks[n].days;
    selected = (days.find(x => x.date === state.today) || days[0]).date;
    render();
  }
  $('prevWeek').addEventListener('click', () => go(-1));
  $('nextWeek').addEventListener('click', () => go(1));
  $('thisWeek').addEventListener('click', () => { if (!state) return; weekIndex = Math.max(0, state.weeks.findIndex(w => w.start === mondayOf(state.today))); selected = state.today; render(); });
})();
