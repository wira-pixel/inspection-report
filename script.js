// ==========================
// KONFIGURASI GLOBAL
// ==========================
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; // konsisten pakai trailing slash

// --------------------------
// Lookup Bab/SubBab (global)
// --------------------------
let COMPONENT_LOOKUP = {
  groups: [], // ["ENGINE & RELATED PARTS", ...]
  subs:   []  // [{group:"ENGINE & RELATED PARTS", code:"111", name:"CYLINDER BLOCK"}, ...]
};

// Coba beberapa nama action agar kompatibel dengan Apps Script kamu
const LOOKUP_ACTIONS = ["getComponentMap", "getComponents", "getLookup"];

// Muat lookup dari Worker (Apps Script) — aman jika gagal
async function loadComponentLookup() {
  for (const action of LOOKUP_ACTIONS) {
    try {
      const res = await postToSheet({ action });
      if (res?.success && res?.data) {
        // Normalisasi minimal
        const groups = Array.isArray(res.data.groups) ? res.data.groups : [];
        const subs   = Array.isArray(res.data.subs)   ? res.data.subs   : [];

        // sort opsional agar rapi
        groups.sort((a,b)=>String(a).localeCompare(String(b)));
        subs.sort((a,b)=> String(a.group||"").localeCompare(String(b.group||"")) ||
                          String(a.name||"").localeCompare(String(b.name||"")));

        COMPONENT_LOOKUP.groups = groups;
        COMPONENT_LOOKUP.subs   = subs;
        return true;
      }
    } catch (e) {
      // lanjut coba action berikutnya
    }
  }
  // jika semua gagal
  COMPONENT_LOOKUP.groups = [];
  COMPONENT_LOOKUP.subs   = [];
  return false;
}

// Helper render opsi Bab
function fillBabOptions(selectEl) {
  if (!selectEl) return;
  const opts = ['<option value="">Pilih Bab…</option>']
    .concat(COMPONENT_LOOKUP.groups.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`));
  selectEl.innerHTML = opts.join("");
}

// Helper render opsi Sub Bab sesuai Bab
function fillSubOptions(selectEl, babValue) {
  if (!selectEl) return;
  const list = COMPONENT_LOOKUP.subs.filter(s => String(s.group||"") === String(babValue||""));
  const opts = ['<option value="">Pilih Sub Bab…</option>']
    .concat(list.map(s => {
      // simpan gabungan code + name supaya mudah dipakai nanti, atau name saja jika mau
      const label = s.code ? `${s.code} — ${s.name}` : s.name;
      const val   = s.name; // kirim nama sub saja (ubah ke s.code jika mau code)
      return `<option value="${escapeHtml(val)}" data-code="${escapeHtml(s.code||'')}">${escapeHtml(label)}</option>`;
    }));
  selectEl.innerHTML = opts.join("");
  selectEl.disabled = (list.length === 0);
}

// Aman untuk innerHTML (sederhana)
function escapeHtml(s) {
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
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

  // -------- Tambah Baris (main) --------
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
    <td>
      <select name="bab[]" class="form-control babSelect"></select>
    </td>
    <td>
      <select name="subBab[]" class="form-control subSelect" disabled></select>
    </td>
    <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
    <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
  `;
  setupRow(row);
  itemsTableBody.appendChild(row);
  currentMainRow=row;
}


  // -------- Tambah Baris (sub) --------
 function addSubRow(){
  if (!itemsTableBody) return;
  if(!currentMainRow){ alert('Tambahkan baris utama terlebih dahulu!'); return; }
  const row = document.createElement('tr');
  row.className='sub-row';
  row.innerHTML=`
    <td class="no-border-left"></td>   <!-- Description (kosong) -->
    <td class="no-border-left"></td>   <!-- Condition (kosong) -->
    <td class="no-border-left"></td>   <!-- Gambar (kosong) -->
    <td><input type="text" name="partNumber[]" class="form-control"></td>
    <td><input type="text" name="namaBarang[]" class="form-control"></td>
    <td><input type="number" name="qty[]" class="form-control" min="0"></td>
    <td><input type="text" name="satuan[]" class="form-control"></td>
    <td class="no-border-left"></td>   <!-- Bab (kosong) -->
    <td class="no-border-left"></td>   <!-- Sub Bab (kosong) -->
    <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
    <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
  `;
  setupRow(row);

  // sisipkan setelah sub-row terakhir dari main-row aktif
  let insertAfter = currentMainRow;
  let index = Array.from(itemsTableBody.children).indexOf(currentMainRow);
  for(let i=index+1;i<itemsTableBody.children.length;i++){
    if(itemsTableBody.children[i].classList.contains('sub-row')) insertAfter=itemsTableBody.children[i];
    else break;
  }
  insertAfter.after(row);
}


  // -------- Setup row: remove, file preview, dependent select --------
  function setupRow(row){
    // File preview
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

    // Hapus baris
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

    // Track main-row aktif
    row.addEventListener('click', ()=>{
      if(row.classList.contains('main-row')) currentMainRow=row;
      else{
        let mainRow = row.previousElementSibling;
        while(mainRow && !mainRow.classList.contains('main-row')) mainRow = mainRow.previousElementSibling;
        currentMainRow=mainRow;
      }
    });

    // Dependent select (hanya untuk main-row)
    if (row.classList.contains('main-row')) {
      const babSel = row.querySelector('.babSelect');
      const subSel = row.querySelector('.subSelect');
      if (babSel) fillBabOptions(babSel);
      if (subSel) { subSel.innerHTML = '<option value="">Pilih Sub Bab…</option>'; subSel.disabled = true; }

      babSel?.addEventListener('change', ()=>{
        const v = babSel.value || "";
        fillSubOptions(subSel, v);
      });
    }
  }

  // Tombol tambah row/sub-row
  document.getElementById('addRowBtn')?.addEventListener('click', addRow);
  document.getElementById('addSubRowBtn')?.addEventListener('click', addSubRow);

  // -------------------------
  // Kirim data ke Cloudflare
  // -------------------------
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

  // -------------------------
  // Submit form
  // -------------------------
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

      // Tambahan: bab & subBab (untuk baris utama; sub-row akan kosong)
      const bab    = row.querySelector('select[name="bab[]"]')?.value || '';
      const subBab = row.querySelector('select[name="subBab[]"]')?.value || '';

      // File (opsional)
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
        bab, subBab,                                       // <— ikut dikirim
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
    }
    setToday();
  });

  // -------------------------
  // Init form (async: load lookup dulu)
  // -------------------------
  async function initForm() {
    setToday();
    await loadComponentLookup();     // muat data Bab/SubBab (aman jika gagal)
    if (itemsTableBody && itemsTableBody.children.length===0) {
      addRow();                      // buat baris awal setelah lookup masuk
    }
  }

  document.addEventListener("DOMContentLoaded", initForm);
})();

