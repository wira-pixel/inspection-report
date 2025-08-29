// ==========================
// KONFIGURASI GLOBAL
// ==========================
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; // konsisten pakai trailing slash

// ==========================
// CACHE DATA KOMPONEN (Bab/Sub Bab)
// ==========================
let KOM_DATA = { groups: [], byGroup: {} }; // { groups: ["ENGINE & RELATED PARTS", ...], byGroup: { "ENGINE & RELATED PARTS":[{name, code}, ...] } }

async function fetchKomponen() {
  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ action: "getKomponen" })
    });
    const j = await res.json();
    if (!j?.success || !Array.isArray(j.data)) throw new Error(j?.message || "Gagal memuat data komponen");

    // Normalisasi
    const byGroup = {};
    for (const r of j.data) {
      const group =
        (r["Component Group"] ?? r["component group"] ?? r.componentGroup ?? r.group ?? "").toString().trim();
      const sub =
        (r["Sub Component"] ?? r["sub component"] ?? r.subComponent ?? r.sub ?? "").toString().trim();
      const code = (r["Code"] ?? r["code"] ?? r.kode ?? "").toString().trim();
      if (!group || !sub) continue;
      if (!byGroup[group]) byGroup[group] = [];
      byGroup[group].push({ name: sub, code });
    }
    const groups = Object.keys(byGroup).sort((a,b)=>a.localeCompare(b));
    KOM_DATA = { groups, byGroup };
  } catch (e) {
    console.error("[Komponen] load error:", e);
    KOM_DATA = { groups: [], byGroup: {} };
  }
}

function fillBabOptions(selectEl) {
  if (!selectEl) return;
  const opts = ['<option value="">Pilih Bab…</option>'].concat(
    KOM_DATA.groups.map(g => `<option value="${g}">${g}</option>`)
  ).join("");
  selectEl.innerHTML = opts;
  selectEl.disabled = KOM_DATA.groups.length === 0;
}

function fillSubOptions(selectEl, group) {
  if (!selectEl) return;
  const subs = KOM_DATA.byGroup[group] || [];
  const opts = ['<option value="">Pilih Sub…</option>'].concat(
    subs.map(s => `<option value="${s.name}" data-code="${s.code}">${s.name}</option>`)
  ).join("");
  selectEl.innerHTML = opts;
  selectEl.disabled = subs.length === 0;
}

// ==========================
// FORM INSPEKSI (jalan hanya jika #myForm ada)
// ==========================
(() => {
  const form = document.getElementById('myForm');
  if (!form) return; // berhenti jika ini bukan halaman form

  const itemsTableBody = document.querySelector('#itemsTable tbody');
  const output = document.getElementById('output');
  const overlay = document.getElementById('overlay');
  let currentMainRow = null;

  // Set tanggal hari ini
  function setToday(){
    const el = document.getElementById('Date');
    if (!el) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    el.value = `${yyyy}-${mm}-${dd}`;
  }

  // === helper: kaitkan dropdown Bab/SubBab pada 1 baris ===
  function wireBabSubForRow(row){
    const babSel = row.querySelector('.babSelect');
    const subSel = row.querySelector('.subSelect');
    if (!babSel || !subSel) return;

    // isi Bab
    fillBabOptions(babSel);
    // kosongkan Sub
    fillSubOptions(subSel, "");

    babSel.addEventListener('change', () => {
      fillSubOptions(subSel, babSel.value);
    });

    // simpan subCode terpilih di data-bariss (opsional)
    subSel.addEventListener('change', () => {
      const opt = subSel.options[subSel.selectedIndex];
      row.dataset.subCode = opt?.dataset?.code || "";
    });
  }

  // Add row
  function addRow(){
    if (!itemsTableBody) return;
    const row = document.createElement('tr');
    row.className='main-row';
    row.innerHTML=`
      <td><input type="text" name="description[]" class="form-control" required></td>
      <td><input type="text" name="condition[]" class="form-control" required></td>
      <td>
        <input type="file" name="file[]" accept="image/*" class="form-control fileInput">
        <img class="img-preview" style="display:none;width:50px;">
      </td>
      <td><input type="text" name="partNumber[]" class="form-control"></td>
      <td><input type="text" name="namaBarang[]" class="form-control"></td>
      <td><input type="number" name="qty[]" class="form-control" min="0"></td>
      <td><input type="text" name="satuan[]" class="form-control"></td>

      <!-- Bab & Sub Bab di sini (setelah Satuan) -->
      <td><select name="bab[]" class="form-control babSelect" disabled></select></td>
      <td><select name="subBab[]" class="form-control subSelect" disabled></select></td>

      <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
      <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
    `;
    setupRow(row);
    itemsTableBody.appendChild(row);
    currentMainRow=row;

    // kaitkan dropdown untuk baris baru
    wireBabSubForRow(row);
  }

  // Add sub row
  function addSubRow(){
    if (!itemsTableBody) return;
    if(!currentMainRow){ alert('Tambahkan baris utama terlebih dahulu!'); return; }
    const row = document.createElement('tr');
    row.className='sub-row';
    row.innerHTML=`
      <td class="no-border-left"></td>
      <td class="no-border-left"></td>
      <td class="no-border-left"></td>
      <td><input type="text" name="partNumber[]" class="form-control"></td>
      <td><input type="text" name="namaBarang[]" class="form-control"></td>
      <td><input type="number" name="qty[]" class="form-control" min="0"></td>
      <td><input type="text" name="satuan[]" class="form-control"></td>

      <!-- kolom Bab & Sub Bab dikosongkan agar alignment tabel tetap -->
      <td class="no-border-left"></td>
      <td class="no-border-left"></td>

      <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
      <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
    `;
    setupRow(row);

    let insertAfter = currentMainRow;
    let index = Array.from(itemsTableBody.children).indexOf(currentMainRow);
    for(let i=index+1;i<itemsTableBody.children.length;i++){
      if(itemsTableBody.children[i].classList.contains('sub-row')) insertAfter=itemsTableBody.children[i];
      else break;
    }
    insertAfter.after(row);
  }

  // Setup row: remove & file preview (+ pilih Bab/SubBab)
  function setupRow(row){
    const fileInput = row.querySelector('.fileInput');
    const imgPreview = row.querySelector('.img-preview');
    if(fileInput && imgPreview){
      fileInput.addEventListener('change', e=>{
        const file = e.target.files[0];
        if(file){
          const reader = new FileReader();
          reader.onload=ev=>{
            imgPreview.src=ev.target.result;
            imgPreview.style.display='block';
          };
          reader.readAsDataURL(file);
        } else { imgPreview.src=''; imgPreview.style.display='none'; }
      });
    }
    row.querySelector('.removeRowBtn')?.addEventListener('click', ()=>{
      if (!itemsTableBody) return;
      if(row.classList.contains('main-row')){
        let i = Array.from(itemsTableBody.children).indexOf(row)+1;
        while(i<itemsTableBody.children.length && itemsTableBody.children[i].classList.contains('sub-row')){
          itemsTableBody.children[i].remove();
        }
      }
      row.remove();
      if(itemsTableBody.children.length===0) addRow();
    });
    row.addEventListener('click', ()=>{
      if(row.classList.contains('main-row')) currentMainRow=row;
      else{
        let mainRow = row.previousElementSibling;
        while(mainRow && !mainRow.classList.contains('main-row')) mainRow = mainRow.previousElementSibling;
        currentMainRow=mainRow;
      }
    });
  }

  // Tombol tambah row/sub-row
  document.getElementById('addRowBtn')?.addEventListener('click', addRow);
  document.getElementById('addSubRowBtn')?.addEventListener('click', addSubRow);

  // Baris awal
  addRow();

  // Kirim data ke Cloudflare (POST -> diteruskan ke Apps Script doPost)
  async function postToSheet(payload){
    try {
      const response = await fetch(WORKER_URL, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      });
      return await response.json();
    } catch (err) {
      console.error("Gagal kirim data:", err);
      return { success: false, message: "Gagal kirim data ke server Cloudflare." };
    }
  }

  // Submit form
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    overlay?.classList.remove('d-none');

    const rows = Array.from(itemsTableBody?.querySelectorAll('tr') || []);
    const items=[];
    for(let row of rows){
      const description = row.querySelector('input[name="description[]"]')?.value||'';
      const condition   = row.querySelector('input[name="condition[]"]')?.value||'';
      const partNumber  = row.querySelector('input[name="partNumber[]"]')?.value||'';
      const namaBarang  = row.querySelector('input[name="namaBarang[]"]')?.value||'';
      const qty         = row.querySelector('input[name="qty[]"]')?.value||0;
      const satuan      = row.querySelector('input[name="satuan[]"]')?.value||'';
      const masukFPB    = row.querySelector('input[name="masukFPB[]"]')?.checked||false;

      // Bab & Sub Bab
      const babSel      = row.querySelector('select[name="bab[]"]');
      const subSel      = row.querySelector('select[name="subBab[]"]');
      const bab         = babSel?.value || '';
      const subBab      = subSel?.value || '';
      const subCode     = subSel?.selectedOptions?.[0]?.dataset?.code || '';

      const fileInput = row.querySelector('input[type="file"]');
      let fileData = null;
      if(fileInput && fileInput.files[0]){
        fileData = await new Promise(resolve=>{
          const reader = new FileReader();
          reader.onload=e=>resolve(e.target.result);
          reader.readAsDataURL(fileInput.files[0]);
        });
      }
      items.push({
        description, condition, partNumber, namaBarang, qty, satuan, masukFPB,
        bab, subBab, subCode,                            // <— tambahan
        file:fileData, fileName:fileInput?.files[0]?.name,
        isSubRow:row.classList.contains('sub-row')
      });
    }

    const payload={
      action:'submitForm',
      date:document.getElementById('Date')?.value || '',
      site:document.querySelector('input[name="site"]')?.value || '',
      codeUnit:document.querySelector('input[name="codeUnit"]')?.value || '',
      hourMeter:document.querySelector('input[name="hourMeter"]')?.value || '',
      inspectedBy:document.querySelector('input[name="inspectedBy"]')?.value || '',
      priority:document.querySelector('input[name="priority"]')?.value || '',
      items
    };

    const result = await postToSheet(payload);
    overlay?.classList.add('d-none');
    if (output) {
      output.innerHTML = (result.message || 'Selesai')
        + (result.pdfUrl ? ` <a href="${result.pdfUrl}" target="_blank">Lihat PDF</a>` : '');
      output.classList.remove('d-none');
    }

    form.reset();
    if (itemsTableBody) {
      itemsTableBody.innerHTML='';
      addRow();
      // setelah reset, isi lagi Bab/SubBab untuk baris baru (kalau data sudah ada)
      wireBabSubForRow(itemsTableBody.querySelector('tr'));
    }
    setToday();
  });

  // Init form
  document.addEventListener("DOMContentLoaded", setToday);
  setToday();

  // === Load data komponen sekali di awal, lalu isi semua baris yang ada ===
  (async () => {
    await fetchKomponen();
    document.querySelectorAll('.babSelect').forEach(sel => fillBabOptions(sel));
    document.querySelectorAll('tr').forEach(tr => wireBabSubForRow(tr));
  })();

})();
