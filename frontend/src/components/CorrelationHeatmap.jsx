import React from 'react'

function cellBg(v) {
  if (v===null||v===undefined||isNaN(v)) return 'transparent'
  if (v===1) return '#d1fae5'
  var a=Math.abs(v)
  if (a>=.9) return v>0?'#fee2e2':'#dbeafe'
  if (a>=.7) return v>0?'#fecaca':'#bfdbfe'
  if (a>=.5) return v>0?'#fed7aa':'#e9d5ff'
  if (a>=.3) return v>0?'#fef9c3':'#f0fdf4'
  return 'transparent'
}
function cellColor(v) {
  if (v===null||v===undefined||isNaN(v)) return '#9ca3af'
  var a=Math.abs(v)
  if (a>=.7) return '#111827'
  if (a>=.5) return '#374151'
  return '#6b7280'
}
var f=function(v,d){ if(v===null||v===undefined)return '—'; var n=Number(v); return isNaN(n)?'—':n.toFixed(d||4) }

export default function CorrelationHeatmap({ correlations }) {
  if (!correlations||!correlations.matrix||Object.keys(correlations.matrix).length===0)
    return <div className="empty"><span style={{fontSize:'3rem'}}>🔗</span><p>Need ≥2 numeric columns for correlation analysis.</p></div>

  var { matrix, strong_pairs } = correlations
  var cols = Object.keys(matrix)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.1rem'}}>
      <div className="card">
        <div className="card-hdr">
          <div>
            <div className="card-title">🔥 Correlation Heatmap — Pearson Coefficient Matrix</div>
            <div className="card-sub">{cols.length}×{cols.length} · 🟥 red = strong positive · 🟦 blue = strong negative · 🟩 green = self</div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',fontSize:'.66rem',fontFamily:'var(--font-mono)',color:'var(--ink3)'}}>
            {[['#fee2e2','Strong +'],['#dbeafe','Strong −'],['#fed7aa','Moderate'],['#d1fae5','Self']].map(function(item){
              return <span key={item[1]} style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:10,height:10,background:item[0],borderRadius:2,display:'inline-block',border:'1px solid #e5e7eb'}}/>{item[1]}</span>
            })}
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="corr-tbl">
            <thead>
              <tr>
                <th style={{background:'transparent',border:'none',minWidth:80}}/>
                {cols.map(function(c){ return <th key={c} style={{fontSize:'.6rem',color:'var(--ink3)',transform:'rotate(-30deg)',height:55,verticalAlign:'bottom',paddingBottom:4,maxWidth:80}}>{c.length>13?c.slice(0,13)+'…':c}</th> })}
              </tr>
            </thead>
            <tbody>
              {cols.map(function(row){
                return (
                  <tr key={row}>
                    <th style={{textAlign:'right',fontSize:'.63rem',color:'var(--ink2)',fontWeight:700,paddingRight:8,whiteSpace:'nowrap',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis'}}>{row.length>13?row.slice(0,13)+'…':row}</th>
                    {cols.map(function(col){
                      var v=matrix[row]&&matrix[row][col]; var a=v!==null&&v!==undefined?Math.abs(v):0
                      return <td key={col} title={row+' vs '+col+': '+f(v)} style={{background:cellBg(v),color:cellColor(v),fontWeight:a>=.7?700:400,cursor:'default'}}>{f(v,2)}</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {strong_pairs&&strong_pairs.length>0&&(
        <div className="card">
          <div className="card-hdr"><div><div className="card-title">📊 Significant Correlations (|r| ≥ 0.3)</div><div className="card-sub">Sorted by strength · R² = how much variance is explained</div></div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>#</th><th>Column A</th><th>Column B</th><th>r (Pearson)</th><th>R² (Explained %)</th><th>Strength</th><th>Direction</th></tr></thead>
              <tbody>
                {strong_pairs.map(function(p,i){
                  var a=Math.abs(p.r||p.correlation||0)
                  return (
                    <tr key={i}>
                      <td>{i+1}</td>
                      <td style={{color:'var(--ink)',fontWeight:600}}>{p.col1}</td>
                      <td style={{color:'var(--ink)',fontWeight:600}}>{p.col2}</td>
                      <td style={{color:a>=.7?'var(--indigo)':a>=.5?'var(--amber)':'var(--ink3)',fontWeight:700}}>{f(p.r||p.correlation,4)}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div className="pbar" style={{minWidth:60}}><div className="pbar-fill" style={{width:((p.r2||p.r_squared||0)*100)+'%',background:'linear-gradient(90deg,var(--indigo),var(--violet))'}}/></div>
                          <span>{((p.r2||p.r_squared||0)*100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td><span className={'bdg '+(a>=.9?'bdg-rose':a>=.7?'bdg-coral':a>=.5?'bdg-amber':'bdg-indigo')}>{p.strength}</span></td>
                      <td><span className={'bdg '+((p.direction||'').includes('Pos')?'bdg-emerald':'bdg-rose')}>{p.direction}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
