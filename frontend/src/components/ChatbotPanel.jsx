import React, { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Send, Bot, User, Loader, Copy, Check, BarChart2, TrendingUp, Hash, Table, AlertCircle } from 'lucide-react'

var API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

var SUGGESTIONS = [
  { text:'What is the average of each column?',     icon:'📊' },
  { text:'Show me the top 10 by highest value',     icon:'🏆' },
  { text:'What is the correlation between columns?', icon:'🔗' },
  { text:'Is there a trend in the data?',            icon:'📈' },
  { text:'Show distribution of [column name]',       icon:'📉' },
  { text:'Count records by category',               icon:'🔢' },
  { text:'What are the outliers?',                  icon:'⚠️' },
  { text:'Create measures for all numeric columns', icon:'📐' },
  { text:'Describe the dataset schema',             icon:'🗂️' },
  { text:'Compare values by group',                 icon:'↔️' },
]

function CodeBlock({ code }) {
  var [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code).then(function(){ setCopied(true); setTimeout(function(){ setCopied(false) },2000) })
  }
  return (
    <div style={{position:'relative',background:'#1e1b2e',borderRadius:8,padding:'.75rem 1rem',marginTop:8}}>
      <button onClick={copy} style={{position:'absolute',top:6,right:8,background:'none',border:'none',cursor:'pointer',color:'#8b8fa8',display:'flex',alignItems:'center',gap:4,fontSize:'.68rem'}}>
        {copied?<Check size={12} color="#22c55e"/>:<Copy size={12}/>}{copied?'Copied':'Copy'}
      </button>
      <code style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.73rem',color:'#a5b4fc',display:'block',paddingRight:60,overflowX:'auto',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
        {code}
      </code>
    </div>
  )
}

function ResultBlock({ result }) {
  if (!result) return null
  var r = result

  if (r.type === 'single_value' || r.type === 'count') {
    return (
      <div style={{marginTop:8}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'1.8rem',color:'var(--indigo)',marginBottom:4}}>
          {typeof r.value === 'number' ? r.value.toLocaleString(undefined,{maximumFractionDigits:4}) : r.summary}
        </div>
        {r.context && <div style={{fontSize:'.75rem',color:'var(--ink3)'}}>{r.context}</div>}
      </div>
    )
  }

  if (r.type === 'grouped_bar' || r.type === 'comparison' || r.type === 'ranking' || r.type === 'count') {
    var rows = r.table || (r.chart_data && r.chart_data.data) || []
    return (
      <div style={{marginTop:8}}>
        {r.top_result && <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--indigo)',marginBottom:6}}>🏆 Top: {r.top_result}</div>}
        <div style={{maxHeight:220,overflowY:'auto',border:'1px solid var(--border)',borderRadius:9}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.78rem'}}>
            <thead>
              <tr style={{background:'var(--bg)'}}>
                {Object.keys(rows[0]||{}).map(function(k){ return <th key={k} style={{padding:'7px 12px',textAlign:'left',fontWeight:700,fontSize:'.68rem',textTransform:'uppercase',letterSpacing:'.06em',color:'var(--indigo)',borderBottom:'1px solid var(--border)',fontFamily:'var(--font-mono)'}}>{k}</th> })}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0,20).map(function(row,i){
                return (
                  <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                    {Object.entries(row).map(function(entry,j){
                      var k=entry[0]; var v=entry[1]
                      return <td key={k} style={{padding:'7px 12px',color:j===0?'var(--ink)':'var(--ink2)',fontWeight:j===0?600:400,fontFamily:'var(--font-mono)',fontSize:'.77rem'}}>
                        {typeof v==='number'?v.toLocaleString(undefined,{maximumFractionDigits:3}):String(v)}
                      </td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (r.type === 'correlation') {
    return (
      <div style={{marginTop:8,maxHeight:220,overflowY:'auto',border:'1px solid var(--border)',borderRadius:9}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.78rem'}}>
          <thead>
            <tr style={{background:'var(--bg)'}}>
              {['Column A','Column B','r','R²','Strength'].map(function(h){ return <th key={h} style={{padding:'7px 12px',textAlign:'left',fontSize:'.68rem',fontWeight:700,textTransform:'uppercase',color:'var(--indigo)',borderBottom:'1px solid var(--border)',fontFamily:'var(--font-mono)'}}>{h}</th> })}
            </tr>
          </thead>
          <tbody>
            {(r.pairs||[]).slice(0,12).map(function(p,i){
              var a=Math.abs(p.r); var color=a>=.7?'var(--indigo)':a>=.4?'var(--amber)':'var(--ink3)'
              return (
                <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:'7px 12px',color:'var(--ink)',fontWeight:600,fontFamily:'var(--font-mono)',fontSize:'.76rem'}}>{p.col1}</td>
                  <td style={{padding:'7px 12px',color:'var(--ink)',fontFamily:'var(--font-mono)',fontSize:'.76rem'}}>{p.col2}</td>
                  <td style={{padding:'7px 12px',color,fontWeight:700,fontFamily:'var(--font-mono)',fontSize:'.76rem'}}>{p.r.toFixed(4)}</td>
                  <td style={{padding:'7px 12px',fontFamily:'var(--font-mono)',fontSize:'.76rem'}}>{p.r2.toFixed(4)}</td>
                  <td style={{padding:'7px 12px'}}><span style={{background:a>=.7?'var(--indigo-light)':a>=.4?'var(--amber-light)':'var(--bg)',color:a>=.7?'var(--indigo)':a>=.4?'var(--amber)':'var(--ink3)',padding:'2px 8px',borderRadius:99,fontSize:'.66rem',fontWeight:700,border:'1px solid '+(a>=.7?'var(--indigo-mid)':'var(--border)')}}>{p.strength}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  if (r.type === 'distribution' && r.stats) {
    return (
      <div style={{marginTop:8,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:6}}>
        {Object.entries(r.stats).map(function(entry){
          var k=entry[0]; var v=entry[1]
          return (
            <div key={k} style={{background:'var(--bg)',borderRadius:9,padding:'7px 10px',border:'1px solid var(--border)',textAlign:'center'}}>
              <div style={{fontSize:'.62rem',color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.06em',fontFamily:'var(--font-mono)'}}>{k}</div>
              <div style={{fontWeight:700,fontSize:'.85rem',color:'var(--ink)',marginTop:2,fontFamily:'var(--font-mono)'}}>{typeof v==='number'?v.toLocaleString(undefined,{maximumFractionDigits:3}):v}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (r.type === 'trend') {
    return (
      <div style={{marginTop:8}}>
        <div style={{fontSize:'1.4rem',fontFamily:'var(--font-display)',fontWeight:900,color:r.trend&&r.trend.includes('↗')?'var(--emerald)':'var(--rose)',marginBottom:8}}>
          {r.trend}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:6,marginBottom:10}}>
          {[['Slope',r.slope&&r.slope.toFixed?r.slope.toFixed(6):r.slope],['R²',r.r2&&r.r2.toFixed?r.r2.toFixed(4):r.r2],['p-value',r.p_value&&r.p_value.toFixed?r.p_value.toFixed(6):r.p_value],['Significant?',r.significant?'✅ Yes':'⚠️ No']].map(function(item){
            return (
              <div key={item[0]} style={{background:'var(--bg)',borderRadius:9,padding:'7px 10px',border:'1px solid var(--border)',textAlign:'center'}}>
                <div style={{fontSize:'.62rem',color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.06em',fontFamily:'var(--font-mono)'}}>{item[0]}</div>
                <div style={{fontWeight:700,fontFamily:'var(--font-mono)',fontSize:'.82rem',marginTop:2}}>{item[1]}</div>
              </div>
            )
          })}
        </div>
        <div style={{fontSize:'.79rem',color:'var(--ink3)',fontStyle:'italic'}}>{r.interpretation}</div>
      </div>
    )
  }

  if (r.type === 'measures') {
    return (
      <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
        {(r.measures||[]).map(function(m,i){
          return (
            <div key={i} style={{background:'var(--bg)',borderRadius:9,padding:'8px 12px',border:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:'.8rem',color:'var(--ink)'}}>{m.name}</div>
                <div style={{fontSize:'.71rem',color:'var(--indigo)',fontFamily:'var(--font-mono)',marginTop:2}}>{m.dax}</div>
              </div>
              {m.value !== null && m.value !== undefined && (
                <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'1.1rem',color:'var(--indigo)',flexShrink:0}}>
                  {typeof m.value==='number'?m.value.toLocaleString(undefined,{maximumFractionDigits:2}):m.value}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (r.type === 'overview') {
    return (
      <div style={{marginTop:8}}>
        <div style={{fontSize:'.83rem',color:'var(--ink2)',marginBottom:8}}>{r.summary}</div>
        {(r.quick_stats||[]).map(function(s,i){
          return (
            <div key={i} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid var(--border)',fontSize:'.79rem'}}>
              <span style={{fontWeight:700,color:'var(--ink)',minWidth:120}}>{s.column}</span>
              <span style={{color:'var(--indigo)'}}>avg {s.mean}</span>
              <span style={{color:'var(--emerald)'}}>min {s.min}</span>
              <span style={{color:'var(--coral)'}}>max {s.max}</span>
            </div>
          )
        })}
        {r.hint && <div style={{marginTop:8,fontSize:'.77rem',color:'var(--ink4)',background:'var(--bg)',borderRadius:8,padding:'8px 10px',border:'1px solid var(--border)'}}>{r.hint}</div>}
      </div>
    )
  }

  return r.summary ? <div style={{marginTop:6,fontSize:'.82rem',color:'var(--ink2)'}}>{r.summary}</div> : null
}

export default function ChatbotPanel({ label, numCols, catCols }) {
  var [messages, setMessages] = useState([{
    role:'bot',
    text:'Hi! I can answer questions about your data and build custom measures — only using real computed values. Try asking:',
    result:null, steps:null,
  }])
  var [input, setInput]   = useState('')
  var [loading, setLoad]  = useState(false)
  var bottomRef           = useRef(null)

  useEffect(function(){ if (bottomRef.current) bottomRef.current.scrollIntoView({behavior:'smooth'}) },[messages])

  var send = useCallback(async function(q) {
    q = (q || input).trim()
    if (!q || loading) return
    setInput('')
    setMessages(function(prev){ return prev.concat([{role:'user',text:q,result:null,steps:null}]) })
    setLoad(true)
    try {
      var res = await axios.post(API+'/api/chat', {question:q, label:label||null},{timeout:30000})
      var data = res.data
      setMessages(function(prev){
        return prev.concat([{
          role:'bot',
          text: data.summary || 'Here are the results:',
          result: data,
          steps: data.steps,
          code: data.measure_code,
          confidence: data.confidence,
        }])
      })
    } catch(err) {
      setMessages(function(prev){ return prev.concat([{role:'bot',text:'Error: '+(err.message||'Request failed'),result:null}]) })
    } finally { setLoad(false) }
  }, [input, loading, label])

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'.9rem'}}>
      {/* Info */}
      <div style={{background:'var(--indigo-light)',border:'1px solid var(--indigo-mid)',borderRadius:'var(--r)',padding:'.9rem 1.1rem',fontSize:'.8rem',color:'var(--ink2)',lineHeight:1.7}}>
        <strong style={{color:'var(--indigo)'}}>🔒 Strict Mode:</strong> Every answer is computed from actual data — no guesses.
        Available: <span style={{color:'var(--indigo)',fontFamily:'var(--font-mono)'}}>{(numCols||[]).join(', ')}</span>
        {(catCols||[]).length>0&&<span>, <span style={{color:'var(--teal)',fontFamily:'var(--font-mono)'}}>{(catCols||[]).join(', ')}</span></span>}
      </div>

      {/* Suggestion chips */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {SUGGESTIONS.slice(0,6).map(function(s,i){
          return (
            <button key={i} className="suggest-chip" onClick={function(){ send(s.text) }}>
              {s.icon} {s.text}
            </button>
          )
        })}
      </div>

      {/* Chat window */}
      <div className="query-messages">
        <div style={{padding:'1rem',display:'flex',flexDirection:'column',gap:'.9rem'}}>
          {messages.map(function(msg,i){
            var isUser = msg.role==='user'
            return (
              <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',flexDirection:isUser?'row-reverse':'row'}}>
                <div className="q-avatar">{isUser?'U':'AI'}</div>
                <div style={{maxWidth:'82%',display:'flex',flexDirection:'column',gap:5}}>
                  <div className={'q-bubble'+(isUser?' ':'')}>
                    <div style={{fontSize:'.84rem',lineHeight:1.65,color:isUser?'#fff':'var(--ink)'}}>{msg.text}</div>
                    {!isUser && msg.result && <ResultBlock result={msg.result}/>}
                    {!isUser && msg.code && <CodeBlock code={msg.code}/>}
                  </div>
                  {/* Steps trace */}
                  {!isUser && msg.steps && msg.steps.length > 0 && (
                    <details style={{cursor:'pointer'}}>
                      <summary style={{fontSize:'.68rem',color:'var(--ink4)',fontFamily:'var(--font-mono)',userSelect:'none',padding:'2px 4px'}}>
                        🔍 See computation steps ({msg.steps.length})
                      </summary>
                      <div style={{background:'var(--bg)',borderRadius:8,padding:'.6rem .8rem',border:'1px solid var(--border)',marginTop:4}}>
                        {msg.steps.map(function(step,si){
                          return <div key={si} style={{fontSize:'.71rem',color:'var(--ink3)',padding:'1px 0',fontFamily:'var(--font-mono)'}}>{si+1}. {step}</div>
                        })}
                      </div>
                    </details>
                  )}
                  {!isUser && msg.confidence && (
                    <span className={'bdg '+(msg.confidence==='high'?'bdg-emerald':msg.confidence==='medium'?'bdg-amber':'bdg-rose')} style={{fontSize:'.62rem',alignSelf:'flex-start'}}>
                      Confidence: {msg.confidence}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          {loading && (
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <div className="q-avatar">AI</div>
              <div className="q-bubble" style={{display:'flex',gap:8,alignItems:'center'}}>
                <Loader size={13} color="var(--indigo)" style={{animation:'spin 1s linear infinite'}}/>
                <span style={{fontSize:'.82rem',color:'var(--ink3)'}}>Computing from data…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      </div>

      {/* Input */}
      <div style={{display:'flex',gap:8}}>
        <input value={input} onChange={function(e){ setInput(e.target.value) }}
          onKeyDown={function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send() } }}
          placeholder="Ask: 'Average GPA by class', 'Top 10 winners', 'Create measures'…"
          style={{flex:1,background:'#fff',border:'1.5px solid var(--border2)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--ink)',fontSize:'.88rem',fontFamily:'var(--font-body)',outline:'none',transition:'border-color .2s',boxShadow:'var(--shadow-xs)'}}
          onFocus={function(e){ e.target.style.borderColor='var(--indigo)' }}
          onBlur={function(e){ e.target.style.borderColor='var(--border2)' }}
          disabled={loading}/>
        <button className="btn btn-primary" onClick={function(){ send() }} disabled={loading||!input.trim()}>
          <Send size={15}/> Ask
        </button>
      </div>
    </div>
  )
}
