@echo off
title DataVision Pro - Startup
color 0B

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       DataVision Pro - Starting Up       ║
echo  ╚══════════════════════════════════════════╝
echo.

:: --- Backend ---
echo [1/4] Setting up Python virtual environment...
cd /d "%~dp0backend"

if not exist "venv" (
    python -m venv venv
    echo      Created venv
)

call venv\Scripts\activate

echo [2/4] Installing Python dependencies...
pip install -r requirements.txt --quiet

echo [3/4] Starting FastAPI backend on port 8000...
start "DataVision Backend" cmd /k "call venv\Scripts\activate && python -m uvicorn main:app --reload --port 8000"

:: --- Frontend ---
echo [4/4] Setting up and starting React frontend...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo      Installing npm packages (first run only)...
    call npm install
)

echo.
echo  ✓ Backend  → http://localhost:8000
echo  ✓ Frontend → http://localhost:5173
echo  ✓ API Docs → http://localhost:8000/docs
echo.
echo  Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173

npm run dev
