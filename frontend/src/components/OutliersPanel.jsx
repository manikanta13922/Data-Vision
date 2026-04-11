import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
const SC = {High:'#ef4444',Medium:'#f97316',Low:'#22c55e'}
const TT = ({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:'rgba(5,7,9,.97)',border:'1px solid rgba(0,180,255,.3)',borderRadius:10,padding:'10px 14px',fontFamily:"'JetBrains Mono',monospace",fontSize:'.74rem'}}><div style={{color:'#64748b',marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:'#f1f5f9'}}>{p.name}: <strong>{typeof p.value==='number'?p.value.toLocaleString(undefined,{maximumFractionDigits:2}):p.value}</strong></div>)}</div>)}

export default function OutliersPanel({ outliers }) {
  if (!outliers||Object.keys(outliers).length===0) return <div className="empty"><span style={{fontSize:'3rem'}}>✅</span><p>No outlier data available.</p></div>
  const entries = Object.entries(outliers)
  const chartData = entries.map(([col,d])=>({column:col.length>14?col.slice(0,14)+'…':col,fullName:col,pct:d.pct,count:d.count,severity:d.severity}))
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.1rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'.9rem'}}>
        {[{label:'Columns Analyzed',value:entries.length,color:'blue'},{label:'🔴 High Severity',value:entries.filter(([,d])=>d.severity==='High').length,color:'red'},{label:'🟡 Medium',value:entries.filter(([,d])=>d.severity==='Medium').length,color:'gold'},{label:'🟢 Low',value:entries.filter(([,d])=>d.severity==='Low').length,color:'green'}].map((k,i)=>(
          <div key={i} className={`kpi ${k.color}`}><div className="kpi-label">{k.label}</div><div className="kpi-value">{k.value}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-hdr"><div><div className="card-title">⚠️ Outlier Rate by Column</div><div className="card-sub">IQR method · values beyond Q1−1.5×IQR or Q3+1.5×IQR</div></div></div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{top:5,right:20,bottom:50,left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
            <XAxis dataKey="column" tick={{fontSize:10,fill:'#475569',fontFamily:"'JetBrains Mono',monospace"}} tickLine={false} axisLine={{stroke:'#1e293b'}} angle={-35} textAnchor="end" interval={0}/>
            <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:"'JetBrains Mono',monospace"}} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="pct" name="Outlier %" radius={[5,5,0,0]} maxBarSize={52}>{chartData.map((e,i)=><Cell key={i} fill={SC[e.severity]} fillOpacity={.85}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <div className="card-hdr"><div><div className="card-title">📋 Detailed Outlier Report</div><div className="card-sub">IQR fences · severity · extreme values</div></div></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Column</th><th>Count</th><th>Outlier %</th><th>Lower Fence</th><th>Upper Fence</th><th>Severity</th><th>Sample Extreme Values</th></tr></thead>
            <tbody>
              {entries.map(([col,d])=>(
                <tr key={col}>
                  <td style={{color:'var(--text)'}}>{col}</td>
                  <td>{d.count?.toLocaleString()}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="pbar" style={{minWidth:50}}><div className="pbar-fill" style={{width:`${Math.min((d.pct||0)*5,100)}%`,background:SC[d.severity]}}/></div>
                      {d.pct}%
                    </div>
                  </td>
                  <td>{(d.lb||d.lower_bound)?.toLocaleString(undefined,{maximumFractionDigits:3})}</td>
                  <td>{(d.ub||d.upper_bound)?.toLocaleString(undefined,{maximumFractionDigits:3})}</td>
                  <td><span className={`bdg ${d.severity==='High'?'bdg-red':d.severity==='Medium'?'bdg-orange':'bdg-green'}`}>{d.severity==='High'?'🔴 ':'🟡 '}{d.severity}</span></td>
                  <td style={{fontSize:'.72rem',fontFamily:'var(--mono)'}}>{(d.extremes||d.extreme_values||[]).filter(v=>v!==null).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
