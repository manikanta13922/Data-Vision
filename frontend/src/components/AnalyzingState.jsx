import React from 'react'
import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react'

export default function AnalyzingState({ fileNames, wsEvents }) {
  var label = fileNames&&fileNames.length>1 ? fileNames.length+' files' : fileNames&&fileNames[0]||'data'

  return (
    <div className="analyzing">
      <div className="spin-wrap"><div className="spin-inner"/></div>
      <div style={{textAlign:'center',maxWidth:560}}>
        <h3 style={{fontFamily:'var(--display)',fontSize:'1.35rem',fontWeight:800,marginBottom:5}}>
          Analyzing <span style={{color:'var(--blue)'}}>{label}</span>
        </h3>
        <p style={{color:'var(--text2)',fontSize:'.86rem',marginBottom:'1.5rem'}}>
          Real-time zero-hallucination pipeline running — validation → cleaning → statistics → insights
        </p>

        {/* Live WebSocket event feed */}
        <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'1rem',textAlign:'left',maxHeight:300,overflowY:'auto'}}>
          <div style={{fontSize:'.65rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',fontFamily:"'JetBrains Mono',monospace",marginBottom:8}}>
            Live Pipeline Log
          </div>
          {wsEvents.length === 0 && (
            <div style={{fontSize:'.78rem',color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace",display:'flex',alignItems:'center',gap:6}}>
              <ArrowRight size={12}/> Connecting to analysis engine…
            </div>
          )}
          {wsEvents.map(function(ev, i) {
            var isLast = i === wsEvents.length-1
            var color = ev.type==='blocked'||ev.type==='error' ? 'var(--red)'
                      : ev.type==='done' ? 'var(--green)'
                      : isLast ? 'var(--blue)' : 'var(--text3)'
            var icon = ev.type==='blocked'||ev.type==='error' ? '❌'
                     : ev.type==='done' ? '✅'
                     : isLast ? '→' : '✓'
            return (
              <div key={i} style={{fontSize:'.76rem',fontFamily:"'JetBrains Mono',monospace",padding:'2px 0',color:color,display:'flex',gap:8,alignItems:'flex-start'}}>
                <span style={{flexShrink:0}}>{icon}</span>
                <span>{ev.message || ev.stage || JSON.stringify(ev)}</span>
                {ev.pct && ev.pct > 0 && isLast && (
                  <span style={{marginLeft:'auto',color:'var(--text3)',flexShrink:0}}>{ev.pct}%</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        {wsEvents.length > 0 && (function() {
          var progEvents = wsEvents.filter(function(e){ return e.type==='progress' })
          var pct = progEvents.length > 0 ? (progEvents[progEvents.length-1].pct||0) : 5
          return (
            <div style={{marginTop:'1rem'}}>
              <div style={{height:4,background:'var(--border)',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:2,background:'linear-gradient(90deg,var(--blue),var(--purple))',width:pct+'%',transition:'width .5s ease'}}/>
              </div>
              <div style={{fontSize:'.7rem',color:'var(--text3)',marginTop:4,fontFamily:"'JetBrains Mono',monospace",textAlign:'right'}}>{pct}%</div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
