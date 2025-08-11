document.addEventListener('DOMContentLoaded', () => {
    // Ganti dengan URL Web App Apps Script kamu
    const GOOGLE_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFFMcTR3-g5nq6jsH2YlUg8CrnCbab1JMQ5PAMhdVMzZw7WRf8akYsHHLhkB3M6rfJ4g/exec";
    
    const inspectionBody = document.getElementById('inspection-body');
    const addRowBtn = document.getElementById('add-row');
    const savePdfBtn = document.getElementById('save-pdf');
    let rowCount = 1;

    // Tambah baris baru di tabel
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

    // Simpan ke Google Sheets & buat PDF
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

        // Kirim ke Apps Script
        fetch(GOOGLE_APP_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(combinedData)
        })
        .then(res => res.json())
        .then(data => {
            console.log('Response:', data);
            alert('Data berhasil disimpan!');

            // (Opsional) Lanjut buat PDF
            document.getElementById('add-row').style.display = 'none';
            document.getElementById('save-pdf').style.display = 'none';

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
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Gagal menyimpan data.');
        });
    });

    // Navigasi antar input
    const headerInputs = document.querySelectorAll('.info-group input[type="text"]');
    headerInputs.forEach(input => {
        input.addEventListener('keydown', handleNavigation);
    });
    inspectionBody.addEventListener('keydown', handleNavigation);
});

// Navigasi dengan Enter/Arrow
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

// Preview gambar
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
