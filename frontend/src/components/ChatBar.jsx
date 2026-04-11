import React, { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { MessageCircle, Send, X, ChevronDown, Bot, Copy, Check, Loader, Sparkles, RefreshCw } from 'lucide-react'

var API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

var QUICK_ACTIONS = [
  {q:'Summary statistics for all columns',         icon:'📊'},
  {q:'Top 10 by highest value',                    icon:'🏆'},
  {q:'What are the correlations?',                  icon:'🔗'},
  {q:'Create all Power BI DAX measures',            icon:'📐'},
  {q:'Show me the outliers',                        icon:'⚠️'},
  {q:'Distribution analysis',                       icon:'📉'},
  {q:'Count records by each category',              icon:'🔢'},
  {q:'Trend analysis',                              icon:'📈'},
]

function num(v,d) { d=d||2; if(v===null||v===undefined)return '—'; var n=Number(v); return isNaN(n)?String(v):n.toLocaleString(undefined,{maximumFractionDigits:d}) }

function ResultDisplay({ r }) {
  if (!r) return null

  if (r.type==='single_value'||r.type==='count'&&r.value!==undefined) {
    return (
      <div style={{marginTop:8,padding:'12px 16px',background:'rgba(79,70,229,.06)',borderRadius:12,border:'1px solid rgba(79,70,229,.15)'}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'1.8rem',color:'var(--indigo)'}}>{typeof r.value==='number'?r.value.toLocaleString(undefined,{maximumFractionDigits:4}):r.summary}</div>
        {r.context&&<div style={{fontSize:'.73rem',color:'var(--ink3)',marginTop:3}}>{r.context}</div>}
      </div>
    )
  }

  if (r.type==='trend') {
    return (
      <div style={{marginTop:8}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'1.2rem',color:r.trend&&r.trend.includes('↗')?'var(--emerald)':'var(--rose)',marginBottom:5}}>{r.trend}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:5,marginBottom:6}}>
          {[['Slope',r.slope&&r.slope.toFixed?r.slope.toFixed(6):r.slope],['R²',r.r2&&r.r2.toFixed?r.r2.toFixed(4):r.r2],['p-value',r.p_value&&r.p_value.toFixed?r.p_value.toFixed(6):r.p_value],['Significant',r.significant?'✅ Yes':'⚠️ No']].map(function(item){
            return <div key={item[0]} style={{background:'var(--bg)',borderRadius:8,padding:'6px 9px',border:'1px solid var(--border)',textAlign:'center'}}><div style={{fontSize:'.6rem',color:'var(--ink4)',textTransform:'uppercase',fontFamily:'var(--font-mono)'}}>{item[0]}</div><div style={{fontWeight:700,fontFamily:'var(--font-mono)',fontSize:'.8rem',marginTop:1}}>{item[1]}</div></div>
          })}
        </div>
        {r.interpretation&&<div style={{fontSize:'.77rem',color:'var(--ink3)',fontStyle:'italic'}}>{r.interpretation}</div>}
        {r.forecast&&r.forecast.length>0&&(
          <div style={{marginTop:6}}>
            <div style={{fontSize:'.68rem',color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4,fontFamily:'var(--font-mono)'}}>5-Step Forecast</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {r.forecast.map(function(f,i){return<div key={i} style={{background:'rgba(79,70,229,.06)',border:'1px solid rgba(79,70,229,.15)',borderRadius:7,padding:'4px 9px',fontSize:'.72rem',fontFamily:'var(--font-mono)',color:'var(--indigo)'}}>{f.step}: {num(f.value)}</div>})}
            </div>
          </div>
        )}
      </div>
    )
  }

  if ((r.table||r.pairs||r.measures)&&(r.table||r.pairs||r.measures).length>0) {
    var rows = r.table || []
    var measures = r.measures || []
    var pairs = r.pairs || []

    if (measures.length>0) {
      return (
        <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:5}}>
          {measures.slice(0,10).map(function(m,i){
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 11px',background:'var(--amber-light)',borderRadius:9,border:'1px solid #fde68a'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:'.8rem',color:'var(--ink)'}}>{m.name}</div>
                  <div style={{fontFamily:'var(--font-mono)',color:'var(--amber)',fontSize:'.68rem',marginTop:1}}>{m.dax}</div>
                </div>
                {m.value!==null&&m.value!==undefined&&<div style={{fontFamily:'var(--font-display)',fontWeight:900,color:'var(--amber)',fontSize:'1rem',flexShrink:0}}>{num(m.value)}</div>}
              </div>
            )
          })}
        </div>
      )
    }

    if (pairs.length>0) {
      return (
        <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:4}}>
          {pairs.slice(0,8).map(function(p,i){
            var a=Math.abs(p.r)
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 9px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}}>
                <span style={{fontWeight:600,fontSize:'.78rem',color:'var(--ink)',flex:1}}>{p.col1} ↔ {p.col2}</span>
                <span style={{fontWeight:800,fontFamily:'var(--font-mono)',color:a>=.7?'var(--indigo)':a>=.4?'var(--amber)':'var(--ink3)',fontSize:'.8rem'}}>{p.r.toFixed(3)}</span>
                <span style={{background:a>=.7?'var(--indigo-light)':a>=.4?'var(--amber-light)':'var(--bg2)',color:a>=.7?'var(--indigo)':a>=.4?'var(--amber)':'var(--ink3)',padding:'1px 7px',borderRadius:99,fontSize:'.63rem',fontWeight:700,border:'1px solid '+(a>=.7?'var(--indigo-mid)':'var(--border)')}}>{p.strength}</span>
              </div>
            )
          })}
        </div>
      )
    }

    if (rows.length>0) {
      return (
        <div style={{marginTop:8,maxHeight:220,overflowY:'auto',border:'1px solid var(--border)',borderRadius:10}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.77rem'}}>
            <thead>
              <tr style={{background:'var(--bg)',position:'sticky',top:0}}>
                {Object.keys(rows[0]).map(function(k){return<th key={k} style={{padding:'6px 10px',textAlign:'left',fontWeight:700,fontSize:'.65rem',textTransform:'uppercase',color:'var(--indigo)',borderBottom:'1px solid var(--border)',fontFamily:'var(--font-mono)',whiteSpace:'nowrap'}}>{k}</th>})}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0,20).map(function(row,i){
                return (
                  <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'rgba(79,70,229,.02)'}}>
                    {Object.entries(row).map(function(e,j){
                      return <td key={e[0]} style={{padding:'6px 10px',color:j===0?'var(--ink)':'var(--ink2)',fontFamily:'var(--font-mono)',fontWeight:j===0?600:400}}>
                        {typeof e[1]==='number'?e[1].toLocaleString(undefined,{maximumFractionDigits:3}):String(e[1])}
                      </td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length>20&&<div style={{padding:'6px 10px',background:'var(--bg)',fontSize:'.72rem',color:'var(--ink4)',borderTop:'1px solid var(--border)',textAlign:'center'}}>Showing 20 of {rows.length} rows</div>}
        </div>
      )
    }
  }

  if (r.type==='distribution'&&r.stats) {
    return (
      <div style={{marginTop:8,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(95px,1fr))',gap:5}}>
        {Object.entries(r.stats).map(function(e){
          return (
            <div key={e[0]} style={{background:'var(--bg)',borderRadius:9,padding:'6px 8px',border:'1px solid var(--border)',textAlign:'center'}}>
              <div style={{fontSize:'.6rem',color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.05em',fontFamily:'var(--font-mono)'}}>{e[0]}</div>
              <div style={{fontWeight:700,fontSize:'.82rem',color:'var(--ink)',marginTop:1,fontFamily:'var(--font-mono)'}}>{typeof e[1]==='number'?e[1].toLocaleString(undefined,{maximumFractionDigits:3}):e[1]}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (r.type==='overview'&&r.quick_stats) {
    return (
      <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:4}}>
        {r.quick_stats.map(function(s,i){
          return (
            <div key={i} style={{display:'flex',gap:10,padding:'5px 8px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)',fontSize:'.78rem',alignItems:'center'}}>
              <span style={{fontWeight:700,color:'var(--ink)',minWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.column}</span>
              <span style={{color:'var(--indigo)',fontFamily:'var(--font-mono)'}}>avg {num(s.mean)}</span>
              <span style={{color:'var(--emerald)',fontFamily:'var(--font-mono)'}}>min {num(s.min)}</span>
              <span style={{color:'var(--coral)',fontFamily:'var(--font-mono)'}}>max {num(s.max)}</span>
              <span style={{color:'var(--ink4)',fontFamily:'var(--font-mono)',marginLeft:'auto'}}>n={s.count&&s.count.toLocaleString()}</span>
            </div>
          )
        })}
        {r.hint&&<div style={{marginTop:6,fontSize:'.74rem',color:'var(--ink4)',background:'var(--bg)',borderRadius:8,padding:'8px 10px',border:'1px solid var(--border)',lineHeight:1.5}}>{r.hint}</div>}
      </div>
    )
  }

  return r.summary?<div style={{marginTop:5,fontSize:'.81rem',color:'var(--ink2)',lineHeight:1.6}}>{r.summary}</div>:null
}

function CodeSnip({ code }) {
  var [cp, setCp] = useState(false)
  return (
    <div style={{position:'relative',background:'#1e1b2e',borderRadius:8,padding:'8px 12px',marginTop:6}}>
      <button onClick={function(){navigator.clipboard.writeText(code);setCp(true);setTimeout(function(){setCp(false)},1500)}}
        style={{position:'absolute',top:5,right:8,background:'none',border:'none',cursor:'pointer',color:'#8b8fa8',fontSize:'.67rem',display:'flex',alignItems:'center',gap:3}}>
        {cp?<Check size={11} color="#22c55e"/>:<Copy size={11}/>}{cp?'Copied':'Copy'}
      </button>
      <code style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.7rem',color:'#a5b4fc',display:'block',paddingRight:55,overflowX:'auto',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{code}</code>
    </div>
  )
}

export default function ChatBar({ label, numCols, catCols }) {
  var [open,    setOpen]    = useState(false)
  var [msgs,    setMsgs]    = useState([])
  var [input,   setInput]   = useState('')
  var [loading, setLoading] = useState(false)
  var bottomRef = useRef(null)

  useEffect(function(){ if(open&&bottomRef.current) bottomRef.current.scrollIntoView({behavior:'smooth'}) },[msgs,open])

  var send = useCallback(async function(q) {
    q=(q||input).trim(); if(!q||loading) return
    setInput(''); if(!open) setOpen(true)
    setMsgs(function(p){ return p.concat([{role:'user',text:q}]) })
    setLoading(true)
    try {
      var res = await axios.post(API+'/api/chat',{question:q,label:label||null},{timeout:45000})
      var d = res.data
      setMsgs(function(p){ return p.concat([{role:'bot',text:d.summary||(d.type==='error'?'❌ '+d.summary:'Here are the results:'),result:d,code:d.measure_code,confidence:d.confidence,steps:d.steps}]) })
    } catch(e) {
      setMsgs(function(p){ return p.concat([{role:'bot',text:'Error: '+(e.response&&e.response.data&&e.response.data.detail||e.message),result:null}]) })
    } finally { setLoading(false) }
  }, [input,loading,label,open])

  var clearChat = useCallback(function() { setMsgs([]) }, [])

  return (
    <div style={{position:'fixed',bottom:34,left:0,right:0,zIndex:400,pointerEvents:'none'}}>
      <div style={{maxWidth:1680,margin:'0 auto',padding:'0 2rem',display:'flex',flexDirection:'column',alignItems:'stretch',pointerEvents:'auto'}}>

        {/* ── Chat window ── */}
        {open && (
          <div style={{
            background:'var(--bg3)',border:'1.5px solid var(--border)',
            borderRadius:'16px 16px 0 0',
            boxShadow:'0 -8px 40px rgba(0,0,0,.1), 0 -2px 8px rgba(0,0,0,.06)',
            display:'flex',flexDirection:'column',maxHeight:420,
          }}>
            {/* Header */}
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'.65rem 1rem',borderBottom:'1px solid var(--border)',background:'rgba(79,70,229,.03)',borderRadius:'16px 16px 0 0'}}>
              <div style={{width:26,height:26,borderRadius:7,background:'var(--indigo)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Sparkles size={13} color="#fff"/>
              </div>
              <span style={{fontWeight:700,fontSize:'.85rem',color:'var(--indigo)',flex:1}}>Data Analyst AI</span>
              <span style={{fontSize:'.7rem',color:'var(--ink3)',fontFamily:'var(--font-mono)'}}>
                {(numCols||[]).length} numeric · {(catCols||[]).length} categorical
              </span>
              {msgs.length>0&&(
                <button onClick={clearChat} style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink4)',padding:2,display:'flex',alignItems:'center',gap:3,fontSize:'.7rem'}}>
                  <RefreshCw size={11}/> Clear
                </button>
              )}
              <button onClick={function(){setOpen(false)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink3)',padding:2,display:'flex'}}>
                <X size={15}/>
              </button>
            </div>

            {/* Quick actions (only when no messages) */}
            {msgs.length===0&&(
              <div style={{padding:'.75rem 1rem',borderBottom:'1px solid var(--border)',background:'var(--bg4)'}}>
                <div style={{fontSize:'.68rem',color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,fontFamily:'var(--font-mono)'}}>Quick actions</div>
                <div style={{display:'flex',gap:6,overflowX:'auto',flexWrap:'nowrap',paddingBottom:2}}>
                  {QUICK_ACTIONS.map(function(qa,i){
                    return (
                      <button key={i} onClick={function(){send(qa.q)}}
                        style={{background:'#fff',border:'1px solid var(--border)',borderRadius:99,padding:'4px 11px',fontSize:'.72rem',color:'var(--ink3)',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,transition:'all .15s',display:'flex',alignItems:'center',gap:4}}
                        onMouseEnter={function(e){e.currentTarget.style.borderColor='var(--indigo)';e.currentTarget.style.color='var(--indigo)'}}
                        onMouseLeave={function(e){e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--ink3)'}}>
                        <span style={{fontSize:'.9em'}}>{qa.icon}</span>{qa.q}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{flex:1,overflowY:'auto',padding:'.75rem 1rem',display:'flex',flexDirection:'column',gap:'.7rem'}}>
              {msgs.map(function(m,i){
                var isUser=m.role==='user'
                return (
                  <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',flexDirection:isUser?'row-reverse':'row'}}>
                    <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.68rem',fontWeight:800,
                      background:isUser?'var(--indigo)':'var(--teal-light)',
                      color:isUser?'#fff':'var(--teal)',
                      border:isUser?'none':'1px solid #99f6e4',
                    }}>
                      {isUser?'You':'AI'}
                    </div>
                    <div style={{maxWidth:'85%',display:'flex',flexDirection:'column',gap:4}}>
                      <div style={{
                        background:isUser?'var(--indigo)':'#fff',
                        border:isUser?'none':'1px solid var(--border)',
                        borderRadius:isUser?'12px 12px 4px 12px':'12px 12px 12px 4px',
                        padding:'8px 12px',fontSize:'.83rem',color:isUser?'#fff':'var(--ink)',lineHeight:1.6,
                        boxShadow:'var(--shadow-xs)',
                      }}>
                        {m.text}
                        {!isUser&&m.result&&<ResultDisplay r={m.result}/>}
                        {!isUser&&m.code&&<CodeSnip code={m.code}/>}
                      </div>
                      {!isUser&&m.steps&&m.steps.length>0&&(
                        <details style={{cursor:'pointer'}}>
                          <summary style={{fontSize:'.66rem',color:'var(--ink4)',fontFamily:'var(--font-mono)',userSelect:'none',padding:'2px 4px'}}>
                            🔍 How was this computed? ({m.steps.length} steps)
                          </summary>
                          <div style={{background:'var(--bg)',borderRadius:8,padding:'.5rem .75rem',border:'1px solid var(--border)',marginTop:3}}>
                            {m.steps.map(function(s,si){return<div key={si} style={{fontSize:'.68rem',color:'var(--ink3)',fontFamily:'var(--font-mono)',padding:'1px 0'}}>{si+1}. {s}</div>})}
                          </div>
                        </details>
                      )}
                      {!isUser&&m.confidence&&(
                        <span className={'bdg '+(m.confidence==='high'?'bdg-emerald':m.confidence==='medium'?'bdg-amber':'bdg-rose')} style={{fontSize:'.6rem',alignSelf:'flex-start'}}>
                          Confidence: {m.confidence}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {loading&&(
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:'var(--teal-light)',border:'1px solid #99f6e4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.68rem',fontWeight:800,color:'var(--teal)'}}>AI</div>
                  <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'12px 12px 12px 4px',padding:'8px 12px',display:'flex',gap:8,alignItems:'center',boxShadow:'var(--shadow-xs)'}}>
                    <Loader size={12} color="var(--indigo)" style={{animation:'spin 1s linear infinite'}}/>
                    <span style={{fontSize:'.8rem',color:'var(--ink3)'}}>Computing from your actual data…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>
          </div>
        )}

        {/* ── Input bar (always visible) ── */}
        <div style={{
          background:'var(--bg3)',
          border:'1.5px solid '+(open?'var(--indigo)':'var(--border)'),
          borderRadius: open ? '0 0 14px 14px' : 14,
          padding:'.55rem .9rem',
          display:'flex',alignItems:'center',gap:8,
          boxShadow: open ? 'none' : '0 4px 20px rgba(0,0,0,.07)',
          transition:'all .2s',
        }}>
          <button onClick={function(){setOpen(function(o){return !o})}}
            style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,var(--indigo),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer',flexShrink:0,boxShadow:'0 2px 8px rgba(79,70,229,.3)'}}>
            <Sparkles size={15} color="#fff"/>
          </button>
          <input
            value={input}
            onChange={function(e){ setInput(e.target.value); if(!open&&e.target.value) setOpen(true) }}
            onKeyDown={function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send() } }}
            placeholder='Ask your data: "Average runs by team", "Create DAX measures", "Top 10 batsmen"…'
            style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:'.85rem',color:'var(--ink)',fontFamily:'var(--font-body)'}}
            disabled={loading}
          />
          {input&&(
            <button className="btn btn-primary" onClick={function(){send()}} disabled={loading}
              style={{padding:'6px 14px',fontSize:'.8rem',flexShrink:0}}>
              {loading?<Loader size={13} style={{animation:'spin 1s linear infinite'}}/>:<Send size={13}/>}
              Ask
            </button>
          )}
          {!input&&(
            <span style={{fontSize:'.72rem',color:'var(--ink4)',flexShrink:0,fontFamily:'var(--font-mono)'}}>
              {(numCols||[]).length > 0 ? (numCols||[]).length+' numeric columns ready' : 'Upload data to start'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
