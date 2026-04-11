import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const C = ['#00b4ff','#f5c518','#a855f7','#22c55e','#f97316','#ec4899','#06b6d4','#ef4444','#84cc16','#8b5cf6','#14b8a6','#f59e0b']
const TT = ({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:'rgba(5,7,9,.97)',border:'1px solid rgba(0,180,255,.3)',borderRadius:10,padding:'10px 14px',fontFamily:"'JetBrains Mono',monospace",fontSize:'.74rem'}}><div style={{color:'#f1f5f9',fontWeight:700,marginBottom:3}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:'#64748b'}}>{p.name}: <strong style={{color:'#f1f5f9'}}>{typeof p.value==='number'?p.value.toLocaleString():p.value}</strong></div>)}</div>)}

export default function CategoricalPanel({ categorical }) {
  const columns = Object.keys(categorical||{})
  const [sel, setSel] = useState(columns[0]||'')
  if (!categorical||columns.length===0) return <div className="empty"><span style={{fontSize:'3rem'}}>🏷️</span><p>No categorical columns found.</p></div>

  const d = categorical[sel]
  // Support both 'top' (new) and 'top_values' (old) field names
  const topValues = d?.top || d?.top_values || []

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.1rem'}}>
      <div className="card" style={{padding:'.9rem 1.1rem'}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{color:'var(--text2)',fontSize:'.83rem',marginRight:4}}>Column:</span>
          {columns.map(col=>(
            <button key={col} className={`tab ${sel===col?'on':''}`} onClick={()=>setSel(col)} style={{fontSize:'.78rem',padding:'5px 12px'}}>
              {col.length>22?col.slice(0,22)+'…':col}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'.9rem'}}>
        {[
          {label:'Unique Values',value:d?.unique||d?.unique_count||0,color:'blue'},
          {label:'Most Common',value:(d?.mode||'—').toString().slice(0,18),color:'gold'},
          {label:'Cardinality',value:d?.cardinality||'—',color:d?.cardinality==='High'?'red':d?.cardinality==='Medium'?'gold':'green'},
          {label:'Missing',value:(d?.missing||d?.missing_count||0).toLocaleString(),color:(d?.missing||d?.missing_count||0)>0?'red':'green'},
        ].map((k,i)=>(
          <div key={i} className={`kpi ${k.color}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:'1.1rem'}}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        <div className="card">
          <div className="card-hdr"><div><div className="card-title">📊 Value Distribution: {sel.length>28?sel.slice(0,28)+'…':sel}</div><div className="card-sub">Top {topValues.length} values · horizontal bar</div></div></div>
          <ResponsiveContainer width="100%" height={Math.max(220, topValues.length*26)}>
            <BarChart data={topValues} layout="vertical" margin={{top:5,right:60,bottom:5,left:8}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" horizontal={false}/>
              <XAxis type="number" tick={{fontSize:10,fill:'#475569',fontFamily:"'JetBrains Mono',monospace"}} tickLine={false} axisLine={{stroke:'#1e293b'}} tickFormatter={v=>v.toLocaleString()}/>
              <YAxis type="category" dataKey="value" width={130} tick={{fontSize:9,fill:'#64748b',fontFamily:"'JetBrains Mono',monospace"}} tickLine={false} axisLine={false} tickFormatter={v=>String(v).length>16?String(v).slice(0,16)+'…':v}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="count" name="Count" radius={[0,5,5,0]} maxBarSize={24}
                label={{position:'right',fill:'#475569',fontSize:9,fontFamily:"'JetBrains Mono',monospace"}}>
                {topValues.map((_,i)=><Cell key={i} fill={C[i%C.length]} fillOpacity={.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-hdr"><div><div className="card-title">📋 Frequency Table</div><div className="card-sub">Count · share % · proportion bar</div></div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>#</th><th>Value</th><th>Count</th><th>Share %</th><th>Proportion</th></tr></thead>
              <tbody>
                {topValues.map((item,i)=>(
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td style={{color:'var(--text)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={item.value}>{item.value}</td>
                    <td>{item.count?.toLocaleString()}</td>
                    <td style={{fontWeight:600,color:item.pct>40?'var(--orange)':'var(--text2)'}}>{item.pct}%</td>
                    <td style={{minWidth:120}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div className="pbar" style={{flex:1}}><div className="pbar-fill" style={{width:`${item.pct}%`,background:C[i%C.length]}}/></div>
                        <span style={{fontSize:'.68rem',color:'var(--text3)',minWidth:36}}>{item.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
