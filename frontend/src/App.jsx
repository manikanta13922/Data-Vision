import React, { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useWebSocket } from './hooks/useWebSocket.js'
import Header from './components/Header.jsx'
import UploadSection from './components/UploadSection.jsx'
import Dashboard from './components/Dashboard.jsx'
import MultiDashboard from './components/MultiDashboard.jsx'
import AnalyzingState from './components/AnalyzingState.jsx'
import BlockedDataPanel from './components/BlockedDataPanel.jsx'
import RealTimeBar from './components/RealTimeBar.jsx'
import MergeChoiceModal from './components/MergeChoiceModal.jsx'
import ChatBar from './components/ChatBar.jsx'

var API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  var [state, setState]      = useState('upload')
  var [data,  setData]       = useState(null)
  var [fileNames, setNames]  = useState([])
  var [wsProgress, setWsProg]= useState([])
  var [scanResult, setScan]  = useState(null)
  var [showMerge, setMerge]  = useState(false)

  // Chat bar state — available after dashboard
  var [chatLabel, setChatLabel] = useState(null)
  var [chatCols,  setChatCols]  = useState({ num:[], cat:[] })

  var ws = useWebSocket()

  useEffect(function() {
    var ev = ws.lastEvent; if (!ev) return
    if (ev.type==='blocked') { setState('blocked'); toast.error('❌ '+(ev.reason||'Data blocked')) }
    if (ev.type==='error')   { setState('upload');  toast.error('❌ '+(ev.message||'Error')) }
    if (ev.type==='progress') setWsProg(function(p){ return p.concat([ev]) })
  }, [ws.lastEvent])

  // ── Scan first ──────────────────────────────────────────────────────────
  var handleUpload = useCallback(async function(files) {
    setNames(files.map(function(f){return f.name}))
    var fd = new FormData()
    files.forEach(function(f){ fd.append('files',f) })
    try {
      var res = await axios.post(API+'/api/scan', fd, {headers:{'Content-Type':'multipart/form-data'},timeout:60000})
      var scan = res.data
      setScan({...scan, _files: files})
      if (scan.needs_choice) { setMerge(true) }
      else { await _runAnalysis(files, 'separate') }
    } catch(err) {
      toast.error('❌ '+(err.response&&err.response.data&&err.response.data.detail||err.message))
    }
  }, [])

  var handleChoice = useCallback(async function(mode) {
    setMerge(false)
    if (scanResult&&scanResult._files) await _runAnalysis(scanResult._files, mode)
  }, [scanResult])

  async function _runAnalysis(files, mode) {
    setState('analyzing'); setWsProg([])
    var fd = new FormData()
    files.forEach(function(f){ fd.append('files',f) })
    try {
      var res = await axios.post(API+'/api/analyze?mode='+mode, fd,
        {headers:{'Content-Type':'multipart/form-data'},timeout:300000})
      var result = res.data
      if (result.status==='BLOCKED') { setData(result); setState('blocked'); toast.error('❌ '+result.stop_reason); return }
      setData(result)
      setState('dashboard')

      // Set chat context
      var meta = result.multi ? (result.sheets&&result.sheets[0]&&result.sheets[0].metadata) : result.metadata
      if (meta) {
        setChatLabel(meta.label||null)
        setChatCols({num:meta.numeric_columns||[],cat:meta.categorical_columns||[]})
      }

      var rows  = result.multi ? result.metadata.total_rows : result.metadata.rows
      var valid = result.multi ? result.sheets.reduce(function(s,r){return s+(r.metadata&&r.metadata.insights_valid||0)},0):(result.metadata&&result.metadata.insights_valid||0)
      toast.success('✅ '+rows.toLocaleString()+' rows · '+valid+' insights validated')
    } catch(err) {
      setState('upload')
      toast.error('❌ '+(err.response&&err.response.data&&err.response.data.detail||err.message))
    }
  }

  var handleReset = useCallback(function() {
    setData(null); setNames([]); setState('upload'); setWsProg([]); setScan(null)
    setChatLabel(null); setChatCols({num:[],cat:[]})
  }, [])

  var handleDownload = useCallback(async function(type) {
    var ep  = {excel:'/api/export/excel',pdf:'/api/export/pdf',powerbi:'/api/export/pbix-guide'}[type]
    var lbl = {excel:'Excel Report',pdf:'PDF Report',powerbi:'Power BI File'}[type]
    var id  = toast.loading('⏳ Generating '+lbl+'…')
    try {
      var res = await axios.get(API+ep, {responseType:'blob',timeout:120000})
      var ext = type==='pdf'?'pdf':'xlsx'
      var url = URL.createObjectURL(res.data)
      var a = document.createElement('a')
      a.href=url; a.download='DataVision_'+type+'_'+new Date().toISOString().slice(0,10)+'.'+ext; a.click()
      URL.revokeObjectURL(url)
      toast.success('✅ '+lbl+' downloaded!',{id})
    } catch(err) {
      toast.error('❌ Export failed: '+(err.response&&err.response.status===500?'Server error — check backend terminal':err.message),{id})
    }
  }, [])

  var isDash = state==='dashboard'

  return (
    <div className="root">
      <Header fileNames={fileNames} hasData={isDash} onReset={handleReset} wsConnected={ws.connected}/>

      <main className="main" style={{
        padding: state==='upload' ? 0 : '2rem',
        paddingBottom: isDash ? '6rem' : (state==='upload' ? 0 : '2rem'),
        maxWidth: state==='upload' ? '100%' : 1680,
      }}>
        {state==='upload'    && <UploadSection onUpload={handleUpload}/>}
        {state==='analyzing' && <AnalyzingState fileNames={fileNames} wsEvents={wsProgress}/>}
        {state==='blocked'   && data && <BlockedDataPanel data={data} onReset={handleReset}/>}
        {state==='dashboard' && data && (
          data.multi
            ? <MultiDashboard data={data} onDownload={handleDownload} onReset={handleReset}/>
            : <Dashboard data={data} onDownload={handleDownload} onReset={handleReset}/>
        )}
      </main>

      <RealTimeBar connected={ws.connected} lastEvent={ws.lastEvent} wsEvents={ws.wsEvents} isAnalyzing={state==='analyzing'}/>

      {/* Persistent chat bar — only when dashboard is active */}
      {isDash && (
        <ChatBar label={chatLabel} numCols={chatCols.num} catCols={chatCols.cat}/>
      )}

      {showMerge && scanResult && (
        <MergeChoiceModal scan={scanResult} onChoice={handleChoice} onCancel={function(){setMerge(false)}}/>
      )}
    </div>
  )
}
