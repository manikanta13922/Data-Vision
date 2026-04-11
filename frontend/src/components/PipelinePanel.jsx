import React, { useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight,
         Eye, Wrench, ShieldCheck, Layers, Lightbulb, BarChart2, FileText, Zap, Link2 } from 'lucide-react'

var STEPS = [
  { id:'understanding', num:'01', label:'Data Understanding',     icon:Eye,         color:'var(--blue)' },
  { id:'cleaning',      num:'02', label:'Data Cleaning',          icon:Wrench,      color:'var(--gold)' },
  { id:'validation',    num:'03', label:'Data Validation',        icon:ShieldCheck, color:'var(--green)' },
  { id:'features',      num:'04', label:'Feature Engineering',    icon:Layers,      color:'var(--purple)' },
  { id:'insights',      num:'05', label:'Insight Generation',     icon:Lightbulb,   color:'var(--orange)' },
  { id:'viz_plan',      num:'06', label:'Visualization Plan',     icon:BarChart2,   color:'var(--cyan)' },
  { id:'report',        num:'07', label:'Report & Power BI',      icon:FileText,    color:'#ec4899' },
]

export default function PipelinePanel({ data }) {
  var [open, setOpen] = useState('understanding')
  var und  = data.understanding  || {}
  var log  = data.cleaning_log   || []
  var val  = data.validation     || {}
  var feat = data.features       || []
  var ins  = data.insights       || []
  var viz  = data.viz_plan       || []
  var rep  = data.report         || {}

  function toggle(id) { setOpen(function(o){ return o===id ? null : id }) }
  function Section({ id, children }) {
    return open===id ? (
      <div style={{padding:'1.25rem',borderTop:'1px solid var(--border)'}}>
        {children}
      </div>
    ) : null
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>

      {/* Executive Summary */}
      {rep.executive_summary && (
        <div className="card" style={{borderLeft:'3px solid var(--blue)'}}>
          <div style={{fontFamily:'var(--display)',fontWeight:800,fontSize:'1rem',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:8}}>
            <Zap size={16} color="var(--blue)"/>Executive Summary
          </div>
          <p style={{fontSize:'.87rem',color:'var(--text2)',lineHeight:1.75}}>{rep.executive_summary}</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:'1rem'}}>
            {[
              ['Data Quality', rep.data_quality_score, 'bdg-green'],
              ['Cleaning Steps', rep.cleaning_steps, 'bdg-gold'],
              ['Features Created', rep.features_created, 'bdg-purple'],
              ['High Insights', rep.insights_count && rep.insights_count.high, 'bdg-red'],
              ['Medium Insights', rep.insights_count && rep.insights_count.medium, 'bdg-orange'],
            ].map(function(item) {
              return item[1] !== undefined && item[1] !== null ? (
                <span key={item[0]} className={'bdg ' + item[2]} style={{fontSize:'.72rem'}}>
                  {item[0]}: {item[1]}
                </span>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* Step accordion */}
      {STEPS.map(function(step) {
        var Icon = step.icon
        var isOpen = open === step.id
        return (
          <div key={step.id} className="card" style={{padding:0,overflow:'hidden'}}>
            <button
              onClick={function(){ toggle(step.id) }}
              style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'1rem 1.25rem',background:'none',border:'none',cursor:'pointer',color:'var(--text)',textAlign:'left'}}>
              <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'1px solid var(--border)',color:step.color}}>
                <Icon size={16}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'var(--mono)',fontSize:'.65rem',color:'var(--text3)',letterSpacing:'.1em'}}>STEP {step.num}</div>
                <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'.95rem'}}>{step.label}</div>
              </div>
              {isOpen ? <ChevronDown size={16} color="var(--text3)"/> : <ChevronRight size={16} color="var(--text3)"/>}
            </button>

            {/* ── STEP 1: Understanding ── */}
            {step.id==='understanding' && isOpen && (
              <div style={{padding:'1.25rem',borderTop:'1px solid var(--border)'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'.75rem',marginBottom:'1rem'}}>
                  {[
                    {l:'Rows',v:(und.shape||{}).rows?.toLocaleString()},
                    {l:'Columns',v:(und.shape||{}).cols},
                    {l:'Numeric Cols',v:(und.numeric_cols||[]).length},
                    {l:'Categorical',v:(und.categorical_cols||[]).length},
                    {l:'Date Cols',v:(und.date_cols||[]).length},
                    {l:'ID Cols Excl.',v:(und.id_cols||[]).length},
                    {l:'Duplicates',v:und.duplicates},
                    {l:'Anomalies',v:(und.anomalies_detected||[]).length},
                  ].map(function(item) {
                    return (
                      <div key={item.l} style={{background:'var(--bg2)',borderRadius:8,padding:'.75rem',textAlign:'center'}}>
                        <div style={{fontSize:'.65rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em',fontFamily:'var(--mono)'}}>{item.l}</div>
                        <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'1.3rem',color:'var(--text)'}}>{item.v ?? '—'}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'.85rem',marginBottom:'.6rem',color:'var(--text2)'}}>Column Descriptions</div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead><tr><th>Column</th><th>Type</th><th>Description</th></tr></thead>
                    <tbody>
                      {Object.entries(und.column_descriptions||{}).map(function(entry) {
                        var col = entry[0]; var desc = entry[1]
                        var dtype = (und.data_types||{})[col] || ''
                        return (
                          <tr key={col}>
                            <td style={{color:'var(--text)',fontWeight:600}}>{col}</td>
                            <td><span className="bdg bdg-blue" style={{fontSize:'.62rem'}}>{dtype}</span></td>
                            <td style={{whiteSpace:'normal',fontSize:'.78rem',maxWidth:400,lineHeight:1.5}}>{desc}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {(und.anomalies_detected||[]).length > 0 && (
                  <div style={{marginTop:'1rem',padding:'.9rem 1rem',background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.2)',borderRadius:9}}>
                    <div style={{fontWeight:700,color:'var(--red)',marginBottom:6,fontSize:'.83rem'}}>⚠ Anomalies Detected</div>
                    {und.anomalies_detected.map(function(a, i) {
                      return <div key={i} style={{fontSize:'.79rem',color:'var(--text2)',padding:'2px 0'}}>{a}</div>
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Cleaning ── */}
            {step.id==='cleaning' && isOpen && (
              <div style={{padding:'1.25rem',borderTop:'1px solid var(--border)'}}>
                <div style={{fontSize:'.83rem',color:'var(--text2)',marginBottom:'1rem'}}>
                  {log.length} cleaning operation{log.length!==1?'s':''} performed — every decision is logged with justification:
                </div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead><tr><th>#</th><th>Operation</th><th>Column</th><th>Action Taken</th><th>Reason</th></tr></thead>
                    <tbody>
                      {log.map(function(entry, i) {
                        var isGood = !entry.step.toLowerCase().includes('flag')
                        return (
                          <tr key={i}>
                            <td>{i+1}</td>
                            <td><span className={'bdg ' + (isGood?'bdg-green':'bdg-orange')} style={{fontSize:'.63rem'}}>{entry.step}</span></td>
                            <td style={{fontFamily:'var(--mono)',fontSize:'.75rem',color:'var(--blue)'}}>{entry.column}</td>
                            <td style={{whiteSpace:'normal',fontSize:'.78rem',maxWidth:240,lineHeight:1.4}}>{entry.action}</td>
                            <td style={{whiteSpace:'normal',fontSize:'.76rem',color:'var(--text3)',maxWidth:220,lineHeight:1.4}}>{entry.reason}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── STEP 3: Validation ── */}
            {step.id==='validation' && isOpen && (
              <div style={{padding:'1.25rem',borderTop:'1px solid var(--border)'}}>
                <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap'}}>
                  <span className={'bdg ' + (val.overall==='CLEAN'?'bdg-green':'bdg-red')} style={{fontSize:'.75rem',padding:'4px 12px'}}>
                    Overall: {val.overall}
                  </span>
                  <span className="bdg bdg-green" style={{fontSize:'.72rem'}}>{(val.passed||[]).length} checks passed</span>
                  <span className="bdg bdg-orange" style={{fontSize:'.72rem'}}>{(val.warnings||[]).length} warnings</span>
                  <span className="bdg bdg-red" style={{fontSize:'.72rem'}}>{(val.failures||[]).length} failures</span>
                </div>
                {(val.failures||[]).length > 0 && (
                  <div style={{marginBottom:'.9rem'}}>
                    <div style={{fontWeight:700,color:'var(--red)',fontSize:'.82rem',marginBottom:5}}>❌ Failures</div>
                    {val.failures.map(function(f, i){ return <div key={i} style={{fontSize:'.79rem',color:'var(--red)',padding:'3px 0',fontFamily:'var(--mono)'}}>{f}</div> })}
                  </div>
                )}
                {(val.warnings||[]).length > 0 && (
                  <div style={{marginBottom:'.9rem'}}>
                    <div style={{fontWeight:700,color:'var(--orange)',fontSize:'.82rem',marginBottom:5}}>⚠ Warnings</div>
                    {val.warnings.map(function(w, i){ return <div key={i} style={{fontSize:'.79rem',color:'var(--orange)',padding:'3px 0'}}>{w}</div> })}
                  </div>
                )}
                {(val.passed||[]).slice(0,6).map(function(p, i){ return <div key={i} style={{fontSize:'.77rem',color:'var(--green)',padding:'2px 0',fontFamily:'var(--mono)'}}>{p}</div> })}
                {val.note && <div style={{marginTop:'.75rem',fontSize:'.76rem',color:'var(--text3)',fontStyle:'italic'}}>{val.note}</div>}
              </div>
            )}

            {/* ── STEP 4: Features ── */}
            {step.id==='features' && isOpen && (
              <div style={{padding:'1.25rem',borderTop:'1px solid var(--border)'}}>
                {feat.length === 0
                  ? <div style={{color:'var(--text3)',fontSize:'.83rem'}}>No feature engineering possible with current dataset structure.</div>
                  : (
                    <div className="tbl-wrap">
                      <table className="tbl">
                        <thead><tr><th>Feature Name</th><th>Type</th><th>Formula</th><th>Why It Is Useful</th></tr></thead>
                        <tbody>
                          {feat.map(function(f, i) {
                            return (
                              <tr key={i}>
                                <td style={{color:'var(--blue)',fontFamily:'var(--mono)',fontSize:'.78rem'}}>{f.name}</td>
                                <td><span className="bdg bdg-purple" style={{fontSize:'.62rem'}}>{f.type}</span></td>
                                <td style={{fontFamily:'var(--mono)',fontSize:'.73rem',whiteSpace:'normal',maxWidth:200}}>{f.formula}</td>
                                <td style={{whiteSpace:'normal',fontSize:'.78rem',color:'var(--text2)',maxWidth:260,lineHeight:1.4}}>{f.why}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </div>
            )}

            {/* ── STEP 5: Insights count ── */}
            {step.id==='insights' && isOpen && (
              <div style={{padding:'1.25rem',borderTop:'1px solid var(--border)'}}>
                <div style={{fontSize:'.83rem',color:'var(--text2)',marginBottom:'.75rem'}}>
                  {ins.length} insights generated from actual data patterns. Switch to the "Insights" tab for full detail.
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {['high','medium','low'].map(function(p) {
                    var count = ins.filter(function(i){ return i.priority===p }).length
                    return (
                      <div key={p} className={'kpi ' + (p==='high'?'red':p==='medium'?'gold':'green')} style={{flex:1,minWidth:120}}>
                        <div className="kpi-label">{p.toUpperCase()} Priority</div>
                        <div className="kpi-value">{count}</div>
                      </div>
                    )
                  })}
                </div>
                {ins.slice(0,4).map(function(ins_item, i) {
                  return (
                    <div key={i} style={{marginTop:'.7rem',padding:'.75rem',background:'var(--bg2)',borderRadius:9,borderLeft:'2px solid var(--border)'}}>
                      <div style={{fontWeight:700,fontSize:'.82rem',marginBottom:4}}>{ins_item.title}</div>
                      <div style={{fontSize:'.78rem',color:'var(--text2)',lineHeight:1.6}}>{ins_item.description}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── STEP 6: Viz Plan ── */}
            {step.id==='viz_plan' && isOpen && (
              <div style={{padding:'1.25rem',borderTop:'1px solid var(--border)'}}>
                <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
                  {viz.map(function(v, i) {
                    return (
                      <div key={i} style={{background:'var(--bg2)',borderRadius:9,padding:'.9rem',display:'flex',gap:'1rem',alignItems:'flex-start'}}>
                        <div style={{background:'var(--blue-dim)',borderRadius:8,padding:'6px 10px',fontSize:'.72rem',fontWeight:700,color:'var(--blue)',flexShrink:0,fontFamily:'var(--mono)',whiteSpace:'nowrap'}}>
                          {v.chart}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'.8rem',color:'var(--text)',marginBottom:4}}>
                            <strong>Columns:</strong> {v.columns}
                          </div>
                          <div style={{fontSize:'.78rem',color:'var(--text2)',marginBottom:3}}>
                            <strong>Why:</strong> {v.why}
                          </div>
                          <div style={{fontSize:'.74rem',color:'var(--red)'}}>
                            <strong>Avoid:</strong> {v.avoid}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 7: Report ── */}
            {step.id==='report' && isOpen && (
              <div style={{padding:'1.25rem',borderTop:'1px solid var(--border)'}}>
                {/* Key metrics */}
                {(rep.key_metrics_table||[]).length > 0 && (
                  <div style={{marginBottom:'1.25rem'}}>
                    <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'.88rem',marginBottom:'.6rem'}}>Key Metrics Table</div>
                    <div className="tbl-wrap">
                      <table className="tbl">
                        <thead><tr><th>Metric</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Range</th><th>Quality</th></tr></thead>
                        <tbody>
                          {rep.key_metrics_table.map(function(m, i) {
                            return (
                              <tr key={i}>
                                <td style={{color:'var(--text)'}}>{m.metric}</td>
                                <td style={{color:'var(--blue)',fontWeight:700}}>{m.mean}</td>
                                <td>{m.median}</td>
                                <td>{m.std}</td>
                                <td style={{fontFamily:'var(--mono)',fontSize:'.75rem'}}>{m.range}</td>
                                <td><span className={'bdg ' + (m.quality==='Normal'?'bdg-green':'bdg-orange')} style={{fontSize:'.63rem'}}>{m.quality}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Power BI measures */}
                {(rep.power_bi_measures||[]).length > 0 && (
                  <div style={{marginBottom:'1.25rem'}}>
                    <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'.88rem',marginBottom:'.6rem',display:'flex',alignItems:'center',gap:6}}>
                      <Link2 size={14} color="var(--gold)"/> Power BI DAX Measures
                    </div>
                    <div style={{background:'var(--bg2)',borderRadius:9,padding:'1rem',maxHeight:220,overflowY:'auto'}}>
                      {rep.power_bi_measures.map(function(m, i) {
                        return <div key={i} style={{fontFamily:'var(--mono)',fontSize:'.74rem',color:'var(--cyan)',padding:'2px 0'}}>{m}</div>
                      })}
                    </div>
                  </div>
                )}

                {/* Real-time readiness */}
                {rep.real_time_readiness && (
                  <div>
                    <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:'.88rem',marginBottom:'.6rem'}}>
                      ⚡ Real-Time & Power BI Readiness
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {Object.entries(rep.real_time_readiness).map(function(entry) {
                        var k = entry[0]; var v = entry[1]
                        return (
                          <div key={k} style={{background:'var(--bg2)',borderRadius:8,padding:'.7rem .9rem',display:'flex',gap:10,alignItems:'flex-start'}}>
                            <span style={{fontSize:'.68rem',fontWeight:700,color:'var(--blue)',minWidth:130,fontFamily:'var(--mono)',textTransform:'uppercase',flexShrink:0,paddingTop:2}}>{k.replace(/_/g,' ')}</span>
                            <span style={{fontSize:'.79rem',color:'var(--text2)',lineHeight:1.5}}>{v}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
