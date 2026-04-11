import React, { useState } from 'react'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

const TT = ({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:'rgba(5,7,9,.97)',border:'1px solid rgba(0,180,255,.3)',borderRadius:10,padding:'10px 14px',fontFamily:"'JetBrains Mono',monospace",fontSize:'.74rem'}}><div style={{color:'#64748b',marginBottom:4}}>Step {label}</div>{payload.map((p,i)=>p.value!==null&&p.value!==undefined&&(<div key={i} style={{color:'#f1f5f9',display:'flex',gap:8}}><span style={{width:7,height:7,borderRadius:'50%',background:p.color,display:'inline-block',flexShrink:0,marginTop:3}}/><span style={{color:'#64748b'}}>{p.name}:</span><span style={{fontWeight:700}}>{typeof p.value==='number'?p.value.toLocaleString(undefined,{maximumFractionDigits:3}):p.value}</span></div>))}</div>)}

const f=(v,d=3)=>{if(v===null||v===undefined)return '—';const n=Number(v);return isNaN(n)?String(v):n.toLocaleString(undefined,{maximumFractionDigits:d})}

export default function PredictionsPanel({ predictions, regression }) {
  const cols = Object.keys(predictions||{})
  const [sel, setSel] = useState(cols[0]||'')
  if (!predictions||cols.length===0) return <div className="empty"><span style={{fontSize:'3rem'}}>🔮</span><p>Need ≥5 data points for forecasting.</p></div>

  const pred = predictions[sel]
  const r2 = pred?.r2 ?? pred?.r_squared ?? 0
  const pv = pred?.pv ?? pred?.p_value ?? 1
  const sig = pred?.significant ?? (pv < 0.05)
  const trend = pred?.trend || (pred?.slope > 0 ? '↗ Increasing' : '↘ Decreasing')

  const chartData = pred ? [
    ...(pred.fitted||[]).map((v,i)=>({step:i,actual:v,type:'Historical'})),
    ...(pred.forecast||[]).map(f2=>({step:f2.step,forecast:f2.value,lo:f2.lo??f2.low,hi:f2.hi??f2.high}))
  ] : []
  const splitIdx = pred ? (pred.fitted||[]).length : 0

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.1rem'}}>
      <div className="card" style={{padding:'.9rem 1.1rem'}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{color:'var(--text2)',fontSize:'.83rem',marginRight:4}}>Select column:</span>
          {cols.map(col=>(
            <button key={col} className={`tab ${sel===col?'on':''}`} onClick={()=>setSel(col)} style={{fontSize:'.78rem',padding:'5px 12px'}}>
              {col.length>20?col.slice(0,20)+'…':col}
              {(predictions[col]?.significant||(predictions[col]?.pv??1)<.05)&&<span className="cnt" style={{background:'var(--green-dim)',color:'var(--green)'}}>sig</span>}
            </button>
          ))}
        </div>
      </div>

      {pred && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'.9rem'}}>
            {[
              {label:'Trend',value:trend,color:trend.includes('↗')?'green':'red',icon:''},
              {label:'Slope / step',value:f(pred.slope,6),color:'blue'},
              {label:'R² Fit',value:f(r2,4),color:r2>.7?'green':r2>.4?'gold':'red'},
              {label:'p-value',value:f(pv,6),color:sig?'green':'orange'},
              {label:'Std Error',value:f(pred.se??pred.std_error,4),color:'purple'},
              {label:'Significant?',value:sig?'✅ YES':'⚠️ NO',color:sig?'green':'red'},
            ].map(({label,value,color})=>(
              <div key={label} className={`kpi ${color}`}>
                <div className="kpi-label">{label}</div>
                <div className="kpi-value" style={{fontSize:'1.1rem'}}>{value}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-hdr">
              <div>
                <div className="card-title">🔮 Trend + 10-Step Forecast: {sel}</div>
                <div className="card-sub">
                  Linear regression · R²={f(r2,4)} · {sig?'✅ Significant (p<0.05)':'⚠️ Not significant'} · 95% CI band shown
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{top:10,right:30,bottom:20,left:20}}>
                <defs>
                  <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={.22}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="step" tick={{fontSize:10,fill:'#475569',fontFamily:"'JetBrains Mono',monospace"}} tickLine={false} axisLine={{stroke:'#1e293b'}}/>
                <YAxis tick={{fontSize:10,fill:'#475569',fontFamily:"'JetBrains Mono',monospace"}} tickLine={false} axisLine={false} width={65} tickFormatter={v=>v.toLocaleString(undefined,{maximumFractionDigits:1})}/>
                <Tooltip content={<TT/>}/>
                <Legend wrapperStyle={{fontSize:'.72rem',fontFamily:"'JetBrains Mono',monospace",color:'#475569'}}/>
                <ReferenceLine x={splitIdx-.5} stroke="#334155" strokeDasharray="4 2" label={{value:'Forecast →',fill:'#475569',fontSize:10,position:'insideTopRight'}}/>
                <Area type="monotone" dataKey="hi" fill="url(#bandGrad)" stroke="none" name="95% Upper" dot={false}/>
                <Area type="monotone" dataKey="lo" fill="var(--bg)" stroke="none" name="95% Lower" dot={false}/>
                <Line type="monotone" dataKey="actual" stroke="#00b4ff" strokeWidth={2} dot={false} name="Historical"/>
                <Line type="monotone" dataKey="forecast" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="6 3" name="Forecast" dot={{fill:'#a855f7',r:4}} activeDot={{r:6}}/>
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{marginTop:'1rem',padding:'.9rem 1rem',background:'var(--bg2)',borderRadius:9,fontSize:'.8rem',color:'var(--text2)',lineHeight:1.7,borderLeft:'3px solid var(--blue)'}}>
              <strong style={{color:'var(--blue)'}}>📊 </strong>{pred.note}
            </div>
          </div>

          <div className="card">
            <div className="card-hdr"><div><div className="card-title">📋 10-Step Forecast Table</div><div className="card-sub">Point estimates + 95% prediction intervals · {sel}</div></div></div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Step</th><th>Predicted Value</th><th>95% Lower</th><th>95% Upper</th><th>Interval Width</th><th>Direction</th></tr></thead>
                <tbody>
                  {(pred.forecast||[]).map((fc,i)=>{
                    const lo=fc.lo??fc.low; const hi=fc.hi??fc.high
                    const prev=i===0?pred.fitted?.[pred.fitted.length-1]:pred.forecast[i-1]?.value
                    const dir=fc.value===null||prev===null?null:fc.value>prev?'↑':fc.value<prev?'↓':'→'
                    return (
                      <tr key={fc.step}>
                        <td>+{i+1}</td>
                        <td style={{fontWeight:700,color:'var(--blue)'}}>{f(fc.value)}</td>
                        <td style={{color:'var(--green)'}}>{f(lo)}</td>
                        <td style={{color:'var(--orange)'}}>{f(hi)}</td>
                        <td>{hi!==null&&lo!==null?f(hi-lo,3):'—'}</td>
                        <td style={{color:dir==='↑'?'var(--green)':dir==='↓'?'var(--red)':'var(--text2)',fontSize:'1.1rem'}}>{dir||'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {regression&&Object.keys(regression).length>0&&(
        <div className="card">
          <div className="card-hdr"><div><div className="card-title">🔗 Best-Fit Regression (OLS)</div><div className="card-sub">Best single predictor found for each numeric target</div></div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Target</th><th>Best Predictor</th><th>Equation</th><th>r</th><th>R²</th><th>Slope</th><th>Intercept</th><th>p-value</th><th>Significant</th></tr></thead>
              <tbody>
                {Object.entries(regression).map(([target,reg])=>(
                  <tr key={target}>
                    <td style={{color:'var(--text)'}}>{target}</td>
                    <td style={{color:'var(--blue)'}}>{reg.predictor}</td>
                    <td style={{fontFamily:'var(--mono)',fontSize:'.7rem',whiteSpace:'normal',maxWidth:220}}>{reg.eq||reg.equation}</td>
                    <td style={{color:Math.abs(reg.r||0)>=.7?'var(--green)':Math.abs(reg.r||0)>=.4?'var(--gold)':'var(--text2)',fontWeight:700}}>{f(reg.r||reg.correlation,4)}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div className="pbar" style={{minWidth:50}}><div className="pbar-fill" style={{width:`${(reg.r2||reg.r_squared||0)*100}%`,background:'linear-gradient(90deg,var(--blue),var(--purple))'}}/></div>
                        <span>{f(reg.r2||reg.r_squared,4)}</span>
                      </div>
                    </td>
                    <td>{f(reg.slope,5)}</td>
                    <td>{f(reg.intercept,4)}</td>
                    <td style={{color:(reg.pv||reg.p_value||1)<.05?'var(--green)':'var(--orange)'}}>{f(reg.pv||reg.p_value,6)}</td>
                    <td><span className={`bdg ${reg.sig||reg.significant?'bdg-green':'bdg-orange'}`}>{reg.sig||reg.significant?'✅ Yes':'⚠️ No'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
