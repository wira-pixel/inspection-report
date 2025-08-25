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

  let rowsRaw = [];
  let view    = [];

  function formatDate(val){
    if (val == null || val === "") return "-";
    if (typeof val === "number") {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const ms    = epoch.getTime() + val * 86400000;
      const d = new Date(ms);
      return isNaN(d) ? "-" : toDDMMYYYY(d);
    }
    if (typeof val === "string") {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
      if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return toDDMMYYYY(d);
      }
      const d = new Date(val);
      if (!isNaN(d)) return toDDMMYYYY(d);
    }
    return String(val);
  }
  function toDDMMYYYY(d){
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  // --- Ambil dari Worker (GET ?action=getInspeksi, fallback POST) ---
  async function fetchInspeksi(){
    try{
      const u = new URL(WORKER_URL);
      u.searchParams.set("action", "getInspeksi");
      u.searchParams.set("ts", Date.now()); // anti-cache via query param

      // GET sederhana TANPA opsi/header tambahan agar tidak memicu preflight CORS
      const r = await fetch(u.toString());
      const d = await r.json();
      if (d?.success && Array.isArray(d.data)) return d;
      console.warn("[DB] GET tidak valid, mencoba POST …", d);
    }catch(e){
      console.warn("[DB] GET error, mencoba POST …", e);
    }

    // Fallback POST — hanya Content-Type
    const rp = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getInspeksi" })
    });
    return await rp.json();
  }

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

  async function load(){
    showMessage("Memuat data…");
    const payload = await fetchInspeksi();
    if (!payload?.success || !Array.isArray(payload.data)){
      showMessage(payload?.message || "Gagal memuat data.");
      console.error("Data database tidak valid:", payload);
      return;
    }
    hideMessage();

    rowsRaw = payload.data.map(row => ({
      codeUnit   : row["Code Unit"]  ?? row["codeUnit"]  ?? "-",
      date       : formatDate(row["Date"] ?? row["date"] ?? "-"),
      hourMeter  : (row["Hour Meter"] ?? row["hourMeter"] ?? "-"),
      inspectedBy: row["Inspected By"] ?? row["inspectedBy"] ?? "-"
    }));

    // urutkan terbaru di atas (pakai string dd/mm/yyyy → yyyy-mm-dd)
    rowsRaw.sort((a,b) => {
      const pa = a.date.split("/").reverse().join("-");
      const pb = b.date.split("/").reverse().join("-");
      return (pb > pa) ? 1 : (pb < pa ? -1 : 0);
    });

    view = rowsRaw.slice();
    render();
  }

  function onSearch(){
    const q = (searchBox?.value || "").trim().toLowerCase();
    if (!q){ view = rowsRaw.slice(); render(); return; }
    view = rowsRaw.filter(r =>
      String(r.codeUnit).toLowerCase().includes(q) ||
      String(r.inspectedBy).toLowerCase().includes(q) ||
      String(r.date).toLowerCase().includes(q) ||
      String(r.hourMeter).toLowerCase().includes(q)
    );
    render();
  }

  function showMessage(text){ if(msgEl){ msgEl.textContent = text; msgEl.classList.remove("hidden"); } }
  function hideMessage(){ if(msgEl){ msgEl.classList.add("hidden"); } }

  searchBox?.addEventListener("input", onSearch);
  refreshBtn?.addEventListener("click", load);

  document.addEventListener("DOMContentLoaded", load);
  load();
})();
