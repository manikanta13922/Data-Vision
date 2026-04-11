#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       DataVision Pro - Starting Up       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Backend ──────────────────────────────────────
echo "[1/4] Setting up Python virtual environment..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "     Created venv"
fi

source venv/bin/activate

echo "[2/4] Installing Python dependencies..."
pip install -r requirements.txt -q

echo "[3/4] Starting FastAPI backend on port 8000..."
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "     Backend PID: $BACKEND_PID"

sleep 2

# ── Frontend ─────────────────────────────────────
echo "[4/4] Setting up React frontend..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "     Installing npm packages (first run only)..."
    npm install
fi

echo ""
echo "✓ Backend  → http://localhost:8000"
echo "✓ Frontend → http://localhost:5173"
echo "✓ API Docs → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers."
echo ""

# Open browser
sleep 2
if command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:5173
elif command -v open &>/dev/null; then
    open http://localhost:5173
fi

npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null; exit" INT TERM
wait $BACKEND_PID
