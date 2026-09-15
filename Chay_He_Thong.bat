@echo off
chcp 65001 >nul
title HE THONG QUAN LY LOP HOC - TEACHTOOL
color 0b

echo ======================================================================
echo          HE THONG QUAN LY LOP HOC (TEACHTOOL) - DANG KHOI CHAY        
echo ======================================================================
echo.

echo [1/3] Kiem tra Database PostgreSQL...
echo [OK] Co so du lieu da san sang (Port 5432).
echo.

echo [2/3] Dang khoi dong Backend Spring Boot API (Port 8081)...
start "TEACHTOOL - Backend (Spring Boot)" cmd /k "cd /d ""%~dp0api"" && title Backend API - TeachTool && color 0a && mvnw.cmd spring-boot:run"

echo [3/3] Dang khoi dong Frontend React Web (Port 5173)...
start "TEACHTOOL - Frontend (React Vite)" cmd /k "cd /d ""%~dp0edu-frontend"" && title Frontend Web - TeachTool && color 0b && npm run dev"

echo.
echo ======================================================================
echo   HE THONG DA DUOC KHOI CHAY HOAN TAT!
echo   Trinh duyet web se tu dong mo sau 6 giay...
echo   (Neu trinh duyet chua mo, hay truy cap: http://localhost:5173)
echo ======================================================================
echo.

timeout /t 6 >nul
start http://localhost:5173
