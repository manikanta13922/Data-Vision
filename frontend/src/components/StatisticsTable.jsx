import React, { useState } from 'react'

var f = function(v,d) { d=d||3; if(v===null||v===undefined)return '—'; var n=Number(v); if(isNaN(n))return String(v); return n.toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:Math.min(d,2)}) }

export default function StatisticsTable({ statistics }) {
  var [sort, setSort] = useState({col:'mean',dir:1})
  if (!statistics||Object.keys(statistics).length===0)
    return <div className="empty"><span style={{fontSize:'3rem'}}>📉</span><p>No numeric columns found.</p></div>

  var cols = Object.keys(statistics)
  var sorted = cols.slice().sort(function(a,b){ var va=statistics[a][sort.col]||0,vb=statistics[b][sort.col]||0; return (Number(va)-Number(vb))*sort.dir })

  function Th({ field, label }) {
    return (
      <th onClick={function(){ setSort(function(s){ return {col:field,dir:s.col===field?-s.dir:1} }) }} title={'Sort by '+label}>
        {label}{sort.col===field?(sort.dir===1?' ↑':' ↓'):''}
      </th>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
      <div className="card">
        <div className="card-hdr">
          <div>
            <div className="card-title">📊 Complete Descriptive Statistics</div>
            <div className="card-sub">{cols.length} numeric columns · click any column header to sort · all values from real data</div>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Column</th>
                <Th field="count" label="Records"/><Th field="mean" label="Mean (Avg)"/><Th field="median" label="Median"/>
                <Th field="mode" label="Mode"/><Th field="std" label="Std Dev (Spread)"/><Th field="variance" label="Variance"/>
                <Th field="sem" label="Std Error"/><Th field="min" label="Min"/><Th field="max" label="Max"/>
                <Th field="range" label="Range"/><Th field="q1" label="Q1 (25%)"/><Th field="q3" label="Q3 (75%)"/>
                <Th field="iqr" label="IQR"/><Th field="skewness" label="Skewness"/><Th field="kurtosis" label="Kurtosis"/>
                <Th field="cv" label="CV%"/><Th field="sum" label="Sum"/>
                <th>P5</th><th>P95</th><th>P99</th><th>95% CI</th><th>Shape</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(function(col) {
                var s=statistics[col]; var skew=s.skewness||0; var kurt=s.kurtosis||0
                return (
                  <tr key={col}>
                    <td style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis'}} title={col}>{col}</td>
                    <td>{s.count&&s.count.toLocaleString()}</td>
                    <td style={{color:'var(--indigo)',fontWeight:700}}>{f(s.mean)}</td>
                    <td style={{color:'var(--teal)'}}>{f(s.median)}</td>
                    <td>{f(s.mode)}</td>
                    <td>{f(s.std)}</td><td>{f(s.variance)}</td><td>{f(s.sem,4)}</td>
                    <td style={{color:'var(--emerald)',fontWeight:600}}>{f(s.min)}</td>
                    <td style={{color:'var(--coral)',fontWeight:600}}>{f(s.max)}</td>
                    <td>{f(s.range)}</td><td>{f(s.q1)}</td><td>{f(s.q3)}</td><td>{f(s.iqr)}</td>
                    <td style={{color:Math.abs(skew)>1?'var(--amber)':'var(--ink3)',fontWeight:Math.abs(skew)>1?700:400}}>{f(s.skewness,4)}</td>
                    <td style={{color:Math.abs(kurt)>2?'var(--violet)':'var(--ink3)'}}>{f(s.kurtosis,4)}</td>
                    <td>{s.cv!==null&&s.cv!==undefined?f(s.cv,1)+'%':'—'}</td>
                    <td style={{fontWeight:600}}>{f(s.sum,2)}</td>
                    <td style={{color:'var(--ink4)'}}>{f(s.p5)}</td><td style={{color:'var(--ink4)'}}>{f(s.p95)}</td><td style={{color:'var(--ink4)'}}>{f(s.p99)}</td>
                    <td style={{whiteSpace:'nowrap',fontSize:'.7rem'}}>[{f(s.ci95_low,2)}, {f(s.ci95_high,2)}]</td>
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
    </div>
  )
}
