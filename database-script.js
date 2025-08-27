// ==========================
// DATABASE — fetch, strong-dedupe, render
// ==========================
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/";

const tbody      = document.querySelector("#data-table tbody");
const searchBox  = document.getElementById("searchBox");
const refreshBtn = document.getElementById("refreshBtn");
const msg        = document.getElementById("dbMessage");

let MASTER_ROWS = [];

// ---------- util ----------
const pad2 = n => String(n).padStart(2,"0");

// hapus karakter zero-width & rapikan spasi
function normText(x, {lower=true} = {}){
  let s = (x ?? "").toString()
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")  // zero-width
    .trim()
    .replace(/\s+/g, " ");                  // collapse spasi
  if (lower) s = s.toLowerCase();
  return s;
}

// norm HM: ambil digit saja
function normHM(x){
  const s = (x ?? "").toString();
  const digits = s.replace(/[^\d]/g, "");   // hapus titik/koma/space
  return digits || "";
}

function toYMD(v){
  if (v == null || v === "") return "";
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v)) {
    return `${v.getFullYear()}-${pad2(v.getMonth()+1)}-${pad2(v.getDate())}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;                 // yyyy-mm-dd
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);             // dd/mm/yyyy
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

// ---------- fetch ----------
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

// ---------- normalisasi & dedupe ----------
function normalizeRow(r){
  const kode = r["kode unit"] ?? r["code unit"] ?? r["kode"] ?? r["unit"] ?? r.codeUnit ?? r.kode ?? "";
  const tgl  = r["tanggal inspeksi"] ?? r["tanggal"] ?? r["date"] ?? r.Date ?? "";
  const hm   = r["hour meter"] ?? r.hourMeter ?? r.hm ?? "";
  const insp = r["inspektor"] ?? r["inspected by"] ?? r.inspectedBy ?? r.inspektor ?? "";

  const pdf  = r["PDF"] ?? r["pdf"] ?? r.pdf ?? "";

  return {
    kode: normText(kode),
    tanggalYMD: toYMD(tgl),
    hm: normHM(hm),
    inspector: normText(insp),
    pdf: (pdf ?? "").toString().trim()
  };
}

function dedupe(rows){
  const map = new Map();
  const out = [];

  for (const row of rows){
    // kunci normal: kode|tgl|hm|insp (setelah normalisasi)
    // fallback: kalau hm atau inspector kosong → pakai kode|tgl saja
    const base = `${row.kode}|${row.tanggalYMD}`;
    const detailed = (row.hm && row.inspector) ? `${base}|${row.hm}|${row.inspector}` : base;

    const key = detailed;

    if (!map.has(key)){
      map.set(key, row);
      out.push(row);
    } else {
      const exist = map.get(key);
      // perbarui PDF jika sebelumnya kosong dan yang baru ada
      if ((!exist.pdf || exist.pdf === "-") && row.pdf) {
        exist.pdf = row.pdf;
      }
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
  // urutkan by tanggal desc, lalu kode
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
    msg?.classList.remove("hidden");
    msg && (msg.textContent = "Memuat data…");

    const raw = await fetchInspeksi();
    const normalized = raw.map(normalizeRow)
      .filter(r => r.kode && r.tanggalYMD); // wajib ada kode & tanggal

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
