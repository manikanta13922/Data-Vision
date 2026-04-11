import React from 'react'
import { Database, TrendingUp, ShieldCheck, Copy, Activity, DollarSign, BarChart, AlertTriangle } from 'lucide-react'

var ICON_MAP = {
  database:Database, 'trending-up':TrendingUp, 'shield-check':ShieldCheck,
  copy:Copy, activity:Activity, 'dollar-sign':DollarSign, 'bar-chart':BarChart,
  'alert-triangle':AlertTriangle,
}
var COLOR_ORDER = ['indigo','coral','teal','amber','violet','rose','emerald','sky']

export default function KPICards({ kpis }) {
  return (
    <div className="kpi-grid">
      {(kpis||[]).map(function(kpi, i) {
        var Icon = ICON_MAP[kpi.icon] || Activity
        var color = COLOR_ORDER[i % COLOR_ORDER.length]
        return (
          <div key={i} className={'kpi '+color+' fade-up'} style={{animationDelay:i*.05+'s'}}>
            <div className="kpi-bar"/>
            <div className="kpi-icon"><Icon size={16}/></div>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            {kpi.sub && <div className="kpi-sub">{kpi.sub}</div>}
          </div>
        )
      })}
    </div>
  )
}
