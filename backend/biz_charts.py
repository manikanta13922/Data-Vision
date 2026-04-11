"""
Business Chart Builder — builds REAL business insights from joined data.
No ID columns, no "frequency", no "count" labels.
Shows: Top Products by $Amount, Salesperson leaderboard, Geo breakdown, etc.
"""
import pandas as pd
import numpy as np
import math


def _s(v):
    try:
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else round(f, 2)
    except:
        return None


def build_business_charts(df: pd.DataFrame, smart_result: dict = None) -> dict:
    """
    Build business-meaningful charts from the joined DataFrame.
    Returns a dict of chart objects ready for the frontend.
    """
    charts = {}

    if df is None or len(df) == 0:
        return charts

    # Identify key columns by name
    cols = [c.lower() for c in df.columns]
    
    def find_col(*patterns):
        for p in patterns:
            for c in df.columns:
                if p.lower() == c.lower():
                    return c
        for p in patterns:
            for c in df.columns:
                if p.lower() in c.lower():
                    return c
        return None

    amount_col   = find_col('Amount', 'Revenue', 'Sales', 'Total_Amount')
    boxes_col    = find_col('Boxes', 'Units', 'Qty', 'Quantity')
    profit_col   = find_col('Profit')
    profit_pct   = find_col('Profit_Pct', 'Profit_Percentage', 'Margin_Pct')
    cost_col     = find_col('Cost')
    product_col  = find_col('Product', 'Product_Name', 'Item', 'SKU')
    category_col = find_col('Category', 'Product_Category', 'Type')
    person_col   = find_col('Sales_person', 'Salesperson', 'Rep', 'Agent', 'First_Name', 'Name')
    team_col     = find_col('Team', 'Department', 'Group')
    geo_col      = find_col('Geo', 'Country', 'Geography', 'Location')
    region_col   = find_col('Region', 'Area', 'Zone')
    status_col   = find_col('Order_Status', 'Status', 'Order_state')
    date_col     = find_col('Shipdate', 'Date', 'Order_Date', 'Transaction_Date')

    total_amount = _s(df[amount_col].sum()) if amount_col else None
    total_boxes  = _s(df[boxes_col].sum()) if boxes_col else None

    # ── 1. TOP PRODUCTS BY TOTAL AMOUNT ─────────────────────────────────
    if product_col and amount_col:
        grp = df.groupby(product_col).agg(
            total_amount=(amount_col, 'sum'),
            total_boxes=(boxes_col, 'sum') if boxes_col else (amount_col, 'count'),
            avg_profit_pct=(profit_pct, 'mean') if profit_pct else (amount_col, 'count'),
        ).sort_values('total_amount', ascending=False).head(12).reset_index()
        
        data = []
        for _, row in grp.iterrows():
            amt = _s(row['total_amount'])
            pct_of_total = _s(amt / total_amount * 100) if total_amount else None
            data.append({
                'name':         str(row[product_col]),
                'total_amount': amt,
                'display':      f"${amt/1e6:.1f}M" if amt and amt >= 1e6 else (f"${amt/1e3:.0f}K" if amt else "—"),
                'total_boxes':  _s(row['total_boxes']),
                'profit_pct':   _s(row.get('avg_profit_pct')),
                'pct_of_total': pct_of_total,
            })
        
        charts['top_products_amount'] = {
            'type':    'top_ranked',
            'title':   '🍫 Top Products by Total Revenue ($)',
            'subtitle': f'Ranked by total sales amount · {len(data)} products · Total: ${total_amount/1e6:.1f}M' if total_amount else '',
            'metric':  'Total Amount ($)',
            'insight': f"Top product: {data[0]['name']} ({data[0]['display']}, {data[0]['pct_of_total']:.1f}% of total)" if data else '',
            'data':    data,
        }

    # ── 2. TOP SALESPERSONS LEADERBOARD ─────────────────────────────────
    if person_col and amount_col:
        agg_dict = {'total_amount': (amount_col, 'sum'), 'shipments': (amount_col, 'count')}
        if boxes_col:  agg_dict['total_boxes']  = (boxes_col, 'sum')
        if profit_pct: agg_dict['avg_profit_pct'] = (profit_pct, 'mean')
        
        grp = df.groupby(person_col).agg(**agg_dict).sort_values('total_amount', ascending=False).head(10).reset_index()
        
        data = []
        for rank, (_, row) in enumerate(grp.iterrows(), 1):
            amt = _s(row['total_amount'])
            data.append({
                'rank':         rank,
                'name':         str(row[person_col]),
                'total_amount': amt,
                'display':      f"${amt/1e6:.1f}M" if amt and amt >= 1e6 else (f"${amt/1e3:.0f}K" if amt else "—"),
                'total_boxes':  _s(row.get('total_boxes')),
                'shipments':    int(row.get('shipments', 0)),
                'profit_pct':   _s(row.get('avg_profit_pct')),
            })
        
        charts['top_salespersons'] = {
            'type':    'leaderboard',
            'title':   '👤 Salesperson Leaderboard — Total Revenue',
            'subtitle': f'Ranked by total amount · showing top {len(data)} of {df[person_col].nunique()} salespeople',
            'metric':  'Total Amount ($)',
            'insight': f"Top performer: {data[0]['name']} with {data[0]['display']}" if data else '',
            'data':    data,
        }

    # ── 3. AMOUNT BY GEOGRAPHY ───────────────────────────────────────────
    if geo_col and amount_col:
        agg_dict = {'total_amount': (amount_col, 'sum')}
        if profit_pct: agg_dict['avg_profit_pct'] = (profit_pct, 'mean')
        if region_col: agg_dict['region'] = (region_col, 'first')
        
        grp = df.groupby(geo_col).agg(**agg_dict).sort_values('total_amount', ascending=False).reset_index()
        tot = grp['total_amount'].sum()
        
        data = []
        for _, row in grp.iterrows():
            amt = _s(row['total_amount'])
            data.append({
                'name':         str(row[geo_col]),
                'total_amount': amt,
                'display':      f"${amt/1e6:.1f}M" if amt and amt >= 1e6 else (f"${amt/1e3:.0f}K" if amt else "—"),
                'pct':          _s(amt / tot * 100) if tot else 0,
                'region':       str(row.get('region', '')),
                'profit_pct':   _s(row.get('avg_profit_pct')),
            })
        
        charts['amount_by_geo'] = {
            'type':    'geo_donut',
            'title':   '🌍 Revenue by Geography',
            'subtitle': f'Total ${tot/1e6:.1f}M across {len(data)} countries — percentage of total revenue',
            'metric':  'Total Amount ($)',
            'insight': f"{data[0]['name']} leads with {data[0]['display']} ({data[0]['pct']:.1f}% of global revenue)" if data else '',
            'data':    data,
            'total':   _s(tot),
        }

    # ── 4. AMOUNT BY CATEGORY ─────────────────────────────────────────────
    if category_col and amount_col:
        grp = df.groupby(category_col).agg(
            total_amount=(amount_col, 'sum'),
            avg_profit_pct=(profit_pct, 'mean') if profit_pct else (amount_col, 'count'),
        ).sort_values('total_amount', ascending=False).reset_index()
        tot = grp['total_amount'].sum()
        
        data = []
        for _, row in grp.iterrows():
            amt = _s(row['total_amount'])
            data.append({
                'name':         str(row[category_col]),
                'total_amount': amt,
                'display':      f"${amt/1e6:.1f}M" if amt and amt >= 1e6 else f"${amt/1e3:.0f}K",
                'pct':          _s(amt / tot * 100) if tot else 0,
                'profit_pct':   _s(row.get('avg_profit_pct')),
            })
        
        charts['amount_by_category'] = {
            'type':    'category_bar',
            'title':   '📦 Revenue by Product Category',
            'subtitle': f'Total ${tot/1e6:.1f}M — % share and average profit margin per category',
            'metric':  'Total Amount ($)',
            'insight': f"{data[0]['name']} is the top category: {data[0]['display']} ({data[0]['pct']:.1f}% share)" if data else '',
            'data':    data,
        }

    # ── 5. MONTHLY REVENUE TREND ──────────────────────────────────────────
    if date_col and amount_col:
        try:
            df2 = df.copy()
            df2[date_col] = pd.to_datetime(df2[date_col], errors='coerce')
            df2 = df2.dropna(subset=[date_col])
            df2['YearMonth'] = df2[date_col].dt.to_period('M')
            
            agg_dict = {'total_amount': (amount_col, 'sum'), 'shipments': (amount_col, 'count')}
            if boxes_col:  agg_dict['total_boxes'] = (boxes_col, 'sum')
            if profit_col: agg_dict['total_profit'] = (profit_col, 'sum')
            
            monthly = df2.groupby('YearMonth').agg(**agg_dict).reset_index()
            monthly = monthly.sort_values('YearMonth')
            monthly['YearMonth'] = monthly['YearMonth'].astype(str)
            
            data = []
            for _, row in monthly.iterrows():
                item = {
                    'month':        str(row['YearMonth']),
                    'total_amount': _s(row['total_amount']),
                    'shipments':    int(row.get('shipments', 0)),
                }
                if boxes_col:  item['total_boxes']  = _s(row.get('total_boxes'))
                if profit_col: item['total_profit']  = _s(row.get('total_profit'))
                data.append(item)
            
            if len(data) > 1:
                first_amt = data[0]['total_amount'] or 1
                last_amt  = data[-1]['total_amount'] or 0
                change    = (last_amt - first_amt) / abs(first_amt) * 100
                charts['monthly_revenue_trend'] = {
                    'type':    'time_series',
                    'title':   '📅 Monthly Revenue Trend',
                    'subtitle': f'{len(data)} months of data · {data[0]["month"]} to {data[-1]["month"]}',
                    'metric':  'Total Amount ($)',
                    'insight': f"Revenue {'grew' if change > 0 else 'declined'} {abs(change):.1f}% from {data[0]['month']} to {data[-1]['month']}",
                    'data':    data,
                    'keys':    ['total_amount'] + (['total_boxes'] if boxes_col else []) + (['total_profit'] if profit_col else []),
                }
        except Exception as e:
            pass

    # ── 6. PROFIT % BY PRODUCT (table) ───────────────────────────────────
    if product_col and amount_col and profit_col:
        try:
            grp = df.groupby(product_col).agg(
                total_amount=(amount_col, 'sum'),
                total_profit=(profit_col, 'sum'),
            ).reset_index()
            grp['profit_pct'] = np.where(grp['total_amount'] > 0,
                                          grp['total_profit'] / grp['total_amount'] * 100, np.nan)
            grp = grp.sort_values('total_amount', ascending=False)
            
            data = []
            for _, row in grp.iterrows():
                amt = _s(row['total_amount'])
                pft = _s(row['total_profit'])
                pct = _s(row['profit_pct'])
                data.append({
                    'product':      str(row[product_col]),
                    'total_amount': amt,
                    'display':      f"${amt/1e6:.1f}M" if amt and amt >= 1e6 else (f"${amt/1e3:.1f}K" if amt else "—"),
                    'total_profit': pft,
                    'profit_pct':   pct,
                    'profitable':   bool(pct and pct > 0),
                })
            
            charts['product_profit_table'] = {
                'type':    'profit_table',
                'title':   '📊 Product Revenue & Profit Analysis',
                'subtitle': f'All {len(data)} products · sorted by total revenue · profit % shown',
                'metric':  'Profit %',
                'insight': (
                    f"Most profitable: {max(data, key=lambda x: x['profit_pct'] or -999)['product']} "
                    f"({max(data, key=lambda x: x['profit_pct'] or -999)['profit_pct']:.1f}%)"
                ) if data else '',
                'data':    data,
            }
        except: pass

    # ── 7. ORDER STATUS BREAKDOWN ────────────────────────────────────────
    if status_col and amount_col:
        grp = df.groupby(status_col).agg(
            count=(amount_col, 'count'),
            total_amount=(amount_col, 'sum'),
        ).reset_index()
        tot_count = grp['count'].sum()
        tot_amt   = grp['total_amount'].sum()
        
        data = []
        for _, row in grp.iterrows():
            cnt = int(row['count'])
            amt = _s(row['total_amount'])
            data.append({
                'name':         str(row[status_col]),
                'count':        cnt,
                'pct_count':    _s(cnt / tot_count * 100) if tot_count else 0,
                'total_amount': amt,
                'display':      f"${amt/1e6:.1f}M" if amt and amt >= 1e6 else (f"${amt/1e3:.0f}K" if amt else "—"),
                'pct_amount':   _s(amt / tot_amt * 100) if tot_amt else 0,
            })
        data.sort(key=lambda x: x['count'], reverse=True)
        
        charts['order_status'] = {
            'type':    'status_donut',
            'title':   '🚚 Shipment Status Breakdown',
            'subtitle': f'{tot_count:,} total shipments · value by order status',
            'metric':  'Shipment Count',
            'insight': f"{data[0]['name']}: {data[0]['pct_count']:.1f}% of shipments ({data[0]['display']})" if data else '',
            'data':    data,
        }

    # ── 8. TEAM PERFORMANCE ──────────────────────────────────────────────
    if team_col and amount_col:
        agg_dict = {'total_amount': (amount_col, 'sum'), 'headcount': (amount_col, 'count')}
        if profit_pct: agg_dict['avg_profit_pct'] = (profit_pct, 'mean')
        grp = df.groupby(team_col).agg(**agg_dict).sort_values('total_amount', ascending=False).reset_index()
        tot = grp['total_amount'].sum()
        
        data = []
        for _, row in grp.iterrows():
            amt = _s(row['total_amount'])
            data.append({
                'name':         str(row[team_col]),
                'total_amount': amt,
                'display':      f"${amt/1e6:.1f}M" if amt and amt >= 1e6 else f"${amt/1e3:.0f}K",
                'pct':          _s(amt / tot * 100) if tot else 0,
                'shipments':    int(row.get('headcount', 0)),
                'profit_pct':   _s(row.get('avg_profit_pct')),
            })
        
        charts['team_performance'] = {
            'type':    'team_bar',
            'title':   '🏆 Team Performance — Total Revenue',
            'subtitle': f'{len(data)} teams · ranked by revenue contribution',
            'metric':  'Total Amount ($)',
            'insight': f"Top team: {data[0]['name']} — {data[0]['display']} ({data[0]['pct']:.1f}% of total)" if data else '',
            'data':    data,
        }

    return charts
