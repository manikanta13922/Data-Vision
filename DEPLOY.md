# DataVision Pro — Deployment Guide (Free, 24/7)

## Architecture
- **Frontend** → Vercel (free, always on)
- **Backend** → Render (free, kept awake via UptimeRobot)

---

## STEP 1 — Push to GitHub

```bash
cd DataVision-Pro-modified

git init
git add .
git commit -m "Initial commit"
```

Go to https://github.com/new → create repo named `datavision-pro` (keep it Public or Private, both work)

```bash
git remote add origin https://github.com/YOUR_USERNAME/datavision-pro.git
git branch -M main
git push -u origin main
```

---

## STEP 2 — Deploy Backend on Render

1. Go to https://render.com → **Sign up with GitHub**
2. Click **New → Web Service**
3. Connect your `datavision-pro` repo
4. Fill in:

| Field | Value |
|---|---|
| Name | `datavision-pro-backend` |
| Root Directory | `backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | `Free` |

5. Click **Create Web Service**
6. Wait ~3-5 minutes for first deploy
7. Copy your URL → looks like: `https://datavision-pro-backend.onrender.com`

✅ Test it: open `https://datavision-pro-backend.onrender.com/health` → should return `{"status":"ok"}`

---

## STEP 3 — Keep Backend Awake 24/7 (UptimeRobot)

Free tier Render sleeps after 15 min of inactivity. Fix it for free:

1. Go to https://uptimerobot.com → **Sign Up Free**
2. Click **+ Add New Monitor**
3. Set:
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `DataVision Backend`
   - URL: `https://datavision-pro-backend.onrender.com/health`
   - Monitoring Interval: **5 minutes**
4. Click **Create Monitor**

✅ Your backend now stays awake 24/7, pinged every 5 minutes

---

## STEP 4 — Deploy Frontend on Vercel

1. Go to https://vercel.com → **Sign Up with GitHub**
2. Click **Add New → Project**
3. Import your `datavision-pro` repo
4. Set:

| Field | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | `Vite` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

5. Under **Environment Variables**, add:
   - Key: `VITE_API_URL`
   - Value: `https://datavision-pro-backend.onrender.com`  ← your Render URL from Step 2

6. Click **Deploy**
7. Wait ~1 minute

✅ Your app is live at `https://datavision-pro.vercel.app`

---

## STEP 5 — Test Everything

1. Open your Vercel URL
2. Upload a CSV or Excel file
3. Check the analysis loads
4. Test chatbot, exports — everything should work

---

## Future Updates

Whenever you push to GitHub, both Vercel and Render auto-redeploy.

```bash
git add .
git commit -m "update"
git push
```

---

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 and proxies API to http://localhost:8000 automatically.
