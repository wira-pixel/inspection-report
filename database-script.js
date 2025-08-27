// ==========================
// DATABASE — robust mapping (object/array) + dedupe
// ==========================
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/";

const tbody      = document.querySelector("#data-table tbody");
const searchBox  = document.getElementById("searchBox");
const refreshBtn = document.getElementById("refreshBtn");
const msg        = document.getElementById("dbMessage");

let MASTER_ROWS = [];

// ---------- utils ----------
const pad2 = n => String(n).padStart(2, "0");
function normText(x, {lower=true} = {}){
  let s = (x ?? "").toString()
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  return lower ? s.toLowerCase() : s;
}
function normHM(x){
  const digits = (x ?? "").toString().replace(/[^\d]/g, "");
  return digits || "";
}
function toYMD(v){
  if (v == null || v === "") return "";
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v)) {
    return `${v.getFullYear()}-${pad2(v.getMonth()+1)}-${pad2(v.getDate())}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;        // yyyy-mm-dd
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);    // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d)) return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  return "";
}
function dispID(ymd){
  if (!ymd) return "-";
  const [y,m,d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

// ---------- CF Worker ----------
async function postWorker(payload){
  const r = await fetch(WORKER_URL, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  return await r.json();
}
async function fetchInspeksi(){
  const res = await postWorker({action:"getInspeksi"});
  if (res?.success && Array.isArray(res.data)) return res.data;
  return [];
}

// ---------- header token matcher (untuk object) ----------
function keyTokens(k){
  return normText(k).replace(/[^a-z]+/g," ").trim().split(/\s+/);
}
function includesAllTokens(key, mustTokens){
  const t = keyTokens(key);
  return mustTokens.every(tok => t.includes(tok));
}
function findKeyByTokenSets(obj, tokenSets){
  const keys = Object.keys(obj);
  for (const set of tokenSets){
    const found = keys.find(k => includesAllTokens(k, set));
    if (found) return found;
  }
  return null;
}

// ---------- NORMALIZER: dukung object & array ----------
function normalizeRow(raw){
  // CASE A: data = ARRAY (index based)
  if (Array.isArray(raw) || Object.keys(raw).every(k => /^\d+$/.test(k))) {
    const row = Array.isArray(raw) ? raw : Object.keys(raw).sort((a,b)=>a-b).map(k=>raw[k]);
    // Urutan sheet "Data" umum:
    // 0: Date, 1: Site, 2: Code Unit, 3: Hour Meter, 4: Inspected By, ..., last: PDF
    const date      = row[0];
    const codeUnit  = row[2];
    const hm        = row[3];
    const inspector = row[4];
    const pdfGuess  = row[row.length - 1];      // PDF biasanya di kolom terakhir
    const pdf       = /^\s*https?:\/\//i.test(String(pdfGuess||"")) ? String(pdfGuess) : "";

    return {
      kode: normText(codeUnit),
      tanggalYMD: toYMD(date),
      hm: normHM(hm),
      inspector: normText(inspector),
      pdf: pdf.trim()
    };
  }

  // CASE B: data = OBJECT (header based) -> token matching
  const L = raw; // pakai key apa adanya
  const kodeKey = findKeyByTokenSets(L, [
    ["kode","unit"], ["code","unit"], ["kodeunit"], ["codeunit"], ["unit","code"]
  ]);
  const dateKey = findKeyByTokenSets(L, [
    ["tanggal","inspeksi"], ["tanggal"], ["inspection","date"], ["date"], ["tgl"]
  ]);
  const hmKey   = findKeyByTokenSets(L, [
    ["hour","meter"], ["hm"], ["hourmeter"]
  ]);
  const inspKey = findKeyByTokenSets(L, [
    ["inspektor"], ["inspector"], ["inspected","by"], ["inspectedby"]
  ]);
  const pdfKey  = findKeyByTokenSets(L, [
    ["pdf"]
  ]);

  const kode = kodeKey ? L[kodeKey] : "";
  const tgl  = dateKey ? L[dateKey] : "";
  const hm   = hmKey   ? L[hmKey]   : "";
  const insp = inspKey ? L[inspKey] : "";
  const pdf  = pdfKey  ? L[pdfKey]  : "";

  return {
    kode: normText(kode),
    tanggalYMD: toYMD(tgl),
    hm: normHM(hm),
    inspector: normText(insp),
    pdf: (pdf ?? "").toString().trim()
  };
}

// ---------- DEDUPE ----------
function dedupe(rows){
  const map = new Map();
  const out = [];
  for (const r of rows){
    // skip jika benar2 kosong
    if (!r.kode && !r.tanggalYMD && !r.hm && !r.inspector && !r.pdf) continue;

    // kunci utama: (kode+tgl) bila ada tgl; kalau tidak, (kode+hm+inspector); terakhir, (kode)
    let key = "";
    if (r.tanggalYMD) key = `${r.kode}|${r.tanggalYMD}`;
    else if (r.hm || r.inspector) key = `${r.kode}|${r.hm}|${r.inspector}`;
    else key = `${r.kode}`;

    if (!map.has(key)){
      map.set(key, r);
      out.push(r);
    } else {
      const exist = map.get(key);
      if ((!exist.pdf || exist.pdf === "-") && r.pdf) exist.pdf = r.pdf;
      if (!exist.tanggalYMD && r.tanggalYMD) exist.tanggalYMD = r.tanggalYMD;
      if (!exist.hm && r.hm) exist.hm = r.hm;
      if (!exist.inspector && r.inspector) exist.inspector = r.inspector;
    }
  }
  return out;
}

// ---------- render ----------
function render(rows){
  if (!rows.length){
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Tidak ada data.</td></tr>`;
    return;
  }
  rows.sort((a,b) => a.tanggalYMD === b.tanggalYMD
    ? a.kode.localeCompare(b.kode)
    : (a.tanggalYMD < b.tanggalYMD ? 1 : -1));

  tbody.innerHTML = rows.map(r => {
    const btn = r.pdf
      ? `<button class="btn btn-row btn-pdf" data-pdf="${encodeURI(r.pdf)}">Lihat PDF</button>`
      : `<span class="muted">-</span>`;
    return `
      <tr>
        <td>${r.kode || "-"}</td>
        <td>${dispID(r.tanggalYMD)}</td>
        <td>${r.hm || "-"}</td>
        <td>${r.inspector || "-"}</td>
        <td>${btn}</td>
      </tr>
    `;
  }).join("");
}

// ---------- filter ----------
function applyFilter(){
  const q = (searchBox?.value || "").trim().toLowerCase();
  if (!q){ render(MASTER_ROWS); return; }
  const f = MASTER_ROWS.filter(r =>
    r.kode.includes(q) ||
    r.inspector.includes(q) ||
    r.hm.includes(q) ||
    dispID(r.tanggalYMD).includes(q) ||
    r.tanggalYMD.includes(q)
  );
  render(f);
}

// ---------- events ----------
tbody.addEventListener("click", (ev) => {
  const btn = ev.target.closest(".btn-pdf");
  if (!btn) return;
  const url = btn.dataset.pdf;
  if (url) window.open(url, "_blank");
});
searchBox?.addEventListener("input", applyFilter);
refreshBtn?.addEventListener("click", load);

// ---------- init ----------
async function load(){
  try{
    if (msg){ msg.textContent = "Memuat data…"; msg.classList.remove("hidden"); }

    const raw = await fetchInspeksi();

    // DEBUG ringan (tidak error bila kosong)
    // console.log("Sampel raw:", raw[0]);

    const normalized = raw.map(normalizeRow);
    MASTER_ROWS = dedupe(normalized);
    applyFilter();

  } catch(err){
    console.error("[DB] load error:", err);
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Gagal memuat data.</td></tr>`;
  } finally {
    msg?.classList.add("hidden");
  }
}
document.addEventListener("DOMContentLoaded", load);
