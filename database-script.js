// ==========================
// DATABASE.JS — ambil & tampilkan data inspeksi + tombol PDF
// ==========================
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; // wajib trailing slash

(() => {
  const table      = document.getElementById("data-table");
  if (!table) return;

  const tbody      = table.querySelector("tbody");
  const searchBox  = document.getElementById("searchBox");
  const refreshBtn = document.getElementById("refreshBtn");
  const msgEl      = document.getElementById("dbMessage");

  let rowsRaw = [];
  let view    = [];

  // ---------- Utils ----------
  const pad2 = n => String(n).padStart(2,"0");

  function formatDate(val){
    if (val == null || val === "") return "-";

    if (typeof val === "number") {
      // Excel serial date
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const ms    = epoch.getTime() + val * 86400000;
      const d = new Date(ms);
      return isNaN(d) ? "-" : toDDMMYYYY(d);
    }

    if (typeof val === "string") {
      const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
      if (ymd) return toDDMMYYYY(new Date(+ymd[1], +ymd[2]-1, +ymd[3]));
      const d = new Date(val);
      if (!isNaN(d)) return toDDMMYYYY(d);
    }
    return String(val);
  }

  function toDDMMYYYY(d){
    return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
  }

  function toYMDfromDDMMYYYY(ddmmyyyy){
    if (!ddmmyyyy || ddmmyyyy === "-") return "";
    const [dd,mm,yy] = ddmmyyyy.split("/");
    return `${yy}-${mm}-${dd}`;
  }

  function esc(s){
    return String(s ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  // ---------- Fetch ----------
  async function postJSON(payload){
    const r = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await r.json();
  }

  async function fetchInspeksi(){
    // Coba GET sederhana (tanpa header custom) → fallback POST
    try{
      const u = new URL(WORKER_URL);
      u.searchParams.set("action","getInspeksi");
      u.searchParams.set("ts", Date.now());
      const r = await fetch(u.toString());
      const d = await r.json();
      if (d?.success && Array.isArray(d.data)) return d;
    }catch(e){
      console.warn("[DB] GET error, mencoba POST …", e);
    }
    return await postJSON({ action:"getInspeksi" });
  }

  // ---------- Render ----------
  function render(){
    if (!tbody) return;
    tbody.innerHTML = "";

    for (const r of view){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${esc(r.codeUnit)}</td>
        <td>${esc(r.date)}</td>
        <td>${esc(r.hourMeter)}</td>
        <td>${esc(r.inspectedBy)}</td>
        <td>
          ${ r.pdf
              ? `<button class="btn-pdf" data-url="${esc(r.pdf)}">Lihat PDF</button>`
              : "-"
            }
        </td>
      `;
      tbody.appendChild(tr);
    }
  }

  function showMessage(text){
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.classList.remove("hidden");
  }
  function hideMessage(){ msgEl?.classList.add("hidden"); }

  async function load(){
    showMessage("Memuat data…");
    const payload = await fetchInspeksi();
    if (!payload?.success || !Array.isArray(payload.data)){
      showMessage(payload?.message || "Gagal memuat data.");
      console.error("Data database tidak valid:", payload);
      return;
    }
    hideMessage();

    // Normalisasi field (pakai beberapa kemungkinan nama header)
    rowsRaw = payload.data.map(row => {
      const dateVal = row["Date"] ?? row["date"] ?? row["Tanggal"] ?? row["Tanggal Inspeksi"] ?? "";
      const hmVal   = row["Hour Meter"] ?? row["hourMeter"] ?? row["HM"] ?? "";
      const inspVal = row["Inspected By"] ?? row["inspectedBy"] ?? row["Inspektor"] ?? row["Inspector"] ?? "-";
      const pdfVal  = row["PDF"] ?? row["PDF Url"] ?? row["PDF URL"] ?? row["pdfUrl"] ?? row["Pdf"] ?? "";

      return {
        codeUnit   : row["Code Unit"] ?? row["codeUnit"] ?? row["Kode"] ?? row["Kode Unit"] ?? "-",
        date       : formatDate(dateVal),
        hourMeter  : hmVal,
        inspectedBy: inspVal,
        pdf        : pdfVal
      };
    });

    // Urutkan terbaru di atas (berdasar tanggal yang sudah di-format dd/mm/yyyy)
    rowsRaw.sort((a,b) => {
      const ya = toYMDfromDDMMYYYY(a.date);
      const yb = toYMDfromDDMMYYYY(b.date);
      return yb.localeCompare(ya); // desc
    });

    view = rowsRaw.slice();
    render();
  }

  // ---------- Search ----------
  function onSearch(){
    const q = (searchBox?.value || "").trim().toLowerCase();
    if (!q){ view = rowsRaw.slice(); render(); return; }

    view = rowsRaw.filter(r =>
      String(r.codeUnit).toLowerCase().includes(q) ||
      String(r.inspectedBy).toLowerCase().includes(q) ||
      String(r.date).toLowerCase().includes(q) ||
      String(r.hourMeter).toString().toLowerCase().includes(q)
    );
    render();
  }

  // ---------- Events ----------
  searchBox?.addEventListener("input", onSearch);
  refreshBtn?.addEventListener("click", load);

  // Event delegation untuk tombol PDF
  table.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn-pdf");
    if (!btn) return;
    const url = btn.dataset.url;
    if (url) window.open(url, "_blank", "noopener");
  });

  // init
  document.addEventListener("DOMContentLoaded", load);
  load();
})();
