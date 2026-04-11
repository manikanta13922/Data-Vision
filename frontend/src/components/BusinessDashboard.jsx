import React, { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, ReferenceLine
} from 'recharts'

var COLORS = ['#4f46e5','#f05a28','#0d9488','#d97706','#7c3aed','#e11d48','#0284c7','#059669','#dc2626','#0891b2']

function fmt(v, short) {
  if (v === null || v === undefined) return '—'
  var n = Number(v)
  if (isNaN(n)) return String(v)
  if (short) {
    if (n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M'
    if (n >= 1e3) return '$' + (n/1e3).toFixed(0) + 'K'
    return '$' + n.toLocaleString(undefined, {maximumFractionDigits:0})
  }
  return n.toLocaleString(undefined, {maximumFractionDigits:2})
}

function TT({ active, payload, label, valueFormatter }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,padding:'10px 14px',boxShadow:'0 4px 20px rgba(0,0,0,.1)',fontSize:'.76rem',fontFamily:"'JetBrains Mono',monospace",maxWidth:240}}>
      {label !== undefined && <div style={{color:'#6b7280',marginBottom:5,borderBottom:'1px solid #f3f4f6',paddingBottom:4,fontWeight:700}}>{label}</div>}
      {payload.map(function(p, i) {
        if (p.value === null || p.value === undefined) return null
        return (
          <div key={i} style={{display:'flex',gap:8,alignItems:'center',marginBottom:2,color:'#111827'}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:p.color,display:'inline-block',flexShrink:0}}/>
            <span style={{color:'#6b7280'}}>{p.name}:</span>
            <span style={{fontWeight:700,marginLeft:'auto'}}>{valueFormatter ? valueFormatter(p.value) : p.value.toLocaleString(undefined,{maximumFractionDigits:2})}</span>
          </div>
        )
      })}
    </div>
  )
}

var AX = { tick:{fontSize:10,fill:'#9ca3af',fontFamily:"'JetBrains Mono',monospace"}, tickLine:false, axisLine:{stroke:'#f3f4f6'} }
var GR = <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>

/* ── Card wrapper ── */
function BizCard({ title, subtitle, insight, children, wide }) {
  return (
    <div className={'card '+(wide?'card-full':'')} style={{padding:0,overflow:'hidden'}}>
      <div style={{padding:'1rem 1.25rem .75rem',borderBottom:'1px solid var(--border)'}}>
        <div className="card-title" style={{fontSize:'.95rem'}}>{title}</div>
        {subtitle && <div className="card-sub">{subtitle}</div>}
      </div>
      <div style={{padding:'1rem 1.25rem .9rem'}}>{children}</div>
      {insight && (
        <div style={{padding:'.6rem 1.25rem',background:'rgba(79,70,229,.04)',borderTop:'1px solid var(--border)',fontSize:'.74rem',color:'var(--ink2)',lineHeight:1.6}}>
          <strong style={{color:'var(--indigo)'}}>💡 </strong>{insight}
        </div>
      )}
    </div>
  )
}

/* ── TOP PRODUCTS ── */
function TopProducts({ chart }) {
  var data = (chart.data || []).slice(0, 10)
  return (
    <BizCard title={chart.title} subtitle={chart.subtitle} insight={chart.insight} wide>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem'}}>
        {/* Horizontal bar chart */}
        <ResponsiveContainer width="100%" height={Math.max(280, data.length * 26)}>
          <BarChart data={data} layout="vertical" margin={{top:0,right:80,bottom:0,left:4}}>
            {GR}
            <XAxis type="number" {...AX} tickFormatter={function(v){return fmt(v,true)}}
              label={{value:'Total Revenue ($)',position:'insideBottom',offset:-2,fill:'#9ca3af',fontSize:9}}/>
            <YAxis type="category" dataKey="name" width={145}
              tick={{fontSize:9,fill:'#6b7280',fontFamily:"'JetBrains Mono',monospace"}} tickLine={false} axisLine={false}
              tickFormatter={function(v){ return String(v).length>20?String(v).slice(0,20)+'…':v }}/>
            <Tooltip content={<TT valueFormatter={function(v){return fmt(v,true)}}/>}/>
            <Bar dataKey="total_amount" name="Total Revenue" radius={[0,5,5,0]} maxBarSize={20}
              label={{position:'right',fill:'#6b7280',fontSize:9,fontFamily:"'JetBrains Mono',monospace",formatter:function(v){return fmt(v,true)}}}>
              {data.map(function(_,i){ return <Cell key={i} fill={COLORS[i%COLORS.length]}/> })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Profit % table */}
        <div style={{overflow:'auto',maxHeight:320}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.78rem'}}>
            <thead>
              <tr style={{background:'var(--bg)'}}>
                <th style={{padding:'6px 10px',textAlign:'left',fontSize:'.67rem',fontWeight:700,textTransform:'uppercase',color:'var(--indigo)',borderBottom:'1px solid var(--border)',fontFamily:'var(--font-mono)'}}>Product</th>
                <th style={{padding:'6px 10px',textAlign:'right',fontSize:'.67rem',fontWeight:700,textTransform:'uppercase',color:'var(--indigo)',borderBottom:'1px solid var(--border)',fontFamily:'var(--font-mono)'}}>Revenue</th>
                <th style={{padding:'6px 10px',textAlign:'right',fontSize:'.67rem',fontWeight:700,textTransform:'uppercase',color:'var(--indigo)',borderBottom:'1px solid var(--border)',fontFamily:'var(--font-mono)'}}>Profit %</th>
              </tr>
            </thead>
            <tbody>
              {data.map(function(d, i) {
                var pct = d.profit_pct
                var pctColor = pct === null ? '#9ca3af' : pct >= 50 ? 'var(--emerald)' : pct >= 30 ? 'var(--amber)' : 'var(--rose)'
                return (
                  <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'rgba(79,70,229,.02)'}}>
                    <td style={{padding:'6px 10px',color:'var(--ink)',fontWeight:600,fontSize:'.78rem',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:'var(--indigo)',fontWeight:700,fontFamily:'var(--font-mono)'}}>{d.display}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',fontFamily:'var(--font-mono)',fontWeight:700}}>
                      <span style={{
                        background: pct === null ? '#f3f4f6' : pct >= 50 ? 'var(--emerald-light)' : pct >= 30 ? 'var(--amber-light)' : 'var(--rose-light)',
                        color: pctColor, padding:'2px 7px', borderRadius:99, fontSize:'.7rem',
                      }}>
                        {pct !== null ? pct.toFixed(1)+'%' : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </BizCard>
  )
}

/* ── SALESPERSON LEADERBOARD ── */
function SalespersonLeaderboard({ chart }) {
  var data = (chart.data || []).slice(0, 8)
  return (
    <BizCard title={chart.title} subtitle={chart.subtitle} insight={chart.insight}>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {data.map(function(d) {
          var maxAmt = data[0].total_amount || 1
          var barPct = d.total_amount ? (d.total_amount / maxAmt * 100) : 0
          return (
            <div key={d.rank} style={{display:'flex',alignItems:'center',gap:10}}>
              {/* Rank badge */}
              <div style={{
                width:26,height:26,borderRadius:'50%',flexShrink:0,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'.72rem',fontWeight:800,fontFamily:'var(--font-mono)',
                background: d.rank<=3 ? (d.rank===1?'var(--amber)':d.rank===2?'#94a3b8':'#cd7f32') : 'var(--bg2)',
                color: d.rank<=3 ? '#fff' : 'var(--ink3)',
              }}>{d.rank}</div>
              {/* Name + bar */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:'.8rem'}}>
                  <span style={{fontWeight:700,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{d.name}</span>
                  <span style={{color:'var(--indigo)',fontWeight:800,fontFamily:'var(--font-mono)',flexShrink:0,marginLeft:8}}>{d.display}</span>
                </div>
                {/* Progress bar */}
                <div style={{height:6,background:'var(--bg2)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',width:barPct+'%',background:COLORS[d.rank-1 % COLORS.length],borderRadius:99,transition:'width .5s ease'}}/>
                </div>
                {(d.profit_pct !== null || d.total_boxes !== null) && (
                  <div style={{display:'flex',gap:10,marginTop:2,fontSize:'.68rem',color:'var(--ink4)',fontFamily:'var(--font-mono)'}}>
                    {d.profit_pct !== null && <span>Profit: {d.profit_pct.toFixed(1)}%</span>}
                    {d.total_boxes !== null && <span>Boxes: {d.total_boxes.toLocaleString()}</span>}
                    {d.shipments && <span>Shipments: {d.shipments.toLocaleString()}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </BizCard>
  )
}

/* ── GEO DONUT ── */
function GeoDonut({ chart }) {
  var data = chart.data || []
  var total = chart.total
  return (
    <BizCard title={chart.title} subtitle={chart.subtitle} insight={chart.insight}>
      <div style={{display:'flex',gap:'1rem',alignItems:'center'}}>
        <div style={{flex:'0 0 200px'}}>
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                paddingAngle={2} dataKey="total_amount"
                label={function(p){ return p.pct > 7 ? p.name.slice(0,8)+' '+p.pct.toFixed(1)+'%' : '' }}
                labelLine={{stroke:'#d1d5db',strokeWidth:1}}>
                {data.map(function(_,i){ return <Cell key={i} fill={COLORS[i%COLORS.length]}/> })}
              </Pie>
              <Tooltip formatter={function(v){ return [fmt(v,true), 'Revenue'] }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend table */}
        <div style={{flex:1}}>
          {data.map(function(d, i) {
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{width:10,height:10,borderRadius:'50%',background:COLORS[i%COLORS.length],flexShrink:0}}/>
                <span style={{fontSize:'.78rem',color:'var(--ink)',fontWeight:600,flex:1}}>{d.name}</span>
                <span style={{fontSize:'.78rem',color:'var(--indigo)',fontWeight:800,fontFamily:'var(--font-mono)'}}>{d.display}</span>
                <span style={{fontSize:'.72rem',color:'var(--ink4)',fontFamily:'var(--font-mono)',minWidth:42,textAlign:'right'}}>{d.pct.toFixed(1)}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </BizCard>
  )
}

/* ── MONTHLY TREND ── */
function MonthlyTrend({ chart }) {
  var data = chart.data || []
  var keys = chart.keys || ['total_amount']
  var keyLabels = { total_amount:'Revenue ($)', total_boxes:'Boxes', total_profit:'Profit ($)' }
  return (
    <BizCard title={chart.title} subtitle={chart.subtitle} insight={chart.insight} wide>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{top:10,right:30,bottom:0,left:10}}>
          <defs>
            {keys.map(function(k,i){
              return (
                <linearGradient key={k} id={'mg'+i} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS[i%COLORS.length]} stopOpacity={.2}/>
                  <stop offset="95%" stopColor={COLORS[i%COLORS.length]} stopOpacity={0}/>
                </linearGradient>
              )
            })}
          </defs>
          {GR}
          <XAxis dataKey="month" {...AX} angle={-25} textAnchor="end" height={40} interval={Math.floor(data.length/8)}/>
          <YAxis {...AX} width={65} tickFormatter={function(v){return fmt(v,true)}}/>
          <Tooltip content={<TT valueFormatter={function(v){return fmt(v,true)}}/>}/>
          <Legend wrapperStyle={{fontSize:'.72rem',fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}
            formatter={function(k){ return keyLabels[k] || k }}/>
          {keys.map(function(k,i){
            return (
              <Area key={k} type="monotone" dataKey={k} name={k}
                stroke={COLORS[i%COLORS.length]} fill={'url(#mg'+i+')'}
                strokeWidth={2.5} dot={false} activeDot={{r:4}}/>
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </BizCard>
  )
}

/* ── CATEGORY BAR ── */
function CategoryBar({ chart }) {
  var data = chart.data || []
  return (
    <BizCard title={chart.title} subtitle={chart.subtitle} insight={chart.insight}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{top:16,right:10,bottom:30,left:10}}>
          {GR}
          <XAxis dataKey="name" {...AX} angle={-15} textAnchor="end" height={40}/>
          <YAxis {...AX} width={60} tickFormatter={function(v){return fmt(v,true)}}/>
          <Tooltip content={<TT valueFormatter={function(v){return fmt(v,true)}}/>}/>
          <Bar dataKey="total_amount" name="Total Revenue" radius={[6,6,0,0]}>
            <LabelList dataKey="display" position="top" style={{fontSize:9,fill:'#6b7280',fontFamily:"'JetBrains Mono',monospace"}}/>
            {data.map(function(_,i){ return <Cell key={i} fill={COLORS[i%COLORS.length]}/> })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Profit % row */}
      {data[0] && data[0].profit_pct !== null && (
        <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
          {data.map(function(d,i){
            return (
              <div key={i} style={{flex:1,minWidth:80,background:'var(--bg)',borderRadius:8,padding:'6px 10px',textAlign:'center',border:'1px solid var(--border)'}}>
                <div style={{fontSize:'.62rem',color:'var(--ink4)',fontFamily:'var(--font-mono)'}}>{d.name}</div>
                <div style={{fontWeight:800,color:d.profit_pct>=50?'var(--emerald)':d.profit_pct>=30?'var(--amber)':'var(--rose)',fontFamily:'var(--font-mono)',fontSize:'.85rem',marginTop:1}}>
                  {d.profit_pct !== null ? d.profit_pct.toFixed(1)+'%' : '—'}
                </div>
                <div style={{fontSize:'.6rem',color:'var(--ink4)'}}>profit</div>
              </div>
            )
          })}
        </div>
      )}
    </BizCard>
  )
}

/* ── ORDER STATUS ── */
function OrderStatus({ chart }) {
  var data = chart.data || []
  return (
    <BizCard title={chart.title} subtitle={chart.subtitle} insight={chart.insight}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
              paddingAngle={2} dataKey="count"
              label={function(p){ return p.pct_count > 6 ? p.name+' '+p.pct_count.toFixed(0)+'%' : '' }}
              labelLine={{stroke:'#d1d5db',strokeWidth:1}}>
              {data.map(function(_,i){ return <Cell key={i} fill={COLORS[i%COLORS.length]}/> })}
            </Pie>
            <Tooltip formatter={function(v,n){ return [v.toLocaleString()+' shipments', n] }}/>
          </PieChart>
        </ResponsiveContainer>
        <div style={{display:'flex',flexDirection:'column',gap:6,justifyContent:'center'}}>
          {data.map(function(d,i){
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:'.78rem'}}>
                <span style={{width:10,height:10,borderRadius:'50%',background:COLORS[i%COLORS.length],flexShrink:0}}/>
                <span style={{color:'var(--ink)',fontWeight:600,flex:1}}>{d.name}</span>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:700,color:'var(--indigo)',fontFamily:'var(--font-mono)'}}>{d.display}</div>
                  <div style={{fontSize:'.68rem',color:'var(--ink4)',fontFamily:'var(--font-mono)'}}>{d.count.toLocaleString()} shipments</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </BizCard>
  )
}

/* ── TEAM PERFORMANCE ── */
function TeamPerformance({ chart }) {
  var data = chart.data || []
  return (
    <BizCard title={chart.title} subtitle={chart.subtitle} insight={chart.insight}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{top:16,right:10,bottom:0,left:10}}>
          {GR}
          <XAxis dataKey="name" {...AX}/>
          <YAxis {...AX} width={55} tickFormatter={function(v){return fmt(v,true)}}/>
          <Tooltip content={<TT valueFormatter={function(v){return fmt(v,true)}}/>}/>
          <Bar dataKey="total_amount" name="Total Revenue" radius={[6,6,0,0]}>
            <LabelList dataKey="display" position="top" style={{fontSize:9,fill:'#6b7280',fontFamily:"'JetBrains Mono',monospace"}}/>
            {data.map(function(_,i){ return <Cell key={i} fill={COLORS[i%COLORS.length]}/> })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
        {data.map(function(d,i){
          return (
            <div key={i} style={{flex:1,minWidth:80,background:'var(--bg)',borderRadius:8,padding:'5px 8px',textAlign:'center',border:'1px solid var(--border)'}}>
              <div style={{fontSize:'.62rem',color:'var(--ink4)',fontFamily:'var(--font-mono)'}}>{d.name}</div>
              <div style={{fontWeight:800,color:'var(--indigo)',fontFamily:'var(--font-mono)',fontSize:'.82rem'}}>{d.pct.toFixed(1)}%</div>
              {d.profit_pct&&<div style={{fontSize:'.6rem',color:'var(--emerald)'}}>{d.profit_pct.toFixed(1)}% margin</div>}
            </div>
          )
        })}
      </div>
    </BizCard>
  )
}

/* ── MAIN EXPORT ── */
export default function BusinessDashboard({ bizCharts, statistics, chartData, distributions }) {
  if (!bizCharts || Object.keys(bizCharts).length === 0) {
    return null  // fallback to standard charts
  }

  var c = bizCharts

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
      {/* Row 1: Monthly trend (full width) */}
      {c.monthly_revenue_trend && <MonthlyTrend chart={c.monthly_revenue_trend}/>}

      {/* Row 2: Top Products (full width, 2-column inside) */}
      {c.top_products_amount && <TopProducts chart={c.top_products_amount}/>}

      {/* Row 3: Salesperson + Geo side by side */}
      <div className="chart-grid">
        {c.top_salespersons && <SalespersonLeaderboard chart={c.top_salespersons}/>}
        {c.amount_by_geo    && <GeoDonut chart={c.amount_by_geo}/>}
      </div>

      {/* Row 4: Category + Team + Order Status */}
      <div className="chart-grid">
        {c.amount_by_category && <CategoryBar chart={c.amount_by_category}/>}
        {c.order_status       && <OrderStatus chart={c.order_status}/>}
        {c.team_performance   && <TeamPerformance chart={c.team_performance}/>}
      </div>
    </div>
  )
}
