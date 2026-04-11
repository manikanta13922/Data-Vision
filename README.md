# 📊 DataVision Pro — Analytics Platform

> Real data. Real insights. Zero fake reports.

A full-stack analytics web application that analyzes any CSV, Excel, or JSON dataset and delivers 100% real statistical insights — no placeholders, no mock data, no fake numbers. Every chart, KPI, correlation, and insight is computed directly from your uploaded data.

---

## 🚀 Quick Start (2 commands)

### Windows
```bat
start.bat
```

### Mac / Linux
```bash
chmod +x start.sh && ./start.sh
```

The script will:
1. Create a Python venv and install all dependencies
2. Start the FastAPI backend on **port 8000**
3. Install npm packages (first run only)
4. Start the React frontend on **port 5173**
5. Open your browser automatically

---

## 📋 Manual Setup (if script doesn't work)

### Step 1 — Backend
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Step 2 — Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

Open: **http://localhost:5173**

---

## 🧰 Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.9+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 8+ | comes with Node |

---

## 📊 What It Analyzes

Upload any **CSV**, **Excel (.xlsx/.xls)**, or **JSON** file and get:

### Real Statistical Analysis
- ✅ Count, Mean, Median, Mode
- ✅ Standard deviation, variance, range
- ✅ Q1, Q3, IQR (interquartile range)
- ✅ Skewness & kurtosis with interpretation
- ✅ Coefficient of variation (CV%)
- ✅ Sum totals for each numeric column

### Distribution Analysis
- ✅ Histogram with bin frequencies
- ✅ Shapiro-Wilk normality test (p-value)
- ✅ Percentile table (5th to 99th)

### Correlation Analysis
- ✅ Pearson correlation matrix (all numeric pairs)
- ✅ Color-coded heatmap (red=positive, blue=negative)
- ✅ Strength classification (Weak/Moderate/Strong/Very Strong)
- ✅ Actionable interpretation for each strong pair

### Outlier Detection (IQR Method)
- ✅ Count and % of outliers per column
- ✅ Lower and upper fence values
- ✅ Severity classification (Low/Medium/High)
- ✅ Sample extreme values

### Categorical Analysis
- ✅ Value frequency table with percentages
- ✅ Unique count and cardinality rating
- ✅ Mode (most common value)
- ✅ Missing value count

### AI-Generated Insights
- ✅ Dataset quality assessment
- ✅ Distribution shape insights (skew, symmetry)
- ✅ High variability warnings
- ✅ Dominant category alerts
- ✅ High cardinality flags
- ✅ Correlation relationship explanations
- ✅ Outlier severity warnings
- ✅ All prioritized: High / Medium / Low

---

## 📤 Export Formats

### 1. Power BI Export (.xlsx) ⭐
Structured Excel workbook specifically designed for Power BI Desktop:
- **Data sheet** — your full raw dataset
- **Statistics sheet** — clean statistics table
- **Correlations sheet** — correlation matrix
- **Categories sheet** — categorical breakdowns
- **Insights sheet** — all insights as a table
- **"Open in Power BI" sheet** — step-by-step guide

**To open in Power BI:**
1. Download Power BI Desktop (free at microsoft.com/power-bi)
2. Get Data → Excel Workbook → select downloaded file
3. Check: Data, Statistics, Correlations, Categories, Insights
4. Click Load → build your visuals!

### 2. Full Excel Report (.xlsx)
9-sheet professional workbook with:
- Cover page with metadata
- Color-coded statistics
- Correlation heatmap with heat colors
- Outlier report with severity flags
- Categorical analysis tables
- All insights with priority colors
- Raw data export (up to 10,000 rows)

### 3. PDF Report (.pdf)
A4 professional PDF with:
- KPI summary table
- Full statistics table
- All insights with priority flags
- Significant correlations table
- Ready to print or email

---

## 🗂 Project Structure

```
DataVision-Pro/
├── backend/
│   ├── main.py          ← FastAPI app & API routes
│   ├── analysis.py      ← Full statistical engine
│   ├── export.py        ← Excel & PDF export engine
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css    ← All styles (dark theme)
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── UploadSection.jsx
│   │       ├── AnalyzingState.jsx
│   │       ├── Dashboard.jsx
│   │       ├── KPICards.jsx
│   │       ├── ChartsSection.jsx      ← Line/Bar/Pie/Scatter/Histogram
│   │       ├── InsightsPanel.jsx
│   │       ├── StatisticsTable.jsx
│   │       ├── CorrelationHeatmap.jsx
│   │       ├── OutliersPanel.jsx
│   │       ├── CategoricalPanel.jsx
│   │       └── ExportPanel.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── start.bat            ← Windows one-click start
├── start.sh             ← Mac/Linux one-click start
└── README.md
```

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Upload file → full analysis JSON |
| GET | `/api/export/excel` | Download full Excel report |
| GET | `/api/export/pdf` | Download PDF report |
| GET | `/api/export/pbix-guide` | Download Power BI–ready Excel |
| GET | `/docs` | FastAPI Swagger UI |

---

## 💡 Tips

- **Large files (>10MB):** Analysis may take 10–30 seconds — the progress indicator shows live steps
- **Best results:** Files with 5+ numeric columns get the richest insights
- **Date columns:** Automatically detected — time series trend charts appear if dates are found
- **JSON:** Must be an array of objects or a flat records format

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Uvicorn |
| Analysis | pandas, numpy, scipy |
| Excel export | openpyxl |
| PDF export | reportlab |
| Frontend | React 18, Vite |
| Charts | Recharts |
| Animations | CSS animations + framer-motion |
| Upload | react-dropzone |
| Notifications | react-hot-toast |

All **100% free and open source**. No API keys. No subscriptions. No cloud required.
