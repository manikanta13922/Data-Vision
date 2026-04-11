"""
DataVision Pro — Strict Data Analysis Engine
Follows professional BI analyst methodology:
Step 1: Data Understanding
Step 2: Data Cleaning (with logged steps)
Step 3: Data Validation
Step 4: Feature Engineering
Step 5: Insight Generation (data-backed only)
Step 6: Visualization Plan
Step 7: Report Output
"""
import pandas as pd
import numpy as np
from scipy import stats
from datetime import datetime
import math, re, warnings, json
warnings.filterwarnings('ignore')

# ─────────────────────────── safe helpers ───────────────────────────────────
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

def fmt_num(v, d=3):
    if v is None: return "N/A"
    try:
        n = float(v)
        if math.isnan(n) or math.isinf(n): return "N/A"
        return f"{n:,.{d}f}"
    except: return str(v)

# ─────────────────────────── column intelligence ────────────────────────────
def _is_id_col(name, series):
    n = str(name).lower().strip()
    id_patterns = ('id','index','row','no','num','number','sno','s.no','sr','sr.no',
                   'row_id','row_num','record_id','#','serial','seq')
    if n in id_patterns: return True
    if re.match(r'^(id|index|row|num|serial|seq)[\s_\-]?\d*$', n): return True
    if pd.api.types.is_integer_dtype(series) and len(series) > 5:
        s = series.dropna()
        if len(s) > 0:
            diffs = s.sort_values().diff().dropna()
            if len(diffs) > 0 and diffs.nunique() == 1 and float(diffs.iloc[0]) in (1, -1):
                return True
    return False

def _col_description(col, series, is_id, is_date):
    dtype = str(series.dtype)
    unique_n = series.nunique()
    null_n   = series.isnull().sum()
    total    = len(series)
    if is_id:
        return f"Auto-increment identifier or row index (excluded from analysis)"
    if is_date:
        return f"Date/time column spanning {series.min()} to {series.max()}"
    if pd.api.types.is_numeric_dtype(series):
        return (f"Numeric ({dtype}) — range [{fmt_num(series.min(),2)}, {fmt_num(series.max(),2)}], "
                f"mean={fmt_num(series.mean(),2)}, {null_n} missing ({round(null_n/total*100,1)}%)")
    else:
        top = series.value_counts().index[0] if unique_n > 0 else "N/A"
        return (f"Categorical — {unique_n} unique values, "
                f"most common: '{top}', {null_n} missing ({round(null_n/total*100,1)}%)")

# ─────────────────────────── smart file loader ──────────────────────────────
def _find_header(raw):
    best, best_score = 0, -1
    for i in range(min(15, len(raw))):
        row = raw.iloc[i]
        str_c   = sum(1 for v in row if isinstance(v, str) and len(str(v).strip()) > 1)
        unnamed = sum(1 for v in row if str(v).startswith('Unnamed'))
        score   = str_c * 2 + row.notna().sum() - unnamed * 4
        if score > best_score:
            best_score, best = score, i
    return best

def _clean_df_structure(df):
    good = [c for c in df.columns
            if not (str(c).startswith('Unnamed') and df[c].isna().all())]
    df = df[good].copy()
    df.columns = [str(c).strip() for c in df.columns]
    df = df.dropna(how='all').reset_index(drop=True)
    return df

def load_file(file_path, ext):
    if ext == 'json':
        df = pd.read_json(file_path)
        return {'Data': _clean_df_structure(df)}
    if ext in ('xlsx', 'xls'):
        xl = pd.ExcelFile(file_path)
        sheets = {}
        for sheet in xl.sheet_names:
            try:
                raw = pd.read_excel(file_path, sheet_name=sheet, header=None, nrows=20)
                hr  = _find_header(raw)
                df  = pd.read_excel(file_path, sheet_name=sheet, header=hr)
                df  = _clean_df_structure(df)
                if len(df) >= 2 and len(df.columns) >= 1:
                    sheets[sheet] = df
            except Exception: pass
        return sheets or {}
    if ext == 'csv':
        for enc in ('utf-8', 'latin-1', 'cp1252'):
            try:
                raw = pd.read_csv(file_path, header=None, nrows=20, encoding=enc)
                hr  = _find_header(raw)
                df  = pd.read_csv(file_path, header=hr, encoding=enc)
                df  = _clean_df_structure(df)
                return {'Data': df}
            except Exception: continue
    return {}

# ─────────────────────────── main analyzer ──────────────────────────────────
class DataAnalyzer:
    def __init__(self):
        self.last_result    = None
        self.last_file_path = None
        self.all_sheets     = {}
        self._raw_dfs       = {}   # store raw DataFrames for query engine

    # ─────────────────────────────────────────────────────────────────────
    def analyze_multi(self, files):
        all_results = []
        for finfo in files:
            sheets = load_file(finfo['path'], finfo['ext'])
            for sheet_name, df in sheets.items():
                label = finfo['name'] if len(sheets)==1 else f"{finfo['name']} › {sheet_name}"
                result = self._full_pipeline(df, label)
                all_results.append(result)
                self.all_sheets[label] = df
                self._raw_dfs[label]   = df

        if not all_results:
            raise ValueError("No valid data found in uploaded files.")

        if len(all_results) == 1:
            self.last_result = all_results[0]
            return all_results[0]

        combined = {
            'multi':   True,
            'sheets':  all_results,
            'labels':  [r['label'] for r in all_results],
            'metadata': {
                'analyzed_at':  datetime.now().isoformat(),
                'total_sheets': len(all_results),
                'total_rows':   sum(r['metadata']['rows'] for r in all_results),
            }
        }
        self.last_result = combined
        return _clean(combined)

    # ─────────────────────────────────────────────────────────────────────
    def _full_pipeline(self, df_raw, label):
        """
        Strict 9-step analysis pipeline.
        """
        # ── STEP 1: Data Understanding ────────────────────────────────
        understanding = self._step1_understand(df_raw)

        # ── STEP 2: Data Cleaning ─────────────────────────────────────
        df_clean, cleaning_log = self._step2_clean(df_raw)

        # ── STEP 3: Validation ────────────────────────────────────────
        validation = self._step3_validate(df_clean)

        # ── Column classification ─────────────────────────────────────
        df_clean = self._parse_dates(df_clean)
        all_num   = df_clean.select_dtypes(include=[np.number]).columns.tolist()
        id_cols   = [c for c in all_num if _is_id_col(c, df_clean[c])]
        num_cols  = [c for c in all_num if c not in id_cols]
        cat_cols  = df_clean.select_dtypes(include=['object','category']).columns.tolist()
        date_cols = [c for c in df_clean.columns if pd.api.types.is_datetime64_any_dtype(df_clean[c])]

        # ── STEP 4: Feature Engineering ───────────────────────────────
        df_fe, features = self._step4_features(df_clean, num_cols, cat_cols, date_cols)

        # ── STEP 5: Insight Generation ────────────────────────────────
        stats_data  = self._statistics(df_fe, num_cols)
        corr_data   = self._correlations(df_fe, num_cols)
        outliers    = self._outliers(df_fe, num_cols)
        dists       = self._distributions(df_fe, num_cols)
        cat_data    = self._categorical(df_fe, cat_cols)
        predictions = self._predictions(df_fe, num_cols)
        regression  = self._regression(df_fe, num_cols)
        insights    = self._step5_insights(df_fe, num_cols, cat_cols, date_cols,
                                           stats_data, corr_data, outliers, predictions, features)

        # ── STEP 6: Visualization Plan ────────────────────────────────
        viz_plan  = self._step6_viz_plan(df_fe, num_cols, cat_cols, date_cols, insights)
        chart_data = self._build_charts(df_fe, num_cols, cat_cols, date_cols)

        # ── STEP 7: Report Output ─────────────────────────────────────
        report    = self._step7_report(df_fe, label, understanding, cleaning_log,
                                       validation, features, insights, stats_data)
        kpis      = self._kpis(df_fe, num_cols, cat_cols)

        result = {
            'label':           label,
            # Step outputs
            'understanding':   understanding,
            'cleaning_log':    cleaning_log,
            'validation':      validation,
            'features':        features,
            'insights':        insights,
            'viz_plan':        viz_plan,
            'report':          report,
            # Data
            'statistics':      stats_data,
            'correlations':    corr_data,
            'distributions':   dists,
            'categorical':     cat_data,
            'outliers':        outliers,
            'predictions':     predictions,
            'regression':      regression,
            'chart_data':      chart_data,
            'kpis':            kpis,
            'profile':         self._profile(df_fe, num_cols, cat_cols, date_cols, id_cols),
            'metadata': {
                'label':              label,
                'analyzed_at':        datetime.now().isoformat(),
                'rows':               int(len(df_fe)),
                'columns':            int(len(df_fe.columns)),
                'numeric_columns':    num_cols,
                'id_columns':         id_cols,
                'categorical_columns': cat_cols,
                'date_columns':       date_cols,
                'all_columns':        list(df_fe.columns),
                'completeness_pct':   self._completeness(df_fe),
            }
        }
        return _clean(result)

    # ─────────────────────────────────────────────────────────────────────
    # STEP 1 — DATA UNDERSTANDING
    # ─────────────────────────────────────────────────────────────────────
    def _step1_understand(self, df):
        all_num  = df.select_dtypes(include=[np.number]).columns.tolist()
        id_cols  = [c for c in all_num if _is_id_col(c, df[c])]
        num_cols = [c for c in all_num if c not in id_cols]
        cat_cols = df.select_dtypes(include=['object','category']).columns.tolist()

        df2 = self._parse_dates(df.copy())
        date_cols = [c for c in df2.columns if pd.api.types.is_datetime64_any_dtype(df2[c])]

        col_descriptions = {}
        for col in df.columns:
            is_id   = col in id_cols
            is_date = col in date_cols
            col_descriptions[col] = _col_description(col, df[col], is_id, is_date)

        missing = df.isnull().sum()
        missing_pct = (missing / len(df) * 100).round(2)
        dup_count = int(df.duplicated().sum())

        anomalies = []
        for col in num_cols:
            s = df[col].dropna()
            if len(s) < 4: continue
            q1, q3 = s.quantile(0.25), s.quantile(0.75)
            iqr = q3 - q1
            out = ((s < q1-3*iqr) | (s > q3+3*iqr)).sum()
            if out > 0:
                anomalies.append(f"'{col}': {out} extreme outliers (beyond 3×IQR)")
        for col in num_cols:
            s = df[col].dropna()
            if len(s) > 0 and float(s.min()) < 0:
                col_lower = col.lower()
                if any(x in col_lower for x in ('price','cost','sales','revenue','amount','count','qty','quantity','age')):
                    anomalies.append(f"'{col}': contains negative values — verify if valid")
        for col in num_cols:
            s = df[col].dropna()
            if len(s) > 0:
                pct_zero = (s == 0).mean()
                if pct_zero > 0.5:
                    anomalies.append(f"'{col}': {pct_zero*100:.1f}% zeros — possible default/missing encoding")

        return {
            'shape':              {'rows': int(len(df)), 'cols': int(len(df.columns))},
            'column_descriptions': col_descriptions,
            'numeric_cols':       num_cols,
            'categorical_cols':   cat_cols,
            'date_cols':          date_cols,
            'id_cols':            id_cols,
            'missing_summary':    {c: {'count': int(missing[c]), 'pct': float(missing_pct[c])} for c in df.columns if missing[c] > 0},
            'duplicates':         dup_count,
            'anomalies_detected': anomalies,
            'data_types':         {c: str(df[c].dtype) for c in df.columns},
        }

    # ─────────────────────────────────────────────────────────────────────
    # STEP 2 — DATA CLEANING (logged)
    # ─────────────────────────────────────────────────────────────────────
    def _step2_clean(self, df):
        df = df.copy()
        log = []

        # Strip string whitespace
        str_cols = df.select_dtypes(include='object').columns
        for col in str_cols:
            before = df[col].copy()
            df[col] = df[col].str.strip() if hasattr(df[col], 'str') else df[col]
            changed = (df[col] != before).sum()
            if changed > 0:
                log.append({'step': 'Strip whitespace', 'column': col,
                            'action': f'Stripped leading/trailing whitespace from {changed} values',
                            'reason': 'Whitespace causes false mismatches in groupby/filters'})

        # Remove fully empty rows
        before_rows = len(df)
        df = df.dropna(how='all')
        removed = before_rows - len(df)
        if removed > 0:
            log.append({'step': 'Remove empty rows', 'column': 'ALL',
                        'action': f'Removed {removed} completely empty rows',
                        'reason': 'Rows with all nulls carry no information'})

        # Remove duplicate rows
        dup_count = int(df.duplicated().sum())
        if dup_count > 0:
            df = df.drop_duplicates()
            log.append({'step': 'Remove duplicates', 'column': 'ALL',
                        'action': f'Removed {dup_count} exact duplicate rows',
                        'reason': 'Duplicate rows cause double-counting in aggregations'})

        # Flag columns with >30% missing (don't drop, just log)
        missing = df.isnull().sum()
        for col in df.columns:
            pct = missing[col] / len(df) * 100
            if pct > 30:
                log.append({'step': 'High missingness flag', 'column': col,
                            'action': f'Flagged: {pct:.1f}% missing values — NOT imputed',
                            'reason': 'Imputing >30% missing data would fabricate information; column retained for transparency'})
            elif 0 < pct <= 30:
                # Impute numerics with median, categoricals with mode
                if pd.api.types.is_numeric_dtype(df[col]):
                    median_val = df[col].median()
                    df[col].fillna(median_val, inplace=True)
                    log.append({'step': 'Impute missing (numeric)', 'column': col,
                                'action': f'Filled {int(missing[col])} NaN with median={median_val:.3f}',
                                'reason': 'Median is robust to outliers; preserves distribution shape'})
                else:
                    mode_val = df[col].mode()
                    if len(mode_val) > 0:
                        df[col].fillna(mode_val.iloc[0], inplace=True)
                        log.append({'step': 'Impute missing (categorical)', 'column': col,
                                    'action': f'Filled {int(missing[col])} NaN with mode="{mode_val.iloc[0]}"',
                                    'reason': 'Mode imputation for low-missing categoricals'})

        # Standardize boolean-like columns (Yes/No → 1/0)
        for col in df.select_dtypes(include='object').columns:
            uniq = set(df[col].dropna().str.lower().unique()) if hasattr(df[col], 'str') else set()
            if uniq <= {'yes','no','true','false','y','n','1','0'}:
                mapping = {'yes':1,'y':1,'true':1,'1':1,'no':0,'n':0,'false':0,'0':0}
                original = df[col].copy()
                df[col] = df[col].str.lower().map(mapping)
                if df[col].notna().any():
                    log.append({'step': 'Standardize boolean', 'column': col,
                                'action': 'Converted Yes/No/True/False to 1/0',
                                'reason': 'Enables numeric aggregation of boolean fields'})
                else:
                    df[col] = original  # revert if mapping failed

        if not log:
            log.append({'step': 'No cleaning required', 'column': 'ALL',
                        'action': 'Dataset is clean — no issues found',
                        'reason': 'No nulls, duplicates, or formatting issues detected'})

        return df, log

    # ─────────────────────────────────────────────────────────────────────
    # STEP 3 — DATA VALIDATION
    # ─────────────────────────────────────────────────────────────────────
    def _step3_validate(self, df):
        issues  = []
        passed  = []
        warnings_list = []

        # Check for logical negatives in count/price columns
        for col in df.select_dtypes(include=[np.number]).columns:
            s = df[col].dropna()
            if len(s) == 0: continue
            col_lower = col.lower()
            if any(x in col_lower for x in ('price','cost','revenue','sales','amount','count','qty','quantity','age','score','rate','percent','pct')):
                neg_count = (s < 0).sum()
                if neg_count > 0:
                    issues.append(f"FAIL — '{col}': {neg_count} negative values in a column that logically should be ≥ 0")
                else:
                    passed.append(f"PASS — '{col}': All values ≥ 0 (logical validation)")

        # Check percentage columns are within 0-100
        for col in df.select_dtypes(include=[np.number]).columns:
            col_lower = col.lower()
            if any(x in col_lower for x in ('percent','pct','rate','ratio')):
                s = df[col].dropna()
                if len(s) > 0:
                    if float(s.max()) > 100 or float(s.min()) < 0:
                        warnings_list.append(f"WARN — '{col}': values outside [0,100] for a percentage column — verify units")
                    else:
                        passed.append(f"PASS — '{col}': percentage values within [0,100]")

        # Check date columns for future dates
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                future = (df[col] > pd.Timestamp.now()).sum()
                if future > 0:
                    warnings_list.append(f"WARN — '{col}': {future} dates are in the future — verify if expected")
                else:
                    passed.append(f"PASS — '{col}': No future dates")

        # Check for near-constant columns (low variance)
        for col in df.select_dtypes(include=[np.number]).columns:
            s = df[col].dropna()
            if len(s) > 5 and s.nunique() == 1:
                issues.append(f"WARN — '{col}': Constant column (all same value={s.iloc[0]}) — not useful for analysis")

        # Check overall data integrity
        total_cells = len(df) * len(df.columns)
        null_cells  = df.isnull().sum().sum()
        null_pct    = null_cells / total_cells * 100

        if null_pct == 0:
            passed.append("PASS — Zero missing values after cleaning")
        elif null_pct < 5:
            warnings_list.append(f"WARN — {null_pct:.1f}% cells still null (all are >30% missing columns, intentionally retained)")
        else:
            issues.append(f"FAIL — {null_pct:.1f}% cells null — review before drawing conclusions")

        if not issues:
            passed.append("PASS — No logical validation failures found")

        return {
            'passed':   passed,
            'warnings': warnings_list,
            'failures': issues,
            'overall':  'CLEAN' if not issues else 'HAS ISSUES',
            'note': 'Uncertain or edge cases are flagged as WARN, not silently accepted'
        }

    # ─────────────────────────────────────────────────────────────────────
    # STEP 4 — FEATURE ENGINEERING
    # ─────────────────────────────────────────────────────────────────────
    def _step4_features(self, df, num_cols, cat_cols, date_cols):
        df = df.copy()
        features = []

        # Growth rates between consecutive numeric rows
        for col in num_cols[:4]:
            s = df[col].dropna()
            if len(s) >= 3:
                new_col = f"{col}_pct_change"
                df[new_col] = df[col].pct_change() * 100
                features.append({
                    'name': new_col,
                    'formula': f'({col}[n] - {col}[n-1]) / {col}[n-1] × 100',
                    'type': 'Growth Rate',
                    'why': f'Measures relative change in {col} between consecutive records — identifies acceleration or deceleration'
                })

        # Moving averages for trending numeric columns
        if len(df) >= 5:
            for col in num_cols[:3]:
                window = min(5, len(df)//4) if len(df) >= 10 else 3
                new_col = f"{col}_ma{window}"
                df[new_col] = df[col].rolling(window=window, min_periods=1).mean()
                features.append({
                    'name': new_col,
                    'formula': f'Rolling mean of {col} over {window} rows',
                    'type': 'Moving Average',
                    'why': f'Smooths noise in {col} to reveal underlying trend'
                })

        # Ratios between column pairs (only if both positive and same scale)
        pairs_done = 0
        for i, c1 in enumerate(num_cols):
            if pairs_done >= 3: break
            for c2 in num_cols[i+1:]:
                if pairs_done >= 3: break
                s1 = df[c1].dropna(); s2 = df[c2].dropna()
                if len(s1)<3 or len(s2)<3: continue
                if float(s2.min()) <= 0: continue
                if abs(float(s1.mean())) / max(abs(float(s2.mean())), 0.001) > 100: continue
                new_col = f"{c1}_per_{c2}"
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    df[new_col] = df[c1] / df[c2].replace(0, np.nan)
                features.append({
                    'name': new_col,
                    'formula': f'{c1} / {c2}',
                    'type': 'Ratio',
                    'why': f'Normalizes {c1} by {c2} — enables fair comparisons across groups'
                })
                pairs_done += 1

        # Z-scores for anomaly flagging
        for col in num_cols[:4]:
            s = df[col].dropna()
            if len(s) >= 5 and float(s.std()) > 0:
                new_col = f"{col}_zscore"
                df[new_col] = (df[col] - float(s.mean())) / float(s.std())
                features.append({
                    'name': new_col,
                    'formula': f'({col} - mean({col})) / std({col})',
                    'type': 'Z-Score',
                    'why': f'Standardized score for {col} — values beyond ±3 are statistical outliers'
                })

        # Date-based features
        for col in date_cols[:2]:
            try:
                df[f"{col}_year"]  = df[col].dt.year
                df[f"{col}_month"] = df[col].dt.month
                df[f"{col}_dow"]   = df[col].dt.dayofweek
                features.append({
                    'name': f"{col}_year / _month / _dow",
                    'formula': f'Extract year, month, day-of-week from {col}',
                    'type': 'Date Decomposition',
                    'why': 'Enables time-based aggregations and seasonality analysis'
                })
            except Exception: pass

        return df, features

    # ─────────────────────────────────────────────────────────────────────
    # STEP 5 — INSIGHT GENERATION (data-backed only, no fabrication)
    # ─────────────────────────────────────────────────────────────────────
    def _step5_insights(self, df, num_cols, cat_cols, date_cols,
                        stats_d, corr_d, outliers_d, preds_d, features):
        insights = []

        # ── Distribution insights ──
        for col, s in list(stats_d.items())[:8]:
            skew = s.get('skewness') or 0
            cv   = s.get('cv') or 0
            kurt = s.get('kurtosis') or 0
            mean_v = s.get('mean'); med_v = s.get('median')

            if abs(skew) > 0.8 and mean_v is not None and med_v is not None:
                gap = abs(float(mean_v or 0) - float(med_v or 0))
                direction = 'right' if skew > 0 else 'left'
                insights.append({
                    'type': 'distribution', 'priority': 'medium', 'icon': 'bar-chart-2',
                    'title': f"Skewed Distribution — {col}",
                    'description': (
                        f"'{col}' is {direction}-skewed (skewness={skew:.3f}). "
                        f"Mean={fmt_num(mean_v,2)} vs Median={fmt_num(med_v,2)} (gap={fmt_num(gap,2)}). "
                        f"The {direction} tail {'inflates' if direction=='right' else 'deflates'} the average. "
                        f"Use median for representative central value. "
                        f"{'Log transformation recommended before regression modeling.' if abs(skew)>1.5 else ''}"
                    )
                })

            if cv and float(cv) > 30:
                insights.append({
                    'type': 'variability', 'priority': 'high', 'icon': 'alert-circle',
                    'title': f"High Variability — {col}",
                    'description': (
                        f"'{col}' has CV={float(cv):.1f}% indicating high relative spread. "
                        f"Std={fmt_num(s.get('std'),2)}, Range=[{fmt_num(s.get('min'),2)}, {fmt_num(s.get('max'),2)}]. "
                        f"95% CI: [{fmt_num(s.get('ci95_low'),2)}, {fmt_num(s.get('ci95_high'),2)}]. "
                        f"Investigate whether this variability is real business variance or data quality issue."
                    )
                })

            if kurt is not None and abs(float(kurt)) > 3:
                insights.append({
                    'type': 'distribution', 'priority': 'low', 'icon': 'activity',
                    'title': f"Heavy Tails — {col}",
                    'description': (
                        f"'{col}' has high kurtosis ({float(kurt):.2f}), indicating heavy tails. "
                        f"Extreme values are more frequent than a normal distribution. "
                        f"P99={fmt_num(s.get('p99'),2)} vs P95={fmt_num(s.get('p95'),2)} shows the tail extent."
                    )
                })

        # ── Correlation insights ──
        for pair in corr_d.get('strong_pairs', [])[:8]:
            abs_r = abs(float(pair.get('r', pair.get('correlation', 0)) or 0))
            r_val = float(pair.get('r', pair.get('correlation', 0)) or 0)
            r2    = float(pair.get('r2', pair.get('r_squared', 0)) or 0)
            insights.append({
                'type': 'correlation',
                'priority': 'high' if abs_r >= 0.6 else 'medium',
                'icon': 'git-merge',
                'title': f"{pair.get('strength','')} {pair.get('direction','')} Correlation: {pair['col1']} ↔ {pair['col2']}",
                'description': (
                    f"Pearson r={r_val:.4f}, R²={r2:.4f} — "
                    f"'{pair['col1']}' explains {r2*100:.1f}% of variance in '{pair['col2']}'. "
                    f"{'Actionable: strong enough to build a predictive model.' if abs_r>=0.7 else 'Moderate relationship — useful as a feature.'} "
                    f"Direction: as {pair['col1']} {'increases' if r_val>0 else 'decreases'}, {pair['col2']} tends to {'increase' if r_val>0 else 'decrease'}."
                )
            })

        # ── Trend insights from predictions ──
        for col, pred in list(preds_d.items())[:5]:
            r2_val  = float(pred.get('r2') or pred.get('r_squared') or 0)
            pv_val  = float(pred.get('pv') or pred.get('p_value') or 1)
            slope   = float(pred.get('slope') or 0)
            sig     = bool(pred.get('significant', pv_val < 0.05))
            trend_s = pred.get('trend', ('↗ Increasing' if slope>0 else '↘ Decreasing'))
            insights.append({
                'type': 'prediction',
                'priority': 'high' if sig else 'medium',
                'icon': 'trending-up',
                'title': f"Trend Analysis — {col}",
                'description': (
                    f"{trend_s} trend {'✅ statistically significant (p={pv_val:.4f})' if sig else '⚠️ not statistically significant (p={:.4f})'.format(pv_val)}. "
                    f"Slope={slope:.4f} per record. R²={r2_val:.4f} ({r2_val*100:.1f}% variance explained by linear trend). "
                    f"{'Model has strong predictive power.' if r2_val>0.7 else 'Weak linear fit — non-linear pattern possible.' if r2_val<0.2 else 'Moderate predictive power.'}"
                )
            })

        # ── Outlier insights ──
        for col, d in [(c,v) for c,v in outliers_d.items() if v.get('severity')=='High'][:4]:
            insights.append({
                'type': 'outlier', 'priority': 'high', 'icon': 'alert-triangle',
                'title': f"High Outlier Rate — {col}",
                'description': (
                    f"{d.get('pct',0):.1f}% of '{col}' ({d.get('count',0):,} records) outside IQR fence "
                    f"[{fmt_num(d.get('lb',d.get('lower_bound')),2)}, {fmt_num(d.get('ub',d.get('upper_bound')),2)}]. "
                    f"Extreme values: {[v for v in (d.get('extremes') or d.get('extreme_values') or [])[:4] if v is not None]}. "
                    f"Action required: Investigate root cause — data error, fraud, or legitimate business anomaly?"
                )
            })

        # ── Categorical insights ──
        for col in cat_cols[:4]:
            vc = df[col].value_counts()
            if len(vc) == 0: continue
            top_pct = float(vc.iloc[0] / len(df) * 100)
            if top_pct > 50:
                insights.append({
                    'type': 'categorical', 'priority': 'medium', 'icon': 'pie-chart',
                    'title': f"Dominant Category — {col}",
                    'description': (
                        f"'{vc.index[0]}' represents {top_pct:.1f}% of all '{col}' values ({vc.iloc[0]:,} records). "
                        f"{df[col].nunique()} unique categories total. "
                        f"{'Severely imbalanced — stratified sampling required for any ML tasks.' if top_pct>80 else 'Moderate imbalance — monitor for bias in grouped analysis.'}"
                    )
                })

        # ── Feature engineering insights ──
        for feat in features[:4]:
            if feat['type'] in ('Growth Rate', 'Ratio'):
                col_name = feat['name']
                if col_name in df.columns:
                    s = df[col_name].dropna()
                    if len(s) >= 3:
                        avg_val = float(s.mean())
                        max_val = float(s.max())
                        min_val = float(s.min())
                        insights.append({
                            'type': 'feature', 'priority': 'medium', 'icon': 'layers',
                            'title': f"Engineered KPI — {col_name}",
                            'description': (
                                f"{feat['type']}: {feat['formula']}. "
                                f"Average={fmt_num(avg_val,2)}, Max={fmt_num(max_val,2)}, Min={fmt_num(min_val,2)}. "
                                f"Why useful: {feat['why']}"
                            )
                        })

        if not insights:
            insights.append({
                'type': 'info', 'priority': 'low', 'icon': 'info',
                'title': 'Insufficient data for deep insights',
                'description': 'Dataset is too small or lacks numeric columns for meaningful pattern detection. Upload a larger dataset with more numeric variables.'
            })

        return insights

    # ─────────────────────────────────────────────────────────────────────
    # STEP 6 — VISUALIZATION PLAN
    # ─────────────────────────────────────────────────────────────────────
    def _step6_viz_plan(self, df, num_cols, cat_cols, date_cols, insights):
        plan = []

        if date_cols and num_cols:
            plan.append({'chart': 'Area/Line Chart', 'columns': f"{date_cols[0]} × {', '.join(num_cols[:3])}", 'why': 'Shows trends over time — detects seasonality and growth patterns', 'avoid': 'Do not mix columns with different scales on same axis'})

        for col in num_cols[:3]:
            plan.append({'chart': 'Histogram + KDE', 'columns': col, 'why': f'Shows distribution shape of {col} — reveals skewness and outliers', 'avoid': 'Not useful if column has fewer than 20 unique values'})

        if len(num_cols) >= 2:
            plan.append({'chart': 'Correlation Heatmap', 'columns': ', '.join(num_cols[:8]), 'why': 'Reveals pairwise relationships at a glance', 'avoid': 'Do not include ID columns'})
            plan.append({'chart': 'Scatter Plot Matrix', 'columns': f"Top correlated pairs from {', '.join(num_cols[:4])}", 'why': 'Shows relationship direction and linearity', 'avoid': 'Keep to <5 columns or it becomes unreadable'})

        for col in cat_cols[:3]:
            n_unique = df[col].nunique()
            if n_unique <= 6:
                plan.append({'chart': 'Donut / Pie Chart', 'columns': col, 'why': f'Proportional share makes sense for {n_unique} categories', 'avoid': 'Never use pie chart with >7 categories'})
            else:
                plan.append({'chart': 'Horizontal Bar Chart', 'columns': col, 'why': f'Better than pie for {n_unique} categories — enables direct comparison', 'avoid': 'Sort bars descending for readability'})

        for col in num_cols[:4]:
            plan.append({'chart': 'Box Plot', 'columns': col, 'why': 'Shows 5-number summary and outliers in one visual', 'avoid': 'Supplement with count — box plots hide sample size'})

        if any(p.get('type') == 'prediction' for p in insights):
            plan.append({'chart': 'Line Chart with Forecast Band', 'columns': 'Numeric trends + 10-step forecast', 'why': 'Shows historical + predicted values with 95% CI band', 'avoid': 'Always show confidence intervals — never show point forecast alone'})

        return plan

    # ─────────────────────────────────────────────────────────────────────
    # STEP 7 — REPORT OUTPUT
    # ─────────────────────────────────────────────────────────────────────
    def _step7_report(self, df, label, understanding, cleaning_log,
                      validation, features, insights, stats_d):
        rows = len(df)
        cols = len(df.columns)
        comp = self._completeness(df)

        high_insights = [i for i in insights if i.get('priority') == 'high']
        med_insights  = [i for i in insights if i.get('priority') == 'medium']

        exec_summary = (
            f"Dataset '{label}' contains {rows:,} records across {cols} columns "
            f"with {comp}% data completeness. "
            f"Cleaning removed {sum(1 for l in cleaning_log if 'duplicate' in l.get('step','').lower())} duplicate rows "
            f"and imputed missing values where missing rate was ≤30% (justification logged per column). "
            f"Validation found {len(validation.get('failures',[]))} issues and {len(validation.get('warnings',[]))} warnings. "
            f"Feature engineering created {len(features)} derived metrics including growth rates, moving averages, and z-scores. "
            f"{len(high_insights)} high-priority and {len(med_insights)} medium-priority insights were identified. "
            f"All conclusions are backed by computed data — no assumptions were made."
        )

        key_metrics = []
        for col, s in list(stats_d.items())[:6]:
            key_metrics.append({
                'metric': col,
                'mean':   fmt_num(s.get('mean'), 2),
                'median': fmt_num(s.get('median'), 2),
                'std':    fmt_num(s.get('std'), 2),
                'range':  f"[{fmt_num(s.get('min'),2)}, {fmt_num(s.get('max'),2)}]",
                'quality': 'Normal' if abs(float(s.get('skewness') or 0)) < 0.5 else 'Skewed',
            })

        pbi_measures = []
        for col, s in list(stats_d.items())[:8]:
            pbi_measures.append(f"Avg_{col} = AVERAGE(Table[{col}])")
            pbi_measures.append(f"Total_{col} = SUM(Table[{col}])")
            pbi_measures.append(f"Median_{col} = MEDIAN(Table[{col}])")
            pbi_measures.append(f"StdDev_{col} = STDEV(Table[{col}])")

        return {
            'executive_summary': exec_summary,
            'key_metrics_table': key_metrics,
            'data_quality_score': f"{comp}%",
            'cleaning_steps':    len(cleaning_log),
            'features_created':  len(features),
            'insights_count':    {'high': len(high_insights), 'medium': len(med_insights)},
            'power_bi_measures': pbi_measures[:24],
            'real_time_readiness': {
                'backend_needed':   'FastAPI endpoint (already implemented) + scheduled re-analysis',
                'database':         'PostgreSQL or Azure SQL — store cleaned data, not raw',
                'streaming':        'For live data: Kafka → FastAPI → React dashboard with 60s auto-refresh',
                'power_bi_connect': 'Connect Power BI to this Excel export OR use REST API connector to /api/analyze',
            }
        }

    # ─────────────────────────────────────────────────────────────────────
    # ── Statistical computations ──────────────────────────────────────────
    # ─────────────────────────────────────────────────────────────────────
    def _parse_dates(self, df):
        for col in df.columns:
            if df[col].dtype == object:
                try:
                    p = pd.to_datetime(df[col], infer_datetime_format=True, errors='coerce')
                    if p.notna().sum() > len(df) * 0.6:
                        df[col] = p
                except Exception: pass
        return df

    def _completeness(self, df):
        cells = len(df) * len(df.columns)
        return round((1 - df.isnull().sum().sum() / cells) * 100, 2) if cells > 0 else 100.0

    def _profile(self, df, num_cols, cat_cols, date_cols, id_cols):
        miss = df.isnull().sum()
        return {
            'shape':              {'rows': int(len(df)), 'columns': int(len(df.columns))},
            'column_types':       {c: str(df[c].dtype) for c in df.columns},
            'missing_values':     {c: int(miss[c]) for c in df.columns if miss[c] > 0},
            'missing_pct':        {c: round(float(miss[c]/len(df)*100),2) for c in df.columns if miss[c]>0},
            'duplicates':         0,
            'memory_mb':          round(float(df.memory_usage(deep=True).sum()/1024**2),3),
            'completeness_pct':   self._completeness(df),
            'id_columns_skipped': id_cols,
        }

    def _statistics(self, df, num_cols):
        out = {}
        for col in num_cols:
            s = df[col].dropna()
            if len(s) < 2: continue
            mean_v = float(s.mean()); std_v = float(s.std())
            skew_v = float(s.skew()) if len(s)>=3 else 0.0
            kurt_v = float(s.kurtosis()) if len(s)>=4 else 0.0
            q1 = float(s.quantile(.25)); q3 = float(s.quantile(.75))
            cv = std_v/mean_v*100 if mean_v!=0 else None
            se = std_v/math.sqrt(len(s))
            out[col] = {
                'count':    int(s.count()), 'mean': r(mean_v), 'median': r(float(s.median())),
                'mode':     r(float(s.mode().iloc[0])) if len(s.mode())>0 else None,
                'std':      r(std_v), 'variance': r(float(s.var())), 'sem': r(se),
                'min':      r(float(s.min())), 'max': r(float(s.max())), 'range': r(float(s.max()-s.min())),
                'q1':       r(q1), 'q3': r(q3), 'iqr': r(q3-q1),
                'skewness': r(skew_v), 'kurtosis': r(kurt_v), 'cv': r(cv,2), 'sum': r(float(s.sum()),2),
                'ci95_low': r(mean_v-1.96*se), 'ci95_high': r(mean_v+1.96*se),
                'p5': r(float(np.percentile(s,5))), 'p10': r(float(np.percentile(s,10))),
                'p90': r(float(np.percentile(s,90))), 'p95': r(float(np.percentile(s,95))),
                'p99': r(float(np.percentile(s,99))),
                'skew_label': ('Highly right-skewed' if skew_v>1 else 'Moderately right-skewed' if skew_v>.5
                               else 'Highly left-skewed' if skew_v<-1 else 'Moderately left-skewed' if skew_v<-.5
                               else 'Approximately symmetric'),
                'kurt_label': ('Leptokurtic (heavy tails)' if kurt_v>1 else 'Platykurtic (light tails)' if kurt_v<-1 else 'Mesokurtic (normal-like)'),
            }
        return out

    def _correlations(self, df, num_cols):
        if len(num_cols) < 2: return {'matrix': {}, 'strong_pairs': []}
        corr = df[num_cols].corr()
        def sv(v):
            try: f=float(v); return None if (math.isnan(f) or math.isinf(f)) else round(f,4)
            except: return None
        matrix = {c: {c2: sv(corr.loc[c,c2]) for c2 in num_cols} for c in num_cols}
        pairs  = []
        for i,c1 in enumerate(num_cols):
            for c2 in num_cols[i+1:]:
                v = sv(corr.loc[c1,c2])
                if v is None or abs(v) < 0.3: continue
                strength = 'Very Strong' if abs(v)>=.9 else 'Strong' if abs(v)>=.7 else 'Moderate' if abs(v)>=.5 else 'Weak'
                pairs.append({'col1':c1,'col2':c2,'r':v,'r2':round(v**2,4),
                    'strength':strength,'direction':'Positive' if v>0 else 'Negative',
                    'p_explained': round(v**2*100,1)})
        pairs.sort(key=lambda x: abs(x['r']), reverse=True)
        return {'matrix': matrix, 'strong_pairs': pairs[:20]}

    def _distributions(self, df, num_cols):
        out = {}
        for col in num_cols:
            s = df[col].dropna()
            if len(s) < 5: continue
            try:
                bins = min(20, max(5, len(s)//3))
                hist, edges = np.histogram(s, bins=bins)
            except: continue
            normality = {'is_normal': None}
            if len(s) >= 8:
                try:
                    stat, p = stats.shapiro(s.values[:5000])
                    sf,pf = float(stat), float(p)
                    if not math.isnan(sf) and not math.isnan(pf):
                        normality = {'test':'Shapiro-Wilk','stat':round(sf,4),'p_value':round(pf,6),'is_normal':bool(pf>.05)}
                except: pass
            out[col] = {
                'histogram': {'counts': [int(x) for x in hist],
                              'centers': [r((edges[i]+edges[i+1])/2) for i in range(len(hist))],
                              'edges': [r(e) for e in edges]},
                'normality': normality,
            }
        return out

    def _categorical(self, df, cat_cols):
        out = {}
        for col in cat_cols:
            s = df[col].dropna(); vc = s.value_counts(); tot = max(len(s),1)
            out[col] = {
                'unique': int(s.nunique()),
                'top': [{'value':str(k),'count':int(v),'pct':round(float(v)/tot*100,2)} for k,v in vc.head(20).items()],
                'missing': int(df[col].isnull().sum()),
                'mode': str(vc.index[0]) if len(vc)>0 else None,
                'cardinality': 'High' if s.nunique()>50 else 'Medium' if s.nunique()>10 else 'Low',
            }
        return out

    def _outliers(self, df, num_cols):
        out = {}
        for col in num_cols:
            s = df[col].dropna()
            if len(s) < 4: continue
            q1,q3 = float(s.quantile(.25)), float(s.quantile(.75))
            iqr = q3-q1; lb,ub = q1-1.5*iqr, q3+1.5*iqr
            mask = (s<lb)|(s>ub)
            out[col] = {'count':int(mask.sum()),'pct':r(mask.mean()*100,2),
                'lb':r(lb),'ub':r(ub),'extremes':[r(v) for v in s[mask].head(6).values],
                'severity':'High' if mask.mean()>.1 else 'Medium' if mask.mean()>.03 else 'Low'}
        return out

    def _predictions(self, df, num_cols):
        out = {}
        for col in num_cols[:8]:
            s = df[col].dropna()
            if len(s) < 5: continue
            x = np.arange(len(s))
            try: slope,intercept,rv,pv,se = stats.linregress(x, s.values)
            except: continue
            if math.isnan(slope) or math.isinf(slope): continue
            fitted = [r(intercept+slope*i) for i in x]
            xmean = float(x.mean()); ss_x = float(np.sum((x-xmean)**2)) or 1
            forecast = []
            for i in range(1,11):
                xi = len(s)+i-1; pred = intercept+slope*xi
                se_p = se*math.sqrt(1+1/len(s)+((xi-xmean)**2)/ss_x)
                forecast.append({'step':len(s)+i,'value':r(pred),'lo':r(pred-1.96*se_p),'hi':r(pred+1.96*se_p)})
            out[col] = {
                'slope':r(slope),'intercept':r(intercept),'r2':r(rv**2),'pv':r(pv,6),'se':r(se),
                'trend':'↗ Increasing' if slope>0 else '↘ Decreasing' if slope<0 else '→ Flat',
                'significant':bool(pv<.05) if not math.isnan(pv) else False,
                'fitted':fitted,'forecast':forecast,
                'note': (f"{'Significant' if pv<.05 else 'Non-significant'} "
                         f"{'increasing' if slope>0 else 'decreasing'} trend. "
                         f"Slope={slope:.4f}/step, R²={rv**2:.3f}.")
            }
        return out

    def _regression(self, df, num_cols):
        if len(num_cols)<2: return {}
        out = {}
        for target in num_cols[:6]:
            best = None
            for pred in num_cols:
                if pred==target: continue
                try:
                    j = df[[pred,target]].dropna()
                    if len(j)<5: continue
                    sl,ic,rv,pv,se = stats.linregress(j[pred],j[target])
                    if math.isnan(rv): continue
                    if best is None or abs(rv)>abs(best['r']):
                        best={'predictor':pred,'r':r(rv),'r2':r(rv**2),'slope':r(sl),
                              'intercept':r(ic),'pv':r(pv,6),'sig':bool(pv<.05),
                              'eq':f"{target} = {sl:.4f}×{pred} + {ic:.4f}"}
                except: continue
            if best: out[target]=best
        return out

    def _build_charts(self, df, num_cols, cat_cols, date_cols):
        charts = {}
        # Scale-grouped trend charts
        groups = {}
        for col in num_cols:
            s = df[col].dropna()
            if len(s)==0: continue
            mag = math.floor(math.log10(max(abs(float(s.mean())),0.01)+1))
            groups.setdefault(f'scale_{mag}',[]).append(col)
        for gname, gcols in groups.items():
            gcols = gcols[:5]
            step = max(1,len(df)//80)
            sample = df[gcols].iloc[::step]
            x_vals = list(range(len(sample)))
            if date_cols:
                try:
                    idx = df[date_cols[0]].iloc[::step]
                    x_vals = [str(v.date()) if hasattr(v,'date') else str(v) for v in idx]
                except: pass
            def sv(v):
                try: f=float(v); return None if (math.isnan(f) or math.isinf(f)) else round(f,4)
                except: return None
            charts[f'trend_{gname}'] = {
                'type':'area','title':f'Trends: {", ".join(gcols)}','columns':gcols,
                'data':[{'x':x_vals[i],**{c:sv(sample.iloc[i][c]) for c in gcols}} for i in range(len(sample))]
            }
        # Bar charts for categoricals
        for col in cat_cols[:5]:
            vc = df[col].value_counts().head(12)
            if len(vc)==0: continue
            charts[f'bar_{col}'] = {
                'type':'bar','title':f'Distribution: {col}','col':col,
                'data':[{'name':str(k)[:28],'count':int(v),'pct':round(float(v)/len(df)*100,1)} for k,v in vc.items()]
            }
        # Scatter plots (excluding ID cols)
        useful = [c for c in num_cols if not _is_id_col(c, df[c])]
        pairs  = [(useful[i],useful[j]) for i in range(min(4,len(useful))) for j in range(i+1,min(4,len(useful)))]
        for c1,c2 in pairs[:6]:
            j = df[[c1,c2]].dropna().head(500)
            charts[f'scatter_{c1}__{c2}'] = {
                'type':'scatter','title':f'{c1} vs {c2}','x':c1,'y':c2,
                'data':[{'x':round(float(row[c1]),4),'y':round(float(row[c2]),4)} for _,row in j.iterrows() if not pd.isna(row[c1]) and not pd.isna(row[c2])]
            }
        # Pie for low-cardinality
        for col in cat_cols:
            vc = df[col].value_counts()
            if 2<=len(vc)<=8:
                charts[f'pie_{col}'] = {
                    'type':'pie','title':f'Share: {col}','col':col,
                    'data':[{'name':str(k)[:24],'value':int(v),'pct':round(float(v)/len(df)*100,1)} for k,v in vc.items()]
                }
                break
        # Box plots
        for col in num_cols[:8]:
            s = df[col].dropna()
            if len(s)<4: continue
            charts[f'box_{col}'] = {
                'type':'box','col':col,'title':f'Box Plot: {col}',
                'min':r(float(s.min())),'q1':r(float(s.quantile(.25))),
                'median':r(float(s.median())),'mean':r(float(s.mean())),
                'q3':r(float(s.quantile(.75))),'max':r(float(s.max())),
            }
        return charts

    def _kpis(self, df, num_cols, cat_cols):
        comp = self._completeness(df)
        dups = int(df.duplicated().sum())
        kpis = [
            {'label':'Total Records','value':f"{len(df):,}",'icon':'database','color':'blue','sub':f"{len(df.columns)} columns"},
            {'label':'Analysis Columns','value':str(len(num_cols)),'icon':'trending-up','color':'purple','sub':f"{len(cat_cols)} categorical"},
            {'label':'Data Quality','value':f"{comp}%",'icon':'shield-check','color':'green' if comp>90 else 'gold','sub':'completeness'},
            {'label':'Duplicates Removed','value':f"{dups:,}",'icon':'copy','color':'red' if dups>0 else 'green','sub':'after cleaning'},
        ]
        for col in num_cols[:4]:
            s = df[col].dropna()
            if len(s)==0: continue
            mean_v = float(s.mean())
            if math.isnan(mean_v) or math.isinf(mean_v): continue
            kpis.append({'label':col[:20],'value':f"{mean_v:,.2f}",'icon':'activity','color':'cyan',
                         'sub':f"σ={float(s.std()):.2f} · [{float(s.min()):.2f}, {float(s.max()):.2f}]"})
        return kpis[:8]

    # ─────────────────────────────────────────────────────────────────────
    # QUERY ENGINE — Strict data-backed question answering
    # ─────────────────────────────────────────────────────────────────────
    def answer_query(self, question: str, label: str = None) -> dict:
        """
        Strict query engine — only answers from actual data.
        Returns structured JSON output with steps, result, confidence.
        """
        # Get the correct dataframe
        if label and label in self._raw_dfs:
            df = self._raw_dfs[label]
        elif self._raw_dfs:
            label, df = list(self._raw_dfs.items())[0]
        else:
            return {
                'query_interpretation': question,
                'steps': ['No dataset loaded'],
                'result': 'ERROR: No dataset available. Upload a file first.',
                'confidence': 'low',
                'chart_suggestion': 'none',
                'error': True,
            }

        q = question.lower()
        steps  = []
        result = None
        chart  = 'table'
        conf   = 'high'

        # ── Parse intent ──────────────────────────────────────────────
        agg_map = {
            'average':  'mean',   'avg':      'mean',   'mean':      'mean',
            'total':    'sum',    'sum':      'sum',    'maximum':   'max',
            'max':      'max',    'highest':  'max',    'minimum':   'min',
            'min':      'min',    'lowest':   'min',    'count':     'count',
            'how many': 'count',  'median':   'median', 'std':       'std',
            'standard deviation': 'std',
        }
        detected_agg  = None
        for kw, agg in agg_map.items():
            if kw in q:
                detected_agg = agg; break

        # Detect column references
        all_cols = list(df.columns)
        num_cols_all = df.select_dtypes(include=[np.number]).columns.tolist()
        id_cols  = [c for c in num_cols_all if _is_id_col(c, df[c])]
        num_cols = [c for c in num_cols_all if c not in id_cols]
        cat_cols = df.select_dtypes(include=['object','category']).columns.tolist()

        target_col = None
        group_col  = None
        for col in all_cols:
            if col.lower() in q:
                if col in num_cols:
                    target_col = col
                elif col in cat_cols:
                    group_col = col

        # If no exact match, fuzzy match
        if target_col is None:
            for col in num_cols:
                words = col.lower().replace('_',' ').split()
                if any(w in q for w in words if len(w)>2):
                    target_col = col; break
        if group_col is None:
            for col in cat_cols:
                words = col.lower().replace('_',' ').split()
                if any(w in q for w in words if len(w)>2):
                    group_col = col; break

        steps.append(f"Dataset: '{label}' — {len(df):,} rows × {len(df.columns)} columns")

        # ── CASE 1: Grouped aggregation ───────────────────────────────
        if target_col and group_col and detected_agg:
            steps.append(f"Query type: Grouped aggregation")
            steps.append(f"Target column: '{target_col}' ({detected_agg})")
            steps.append(f"Group by: '{group_col}'")
            steps.append(f"Validation: '{target_col}' exists as numeric ✓, '{group_col}' exists as categorical ✓")
            steps.append(f"SQL equivalent: SELECT {group_col}, {detected_agg.upper()}({target_col}) FROM data GROUP BY {group_col} ORDER BY 2 DESC")

            agg_fn = {'mean': lambda x: x.mean(), 'sum': lambda x: x.sum(),
                      'max': lambda x: x.max(), 'min': lambda x: x.min(),
                      'count': lambda x: x.count(), 'median': lambda x: x.median(), 'std': lambda x: x.std()}
            grouped = df.groupby(group_col)[target_col].apply(agg_fn[detected_agg]).sort_values(ascending=False)
            steps.append(f"Result: {len(grouped)} groups computed")
            table_rows = [{'group': str(k), 'value': round(float(v),3)} for k, v in grouped.items() if not math.isnan(float(v))]
            result = {
                'type': 'grouped_table',
                'summary': f"{detected_agg.upper()} of '{target_col}' by '{group_col}':",
                'top_result': f"{grouped.index[0]} = {grouped.iloc[0]:.3f}" if len(grouped)>0 else "N/A",
                'table': table_rows[:20],
            }
            chart = 'bar'

        # ── CASE 2: Single column aggregation ─────────────────────────
        elif target_col and detected_agg:
            steps.append(f"Query type: Single column aggregation")
            steps.append(f"Column: '{target_col}', Aggregation: {detected_agg}")
            steps.append(f"Validation: '{target_col}' is numeric ✓")
            s = df[target_col].dropna()
            steps.append(f"Non-null records used: {len(s):,} / {len(df):,}")
            fns = {'mean':s.mean,'sum':s.sum,'max':s.max,'min':s.min,'count':s.count,'median':s.median,'std':s.std}
            val = fns[detected_agg]()
            steps.append(f"Computation: {detected_agg}({target_col}) = {float(val):.4f}")
            result = {
                'type': 'single_value',
                'summary': f"{detected_agg.upper()} of '{target_col}' = {float(val):,.4f}",
                'value': float(val),
                'context': f"Based on {len(s):,} records (excluded {len(df)-len(s)} nulls)",
            }
            chart = 'table'

        # ── CASE 3: Distribution / range question ─────────────────────
        elif target_col and any(x in q for x in ('distribut','range','spread','histogram','outlier','skew')):
            steps.append(f"Query type: Distribution analysis for '{target_col}'")
            s = df[target_col].dropna()
            q1, q3 = float(s.quantile(.25)), float(s.quantile(.75))
            iqr = q3-q1
            lb, ub = q1-1.5*iqr, q3+1.5*iqr
            outlier_count = int(((s<lb)|(s>ub)).sum())
            skew_v = float(s.skew())
            steps.append(f"Computed: percentiles, IQR, outlier fences, skewness")
            result = {
                'type': 'distribution',
                'summary': f"Distribution of '{target_col}'",
                'stats': {
                    'mean': round(float(s.mean()),3), 'median': round(float(s.median()),3),
                    'std': round(float(s.std()),3), 'min': round(float(s.min()),3),
                    'max': round(float(s.max()),3), 'IQR': round(iqr,3),
                    'skewness': round(skew_v,3),
                    'outliers': outlier_count,
                    'outlier_pct': round(outlier_count/len(s)*100,1),
                },
                'interpretation': (
                    f"{'Right-skewed' if skew_v>0.5 else 'Left-skewed' if skew_v<-0.5 else 'Approximately symmetric'} "
                    f"with {outlier_count} outliers ({round(outlier_count/len(s)*100,1)}%)."
                ),
            }
            chart = 'histogram'

        # ── CASE 4: Correlation question ──────────────────────────────
        elif any(x in q for x in ('correlat','relationship','relate','predict','impact','affect')):
            steps.append(f"Query type: Correlation analysis")
            if len(num_cols) < 2:
                result = {'type':'error','summary':'Insufficient numeric columns for correlation analysis.'}
                conf = 'low'
            else:
                corr = df[num_cols].corr()
                pairs = []
                for i, c1 in enumerate(num_cols):
                    for c2 in num_cols[i+1:]:
                        v = corr.loc[c1,c2]
                        if not math.isnan(v):
                            pairs.append({'col1':c1,'col2':c2,'r':round(float(v),4),'r2':round(float(v)**2,4)})
                pairs.sort(key=lambda x: abs(x['r']), reverse=True)
                steps.append(f"Computed Pearson correlations for {len(num_cols)} columns → {len(pairs)} pairs")
                if target_col:
                    col_pairs = [p for p in pairs if p['col1']==target_col or p['col2']==target_col]
                    result = {
                        'type': 'correlation',
                        'summary': f"Correlations involving '{target_col}':",
                        'pairs': col_pairs[:10],
                    }
                else:
                    result = {
                        'type': 'correlation',
                        'summary': f"Top {min(10,len(pairs))} strongest correlations:",
                        'pairs': pairs[:10],
                    }
                chart = 'heatmap'

        # ── CASE 5: Trend question ─────────────────────────────────────
        elif any(x in q for x in ('trend','over time','increase','decrease','grow','change','forecast','predict next')):
            steps.append(f"Query type: Trend analysis")
            if not num_cols:
                result = {'type':'error','summary':'No numeric columns for trend analysis.'}
                conf = 'low'
            else:
                col = target_col or num_cols[0]
                s = df[col].dropna()
                x = np.arange(len(s))
                slope, intercept, rv, pv, se = stats.linregress(x, s.values)
                sig = pv < 0.05
                steps.append(f"Linear regression on '{col}': slope={slope:.4f}, R²={rv**2:.4f}, p={pv:.4f}")
                result = {
                    'type': 'trend',
                    'summary': f"Trend in '{col}'",
                    'trend_direction': '↗ Increasing' if slope>0 else '↘ Decreasing',
                    'slope': round(float(slope),6),
                    'r_squared': round(float(rv**2),4),
                    'p_value': round(float(pv),6),
                    'significant': sig,
                    'interpretation': (
                        f"{'Statistically significant' if sig else 'Non-significant'} "
                        f"{'increasing' if slope>0 else 'decreasing'} trend. "
                        f"R²={rv**2:.4f} ({rv**2*100:.1f}% of variance explained by time)."
                    ),
                }
                chart = 'line'

        # ── CASE 6: Column list / summary ─────────────────────────────
        elif any(x in q for x in ('column','field','what data','describe','summary','overview','what is')):
            steps.append("Query type: Dataset overview")
            understanding = self._step1_understand(df)
            result = {
                'type': 'overview',
                'summary': f"Dataset has {len(df):,} rows and {len(df.columns)} columns",
                'numeric_columns': num_cols,
                'categorical_columns': cat_cols,
                'column_descriptions': understanding['column_descriptions'],
                'completeness': f"{self._completeness(df)}%",
            }
            chart = 'table'

        # ── CASE 7: Count / how many ───────────────────────────────────
        elif 'how many' in q or 'count' in q:
            steps.append("Query type: Count")
            if group_col:
                vc = df[group_col].value_counts()
                steps.append(f"Counting records grouped by '{group_col}'")
                result = {
                    'type': 'count',
                    'summary': f"Count by '{group_col}':",
                    'table': [{'group': str(k), 'value': int(v)} for k, v in vc.items()[:20]],
                }
                chart = 'bar'
            else:
                result = {'type':'count','summary':f"Total records in dataset: {len(df):,}",'value': len(df)}
                chart = 'table'

        # ── Fallback ──────────────────────────────────────────────────
        else:
            steps.append("Query type: Could not fully parse — returning general statistics")
            conf = 'low'
            if num_cols:
                col = target_col or num_cols[0]
                s = df[col].dropna()
                result = {
                    'type': 'general',
                    'summary': f"General statistics for '{col}'",
                    'stats': {'mean': round(float(s.mean()),3), 'median': round(float(s.median()),3),
                              'min': round(float(s.min()),3), 'max': round(float(s.max()),3)},
                    'note': f"Could not fully interpret query. Showing summary for '{col}'. Try asking: 'What is the average X?' or 'Show distribution of Y' or 'Correlation between A and B?'"
                }
            else:
                result = {'type':'error','summary':'Insufficient data to answer. No numeric columns found.'}

        return _clean({
            'query_interpretation': question,
            'steps': steps,
            'result': result,
            'confidence': conf,
            'chart_suggestion': chart,
            'dataset_used': label,
            'timestamp': datetime.now().isoformat(),
        })
