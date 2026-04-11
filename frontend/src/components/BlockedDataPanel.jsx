import React from 'react'
import { ShieldOff, RefreshCw, AlertTriangle } from 'lucide-react'

export default function BlockedDataPanel({ data, onReset }) {
  var reason = data.stop_reason||'Data failed validation checks.'
  var trace  = data.pipeline_trace||[]
  var val    = data.validation||{}
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh',gap:'1.5rem',padding:'2rem'}}>
      <div className="blocked-panel">
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'1.25rem'}}>
          <div style={{width:48,height:48,borderRadius:12,background:'var(--rose-light)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'1.5px solid #fecdd3'}}>
            <ShieldOff size={24} color="var(--rose)"/>
          </div>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'1.2rem',color:'var(--rose)'}}>DATA NOT RELIABLE FOR ANALYSIS</div>
            <div style={{fontSize:'.8rem',color:'var(--ink3)',marginTop:2}}>Strict validation gate blocked analysis to prevent false insights</div>
          </div>
        </div>
        <div style={{background:'#fff',border:'1.5px solid #fecdd3',borderRadius:9,padding:'1rem',marginBottom:'1rem',borderLeft:'4px solid var(--rose)'}}>
          <div style={{fontSize:'.82rem',color:'var(--rose)',fontWeight:700,marginBottom:4}}>STOP REASON</div>
          <div style={{fontSize:'.82rem',color:'var(--ink2)',lineHeight:1.7,fontFamily:'var(--font-mono)'}}>{reason}</div>
        </div>
        {(val.failures||[]).length>0&&(
          <div style={{marginBottom:'.9rem'}}>
            <div style={{fontWeight:700,color:'var(--rose)',fontSize:'.8rem',marginBottom:6}}>❌ Validation Failures</div>
            {val.failures.map(function(f,i){ return <div key={i} style={{fontSize:'.77rem',color:'var(--rose)',padding:'2px 0',fontFamily:'var(--font-mono)'}}>{f}</div> })}
          </div>
        )}
        {(val.warnings||[]).length>0&&(
          <div style={{marginBottom:'.9rem'}}>
            <div style={{fontWeight:700,color:'var(--amber)',fontSize:'.8rem',marginBottom:6}}>⚠ Warnings</div>
            {val.warnings.map(function(w,i){ return <div key={i} style={{fontSize:'.77rem',color:'var(--amber)',padding:'2px 0'}}>{w}</div> })}
          </div>
        )}
        <div style={{background:'var(--bg)',borderRadius:9,padding:'.9rem',border:'1px solid var(--border)'}}>
          <div style={{fontSize:'.8rem',fontWeight:700,color:'var(--ink2)',marginBottom:8}}>How to fix:</div>
          {['Remove columns with >20% missing values or fill them','Ensure at least 5 rows of data exist','Fix type inconsistencies (numbers stored as text)','Remove constant columns (all same value)'].map(function(t,i){
            return <div key={i} style={{fontSize:'.77rem',color:'var(--ink3)',padding:'2px 0',display:'flex',gap:8}}><span style={{color:'var(--indigo)',flexShrink:0}}>{i+1}.</span><span>{t}</span></div>
          })}
        </div>
        {trace.length>0&&(
          <details style={{marginTop:'1rem',cursor:'pointer'}}>
            <summary style={{fontSize:'.78rem',color:'var(--ink3)',fontFamily:'var(--font-mono)',userSelect:'none'}}>📋 Show validation trace ({trace.length} steps)</summary>
            <div style={{marginTop:8,maxHeight:200,overflowY:'auto',background:'var(--bg)',borderRadius:8,padding:'.75rem',border:'1px solid var(--border)'}}>
              {trace.map(function(t,i){
                var color=t.status==='BLOCK'||t.status==='ERROR'?'var(--rose)':t.status==='WARN'?'var(--amber)':t.status==='PASS'?'var(--emerald)':'var(--ink3)'
                return <div key={i} style={{fontSize:'.7rem',fontFamily:'var(--font-mono)',padding:'2px 0',color}}>[{t.status}] {t.step}: {t.detail}</div>
              })}
            </div>
          </details>
        )}
      </div>
      <button className="btn btn-primary" onClick={onReset} style={{padding:'12px 24px',fontSize:'.9rem'}}>
        <RefreshCw size={16}/> Upload a Valid Dataset
      </button>
    </div>
  )
}
