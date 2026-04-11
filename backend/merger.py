"""
Smart data merger — combines multiple sheets/files into one DataFrame
with schema tracking, column conflict resolution, and origin tagging.
"""
import pandas as pd
import numpy as np
import math
from datetime import datetime


def _safe_col(df: pd.DataFrame, label: str, idx: int) -> pd.DataFrame:
    """Tag origin and rename conflicting columns."""
    df = df.copy()
    df['_source'] = label
    df['_source_idx'] = idx
    return df


def combine_sheets(sheets: dict) -> dict:
    """
    Combine multiple {label: DataFrame} sheets into one unified DataFrame.
    Returns {
        "df":      combined DataFrame,
        "schema":  column schema with origin info,
        "sources": list of source labels,
        "conflicts": columns that had naming conflicts,
        "log":     merge steps
    }
    """
    log = []
    sources = list(sheets.keys())
    dfs = []
    all_cols = {}   # col_name → set of sources that have it
    conflicts = []

    for label, df in sheets.items():
        for col in df.columns:
            all_cols.setdefault(col, set()).add(label)

    # Find conflicts (same column name in multiple sources)
    for col, srcs in all_cols.items():
        if len(srcs) > 1:
            conflicts.append(col)

    log.append({'step': 'Conflict Detection',
                'detail': f"{len(conflicts)} column(s) shared across multiple sheets: {conflicts[:8]}"})

    for idx, (label, df) in enumerate(sheets.items()):
        df = df.copy()
        df['_source'] = label
        # Rename conflicting columns to col_sourcename if conflict exists
        rename_map = {}
        for col in df.columns:
            if col in conflicts and col != '_source':
                safe_name = f"{col}__{label.replace(' ', '_').replace('›', '').strip()[:15]}"
                rename_map[col] = safe_name
        if rename_map:
            df = df.rename(columns=rename_map)
            log.append({'step': f'Rename Conflicts ({label})',
                        'detail': f"Renamed {list(rename_map.keys())} to avoid collisions"})
        dfs.append(df)

    combined = pd.concat(dfs, ignore_index=True, sort=False)
    log.append({'step': 'Combine', 'detail': f"Combined {len(dfs)} sheets → {len(combined)} rows × {len(combined.columns)} columns"})

    # Build schema
    schema = _build_schema(combined, sources, all_cols)

    return {
        'df':        combined,
        'schema':    schema,
        'sources':   sources,
        'conflicts': conflicts,
        'log':       log,
        'rows':      int(len(combined)),
        'columns':   int(len(combined.columns)),
    }


def _build_schema(df: pd.DataFrame, sources: list, col_sources: dict) -> list:
    """Build Power BI-style schema: each column with type, sample, nulls, uniques."""
    schema = []
    for col in df.columns:
        s = df[col]
        null_n   = int(s.isnull().sum())
        null_pct = round(null_n / max(len(s), 1) * 100, 1)
        unique_n = int(s.nunique())
        dtype    = str(s.dtype)

        if pd.api.types.is_numeric_dtype(s):
            field_type = 'Numeric'
            sample_vals = [round(float(v), 3) for v in s.dropna().head(3).values if not math.isnan(float(v))]
            agg_hint = 'SUM / AVG / COUNT'
        elif pd.api.types.is_datetime64_any_dtype(s):
            field_type = 'Date/Time'
            sample_vals = [str(v)[:10] for v in s.dropna().head(3).values]
            agg_hint = 'DATE HIERARCHY / GROUP BY'
        else:
            field_type = 'Text'
            sample_vals = [str(v)[:25] for v in s.dropna().head(3).values]
            agg_hint = 'GROUP BY / COUNT / FILTER'

        present_in = list(col_sources.get(col, set())) or sources

        schema.append({
            'column':     col,
            'type':       field_type,
            'dtype':      dtype,
            'null_count': null_n,
            'null_pct':   null_pct,
            'unique':     unique_n,
            'samples':    sample_vals,
            'agg_hint':   agg_hint,
            'present_in': present_in,
            'is_source':  col == '_source',
        })
    return schema
