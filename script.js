const SHEET_ID = "https://script.google.com/macros/s/AKfycbzd7kcuOPXVau9c00BsM-CM9UhS2mlM2bqziImG_qcinfm__w3yepE6SogEa0rKRbKTvg/exec"; // ganti dengan ID spreadsheet kamu
const SHEET_NAME = "Sheet1"; // ganti sesuai nama sheet

function doPost(e) {
  try {
    // Izinkan CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // Parsing body JSON dari request
    const data = JSON.parse(e.postData.contents);

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

    // Parse tabel dari JSON string ke array
    const tableData = JSON.parse(data.table);

    // Loop setiap baris tabel dan simpan
    tableData.forEach(row => {
      sheet.appendRow([
        new Date(),            // Timestamp
        data.site || "",       // Site
        data.reportDate || "", // Report Date
        data.kodeUnit || "",   // Kode Unit
        data.hourMeter || "",  // Hour Meter
        data.reportedBy || "", // Reported by
        data.inspBy || "",     // Insp by
        data.priority || "",   // Priority
        row.description || "", // Description dari tabel
        row.condition || ""    // Condition dari tabel
      ]);
    });

    return ContentService
      .createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(corsHeaders);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({status: "error", message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}

// Agar preflight OPTIONS tidak error
function doOptions(e) {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
