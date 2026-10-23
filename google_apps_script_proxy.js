/**
 * GOOGLE APPS SCRIPT WEBHOOK / PROXY CHO APPSHEET
 * Tích hợp chuẩn xác phương thức addData(Du_lieu, table) của bạn
 * -------------------------------------------------------------------------
 * HƯỚNG DẪN 3 BƯỚC ĐƠN GIẢN:
 * 1. Mở https://script.google.com/ và tạo một "Dự án mới" (New project).
 * 2. Xóa code cũ, dán toàn bộ nội dung file này vào `Code.gs`.
 * 3. Bấm "Triển khai" (Deploy) > "Triển khai mới" (New deployment):
 *    - Chọn loại: "Ứng dụng web" (Web app)
 *    - Thực thi dưới dạng: "Tôi" (Me)
 *    - Ai có quyền truy cập: "Bất kỳ ai" (Anyone)
 * 4. Nhấn "Triển khai", cấp quyền và Copy URL Web App (dạng https://script.google.com/macros/s/.../exec).
 * 5. Dán URL đó vào ô "Custom Webhook / Google Apps Script Proxy URL" trên Form Khảo Sát!
 */

var YOUR_APPSHEET_ACCESS_KEY = "V2-QiAE6-IblOJ-pV3Qo-WziBF-bwrlO-oybzd-NucjK-yjL2j";
var YOUR_APP_ID = "0e018833-2c30-4fe0-b5a0-01de0ed0352c";
var table = "Du lieu";

// Hàm xử lý khi Form HTML gửi request POST đến Web App
function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var requestJson = JSON.parse(rawData);

    // Lấy dữ liệu Rows gửi từ Form HTML
    var Du_lieu = requestJson.Rows || [];
    var targetTable = requestJson.Table || table;

    // Gọi hàm addData của bạn
    var resultText = addData(Du_lieu, targetTable);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", info: resultText }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Hàm addData nguyên bản từ bạn
function addData(Du_lieu, table) {
  var newRecord = Du_lieu;
  var appsheetUrl = `https://www.appsheet.com/api/v2/apps/${YOUR_APP_ID}/tables/${encodeURIComponent(table)}/Action`;
  var payload = {
    Action: 'Add',
    Properties: {
      Locale: 'en-US'
    },
    Rows: newRecord
  };
  var options = {
    method: 'POST',
    contentType: 'application/json',
    headers: { 'applicationAccessKey': YOUR_APPSHEET_ACCESS_KEY },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload)
  };

  var response = UrlFetchApp.fetch(appsheetUrl, options);
  var responseText = response.getContentText();
  console.log("info:", responseText);

  var statusCode = response.getResponseCode();
  if (statusCode >= 400) {
    throw new Error("Lỗi AppSheet (" + statusCode + "): " + responseText);
  }

  return responseText;
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "running", message: "Google Apps Script Webhook is active!" }))
    .setMimeType(ContentService.MimeType.JSON);
}
