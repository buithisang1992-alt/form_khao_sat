/**
 * Google AppSheet Survey Form Integration
 * Quản lý dữ liệu biểu mẫu khảo sát, chữ ký số, xử lý ảnh và gửi qua AppSheet API
 */

// ====================================================================
// CONSTANTS & USER APPSHEET CONFIGURATION
// ====================================================================
const DEFAULT_CONFIG = {
  APP_ID: "0e018833-2c30-4fe0-b5a0-01de0ed0352c",
  ACCESS_KEY: "V2-QiAE6-IblOJ-pV3Qo-WziBF-bwrlO-oybzd-NucjK-yjL2j",
  TABLE_NAME: "Du lieu", // Tên bảng chính xác trên AppSheet (có dấu cách)
  LOCALE: "en-US"
};

const CONFIG_KEYS = {
  APP_ID: 'appsheet_cfg_app_id',
  TABLE_NAME: 'appsheet_cfg_table_name',
  ACCESS_KEY: 'appsheet_cfg_access_key',
  CUSTOM_ENDPOINT: 'appsheet_cfg_custom_endpoint'
};

// State
let isDrawing = false;
let hasSigned = false;
let signatureCtx = null;
let lastX = 0;
let lastY = 0;

// DOM Elements
const form = document.getElementById('surveyForm');
const fieldId = document.getElementById('fieldId');
const fieldThoiGian = document.getElementById('fieldThoiGian');
const fieldHoVaTen = document.getElementById('fieldHoVaTen');
const fieldNhaMang = document.getElementById('fieldNhaMang');
const fieldSanPham = document.getElementById('fieldSanPham');
const fieldSoDienThoai = document.getElementById('fieldSoDienThoai');
const fieldEmail = document.getElementById('fieldEmail');
const fieldChuKyBase64 = document.getElementById('fieldChuKyBase64');
const fieldHinhAnhBase64 = document.getElementById('fieldHinhAnhBase64');

// Controls
const btnRegenId = document.getElementById('btnRegenId');
const btnRefreshTime = document.getElementById('btnRefreshTime');
const btnResetForm = document.getElementById('btnResetForm');
const btnSubmitForm = document.getElementById('btnSubmitForm');
const btnClearSignature = document.getElementById('btnClearSignature');
const signatureCanvas = document.getElementById('signatureCanvas');
const sigPadWrapper = document.getElementById('sigPadWrapper');

// Image upload controls
const imageDropZone = document.getElementById('imageDropZone');
const fieldHinhAnhInput = document.getElementById('fieldHinhAnhInput');
const dropZonePrompt = document.getElementById('dropZonePrompt');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const imageMetaInfo = document.getElementById('imageMetaInfo');
const btnRemoveImage = document.getElementById('btnRemoveImage');

// Modal Elements
const configModal = document.getElementById('configModal');
const btnOpenConfig = document.getElementById('btnOpenConfig');
const btnCloseConfigModal = document.getElementById('btnCloseConfigModal');
const btnSaveConfig = document.getElementById('btnSaveConfig');
const cfgAppId = document.getElementById('cfgAppId');
const cfgTableName = document.getElementById('cfgTableName');
const cfgAccessKey = document.getElementById('cfgAccessKey');
const cfgCustomEndpoint = document.getElementById('cfgCustomEndpoint');
const btnToggleKeyVis = document.getElementById('btnToggleKeyVis');
const keyVisIcon = document.getElementById('keyVisIcon');

// ====================================================================
// INITIALIZATION
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
  initSystemFields();
  initSignaturePad();
  initImageUploader();
  initConfigModal();
  bindFormEvents();
});

// ====================================================================
// 1. SYSTEM FIELDS: ID & THOI_GIAN
// ====================================================================
function generateId() {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `KS-${dateStr}-${rand}`;
}

function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function initSystemFields() {
  fieldId.value = generateId();
  fieldThoiGian.value = getFormattedDateTime();

  btnRegenId.addEventListener('click', () => {
    fieldId.value = generateId();
    showToast('info', 'Mã ID mới', 'Đã tạo mới mã định danh bản ghi.');
  });

  btnRefreshTime.addEventListener('click', () => {
    fieldThoiGian.value = getFormattedDateTime();
    showToast('info', 'Thời gian', 'Đã cập nhật thời gian theo giờ hiện tại.');
  });
}

// ====================================================================
// 2. SIGNATURE PAD (CANVAS)
// ====================================================================
function initSignaturePad() {
  signatureCtx = signatureCanvas.getContext('2d');
  
  function resizeCanvas() {
    const rect = sigPadWrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Lưu lại nét vẽ trước đó nếu có
    let tempImgData = null;
    if (hasSigned) {
      tempImgData = signatureCanvas.toDataURL();
    }

    signatureCanvas.width = rect.width * dpr;
    signatureCanvas.height = rect.height * dpr;
    signatureCtx.scale(dpr, dpr);

    signatureCtx.strokeStyle = '#0f172a';
    signatureCtx.lineWidth = 2.5;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';

    if (tempImgData) {
      const img = new Image();
      img.onload = () => {
        signatureCtx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = tempImgData;
    }
  }

  resizeCanvas();
  window.addEventListener('resize', debounce(resizeCanvas, 200));

  function getCoordinates(e) {
    const rect = signatureCanvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function startDrawing(e) {
    isDrawing = true;
    hasSigned = true;
    sigPadWrapper.classList.add('has-signed');
    clearFieldError('errorChuKy', sigPadWrapper.parentElement);

    const pos = getCoordinates(e);
    lastX = pos.x;
    lastY = pos.y;
    
    signatureCtx.beginPath();
    signatureCtx.arc(lastX, lastY, 1.25, 0, Math.PI * 2);
    signatureCtx.fillStyle = '#0f172a';
    signatureCtx.fill();
    signatureCtx.beginPath();
    signatureCtx.moveTo(lastX, lastY);
  }

  function draw(e) {
    if (!isDrawing) return;
    const pos = getCoordinates(e);

    signatureCtx.beginPath();
    signatureCtx.moveTo(lastX, lastY);
    signatureCtx.lineTo(pos.x, pos.y);
    signatureCtx.stroke();

    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    fieldChuKyBase64.value = signatureCanvas.toDataURL('image/png');
  }

  // Mouse events
  signatureCanvas.addEventListener('mousedown', startDrawing);
  signatureCanvas.addEventListener('mousemove', draw);
  signatureCanvas.addEventListener('mouseup', stopDrawing);
  signatureCanvas.addEventListener('mouseleave', stopDrawing);

  // Touch events (Điện thoại & Máy tính bảng)
  signatureCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e);
  }, { passive: false });

  signatureCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e);
  }, { passive: false });

  signatureCanvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopDrawing();
  }, { passive: false });

  // Xóa ký lại
  btnClearSignature.addEventListener('click', () => {
    const rect = sigPadWrapper.getBoundingClientRect();
    signatureCtx.clearRect(0, 0, rect.width, rect.height);
    hasSigned = false;
    sigPadWrapper.classList.remove('has-signed');
    fieldChuKyBase64.value = '';
  });
}

// ====================================================================
// 3. IMAGE UPLOAD & BASE64 COMPRESSION
// ====================================================================
function initImageUploader() {
  imageDropZone.addEventListener('click', () => {
    fieldHinhAnhInput.click();
  });

  // Drag and Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    imageDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      imageDropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    imageDropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      imageDropZone.classList.remove('dragover');
    });
  });

  imageDropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageFile(files[0]);
    }
  });

  fieldHinhAnhInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });

  btnRemoveImage.addEventListener('click', (e) => {
    e.stopPropagation();
    resetImage();
  });
}

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('error', 'Định dạng sai', 'Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const rawDataUrl = e.target.result;
    compressImage(rawDataUrl, 1000, 0.8, (compressedDataUrl, sizeKb) => {
      fieldHinhAnhBase64.value = compressedDataUrl;
      imagePreview.src = compressedDataUrl;
      imageMetaInfo.textContent = `Đã nén: ${sizeKb} KB`;

      dropZonePrompt.classList.add('hidden');
      imagePreviewContainer.classList.remove('hidden');
      clearFieldError('errorHinhAnh', imageDropZone.parentElement);
      showToast('info', 'Tải ảnh thành công', `Ảnh đã được xử lý tối ưu dung lượng (${sizeKb} KB).`);
    });
  };
  reader.readAsDataURL(file);
}

function compressImage(base64Src, maxDimension, quality, callback) {
  const img = new Image();
  img.src = base64Src;
  img.onload = () => {
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
    const sizeInBytes = Math.round((compressedBase64.length * 3) / 4);
    const sizeInKb = (sizeInBytes / 1024).toFixed(1);

    callback(compressedBase64, sizeInKb);
  };
}

function resetImage() {
  fieldHinhAnhInput.value = '';
  fieldHinhAnhBase64.value = '';
  imagePreview.src = '';
  dropZonePrompt.classList.remove('hidden');
  imagePreviewContainer.classList.add('hidden');
}

// ====================================================================
// 4. VALIDATION
// ====================================================================
function setFieldError(errorElementId, parentGroupElement) {
  parentGroupElement.classList.add('has-error');
}

function clearFieldError(errorElementId, parentGroupElement) {
  parentGroupElement.classList.remove('has-error');
}

function validateForm() {
  let isValid = true;

  // 1. Ho_va_ten
  const nameVal = fieldHoVaTen.value.trim();
  if (!nameVal || nameVal.length < 2) {
    setFieldError('errorHoVaTen', fieldHoVaTen.closest('.form-group'));
    isValid = false;
  } else {
    clearFieldError('errorHoVaTen', fieldHoVaTen.closest('.form-group'));
  }

  // 2. So_dien_thoai
  const phoneVal = fieldSoDienThoai.value.trim();
  const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  if (!phoneRegex.test(phoneVal.replace(/\s+/g, ''))) {
    setFieldError('errorSoDienThoai', fieldSoDienThoai.closest('.form-group'));
    isValid = false;
  } else {
    clearFieldError('errorSoDienThoai', fieldSoDienThoai.closest('.form-group'));
  }

  // 3. Email
  const emailVal = fieldEmail.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailVal)) {
    setFieldError('errorEmail', fieldEmail.closest('.form-group'));
    isValid = false;
  } else {
    clearFieldError('errorEmail', fieldEmail.closest('.form-group'));
  }

  // 4. Nha_mang
  if (!fieldNhaMang.value) {
    setFieldError('errorNhaMang', fieldNhaMang.closest('.form-group'));
    isValid = false;
  } else {
    clearFieldError('errorNhaMang', fieldNhaMang.closest('.form-group'));
  }

  // 5. San_pham
  const prodVal = fieldSanPham.value.trim();
  if (!prodVal) {
    setFieldError('errorSanPham', fieldSanPham.closest('.form-group'));
    isValid = false;
  } else {
    clearFieldError('errorSanPham', fieldSanPham.closest('.form-group'));
  }

  // 6. Hinh_anh
  if (!fieldHinhAnhBase64.value) {
    setFieldError('errorHinhAnh', imageDropZone.closest('.form-group'));
    isValid = false;
  } else {
    clearFieldError('errorHinhAnh', imageDropZone.closest('.form-group'));
  }

  // 7. Chu_ky
  if (!hasSigned || !fieldChuKyBase64.value) {
    setFieldError('errorChuKy', sigPadWrapper.closest('.form-group'));
    isValid = false;
  } else {
    clearFieldError('errorChuKy', sigPadWrapper.closest('.form-group'));
  }

  return isValid;
}

[fieldHoVaTen, fieldSoDienThoai, fieldEmail, fieldNhaMang, fieldSanPham].forEach(input => {
  input.addEventListener('input', () => {
    clearFieldError('', input.closest('.form-group'));
  });
  input.addEventListener('change', () => {
    clearFieldError('', input.closest('.form-group'));
  });
});

// ====================================================================
// 5. CONFIGURATION MODAL
// ====================================================================
function initConfigModal() {
  // Lấy giá trị đã lưu hoặc lấy giá trị mặc định của người dùng
  cfgAppId.value = localStorage.getItem(CONFIG_KEYS.APP_ID) || DEFAULT_CONFIG.APP_ID;
  cfgTableName.value = localStorage.getItem(CONFIG_KEYS.TABLE_NAME) || DEFAULT_CONFIG.TABLE_NAME;
  cfgAccessKey.value = localStorage.getItem(CONFIG_KEYS.ACCESS_KEY) || DEFAULT_CONFIG.ACCESS_KEY;
  cfgCustomEndpoint.value = localStorage.getItem(CONFIG_KEYS.CUSTOM_ENDPOINT) || '';

  btnOpenConfig.addEventListener('click', () => {
    configModal.classList.remove('hidden');
  });

  btnCloseConfigModal.addEventListener('click', () => {
    configModal.classList.add('hidden');
  });

  configModal.addEventListener('click', (e) => {
    if (e.target === configModal) {
      configModal.classList.add('hidden');
    }
  });

  btnToggleKeyVis.addEventListener('click', () => {
    const isPassword = cfgAccessKey.type === 'password';
    cfgAccessKey.type = isPassword ? 'text' : 'password';
    keyVisIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  });

  btnSaveConfig.addEventListener('click', () => {
    localStorage.setItem(CONFIG_KEYS.APP_ID, cfgAppId.value.trim());
    localStorage.setItem(CONFIG_KEYS.TABLE_NAME, cfgTableName.value.trim());
    localStorage.setItem(CONFIG_KEYS.ACCESS_KEY, cfgAccessKey.value.trim());
    localStorage.setItem(CONFIG_KEYS.CUSTOM_ENDPOINT, cfgCustomEndpoint.value.trim());

    configModal.classList.add('hidden');
    showToast('success', 'Lưu Cấu Hình', 'Đã lưu cấu hình AppSheet thành công.');
  });
}

// ====================================================================
// 6. FORM SUBMISSION: GOOGLE APPSHEET API INTEGRATION
// ====================================================================
function bindFormEvents() {
  btnResetForm.addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn làm mới toàn bộ biểu mẫu?')) {
      form.reset();
      btnClearSignature.click();
      resetImage();
      initSystemFields();
      showToast('info', 'Làm mới', 'Đã đặt lại biểu mẫu về ban đầu.');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('warning', 'Thiếu thông tin', 'Vui lòng kiểm tra lại các trường còn thiếu hoặc chưa đúng định dạng.');
      return;
    }

    // Đóng gói 9 trường thông tin thành một Record
    const newRecord = [
      {
        "ID": fieldId.value,
        "Thoi_gian": fieldThoiGian.value,
        "Ho_va_ten": fieldHoVaTen.value.trim(),
        "Nha_mang": fieldNhaMang.value,
        "San_pham": fieldSanPham.value.trim(),
        "So_dien_thoai": fieldSoDienThoai.value.trim(),
        "Chu_ky": fieldChuKyBase64.value,
        "Hinh_anh": fieldHinhAnhBase64.value,
        "Email": fieldEmail.value.trim()
      }
    ];

    await addData(newRecord);
  });
}

/**
 * Hàm addData theo đúng mẫu phương thức Google AppSheet API của người dùng
 * @param {Array} Du_lieu Mảng danh sách các dòng dữ liệu cần thêm
 */
async function addData(Du_lieu) {
  const YOUR_APP_ID = localStorage.getItem(CONFIG_KEYS.APP_ID) || DEFAULT_CONFIG.APP_ID;
  const table = localStorage.getItem(CONFIG_KEYS.TABLE_NAME) || DEFAULT_CONFIG.TABLE_NAME;
  const YOUR_APPSHEET_ACCESS_KEY = localStorage.getItem(CONFIG_KEYS.ACCESS_KEY) || DEFAULT_CONFIG.ACCESS_KEY;
  const customEndpoint = localStorage.getItem(CONFIG_KEYS.CUSTOM_ENDPOINT);

  const appsheetUrl = `https://www.appsheet.com/api/v2/apps/${YOUR_APP_ID}/tables/${table}/Action`;

  const payload = {
    Action: 'Add',
    Properties: {
      Locale: DEFAULT_CONFIG.LOCALE
    },
    Rows: Du_lieu
  };

  // Nút loading
  const btnText = btnSubmitForm.querySelector('.btn-text');
  const btnLoader = btnSubmitForm.querySelector('.btn-loader');
  btnSubmitForm.disabled = true;
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');

  try {
    let response;

    // Trường hợp 1: Sử dụng Google Apps Script Proxy URL (Để giải quyết 100% vấn đề CORS trên trình duyệt)
    if (customEndpoint) {
      response = await fetch(customEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Google Apps Script tương thích tốt với text/plain JSON
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      console.log("[Proxy Response]:", resJson);

      if (resJson.status === 'error') {
        throw new Error(resJson.message);
      }
    } else {
      // Trường hợp 2: Gửi trực tiếp đến AppSheet REST API
      const options = {
        method: 'POST',
        headers: {
          'applicationAccessKey': YOUR_APPSHEET_ACCESS_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      };

      response = await fetch(appsheetUrl, options);

      if (!response.ok) {
        let errDetail = '';
        try {
          const errJson = await response.json();
          errDetail = errJson.detail || errJson.title || JSON.stringify(errJson);
        } catch (_) {
          errDetail = await response.text();
        }
        throw new Error(`Lỗi AppSheet (${response.status}): ${errDetail}`);
      }

      const responseText = await response.text();
      console.log("info:", responseText);
    }

    showToast('success', 'Gửi Dữ Liệu Thành Công!', `Bản ghi ${Du_lieu[0].ID} đã được lưu thành công vào bảng "${table}".`);

    // Reset Form chuẩn bị cho bản ghi tiếp theo
    form.reset();
    btnClearSignature.click();
    resetImage();
    initSystemFields();

  } catch (err) {
    console.error("[Submit Error]:", err);

    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
      showToast(
        'error', 
        'Trình duyệt chặn CORS', 
        'Trình duyệt đang chặn gửi trực tiếp tới www.appsheet.com. Vui lòng triển khai file google_apps_script_proxy.js và dán URL vào Cấu hình API!'
      );
    } else {
      showToast('error', 'Không thể lưu vào AppSheet', err.message);
    }
  } finally {
    btnSubmitForm.disabled = false;
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
}

// ====================================================================
// 7. TOAST NOTIFICATION UTILITY
// ====================================================================
function showToast(type, title, message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" title="Đóng">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
