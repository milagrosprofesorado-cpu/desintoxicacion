// app.js (module) - gestión sin frameworks, optimizada y con fecha local segura
const STORAGE_KEY = 'dh_history_v3';

function todayIsoLocal(){
  // Devuelve YYYY-MM-DD usando la fecha local (evita problemas de timezone)
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateIsoToLocal(iso){
  if (!iso) return '';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2,'0');
  const month = String(d.getMonth()+1).padStart(2,'0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function loadHistory(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('Error parseando localStorage', e);
    return [];
  }
}

function saveHistory(history){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/* DOM references */
const btnAddDay = document.getElementById('btnAddDay');
const messageEl = document.getElementById('message');
const todayLabel = document.getElementById('todayLabel');

const cardPreview = document.getElementById('cardPreview');
const cardTitle = document.getElementById('cardTitle');
const cardDate = document.getElementById('cardDate');
const noPreview = document.getElementById('noPreview');

const historyList = document.getElementById('historyList');
const btnClear = document.getElementById('btnClear');

const btnExport = document.getElementById('btnExport');
const btnImport = document.getElementById('btnImport');
const fileImport = document.getElementById('fileImport');

let history = loadHistory();
let selectedIndex = history.length ? history.length - 1 : -1;

/* Accessibility: set initial aria labels if needed */
if (todayLabel) todayLabel.textContent = formatDateIsoToLocal(todayIsoLocal());

/* init */
function init(){
  todayLabel.textContent = formatDateIsoToLocal(todayIsoLocal());
  renderHistory();
  renderPreview();
}

function setMessage(msg, timeout=2500){
  if (!messageEl) return;
  messageEl.textContent = msg;
  if (timeout) setTimeout(()=>{ if (messageEl.textContent === msg) messageEl.textContent = ''; }, timeout);
}

/* Add day */
if (btnAddDay) btnAddDay.addEventListener('click', ()=> {
  const today = todayIsoLocal();
  if (history.length > 0 && history[history.length - 1].date === today){
    setMessage('Ya registraste el día de hoy. La tarjeta está lista para capturar.');
    selectedIndex = history.length - 1;
    renderPreview();
    return;
  }
  const entry = { day: history.length + 1, date: today, createdAt: new Date().toISOString() };
  history.push(entry);
  saveHistory(history);
  selectedIndex = history.length - 1;
  renderHistory();
  renderPreview();
  setMessage('Día registrado ✅');
});

/* Render preview */
function renderPreview(){
  if (!cardPreview || !cardTitle || !cardDate || !noPreview) return;
  if (selectedIndex >= 0 && history[selectedIndex]){
    const e = history[selectedIndex];
    cardTitle.textContent = `Día ${e.day} de Desintoxicación`;
    cardDate.textContent = formatDateIsoToLocal(e.date);
    cardPreview.style.display = 'flex';
    noPreview.style.display = 'none';
  } else {
    cardPreview.style.display = 'none';
    noPreview.style.display = 'block';
  }
}

/* Render history list */
function renderHistory(){
  if (!historyList) return;
  historyList.innerHTML = '';
  if (!history.length){
    historyList.innerHTML = '<div class="muted">Sin registros</div>';
    selectedIndex = -1;
    renderPreview();
    return;
  }
  // mostramos del más reciente al más antiguo
  const reversed = [...history].reverse();
  reversed.forEach((e, i) => {
    const realIndex = history.length - 1 - i;
    const item = document.createElement('div');
    item.className = 'hist-item';
    if (realIndex === selectedIndex) item.style.background = '#e6fbff';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('div');
    title.textContent = `Día ${e.day}`;
    title.style.fontWeight = 700;
    const small = document.createElement('div');
    small.className = 'small';
    small.textContent = formatDateIsoToLocal(e.date);
    meta.appendChild(title);
    meta.appendChild(small);

    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.gap = '8px';

    const sel = document.createElement('button');
    sel.className = 'btn ghost';
    sel.textContent = 'Seleccionar';
    sel.addEventListener('click', ()=> {
      selectedIndex = realIndex;
      renderHistory();
      renderPreview();
      // Scroll preview into view on mobile
      if (window.innerWidth < 980) {
        document.getElementById('cardPreview')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    btns.appendChild(sel);

    item.appendChild(meta);
    item.appendChild(btns);
    historyList.appendChild(item);
  });
}

/* Clear history */
if (btnClear) btnClear.addEventListener('click', ()=> {
  const ok = confirm('¿Querés eliminar todo el historial? Esta acción no se puede deshacer.');
  if (!ok) return;
  history = [];
  selectedIndex = -1;
  saveHistory(history);
  renderHistory();
  renderPreview();
  setMessage('Historial eliminado.');
});

/* Export JSON */
if (btnExport) btnExport.addEventListener('click', ()=> {
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dh_history_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

/* Import JSON */
if (btnImport) btnImport.addEventListener('click', ()=> fileImport.click());
if (fileImport) fileImport.addEventListener('change', async (ev)=> {
  const f = ev.target.files?.[0];
  if (!f) return;
  try {
    const txt = await f.text();
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed)) throw new Error('JSON debe ser un array de entradas');
    // Basic validation of entries
    const ok = parsed.every(p => p && typeof p.day === 'number' && typeof p.date === 'string');
    if (!ok) throw new Error('Formato JSON inválido');
    history = parsed;
    saveHistory(history);
    selectedIndex = history.length ? history.length - 1 : -1;
    renderHistory();
    renderPreview();
    setMessage('Historial importado ✅');
  } catch (err){
    alert('Error al importar JSON: ' + err.message);
  } finally {
    fileImport.value = '';
  }
});

/* Init on load */
init();
