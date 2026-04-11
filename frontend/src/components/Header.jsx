import React from 'react'
import { BarChart3, RefreshCw, Wifi, WifiOff } from 'lucide-react'

export default function Header({ fileNames, hasData, onReset, wsConnected }) {
  var display = fileNames&&fileNames.length===1?fileNames[0]:fileNames&&fileNames.length>1?fileNames.length+' files':''
  return (
    <header className="hdr">
      <div className="hdr-logo">
        <div className="logo-box"><BarChart3 size={18} color="#fff" strokeWidth={2.5}/></div>
        <span className="logo-name">Data<span>Vision</span> Pro</span>
        <span className="version-badge">v6 · REAL-TIME</span>
      </div>
      <div className="hdr-right">
        {display && (
          <span style={{fontSize:'.77rem',color:'var(--ink3)',fontFamily:'var(--font-mono)',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            📂 {display}
          </span>
        )}
        {hasData && (
          <button className="btn btn-ghost" onClick={onReset} style={{padding:'6px 13px',fontSize:'.8rem'}}>
            <RefreshCw size={13}/> New Analysis
          </button>
        )}
        <div className={'ws-badge '+(wsConnected?'live':'dead')}>
          {wsConnected?<Wifi size={12}/>:<WifiOff size={12}/>}
          <div className="ws-dot"/>
          <span>{wsConnected?'WS Live':'Reconnecting'}</span>
        </div>
      </div>
    </header>
  )
}
