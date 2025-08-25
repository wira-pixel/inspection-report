// ==========================
// DATABASE.JS — ambil & tampilkan data inspeksi
// ==========================
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; // wajib trailing slash

(() => {
  const table = document.getElementById("data-table");
  if (!table) return;

  const tbody      = table.querySelector("tbody");
  const searchBox  = document.getElementById("searchBox");
  const refreshBtn = document.getElementById("refreshBtn");
  const msgEl      = document.getElementById("dbMessage");

  let rowsRaw = [];   // data mentah dari server
  let view    = [];   // data yang dirender

  // --- Util: format tanggal (mendukung 'YYYY-MM-DD', ISO '...T..Z', atau Date serial dari Sheets) ---
  function formatDate(val){
    if (val == null || val === "") return "-";

    // Jika Google Sheets mengembalikan number serial (jarang untuk sheet ini, tapi antisipasi)
    if (typeof val === "number") {
      // Excel/Sheets serial => epoch (days from 1899-12-30)
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const ms    = epoch.getTime() + val * 86400000;
      const d = new Date(ms);
      if (isNaN(d)) return "-";
      return toDDMMYYYY(d);
    }

    // Jika string ISO / atau YYYY-MM-DD
    if (typeof val === "string") {
      // case "YYYY-MM-DD"
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
      if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return toDDMMYYYY(d);
      }
      // ISO string
      const d = new Date(val);
      if (!isNaN(d)) return toDDMMYYYY(d);
    }

    return String(val); // terakhir: tampilkan apa adanya
  }

  function toDDMMYYYY(d){
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  // --- Ambil dari Worker (GET ?action=getInspeksi, fallback POST) ---
  async function fetchInspeksi(){
    // GET
    try{
      const u = new URL(WORKER_URL);
      u.searchParams.set("action", "getInspeksi");
      u.searchParams.set("ts", Date.now());
      const r = await fetch(u.toString(), { method:"GET", cache:"no-store", headers:{ "Cache-Control":"no-cache" }});
      const d = await r.json();
      if (d?.success && Array.isArray(d.data)) return d;
      console.warn("[DB] GET tidak valid, mencoba POST …", d);
    }catch(e){
      console.warn("[DB] GET error, mencoba POST …", e);
    }

    // POST
    const rp = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      body: JSON.stringify({ action: "getInspeksi" })
    });
    return await rp.json();
  }

  // --- Render table dari 'view' ---
  function render(){
    if (!tbody) return;
    tbody.innerHTML = "";
    for (const r of view){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.codeUnit}</td>
        <td>${r.date}</td>
        <td>${r.hourMeter}</td>
        <td>${r.inspectedBy}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  // --- Load & map data dari server ---
  async function load(){
    showMessage("Memuat data…");
    const payload = await fetchInspeksi();
    // Validasi
    if (!payload?.success || !Array.isArray(payload.data)){
      showMessage(payload?.message || "Gagal memuat data.");
      console.error("Data database tidak valid:", payload);
      return;
    }
    hideMessage();

    // Map kolom dari sheet 'Data'
    rowsRaw = payload.data.map(row => ({
      codeUnit   : row["Code Unit"]  ?? row["codeUnit"]  ?? "-",
      date       : formatDate(row["Date"] ?? row["date"] ?? "-"),
      hourMeter  : (row["Hour Meter"] ?? row["hourMeter"] ?? "-"),
      inspectedBy: row["Inspected By"] ?? row["inspectedBy"] ?? "-"
    }));

    // Urutkan terbaru di atas (jika tanggal valid)
    rowsRaw.sort((a,b) => {
      const pa = a.date.split("/").reverse().join("-");
      const pb = b.date.split("/").reverse().join("-");
      return (pb > pa) ? 1 : (pb < pa ? -1 : 0);
    });

    view = rowsRaw.slice();
    render();
  }

  // --- Search ---
  function onSearch(){
    const q = (searchBox?.value || "").trim().toLowerCase();
    if (!q){
      view = rowsRaw.slice();
      render();
      return;
    }
    view = rowsRaw.filter(r => {
      return (
        String(r.codeUnit).toLowerCase().includes(q) ||
        String(r.inspectedBy).toLowerCase().includes(q) ||
        String(r.date).toLowerCase().includes(q) ||
        String(r.hourMeter).toLowerCase().includes(q)
      );
    });
    render();
  }

  // --- Helper UI message ---
  function showMessage(text){ if(msgEl){ msgEl.textContent = text; msgEl.classList.remove("hidden"); } }
  function hideMessage(){ if(msgEl){ msgEl.classList.add("hidden"); } }

  // Event
  searchBox?.addEventListener("input", onSearch);
  refreshBtn?.addEventListener("click", load);

  // Start
  document.addEventListener("DOMContentLoaded", load);
  load();
})();
