<script>
// ==========================
// KONFIGURASI GLOBAL
// ==========================
  
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; // konsisten pakai trailing slash

// ==========================
// BLOK 1 — FORM INSPEKSI (jalan hanya jika #myForm ada)
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

  // Add row
  function addRow(){
    if (!itemsTableBody) return;
    const row = document.createElement('tr');
    row.className='main-row';
    row.innerHTML=`
      <td><input type="text" name="description[]" class="form-control" required></td>
      <td><input type="text" name="condition[]" class="form-control" required></td>
      <td><input type="file" name="file[]" accept="image/*" class="form-control fileInput"><img class="img-preview" style="display:none;width:50px;"></td>
      <td><input type="text" name="partNumber[]" class="form-control"></td>
      <td><input type="text" name="namaBarang[]" class="form-control"></td>
      <td><input type="number" name="qty[]" class="form-control" min="0"></td>
      <td><input type="text" name="satuan[]" class="form-control"></td>
      <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
      <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
    `;
    setupRow(row);
    itemsTableBody.appendChild(row);
    currentMainRow=row;
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

  // Setup row: remove & file preview
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

  // Tombol tambah row/sub-row (aman bila tombol tidak ada di halaman lain)
  document.getElementById('addRowBtn')?.addEventListener('click', addRow);
  document.getElementById('addSubRowBtn')?.addEventListener('click', addSubRow);

  // Baris awal
  addRow();

  // KIRIM DATA KE CLOUDFLARE (POST -> diteruskan ke Apps Script doPost)
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
      const condition = row.querySelector('input[name="condition[]"]')?.value||'';
      const partNumber = row.querySelector('input[name="partNumber[]"]')?.value||'';
      const namaBarang = row.querySelector('input[name="namaBarang[]"]')?.value||'';
      const qty = row.querySelector('input[name="qty[]"]')?.value||0;
      const satuan = row.querySelector('input[name="satuan[]"]')?.value||'';
      const masukFPB = row.querySelector('input[name="masukFPB[]"]')?.checked||false;
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

  // Init form
  document.addEventListener("DOMContentLoaded", setToday);
  setToday();
})();

// ==========================
// BLOK 2 — DATABASE (jalan hanya jika #data-table ada)
// ==========================
(() => {
  const tableEl = document.querySelector("#data-table");
  if (!tableEl) return; // berhenti jika ini bukan halaman database

  // Global data
  let globalDataDB = [];

  // Render data ke tabel
  function renderTableDB(dataArray) {
    const tbody = document.querySelector("#data-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    dataArray.forEach(row => {
      const tr = document.createElement("tr");

      const codeUnit  = row["Code Unit"]  ?? row["codeUnit"]  ?? "-";
      const date      = row["Date"]       ?? row["date"]      ?? "-";
      const hourMeter = row["Hour Meter"] ?? row["hourMeter"] ?? "-";

      tr.innerHTML = `
        <td>${codeUnit}</td>
        <td>${date}</td>
        <td>${hourMeter}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Load database dari server (GET ?action=getInspeksi -> Apps Script doGet)
  async function loadDatabase() {
    try {
      const response = await fetch(`${WORKER_URL}?action=getInspeksi`); // GET
      if (!response.ok) throw new Error("HTTP Error " + response.status);

      const data = await response.json();
      console.log("Database JSON:", data);

      if (!data.success || !Array.isArray(data.data)) {
        console.error("Data database tidak valid:", data);
        return;
      }

      globalDataDB = data.data;
      renderTableDB(globalDataDB);

    } catch (err) {
      console.error("Gagal ambil data database:", err);
    }
  }

  // Filter & Search
  const searchInput = document.getElementById("searchInput");
  const minHour     = document.getElementById("minHour");
  const maxHour     = document.getElementById("maxHour");
  const filterBtn   = document.getElementById("filterBtn");
  const resetBtn    = document.getElementById("resetBtn");

  filterBtn?.addEventListener("click", () => {
    const searchText = (searchInput?.value || "").toString().toLowerCase();
    const min = parseFloat(minHour?.value) || 0;
    const max = parseFloat(maxHour?.value) || Infinity;

    const filteredData = globalDataDB.filter(row => {
      const codeUnitRaw = row["Code Unit"] ?? row["codeUnit"] ?? "";
      const codeUnit = codeUnitRaw?.toString().toLowerCase() || "";
      const hourMeterRaw = row["Hour Meter"] ?? row["hourMeter"] ?? 0;
      const hourMeter = parseFloat(hourMeterRaw) || 0;

      return codeUnit.includes(searchText) && hourMeter >= min && hourMeter <= max;
    });

    renderTableDB(filteredData);
  });

  resetBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (minHour) minHour.value = "";
    if (maxHour) maxHour.value = "";
    renderTableDB(globalDataDB);
  });

  // Auto load
  document.addEventListener("DOMContentLoaded", loadDatabase);
  loadDatabase();
})();
</script>

