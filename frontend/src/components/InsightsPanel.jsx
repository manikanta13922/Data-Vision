import React, { useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, GitMerge, BarChart2, Award, ShieldCheck, Activity, Eye, AlertCircle } from 'lucide-react'

var ICONS = {'trending-up':TrendingUp,'trending-down':TrendingDown,'alert-triangle':AlertTriangle,'git-merge':GitMerge,'bar-chart-2':BarChart2,award:Award,'shield-check':ShieldCheck,activity:Activity,'alert-circle':AlertCircle}

function InsightCard({ ins, idx }) {
  var [showTrace, setShowTrace] = useState(false)
  var Icon = ICONS[ins.icon]||Activity
  var conf = ins.confidence||0
  var isLowRel = ins.low_reliability
  var confColor = conf>=80?'var(--emerald)':conf>=60?'var(--amber)':'var(--rose)'

  return (
    <div className={'ins-card '+(ins.priority||'low')} style={{animationDelay:idx*.04+'s'}}>
      <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
        <div className="ins-ico"><Icon size={17}/></div>
        <div style={{flex:1}}>
          <div style={{display:'flex',gap:6,marginBottom:5,flexWrap:'wrap',alignItems:'center'}}>
            <span className={'bdg '+(ins.priority==='high'?'bdg-rose':ins.priority==='medium'?'bdg-amber':'bdg-emerald')} style={{fontSize:'.63rem'}}>{(ins.priority||'low').toUpperCase()}</span>
            <span style={{fontSize:'.67rem',color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.07em'}}>{ins.type}</span>
            {isLowRel&&<span className="bdg bdg-amber" style={{fontSize:'.63rem'}}>⚠ LOW RELIABILITY</span>}
          </div>
          <div className="ins-title">{ins.title}</div>
        </div>
        {/* Confidence ring */}
        <div style={{flexShrink:0,textAlign:'center',background:'var(--bg)',border:'1.5px solid var(--border)',borderRadius:10,padding:'5px 10px',minWidth:54}}>
          <div style={{fontSize:'.6rem',color:'var(--ink4)',fontFamily:'var(--font-mono)'}}>CONF</div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'.95rem',color:confColor}}>{conf}%</div>
        </div>
      </div>

      <div className="ins-desc">{ins.insight}</div>

      {isLowRel&&(
        <div style={{background:'var(--amber-light)',border:'1px solid #fde68a',borderRadius:8,padding:'.65rem .9rem',fontSize:'.76rem',color:'var(--amber)'}}>
          ⚠ <strong>Low Reliability:</strong> Confidence {conf}% is below the 60% threshold. Increase dataset size or completeness for reliable conclusions.
        </div>
      )}

      {(ins.formula||ins.values||ins.calculation)&&(
        <div>
          <button onClick={function(){ setShowTrace(function(v){ return !v }) }}
            style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',color:'var(--ink3)',fontSize:'.73rem',fontFamily:'var(--font-mono)',padding:0}}>
            <Eye size={12}/>{showTrace?'Hide':'Show'} calculation ({ins.data_points_used} data points)
          </button>
          {showTrace&&(
            <div style={{marginTop:8,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:9,padding:'.9rem',display:'flex',flexDirection:'column',gap:8}}>
              {ins.formula&&(
                <div>
                  <div style={{fontSize:'.63rem',color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:3,fontFamily:'var(--font-mono)'}}>Formula</div>
                  <div style={{fontSize:'.78rem',color:'var(--indigo)',fontFamily:'var(--font-mono)'}}>{ins.formula}</div>
                </div>
              )}
              {ins.calculation&&(
                <div>
                  <div style={{fontSize:'.63rem',color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:3,fontFamily:'var(--font-mono)'}}>Exact Computation</div>
                  <div style={{fontSize:'.75rem',color:'var(--ink2)',fontFamily:'var(--font-mono)',wordBreak:'break-all'}}>{ins.calculation}</div>
                </div>
              )}
              {ins.values&&(
                <div>
                  <div style={{fontSize:'.63rem',color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5,fontFamily:'var(--font-mono)'}}>Values Used</div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    {Object.entries(ins.values).map(function(entry){
                      var k=entry[0]; var v=entry[1]
                      if (v===null||v===undefined) return null
                      if (Array.isArray(v)) return <span key={k} className="bdg bdg-indigo" style={{fontSize:'.64rem'}}>{k}: [{v.slice(0,3).join(', ')}]</span>
                      return <span key={k} className="bdg bdg-indigo" style={{fontSize:'.64rem'}}>{k}: {typeof v==='number'?v.toLocaleString(undefined,{maximumFractionDigits:4}):v}</span>
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function InsightsPanel({ insights, blocked_insights }) {
  var [filter, setFilter] = useState('all')
  var all = insights||[]; var blocked = blocked_insights||[]
  var filtered = filter==='all'?all:all.filter(function(i){ return i.priority===filter })
  var cnt = function(p){ return all.filter(function(i){ return i.priority===p }).length }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{color:'var(--ink3)',fontSize:'.83rem'}}>{all.length} validated insights · {blocked.length} blocked by statistical gates:</span>
        {['all','high','medium','low'].map(function(f){
          return (
            <button key={f} className={'tab '+(filter===f?'on':'')} onClick={function(){ setFilter(f) }} style={{padding:'5px 12px',fontSize:'.78rem'}}>
              {f==='all'?'All ('+all.length+')':f==='high'?'🔴 High ('+cnt('high')+')':f==='medium'?'🟡 Medium ('+cnt('medium')+')':'🟢 Low ('+cnt('low')+')'}
            </button>
          )
        })}
      </div>

      {blocked.length>0&&(
        <div style={{background:'var(--rose-light)',border:'1px solid #fecdd3',borderRadius:'var(--r)',padding:'1rem'}}>
          <div style={{fontWeight:700,color:'var(--rose)',fontSize:'.83rem',marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
            <AlertTriangle size={14}/> {blocked.length} insights BLOCKED — data did not meet statistical thresholds
          </div>
          <div style={{fontSize:'.77rem',color:'var(--ink3)',marginBottom:8}}>This is correct behavior — it prevents false conclusions. Each blocked insight shows exactly why.</div>
          {blocked.slice(0,6).map(function(b,i){
            return (
              <div key={i} style={{fontSize:'.73rem',color:'var(--ink3)',fontFamily:'var(--font-mono)',padding:'2px 0',display:'flex',gap:8}}>
                <span style={{color:'var(--rose)',flexShrink:0}}>BLOCKED</span>
                <span style={{color:'var(--ink4)'}}>[{b.type}{b.col?':'+b.col:b.cols?':'+b.cols:''}]</span>
                <span>{b.reason}</span>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length===0?(
        <div className="empty">
          <span style={{fontSize:'3rem'}}>🔍</span>
          <p>No insights passed strict validation with current data.</p>
          <p style={{fontSize:'.8rem',color:'var(--ink4)'}}>This means patterns exist but don't meet minimum thresholds — not a bug.</p>
        </div>
      ):(
        <div className="ins-grid">
          {filtered.map(function(ins,i){ return <InsightCard key={i} ins={ins} idx={i}/> })}
        </div>
      )}
    </div>
  )
}
