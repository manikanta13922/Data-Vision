import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Hash, Type, Calendar, Key, Link2, AlertTriangle, CheckCircle, Database, ArrowRight, Layers } from 'lucide-react'

var API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function typeIcon(t) {
  if (t==='Numeric')   return Hash
  if (t==='Date/Time') return Calendar
  if (t==='Key')       return Key
  return Type
}
function typeColor(t) {
  if (t==='Numeric')   return 'var(--indigo)'
  if (t==='Date/Time') return 'var(--coral)'
  if (t==='Key')       return '#9ca3af'
  return 'var(--teal)'
}
function typeBg(t) {
  if (t==='Numeric')   return 'var(--indigo-light)'
  if (t==='Date/Time') return 'var(--coral-light)'
  if (t==='Key')       return '#f9fafb'
  return 'var(--teal-light)'
}

export default function SchemaPanel({ schema: propSchema, label, relationships, factTable, dimTables }) {
  var [schema,   setSchema]   = useState(propSchema||[])
  var [filter,   setFilter]   = useState('all')
  var [search,   setSearch]   = useState('')
  var [selected, setSelected] = useState(null)
  var [viewMode, setViewMode] = useState(relationships&&relationships.length>0?'powerbi':'cards')

  useEffect(function(){
    if (!propSchema||propSchema.length===0){
      axios.get(API+'/api/schema').then(function(r){ if(r.data&&r.data.schema) setSchema(r.data.schema) }).catch(function(){})
    } else { setSchema(propSchema) }
  }, [propSchema])

  var cols = schema.filter(function(c){
    if (filter==='keys') return c.is_id || c.type==='Key'
    if (filter!=='all' && c.type!==filter) return false
    if (search && !c.column.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).filter(function(c){ return !c.is_source })

  var numCols  = schema.filter(function(c){ return c.type==='Numeric' && !c.is_id }).length
  var textCols = schema.filter(function(c){ return c.type==='Text' && !c.is_id && !c.is_source }).length
  var dateCols = schema.filter(function(c){ return c.type==='Date/Time' }).length
  var keyCols  = schema.filter(function(c){ return c.is_id || c.type==='Key' }).length

  // Group columns by source table for Power BI view
  var tableGroups = {}
  schema.filter(function(c){ return !c.is_source }).forEach(function(c){
    var tbl = c.source_table || factTable || 'Table'
    if (!tableGroups[tbl]) tableGroups[tbl] = []
    tableGroups[tbl].push(c)
  })

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,var(--indigo),var(--violet))',borderRadius:'var(--r)',padding:'1.25rem 1.5rem',color:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
          <Database size={20}/><span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'1.1rem'}}>Data Model</span>
          {factTable && <span style={{background:'rgba(255,255,255,.2)',borderRadius:99,padding:'2px 10px',fontSize:'.72rem',fontFamily:'var(--font-mono)'}}>Star Schema Detected</span>}
        </div>
        <div style={{display:'flex',gap:'2rem',flexWrap:'wrap'}}>
          {[['#a5b4fc',numCols,'Measure Cols'],['#6ee7b7',textCols,'Dimension Cols'],['#fca5a5',dateCols,'Date Cols'],['#fde68a',keyCols,'Key/FK Cols']].map(function(item){
            return (
              <div key={item[2]} style={{textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:'1.4rem',color:item[0]}}>{item[1]}</div>
                <div style={{fontSize:'.68rem',opacity:.8}}>{item[2]}</div>
              </div>
            )
          })}
        </div>
        {(relationships||[]).length>0 && (
          <div style={{marginTop:10,display:'flex',gap:6,flexWrap:'wrap'}}>
            {(relationships||[]).map(function(r,i){
              return (
                <div key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:8,padding:'4px 10px',fontSize:'.73rem',display:'flex',alignItems:'center',gap:5}}>
                  <span style={{opacity:.8}}>{r.fact}</span>
                  <ArrowRight size={11}/>
                  <span style={{fontWeight:700}}>{r.dim}</span>
                  <span style={{opacity:.7}}>via {r.key}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* View toggle + filter */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <div className="tabs" style={{flex:'none'}}>
          {[['all','All'],['Numeric','Measures'],['Text','Dimensions'],['Date/Time','Dates'],['keys','Keys/FK']].map(function(f){
            return <button key={f[0]} className={'tab '+(filter===f[0]?'on':'')} onClick={function(){setFilter(f[0])}} style={{padding:'5px 11px',fontSize:'.77rem'}}>{f[1]}</button>
          })}
        </div>
        <div className="tabs" style={{flex:'none',marginLeft:8}}>
          {[['powerbi','Power BI'],['cards','Cards'],['table','Table']].map(function(v){
            return <button key={v[0]} className={'tab '+(viewMode===v[0]?'on':'')} onClick={function(){setViewMode(v[0])}} style={{padding:'5px 10px',fontSize:'.75rem'}}>{v[1]}</button>
          })}
        </div>
        <input value={search} onChange={function(e){setSearch(e.target.value)}} placeholder="Search columns…"
          style={{marginLeft:'auto',background:'#fff',border:'1.5px solid var(--border)',borderRadius:8,padding:'5px 12px',fontSize:'.8rem',fontFamily:'var(--font-mono)',color:'var(--ink)',outline:'none',width:180}}/>
      </div>

      {/* ── POWER BI VIEW ── */}
      {viewMode==='powerbi' && (
        <div style={{background:'#f0f2f5',borderRadius:'var(--r)',padding:'1.5rem',minHeight:400,overflow:'auto'}}>
          <div style={{fontSize:'.72rem',color:'#6b7280',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'1rem'}}>
            Data Model — Table Relationships
          </div>
          <div style={{display:'flex',gap:'1.5rem',flexWrap:'wrap',alignItems:'flex-start',position:'relative'}}>
            {Object.entries(tableGroups).map(function(entry, tidx){
              var tblName = entry[0]; var tblCols = entry[1]
              var isFact = tblName === factTable
              return (
                <div key={tblName} style={{
                  background:'#fff',borderRadius:10,overflow:'hidden',
                  border:'1.5px solid '+(isFact?'var(--indigo)':'#d1d5db'),
                  minWidth:190,maxWidth:220,
                  boxShadow:isFact?'0 4px 16px rgba(79,70,229,.15)':'0 2px 8px rgba(0,0,0,.06)',
                  order:isFact?0:1,
                }}>
                  <div style={{
                    background:isFact?'linear-gradient(135deg,var(--indigo),var(--violet))':'#f9fafb',
                    padding:'8px 14px',display:'flex',alignItems:'center',gap:8,
                    borderBottom:'1px solid '+(isFact?'transparent':'#e5e7eb'),
                  }}>
                    {isFact?<Layers size={13} color="#fff"/>:<Database size={13} color="#6b7280"/>}
                    <span style={{color:isFact?'#fff':'#374151',fontWeight:700,fontSize:'.82rem',fontFamily:'var(--font-mono)'}}>{tblName}</span>
                    {isFact&&<span style={{marginLeft:'auto',background:'rgba(255,255,255,.25)',borderRadius:99,padding:'1px 7px',fontSize:'.62rem',color:'#fff'}}>Fact</span>}
                  </div>
                  <div style={{maxHeight:320,overflowY:'auto'}}>
                    {tblCols.map(function(col,ci){
                      var Icon=typeIcon(col.type)
                      var color=typeColor(col.type)
                      var isSelected=selected&&selected.column===col.column
                      var isKey=col.is_id||col.type==='Key'
                      return (
                        <div key={ci} onClick={function(){setSelected(isSelected?null:col)}}
                          style={{
                            display:'flex',alignItems:'center',gap:8,
                            padding:'5px 14px',cursor:'pointer',
                            background:isSelected?'rgba(79,70,229,.06)':'transparent',
                            borderLeft:isSelected?'3px solid var(--indigo)':isKey?'3px solid #e5e7eb':'3px solid transparent',
                            transition:'all .15s',
                          }}>
                          <Icon size={12} color={isKey?'#9ca3af':color} style={{flexShrink:0}}/>
                          <span style={{fontSize:'.75rem',color:isKey?'#9ca3af':'#374151',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'var(--font-mono)',fontStyle:isKey?'italic':'normal'}}>{col.column}</span>
                          {isKey&&<span style={{fontSize:'.58rem',color:'#9ca3af',flexShrink:0}}>FK</span>}
                          {col.null_pct>0&&<AlertTriangle size={9} color="#f59e0b"/>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{marginTop:'1rem',fontSize:'.72rem',color:'#9ca3af'}}>
            Click any column to inspect · FK = foreign key relationship · Bold = fact table measures
          </div>
        </div>
      )}

      {/* ── CARDS VIEW ── */}
      {viewMode==='cards' && (
        <div style={{display:'grid',gridTemplateColumns:selected?'1fr 300px':'repeat(auto-fill,minmax(200px,1fr))',gap:'.75rem',alignItems:'start'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'.75rem'}}>
            {cols.map(function(col){
              var Icon=typeIcon(col.type); var color=typeColor(col.type); var bg=typeBg(col.type)
              var isSel=selected&&selected.column===col.column
              var isKey=col.is_id||col.type==='Key'
              return (
                <button key={col.column} onClick={function(){setSelected(isSel?null:col)}}
                  style={{background:isSel?bg:isKey?'#fafafa':'var(--bg3)',border:'1.5px solid '+(isSel?color:isKey?'#e5e7eb':'var(--border)'),borderRadius:12,padding:'1rem',cursor:'pointer',textAlign:'left',transition:'all .18s',boxShadow:isSel?'0 4px 16px rgba(0,0,0,.08)':'var(--shadow-xs)',opacity:isKey?.65:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{width:26,height:26,borderRadius:7,background:bg,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid '+color+'44'}}><Icon size={12} color={color}/></div>
                    <div style={{flex:1,overflow:'hidden'}}>
                      <div style={{fontSize:'.78rem',fontWeight:700,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{col.column}</div>
                      <div style={{fontSize:'.62rem',color,fontWeight:700}}>{isKey?'Key / FK':col.type}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    <span className="bdg bdg-ink" style={{fontSize:'.59rem'}}>{col.unique&&col.unique.toLocaleString()} unique</span>
                    {col.null_pct>0&&<span className="bdg bdg-amber" style={{fontSize:'.59rem'}}>{col.null_pct}% null</span>}
                    {col.source_table&&<span className="bdg bdg-indigo" style={{fontSize:'.59rem'}}>{col.source_table}</span>}
                  </div>
                </button>
              )
            })}
          </div>
          {selected && <ColumnDetail col={selected}/>}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode==='table' && (
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Column</th><th>Type</th><th>Source Table</th><th>Unique Values</th><th>Null %</th><th>Sample Values</th><th>Power BI DAX / Hint</th></tr>
              </thead>
              <tbody>
                {cols.map(function(col){
                  var color=typeColor(col.type); var bg=typeBg(col.type)
                  var isKey=col.is_id||col.type==='Key'
                  return (
                    <tr key={col.column} style={{opacity:isKey?.6:1}}>
                      <td style={{fontWeight:700,color:'var(--ink)'}}>{col.column}{isKey&&<span style={{marginLeft:4,fontSize:'.62rem',color:'#9ca3af'}}>(FK)</span>}</td>
                      <td><span style={{background:bg,color,padding:'2px 8px',borderRadius:99,fontSize:'.66rem',fontWeight:700,border:'1px solid '+color+'44'}}>{isKey?'Key':col.type}</span></td>
                      <td style={{fontSize:'.76rem',color:'var(--ink3)',fontFamily:'var(--font-mono)'}}>{col.source_table||'—'}</td>
                      <td style={{fontFamily:'var(--font-mono)'}}>{col.unique&&col.unique.toLocaleString()}</td>
                      <td>{col.null_pct>0?<span style={{color:col.null_pct>10?'var(--rose)':'var(--amber)',fontWeight:600}}>{col.null_pct}%</span>:<span style={{color:'var(--emerald)'}}>✓</span>}</td>
                      <td style={{fontFamily:'var(--font-mono)',fontSize:'.71rem',color:'var(--ink3)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(col.samples||[]).slice(0,2).join(', ')}</td>
                      <td style={{fontFamily:'var(--font-mono)',fontSize:'.69rem',color:col.type==='Numeric'&&!isKey?'var(--teal)':'var(--ink4)',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {isKey?`FK → ${col.source_table||'?'}`:col.type==='Numeric'?`Avg_${col.column} = AVERAGE(Table[${col.column}])`:col.type==='Text'?`Count_${col.column} = DISTINCTCOUNT(Table[${col.column}])`:'—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail popover for Power BI view */}
      {selected && viewMode==='powerbi' && <ColumnDetail col={selected} inline/>}
    </div>
  )
}

function ColumnDetail({ col, inline }) {
  var color=typeColor(col.type)
  var isKey=col.is_id||col.type==='Key'
  return (
    <div className="card" style={{border:'1.5px solid '+(isKey?'#d1d5db':color),position:inline?'relative':'sticky',top:80}}>
      <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:'1rem'}}>
        <div style={{width:34,height:34,borderRadius:9,background:typeBg(col.type),display:'flex',alignItems:'center',justifyContent:'center'}}>
          {React.createElement(typeIcon(col.type),{size:16,color})}
        </div>
        <div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:'.95rem',color:'var(--ink)'}}>{col.column}</div>
          <div style={{fontSize:'.7rem',color,fontFamily:'var(--font-mono)',fontWeight:700}}>{isKey?'Foreign Key / ID':col.type} · {col.dtype}</div>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        {[['Unique Values',(col.unique||0).toLocaleString()],['Missing',(col.null_count||0)+' ('+col.null_pct+'%)'],['Source Table',col.source_table||'Unknown'],['Aggregation',col.agg_hint||'—']].map(function(row){
          return (
            <div key={row[0]} style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',background:'var(--bg)',borderRadius:7,fontSize:'.77rem'}}>
              <span style={{color:'var(--ink3)'}}>{row[0]}</span>
              <span style={{color:'var(--ink)',fontWeight:600,fontFamily:'var(--font-mono)',textAlign:'right',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}}>{row[1]}</span>
            </div>
          )
        })}
      </div>
      {col.samples&&col.samples.length>0&&(
        <div style={{marginTop:'.75rem'}}>
          <div style={{fontSize:'.62rem',color:'var(--ink4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5,fontFamily:'var(--font-mono)'}}>Sample Values</div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {col.samples.map(function(s,i){return<span key={i} className="bdg bdg-ink" style={{fontSize:'.67rem'}}>{String(s).slice(0,20)}</span>})}
          </div>
        </div>
      )}
      {!isKey && (
        <div style={{marginTop:'.75rem',background:'var(--amber-light)',borderRadius:9,padding:'.75rem',border:'1px solid #fde68a'}}>
          <div style={{fontSize:'.62rem',color:'var(--amber)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>Power BI DAX</div>
          {col.type==='Numeric'?
            ['Avg_'+col.column+' = AVERAGE(Table['+col.column+'])',
             'Total_'+col.column+' = SUM(Table['+col.column+'])',
             'Max_'+col.column+' = MAX(Table['+col.column+'])'].map(function(dax,i){return<div key={i} style={{fontSize:'.67rem',fontFamily:'var(--font-mono)',color:'var(--ink2)',padding:'1px 0'}}>{dax}</div>}):
            ['Count_'+col.column+' = DISTINCTCOUNT(Table['+col.column+'])',
             'Mode_'+col.column+' = CALCULATE(FIRSTNONBLANK(Table['+col.column+'],1), TOPN(1,VALUES(Table['+col.column+']), CALCULATE(COUNTROWS(Table),ALLEXCEPT(Table,Table['+col.column+'])),DESC))'].map(function(dax,i){return<div key={i} style={{fontSize:'.67rem',fontFamily:'var(--font-mono)',color:'var(--ink2)',padding:'1px 0',wordBreak:'break-all'}}>{dax}</div>})}
        </div>
      )}
    </div>
  )
}
