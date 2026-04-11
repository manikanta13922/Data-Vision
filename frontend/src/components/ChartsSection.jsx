import React, { useState } from 'react'
import BusinessDashboard from './BusinessDashboard.jsx'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList, Brush
} from 'recharts'

var C = ['#4f46e5','#f05a28','#0d9488','#d97706','#7c3aed','#e11d48','#0284c7','#059669','#dc2626','#0891b2','#6366f1','#84cc16']

/* ── Smart column name resolver ─────────────────────────────────────────── */
var KNOWN_LABELS = {
  season:'Season',
  city:'City (Match Venue)', venue:'Venue',
  winner:'Match Winner', 'toss winner':'Toss Winner',
  'toss decision':'Toss Decision (Bat/Field)',
  result:'Match Result', 'player of match':'Player of the Match',
  team1:'Team (Batting First)', team2:'Team (Fielding First)',
  umpire1:'Umpire 1', umpire2:'Umpire 2',
  // Business
  category:'Product Category', product:'Product',
  'sales_person':'Salesperson', salesperson:'Salesperson',
  geo:'Country / Geography', region:'Region',
  country:'Country', 'order_status':'Order Status',
  status:'Status', team:'Team',
  gender:'Gender', department:'Department',
  // Generic
  month:'Month', year:'Year', quarter:'Quarter',
  brand:'Brand', segment:'Segment', source:'Source',
}

function colLabel(col) {
  if (!col) return ''
  var cl = col.toLowerCase().replace(/_/g,' ')
  if (KNOWN_LABELS[cl]) return KNOWN_LABELS[cl]
  if (KNOWN_LABELS[col.toLowerCase()]) return KNOWN_LABELS[col.toLowerCase()]
  // Title case
  return col.replace(/_/g,' ').replace(/\b\w/g, function(l){ return l.toUpperCase() })
}

function yAxisLabel(col) {
  var c = (col||'').toLowerCase()
  if (c.includes('season')||c.includes('year')) return 'Matches Played'
  if (c.includes('city')||c.includes('venue')) return 'Matches Hosted'
  if (c.includes('winner')||c.includes('team1')||c.includes('team2')) return 'Appearances / Wins'
  if (c.includes('player')) return 'Awards'
  if (c.includes('toss')) return 'Times'
  if (c.includes('result')) return 'Matches'
  if (c.includes('product')||c.includes('category')) return 'Records'
  if (c.includes('status')) return 'Shipments'
  if (c.includes('gender')||c.includes('department')||c.includes('region')) return 'Count'
  if (c.includes('amount')||c.includes('revenue')||c.includes('sales')) return 'Amount ($)'
  if (c.includes('profit')) return 'Profit ($)'
  if (c.includes('score')||c.includes('gpa')) return 'Score'
  return 'Count'
}

function autoInsight(col, data) {
  if (!data||!data.length) return null
  var sorted = data.slice().sort(function(a,b){ return b.count-a.count })
  var top = sorted[0]; var bottom = sorted[sorted.length-1]
  var total = data.reduce(function(s,d){ return s+d.count },0)
  var pct = total>0?((top.count/total)*100).toFixed(1):0
  var lbl = colLabel(col)
  var c = (col||'').toLowerCase()
  if (c.includes('winner')) return `${top.name} leads with ${top.count} wins (${pct}% of matches where a winner is recorded).`
  if (c.includes('city')||c.includes('venue')) return `${top.name} hosted the most matches (${top.count}, ${pct}% of total). Consider venue bias in team performance analysis.`
  if (c.includes('toss decision')) return `Teams chose to ${top.name} first ${top.count} times (${pct}%). This reflects the modern preference for chasing.`
  if (c.includes('player')) return `${top.name} won Player of the Match ${top.count} times — most dominant performer.`
  if (c.includes('season')) return `${top.name} had the highest match count (${top.count}). ${bottom.name} had the fewest (${bottom.count}).`
  if (c.includes('team1')||c.includes('team2')) return `${top.name} appeared ${top.count} times (${pct}%) — most frequent in this role.`
  return `${top.name} is the most common value: ${top.count} records (${pct}% of ${sorted.length} categories).`
}

/* ── Tooltip ─────────────────────────────────────────────────────────────── */
function TT({ active, payload, label, yLabel }) {
  if (!active||!payload||!payload.length) return null
  return (
    <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,padding:'10px 14px',boxShadow:'0 4px 20px rgba(0,0,0,.1)',fontFamily:"'JetBrains Mono',monospace",fontSize:'.74rem',maxWidth:240}}>
      {label!==undefined&&<div style={{color:'#6b7280',marginBottom:5,borderBottom:'1px solid #f3f4f6',paddingBottom:4,fontSize:'.7rem',fontWeight:700}}>{String(label)}</div>}
      {payload.map(function(p,i){
        if (p.value===null||p.value===undefined) return null
        return (
          <div key={i} style={{display:'flex',gap:8,alignItems:'center',marginBottom:2,color:'#111827'}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:p.color||C[0],display:'inline-block',flexShrink:0}}/>
            <span style={{color:'#9ca3af'}}>{yLabel||p.name}:</span>
            <span style={{fontWeight:700,marginLeft:'auto'}}>{typeof p.value==='number'?p.value.toLocaleString(undefined,{maximumFractionDigits:2}):p.value}</span>
          </div>
        )
      })}
    </div>
  )
}

var AX = { tick:{fontSize:10,fill:'#9ca3af',fontFamily:"'JetBrains Mono',monospace"}, tickLine:false, axisLine:{stroke:'#f3f4f6'} }
var GR = <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>

/* ── Card wrapper ────────────────────────────────────────────────────────── */
function CC({ title, subtitle, insight, children, full, topBadge }) {
  return (
    <div className={'card '+(full?'card-full':'')} style={{padding:0,overflow:'hidden',display:'flex',flexDirection:'column',animation:'fadeUp .4s ease both'}}>
      <div style={{padding:'1rem 1.25rem .75rem',borderBottom:'1px solid var(--border)'}}>
        <div className="card-title" style={{fontSize:'.95rem'}}>{title}</div>
        {subtitle&&<div className="card-sub">{subtitle}</div>}
        {topBadge&&(
          <div style={{display:'flex',gap:6,marginTop:5,flexWrap:'wrap'}}>
            {topBadge.map(function(b,i){ return <span key={i} className="bdg bdg-indigo" style={{fontSize:'.65rem'}}>{b}</span> })}
          </div>
        )}
      </div>
      <div style={{padding:'1rem 1.25rem .9rem',flex:1}}>{children}</div>
      {insight&&(
        <div style={{padding:'.65rem 1.25rem',background:'rgba(79,70,229,.04)',borderTop:'1px solid var(--border)',fontSize:'.74rem',color:'var(--ink2)',lineHeight:1.65}}>
          <strong style={{color:'var(--indigo)'}}>💡 Insight: </strong>{insight}
        </div>
      )}
    </div>
  )
}

/* ── Horizontal Bar (for >7 categories) ─────────────────────────────────── */
function HBar({ data, col }) {
  var lbl = colLabel(col); var yLbl = yAxisLabel(col)
  var sorted = data.slice().sort(function(a,b){ return b.count-a.count })
  var total  = sorted.reduce(function(s,d){ return s+d.count },0)
  var top = sorted[0]
  return (
    <CC title={'📊 '+lbl}
      subtitle={sorted.length+' categories · sorted by '+yLbl.toLowerCase()}
      insight={autoInsight(col, sorted)}
      topBadge={top?['🏆 '+top.name+': '+top.count.toLocaleString(),'Total: '+total.toLocaleString()]:null}>
      <ResponsiveContainer width="100%" height={Math.max(220,Math.min(sorted.length*28,400))}>
        <BarChart data={sorted} layout="vertical" margin={{top:0,right:80,bottom:0,left:4}}>
          {GR}
          <XAxis type="number" {...AX} tickFormatter={function(v){ return v.toLocaleString() }}
            label={{value:yLbl,position:'insideBottom',offset:-2,fill:'#9ca3af',fontSize:9}}/>
          <YAxis type="category" dataKey="name" width={140}
            tick={{fontSize:9,fill:'#6b7280',fontFamily:"'JetBrains Mono',monospace"}} tickLine={false} axisLine={false}
            tickFormatter={function(v){ return String(v).length>19?String(v).slice(0,19)+'…':v }}/>
          <Tooltip content={<TT yLabel={yLbl}/>}/>
          <Bar dataKey="count" name={yLbl} radius={[0,5,5,0]} maxBarSize={22}
            label={{position:'right',fill:'#6b7280',fontSize:9,fontFamily:"'JetBrains Mono',monospace",formatter:function(v){ return v.toLocaleString() }}}>
            {sorted.map(function(_,i){ return <Cell key={i} fill={C[i%C.length]}/> })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CC>
  )
}

/* ── Vertical Bar (≤7 categories) with % labels ─────────────────────────── */
function VBar({ data, col }) {
  var lbl  = colLabel(col); var yLbl = yAxisLabel(col)
  var total = data.reduce(function(s,d){ return s+d.count },0)
  var sorted = data.slice().sort(function(a,b){ return b.count-a.count })
  var withPct = sorted.map(function(d){ return Object.assign({},d,{pct:total>0?((d.count/total)*100).toFixed(1)+'%':'0%'}) })
  var top = sorted[0]
  return (
    <CC title={'📊 '+lbl}
      subtitle={data.length+' categories · percentage labels shown'}
      insight={autoInsight(col, sorted)}
      topBadge={top?['🏆 '+top.name+': '+top.count.toLocaleString()]:null}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={withPct} margin={{top:20,right:10,bottom:60,left:10}}>
          {GR}
          <XAxis dataKey="name" {...AX} angle={-35} textAnchor="end" interval={0} height={68}
            tickFormatter={function(v){ return String(v).length>15?String(v).slice(0,15)+'…':v }}/>
          <YAxis {...AX} width={42} tickFormatter={function(v){ return v.toLocaleString() }}
            label={{value:yLbl,angle:-90,position:'insideLeft',fill:'#9ca3af',fontSize:9,offset:12}}/>
          <Tooltip content={<TT yLabel={yLbl}/>}/>
          <Bar dataKey="count" name={yLbl} radius={[5,5,0,0]} maxBarSize={52}>
            <LabelList dataKey="pct" position="top" style={{fontSize:9,fill:'#6b7280',fontFamily:"'JetBrains Mono',monospace"}}/>
            {withPct.map(function(_,i){ return <Cell key={i} fill={C[i%C.length]}/> })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CC>
  )
}

/* ── Smart bar (auto horizontal vs vertical) ─────────────────────────────── */
function SmartBar({ chart }) {
  var data   = chart.data||[]
  var col    = chart.col||chart.title||''
  var sorted = data.slice().sort(function(a,b){ return b.count-a.count })
  if (sorted.length > 7) return <HBar data={sorted} col={col}/>
  return <VBar data={sorted} col={col}/>
}

/* ── Trend (numeric) ─────────────────────────────────────────────────────── */
function TrendChart({ chart }) {
  var cols  = chart.columns||[]
  var data  = chart.data||[]
  var hasDate = data.length>0 && data[0].x && String(data[0].x).match(/^\d{4}[-/]/)
  return (
    <CC title={'📈 '+cols.map(colLabel).join(' · ')} full
      subtitle={data.length+' data points'+(hasDate?' · time-ordered':'')}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{top:10,right:30,bottom:0,left:10}}>
          <defs>
            {cols.map(function(c,i){
              return (
                <linearGradient key={c} id={'tg'+i} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C[i%C.length]} stopOpacity={.18}/>
                  <stop offset="95%" stopColor={C[i%C.length]} stopOpacity={0}/>
                </linearGradient>
              )
            })}
          </defs>
          {GR}
          <XAxis dataKey="x" {...AX} angle={-15} textAnchor="end" height={36}
            tickFormatter={function(v){ return hasDate?String(v).slice(0,7):v }}/>
          <YAxis {...AX} width={65} tickFormatter={function(v){ return v.toLocaleString(undefined,{maximumFractionDigits:0}) }}/>
          <Tooltip content={<TT/>}/>
          <Legend wrapperStyle={{fontSize:'.72rem',fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}
            formatter={function(k){ return colLabel(k) }}/>
          {cols.map(function(c,i){
            return <Area key={c} type="monotone" dataKey={c} name={c}
              stroke={C[i%C.length]} fill={'url(#tg'+i+')'} strokeWidth={2.5} dot={false} activeDot={{r:4}}/>
          })}
          {data.length>30&&<Brush dataKey="x" height={18} stroke="#e5e7eb" fill="#f9fafb"/>}
        </AreaChart>
      </ResponsiveContainer>
    </CC>
  )
}

/* ── Scatter ─────────────────────────────────────────────────────────────── */
function ScatterPlot({ chart }) {
  var c1=chart.x||''; var c2=chart.y||''
  var pts=(chart.data||[]).filter(function(d){ return d.x!==null&&d.y!==null })
  var l1=colLabel(c1); var l2=colLabel(c2)
  var corrHint=''
  if (pts.length>5) {
    var n=pts.length,sx=0,sy=0,sxy=0,sx2=0,sy2=0
    pts.forEach(function(d){sx+=d.x;sy+=d.y;sxy+=d.x*d.y;sx2+=d.x*d.x;sy2+=d.y*d.y})
    var num=n*sxy-sx*sy; var den=Math.sqrt((n*sx2-sx*sx)*(n*sy2-sy*sy))
    if (den>0) { var rv=num/den; corrHint='r = '+rv.toFixed(3)+' — '+(Math.abs(rv)>=.7?'Strong':Math.abs(rv)>=.4?'Moderate':'Weak')+' relationship' }
  }
  return (
    <CC title={'🔵 '+l1+' vs '+l2}
      subtitle={pts.length+' data points · each dot = one record · '+corrHint}
      insight={corrHint}>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{top:10,right:20,bottom:28,left:10}}>
          {GR}
          <XAxis type="number" dataKey="x" name={c1} {...AX}
            tickFormatter={function(v){ return v.toLocaleString(undefined,{maximumFractionDigits:1}) }}
            label={{value:l1.slice(0,22),position:'insideBottom',offset:-14,fill:'#9ca3af',fontSize:9}}/>
          <YAxis type="number" dataKey="y" name={c2} {...AX} width={60}
            tickFormatter={function(v){ return v.toLocaleString(undefined,{maximumFractionDigits:1}) }}
            label={{value:l2.slice(0,22),angle:-90,position:'insideLeft',fill:'#9ca3af',fontSize:9}}/>
          <Tooltip cursor={{stroke:'#e5e7eb'}} content={function(p){
            if (!p.active||!p.payload||!p.payload.length) return null
            return (
              <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,padding:'10px 14px',boxShadow:'0 4px 20px rgba(0,0,0,.1)',fontFamily:"'JetBrains Mono',monospace",fontSize:'.73rem'}}>
                <div style={{color:'#111827'}}>{l1}: <strong>{p.payload[0]&&Number(p.payload[0].value).toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>
                <div style={{color:'#111827'}}>{l2}: <strong>{p.payload[1]&&Number(p.payload[1].value).toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>
              </div>
            )
          }}/>
          <Scatter data={pts} fill={C[0]} fillOpacity={.65} r={4}/>
        </ScatterChart>
      </ResponsiveContainer>
    </CC>
  )
}

/* ── Box Plot ─────────────────────────────────────────────────────────────── */
function BoxPlot({ chart }) {
  var col=chart.col||''; var lbl=colLabel(col)
  var range=((chart.max||0)-(chart.min||0))||1
  var pct=function(v){ return (((v||0)-(chart.min||0))/range*100) }
  var skewDir=chart.mean&&chart.median?(chart.mean>chart.median?'right':'left'):null
  return (
    <CC title={'📦 '+lbl+' — Distribution Summary'}
      subtitle={'Min · Q1 · Median ─── Mean◆ · Q3 · Max · IQR shows central 50%'}
      insight={skewDir?(skewDir==='right'?'Mean > Median — right-skewed. High outliers pull the average up.':'Mean < Median — left-skewed. Low outliers pull the average down.'):null}>
      <div style={{padding:'1rem 0 .5rem'}}>
        <div style={{position:'relative',height:44,margin:'0 16px'}}>
          <div style={{position:'absolute',top:'50%',left:0,right:0,height:1,background:'#e5e7eb'}}/>
          <div style={{position:'absolute',top:'20%',bottom:'20%',left:pct(chart.min)+'%',width:2,background:'#9ca3af',borderRadius:1}}/>
          <div style={{position:'absolute',top:'20%',bottom:'20%',left:Math.min(pct(chart.max),99)+'%',width:2,background:'#9ca3af',borderRadius:1}}/>
          <div style={{position:'absolute',top:'10%',bottom:'10%',left:pct(chart.q1)+'%',width:Math.max(pct(chart.q3)-pct(chart.q1),.5)+'%',background:'rgba(79,70,229,.1)',border:'2px solid var(--indigo)',borderRadius:4}}/>
          <div style={{position:'absolute',top:'5%',bottom:'5%',left:pct(chart.median)+'%',width:3,background:'var(--coral)',borderRadius:2}}/>
          <div style={{position:'absolute',top:'50%',left:pct(chart.mean)+'%',width:10,height:10,background:'var(--teal)',transform:'translate(-50%,-50%) rotate(45deg)'}}/>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'center',fontSize:'.62rem',color:'#9ca3af',marginTop:8,fontFamily:"'JetBrains Mono',monospace",flexWrap:'wrap'}}>
          <span>── Min/Max</span><span style={{color:'var(--indigo)'}}>□ IQR</span><span style={{color:'var(--coral)'}}>| Median</span><span style={{color:'var(--teal)'}}>◆ Mean</span>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'4px',marginTop:'.5rem'}}>
        {[['Min',chart.min,'#6b7280'],['Q1 (25%)',chart.q1,'var(--indigo)'],['Median',chart.median,'var(--coral)'],['Mean◆',chart.mean,'var(--teal)'],['Q3 (75%)',chart.q3,'var(--indigo)'],['Max',chart.max,'#6b7280']].map(function(item){
          return (
            <div key={item[0]} style={{textAlign:'center',background:'var(--bg)',borderRadius:7,padding:'5px 3px',border:'1px solid var(--border)'}}>
              <div style={{fontSize:'.57rem',color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.05em',fontFamily:"'JetBrains Mono',monospace",lineHeight:1.2}}>{item[0]}</div>
              <div style={{fontSize:'.82rem',fontWeight:700,color:item[2],fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>
                {item[1]!==null&&item[1]!==undefined?Number(item[1]).toLocaleString(undefined,{maximumFractionDigits:2}):'—'}
              </div>
            </div>
          )
        })}
      </div>
    </CC>
  )
}

/* ── Histogram ───────────────────────────────────────────────────────────── */
function Histogram({ col, dist }) {
  if (!dist||!dist.histogram) return null
  var lbl=colLabel(col)
  var data=dist.histogram.centers.map(function(c,i){ return { bin:c!==null?Number(c).toFixed(1):'?', count:dist.histogram.counts[i] } })
  var norm=dist.normality
  var isNorm=norm&&norm.is_normal!==null&&norm.is_normal!==undefined
  return (
    <CC title={'📉 '+lbl+' — Value Distribution'}
      subtitle={'Frequency histogram · each bar = a value range · tall bars = where most values cluster'}
      insight={isNorm?(norm.is_normal?'✅ Normal distribution (Shapiro-Wilk p='+norm.p_value+'). Standard tests valid.':'⚠ Non-normal (p='+norm.p_value+'). Use Mann-Whitney / Kruskal-Wallis for inference.'):'Bars show how frequently values appear in each range.'}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{top:5,right:10,bottom:26,left:10}}>
          {GR}
          <XAxis dataKey="bin" {...AX} angle={-25} textAnchor="end" height={38} interval={Math.floor(data.length/7)}
            label={{value:lbl.slice(0,24),position:'insideBottom',offset:-2,fill:'#9ca3af',fontSize:9}}/>
          <YAxis {...AX} width={36} tickFormatter={function(v){ return v.toLocaleString() }}
            label={{value:'Frequency',angle:-90,position:'insideLeft',fill:'#9ca3af',fontSize:9}}/>
          <Tooltip content={<TT yLabel="Records in this range"/>}/>
          <Bar dataKey="count" name="Frequency" fill={C[0]} fillOpacity={.8} radius={[3,3,0,0]}/>
        </BarChart>
      </ResponsiveContainer>
    </CC>
  )
}

/* ── Donut/Pie ───────────────────────────────────────────────────────────── */
function Donut({ chart }) {
  var col=chart.col||chart.title||''
  var data=chart.data||[]
  var total=data.reduce(function(s,d){ return s+d.value },0)
  var top=data.slice().sort(function(a,b){ return b.value-a.value })[0]
  var topPct=top&&total>0?((top.value/total)*100).toFixed(1):null
  return (
    <CC title={colLabel(col)+' — Proportional Share'}
      subtitle={data.length+' categories · donut shows percentage of total'}
      insight={top?top.name+' represents '+topPct+'% of all records ('+top.value.toLocaleString()+' entries).':null}
      topBadge={top?['🏆 '+top.name+': '+topPct+'%']:null}>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} cx="45%" cy="50%" innerRadius={55} outerRadius={90}
            paddingAngle={3} dataKey="value"
            label={function(p){ var pct=total>0?(p.value/total*100).toFixed(1):'0'; return pct>5?String(p.name).slice(0,12)+' '+pct+'%':'' }}
            labelLine={{stroke:'#d1d5db',strokeWidth:1}}>
            {data.map(function(_,i){ return <Cell key={i} fill={C[i%C.length]}/> })}
          </Pie>
          <Tooltip formatter={function(v){ return [v.toLocaleString()+' ('+(total>0?(v/total*100).toFixed(1)+'%':'')+')','Records'] }}/>
          <Legend wrapperStyle={{fontSize:'.71rem',fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}/>
        </PieChart>
      </ResponsiveContainer>
    </CC>
  )
}

/* ── Stats Summary ──────────────────────────────────────────────────────── */
function StatsMini({ stats }) {
  var cols=Object.keys(stats||{}).slice(0,10)
  if (!cols.length) return null
  return (
    <div className="card card-full" style={{animation:'fadeUp .4s ease both'}}>
      <div className="card-hdr">
        <div>
          <div className="card-title">📋 Complete Statistics — All Numeric Columns</div>
          <div className="card-sub">Every value from actual data · Mean=average · Std Dev=spread · Skew=shape · CV%=variability · Sum=total</div>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Column (What It Measures)</th><th>Records</th><th>Average (Mean)</th><th>Middle (Median)</th>
              <th>Spread (Std Dev)</th><th>Min Value</th><th>Max Value</th><th>IQR</th>
              <th>Shape (Skewness)</th><th>Variability (CV%)</th><th>Sum Total</th><th>Distribution</th>
            </tr>
          </thead>
          <tbody>
            {cols.map(function(col){
              var s=stats[col]; var skew=s.skewness||0
              return (
                <tr key={col}>
                  <td style={{maxWidth:160}}>
                    <div style={{fontWeight:700,color:'var(--ink)',fontSize:'.82rem'}}>{col}</div>
                    <div style={{color:'var(--ink4)',fontSize:'.68rem',marginTop:1}}>{colLabel(col)}</div>
                  </td>
                  <td>{s.count&&s.count.toLocaleString()}</td>
                  <td style={{color:'var(--indigo)',fontWeight:700}}>{s.mean!==null&&s.mean!==undefined?Number(s.mean).toLocaleString(undefined,{maximumFractionDigits:2}):'—'}</td>
                  <td style={{color:'var(--teal)'}}>{s.median!==null&&s.median!==undefined?Number(s.median).toLocaleString(undefined,{maximumFractionDigits:2}):'—'}</td>
                  <td>{s.std!==null&&s.std!==undefined?Number(s.std).toLocaleString(undefined,{maximumFractionDigits:2}):'—'}</td>
                  <td style={{color:'var(--emerald)',fontWeight:600}}>{s.min!==null&&s.min!==undefined?Number(s.min).toLocaleString(undefined,{maximumFractionDigits:2}):'—'}</td>
                  <td style={{color:'var(--coral)',fontWeight:600}}>{s.max!==null&&s.max!==undefined?Number(s.max).toLocaleString(undefined,{maximumFractionDigits:2}):'—'}</td>
                  <td>{s.iqr!==null&&s.iqr!==undefined?Number(s.iqr).toLocaleString(undefined,{maximumFractionDigits:2}):'—'}</td>
                  <td style={{color:Math.abs(skew)>1?'var(--amber)':'var(--ink3)',fontWeight:Math.abs(skew)>1?700:400}}>
                    {skew!==null?Number(skew).toFixed(3):'—'}
                  </td>
                  <td>{s.cv!==null&&s.cv!==undefined?Number(s.cv).toFixed(1)+'%':'—'}</td>
                  <td style={{fontWeight:600}}>{s.sum!==null&&s.sum!==undefined?Number(s.sum).toLocaleString(undefined,{maximumFractionDigits:0}):'—'}</td>
                  <td>
                    <span className={'bdg '+(Math.abs(skew)<.5?'bdg-emerald':Math.abs(skew)<1?'bdg-amber':'bdg-coral')} style={{fontSize:'.61rem'}}>
                      {s.skew_label||(Math.abs(skew)<.5?'Symmetric':skew>0?'Right-skewed':'Left-skewed')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── MAIN EXPORT ─────────────────────────────────────────────────────────── */
export default function ChartsSection({ chartData, distributions, statistics, bizCharts }) {
  var [distIdx, setDistIdx] = useState(0)

  // Business dashboard first (star schema data)
  if (bizCharts && Object.keys(bizCharts).length > 0) {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
        <BusinessDashboard bizCharts={bizCharts} statistics={statistics} chartData={chartData} distributions={distributions}/>
        {statistics&&Object.keys(statistics).length>0&&<StatsMini stats={statistics}/>}
      </div>
    )
  }

  if (!chartData) return <div className="empty"><span style={{fontSize:'3rem'}}>📭</span><p>No chart data.</p></div>

  var distCols = Object.keys(distributions||{})

  // Filter out date columns, ID columns from bar charts
  var bars = Object.entries(chartData).filter(function(e){
    if (!e[0].startsWith('bar_')) return false
    var col = e[1].col||''
    // Skip if looks like date column
    if (/^\d{4}/.test(String((e[1].data||[{}])[0]?.name||''))) return false
    if (/date|time|datetime/i.test(col)) return false
    // Skip if all values look like IDs (S0000...)
    var data = e[1].data||[]
    if (data.length>0 && /^[A-Z]\d{5,}/.test(String(data[0].name||''))) return false
    return true
  })
  var pies     = Object.entries(chartData).filter(function(e){ return e[0].startsWith('pie_') })
  var scatters = Object.entries(chartData).filter(function(e){ return e[0].startsWith('scatter_') })
  var boxes    = Object.entries(chartData).filter(function(e){ return e[0].startsWith('box_') })
  var trends   = Object.entries(chartData).filter(function(e){ return e[0].startsWith('trend_') })

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
      {statistics&&Object.keys(statistics).length>0&&<StatsMini stats={statistics}/>}
      {trends.map(function(e){ return <TrendChart key={e[0]} chart={e[1]}/> })}

      {distCols.length>0&&(
        <div className="card">
          <div className="card-hdr">
            <div>
              <div className="card-title">📉 Distribution Analysis — Frequency of Values</div>
              <div className="card-sub">Select a column to see how its values are spread across the range</div>
            </div>
            {distCols.length>1&&(
              <select value={distIdx} onChange={function(e){ setDistIdx(+e.target.value) }}
                style={{background:'var(--bg)',border:'1.5px solid var(--border)',color:'var(--ink)',borderRadius:8,padding:'6px 12px',fontSize:'.78rem',cursor:'pointer',fontFamily:'var(--font-mono)',outline:'none'}}>
                {distCols.map(function(c,i){ return <option key={c} value={i}>{colLabel(c)}</option> })}
              </select>
            )}
          </div>
          <Histogram col={distCols[distIdx]} dist={distributions[distCols[distIdx]]}/>
        </div>
      )}

      <div className="chart-grid">
        {bars.map(function(e){ var d=e[1]; return d.data&&d.data.length>7?<HBar key={e[0]} data={d.data} col={d.col||''}/>:<VBar key={e[0]} data={d.data||[]} col={d.col||''}/> })}
        {pies.map(function(e){ return <Donut key={e[0]} chart={e[1]}/> })}
        {scatters.map(function(e){ return <ScatterPlot key={e[0]} chart={e[1]}/> })}
        {boxes.slice(0,6).map(function(e){ return <BoxPlot key={e[0]} chart={e[1]}/> })}
      </div>
    </div>
  )
}
