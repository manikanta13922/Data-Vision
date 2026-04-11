import React from 'react'
import { Wifi, WifiOff, Activity, AlertTriangle, CheckCircle, Loader } from 'lucide-react'

export default function RealTimeBar({ connected, lastEvent, wsEvents, isAnalyzing }) {
  var progEvents = (wsEvents||[]).filter(function(e){ return e.type==='progress' })
  var latest = progEvents.length>0 ? progEvents[progEvents.length-1] : null
  var pct = latest ? (latest.pct||0) : 0

  return (
    <div className="rt-bar" style={{bottom:isAnalyzing||true?0:undefined,zIndex:300}}>
      <div style={{display:'flex',alignItems:'center',gap:6,color:connected?'var(--emerald)':'var(--rose)',flexShrink:0}}>
        {connected?<Wifi size={12}/>:<WifiOff size={12}/>}
        <span>{connected?'WebSocket Live':'Reconnecting…'}</span>
      </div>
      <div style={{width:1,height:13,background:'var(--border)',flexShrink:0}}/>
      {isAnalyzing&&latest?(
        <div style={{display:'flex',alignItems:'center',gap:9,flex:1}}>
          <Loader size={12} color="var(--indigo)" style={{animation:'spin 1s linear infinite',flexShrink:0}}/>
          <span style={{color:'var(--indigo)',fontSize:'.72rem'}}>{latest.message||'Analysing…'}</span>
          <div className="rt-progress"><div className="rt-progress-fill" style={{width:pct+'%'}}/></div>
          <span style={{color:'var(--ink4)'}}>{pct}%</span>
        </div>
      ):lastEvent&&lastEvent.type==='done'?(
        <div style={{display:'flex',alignItems:'center',gap:5,color:'var(--emerald)'}}>
          <CheckCircle size={12}/><span>Analysis complete — all insights validated</span>
        </div>
      ):lastEvent&&lastEvent.type==='blocked'?(
        <div style={{display:'flex',alignItems:'center',gap:5,color:'var(--rose)'}}>
          <AlertTriangle size={12}/><span>{lastEvent.reason}</span>
        </div>
      ):(
        <div style={{display:'flex',alignItems:'center',gap:5,color:'var(--ink4)'}}>
          <Activity size={12}/><span>Ready</span>
        </div>
      )}
      {(wsEvents||[]).length>0&&<span style={{color:'var(--ink4)',flexShrink:0,marginLeft:'auto'}}>{wsEvents.length} events</span>}
    </div>
  )
}
