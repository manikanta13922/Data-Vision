import React, { useState } from 'react'
import { RefreshCw, FileSpreadsheet, FileText, BarChart2, Lightbulb,
         Activity, Link, AlertTriangle, Tag, TrendingUp, Database,
         ShieldCheck, MessageCircle, GitBranch, Layers } from 'lucide-react'
import KPICards from './KPICards.jsx'
import ChartsSection from './ChartsSection.jsx'
import InsightsPanel from './InsightsPanel.jsx'
import StatisticsTable from './StatisticsTable.jsx'
import CorrelationHeatmap from './CorrelationHeatmap.jsx'
import OutliersPanel from './OutliersPanel.jsx'
import CategoricalPanel from './CategoricalPanel.jsx'
import PredictionsPanel from './PredictionsPanel.jsx'
import PipelinePanel from './PipelinePanel.jsx'
import SchemaPanel from './SchemaPanel.jsx'
import ChatbotPanel from './ChatbotPanel.jsx'
import ExportPanel from './ExportPanel.jsx'

var TABS = [
  {id:'charts',       label:'Visualizations', icon:BarChart2},
  {id:'insights',     label:'Insights',       icon:Lightbulb},
  {id:'chat',         label:'Chat & Measures',icon:MessageCircle},
  {id:'schema',       label:'Schema',         icon:GitBranch},
  {id:'pipeline',     label:'Analysis Report',icon:ShieldCheck},
  {id:'statistics',   label:'Statistics',     icon:Activity},
  {id:'predictions',  label:'Predictions',    icon:TrendingUp},
  {id:'correlations', label:'Correlations',   icon:Link},
  {id:'outliers',     label:'Outliers',       icon:AlertTriangle},
  {id:'categories',   label:'Categories',     icon:Tag},
]

export default function Dashboard({ data, onDownload, onReset, embedded }) {
  var [tab, setTab] = useState('charts')
  var meta    = data.metadata || {}
  var profile = data.profile  || {}
  var catData = data.categorical || data.categorical_analysis || {}
  var blocked = data.blocked_insights || []
  var insights = data.insights || []
  var schema   = data.schema || []

  // Merge info banner
  var mergeInfo = data.merge_info

  return (
    <div className="dash">
      {!embedded && (
        <div className="dash-hdr">
          <div style={{flex:1}}>
            <h2>
              <Database size={17} color="var(--indigo)"/>
              {meta.label || 'Dataset'}
              {data.combined && <span className="bdg bdg-indigo" style={{marginLeft:8,fontSize:'.7rem'}}>COMBINED</span>}
            </h2>
            <div className="dash-meta">
              {(meta.rows||0).toLocaleString()} rows · {meta.columns} cols ·&nbsp;
              {(meta.numeric_columns||[]).length} numeric ·&nbsp;
              {(meta.categorical_columns||[]).length} categorical ·&nbsp;
              {profile.completeness_pct||meta.completeness_pct}% complete ·&nbsp;
              {meta.insights_valid||0} insights · {meta.insights_blocked||0} blocked
            </div>
            {(meta.id_columns||[]).length > 0 && (
              <div style={{fontSize:'.7rem',color:'var(--ink4)',marginTop:2,fontFamily:'var(--font-mono)'}}>
                ⓘ ID columns excluded: {(meta.id_columns||[]).join(', ')}
              </div>
            )}
          </div>
          <div className="dash-actions">
            <button className="btn btn-primary" onClick={function(){ onDownload('powerbi') }}><FileSpreadsheet size={14}/> Power BI</button>
            <button className="btn btn-ghost" onClick={function(){ onDownload('pdf') }}><FileText size={14}/> PDF</button>
            <button className="btn btn-danger" onClick={onReset}><RefreshCw size={13}/> New File</button>
          </div>
        </div>
      )}

      {/* Merge info banner */}
      {mergeInfo && mergeInfo.sources && (
        <div style={{background:'var(--indigo-light)',border:'1px solid var(--indigo-mid)',borderRadius:'var(--r)',padding:'.9rem 1.25rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
            <Layers size={15} color="var(--indigo)"/>
            <strong style={{color:'var(--indigo)',fontSize:'.85rem'}}>Combined Dataset</strong>
            <span className="bdg bdg-indigo" style={{fontSize:'.65rem'}}>{mergeInfo.sources.length} sources merged</span>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {mergeInfo.sources.map(function(s,i){ return <span key={i} className="chip chip-indigo" style={{fontSize:'.68rem'}}>{s}</span> })}
          </div>
          {mergeInfo.conflicts && mergeInfo.conflicts.length > 0 && (
            <div style={{marginTop:6,fontSize:'.75rem',color:'var(--amber)'}}>
              ⚠ Column conflicts resolved: {mergeInfo.conflicts.join(', ')} — renamed with source suffix
            </div>
          )}
        </div>
      )}

      {embedded && (
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'.5rem 0',flexWrap:'wrap'}}>
          <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:'.95rem',color:'var(--indigo)'}}>{meta.label}</span>
          <span className="bdg bdg-indigo">{(meta.rows||0).toLocaleString()} rows</span>
          <span className="bdg bdg-teal">{(meta.numeric_columns||[]).length} numeric</span>
          <span className="bdg bdg-amber">{profile.completeness_pct}% complete</span>
          <span className="bdg bdg-emerald">{meta.insights_valid||0} insights</span>
          {(meta.insights_blocked||0)>0&&<span className="bdg bdg-rose">{meta.insights_blocked} blocked</span>}
        </div>
      )}

      <div>
        <div className="section-hdr"><span>Key Metrics</span></div>
        <KPICards kpis={data.kpis||[]}/>
      </div>

      <div className="tabs">
        {TABS.map(function(t) {
          var Icon = t.icon
          return (
            <button key={t.id} className={'tab '+(tab===t.id?'on':'')} onClick={function(){ setTab(t.id) }}>
              <Icon size={13}/>{t.label}
              {t.id==='insights' && <span className="cnt">{insights.length}</span>}
              {t.id==='insights' && blocked.length>0 && <span className="cnt cnt-red">{blocked.length}🚫</span>}
              {t.id==='predictions' && Object.keys(data.predictions||{}).length>0 && <span className="cnt">{Object.keys(data.predictions).length}</span>}
              {t.id==='schema' && schema.length>0 && <span className="cnt">{schema.length}</span>}
            </button>
          )
        })}
      </div>

      {tab==='charts'       && <ChartsSection chartData={data.chart_data} distributions={data.distributions} statistics={data.statistics} bizCharts={data.biz_charts}/>}
      {tab==='insights'     && <InsightsPanel insights={insights} blocked_insights={blocked}/>}
      {tab==='chat'         && <ChatbotPanel label={meta.label} numCols={meta.numeric_columns||[]} catCols={meta.categorical_columns||[]}/>}
      {tab==='schema'       && <SchemaPanel schema={schema} label={meta.label} relationships={data.relationships||[]} factTable={data.fact_table} dimTables={data.dim_tables||[]}/>}
      {tab==='pipeline'     && <PipelinePanel data={data}/>}
      {tab==='statistics'   && <StatisticsTable statistics={data.statistics||{}}/>}
      {tab==='predictions'  && <PredictionsPanel predictions={data.predictions||{}} regression={data.regression||{}} numCols={meta.numeric_columns||[]}/>}
      {tab==='correlations' && <CorrelationHeatmap correlations={data.correlations||{matrix:{},strong_pairs:[]}}/>}
      {tab==='outliers'     && <OutliersPanel outliers={data.outliers||{}}/>}
      {tab==='categories'   && <CategoricalPanel categorical={catData}/>}

      {!embedded && <ExportPanel onDownload={onDownload}/>}
    </div>
  )
}
