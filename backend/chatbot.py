"""
DataVision Pro Chatbot v2 — Smarter query engine.
Returns only data-backed measures. No fabrication.
"""
import pandas as pd
import numpy as np
from scipy import stats
import math, re
from datetime import datetime


def _safe(v):
    try:
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        return None


# ── All aggregation operations ──────────────────────────────────────────────
AGG_OPS = {
    'average': ('mean',   lambda s: _safe(s.mean())),
    'avg':     ('mean',   lambda s: _safe(s.mean())),
    'mean':    ('mean',   lambda s: _safe(s.mean())),
    'sum':     ('sum',    lambda s: _safe(s.sum())),
    'total':   ('sum',    lambda s: _safe(s.sum())),
    'maximum': ('max',    lambda s: _safe(s.max())),
    'max':     ('max',    lambda s: _safe(s.max())),
    'highest': ('max',    lambda s: _safe(s.max())),
    'minimum': ('min',    lambda s: _safe(s.min())),
    'min':     ('min',    lambda s: _safe(s.min())),
    'lowest':  ('min',    lambda s: _safe(s.min())),
    'count':   ('count',  lambda s: int(s.count())),
    'median':  ('median', lambda s: _safe(s.median())),
    'std':     ('std',    lambda s: _safe(s.std())),
    'variance':('var',    lambda s: _safe(s.var())),
    'range':   ('range',  lambda s: _safe(s.max()-s.min()) if len(s)>0 else None),
}

INTENT_MAP = [
    (r'\b(correlat|relationship|relate|between)\b',    'correlation'),
    (r'\b(trend|over time|grow|increas|decreas|change)\b','trend'),
    (r'\b(distribut|histogram|spread|how.*distribut)\b','distribution'),
    (r'\b(outlier|anomal|unusual|extreme|weird)\b',    'outlier'),
    (r'\b(compare|vs|versus|differ)\b',                'comparison'),
    (r'\b(top|highest|best|most|rank|leader)\b',       'ranking'),
    (r'\b(bottom|lowest|worst|least|fewest|weakest)\b','ranking'),
    (r'\b(schema|column|field|what.*data|structure|describe|list)\b','schema'),
    (r'\b(count|how many|number of|frequency)\b',      'count'),
    (r'\b(group.*by|by|segment|breakdown|split|per|each)\b','groupby'),
    (r'\b(measure|calculat|creat|add|make|build|dax|powerbi)\b','measure'),
    (r'\b(forecast|predict|next|future|will)\b',       'forecast'),
    (r'\b(summary|overview|summar|describe|stats)\b',  'summary'),
    (r'\b(unique|distinct|different)\b',               'unique'),
    (r'\b(missing|null|empty|blank)\b',                'missing'),
    (r'\b(percent|proportion|share|ratio)\b',          'percent'),
]


def detect_intent(q: str) -> str:
    ql = q.lower()
    for pattern, intent in INTENT_MAP:
        if re.search(pattern, ql):
            return intent
    for agg in AGG_OPS:
        if agg in ql:
            return 'aggregation'
    return 'general'


def find_columns(q: str, df: pd.DataFrame):
    ql = q.lower()
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(include=['object','category']).columns.tolist()
    found_num, found_cat = [], []

    # Exact match first
    for col in df.columns:
        col_l = col.lower().replace('_',' ')
        if col_l in ql or col.lower() in ql:
            (found_num if col in num_cols else found_cat).append(col)

    # Fuzzy: multi-word column names
    if not found_num and not found_cat:
        for col in df.columns:
            words = [w for w in col.lower().replace('_',' ').split() if len(w)>2]
            if words and all(w in ql for w in words[:2]):
                (found_num if col in num_cols else found_cat).append(col)
            elif any(w in ql for w in words if len(w)>3):
                (found_num if col in num_cols else found_cat).append(col)

    return list(dict.fromkeys(found_num)), list(dict.fromkeys(found_cat))


def find_agg(q: str):
    ql = q.lower()
    for kw, (name, fn) in AGG_OPS.items():
        if kw in ql:
            return kw, name, fn
    return None, None, None


def answer(question: str, df: pd.DataFrame, schema=None) -> dict:
    steps, q = [], question.strip()
    intent = detect_intent(q)
    steps.append(f"Intent: {intent.upper()}")

    num_cols  = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols  = df.select_dtypes(include=['object','category']).columns.tolist()
    date_cols = [c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])]
    found_num, found_cat = find_columns(q, df)
    agg_kw, agg_name, agg_fn = find_agg(q)

    steps.append(f"Dataset: {len(df):,} rows × {len(df.columns)} cols")
    if found_num: steps.append(f"Numeric matched: {found_num}")
    if found_cat: steps.append(f"Categorical matched: {found_cat}")

    # ── SCHEMA ─────────────────────────────────────────────────────────────
    if intent == 'schema':
        steps.append("Building schema from dataset")
        sc = []
        for col in df.columns:
            s = df[col].dropna()
            is_num  = col in num_cols
            is_date = col in date_cols
            sc.append({
                'column':   col,
                'type':     'Date/Time' if is_date else 'Numeric' if is_num else 'Text',
                'dtype':    str(df[col].dtype),
                'null_pct': round(df[col].isnull().mean()*100,1),
                'unique':   int(df[col].nunique()),
                'samples':  [str(v)[:20] for v in s.head(3).values],
                'agg_hint': 'SUM/AVG' if is_num else 'GROUP BY/COUNT',
            })
        return {'type':'schema','summary':f"Schema for {len(df.columns)} columns","steps":steps,
                'schema':sc,'num_cols':num_cols,'cat_cols':cat_cols,
                'confidence':'high','chart':'table','measure_code':None}

    # ── MISSING ─────────────────────────────────────────────────────────────
    if intent == 'missing':
        miss = df.isnull().sum()
        rows = [{'column':c,'missing':int(miss[c]),'pct':round(miss[c]/len(df)*100,1)}
                for c in df.columns if miss[c]>0]
        rows.sort(key=lambda x: x['missing'], reverse=True)
        return {'type':'missing','summary':f"{len(rows)} columns have missing values",
                'steps':steps,'table':rows,'confidence':'high','chart':'bar',
                'measure_code':"df.isnull().sum().sort_values(ascending=False)"}

    # ── UNIQUE counts ───────────────────────────────────────────────────────
    if intent == 'unique':
        target = found_cat or found_num or df.columns.tolist()
        rows = [{'column':c,'unique':int(df[c].nunique()),'cardinality':
                 'High' if df[c].nunique()>50 else 'Medium' if df[c].nunique()>10 else 'Low'}
                for c in target[:10]]
        return {'type':'unique','summary':"Unique value counts","steps":steps,'table':rows,
                'confidence':'high','chart':'bar','measure_code':"df.nunique()"}

    # ── PERCENTAGE breakdown ─────────────────────────────────────────────────
    if intent == 'percent' and found_cat:
        col = found_cat[0]
        vc  = df[col].value_counts()
        tot = len(df)
        rows = [{'value':str(k),'count':int(v),'pct':round(v/tot*100,2)} for k,v in vc.head(15).items()]
        return {'type':'count','summary':f"Percentage breakdown of '{col}'",
                'steps':steps,'table':rows,'confidence':'high','chart':'bar',
                'measure_code':f"df['{col}'].value_counts(normalize=True)*100"}

    # ── SUMMARY / OVERVIEW ───────────────────────────────────────────────────
    if intent == 'summary':
        quick = []
        for col in (found_num or num_cols[:6]):
            s = df[col].dropna()
            if len(s)<2: continue
            quick.append({
                'column': col,
                'count':  int(len(s)),
                'mean':   round(float(s.mean()),3) if _safe(s.mean()) else None,
                'median': round(float(s.median()),3) if _safe(s.median()) else None,
                'std':    round(float(s.std()),3) if _safe(s.std()) else None,
                'min':    round(float(s.min()),3),
                'max':    round(float(s.max()),3),
                'sum':    round(float(s.sum()),2) if _safe(s.sum()) else None,
            })
        return {'type':'summary','summary':f"Summary statistics for {len(quick)} numeric columns",
                'steps':steps,'table':quick,'confidence':'high','chart':'table',
                'measure_code':"df.describe()"}

    # ── GROUPBY with aggregation ─────────────────────────────────────────────
    if found_num and found_cat:
        agg_kw2 = agg_kw or 'average'
        agg_name2 = agg_name or 'mean'
        agg_fn2   = agg_fn or (lambda s: _safe(s.mean()))
        target_num = found_num[0]
        target_cat = found_cat[0]

        # Check if 'top' or 'bottom' is in intent
        desc = 'bottom' not in q.lower()
        steps.append(f"GROUP BY '{target_cat}', {agg_name2.upper()}('{target_num}')")
        try:
            grouped = df.groupby(target_cat)[target_num].apply(agg_fn2)
            grouped = grouped.dropna().sort_values(ascending=not desc)
            # Extract N if specified
            nm = re.search(r'\b(\d+)\b', q)
            n  = int(nm.group(1)) if nm else 20
            rows = [{'group':str(k),'value':round(float(v),3)} for k,v in grouped.head(n).items()]
            top  = rows[0] if rows else None
            return {
                'type':'grouped_bar',
                'summary':f"{agg_name2.title()} of '{target_num}' by '{target_cat}'",
                'top_result':f"{top['group']} = {top['value']:,.3f}" if top else None,
                'steps':steps,'table':rows,
                'chart_data':{'type':'bar','data':rows[:15]},
                'confidence':'high','chart':'bar',
                'measure_code':f"df.groupby('{target_cat}')['{target_num}'].{agg_name2}().sort_values(ascending={not desc}).head({n})",
            }
        except Exception as e:
            steps.append(f"GroupBy failed: {e}")

    # ── SINGLE AGGREGATION ────────────────────────────────────────────────────
    if agg_kw and found_num:
        col = found_num[0]; s = df[col].dropna()
        steps.append(f"{agg_name.upper()}('{col}') on {len(s):,} values")
        val = agg_fn(s)
        return {
            'type':'single_value',
            'summary':f"{agg_name.title()} of '{col}' = {val:,.4f}" if val is not None else "No result",
            'value':val,'steps':steps,
            'context':f"Computed on {len(s):,} records ({len(df)-len(s)} nulls excluded)",
            'confidence':'high','chart':'kpi',
            'measure_code':f"df['{col}'].{agg_name}()",
        }

    # ── SINGLE AGG on numeric col mentioned, no group ─────────────────────────
    if agg_kw and not found_num and num_cols:
        # agg all numeric columns
        rows = []
        for col in num_cols[:10]:
            s = df[col].dropna()
            val = agg_fn(s)
            if val is not None:
                rows.append({'column':col,'value':round(float(val),3),'n':int(len(s))})
        return {
            'type':'grouped_bar',
            'summary':f"{agg_name.title()} of all numeric columns",
            'steps':steps,'table':rows,'confidence':'high','chart':'bar',
            'measure_code':f"df.select_dtypes(include='number').{agg_name}()",
        }

    # ── RANKING ──────────────────────────────────────────────────────────────
    if intent == 'ranking':
        nm = re.search(r'\b(\d+)\b', q)
        n  = min(int(nm.group(1)), 50) if nm else 10
        asc = any(w in q.lower() for w in ('bottom','lowest','worst','least','fewest','weakest'))
        if found_num and found_cat:
            col=found_num[0]; grp=found_cat[0]
            ranked = df.groupby(grp)[col].mean().sort_values(ascending=asc).head(n)
            rows = [{'rank':i+1,'group':str(k),'value':round(float(v),3)} for i,(k,v) in enumerate(ranked.items())]
            return {'type':'ranking','summary':f"Top {n} {grp} by avg {col}",
                    'steps':steps,'table':rows,'confidence':'high','chart':'bar',
                    'measure_code':f"df.groupby('{grp}')['{col}'].mean().sort_values(ascending={asc}).head({n})"}
        elif found_num:
            col=found_num[0]
            ranked = df[col].dropna().sort_values(ascending=asc).head(n)
            rows = [{'rank':i+1,'value':round(float(v),4)} for i,v in enumerate(ranked)]
            return {'type':'ranking','summary':f"Top {n} values in '{col}'",
                    'steps':steps,'table':rows,'confidence':'high','chart':'table',
                    'measure_code':f"df['{col}'].nlargest({n})"}
        elif found_cat:
            col=found_cat[0]
            vc = df[col].value_counts()
            if asc: vc = vc.sort_values(ascending=True)
            rows = [{'rank':i+1,'value':str(k),'count':int(v)} for i,(k,v) in enumerate(vc.head(n).items())]
            return {'type':'ranking','summary':f"Top {n} by count in '{col}'",
                    'steps':steps,'table':rows,'confidence':'high','chart':'bar',
                    'measure_code':f"df['{col}'].value_counts().head({n})"}

    # ── CORRELATION ──────────────────────────────────────────────────────────
    if intent == 'correlation':
        if len(num_cols)<2:
            return {'type':'error','summary':'Need ≥2 numeric columns.','steps':steps,'confidence':'low','chart':'none','measure_code':None}
        target = found_num if len(found_num)>=2 else num_cols[:10]
        corr   = df[target].corr()
        pairs  = []
        for i,c1 in enumerate(target):
            for c2 in target[i+1:]:
                v = corr.loc[c1,c2]
                try:
                    fv=float(v)
                    if not math.isnan(fv):
                        pairs.append({'col1':c1,'col2':c2,'r':round(fv,4),'r2':round(fv**2,4),
                                      'strength':'Very Strong' if abs(fv)>=.9 else 'Strong' if abs(fv)>=.7 else 'Moderate' if abs(fv)>=.5 else 'Weak'})
                except: pass
        pairs.sort(key=lambda x: abs(x['r']), reverse=True)
        if found_num and len(found_num)==1:
            col = found_num[0]
            pairs = [p for p in pairs if p['col1']==col or p['col2']==col]
        return {'type':'correlation','summary':f"Correlations for {len(target)} columns",
                'steps':steps,'pairs':pairs[:15],'confidence':'high','chart':'heatmap',
                'measure_code':f"df[{target[:6]}].corr()"}

    # ── DISTRIBUTION ─────────────────────────────────────────────────────────
    if intent == 'distribution' and (found_num or num_cols):
        col = found_num[0] if found_num else num_cols[0]
        s   = df[col].dropna()
        if len(s)<5:
            return {'type':'error','summary':f"Need ≥5 rows for distribution (have {len(s)}).",'steps':steps,'confidence':'low','chart':'none','measure_code':None}
        sk = float(s.skew()) if len(s)>=3 else 0
        try:
            _,pv = stats.shapiro(s.values[:5000])
            norm_txt = f"Normal (p={pv:.4f})" if pv>.05 else f"Non-normal (p={pv:.4f})"
        except: norm_txt = "N/A"
        q1,q3 = float(s.quantile(.25)), float(s.quantile(.75))
        return {'type':'distribution','summary':f"Distribution of '{col}'",
                'steps':steps,
                'stats':{'mean':round(float(s.mean()),3),'median':round(float(s.median()),3),
                         'std':round(float(s.std()),3),'min':round(float(s.min()),3),
                         'max':round(float(s.max()),3),'Q1':round(q1,3),'Q3':round(q3,3),
                         'IQR':round(q3-q1,3),'skewness':round(sk,3),'normality':norm_txt,
                         'outliers':int(((s<q1-1.5*(q3-q1))|(s>q3+1.5*(q3-q1))).sum())},
                'confidence':'high','chart':'histogram',
                'measure_code':f"df['{col}'].describe(percentiles=[.25,.5,.75,.9,.95])"}

    # ── OUTLIER ──────────────────────────────────────────────────────────────
    if intent == 'outlier':
        target = found_num or num_cols[:6]
        rows   = []
        for col in target[:8]:
            s = df[col].dropna()
            if len(s)<4: continue
            q1,q3 = float(s.quantile(.25)), float(s.quantile(.75))
            iqr = q3-q1; lb,ub = q1-1.5*iqr, q3+1.5*iqr
            mask = (s<lb)|(s>ub)
            if mask.sum()>0:
                rows.append({'column':col,'outliers':int(mask.sum()),
                             'pct':round(mask.mean()*100,1),
                             'examples':[round(float(v),3) for v in s[mask].head(3).values]})
        rows.sort(key=lambda x: x['outliers'], reverse=True)
        return {'type':'outlier_list','summary':f"Outliers in {len(rows)} columns",
                'steps':steps,'table':rows,'confidence':'high','chart':'bar',
                'measure_code':"# IQR method: df[col][(df[col]<Q1-1.5*IQR)|(df[col]>Q3+1.5*IQR)]"}

    # ── TREND / FORECAST ─────────────────────────────────────────────────────
    if intent in ('trend','forecast') and (found_num or num_cols):
        col = found_num[0] if found_num else num_cols[0]
        s   = df[col].dropna()
        if len(s)<5:
            return {'type':'error','summary':f"Need ≥5 rows (have {len(s)}).",'steps':steps,'confidence':'low','chart':'none','measure_code':None}
        x  = np.arange(len(s))
        sl,ic,rv,pv,_ = stats.linregress(x, s.values)
        steps.append(f"Regression on '{col}': slope={sl:.4f}, R²={rv**2:.4f}, p={pv:.4f}")
        forecast = [{'step':len(s)+i,'value':round(ic+sl*(len(s)+i-1),3)} for i in range(1,6)]
        return {'type':'trend','summary':f"Trend in '{col}'",
                'steps':steps,
                'trend':'↗ Increasing' if sl>0 else '↘ Decreasing',
                'slope':round(float(sl),6),'r2':round(float(rv**2),4),
                'p_value':round(float(pv),6),'significant':bool(pv<.05),
                'forecast':forecast,
                'interpretation':f"{'Significant' if pv<.05 else 'Non-significant'} {'increasing' if sl>0 else 'decreasing'} trend. Slope={sl:.4f}/step, R²={rv**2:.4f}.",
                'confidence':'high','chart':'line',
                'measure_code':f"scipy.stats.linregress(range({len(s)}), df['{col}'].dropna())"}

    # ── COUNT frequency ──────────────────────────────────────────────────────
    if intent == 'count':
        if found_cat:
            col = found_cat[0]; vc = df[col].value_counts()
            rows = [{'value':str(k),'count':int(v),'pct':round(float(v)/len(df)*100,1)} for k,v in vc.head(20).items()]
            return {'type':'count','summary':f"Counts for '{col}'",
                    'steps':steps,'table':rows,'confidence':'high','chart':'bar',
                    'measure_code':f"df['{col}'].value_counts()"}
        return {'type':'count','summary':f"Total records: {len(df):,}",
                'steps':steps,'value':len(df),'confidence':'high','chart':'kpi',
                'measure_code':"len(df)"}

    # ── MEASURE BUILDER ──────────────────────────────────────────────────────
    if intent == 'measure':
        meas = []
        for col in (found_num or num_cols[:8]):
            s = df[col].dropna()
            if len(s)<2: continue
            mean_v = _safe(s.mean()); sum_v = _safe(s.sum()); max_v = _safe(s.max()); min_v = _safe(s.min())
            for name, fn_name, val, dax in [
                (f"Avg {col}", 'mean', mean_v, f"Avg_{col} = AVERAGE(Table[{col}])"),
                (f"Total {col}", 'sum',  sum_v,  f"Total_{col} = SUM(Table[{col}])"),
                (f"Max {col}",  'max',  max_v,  f"Max_{col} = MAX(Table[{col}])"),
                (f"Min {col}",  'min',  min_v,  f"Min_{col} = MIN(Table[{col}])"),
            ]:
                meas.append({'name':name,'fn':fn_name,'value':round(float(val),3) if val else None,
                              'dax':dax,'python':f"df['{col}'].{fn_name}()"})
        # Add count measures for categorical
        for col in (found_cat or cat_cols[:3]):
            meas.append({'name':f"Count {col}", 'fn':'count',
                         'value':int(df[col].nunique()),
                         'dax':f"Count_{col} = DISTINCTCOUNT(Table[{col}])",
                         'python':f"df['{col}'].nunique()"})
        return {'type':'measures','summary':f"Generated {len(meas)} measures",
                'steps':steps,'measures':meas[:16],'confidence':'high','chart':'table',
                'measure_code':"# See DAX expressions above for Power BI"}

    # ── COMPARISON ──────────────────────────────────────────────────────────
    if intent == 'comparison' and found_num:
        col = found_num[0]; grp_cols = found_cat or cat_cols[:2]
        all_tables = {}
        for grp in grp_cols[:2]:
            grouped = df.groupby(grp)[col].mean().sort_values(ascending=False)
            all_tables[grp] = [{'group':str(k),'value':round(float(v),3)} for k,v in grouped.head(15).items()]
        if all_tables:
            grp = list(all_tables.keys())[0]
            return {'type':'comparison','summary':f"'{col}' by '{grp}'",
                    'steps':steps,'table':all_tables[grp],'confidence':'high','chart':'bar',
                    'measure_code':f"df.groupby('{grp}')['{col}'].mean().sort_values(ascending=False)"}

    # ── FALLBACK: always give useful info ───────────────────────────────────
    steps.append("General overview")
    # Try to detect if question mentions a column even without known intent
    if found_num:
        col = found_num[0]; s = df[col].dropna()
        if len(s)>=2:
            return {'type':'summary','summary':f"Summary for '{col}'",
                    'steps':steps,
                    'table':[{'metric':k,'value':round(float(v),3)} for k,v in {
                        'Count':len(s),'Mean':float(s.mean()),'Median':float(s.median()),
                        'Std Dev':float(s.std()),'Min':float(s.min()),'Max':float(s.max()),
                        'Sum':float(s.sum()),'Q25':float(s.quantile(.25)),'Q75':float(s.quantile(.75)),
                    }.items() if _safe(v) is not None],
                    'confidence':'high','chart':'table',
                    'measure_code':f"df['{col}'].describe()"}
    if found_cat:
        col = found_cat[0]; vc = df[col].value_counts()
        rows = [{'value':str(k),'count':int(v),'pct':round(float(v)/len(df)*100,1)} for k,v in vc.head(15).items()]
        return {'type':'count','summary':f"Distribution of '{col}' ({df[col].nunique()} unique values)",
                'steps':steps,'table':rows,'confidence':'high','chart':'bar',
                'measure_code':f"df['{col}'].value_counts()"}

    quick = []
    for col in num_cols[:5]:
        s = df[col].dropna()
        if len(s)<2: continue
        quick.append({'column':col,'mean':round(float(s.mean()),2) if _safe(s.mean()) else None,
                      'min':round(float(s.min()),2),'max':round(float(s.max()),2),'count':int(len(s))})
    return {'type':'overview',
            'summary':f"Dataset: {len(df):,} rows × {len(df.columns)} cols · {len(num_cols)} numeric · {len(cat_cols)} categorical",
            'steps':steps,'quick_stats':quick,
            'hint':"Try: 'Average runs by team', 'Top 10 batsmen', 'Correlation between columns', 'Distribution of runs', 'Create measures', 'Schema'",
            'confidence':'medium','chart':'table','measure_code':None}
