"""
Smart Loader — detects star schema, joins fact+dimension tables,
computes real business KPIs from the actual data.
"""
import pandas as pd
import numpy as np
import math, re
from datetime import datetime


# ── Patterns that identify foreign keys / ID columns (never analyse as categories)
ID_PATTERNS = re.compile(
    r'^(id|_id|.*_id$|.*id$|shipmentid|shiptmentid|'
    r'spid|pid|gid|cid|oid|rid|uid|sid|'
    r'order_?id|invoice_?id|customer_?id|product_?id|'
    r'employee_?id|user_?id|row_?id|record_?id|'
    r'index|#|sr\.?no\.?|sno|seq|serial|'
    r'unnamed.*)',
    re.IGNORECASE
)

# Columns that look like amounts/revenue
AMOUNT_PATTERNS  = re.compile(r'(amount|revenue|sales|turnover|income|price|value)', re.I)
COST_PATTERNS    = re.compile(r'(cost|expense|spend)', re.I)
PROFIT_PATTERNS  = re.compile(r'(profit|margin|gain|net)', re.I)
BOX_PATTERNS     = re.compile(r'(box|unit|qty|quantity|piece|item|count)', re.I)
DATE_PATTERNS    = re.compile(r'(date|time|month|year|quarter|week|day)', re.I)
PERSON_PATTERNS  = re.compile(r'(sales_person|salesperson|rep|agent|employee|name|person)', re.I)
GEO_PATTERNS     = re.compile(r'(geo|country|city|state|region|location|territory)', re.I)
PRODUCT_PATTERNS = re.compile(r'(product|item|sku|description|category)', re.I)


def is_id_col(name: str, series: pd.Series) -> bool:
    """True if column is a foreign key / surrogate key — should NOT be analysed."""
    n = name.strip()
    if ID_PATTERNS.match(n): return True
    # Check if values look like codes (S00001, SP01, P01, G1)
    if series.dtype == object:
        s = series.dropna().astype(str)
        if len(s) > 0:
            # If >80% values match code pattern like P01, G1, SP22
            code_pct = s.str.match(r'^[A-Z]{1,3}\d{1,6}$').mean()
            if code_pct > 0.8: return True
            # If looks like IDs (S00000004)
            code_pct2 = s.str.match(r'^[A-Z]\d{5,}$').mean()
            if code_pct2 > 0.5: return True
    # Integer sequential ID
    if pd.api.types.is_integer_dtype(series) and len(series) > 5:
        s = series.dropna().sort_values()
        diffs = s.diff().dropna()
        if len(diffs) > 0 and diffs.nunique() == 1 and float(diffs.iloc[0]) in (1,-1):
            return True
    return False


def detect_schema_type(sheets: dict) -> str:
    """Detect if we have a star schema (fact + dimensions) or independent sheets."""
    if len(sheets) < 2: return 'single'
    names = [s.lower() for s in sheets.keys()]
    
    # Check for common dimension-like names
    dim_keywords = ['dimension','dim','lookup','product','location','person','people','calendar','date','geo']
    fact_keywords = ['fact','shipment','order','sale','transaction','data']
    
    has_dim = any(any(kw in n for kw in dim_keywords) for n in names)
    has_fact = any(any(kw in n for kw in fact_keywords) for n in names)
    
    if has_fact and has_dim: return 'star_schema'
    
    # Check for shared key columns between sheets
    all_cols = {}
    for name, df in sheets.items():
        for col in df.columns:
            if is_id_col(col, df[col]):
                all_cols.setdefault(col, []).append(name)
    
    shared_keys = {k:v for k,v in all_cols.items() if len(v) > 1}
    if shared_keys: return 'relational'
    
    return 'independent'


def parse_dimension_sheet(raw_df: pd.DataFrame) -> dict:
    """
    Smart parser for Excel sheets that contain multiple tables side-by-side.
    Returns dict of {table_name: DataFrame}
    """
    tables = {}
    
    # Find header rows (rows where most cells are non-null strings)
    header_candidates = []
    for i in range(min(10, len(raw_df))):
        row = raw_df.iloc[i]
        str_count = sum(1 for v in row if isinstance(v, str) and len(str(v).strip()) > 1)
        if str_count >= 3:
            header_candidates.append(i)
    
    if not header_candidates:
        return {'Dimension': raw_df}
    
    hdr_row = header_candidates[0]
    headers = raw_df.iloc[hdr_row].tolist()
    
    # Find column groups (separated by all-null columns)
    groups = []
    current_group = []
    for i, h in enumerate(headers):
        if h is not None and not (isinstance(h, float) and math.isnan(h)) and str(h).strip():
            current_group.append(i)
        else:
            if current_group:
                groups.append(current_group)
                current_group = []
    if current_group:
        groups.append(current_group)
    
    data_rows = raw_df.iloc[hdr_row+1:].reset_index(drop=True)
    
    for group in groups:
        cols = [raw_df.iloc[hdr_row, i] for i in group]
        sub = data_rows.iloc[:, group].copy()
        sub.columns = [str(c).strip() for c in cols]
        sub = sub.dropna(how='all').reset_index(drop=True)
        # Remove rows where first column is NaN
        if len(sub.columns) > 0:
            sub = sub[sub.iloc[:,0].notna()].reset_index(drop=True)
        
        if len(sub) > 0:
            # Name the table by its key column
            key_cols = [c for c in sub.columns if is_id_col(c, sub[c])]
            name = key_cols[0] if key_cols else f"Table_{len(tables)+1}"
            tables[name] = sub
    
    return tables if tables else {'Data': raw_df}


def smart_join_excel(file_path: str) -> dict:
    """
    Load an Excel file with multiple sheets, detect star schema,
    join fact+dimension tables, compute business measures.
    
    Returns:
        {
            'df':           joined DataFrame with all measures,
            'schema':       list of column defs with table origin,
            'tables':       dict of original DataFrames,
            'relationships': list of detected FK relationships,
            'measures':     dict of computed aggregate measures,
            'fact_table':   name of the fact table,
            'dim_tables':   list of dimension table names,
            'log':          processing steps,
        }
    """
    log = []
    xl = pd.ExcelFile(file_path)
    sheet_names = xl.sheet_names
    log.append(f"Found {len(sheet_names)} sheets: {sheet_names}")
    
    raw_sheets = {}
    for name in sheet_names:
        raw_sheets[name] = pd.read_excel(file_path, sheet_name=name, header=None)
    
    # Find the fact table (largest sheet with clean column headers)
    fact_table_name = None
    fact_df = None
    dim_tables = {}
    
    # Try to read each sheet as a proper table first
    clean_sheets = {}
    for name, raw in raw_sheets.items():
        # Try reading with smart header detection
        best_header = 0
        for i in range(min(5, len(raw))):
            row = raw.iloc[i]
            str_cnt = sum(1 for v in row if isinstance(v, str) and v.strip())
            if str_cnt >= len(raw.columns) * 0.5:
                best_header = i
                break
        
        try:
            df = pd.read_excel(file_path, sheet_name=name, header=best_header)
            df = df.loc[:, ~df.columns.str.startswith('Unnamed')].dropna(how='all').reset_index(drop=True)
            if len(df) > 1 and len(df.columns) > 1:
                clean_sheets[name] = df
                log.append(f"'{name}': {df.shape} — headers at row {best_header}")
        except Exception as e:
            log.append(f"'{name}': failed to clean ({e})")
    
    # Identify fact table: most rows, contains Amount/Boxes/numeric measures
    max_rows = 0
    for name, df in clean_sheets.items():
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        measure_cols = [c for c in num_cols if not is_id_col(c, df[c])]
        if len(df) > max_rows and len(measure_cols) > 0:
            max_rows = len(df)
            fact_table_name = name
            fact_df = df.copy()
    
    if fact_df is None:
        # Fallback: just return all sheets separately
        return {'df': list(clean_sheets.values())[0] if clean_sheets else pd.DataFrame(),
                'schema':[], 'tables':clean_sheets, 'relationships':[], 'measures':{},
                'fact_table':None, 'dim_tables':[], 'log':log}
    
    log.append(f"Fact table: '{fact_table_name}' ({len(fact_df):,} rows)")
    
    # Parse dimension sheets
    for name, raw in raw_sheets.items():
        if name == fact_table_name: continue
        sub_tables = parse_dimension_sheet(raw)
        for key_col, sub_df in sub_tables.items():
            dim_tables[key_col] = {'name': name, 'df': sub_df, 'key': key_col}
            log.append(f"Dimension: '{name}' → table '{key_col}' ({len(sub_df)} rows)")
    
    # Detect relationships: find shared key columns between fact and dims
    relationships = []
    joined_df = fact_df.copy()
    
    for key_col, dim_info in dim_tables.items():
        dim_df = dim_info['df']
        if key_col in fact_df.columns and key_col in dim_df.columns:
            # Join dimension into fact
            merge_cols = [c for c in dim_df.columns if not is_id_col(c, dim_df[c]) or c == key_col]
            # Rename conflicting non-key columns
            rename_map = {}
            for c in merge_cols:
                if c != key_col and c in joined_df.columns:
                    rename_map[c] = f"{c}_{dim_info['name'][:8]}"
            if rename_map:
                dim_df = dim_df.rename(columns=rename_map)
                merge_cols = [rename_map.get(c,c) for c in merge_cols]
            
            before = len(joined_df)
            joined_df = joined_df.merge(
                dim_df[[key_col]+[c for c in merge_cols if c!=key_col]],
                on=key_col, how='left'
            )
            relationships.append({
                'fact':     fact_table_name,
                'dim':      dim_info['name'],
                'key':      key_col,
                'type':     'many-to-one',
                'matched':  int(joined_df[key_col].notna().sum()),
            })
            log.append(f"Joined '{dim_info['name']}' on '{key_col}' → {len(joined_df):,} rows")
    
    # Compute business measures (updates joined_df with Cost/Profit columns)
    joined_df, measures = _compute_measures(joined_df, log)
    
    # Build schema
    schema = _build_joined_schema(joined_df, fact_table_name, dim_tables, relationships)
    
    return {
        'df':            joined_df,
        'schema':        schema,
        'tables':        {name: info['df'] for name, info in dim_tables.items()} | {fact_table_name: fact_df},
        'relationships': relationships,
        'measures':      measures,
        'fact_table':    fact_table_name,
        'dim_tables':    list(dim_tables.keys()),
        'log':           log,
    }


def _compute_measures(df: pd.DataFrame, log: list):
    """Compute all business measures from the joined DataFrame. Returns (df, measures)"""
    df = df.copy()
    measures = {}
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    measure_cols = [c for c in num_cols if not is_id_col(c, df[c])]
    
    # Find amount/revenue columns
    amount_col = next((c for c in measure_cols if AMOUNT_PATTERNS.search(c)), None)
    cost_col   = next((c for c in measure_cols if COST_PATTERNS.search(c) and 'per' not in c.lower()), None)
    box_col    = next((c for c in measure_cols if BOX_PATTERNS.search(c)), None)
    
    # Try to compute Cost if we have cost_per_unit and quantity
    cpb_col = next((c for c in df.columns if 'cost_per' in c.lower()), None)
    if not cpb_col:
        cpb_col = next((c for c in df.columns if c.lower() in ('costperbox','cost_per_box','unit_cost','cost_unit')), None)
    if cpb_col and box_col and cost_col is None:
        df['Cost'] = pd.to_numeric(df[cpb_col], errors='coerce') * pd.to_numeric(df[box_col], errors='coerce')
        cost_col = 'Cost'
        log.append(f"Computed Cost = {cpb_col} × {box_col}")
    
    # Profit
    if amount_col and cost_col:
        df = df.copy() if 'Cost' not in df.columns else df
        df['Profit'] = pd.to_numeric(df[amount_col], errors='coerce') - pd.to_numeric(df[cost_col], errors='coerce')
        amt = pd.to_numeric(df[amount_col], errors='coerce')
        df['Profit_Pct'] = np.where(amt > 0, df['Profit'] / amt * 100, np.nan)
        log.append(f"Computed Profit = {amount_col} - {cost_col}")
    
    # Core KPIs
    for col in measure_cols:
        s = pd.to_numeric(df[col], errors='coerce').dropna()
        if len(s) > 0:
            measures[col] = {
                'sum':    float(s.sum()),
                'mean':   float(s.mean()),
                'median': float(s.median()),
                'min':    float(s.min()),
                'max':    float(s.max()),
                'count':  int(len(s)),
            }
    
    if 'Profit' in df.columns:
        s = df['Profit'].dropna()
        measures['Profit'] = {'sum':float(s.sum()),'mean':float(s.mean()),'count':int(len(s)),'min':float(s.min()),'max':float(s.max())}
    if 'Profit_Pct' in df.columns:
        s = df['Profit_Pct'].dropna()
        measures['Profit_Pct'] = {'mean':float(s.mean()),'median':float(s.median()),'count':int(len(s))}
    
    return df, _clean_measures(measures)


def _clean_measures(obj):
    def fix(o):
        if isinstance(o, dict): return {k:fix(v) for k,v in o.items()}
        if isinstance(o, list): return [fix(v) for v in o]
        if isinstance(o,(float,np.floating)):
            f=float(o); return None if (math.isnan(f) or math.isinf(f)) else f
        if isinstance(o,(np.integer,)): return int(o)
        return o
    return fix(obj)


def _build_joined_schema(df, fact_table, dim_tables, relationships):
    schema = []
    rel_map = {r['key']: r['dim'] for r in relationships}
    
    for col in df.columns:
        s = df[col].dropna()
        is_id = is_id_col(col, df[col])
        is_date = pd.api.types.is_datetime64_any_dtype(df[col])
        is_num = pd.api.types.is_numeric_dtype(df[col]) and not is_id
        
        # Determine which table this column came from
        if col in dim_tables or col in rel_map:
            source = rel_map.get(col, fact_table)
        elif is_id: source = 'Key/ID'
        else: source = fact_table
        
        schema.append({
            'column':      col,
            'type':        'Date/Time' if is_date else 'Numeric' if is_num else 'Key' if is_id else 'Text',
            'dtype':       str(df[col].dtype),
            'null_count':  int(df[col].isnull().sum()),
            'null_pct':    round(df[col].isnull().mean()*100, 1),
            'unique':      int(df[col].nunique()),
            'samples':     [str(v)[:20] for v in s.head(3).values],
            'agg_hint':    'SUM/AVG/MEASURE' if is_num else 'FK → '+source if is_id else 'GROUP BY/FILTER',
            'source_table': source,
            'is_id':       is_id,
            'is_date':     is_date,
        })
    return schema
