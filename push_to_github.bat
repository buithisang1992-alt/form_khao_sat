@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo =======================================================
echo   ĐẨY TOÀN BỘ SOURCE CODE LÊN GITHUB
echo   Repo: https://github.com/buithisang1992-alt/form_khao_sat
echo =======================================================
echo.

set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;%PATH%"

echo 1. Them tat ca cac file...
git add .

echo 2. Tao commit luu tru...
git commit -m "Cap nhat day du toan bo source code Form Khao Sat AppSheet" 2>nul

echo 3. Dang day len GitHub...
git push -u origin main --force

echo.
if %ERRORLEVEL% EQU 0 (
    echo [THANH CONG] Toan bo source code da duoc day len GitHub thanh cong!
) else (
    echo [CHU Y] Neu GitHub yeu cau xac thuc, vui long dang nhap tren trinh duyet hoac nhap GitHub Token.
)
echo.
pause
