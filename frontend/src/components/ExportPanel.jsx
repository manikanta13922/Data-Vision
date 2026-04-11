import React, { useState } from 'react'
import { FileSpreadsheet, FileText, Download, Database, CheckCircle } from 'lucide-react'

var API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ExportPanel({ onDownload }) {
  var [downloading, setDownloading] = useState(null)

  async function downloadCleaned(fmt) {
    setDownloading('cleaned-'+fmt)
    try {
      var res = await fetch(API+'/api/export/cleaned-data?fmt='+fmt)
      if (!res.ok) throw new Error('Server error: '+(await res.text()))
      var blob = await res.blob()
      var ext  = fmt==='csv' ? 'csv' : 'xlsx'
      var today = new Date().toISOString().slice(0,10)
      var url = URL.createObjectURL(blob)
      var a = document.createElement('a')
      a.href=url; a.download='DataVision_CleanedData_'+today+'.'+ext; a.click()
      URL.revokeObjectURL(url)
    } catch(e) { alert('Download failed: '+e.message) }
    finally { setDownloading(null) }
  }

  return (
    <div className="card">
      <div className="card-hdr">
        <div>
          <div className="card-title">📤 Export & Download</div>
          <div className="card-sub">All exports contain real computed data · dated filenames · open directly in Excel / Power BI / Python</div>
        </div>
      </div>

      {/* Report exports */}
      <div className="exp-grid">
        {[
          {icon:FileSpreadsheet,title:'Power BI Export (.xlsx)',color:'var(--indigo)',cls:'btn-primary',label:'Download Power BI',type:'powerbi',
           chips:['Raw Data','Statistics','Correlations','Insights Guide'],
           desc:'Multi-sheet Excel for Power BI Desktop. Raw data + statistics + correlations + step-by-step PBI guide. Just open in Power BI → Get Data → Excel.'},
          {icon:FileText,title:'PDF Report (.pdf)',color:'var(--violet)',cls:'btn-outline',label:'Download PDF',type:'pdf',
           chips:['A4 Format','Print Ready','Shareable'],
           desc:'Professional A4 PDF with KPI summary, statistics table, prioritised insights, and correlation summary. Ready to email or present.'},
        ].map(function(item) {
          var Icon=item.icon
          return (
            <div key={item.type} className="exp-card">
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:38,height:38,borderRadius:10,background:'rgba(79,70,229,.08)',display:'flex',alignItems:'center',justifyContent:'center',color:item.color,flexShrink:0}}>
                  <Icon size={19}/>
                </div>
                <h4 style={{color:item.color}}>{item.title}</h4>
              </div>
              <p>{item.desc}</p>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {item.chips.map(function(c){ return <span key={c} className="chip chip-indigo" style={{fontSize:'.65rem'}}>{c}</span> })}
              </div>
              <button className={'btn '+item.cls} onClick={function(){ onDownload(item.type) }}>
                <Download size={14}/>{item.label}
              </button>
            </div>
          )
        })}
      </div>

      {/* Cleaned data download */}
      <div style={{marginTop:'1.25rem',background:'var(--emerald-light)',border:'1.5px solid #a7f3d0',borderRadius:'var(--r)',padding:'1.25rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'1rem'}}>
          <Database size={18} color="var(--emerald)"/>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'.95rem',color:'var(--emerald)'}}>
              Download Cleaned Dataset
            </div>
            <div style={{fontSize:'.76rem',color:'var(--ink3)',marginTop:1}}>
              The joined, cleaned, deduplicated data with all computed columns (Cost, Profit, Profit%) — ready for Python, R, or Power BI
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-green" onClick={function(){ downloadCleaned('excel') }} disabled={downloading==='cleaned-excel'}
            style={{padding:'8px 16px',fontSize:'.82rem'}}>
            <FileSpreadsheet size={14}/>
            {downloading==='cleaned-excel'?'Downloading…':'Download as Excel (.xlsx)'}
          </button>
          <button className="btn btn-outline" onClick={function(){ downloadCleaned('csv') }} disabled={downloading==='cleaned-csv'}
            style={{padding:'8px 16px',fontSize:'.82rem'}}>
            <Download size={14}/>
            {downloading==='cleaned-csv'?'Downloading…':'Download as CSV (.csv)'}
          </button>
        </div>
        <div style={{marginTop:'.75rem',fontSize:'.74rem',color:'var(--ink3)',display:'flex',gap:12,flexWrap:'wrap'}}>
          {['Duplicates removed','Nulls imputed','IDs excluded','Profit computed','Fact+Dim joined'].map(function(t){
            return <span key={t} style={{display:'flex',alignItems:'center',gap:4}}><CheckCircle size={11} color="var(--emerald)"/>{t}</span>
          })}
        </div>
      </div>

      {/* Power BI tip */}
      <div style={{marginTop:'1rem',padding:'.9rem 1.1rem',background:'var(--amber-light)',border:'1px solid #fde68a',borderRadius:'var(--r-sm)',fontSize:'.8rem',color:'var(--amber)',lineHeight:1.65}}>
        <strong>💡 Opening in Power BI Desktop:</strong> Download Power BI Export → Open Power BI Desktop → Get Data → Excel Workbook → select file → check ✅ Data + ✅ Statistics sheets → Load → Start building visuals. The "Guide" sheet has step-by-step DAX measures.
      </div>
    </div>
  )
}
