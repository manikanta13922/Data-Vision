import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Send, Bot, User, Loader, BarChart2, Table2, TrendingUp, AlertCircle, Info } from 'lucide-react'

var API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

var SUGGESTIONS = [
  'What is the average of each numeric column?',
  'Show distribution of [column name]',
  'What are the top 5 categories in [column]?',
  'Is there a trend in [column]?',
  'What is the correlation between columns?',
  'Show me outliers in the dataset',
  'How many records are in each category?',
  'What columns does this dataset have?',
  'What is the maximum [column]?',
  'Show me total sum of [column] by [category]',
]

function ResultDisplay({ result }) {
  if (!result) return null
  var r = result.result
  if (!r) return null

  if (r.type === 'grouped_table' || r.type === 'count') {
    return (
      <div style={{marginTop:'.75rem'}}>
        <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--blue)',marginBottom:'.5rem'}}>{r.summary}</div>
        {r.top_result && <div style={{fontSize:'.85rem',color:'var(--gold)',marginBottom:'.5rem',fontFamily:'var(--mono)'}}>🏆 Top: {r.top_result}</div>}
        {r.table && (
          <div className="tbl-wrap" style={{maxHeight:280,overflowY:'auto'}}>
            <table className="tbl">
              <thead><tr><th>Group / Value</th><th>Result</th></tr></thead>
              <tbody>
                {r.table.map(function(row, i) {
                  return (
                    <tr key={i}>
                      <td style={{color:'var(--text)'}}>{row.group || row.value}</td>
                      <td style={{color:'var(--blue)',fontWeight:700,fontFamily:'var(--mono)'}}>
                        {typeof row.value === 'number' ? row.value.toLocaleString(undefined,{maximumFractionDigits:3}) : row.value}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (r.type === 'single_value') {
    return (
      <div style={{marginTop:'.75rem'}}>
        <div style={{fontSize:'1.5rem',fontWeight:800,color:'var(--blue)',fontFamily:'var(--display)',marginBottom:4}}>
          {typeof r.value === 'number' ? r.value.toLocaleString(undefined,{maximumFractionDigits:4}) : r.value}
        </div>
        <div style={{fontSize:'.8rem',color:'var(--text3)'}}>{r.context}</div>
      </div>
    )
  }

  if (r.type === 'distribution') {
    return (
      <div style={{marginTop:'.75rem'}}>
        <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--blue)',marginBottom:'.6rem'}}>{r.summary}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:6}}>
          {Object.entries(r.stats||{}).map(function(entry) {
            var k = entry[0]; var v = entry[1]
            return (
              <div key={k} style={{background:'var(--bg2)',borderRadius:8,padding:'6px 10px',textAlign:'center'}}>
                <div style={{fontSize:'.62rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',fontFamily:'var(--mono)'}}>{k}</div>
                <div style={{fontSize:'.9rem',fontWeight:700,color:'var(--text)',fontFamily:'var(--mono)'}}>{typeof v==='number'?v.toLocaleString(undefined,{maximumFractionDigits:3}):v}</div>
              </div>
            )
          })}
        </div>
        {r.interpretation && <div style={{marginTop:'.6rem',fontSize:'.79rem',color:'var(--text2)',fontStyle:'italic'}}>{r.interpretation}</div>}
      </div>
    )
  }

  if (r.type === 'correlation') {
    return (
      <div style={{marginTop:'.75rem'}}>
        <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--blue)',marginBottom:'.6rem'}}>{r.summary}</div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Column A</th><th>Column B</th><th>r</th><th>R²</th><th>Strength</th></tr></thead>
            <tbody>
              {(r.pairs||[]).map(function(p, i) {
                var absR = Math.abs(p.r||0)
                return (
                  <tr key={i}>
                    <td style={{color:'var(--text)'}}>{p.col1}</td>
                    <td style={{color:'var(--text)'}}>{p.col2}</td>
                    <td style={{color:absR>=.7?'var(--green)':absR>=.4?'var(--gold)':'var(--text2)',fontWeight:700,fontFamily:'var(--mono)'}}>{(p.r||0).toFixed(4)}</td>
                    <td style={{fontFamily:'var(--mono)'}}>{(p.r2||0).toFixed(4)}</td>
                    <td><span className={'bdg ' + (absR>=.7?'bdg-green':absR>=.4?'bdg-gold':'bdg-blue')} style={{fontSize:'.63rem'}}>{p.strength||''}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (r.type === 'trend') {
    return (
      <div style={{marginTop:'.75rem'}}>
        <div style={{fontSize:'1.2rem',fontWeight:800,fontFamily:'var(--display)',color:r.trend_direction&&r.trend_direction.includes('↗')?'var(--green)':'var(--red)',marginBottom:8}}>
          {r.trend_direction}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:6,marginBottom:'.7rem'}}>
          {[
            {l:'Slope',v:r.slope&&r.slope.toFixed(6)},
            {l:'R²',v:r.r_squared&&r.r_squared.toFixed(4)},
            {l:'p-value',v:r.p_value&&r.p_value.toFixed(6)},
            {l:'Significant?',v:r.significant?'✅ Yes':'⚠️ No'},
          ].map(function(item) {
            return (
              <div key={item.l} style={{background:'var(--bg2)',borderRadius:8,padding:'6px 10px'}}>
                <div style={{fontSize:'.62rem',color:'var(--text3)',textTransform:'uppercase',fontFamily:'var(--mono)'}}>{item.l}</div>
                <div style={{fontWeight:700,fontFamily:'var(--mono)',fontSize:'.85rem'}}>{item.v}</div>
              </div>
            )
          })}
        </div>
        <div style={{fontSize:'.79rem',color:'var(--text2)',fontStyle:'italic'}}>{r.interpretation}</div>
      </div>
    )
  }

  if (r.type === 'overview') {
    return (
      <div style={{marginTop:'.75rem'}}>
        <div style={{fontSize:'.85rem',fontWeight:700,color:'var(--blue)',marginBottom:'.5rem'}}>{r.summary}</div>
        <div style={{marginBottom:'.5rem'}}>
          <span className="bdg bdg-blue" style={{marginRight:6}}>Numeric: {(r.numeric_columns||[]).join(', ')}</span>
        </div>
        <div style={{marginBottom:'.5rem'}}>
          <span className="bdg bdg-gold">Categorical: {(r.categorical_columns||[]).join(', ')}</span>
        </div>
      </div>
    )
  }

  // Generic fallback
  return (
    <div style={{marginTop:'.75rem',fontSize:'.82rem',color:'var(--text2)'}}>
      {r.summary && <div style={{fontWeight:700,color:'var(--text)',marginBottom:4}}>{r.summary}</div>}
      {r.note && <div style={{color:'var(--text3)',fontStyle:'italic'}}>{r.note}</div>}
    </div>
  )
}

export default function QueryPanel({ label, numCols, catCols }) {
  var [messages, setMessages] = useState([{
    role:'assistant',
    content:'I can answer questions about your data — but only from actual computed values. Ask me anything: averages, trends, distributions, correlations, or category counts.',
    result: null,
    steps: null,
  }])
  var [input, setInput] = useState('')
  var [loading, setLoading] = useState(false)
  var bottomRef = useRef(null)

  useEffect(function() {
    if (bottomRef.current) bottomRef.current.scrollIntoView({behavior:'smooth'})
  }, [messages])

  function handleSend(question) {
    var q = question || input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(function(prev) {
      return prev.concat([{role:'user',content:q,result:null,steps:null}])
    })
    setLoading(true)

    axios.post(API + '/api/query', {question: q, label: label})
      .then(function(res) {
        var data = res.data
        setMessages(function(prev) {
          return prev.concat([{
            role:'assistant',
            content: data.result && data.result.summary ? data.result.summary : 'Here are the results:',
            result: data,
            steps: data.steps,
            confidence: data.confidence,
            chart: data.chart_suggestion,
          }])
        })
      })
      .catch(function(err) {
        setMessages(function(prev) {
          return prev.concat([{
            role:'assistant',
            content: 'Error: ' + (err.response && err.response.data && err.response.data.detail ? err.response.data.detail : err.message),
            result: null, steps: null,
          }])
        })
      })
      .finally(function() { setLoading(false) })
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:0}}>
      {/* Info banner */}
      <div style={{background:'rgba(0,180,255,.06)',border:'1px solid rgba(0,180,255,.15)',borderRadius:'var(--r)',padding:'.9rem 1.1rem',marginBottom:'.9rem',fontSize:'.8rem',color:'var(--text2)',lineHeight:1.7}}>
        <strong style={{color:'var(--blue)'}}>🔒 Strict Mode:</strong> This query engine <strong>only</strong> uses actual computed data — it never guesses, assumes, or fabricates answers.
        Every result shows computation steps. Confidence level is always reported.
        Available columns: <span style={{color:'var(--cyan)',fontFamily:'var(--mono)'}}>{numCols.join(', ')}</span>
        {catCols.length > 0 && <span>, <span style={{color:'var(--gold)',fontFamily:'var(--mono)'}}>{catCols.join(', ')}</span></span>}
      </div>

      {/* Suggestion chips */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:'.9rem'}}>
        {SUGGESTIONS.slice(0,6).map(function(s, i) {
          return (
            <button key={i}
              onClick={function(){ handleSend(s) }}
              style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:20,padding:'4px 12px',fontSize:'.73rem',color:'var(--text2)',cursor:'pointer',transition:'all .2s',fontFamily:'var(--mono)'}}
              onMouseEnter={function(e){ e.target.style.borderColor='var(--blue)'; e.target.style.color='var(--blue)' }}
              onMouseLeave={function(e){ e.target.style.borderColor='var(--border)'; e.target.style.color='var(--text2)' }}>
              {s}
            </button>
          )
        })}
      </div>

      {/* Chat messages */}
      <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r)',minHeight:420,maxHeight:580,overflowY:'auto',display:'flex',flexDirection:'column',gap:0}}>
        <div style={{padding:'1rem',display:'flex',flexDirection:'column',gap:'1rem',flex:1}}>
          {messages.map(function(msg, i) {
            var isUser = msg.role==='user'
            return (
              <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',flexDirection:isUser?'row-reverse':'row'}}>
                <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                  background:isUser?'var(--blue-dim)':'var(--bg2)',border:'1px solid var(--border)'}}>
                  {isUser ? <User size={15} color="var(--blue)"/> : <Bot size={15} color="var(--gold)"/>}
                </div>
                <div style={{maxWidth:'80%',background:isUser?'rgba(0,180,255,.08)':'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'.75rem 1rem'}}>
                  <div style={{fontSize:'.84rem',color:'var(--text)',lineHeight:1.6}}>{msg.content}</div>

                  {/* Steps trace */}
                  {msg.steps && msg.steps.length > 0 && (
                    <div style={{marginTop:'.6rem',padding:'.6rem .8rem',background:'rgba(255,255,255,.03)',borderRadius:8,borderLeft:'2px solid var(--border)'}}>
                      <div style={{fontSize:'.65rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4,fontFamily:'var(--mono)'}}>Computation Steps</div>
                      {msg.steps.map(function(step, si) {
                        return <div key={si} style={{fontSize:'.73rem',color:'var(--text3)',padding:'1px 0',fontFamily:'var(--mono)'}}>{si+1}. {step}</div>
                      })}
                    </div>
                  )}

                  {/* Result display */}
                  {msg.result && <ResultDisplay result={msg.result}/>}

                  {/* Confidence badge */}
                  {msg.confidence && (
                    <div style={{display:'flex',gap:6,marginTop:'.5rem',alignItems:'center'}}>
                      <span className={'bdg ' + (msg.confidence==='high'?'bdg-green':msg.confidence==='medium'?'bdg-gold':'bdg-orange')} style={{fontSize:'.62rem'}}>
                        Confidence: {msg.confidence}
                      </span>
                      {msg.chart && msg.chart!=='none' && msg.chart!=='table' && (
                        <span className="bdg bdg-blue" style={{fontSize:'.62rem'}}>Suggested chart: {msg.chart}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {loading && (
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'var(--bg2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Bot size={15} color="var(--gold)"/>
              </div>
              <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'.75rem 1rem',display:'flex',gap:8,alignItems:'center'}}>
                <Loader size={14} color="var(--blue)" style={{animation:'spin 1s linear infinite'}}/>
                <span style={{fontSize:'.82rem',color:'var(--text2)'}}>Computing from data…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      </div>

      {/* Input area */}
      <div style={{display:'flex',gap:8,marginTop:'.75rem'}}>
        <input
          value={input}
          onChange={function(e){ setInput(e.target.value) }}
          onKeyDown={function(e){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend() } }}
          placeholder="Ask a data question — e.g. 'What is the average GPA by class?'"
          style={{flex:1,background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--text)',fontSize:'.88rem',fontFamily:'var(--sans)',outline:'none',transition:'border-color .2s'}}
          onFocus={function(e){ e.target.style.borderColor='var(--blue)' }}
          onBlur={function(e){ e.target.style.borderColor='var(--border2)' }}
          disabled={loading}
        />
        <button className="btn btn-blue" onClick={function(){ handleSend() }} disabled={loading || !input.trim()}>
          <Send size={15}/> Ask
        </button>
      </div>
    </div>
  )
}
