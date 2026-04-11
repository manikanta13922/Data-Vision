import React, { useState } from 'react'
import { ChevronRight, Download, FileSpreadsheet, FileText, Layers, Database } from 'lucide-react'
import Dashboard from './Dashboard.jsx'

var API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function MultiDashboard({ data, onDownload, onReset }) {
  var [active, setActive] = useState(0)
  var sheets = data.sheets || []

  // Per-sheet download — passes label as query param
  async function downloadSheet(type, label) {
    var ep = { excel:'/api/export/excel', pdf:'/api/export/pdf', powerbi:'/api/export/pbix-guide' }[type]
    var ext = type==='pdf'?'pdf':'xlsx'
    var encodedLabel = encodeURIComponent(label)
    try {
      var res = await fetch(API+ep+'?label='+encodedLabel)
      if (!res.ok) { var err=await res.json(); throw new Error(err.detail||'Export failed'); }
      var blob = await res.blob()
      var url  = URL.createObjectURL(blob)
      var a    = document.createElement('a')
      a.href = url
      a.download = 'DataVision_'+label.replace(/[^a-z0-9]/gi,'_').slice(0,30)+'_'+type+'.'+ext
      a.click()
      URL.revokeObjectURL(url)
    } catch(e) {
      alert('Export failed: '+e.message)
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>

      {/* ── Top summary bar ── */}
      <div style={{
        background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r)',
        padding:'1.25rem 1.5rem',boxShadow:'var(--shadow-sm)',
        position:'relative',overflow:'hidden',
      }}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,var(--indigo),var(--coral),var(--teal))'}}/>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'1rem',flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Layers size={18} color="var(--indigo)"/>
            <span style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'1.1rem',color:'var(--ink)'}}>
              {sheets.length} Files / Sheets Analysed
            </span>
          </div>
          <span className="bdg bdg-indigo">{data.metadata&&data.metadata.total_rows&&data.metadata.total_rows.toLocaleString()} total rows</span>
        </div>

        {/* Sheet pills */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {sheets.map(function(s,i){
            var meta = s.metadata||{}
            var isActive = active===i
            return (
              <button key={i} onClick={function(){ setActive(i) }}
                style={{
                  display:'flex',alignItems:'center',gap:7,
                  padding:'6px 14px',borderRadius:99,cursor:'pointer',
                  background:isActive?'var(--indigo)':'var(--bg)',
                  border:'1.5px solid '+(isActive?'var(--indigo)':'var(--border)'),
                  color:isActive?'#fff':'var(--ink2)',
                  fontWeight:isActive?700:500,fontSize:'.8rem',
                  transition:'all .18s',boxShadow:isActive?'0 2px 10px rgba(79,70,229,.3)':'none',
                }}>
                <Database size={12}/>{s.label||meta.label||'Sheet '+(i+1)}
                <span style={{fontSize:'.7rem',opacity:.75,fontFamily:'var(--font-mono)'}}>{(meta.rows||0).toLocaleString()}r</span>
                <ChevronRight size={11}/>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Per-sheet export buttons ── */}
      {sheets[active] && (function() {
        var s = sheets[active]
        var label = s.label || (s.metadata&&s.metadata.label) || 'Dataset'
        return (
          <div style={{
            background:'var(--bg3)',border:'1px solid var(--border)',
            borderRadius:'var(--r)',padding:'1rem 1.5rem',
            display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',
            boxShadow:'var(--shadow-xs)',
          }}>
            <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:'.9rem',color:'var(--ink)',display:'flex',alignItems:'center',gap:7}}>
              <Database size={14} color="var(--indigo)"/>Export: <em style={{fontStyle:'normal',color:'var(--indigo)'}}>{label}</em>
            </span>
            <div style={{display:'flex',gap:7,marginLeft:'auto',flexWrap:'wrap'}}>
              <button className="btn btn-primary" onClick={function(){ downloadSheet('powerbi',label) }} style={{padding:'7px 14px',fontSize:'.8rem'}}>
                <FileSpreadsheet size={13}/> Power BI
              </button>
              <button className="btn btn-teal" onClick={function(){ downloadSheet('excel',label) }} style={{padding:'7px 14px',fontSize:'.8rem'}}>
                <Download size={13}/> Excel
              </button>
              <button className="btn btn-ghost" onClick={function(){ downloadSheet('pdf',label) }} style={{padding:'7px 14px',fontSize:'.8rem'}}>
                <FileText size={13}/> PDF
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Active sheet dashboard ── */}
      {sheets[active] && (
        <Dashboard data={sheets[active]} onDownload={onDownload} onReset={onReset} embedded/>
      )}
    </div>
  )
}
