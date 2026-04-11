"""
ZERO-HALLUCINATION INSIGHT ENGINE
Rules:
- Every insight has formula, values, calculation, confidence, data_points_used
- If confidence < 60% → mark LOW_RELIABILITY
- If statistical gate fails → RETURN ERROR, NOT INSIGHT
- Division by zero, NaN, insufficient data → RETURN ERROR
"""
import pandas as pd
import numpy as np
from scipy import stats
from datetime import datetime
import math, warnings
warnings.filterwarnings('ignore')

from validator import ValidationGate, InsightGate, _log, MIN_ROWS_FOR_TREND, MIN_ROWS_FOR_CORR, MIN_ABS_CORR, MIN_ZSCORE_ANOMALY

# ── safe helpers ─────────────────────────────────────────────────────────────
def _s(v):
    if v is None: return None
    if isinstance(v, (float, np.floating)):
        f = float(v); return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(v, (np.integer,)): return int(v)
    if isinstance(v, (np.bool_,)):   return bool(v)
    return v

def _clean(obj):
    if isinstance(obj, dict):  return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):  return [_clean(v) for v in obj]
    return _s(obj)

def r(v, d=4):
    v = _s(v); return None if v is None else round(float(v), d)

def safe_div(a, b, default=None):
    """Division that never raises — returns default on zero/nan."""
    try:
        if b == 0 or b is None: return default
        result = float(a) / float(b)
        return default if (math.isnan(result) or math.isinf(result)) else result
    except Exception: return default


# ── Strict Insight Builder ────────────────────────────────────────────────────
class InsightBuilder:
    """
    Builds a single insight object with full traceability.
    Returns None if the insight fails any gate.
    """

    def build_trend_insight(self, col: str, series: pd.Series, trace_log: list) -> dict | None:
        s = series.dropna()
        n = len(s)
        trace_log.append(_log(f"Trend:{col}", "CHECK", f"n={n}, threshold={MIN_ROWS_FOR_TREND}"))

        if n < MIN_ROWS_FOR_TREND:
            trace_log.append(_log(f"Trend:{col}", "BLOCK", f"INSUFFICIENT DATA: {n} < {MIN_ROWS_FOR_TREND} points"))
            return {"_blocked": True, "reason": f"INSUFFICIENT DATA FOR RELIABLE INSIGHT: '{col}' has {n} points, need ≥{MIN_ROWS_FOR_TREND}"}

        x = np.arange(n)
        try:
            slope, intercept, r_val, p_val, std_err = stats.linregress(x, s.values)
        except Exception as e:
            trace_log.append(_log(f"Trend:{col}", "ERROR", f"Regression failed: {e}"))
            return {"_blocked": True, "reason": f"COMPUTATION ERROR for '{col}': {e}"}

        # Check for NaN/Inf
        for name, val in [("slope", slope), ("r_val", r_val), ("p_val", p_val)]:
            if math.isnan(val) or math.isinf(val):
                trace_log.append(_log(f"Trend:{col}", "ERROR", f"{name} is {val}"))
                return {"_blocked": True, "reason": f"COMPUTATION FAILED: {name} = {val} for '{col}'"}

        # Percent change first→last
        first_val = float(s.iloc[0])
        last_val  = float(s.iloc[-1])
        pct_change = safe_div(last_val - first_val, abs(first_val), default=0)

        gate = InsightGate.check_trend(s, slope, r_val, p_val, pct_change)
        if not gate["valid"]:
            for reason in gate["blocked"]:
                trace_log.append(_log(f"Trend:{col}", "BLOCK", reason))
            return {"_blocked": True, "reason": "GATE FAILED: " + " | ".join(gate["blocked"])}

        confidence = InsightGate.compute_confidence(series, pd.DataFrame({col: series}))
        trace_log.append(_log(f"Trend:{col}", "PASS", f"Trend insight valid. r={r_val:.4f}, p={p_val:.4f}, slope={slope:.4f}, conf={confidence['score']}"))

        direction = "↗ INCREASING" if slope > 0 else "↘ DECREASING"
        return {
            "_blocked":        False,
            "type":            "trend",
            "priority":        "high" if confidence["score"] >= 75 else "medium",
            "icon":            "trending-up",
            "title":           f"Statistically Significant {direction.split()[1].title()} Trend — {col}",
            "insight":         (
                f"'{col}' shows a {direction} trend over {n} records. "
                f"Linear regression: slope = {slope:.6f} per step. "
                f"Value changed from {first_val:.3f} to {last_val:.3f} "
                f"({pct_change*100:+.2f}%). R² = {r_val**2:.4f} "
                f"({r_val**2*100:.1f}% of variance explained by linear trend)."
            ),
            "formula":         "LinearRegression: y = slope × x + intercept",
            "values": {
                "slope":      r(slope, 6),
                "intercept":  r(intercept, 4),
                "r_squared":  r(r_val**2, 4),
                "p_value":    r(p_val, 6),
                "std_error":  r(std_err, 6),
                "first_value": r(first_val),
                "last_value":  r(last_val),
                "pct_change":  r(pct_change * 100, 2),
            },
            "calculation":     (
                f"scipy.stats.linregress(x=[0..{n-1}], y={col}): "
                f"slope={slope:.6f}, intercept={intercept:.4f}, "
                f"R²={r_val**2:.4f}, p={p_val:.6f}"
            ),
            "confidence":      confidence["score"],
            "confidence_detail": confidence,
            "data_points_used": n,
            "low_reliability":  confidence["low_reliability"],
        }

    def build_correlation_insight(self, col1: str, col2: str,
                                  s1: pd.Series, s2: pd.Series,
                                  trace_log: list) -> dict | None:
        joined = pd.DataFrame({col1: s1, col2: s2}).dropna()
        n = len(joined)
        trace_log.append(_log(f"Corr:{col1}x{col2}", "CHECK", f"n={n}"))

        gate_pre = InsightGate.check_correlation(0, n, 1)  # pre-check n
        if n < MIN_ROWS_FOR_CORR:
            trace_log.append(_log(f"Corr:{col1}x{col2}", "BLOCK", f"Only {n} joint rows — need ≥{MIN_ROWS_FOR_CORR}"))
            return {"_blocked": True, "reason": f"INSUFFICIENT DATA: {n} paired rows for '{col1}' vs '{col2}'"}

        try:
            r_val, p_val = stats.pearsonr(joined[col1], joined[col2])
        except Exception as e:
            trace_log.append(_log(f"Corr:{col1}x{col2}", "ERROR", str(e)))
            return {"_blocked": True, "reason": f"COMPUTATION ERROR: {e}"}

        for name, val in [("r", r_val), ("p", p_val)]:
            if math.isnan(val) or math.isinf(val):
                return {"_blocked": True, "reason": f"COMPUTATION FAILED: {name} = {val}"}

        gate = InsightGate.check_correlation(r_val, n, p_val)
        if not gate["valid"]:
            for reason in gate["blocked"]:
                trace_log.append(_log(f"Corr:{col1}x{col2}", "BLOCK", reason))
            return {"_blocked": True, "reason": "GATE FAILED: " + " | ".join(gate["blocked"])}

        conf1 = InsightGate.compute_confidence(s1, pd.DataFrame({col1: s1}))
        conf2 = InsightGate.compute_confidence(s2, pd.DataFrame({col2: s2}))
        combined_conf = int((conf1["score"] + conf2["score"]) / 2)
        low_rel = combined_conf < 60

        strength = (
            "VERY STRONG" if abs(r_val) >= 0.9 else
            "STRONG"      if abs(r_val) >= 0.75 else
            "MODERATE-STRONG"
        )
        direction = "POSITIVE" if r_val > 0 else "NEGATIVE"
        trace_log.append(_log(f"Corr:{col1}x{col2}", "PASS", f"r={r_val:.4f}, p={p_val:.6f}, conf={combined_conf}"))

        return {
            "_blocked":        False,
            "type":            "correlation",
            "priority":        "high" if abs(r_val) >= 0.75 else "medium",
            "icon":            "git-merge",
            "title":           f"{strength} {direction} Correlation — {col1} ↔ {col2}",
            "insight":         (
                f"Pearson r = {r_val:.4f} (p = {p_val:.6f}). "
                f"R² = {r_val**2:.4f} — '{col1}' explains {r_val**2*100:.1f}% of variance in '{col2}'. "
                f"Based on {n} paired records. "
                f"{'As {col1} increases, {col2} increases.' if r_val > 0 else f'As {col1} increases, {col2} decreases.'} "
                f"{'Strong enough to build a predictive model.' if abs(r_val) >= 0.75 else 'Meets minimum threshold — use with caution.'}"
            ),
            "formula":         "Pearson r = Σ[(xi−x̄)(yi−ȳ)] / √[Σ(xi−x̄)²·Σ(yi−ȳ)²]",
            "values": {
                "r":         r(r_val, 4),
                "r_squared": r(r_val**2, 4),
                "p_value":   r(p_val, 6),
                "n_pairs":   n,
                "col1_mean": r(float(joined[col1].mean()), 4),
                "col2_mean": r(float(joined[col2].mean()), 4),
            },
            "calculation":     f"scipy.stats.pearsonr({col1}[n={n}], {col2}[n={n}]) → r={r_val:.4f}, p={p_val:.6f}",
            "confidence":      combined_conf,
            "confidence_detail": {"score": combined_conf, "col1_conf": conf1["score"], "col2_conf": conf2["score"]},
            "data_points_used": n,
            "low_reliability":  low_rel,
        }

    def build_anomaly_insight(self, col: str, series: pd.Series, trace_log: list) -> list:
        """Returns list of anomaly insights for a column (one per anomaly cluster)."""
        s = series.dropna()
        n = len(s)
        insights = []

        if n < 10:
            trace_log.append(_log(f"Anomaly:{col}", "BLOCK", f"n={n} < 10 — z-score unreliable"))
            return []

        mean_v = float(s.mean())
        std_v  = float(s.std())

        if std_v == 0:
            trace_log.append(_log(f"Anomaly:{col}", "BLOCK", "std=0 — cannot compute z-score"))
            return []

        z_scores  = (s - mean_v) / std_v
        threshold = MIN_ZSCORE_ANOMALY

        anomaly_vals = s[z_scores.abs() >= threshold]
        if len(anomaly_vals) == 0:
            trace_log.append(_log(f"Anomaly:{col}", "PASS", f"No anomalies: all |z| < {threshold}"))
            return []

        max_z     = float(z_scores.abs().max())
        conf_data = InsightGate.compute_confidence(series, pd.DataFrame({col: series}))

        gate = InsightGate.check_anomaly(max_z, n)
        if not gate["valid"]:
            for reason in gate["blocked"]:
                trace_log.append(_log(f"Anomaly:{col}", "BLOCK", reason))
            return []

        trace_log.append(_log(f"Anomaly:{col}", "PASS", f"{len(anomaly_vals)} anomalies, max|z|={max_z:.2f}"))

        insights.append({
            "_blocked":        False,
            "type":            "anomaly",
            "priority":        "high" if max_z >= 4 else "medium",
            "icon":            "alert-triangle",
            "title":           f"Statistical Anomaly Detected — {col}",
            "insight":         (
                f"{len(anomaly_vals)} value(s) in '{col}' exceed ±{threshold}σ (max |z| = {max_z:.2f}). "
                f"Distribution: mean = {mean_v:.3f}, std = {std_v:.3f}. "
                f"Anomalous values: {[round(float(v),3) for v in anomaly_vals.head(5).values]}. "
                f"These are not explainable by normal variation ({max_z:.2f}σ event)."
            ),
            "formula":         "z = (x − μ) / σ  |  Threshold: |z| ≥ 3",
            "values": {
                "mean":           r(mean_v, 4),
                "std":            r(std_v, 4),
                "max_z_score":    r(max_z, 4),
                "anomaly_count":  int(len(anomaly_vals)),
                "anomaly_pct":    r(len(anomaly_vals) / n * 100, 2),
                "threshold":      threshold,
                "anomaly_values": [r(float(v), 3) for v in anomaly_vals.head(5).values],
            },
            "calculation":     f"z_scores = ({col} − {mean_v:.3f}) / {std_v:.3f}; anomalies where |z| ≥ {threshold}",
            "confidence":      conf_data["score"],
            "confidence_detail": conf_data,
            "data_points_used":  n,
            "low_reliability":   conf_data["low_reliability"],
        })
        return insights

    def build_distribution_insight(self, col: str, series: pd.Series, trace_log: list) -> dict | None:
        s = series.dropna()
        n = len(s)
        if n < 5:
            return {"_blocked": True, "reason": f"INSUFFICIENT DATA: {n} < 5 for distribution analysis"}

        mean_v   = float(s.mean())
        median_v = float(s.median())
        std_v    = float(s.std())
        skew_v   = float(s.skew()) if n >= 3 else 0.0
        kurt_v   = float(s.kurtosis()) if n >= 4 else 0.0

        for name, val in [("mean", mean_v), ("std", std_v), ("skew", skew_v)]:
            if math.isnan(val) or math.isinf(val):
                return {"_blocked": True, "reason": f"COMPUTATION FAILED: {name} = {val}"}

        normality = {"is_normal": None, "p_value": None}
        if n >= 8:
            try:
                stat_n, p_n = stats.shapiro(s.values[:5000])
                normality = {"is_normal": bool(p_n > 0.05), "p_value": round(float(p_n), 6), "stat": round(float(stat_n), 4)}
            except Exception: pass

        cv = safe_div(std_v, abs(mean_v), default=None)
        conf_data = InsightGate.compute_confidence(series, pd.DataFrame({col: series}))

        # Only report if skew is meaningful
        if abs(skew_v) < 0.3 and normality.get("is_normal") is True:
            return {
                "_blocked": False,
                "type": "distribution", "priority": "low", "icon": "bar-chart-2",
                "title": f"Normally Distributed — {col}",
                "insight": f"'{col}' follows an approximately normal distribution (Shapiro-Wilk p={normality.get('p_value')}, skewness={skew_v:.3f}). Standard parametric tests are valid.",
                "formula": "Shapiro-Wilk test for normality",
                "values": {"mean": r(mean_v), "median": r(median_v), "std": r(std_v), "skewness": r(skew_v), "kurtosis": r(kurt_v)},
                "calculation": f"scipy.stats.shapiro({col}[n={n}]): W={normality.get('stat')}, p={normality.get('p_value')}",
                "confidence": conf_data["score"], "confidence_detail": conf_data,
                "data_points_used": n, "low_reliability": conf_data["low_reliability"],
            }

        if abs(skew_v) >= 0.5:
            direction = "right" if skew_v > 0 else "left"
            gap       = mean_v - median_v
            insight_text = (
                f"'{col}' is {direction}-skewed (skewness = {skew_v:.3f}). "
                f"Mean ({mean_v:.3f}) {'>' if gap > 0 else '<'} Median ({median_v:.3f}) by {abs(gap):.3f}. "
                f"CV = {cv*100:.1f}% if cv else 'N/A'. "
                f"{'Normality REJECTED (p=' + str(normality.get('p_value')) + ')' if normality.get('is_normal') is False else ''}. "
                f"{'Use non-parametric tests (Mann-Whitney, Kruskal-Wallis) for inference.' if abs(skew_v) > 1 else 'Mild skew — monitor but parametric tests may still be valid.'}"
            )
            return {
                "_blocked": False,
                "type": "distribution", "priority": "medium" if abs(skew_v) > 1 else "low", "icon": "bar-chart-2",
                "title": f"{'Highly ' if abs(skew_v)>1 else ''}Skewed Distribution — {col}",
                "insight": insight_text,
                "formula": "Skewness = [n/((n-1)(n-2))] × Σ[(xi−x̄)/s]³",
                "values": {
                    "mean": r(mean_v), "median": r(median_v), "std": r(std_v),
                    "skewness": r(skew_v), "kurtosis": r(kurt_v),
                    "cv_pct": r(cv*100, 2) if cv else None,
                    "normality_p": normality.get("p_value"),
                },
                "calculation": f"pandas.Series.skew({col}[n={n}]) = {skew_v:.4f}",
                "confidence": conf_data["score"], "confidence_detail": conf_data,
                "data_points_used": n, "low_reliability": conf_data["low_reliability"],
            }

        return None  # No meaningful distribution insight


# ── Full Real-Time Analysis Pipeline ─────────────────────────────────────────
class RealTimeEngine:
    """
    Complete real-time analysis pipeline.
    Called on every upload/update.
    Pushes results via WebSocket.
    """
    def __init__(self):
        self.validator    = ValidationGate()
        self.builder      = InsightBuilder()

    def run(self, df_raw: pd.DataFrame, label: str, combined: bool = False) -> dict:
        """
        Full pipeline: validation → cleaning → analysis → insights.
        Returns structured result with full trace log.
        Every computation step is logged.
        No stale/cached results.
        """
        pipeline_trace = []
        started_at     = datetime.utcnow().isoformat() + "Z"

        # ── PHASE 1: VALIDATION ──────────────────────────────────────
        pipeline_trace.append(_log("PHASE1:Validation", "START", "Running strict validation gate"))
        validation = self.validator.run(df_raw, label, combined=combined)

        for entry in validation["trace"]:
            pipeline_trace.append(entry)

        if not validation["passed"]:
            pipeline_trace.append(_log("PHASE1:Validation", "BLOCK", validation["stop_reason"]))
            return _clean({
                "status":         "BLOCKED",
                "stop_reason":    validation["stop_reason"],
                "label":          label,
                "validation":     validation,
                "pipeline_trace": pipeline_trace,
                "timestamp":      started_at,
                "insights":       [],
                "statistics":     {},
                "kpis":           [],
                "chart_data":     {},
                "correlations":   {"matrix": {}, "strong_pairs": []},
                "distributions":  {},
                "categorical":    {},
                "outliers":       {},
                "predictions":    {},
                "metadata": {
                    "label": label, "rows": len(df_raw),
                    "columns": len(df_raw.columns),
                    "analyzed_at": started_at,
                    "numeric_columns": [],
                    "categorical_columns": [],
                    "id_columns": [],
                    "date_columns": [],
                    "completeness_pct": 0,
                }
            })

        pipeline_trace.append(_log("PHASE1:Validation", "PASS", f"Validation passed. {len(validation['blocked_columns'])} columns blocked."))

        # ── PHASE 2: CLEANING ────────────────────────────────────────
        pipeline_trace.append(_log("PHASE2:Cleaning", "START", "Cleaning reliable columns only"))
        df, cleaning_log = self._clean(df_raw, validation["blocked_columns"], pipeline_trace)
        for entry in cleaning_log:
            pipeline_trace.append(entry)

        # ── PHASE 3: COLUMN CLASSIFICATION ───────────────────────────
        df = self._parse_dates(df)
        all_num   = df.select_dtypes(include=[np.number]).columns.tolist()
        id_cols   = [c for c in all_num if self._is_id(c, df[c])]
        num_cols  = [c for c in all_num if c not in id_cols and c not in validation["blocked_columns"]]
        cat_cols  = [c for c in df.select_dtypes(include=["object","category"]).columns.tolist()
                     if c not in validation["blocked_columns"]]
        date_cols = [c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])]

        pipeline_trace.append(_log("PHASE3:Classification", "PASS",
            f"Numeric: {num_cols} | Categorical: {cat_cols} | ID (excluded): {id_cols} | Date: {date_cols}"))

        # ── PHASE 4: STRICT STATISTICAL ANALYSIS ─────────────────────
        pipeline_trace.append(_log("PHASE4:Analysis", "START", "Running statistical computations"))
        stats_data   = self._statistics(df, num_cols, pipeline_trace)
        corr_data    = self._correlations(df, num_cols, pipeline_trace)
        dists        = self._distributions(df, num_cols)
        cat_data     = self._categorical(df, cat_cols)
        outliers_raw = self._outliers(df, num_cols, pipeline_trace)
        predictions  = self._predictions(df, num_cols, pipeline_trace)

        # ── PHASE 5: INSIGHT GENERATION (strict gates) ────────────────
        pipeline_trace.append(_log("PHASE5:Insights", "START", "Generating insights — strict gate active"))
        insights = []
        blocked_insights = []

        # Trend insights
        for col in num_cols[:8]:
            result = self.builder.build_trend_insight(col, df[col], pipeline_trace)
            if result:
                if result.get("_blocked"):
                    blocked_insights.append({"type": "trend", "col": col, "reason": result["reason"]})
                else:
                    result.pop("_blocked", None)
                    insights.append(result)

        # Correlation insights
        if len(num_cols) >= 2:
            for i, c1 in enumerate(num_cols[:8]):
                for c2 in num_cols[i+1:8]:
                    result = self.builder.build_correlation_insight(c1, c2, df[c1], df[c2], pipeline_trace)
                    if result:
                        if result.get("_blocked"):
                            blocked_insights.append({"type": "correlation", "cols": f"{c1},{c2}", "reason": result["reason"]})
                        else:
                            result.pop("_blocked", None)
                            insights.append(result)

        # Anomaly insights
        for col in num_cols[:6]:
            anomaly_list = self.builder.build_anomaly_insight(col, df[col], pipeline_trace)
            for ins in anomaly_list:
                if not ins.get("_blocked"):
                    ins.pop("_blocked", None)
                    insights.append(ins)

        # Distribution insights
        for col in num_cols[:6]:
            result = self.builder.build_distribution_insight(col, df[col], pipeline_trace)
            if result and not result.get("_blocked"):
                result.pop("_blocked", None)
                insights.append(result)

        # Sort by priority then confidence
        priority_order = {"high": 0, "medium": 1, "low": 2}
        insights.sort(key=lambda x: (priority_order.get(x.get("priority","low"), 2), -(x.get("confidence", 0))))

        pipeline_trace.append(_log("PHASE5:Insights", "DONE",
            f"{len(insights)} valid insights generated, {len(blocked_insights)} blocked by gates"))

        # ── PHASE 6: CHART DATA ───────────────────────────────────────
        chart_data = self._charts(df, num_cols, cat_cols, date_cols)
        kpis       = self._kpis(df, num_cols, cat_cols, validation)

        completed_at = datetime.utcnow().isoformat() + "Z"
        pipeline_trace.append(_log("PIPELINE", "COMPLETE",
            f"Full pipeline done. {len(insights)} insights, {len(blocked_insights)} blocked."))

        comp = self._completeness(df)

        return _clean({
            "status":           "OK",
            "label":            label,
            "validation":       validation,
            "cleaning_log":     cleaning_log,
            "pipeline_trace":   pipeline_trace,
            "blocked_insights": blocked_insights,
            "insights":         insights,
            "statistics":       stats_data,
            "correlations":     corr_data,
            "distributions":    dists,
            "categorical":      cat_data,
            "outliers":         outliers_raw,
            "predictions":      predictions,
            "chart_data":       chart_data,
            "kpis":             kpis,
            "timestamp":        started_at,
            "completed_at":     completed_at,
            "profile": {
                "completeness_pct":   comp,
                "duplicates":         int(df.duplicated().sum()),
                "id_columns_skipped": id_cols,
            },
            "metadata": {
                "label":               label,
                "analyzed_at":         started_at,
                "rows":                int(len(df)),
                "columns":             int(len(df.columns)),
                "numeric_columns":     num_cols,
                "id_columns":          id_cols,
                "categorical_columns": cat_cols,
                "date_columns":        date_cols,
                "all_columns":         list(df.columns),
                "completeness_pct":    comp,
                "insights_valid":      len(insights),
                "insights_blocked":    len(blocked_insights),
            }
        })

    # ── Helpers ──────────────────────────────────────────────────────────
    def _is_id(self, name, series):
        import re
        n = str(name).lower().strip()
        if n in ('id','index','row','no','num','number','sno','sr','#','serial','seq','row_id','record_id'): return True
        if re.match(r'^(id|index|row|num|serial|seq)[\s_\-]?\d*$', n): return True
        if pd.api.types.is_integer_dtype(series) and len(series) > 5:
            s = series.dropna().sort_values()
            diffs = s.diff().dropna()
            if len(diffs) > 0 and diffs.nunique() == 1 and float(diffs.iloc[0]) in (1,-1): return True
        return False

    def _parse_dates(self, df):
        for col in df.columns:
            if df[col].dtype == object:
                try:
                    p = pd.to_datetime(df[col], infer_datetime_format=True, errors='coerce')
                    if p.notna().sum() > len(df) * 0.6: df[col] = p
                except: pass
        return df

    def _completeness(self, df):
        cells = len(df) * len(df.columns)
        return round((1 - df.isnull().sum().sum() / cells) * 100, 2) if cells > 0 else 100.0

    def _clean(self, df, blocked_cols, trace):
        df  = df.copy()
        log = []

        # Work only on non-blocked columns
        work_cols = [c for c in df.columns if c not in blocked_cols]

        for col in df.select_dtypes(include='object').columns:
            if col in blocked_cols: continue
            before = df[col].copy()
            df[col] = df[col].str.strip() if hasattr(df[col], 'str') else df[col]
            changed = (df[col] != before).sum()
            if changed > 0:
                log.append(_log("Clean:Whitespace", "DONE", f"'{col}': stripped {changed} values", {"col":col,"count":int(changed)}))

        before = len(df)
        df = df.drop_duplicates()
        dup = before - len(df)
        if dup > 0:
            log.append(_log("Clean:Duplicates", "DONE", f"Removed {dup} exact duplicates", {"removed":dup}))

        for col in work_cols:
            pct = df[col].isnull().mean() * 100
            if pct > 0:
                if pd.api.types.is_numeric_dtype(df[col]):
                    med = df[col].median()
                    df[col].fillna(med, inplace=True)
                    log.append(_log("Clean:Impute", "DONE",
                        f"'{col}': filled {int(df[col].isnull().sum()+0)} NaN with median={med:.4f} ({pct:.1f}% was missing)",
                        {"col":col,"method":"median","value":float(med),"missing_pct":round(pct,2)}))
                else:
                    mode_val = df[col].mode()
                    if len(mode_val) > 0:
                        df[col].fillna(mode_val.iloc[0], inplace=True)
                        log.append(_log("Clean:Impute", "DONE",
                            f"'{col}': filled NaN with mode='{mode_val.iloc[0]}' ({pct:.1f}% was missing)",
                            {"col":col,"method":"mode","value":str(mode_val.iloc[0]),"missing_pct":round(pct,2)}))

        return df, log

    def _statistics(self, df, num_cols, trace):
        out = {}
        for col in num_cols:
            s = df[col].dropna()
            if len(s) < 2: continue
            try:
                mean_v = float(s.mean()); std_v = float(s.std())
                skew_v = float(s.skew()) if len(s)>=3 else 0.0
                kurt_v = float(s.kurtosis()) if len(s)>=4 else 0.0
                q1 = float(s.quantile(.25)); q3 = float(s.quantile(.75))
                cv = safe_div(std_v, abs(mean_v))
                se = safe_div(std_v, math.sqrt(len(s)))
                out[col] = {
                    "count": int(s.count()), "mean": r(mean_v), "median": r(float(s.median())),
                    "mode": r(float(s.mode().iloc[0])) if len(s.mode())>0 else None,
                    "std": r(std_v), "variance": r(float(s.var())), "sem": r(se),
                    "min": r(float(s.min())), "max": r(float(s.max())), "range": r(float(s.max()-s.min())),
                    "q1": r(q1), "q3": r(q3), "iqr": r(q3-q1),
                    "skewness": r(skew_v), "kurtosis": r(kurt_v), "cv": r(cv*100 if cv else None, 2),
                    "sum": r(float(s.sum()), 2),
                    "ci95_low": r(mean_v - 1.96*(se or 0)), "ci95_high": r(mean_v + 1.96*(se or 0)),
                    "p5": r(float(np.percentile(s,5))), "p10": r(float(np.percentile(s,10))),
                    "p90": r(float(np.percentile(s,90))), "p95": r(float(np.percentile(s,95))),
                    "p99": r(float(np.percentile(s,99))),
                    "skew_label": ("Highly right-skewed" if skew_v>1 else "Moderately right-skewed" if skew_v>.5
                                   else "Highly left-skewed" if skew_v<-1 else "Moderately left-skewed" if skew_v<-.5
                                   else "Approximately symmetric"),
                    "kurt_label": ("Leptokurtic (heavy tails)" if kurt_v>1 else "Platykurtic (light tails)" if kurt_v<-1 else "Mesokurtic (normal-like)"),
                }
                trace.append(_log(f"Stats:{col}", "DONE", f"mean={mean_v:.4f}, std={std_v:.4f}, n={len(s)}"))
            except Exception as e:
                trace.append(_log(f"Stats:{col}", "ERROR", str(e)))
        return out

    def _correlations(self, df, num_cols, trace):
        if len(num_cols) < 2: return {"matrix":{}, "strong_pairs":[]}
        try:
            corr = df[num_cols].corr()
        except Exception as e:
            trace.append(_log("Correlations", "ERROR", str(e)))
            return {"matrix":{}, "strong_pairs":[]}

        def sv(v):
            try: f=float(v); return None if (math.isnan(f) or math.isinf(f)) else round(f,4)
            except: return None

        matrix = {c:{c2:sv(corr.loc[c,c2]) for c2 in num_cols} for c in num_cols}
        pairs  = []
        for i,c1 in enumerate(num_cols):
            for c2 in num_cols[i+1:]:
                v = sv(corr.loc[c1,c2])
                if v is None: continue
                if abs(v) >= 0.3:
                    pairs.append({"col1":c1,"col2":c2,"r":v,"r2":round(v**2,4),
                        "strength":"Very Strong" if abs(v)>=.9 else "Strong" if abs(v)>=.7 else "Moderate" if abs(v)>=.5 else "Weak",
                        "direction":"Positive" if v>0 else "Negative", "p_explained":round(v**2*100,1)})
        pairs.sort(key=lambda x: abs(x["r"]), reverse=True)
        return {"matrix":matrix, "strong_pairs":pairs[:20]}

    def _distributions(self, df, num_cols):
        out = {}
        for col in num_cols:
            s = df[col].dropna()
            if len(s) < 5: continue
            try:
                bins = min(20, max(5, len(s)//3))
                hist, edges = np.histogram(s, bins=bins)
                normality = {"is_normal": None}
                if len(s) >= 8:
                    try:
                        stat, p = stats.shapiro(s.values[:5000])
                        sf,pf = float(stat), float(p)
                        if not math.isnan(sf) and not math.isnan(pf):
                            normality = {"test":"Shapiro-Wilk","stat":round(sf,4),"p_value":round(pf,6),"is_normal":bool(pf>.05)}
                    except: pass
                out[col] = {
                    "histogram": {"counts":[int(x) for x in hist],
                                  "centers":[r((edges[i]+edges[i+1])/2) for i in range(len(hist))],
                                  "edges":[r(e) for e in edges]},
                    "normality": normality,
                }
            except: pass
        return out

    def _categorical(self, df, cat_cols):
        out = {}
        for col in cat_cols:
            s = df[col].dropna(); vc = s.value_counts(); tot = max(len(s),1)
            out[col] = {
                "unique": int(s.nunique()),
                "top": [{"value":str(k),"count":int(v),"pct":round(float(v)/tot*100,2)} for k,v in vc.head(20).items()],
                "missing": int(df[col].isnull().sum()),
                "mode": str(vc.index[0]) if len(vc)>0 else None,
                "cardinality": "High" if s.nunique()>50 else "Medium" if s.nunique()>10 else "Low",
            }
        return out

    def _outliers(self, df, num_cols, trace):
        out = {}
        for col in num_cols:
            s = df[col].dropna()
            if len(s) < 4: continue
            q1,q3 = float(s.quantile(.25)), float(s.quantile(.75))
            iqr = q3-q1; lb,ub = q1-1.5*iqr, q3+1.5*iqr
            mask = (s<lb)|(s>ub)
            out[col] = {
                "count":int(mask.sum()), "pct":r(mask.mean()*100,2),
                "lb":r(lb), "ub":r(ub),
                "extremes":[r(v) for v in s[mask].head(6).values],
                "severity":"High" if mask.mean()>.1 else "Medium" if mask.mean()>.03 else "Low"
            }
        return out

    def _predictions(self, df, num_cols, trace):
        out = {}
        for col in num_cols[:8]:
            s = df[col].dropna()
            if len(s) < MIN_ROWS_FOR_TREND: continue
            x = np.arange(len(s))
            try:
                slope,intercept,rv,pv,se = stats.linregress(x, s.values)
                if math.isnan(slope) or math.isinf(slope): continue
                fitted = [r(intercept+slope*i) for i in x]
                xmean = float(x.mean()); ss_x = float(np.sum((x-xmean)**2)) or 1
                forecast = []
                for i in range(1,11):
                    xi = len(s)+i-1; pred = intercept+slope*xi
                    se_p = se*math.sqrt(1+1/len(s)+((xi-xmean)**2)/ss_x) if se else 0
                    forecast.append({"step":len(s)+i,"value":r(pred),"lo":r(pred-1.96*se_p),"hi":r(pred+1.96*se_p)})
                out[col] = {
                    "slope":r(slope),"intercept":r(intercept),"r2":r(rv**2),"pv":r(pv,6),"se":r(se),
                    "trend":"↗ Increasing" if slope>0 else "↘ Decreasing" if slope<0 else "→ Flat",
                    "significant":bool(pv<.05) if not math.isnan(pv) else False,
                    "fitted":fitted,"forecast":forecast,
                    "note":f"{'Significant' if pv<.05 else 'Non-significant'} {'increasing' if slope>0 else 'decreasing'} trend. Slope={slope:.4f}/step, R²={rv**2:.3f}."
                }
            except Exception as e:
                trace.append(_log(f"Predict:{col}", "ERROR", str(e)))
        return out

    def _charts(self, df, num_cols, cat_cols, date_cols):
        charts = {}
        for col in cat_cols[:5]:
            vc = df[col].value_counts().head(12)
            if len(vc)==0: continue
            charts[f"bar_{col}"] = {"type":"bar","title":f"Distribution: {col}","col":col,
                "data":[{"name":str(k)[:28],"count":int(v),"pct":round(float(v)/len(df)*100,1)} for k,v in vc.items()]}

        groups = {}
        for col in num_cols:
            s = df[col].dropna()
            if len(s)==0: continue
            mag = math.floor(math.log10(max(abs(float(s.mean())),0.01)+1))
            groups.setdefault(f"scale_{mag}",[]).append(col)
        for gname, gcols in groups.items():
            gcols = gcols[:5]; step = max(1,len(df)//80)
            sample = df[gcols].iloc[::step]
            x_vals = list(range(len(sample)))
            if date_cols:
                try:
                    idx = df[date_cols[0]].iloc[::step]
                    x_vals = [str(v.date()) if hasattr(v,"date") else str(v) for v in idx]
                except: pass
            def sv(v):
                try: f=float(v); return None if (math.isnan(f) or math.isinf(f)) else round(f,4)
                except: return None
            charts[f"trend_{gname}"] = {
                "type":"area","title":f"Trends: {', '.join(gcols)}","columns":gcols,
                "data":[{"x":x_vals[i],**{c:sv(sample.iloc[i][c]) for c in gcols}} for i in range(len(sample))]
            }
        useful = [c for c in num_cols if not self._is_id(c, df[c])]
        pairs  = [(useful[i],useful[j]) for i in range(min(4,len(useful))) for j in range(i+1,min(4,len(useful)))]
        for c1,c2 in pairs[:4]:
            j = df[[c1,c2]].dropna().head(500)
            def sv2(v):
                try: f=float(v); return None if (math.isnan(f) or math.isinf(f)) else round(f,4)
                except: return None
            charts[f"scatter_{c1}__{c2}"] = {
                "type":"scatter","title":f"{c1} vs {c2}","x":c1,"y":c2,
                "data":[{"x":sv2(row[c1]),"y":sv2(row[c2])} for _,row in j.iterrows() if not pd.isna(row[c1]) and not pd.isna(row[c2])]
            }
        for col in cat_cols:
            vc = df[col].value_counts()
            if 2<=len(vc)<=8:
                charts[f"pie_{col}"] = {"type":"pie","title":f"Share: {col}","col":col,
                    "data":[{"name":str(k)[:24],"value":int(v),"pct":round(float(v)/len(df)*100,1)} for k,v in vc.items()]}
                break
        for col in num_cols[:8]:
            s = df[col].dropna()
            if len(s)<4: continue
            charts[f"box_{col}"] = {"type":"box","col":col,"title":f"Box Plot: {col}",
                "min":r(float(s.min())),"q1":r(float(s.quantile(.25))),
                "median":r(float(s.median())),"mean":r(float(s.mean())),
                "q3":r(float(s.quantile(.75))),"max":r(float(s.max()))}
        return charts

    def _kpis(self, df, num_cols, cat_cols, validation):
        comp = self._completeness(df)
        dups = int(df.duplicated().sum())
        kpis = [
            {"label":"Total Records","value":f"{len(df):,}","icon":"database","color":"blue","sub":f"{len(df.columns)} columns"},
            {"label":"Analysis Columns","value":str(len(num_cols)),"icon":"trending-up","color":"purple","sub":f"{len(cat_cols)} categorical"},
            {"label":"Data Quality","value":f"{comp}%","icon":"shield-check","color":"green" if comp>90 else "gold","sub":"completeness"},
            {"label":"Columns Blocked","value":str(len(validation["blocked_columns"])),"icon":"alert-triangle","color":"red" if validation["blocked_columns"] else "green","sub":"by missing data gate"},
        ]
        for col in num_cols[:4]:
            s = df[col].dropna()
            if len(s)==0: continue
            mean_v = float(s.mean())
            if math.isnan(mean_v) or math.isinf(mean_v): continue
            kpis.append({"label":col[:20],"value":f"{mean_v:,.2f}","icon":"activity","color":"cyan",
                         "sub":f"σ={float(s.std()):.2f} · n={len(s)}"})
        return kpis[:8]
