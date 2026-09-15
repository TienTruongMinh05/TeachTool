@echo off
chcp 65001 >nul
title TAT HE THONG - TEACHTOOL
color 0c

echo ======================================================================
echo          DANG DUNG HE THONG QUAN LY LOP HOC (TEACHTOOL)               
echo ======================================================================
echo.

echo Dang tat tien trinh Backend (Port 8081)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8081" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo Dang tat tien trinh Frontend (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ======================================================================
echo   DA TAT TOAN BO HE THONG THANH CONG!
echo ======================================================================
timeout /t 3 >nul
