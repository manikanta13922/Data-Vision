"""DataVision Pro v6 — Star Schema Detection + Real Business Analysis"""
import math, json, os, tempfile, asyncio, traceback
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from typing import List
from pydantic import BaseModel
import uvicorn, pandas as pd, numpy as np

from engine import RealTimeEngine
from analysis import DataAnalyzer, load_file
from export import ReportExporter
from merger import combine_sheets, _build_schema
from chatbot import answer as chat_answer
from smart_loader import smart_join_excel, is_id_col
from biz_charts import build_business_charts

app = FastAPI(title="DataVision Pro v6")
app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

engine   = RealTimeEngine()
analyzer = DataAnalyzer()
exporter = ReportExporter()
UPLOAD_DIR = tempfile.mkdtemp()

session = {
    "last_result": None, "last_df": None, "last_schema": None,
    "all_sheets": {}, "all_results": {}, "combined_df": None,
    "combined_schema": None, "_pending_files": [],
    "smart_result": None,   # populated for star schema Excel
}

class WsMan:
    def __init__(self): self.active = []
    async def connect(self, ws): await ws.accept(); self.active.append(ws)
    def disconnect(self, ws):
        if ws in self.active: self.active.remove(ws)
    async def broadcast(self, msg):
        dead = []
        for ws in self.active:
            try: await ws.send_json(msg)
            except: dead.append(ws)
        for ws in dead: self.disconnect(ws)

wsman = WsMan()

def _s(o):
    if isinstance(o, dict):  return {k:_s(v) for k,v in o.items()}
    if isinstance(o, list):  return [_s(v) for v in o]
    if isinstance(o,(float,np.floating)): return None if (math.isnan(o) or math.isinf(o)) else float(o)
    if isinstance(o,(np.integer,)): return int(o)
    if isinstance(o, (pd.Timestamp, datetime)): return str(o)
    return o

def safe_resp(data):
    return Response(content=json.dumps(_s(data), ensure_ascii=False), media_type="application/json")

@app.websocket("/ws")
async def ws_ep(ws: WebSocket):
    await wsman.connect(ws)
    try:
        while True:
            txt = await ws.receive_text()
            if txt == "ping": await ws.send_json({"type":"pong"})
    except WebSocketDisconnect: wsman.disconnect(ws)

async def _analyze(df, label, combined=False):
    return await asyncio.get_event_loop().run_in_executor(None, lambda: engine.run(df, label, combined=combined))

async def _run_smart_excel(file_path: str, file_name: str):
    """Handle multi-sheet Excel with star schema detection."""
    await wsman.broadcast({"type":"progress","stage":"schema","pct":10,
                           "message":"Detecting data model and relationships…"})
    
    smart = smart_join_excel(file_path)
    session["smart_result"] = smart
    
    df = smart["df"]
    # Enrich with computed columns if missing
    if "Cost_per_box" in df.columns and "Boxes" in df.columns and "Cost" not in df.columns:
        df["Cost"]       = pd.to_numeric(df["Cost_per_box"], errors="coerce") * pd.to_numeric(df["Boxes"], errors="coerce")
        df["Profit"]     = pd.to_numeric(df["Amount"], errors="coerce") - df["Cost"]
        df["Profit_Pct"] = np.where(df["Amount"]>0, df["Profit"]/df["Amount"]*100, np.nan)
        smart["df"] = df
    
    session["last_df"]     = df
    session["combined_df"] = df
    session["last_schema"] = smart["schema"]
    
    await wsman.broadcast({"type":"progress","stage":"analysis","pct":40,
                           "message":f"Analysing joined dataset ({len(df):,} rows)…"})
    
    result = await _analyze(df, file_name, combined=True)
    
    # Inject smart metadata into result
    result["schema"]        = smart["schema"]
    result["relationships"] = smart["relationships"]
    result["fact_table"]    = smart["fact_table"]
    result["dim_tables"]    = smart["dim_tables"]
    result["smart_log"]     = smart["log"]
    result["smart_measures"]= smart["measures"]
    result["is_star_schema"]= True
    
    # Build business-specific charts (Top Products, Salespersons, Geo, etc.)
    try:
        biz = build_business_charts(df, smart)
        result["biz_charts"] = biz
    except Exception as biz_err:
        result["biz_charts"] = {}
        import traceback; traceback.print_exc()
    
    # Override KPIs with real business measures
    _inject_business_kpis(result, df, smart)
    
    session["last_result"] = result
    session["all_results"][file_name] = result
    return result

def _inject_business_kpis(result: dict, df: pd.DataFrame, smart: dict):
    """Add real business KPIs to the result."""
    kpis = []
    
    # Core counts
    kpis.append({"label":"Total Records","value":f"{len(df):,}","icon":"database","color":"indigo","sub":f"{len(df.columns)} columns"})
    
    # Amount / Revenue
    if "Amount" in df.columns:
        amt = float(df["Amount"].sum())
        kpis.append({"label":"Total Amount","value":f"${amt/1e6:.1f}M" if amt>=1e6 else f"${amt:,.0f}","icon":"dollar-sign","color":"coral","sub":f"avg ${df['Amount'].mean():,.0f}/shipment"})
    
    # Boxes
    if "Boxes" in df.columns:
        boxes = float(df["Boxes"].sum())
        kpis.append({"label":"Total Boxes","value":f"{boxes/1e6:.1f}M" if boxes>=1e6 else f"{boxes:,.0f}","icon":"trending-up","color":"teal","sub":f"avg {df['Boxes'].mean():.0f} boxes/shipment"})
    
    # Shipments count
    kpis.append({"label":"Total Shipments","value":f"{len(df):,}","icon":"activity","color":"violet","sub":"rows in fact table"})
    
    # Profit
    if "Profit" in df.columns:
        profit = float(df["Profit"].sum())
        kpis.append({"label":"Total Profit","value":f"${profit/1e6:.1f}M" if profit>=1e6 else f"${profit:,.0f}","icon":"trending-up","color":"emerald","sub":f"{'Positive' if profit>0 else 'Negative'} overall"})
    
    # Profit %
    if "Profit_Pct" in df.columns:
        pct = float(df["Profit_Pct"].mean())
        kpis.append({"label":"Avg Profit %","value":f"{pct:.1f}%","icon":"shield-check","color":"amber","sub":"mean across all shipments"})
    
    # Relationships
    kpis.append({"label":"Data Quality","value":f"{result.get('metadata',{}).get('completeness_pct',100)}%","icon":"shield-check","color":"teal","sub":"completeness"})
    
    result["kpis"] = kpis[:8]

async def _run_combined(sheets_dict):
    await wsman.broadcast({"type":"progress","stage":"merging","pct":10,"message":"Merging all sheets…"})
    merge  = combine_sheets(sheets_dict)
    df     = merge["df"]
    schema = merge["schema"]
    session["combined_df"]     = df
    session["combined_schema"] = schema
    session["last_df"]         = df
    session["last_schema"]     = schema
    await wsman.broadcast({"type":"progress","stage":"analysis","pct":40,"message":f"Analysing {len(df):,} rows…"})
    result = await _analyze(df, "Combined Dataset", combined=True)
    result["merge_info"] = {"sources":merge["sources"],"conflicts":merge["conflicts"],"log":merge["log"]}
    result["schema"]     = schema
    result["combined"]   = True
    session["last_result"] = result
    session["all_results"]["Combined Dataset"] = result
    return result

async def _run_separate(sheets_dict):
    all_results = []
    labels = list(sheets_dict.keys())
    for i,(label,df) in enumerate(sheets_dict.items()):
        pct = int(10+(i/max(len(labels),1))*80)
        await wsman.broadcast({"type":"progress","stage":"analysis","pct":pct,"message":f"Analysing '{label}'…"})
        result = await _analyze(df, label, combined=False)
        schema = _build_schema(df,[label],{c:{label} for c in df.columns})
        result["schema"] = schema
        all_results.append(result)
        session["all_sheets"][label]    = df
        session["all_results"][label]   = result
        session["last_result"] = result
        session["last_df"]     = df
        session["last_schema"] = schema
    if len(all_results)==1: return all_results[0]
    multi = {"multi":True,"sheets":all_results,"labels":[r["label"] for r in all_results],
             "metadata":{"analyzed_at":all_results[0]["timestamp"],"total_sheets":len(all_results),
                         "total_rows":sum(r["metadata"]["rows"] for r in all_results)}}
    session["last_result"] = multi
    return multi

# ── Scan ──────────────────────────────────────────────────────────────────
@app.post("/api/scan")
async def scan(files: List[UploadFile] = File(...)):
    sheets_info=[]; saved=[]
    for f in files:
        ext=f.filename.rsplit('.',1)[-1].lower()
        if ext not in ('csv','xlsx','xls','json'): raise HTTPException(400,f"Unsupported: {f.filename}")
        path=os.path.join(UPLOAD_DIR,f.filename)
        with open(path,'wb') as fp: fp.write(await f.read())
        saved.append({"path":path,"name":f.filename,"ext":ext})
        sheets=load_file(path,ext)
        for sname,df in sheets.items():
            label=f.filename if len(sheets)==1 else f"{f.filename} › {sname}"
            sheets_info.append({"label":label,"file":f.filename,"sheet":sname,
                                 "rows":int(len(df)),"columns":int(len(df.columns)),"cols":list(df.columns)[:20]})
    session["_pending_files"]=saved
    # Detect star schema for Excel files
    is_star = any(s["ext"] in ("xlsx","xls") for s in saved) and len(sheets_info)>1
    return safe_resp({"sheets":sheets_info,"total_sheets":len(sheets_info),
                      "needs_choice":len(sheets_info)>1,"files":[s["name"] for s in saved],
                      "is_star_schema_candidate":is_star})

# ── Analyse ───────────────────────────────────────────────────────────────
@app.post("/api/analyze")
async def analyze(files: List[UploadFile] = File(...), mode: str = "separate"):
    saved=[]
    for f in files:
        ext=f.filename.rsplit('.',1)[-1].lower()
        if ext not in ('csv','xlsx','xls','json'): raise HTTPException(400,f"Unsupported: {f.filename}")
        path=os.path.join(UPLOAD_DIR,f.filename)
        with open(path,'wb') as fp: fp.write(await f.read())
        saved.append({"path":path,"name":f.filename,"ext":ext})

    session.update({"all_sheets":{},"all_results":{},"last_result":None,"last_df":None,"smart_result":None})
    session["_pending_files"]=saved
    analyzer.last_file_path=saved[0]["path"] if saved else None

    await wsman.broadcast({"type":"progress","stage":"start","pct":0,"message":f"Starting — {len(saved)} file(s), mode={mode}"})

    try:
        # Single Excel with multiple sheets → try star schema
        if len(saved)==1 and saved[0]["ext"] in ("xlsx","xls") and mode=="combined":
            await wsman.broadcast({"type":"progress","stage":"schema","pct":5,"message":"Detecting star schema…"})
            result = await _run_smart_excel(saved[0]["path"], saved[0]["name"])
        else:
            all_sheets={}
            for finfo in saved:
                sheets=load_file(finfo["path"],finfo["ext"])
                for sname,df in sheets.items():
                    label=finfo["name"] if len(sheets)==1 else f"{finfo['name']} › {sname}"
                    all_sheets[label]=df
            session["all_sheets"]=all_sheets
            result = await _run_combined(all_sheets) if mode=="combined" else await _run_separate(all_sheets)

        await wsman.broadcast({"type":"done","message":"Analysis complete"})
        return safe_resp(result)
    except Exception as e:
        traceback.print_exc()
        await wsman.broadcast({"type":"error","message":str(e)})
        raise HTTPException(500,str(e))

class ChoiceReq(BaseModel):
    mode: str = "separate"

@app.post("/api/analyze/choice")
async def analyze_choice(req: ChoiceReq):
    saved=session.get("_pending_files",[])
    if not saved: raise HTTPException(400,"No pending files.")
    session.update({"all_sheets":{},"all_results":{},"last_result":None,"smart_result":None})
    await wsman.broadcast({"type":"progress","stage":"start","pct":0,"message":f"Starting — mode: {req.mode}"})
    try:
        if len(saved)==1 and saved[0]["ext"] in ("xlsx","xls") and req.mode=="combined":
            result = await _run_smart_excel(saved[0]["path"], saved[0]["name"])
        else:
            all_sheets={}
            for finfo in saved:
                sheets=load_file(finfo["path"],finfo["ext"])
                for sname,df in sheets.items():
                    label=finfo["name"] if len(sheets)==1 else f"{finfo['name']} › {sname}"
                    all_sheets[label]=df
            session["all_sheets"]=all_sheets
            result = await _run_combined(all_sheets) if req.mode=="combined" else await _run_separate(all_sheets)
        await wsman.broadcast({"type":"done","message":"Analysis complete"})
        return safe_resp(result)
    except Exception as e:
        traceback.print_exc(); raise HTTPException(500,str(e))

# ── Chatbot ───────────────────────────────────────────────────────────────
class ChatReq(BaseModel):
    question: str; label: str = None

@app.post("/api/chat")
def chat(req: ChatReq):
    df=None
    if req.label and req.label in session["all_sheets"]:
        df=session["all_sheets"][req.label]
    elif session["combined_df"] is not None: df=session["combined_df"]
    elif session["last_df"] is not None:     df=session["last_df"]
    elif session["all_sheets"]:              df=list(session["all_sheets"].values())[0]
    if df is None:
        return safe_resp({"type":"error","summary":"No dataset loaded.","steps":[],"confidence":"low","chart":"none","measure_code":None})
    schema=session.get("last_schema") or session.get("combined_schema")
    try: return safe_resp(chat_answer(req.question, df, schema))
    except Exception as e:
        traceback.print_exc()
        return safe_resp({"type":"error","summary":f"Error: {e}","steps":[],"confidence":"low","chart":"none","measure_code":None})

@app.post("/api/query")
def query(req: ChatReq): return chat(req)

@app.get("/api/schema")
def get_schema(label: str = None):
    schema=session.get("combined_schema") or session.get("last_schema") or []
    return safe_resp({"schema":schema,"label":label or "Dataset"})

# ── Exports — with date in filename ──────────────────────────────────────
def _today(): return datetime.now().strftime("%Y-%m-%d")

def _get_result(label: str = None):
    if label and label in session["all_results"]: return session["all_results"][label]
    r = session["last_result"]
    if r and r.get("multi") and r.get("sheets"): return r["sheets"][0]
    return r

@app.get("/api/export/excel")
def export_excel(label: str = None):
    result = _get_result(label)
    if not result: raise HTTPException(400,"No data. Upload and analyse first.")
    fname = f"DataVision_Excel_{_today()}.xlsx"
    out   = os.path.join(UPLOAD_DIR, fname)
    try:
        src_path = getattr(analyzer, "last_file_path", "") or ""
        exporter.to_excel(result, src_path, out)
    except Exception as e:
        traceback.print_exc(); raise HTTPException(500, f"Excel export failed: {e}")
    if not os.path.exists(out): raise HTTPException(500,"File not created")
    return FileResponse(out, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=fname)

@app.get("/api/export/pdf")
def export_pdf(label: str = None):
    result = _get_result(label)
    if not result: raise HTTPException(400,"No data.")
    fname = f"DataVision_Report_{_today()}.pdf"
    out   = os.path.join(UPLOAD_DIR, fname)
    try:
        exporter.to_pdf(result, out)
    except Exception as e:
        traceback.print_exc(); raise HTTPException(500, f"PDF export failed: {e}")
    if not os.path.exists(out): raise HTTPException(500,"File not created")
    return FileResponse(out, media_type="application/pdf", filename=fname)

@app.get("/api/export/pbix-guide")
def export_pbix(label: str = None):
    result = _get_result(label)
    if not result: raise HTTPException(400,"No data.")
    fname = f"DataVision_PowerBI_{_today()}.xlsx"
    out   = os.path.join(UPLOAD_DIR, fname)
    src   = getattr(analyzer,"last_file_path","") or ""
    try:
        exporter.to_powerbi_excel(result, src, out)
    except Exception as e:
        traceback.print_exc(); raise HTTPException(500, f"PowerBI export failed: {e}")
    if not os.path.exists(out): raise HTTPException(500,"File not created")
    return FileResponse(out, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=fname)

@app.get("/api/export/cleaned-data")
def export_cleaned_data(fmt: str = "excel"):
    """Download the cleaned/joined dataset ready for further analysis."""
    df = session.get("combined_df")
    if df is None:
        df = session.get("last_df")
    if df is None:
        raise HTTPException(400, "No data loaded. Upload and analyse first.")
    today = _today()
    if fmt == "csv":
        fname = f"DataVision_CleanedData_{today}.csv"
        out   = os.path.join(UPLOAD_DIR, fname)
        try:
            df.to_csv(out, index=False)
            return FileResponse(out, media_type="text/csv", filename=fname)
        except Exception as e:
            raise HTTPException(500, f"CSV export failed: {e}")
    else:
        fname = f"DataVision_CleanedData_{today}.xlsx"
        out   = os.path.join(UPLOAD_DIR, fname)
        try:
            with pd.ExcelWriter(out, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Cleaned Data")
                # Add a summary sheet
                summary_data = {
                    "Metric": ["Total Rows", "Total Columns", "Numeric Columns", "Categorical Columns", "Missing Values", "Completeness %", "Export Date"],
                    "Value": [
                        len(df),
                        len(df.columns),
                        len(df.select_dtypes(include=[np.number]).columns),
                        len(df.select_dtypes(include=["object","category"]).columns),
                        int(df.isnull().sum().sum()),
                        round((1 - df.isnull().sum().sum() / (len(df)*len(df.columns)))*100, 2),
                        today
                    ]
                }
                pd.DataFrame(summary_data).to_excel(writer, index=False, sheet_name="Summary")
            return FileResponse(out, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=fname)
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(500, f"Excel export failed: {e}")

@app.get("/health")
def health(): return {"status":"ok","version":"6.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
