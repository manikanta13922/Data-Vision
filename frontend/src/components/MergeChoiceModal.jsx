import React from 'react'
import { Layers, Grid, FileText, ChevronRight, X } from 'lucide-react'

export default function MergeChoiceModal({ scan, onChoice, onCancel }) {
  var sheets = scan.sheets || []
  var totalRows = sheets.reduce(function(s,sh){ return s+sh.rows },0)

  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      {/* Backdrop */}
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.4)',backdropFilter:'blur(4px)'}} onClick={onCancel}/>

      {/* Modal */}
      <div style={{position:'relative',background:'#fff',borderRadius:20,padding:'2rem',maxWidth:680,width:'100%',boxShadow:'0 24px 60px rgba(0,0,0,.18)',zIndex:1}}>
        {/* Close */}
        <button onClick={onCancel} style={{position:'absolute',top:16,right:16,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'50%',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--ink3)'}}>
          <X size={14}/>
        </button>

        <div style={{marginBottom:'1.5rem'}}>
          <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'1.35rem',color:'var(--ink)',marginBottom:6}}>
            Multiple Sheets Detected
          </div>
          <p style={{color:'var(--ink3)',fontSize:'.9rem',lineHeight:1.6}}>
            Found <strong>{sheets.length} sheets/files</strong> with <strong>{totalRows.toLocaleString()} total rows</strong>.
            How would you like to analyse them?
          </p>
        </div>

        {/* Sheet preview */}
        <div style={{background:'var(--bg)',borderRadius:12,padding:'1rem',marginBottom:'1.5rem',border:'1px solid var(--border)'}}>
          <div style={{fontSize:'.72rem',fontWeight:700,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8,fontFamily:'var(--font-mono)'}}>Detected Sheets</div>
          <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:160,overflowY:'auto'}}>
            {sheets.map(function(sh,i){
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'5px 8px',background:'#fff',borderRadius:8,border:'1px solid var(--border)'}}>
                  <FileText size={13} color="var(--indigo)"/>
                  <span style={{flex:1,fontSize:'.8rem',fontWeight:600,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sh.label}</span>
                  <span style={{fontSize:'.72rem',color:'var(--ink4)',fontFamily:'var(--font-mono)',flexShrink:0}}>{sh.rows.toLocaleString()} rows · {sh.columns} cols</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Choice cards */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
          {/* Combine */}
          <button onClick={function(){ onChoice('combined') }}
            style={{background:'var(--indigo-light)',border:'2px solid var(--indigo)',borderRadius:14,padding:'1.35rem',cursor:'pointer',textAlign:'left',transition:'all .2s'}}>
            <div style={{width:40,height:40,background:'var(--indigo)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
              <Layers size={20} color="#fff"/>
            </div>
            <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'1rem',color:'var(--indigo)',marginBottom:4}}>Combine into One</div>
            <p style={{fontSize:'.8rem',color:'var(--ink2)',lineHeight:1.55,margin:0}}>
              Merge all sheets into a single dataset. Best when sheets have the same structure (e.g., monthly reports).
              A <strong>_source</strong> column tracks which sheet each row came from.
            </p>
            <div style={{marginTop:10,display:'flex',alignItems:'center',gap:4,color:'var(--indigo)',fontSize:'.78rem',fontWeight:700}}>
              <span>Generate single dashboard</span><ChevronRight size={14}/>
            </div>
          </button>

          {/* Separate */}
          <button onClick={function(){ onChoice('separate') }}
            style={{background:'var(--teal-light)',border:'2px solid var(--teal)',borderRadius:14,padding:'1.35rem',cursor:'pointer',textAlign:'left',transition:'all .2s'}}>
            <div style={{width:40,height:40,background:'var(--teal)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
              <Grid size={20} color="#fff"/>
            </div>
            <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'1rem',color:'var(--teal)',marginBottom:4}}>Analyse Separately</div>
            <p style={{fontSize:'.8rem',color:'var(--ink2)',lineHeight:1.55,margin:0}}>
              Each sheet gets its own independent analysis and dashboard. Best when sheets have different structures or represent different entities.
            </p>
            <div style={{marginTop:10,display:'flex',alignItems:'center',gap:4,color:'var(--teal)',fontSize:'.78rem',fontWeight:700}}>
              <span>Generate {sheets.length} dashboards</span><ChevronRight size={14}/>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
