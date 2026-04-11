"""
STRICT VALIDATION GATE — smarter thresholds for combined datasets.
"""
import pandas as pd
import numpy as np
import math
from datetime import datetime

# Thresholds
MISSING_PCT_HARD_STOP    = 20.0
MISSING_PCT_DATASET      = 60.0   # raised: combined datasets naturally have more nulls
MISSING_PCT_COMBINED     = 75.0   # even more relaxed for explicitly combined datasets
MIN_ROWS_FOR_ANALYSIS    = 5
MIN_ROWS_FOR_TREND       = 10
MIN_ROWS_FOR_CORR        = 8
MIN_ROWS_FOR_DIST        = 5
MIN_CHANGE_FOR_TREND     = 0.05
MIN_ABS_CORR             = 0.6
MIN_ZSCORE_ANOMALY       = 3.0
MIN_CONFIDENCE_REPORT    = 60

def _log(step, status, detail, values=None):
    return {"timestamp": datetime.utcnow().isoformat()+"Z",
            "step":step,"status":status,"detail":detail,"values":values or {}}

class ValidationGate:
    def run(self, df: pd.DataFrame, label: str, combined: bool = False) -> dict:
        trace=[]; errors=[]; warnings=[]; blocked=[]
        threshold = MISSING_PCT_COMBINED if combined else MISSING_PCT_DATASET

        # G0: Min rows
        trace.append(_log("G0:MinRows","CHECK",f"Rows={len(df)}"))
        if len(df) < MIN_ROWS_FOR_ANALYSIS:
            err = f"DATASET TOO SMALL: {len(df)} rows < minimum {MIN_ROWS_FOR_ANALYSIS}. DATA NOT RELIABLE FOR ANALYSIS."
            errors.append(err)
            trace.append(_log("G0:MinRows","BLOCK",err))
            return self._result(False,blocked,{},errors,warnings,trace,err)
        trace.append(_log("G0:MinRows","PASS",f"{len(df)} rows ≥ {MIN_ROWS_FOR_ANALYSIS}"))

        # G1: Overall missing — for combined datasets only block real data columns
        total_cells = len(df) * len(df.columns)
        # Exclude _source column from missing calculation
        analysis_cols = [c for c in df.columns if not c.startswith('_')]
        analysis_cells = len(df) * len(analysis_cols) if analysis_cols else total_cells
        missing_cells  = df[analysis_cols].isnull().sum().sum() if analysis_cols else df.isnull().sum().sum()
        overall_pct    = (missing_cells / analysis_cells * 100) if analysis_cells > 0 else 0

        trace.append(_log("G1:OverallMissing","CHECK",
            f"Overall missing={overall_pct:.1f}% (threshold={'combined='+str(threshold) if combined else str(threshold)}%)",
            {"pct":round(overall_pct,2),"threshold":threshold}))

        if overall_pct > threshold:
            err = (f"DATASET MISSING RATE TOO HIGH: {overall_pct:.1f}% missing "
                   f"(threshold {threshold}%). DATA NOT RELIABLE FOR ANALYSIS.")
            errors.append(err)
            trace.append(_log("G1:OverallMissing","BLOCK",err))
            return self._result(False,blocked,{},errors,warnings,trace,err)
        trace.append(_log("G1:OverallMissing","PASS",f"{overall_pct:.1f}% ≤ {threshold}%"))

        # G2: Per-column missing — block only columns >20% missing
        reliable_cols={}
        for col in df.columns:
            if col.startswith('_'): continue
            pct = df[col].isnull().mean()*100
            if pct > MISSING_PCT_HARD_STOP:
                blocked.append(col)
                msg = f"'{col}' blocked: {pct:.1f}% missing > {MISSING_PCT_HARD_STOP}%"
                warnings.append(msg)
                trace.append(_log("G2:ColMissing","BLOCK",msg,{"col":col,"pct":round(pct,2)}))
            else:
                reliable_cols[col] = f"{pct:.1f}% missing — OK"
                trace.append(_log("G2:ColMissing","PASS",f"'{col}': {pct:.1f}%"))

        if not reliable_cols:
            err = "ALL COLUMNS BLOCKED by missing data. DATA NOT RELIABLE FOR ANALYSIS."
            errors.append(err)
            return self._result(False,blocked,reliable_cols,errors,warnings,trace,err)

        # G3: Type consistency warnings only
        for col in list(reliable_cols.keys()):
            s = df[col].dropna()
            if len(s)==0: continue
            if s.dtype==object:
                try:
                    conv = pd.to_numeric(s,errors='coerce')
                    if conv.notna().mean()>0.7:
                        warnings.append(f"'{col}': stored as text but {conv.notna().mean()*100:.0f}% are numeric — type inconsistency")
                except: pass

        # G4: Zero-variance
        num_cols = df[list(reliable_cols.keys())].select_dtypes(include=[np.number]).columns.tolist()
        for col in num_cols:
            s = df[col].dropna()
            if len(s)>=2 and s.nunique()==1:
                blocked.append(col)
                reliable_cols.pop(col,None)
                warnings.append(f"'{col}' BLOCKED: constant value (zero variance)")
                trace.append(_log("G4:ZeroVar","BLOCK",f"'{col}' is constant"))

        trace.append(_log("FINAL","PASS",
            f"'{label}' passed. {len(reliable_cols)} reliable, {len(blocked)} blocked."))
        return self._result(True,blocked,reliable_cols,errors,warnings,trace,None)

    def _result(self,passed,blocked,reliable,errors,warnings,trace,stop_reason):
        return {"passed":passed,"blocked_columns":blocked,"reliable_columns":reliable,
                "errors":errors,"warnings":warnings,"trace":trace,
                "dataset_usable":passed,"stop_reason":stop_reason}


class InsightGate:
    @staticmethod
    def check_trend(series,slope,r_val,p_val,pct_change):
        s=series.dropna(); n=len(s); reasons=[]
        if n<MIN_ROWS_FOR_TREND: reasons.append(f"n={n} < {MIN_ROWS_FOR_TREND} required")
        if abs(pct_change)<MIN_CHANGE_FOR_TREND: reasons.append(f"change={pct_change*100:.2f}% < {MIN_CHANGE_FOR_TREND*100}%")
        if p_val>=0.05: reasons.append(f"p={p_val:.4f} ≥ 0.05 (not significant)")
        if math.isnan(slope) or math.isinf(slope): reasons.append("slope is NaN/Inf")
        return {"valid":len(reasons)==0,"blocked":reasons,"n":n}

    @staticmethod
    def check_correlation(r_val,n,p_val):
        reasons=[]
        if n<MIN_ROWS_FOR_CORR: reasons.append(f"n={n} < {MIN_ROWS_FOR_CORR}")
        if abs(r_val)<MIN_ABS_CORR: reasons.append(f"|r|={abs(r_val):.4f} < {MIN_ABS_CORR}")
        if p_val>=0.05: reasons.append(f"p={p_val:.4f} ≥ 0.05")
        if math.isnan(r_val) or math.isinf(r_val): reasons.append("r is NaN/Inf")
        return {"valid":len(reasons)==0,"blocked":reasons,"n":n}

    @staticmethod
    def check_anomaly(z_score,n):
        reasons=[]
        if abs(z_score)<MIN_ZSCORE_ANOMALY: reasons.append(f"|z|={z_score:.2f} < {MIN_ZSCORE_ANOMALY}")
        if n<10: reasons.append(f"n={n} < 10")
        return {"valid":len(reasons)==0,"blocked":reasons}

    @staticmethod
    def compute_confidence(series,df):
        s=series.dropna(); n=len(s)
        comp = s.count()/max(len(series),1)
        size_pts = min(30, math.log10(max(n,1))/math.log10(300)*30) if n>=MIN_ROWS_FOR_ANALYSIS else 0
        if n>=2 and float(s.std())>0 and float(s.mean())!=0:
            cv = abs(float(s.std())/float(s.mean()))
            var_pts = max(0,30*(1-cv/2))
        else: var_pts=15
        total=int(max(0,min(100,comp*40+size_pts+var_pts)))
        return {"score":total,"reliability":"HIGH" if total>=80 else "MEDIUM" if total>=60 else "LOW",
                "low_reliability":total<MIN_CONFIDENCE_REPORT,
                "breakdown":{"completeness_pts":round(comp*40,1),"sample_size_pts":round(size_pts,1),
                             "variance_pts":round(var_pts,1),"sample_n":n}}
