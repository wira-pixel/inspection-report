function setToday() {
  const el = document.getElementById('Date');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  el.value = `${yyyy}-${mm}-${dd}`;
}
setToday();

const itemsTableBody = document.querySelector('#itemsTable tbody');
const form = document.getElementById('myForm');
const output = document.getElementById('output');
let currentMainRow = null;

// URL Cloudflare Worker → ganti dengan URL Worker kamu
const CLOUD_FLARE_URL = "https://forminspek.saya.workers.dev";

// Fungsi tambah item utama (semua kolom)
function addRow() {
  const row = document.createElement('tr');
  row.className = 'main-row';
  row.innerHTML = `
    <td><input type="text" name="description[]" class="form-control" placeholder="..." required></td>
    <td><input type="text" name="condition[]" class="form-control" placeholder="..." required></td>
    <td>
      <input type="file" name="file[]" accept="image/*" class="form-control fileInput">
      <img class="img-preview" style="display:none;">
    </td>
    <td><input type="text" name="partNumber[]" class="form-control" placeholder="Part Number"></td>
    <td><input type="text" name="namaBarang[]" class="form-control" placeholder="Nama Barang"></td>
    <td><input type="number" name="qty[]" class="form-control" placeholder="0" min="0"></td>
    <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
    <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
  `;
  setupRow(row);
  itemsTableBody.appendChild(row);
  currentMainRow = row;
}

// Fungsi tambah Baris FPB (hanya kolom hitam)
function addSubRow() {
  if (!currentMainRow) {
    alert('Tambahkan baris utama terlebih dahulu!');
    return;
  }
  
  const row = document.createElement('tr');
  row.className = 'sub-row';
  row.innerHTML = `
    <td class="no-border-left"></td>
    <td class="no-border-left"></td>
    <td class="no-border-left"></td>
    <td><input type="text" name="partNumber[]" class="form-control" placeholder="Part Number"></td>
    <td><input type="text" name="namaBarang[]" class="form-control" placeholder="Nama Barang"></td>
    <td><input type="number" name="qty[]" class="form-control" placeholder="0" min="0"></td>
    <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
    <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
  `;
  setupRow(row, true);
  
  // Insert after currentMainRow or after last sub-row of currentMainRow
  const mainRowIndex = Array.from(itemsTableBody.children).indexOf(currentMainRow);
  let insertAfter = currentMainRow;
  
  // Find the last sub-row of this main row
  for (let i = mainRowIndex + 1; i < itemsTableBody.children.length; i++) {
    if (itemsTableBody.children[i].classList.contains('sub-row')) {
      insertAfter = itemsTableBody.children[i];
    } else {
      break;
    }
  }
  
  insertAfter.after(row);
}

function setupRow(row, isSub=false) {
  const fileInput = row.querySelector('.fileInput');
  const imgPreview = row.querySelector('.img-preview');
  if(fileInput){
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if(file){
        const reader = new FileReader();
        reader.onload = ev => {
          imgPreview.src = ev.target.result;
          imgPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        imgPreview.src = '';
        imgPreview.style.display = 'none';
      }
    });
  }
  
  row.querySelector('.removeRowBtn').addEventListener('click', () => {
    if (row.classList.contains('main-row')) {
      const rowIndex = Array.from(itemsTableBody.children).indexOf(row);
      for (let i = rowIndex + 1; i < itemsTableBody.children.length; i++) {
        if (itemsTableBody.children[i].classList.contains('sub-row')) {
          itemsTableBody.children[i].remove();
          i--;
        } else {
          break;
        }
      }
    }
    row.remove();
    if(itemsTableBody.children.length === 0) addRow();
  });
  
  row.addEventListener('click', () => {
    if (row.classList.contains('main-row')) {
      currentMainRow = row;
    } else {
      let mainRow = row.previousElementSibling;
      while (mainRow && !mainRow.classList.contains('main-row')) {
        mainRow = mainRow.previousElementSibling;
      }
      currentMainRow = mainRow;
    }
  });
}

document.getElementById('addRowBtn').addEventListener('click', addRow);
document.getElementById('addSubRowBtn').addEventListener('click', addSubRow);
addRow();

// Submit form ke Cloudflare Worker
form.addEventListener('submit', async e=>{
  e.preventDefault();
  output.classList.add('d-none');
  const items = [];

  const rows = Array.from(itemsTableBody.querySelectorAll('tr'));
  for(let row of rows){
    const description = row.querySelector('input[name="description[]"]')?.value || '';
    const condition = row.querySelector('input[name="condition[]"]')?.value || '';
    const partNumber = row.querySelector('input[name="partNumber[]"]')?.value || '';
    const namaBarang = row.querySelector('input[name="namaBarang[]"]')?.value || '';
    const qty = row.querySelector('input[name="qty[]"]')?.value || 0;
    const masukFPB = row.querySelector('input[name="masukFPB[]"]')?.checked || false;

    const fileInput = row.querySelector('input[type="file"]');
    let fileData = null;
    if(fileInput && fileInput.files[0]){
      fileData = await new Promise(resolve=>{
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(fileInput.files[0]);
      });
    }

    items.push({ 
      description, 
      condition, 
      partNumber, 
      namaBarang, 
      qty, 
      masukFPB, 
      file: fileData, 
      fileName: fileInput?.files[0]?.name,
      isSubRow: row.classList.contains('sub-row')
    });
  }

  const formData = {
    date: form.date.value,
    site: form.site.value,
    codeUnit: form.codeUnit.value,
    hourMeter: form.hourMeter.value,
    inspectedBy: form.inspectedBy.value,
    priority: form.priority.value,
    items
  };

  try {
    const res = await fetch(CLOUD_FLARE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    const result = await res.json();
    
    output.innerHTML = result.message + (result.pdfUrl ? ` <a href="${result.pdfUrl}" target="_blank">Lihat PDF</a>` : '');
    output.classList.remove('d-none');
    form.reset();
    itemsTableBody.innerHTML = '';
    addRow();
    setToday();
  } catch (err) {
    console.error("Error submit:", err);
    output.innerHTML = "❌ Gagal mengirim data.";
    output.classList.remove('d-none');
  }
});
