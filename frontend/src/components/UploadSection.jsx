import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File, Layers, ArrowRight, BarChart3, TrendingUp, GitMerge, Sparkles, Database, Zap, Brain } from 'lucide-react'

var ACCEPTED = {
  'text/csv':['.csv'],
  'application/vnd.ms-excel':['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'],
  'application/json':['.json'],
}

var FEATURES = [
  { icon:BarChart3, color:'#4f46e5', bg:'#ede9ff', title:'Full Statistical Report', desc:'Mean, median, std, IQR, skewness, kurtosis, CI, CV%, P5–P99 for every numeric column' },
  { icon:Database,  color:'#0d9488', bg:'#ccfbf1', title:'Star Schema Detection', desc:'Auto-joins Excel fact+dimension tables and computes real KPIs: Revenue, Profit, Margin%' },
  { icon:TrendingUp,color:'#f05a28', bg:'#fff0eb', title:'Trend Forecasting', desc:'Linear regression with 10-step ahead predictions and 95% confidence bands' },
  { icon:GitMerge,  color:'#7c3aed', bg:'#f3e8ff', title:'Multi-File Merger', desc:'Combine multiple CSVs/sheets into one dataset or analyse each separately' },
  { icon:Brain,     color:'#d97706', bg:'#fef3c7', title:'AI Data Chatbot', desc:'Ask "Average profit by country" — get real computed answers with copy-ready DAX code' },
]

export default function UploadSection({ onUpload }) {
  var [queued, setQueued] = useState([])
  var onDrop = useCallback(function(accepted) {
    setQueued(function(prev) {
      var names = new Set(prev.map(function(f){ return f.name }))
      return prev.concat(accepted.filter(function(f){ return !names.has(f.name) }))
    })
  }, [])
  var drop = useDropzone({ onDrop, accept:ACCEPTED, maxSize:200*1024*1024 })
  function remove(name) { setQueued(function(q){ return q.filter(function(f){ return f.name!==name }) }) }
  function sz(f) { return f.size>1024*1024?(f.size/1024/1024).toFixed(1)+'MB':(f.size/1024).toFixed(0)+'KB' }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f0c29 0%,#302b63 40%,#24243e 100%)',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>

      {/* Animated blobs */}
      <div style={{position:'absolute',top:-200,left:-200,width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(79,70,229,.4),transparent 70%)',animation:'pulse 6s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:-150,right:-150,width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(240,90,40,.3),transparent 70%)',animation:'pulse 8s ease-in-out infinite reverse',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:'40%',right:'10%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(13,148,136,.25),transparent 70%)',animation:'pulse 10s ease-in-out infinite',pointerEvents:'none'}}/>

      {/* Hero section */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4rem 1.5rem 2rem',textAlign:'center',position:'relative',zIndex:1}}>

        {/* Logo mark */}
        <div style={{width:80,height:80,borderRadius:24,background:'linear-gradient(135deg,#4f46e5,#f05a28)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 40px rgba(79,70,229,.5)',marginBottom:'1.5rem',animation:'scaleIn .6s ease both'}}>
          <BarChart3 size={38} color="#fff" strokeWidth={2}/>
        </div>

        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:99,padding:'5px 16px',fontSize:'.77rem',fontWeight:700,letterSpacing:'.07em',marginBottom:'1.25rem',color:'#a5b4fc',backdropFilter:'blur(8px)',animation:'fadeUp .5s ease both'}}>
          <Zap size={12}/> ZERO HALLUCINATION · REAL-TIME · STAR SCHEMA
        </div>

        <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:900,fontSize:'clamp(2.6rem,6vw,4.5rem)',lineHeight:1.06,color:'#fff',letterSpacing:'-.03em',marginBottom:'.9rem',animation:'fadeUp .6s ease both',maxWidth:720}}>
          What would you like<br/>
          <span style={{background:'linear-gradient(90deg,#818cf8,#f472b6,#f05a28)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            to analyse today?
          </span>
        </h1>

        <p style={{color:'rgba(255,255,255,.7)',fontSize:'1.1rem',lineHeight:1.7,marginBottom:'2.5rem',maxWidth:520,animation:'fadeUp .7s ease both'}}>
          Drop any CSV, Excel or JSON file and get a complete professional analysis with statistics, forecasts, correlations and Power BI-ready reports — instantly.
        </p>

        {/* Drop zone */}
        <div style={{width:'100%',maxWidth:580,animation:'fadeUp .8s ease both'}}>
          {queued.length === 0 ? (
            <div {...drop.getRootProps()}
              style={{
                border:'2px dashed rgba(255,255,255,.25)',
                borderRadius:20,padding:'2.5rem 2rem',cursor:'pointer',
                background:'rgba(255,255,255,.06)',backdropFilter:'blur(12px)',
                transition:'all .25s',
                boxShadow:'0 8px 32px rgba(0,0,0,.3)',
                ...(drop.isDragActive?{borderColor:'#818cf8',background:'rgba(79,70,229,.15)',transform:'scale(1.02)'}:{}),
              }}>
              <input {...drop.getInputProps()}/>
              <div style={{width:56,height:56,margin:'0 auto 1rem',background:'linear-gradient(135deg,rgba(79,70,229,.4),rgba(240,90,40,.3))',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,.2)'}}>
                <Upload size={24} color="#fff"/>
              </div>
              <h3 style={{color:'#fff',fontWeight:700,fontSize:'1.1rem',marginBottom:'.4rem'}}>{drop.isDragActive?'Drop here!':'Drop your data files here'}</h3>
              <p style={{color:'rgba(255,255,255,.55)',fontSize:'.88rem',marginBottom:'1rem'}}>or click to browse your computer</p>
              <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                {['CSV','.xlsx / .xls','JSON'].map(function(f){
                  return <span key={f} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:99,padding:'3px 12px',fontSize:'.72rem',color:'rgba(255,255,255,.8)',fontWeight:600}}>{f}</span>
                })}
              </div>
              <p style={{color:'rgba(255,255,255,.3)',fontSize:'.75rem',marginTop:'.75rem'}}>Multiple files supported · Up to 200MB per file</p>
            </div>
          ) : (
            <div style={{background:'rgba(255,255,255,.06)',backdropFilter:'blur(12px)',borderRadius:20,border:'1px solid rgba(255,255,255,.15)',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.3)'}}>
              <div style={{padding:'1rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
                <div style={{fontSize:'.74rem',fontWeight:700,color:'rgba(255,255,255,.5)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>
                  {queued.length} FILE{queued.length>1?'S':''} READY
                </div>
                {queued.map(function(f) {
                  return (
                    <div key={f.name} style={{display:'flex',alignItems:'center',gap:9,padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
                      <File size={15} color="#818cf8" style={{flexShrink:0}}/>
                      <span style={{flex:1,fontSize:'.83rem',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'rgba(255,255,255,.9)'}}>{f.name}</span>
                      <span style={{fontSize:'.71rem',color:'rgba(255,255,255,.4)',flexShrink:0,fontFamily:"'JetBrains Mono',monospace"}}>{sz(f)}</span>
                      <button onClick={function(e){e.stopPropagation();remove(f.name)}} style={{background:'none',border:'none',color:'rgba(255,255,255,.4)',cursor:'pointer',padding:2,display:'flex',flexShrink:0,lineHeight:1}}>
                        <X size={14}/>
                      </button>
                    </div>
                  )
                })}
              </div>
              <div style={{padding:'1rem 1.25rem',display:'flex',gap:8,alignItems:'center'}}>
                <div {...drop.getRootProps()} style={{cursor:'pointer'}}>
                  <input {...drop.getInputProps()}/>
                  <button style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:9,padding:'8px 14px',fontSize:'.8rem',color:'rgba(255,255,255,.8)',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:"'Outfit',sans-serif"}}>
                    <Upload size={13}/> Add more
                  </button>
                </div>
                <button onClick={function(){ onUpload(queued) }}
                  style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'11px',fontSize:'.95rem',fontWeight:700,borderRadius:12,background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',cursor:'pointer',boxShadow:'0 4px 20px rgba(79,70,229,.5)',transition:'all .2s',fontFamily:"'Outfit',sans-serif"}}>
                  <Sparkles size={16}/> Analyse {queued.length} file{queued.length>1?'s':''} <ArrowRight size={15}/>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Example questions */}
        <div style={{marginTop:'2rem',width:'100%',maxWidth:640,animation:'fadeUp .9s ease both'}}>
          <div style={{fontSize:'.72rem',color:'rgba(255,255,255,.35)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'.85rem'}}>
            EXAMPLE QUESTIONS YOU CAN ASK AFTER UPLOADING
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {['What is the average win by runs for each team?','Show top 10 batsmen by total runs','Find correlation between all numeric columns','Create Power BI measures for all columns','What are the outliers in this dataset?','Describe the schema of my data'].map(function(q,i){
              return (
                <div key={i} style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'8px 12px',fontSize:'.77rem',color:'rgba(255,255,255,.65)',display:'flex',alignItems:'flex-start',gap:7,lineHeight:1.45,backdropFilter:'blur(4px)',textAlign:'left'}}>
                  <Sparkles size={11} color="#818cf8" style={{flexShrink:0,marginTop:2}}/>
                  {q}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div style={{padding:'2rem',maxWidth:1100,margin:'0 auto',width:'100%',position:'relative',zIndex:1}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'1rem'}}>
          {FEATURES.map(function(f,i){
            var Icon=f.icon
            return (
              <div key={i} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:16,padding:'1.1rem',backdropFilter:'blur(8px)',transition:'all .25s',animation:'fadeUp .6s ease both',animationDelay:(i*.08)+'s',cursor:'default'}}
                onMouseEnter={function(e){e.currentTarget.style.background='rgba(255,255,255,.1)';e.currentTarget.style.transform='translateY(-3px)'}}
                onMouseLeave={function(e){e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.transform='translateY(0)'}}>
                <div style={{width:36,height:36,borderRadius:10,background:f.bg+'33',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'.75rem',border:'1px solid '+f.color+'44'}}>
                  <Icon size={17} color={f.color}/>
                </div>
                <div style={{fontWeight:700,fontSize:'.83rem',color:'#fff',marginBottom:'.3rem'}}>{f.title}</div>
                <div style={{fontSize:'.73rem',color:'rgba(255,255,255,.5)',lineHeight:1.5}}>{f.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer strip */}
      <div style={{borderTop:'1px solid rgba(255,255,255,.08)',padding:'.75rem 2rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'1.5rem',fontSize:'.73rem',color:'rgba(255,255,255,.3)',flexWrap:'wrap',position:'relative',zIndex:1}}>
        <span>CSV · Excel XLSX/XLS · JSON</span><span>·</span>
        <span>Multiple files</span><span>·</span>
        <span>Up to 200MB each</span><span>·</span>
        <span>All sheets auto-detected</span><span>·</span>
        <span>Star schema auto-joined</span>
      </div>
    </div>
  )
}
