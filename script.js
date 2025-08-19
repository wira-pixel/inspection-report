document.addEventListener('DOMContentLoaded', () => {
    // URL Web App Apps Script / Worker
    const GOOGLE_APP_SCRIPT_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; 
    // ganti dengan URL kamu sendiri

    const inspectionBody = document.getElementById('inspection-body');
    const addRowBtn = document.getElementById('add-row');
    const savePdfBtn = document.getElementById('save-pdf');

    let rowCount = 1;

    // Fungsi untuk menambah baris baru
    addRowBtn.addEventListener('click', () => {
        rowCount++;
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${rowCount}</td>
            <td><input type="text" placeholder="Description / Failure" oninput="this.value = this.value.toUpperCase()" onkeydown="handleNavigation(event)"></td>
            <td><input type="text" placeholder="Condition" oninput="this.value = this.value.toUpperCase()" onkeydown="handleNavigation(event)"></td>
            <td><input type="file" accept="image/*" onchange="previewImage(this)"></td>
        `;
        inspectionBody.appendChild(newRow);
    });

    // Fungsi untuk simpan ke Sheet lalu bikin PDF
    savePdfBtn.addEventListener('click', () => {
        // Ambil data header
        const formData = {};
        document.querySelectorAll('.info-group input[type="text"]').forEach(input => {
            formData[input.id] = input.value;
        });

        // Ambil data tabel
        const tableData = [];
        document.querySelectorAll('#inspection-body tr').forEach(row => {
            const descriptionInput = row.querySelector('td:nth-child(2) input');
            const conditionInput = row.querySelector('td:nth-child(3) input');

            if (descriptionInput && conditionInput) {
                tableData.push({
                    description: descriptionInput.value,
                    condition: conditionInput.value
                });
            }
        });

        // Gabungkan
        const combinedData = {
            ...formData,
            table: JSON.stringify(tableData)
        };

        // Kirim ke Apps Script / Worker
        fetch(GOOGLE_APP_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(combinedData),
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.text())
        .then(result => {
            console.log("Data saved:", result);
            alert("Data berhasil disimpan ke Google Sheets!");

            // === lanjut bikin PDF ===
            document.getElementById('add-row').style.display = 'none';
            document.getElementById('save-pdf').style.display = 'none';

            const imagePromises = [];
            const fileInputs = document.querySelectorAll('#inspection-body input[type="file"]');
            fileInputs.forEach(input => {
                if (input.files.length > 0) {
                    imagePromises.push(new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const cell = input.parentElement;
                            cell.innerHTML = '';
                            const img = document.createElement('img');
                            img.src = e.target.result;
                            img.className = 'photo-preview-pdf';
                            cell.appendChild(img);
                            resolve();
                        };
                        reader.readAsDataURL(input.files[0]);
                    }));
                }
            });

            Promise.all(imagePromises).then(() => {
                const element = document.querySelector('.container');
                const options = {
                    margin: 1,
                    filename: 'Laporan_Inspeksi.pdf',
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 4, dpi: 192, letterRendering: true, useCORS: true },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };
                html2pdf().from(element).set(options).save().then(() => {
                    document.getElementById('add-row').style.display = 'inline-block';
                    document.getElementById('save-pdf').style.display = 'inline-block';
                    location.reload();
                });
            });
        })
        .catch(error => {
            console.error("Error saving data:", error);
            alert("Gagal menyimpan data ke Google Sheets.");
        });
    });

    const headerInputs = document.querySelectorAll('.info-group input[type="text"]');
    headerInputs.forEach(input => {
        input.addEventListener('keydown', handleNavigation);
    });

    inspectionBody.addEventListener('keydown', handleNavigation);
});

// Fungsi navigasi input
function handleNavigation(e) {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="file"]'));
    const currentIndex = inputs.indexOf(e.target);

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex > -1 && currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
            inputs[currentIndex - 1].focus();
        }
    }
}

// Fungsi preview gambar
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            let img = input.nextElementSibling;
            if (!img || img.tagName !== 'IMG') {
                img = document.createElement('img');
                img.className = 'photo-preview';
                input.parentNode.appendChild(img);
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}
