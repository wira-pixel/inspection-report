// HANYA SATU handler submit di file ini
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  output.classList.add('d-none');
  overlay.classList.remove('d-none'); // kunci layar

  const items = [];
  const rows = Array.from(itemsTableBody.querySelectorAll('tr'));

  for (let row of rows) {
    const description = row.querySelector('input[name="description[]"]')?.value || '';
    const condition   = row.querySelector('input[name="condition[]"]')?.value || '';
    const partNumber  = row.querySelector('input[name="partNumber[]"]')?.value || '';
    const namaBarang  = row.querySelector('input[name="namaBarang[]"]')?.value || '';
    const qty         = row.querySelector('input[name="qty[]"]')?.value || 0;
    const satuan      = row.querySelector('input[name="satuan[]"]')?.value || '';
    const masukFPB    = row.querySelector('input[name="masukFPB[]"]')?.checked || false;

    const fileInput = row.querySelector('input[type="file"]');
    let fileData = null;
    if (fileInput && fileInput.files[0]) {
      fileData = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.readAsDataURL(fileInput.files[0]);
      });
    }

    items.push({
      description, condition, partNumber, namaBarang,
      qty, satuan, masukFPB,
      file: fileData,
      fileName: fileInput?.files[0]?.name,
      isSubRow: row.classList.contains('sub-row')
    });
  }

  // ⬇️ Deklarasi payload HARUS ada sebelum fetch
  const payload = {
    date: form.date.value,
    site: form.site.value,
    codeUnit: form.codeUnit.value,
    hourMeter: form.hourMeter.value,
    inspectedBy: form.inspectedBy.value,
    priority: form.priority.value,
    items
  };

  try {
    // Debug guard (optional): pastikan variabel ada
    // console.log('payload keys:', Object.keys(payload));

    const res = await fetch(CLOUD_FLARE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) // ⬅️ pakai payload, bukan formData
    });

    const result = await res.json();

    overlay.classList.add('d-none');
    output.innerHTML = result.message +
      (result.pdfUrl ? ` <a href="${result.pdfUrl}" target="_blank">Lihat PDF</a>` : '');
    output.classList.remove('d-none');

    form.reset();
    itemsTableBody.innerHTML = '';
    addRow();
    setToday();

  } catch (err) {
    overlay.classList.add('d-none');
    console.error('Error submit:', err);
    output.innerHTML = '❌ Gagal mengirim data.';
    output.classList.remove('d-none');
  }
});
