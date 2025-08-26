// ==========================
// JADWAL — simpan ke Sheet (status kosong) + tampilkan
// ==========================
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/";

const tbody = document.querySelector("#jadwalTable tbody");

const pad2 = n => String(n).padStart(2,'0');
const toYMD = any => {
  if (!any) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(any)) return any;
  const d = new Date(any);
  if (!isNaN(d)) return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  return "";
};
const toDisp = ymd => {
  if (!ymd) return "-";
  const [y,m,d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) { alert(msg); return; }
  toast.innerText = msg;
  toast.className = "show " + type;
  setTimeout(() => toast.classList.remove("show", type), 2500);
}

async function fetchJadwal(){
  try{
    const r = await fetch(WORKER_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action:"getJadwal" })
    });
    return await r.json();
  }catch(e){ return { success:false, message:e.message }; }
}

function renderRows(rows){
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!rows.length){
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#9aa4b2">Belum ada data</td></tr>`;
    return;
  }
  rows.forEach(it => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.kode || ""}</td>
      <td>${toDisp(toYMD(it.tanggal || ""))}</td>
      <td>${it.lokasi || ""}</td>
      <td><input type="checkbox" ${it.status ? "checked" : ""} disabled></td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadJadwal(){
  const res = await fetchJadwal();
  if (!res?.success || !Array.isArray(res.data)){
    showToast(res?.message || "Gagal memuat jadwal", "error");
    return;
  }
  renderRows(res.data);
}

// Submit: simpan ke Sheet dengan status kosong
document.addEventListener("DOMContentLoaded", () => {
  loadJadwal();

  const form = document.getElementById("jadwalForm");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tanggal = document.getElementById("tanggal")?.value.trim();
    const kode    = document.getElementById("kode")?.value.trim();
    const lokasi  = document.getElementById("lokasi")?.value.trim();
    if (!tanggal || !kode || !lokasi){
      showToast("Mohon lengkapi semua field!", "error");
      return;
    }

    const overlay = document.getElementById("loadingOverlay");
    overlay?.classList.add("active");

    try{
      const resp = await fetch(WORKER_URL, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          action : "submitJadwal",
          kode   : kode,
          tanggal: toYMD(tanggal), // yyyy-mm-dd
          lokasi : lokasi,
          status : ""               // <— status kosong (draft)
        })
      });
      const data = await resp.json();
      if (!data?.success) throw new Error(data?.message || "Gagal menyimpan");

      showToast("✅ Jadwal tersimpan (status kosong)");
      e.target.reset();
      loadJadwal(); // segarkan tabel di halaman jadwal

    }catch(err){
      showToast("❌ " + err.message, "error");
    }finally{
      overlay?.classList.remove("active");
    }
  });
});
