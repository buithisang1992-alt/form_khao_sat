# Hướng Dẫn Sử Dụng Form Khảo Sát & Kết Nối Google AppSheet API

Biểu mẫu thu thập dữ liệu chuyên nghiệp được xây dựng bằng **HTML, CSS và JavaScript thuần (Vanilla)**, hỗ trợ đầy đủ 9 trường thông tin, chữ ký điện tử số canvas và tải/nén ảnh Base64.

---

## 1. Danh Sách Các Trường Dữ Liệu
Biểu mẫu bao gồm đầy đủ 9 trường theo đúng yêu cầu:
1. **`ID`**: Mã định danh duy nhất (tự động tạo dạng `KS-YYMMDD-XXXXX`, có nút tạo mới).
2. **`Thoi_gian`**: Thời gian gửi khảo sát thời gian thực (`YYYY-MM-DD HH:mm:ss`, có nút cập nhật).
3. **`Ho_va_ten`**: Họ và tên khách hàng.
4. **`Nha_mang`**: Nhà mạng viễn thông (Viettel, Vinaphone, Mobifone, Vietnamobile, Wintel, FPT...).
5. **`San_pham`**: Sản phẩm / Dịch vụ khảo sát.
6. **`So_dien_thoai`**: Số điện thoại liên hệ (chuẩn di động Việt Nam 10 chữ số).
7. **`Chu_ky`**: Chữ ký điện tử vẽ trực tiếp trên màn hình cảm ứng hoặc chuột (tự động xuất Base64 PNG).
8. **`Hinh_anh`**: Ảnh chứng thực (hỗ trợ kéo thả, tự động nén kích thước tối ưu và chuyển sang Base64).
9. **`Email`**: Địa chỉ email khách hàng (kiểm tra định dạng email chuẩn).

---

## 2. Cấu Trúc Gọi Google AppSheet API v2

Mã JavaScript thực hiện gửi yêu cầu `POST` chuẩn REST API v2 của AppSheet:

### Endpoint:
```http
POST https://api.appsheet.com/api/v2/apps/{appId}/tables/{tableName}/Action
```

### Headers:
```http
ApplicationAccessKey: YOUR_APPLICATION_ACCESS_KEY
Content-Type: application/json
```

### Body Payload (JSON):
```json
{
  "Action": "Add",
  "Properties": {
    "Locale": "vi-VN",
    "Timezone": "SE Asia Standard Time"
  },
  "Rows": [
    {
      "ID": "KS-261021-9AF1",
      "Thoi_gian": "2026-10-21 20:55:00",
      "Ho_va_ten": "Nguyễn Văn An",
      "Nha_mang": "Viettel",
      "San_pham": "Gói Cước 5G Doanh Nghiệp",
      "So_dien_thoai": "0912345678",
      "Chu_ky": "data:image/png;base64,...",
      "Hinh_anh": "data:image/jpeg;base64,...",
      "Email": "nguyenvanan@gmail.com"
    }
  ]
}
```

---

## 3. Cách Lấy Thông Tin Kết Nối Từ AppSheet
1. Mở ứng dụng trên trang **AppSheet** (https://www.appsheet.com).
2. Vào mục **Manage** (hoặc biểu tượng bánh răng Cài đặt) > **Integrations** > **External API**.
3. Bật **Enable** mục API.
4. Nhấn **Create Application Access Key** và copy chuỗi khóa này.
5. Lấy **App ID** (hiển thị trên đường link URL của ứng dụng hoặc trong mục API).
6. Tên bảng (**Table Name**): Tên bảng dữ liệu nhận kết quả trong AppSheet (ví dụ: `Khao_Sat`).
7. Nhấn nút **"Cấu hình API"** ở góc trên bên phải trang web của form và điền các thông số trên (thông tin sẽ được lưu an toàn trong trình duyệt của bạn).

---

## 4. Giải Quyết Lỗi CORS Khi Gọi Từ Trình Duyệt Web (Nếu Có)
> **Lưu ý:** Vì chính sách bảo mật trình duyệt (Same-Origin Policy / CORS), khi trang web chạy trực tiếp trên máy client mà gửi request tới `api.appsheet.com`, trình duyệt có thể chặn kết nối nếu server không cấu hình `Access-Control-Allow-Origin`.

Để khắc phục 100%, bạn có thể dùng **Google Apps Script** làm Webhook trung gian:
1. Mở [script.google.com](https://script.google.com/) > Tạo dự án mới.
2. Dán nội dung trong file [google_apps_script_proxy.js](file:///c:/Users/USER/OneDrive/Desktop/Form_khao_sat/google_apps_script_proxy.js) vào.
3. Điền `APP_ID` và `ACCESS_KEY` của AppSheet vào code.
4. Chọn **Deploy** (Triển khai) > **New deployment** > Chọn loại **Web app**:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
5. Copy URL Web app (dạng `https://script.google.com/macros/s/.../exec`) dán vào ô **"Custom Webhook / Google Apps Script Proxy URL"** trong cửa sổ Cấu hình API của Form.
