import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, ArrowLeftRight, ArrowRight, Bot, Check, ChevronDown, CircleHelp, Clock3, Compass, Download, FileText, Filter, Gauge, Layers3, Map as MapIcon, MapPin, Menu, Navigation, Plus, RefreshCw, Route, ShieldAlert, Sparkles, Target, TrendingUp, Waves, X, Zap } from 'lucide-react';
import MapView from './MapView.jsx';

const NAV = [
 ['Overview','overview',Activity],['Hazard Map','map',MapIcon],['Report Hazard','report',Plus],['Route Intelligence','routes',Route],['Urban Response Agent','agent',Bot],['What-If Lab','whatif',Sparkles],['Inspection Priorities','priorities',Target],['Reports & Insights','insights',TrendingUp]
];
const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:4000').replace(/\/$/, '');
const api = async (path, options={}) => { const res=await fetch(`${API_BASE}${path}`,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}}); const data=await res.json().catch(()=>({error:'Invalid server response'})); if(!res.ok) throw new Error(data.details?.join(' ')||data.error||'Request failed'); return data; };
const fmtDate = d => d ? new Date(d).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Unknown';
const riskClass = c => ({High:'high',Elevated:'elevated',Moderate:'moderate',Low:'low','Insufficient data':'unknown'})[c]||'unknown';
function RiskPill({category,score}) { return <span className={`risk-pill ${riskClass(category)}`}>
<span className="risk-dot"/>{category}{score!==undefined&&score!==null?` · ${score}`:''}</span>; }
function StatusPill({status}) { return <span className={`status status-${status}`}>{String(status||'unknown').replace('_',' ')}</span>; }
function Card({children,className=''}) { return <section className={`panel ${className}`}>{children}</section>; }
function SectionTitle({eyebrow,title,description,action}) { return <div className="section-title">
<div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{description&&<p>{description}</p>}</div>{action}</div>; }
function Empty({title='Nothing here yet',text='New information will appear here when it is available.'}) { return <div className="empty-state">
<div className="empty-icon">
<Layers3 size={21}/>
</div>
<b>{title}</b>
<span>{text}</span>
</div>; }
function StatCard({label,value,sub,icon:Icon,tone='green'}) { return <div className="stat-card">
<div className={`stat-icon ${tone}`}>
<Icon size={19}/>
</div>
<div className="stat-label">{label}</div>
<div className="stat-value">{value}</div>
<div className="stat-sub">{sub}</div>
</div>; }
function BarList({data, colors={}}) { const entries=Object.entries(data||{}); const max=Math.max(1,...entries.map(([,v])=>v)); return entries.length?<div className="bar-list">{entries.map(([k,v])=>
<div className="bar-row" key={k}>
<div className="bar-label">
<span>{k}</span>
<b>{v}</b>
</div>
<div className="bar-track">
<div className="bar-fill" style={{width:`${v/max*100}%`,background:colors[k]||'#10b981'}}/>
</div>
</div>)}</div>:<Empty title="No chart data" text="Submit a report to start building insights."/>; }
function HazardRows({items,onSelect,onStatus}) { return <div className="hazard-list">{items.map(h=>
<div className="hazard-row" key={h.id} onClick={()=>onSelect?.(h)} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&onSelect?.(h)}>
<div className={`hazard-symbol ${h.demo?'demo':''}`}>
<AlertTriangle size={17}/>
</div>
<div className="hazard-main">
<div className="hazard-row-title">{h.category}<span className="severity-text">{h.severity}</span>
</div>
<div className="hazard-desc">{h.description||'No description provided'}</div>
<div className="hazard-meta">
<span>
<MapPin size={12}/>{h.lat.toFixed(3)}, {h.lng.toFixed(3)}</span>
<span>
<Clock3 size={12}/>{fmtDate(h.createdAt)}</span>
</div>
</div>
<div className="hazard-end">
<RiskPill category={h.risk?.category||'Unknown'} score={h.risk?.score}/>
<StatusPill status={h.status}/>
</div>
</div>)}</div>; }

export default function App() {
 const [page,setPage]=useState('landing'),[mobileNav,setMobileNav]=useState(false),[hazards,setHazards]=useState([]),[dashboard,setDashboard]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[toast,setToast]=useState(null),[selected,setSelected]=useState(null),[filters,setFilters]=useState({category:'All categories',severity:'All severities',status:'All statuses',days:'all',search:''}),[pickedLocation,setPickedLocation]=useState(null),[form,setForm]=useState({category:'Pothole',severity:'medium',description:''}),[submitting,setSubmitting]=useState(false),[routeResult,setRouteResult]=useState(null),[routeLoading,setRouteLoading]=useState(false),[agent,setAgent]=useState(null),[agentLoading,setAgentLoading]=useState(false),[simulation,setSimulation]=useState(null),[simLoading,setSimLoading]=useState(false),[simHazard,setSimHazard]=useState(''),[simScenario,setSimScenario]=useState('repair'),[routePreference,setRoutePreference]=useState('balanced'),[priorityFilter,setPriorityFilter]=useState('All'),[history,setHistory]=useState([]);
 const notify=(message,type='success')=>{setToast({message,type});setTimeout(()=>setToast(null),3600);};
 const refresh=useCallback(async()=>{setError('');try{const [h,d]=await Promise.all([api('/api/hazards'),api('/api/dashboard')]);setHazards(h.hazards);setDashboard(d);setSelected(old=>old?h.hazards.find(x=>x.id===old.id)||null:null);}catch(e){setError(e.message); }finally{setLoading(false);}},[]);
 useEffect(()=>{refresh();},[refresh]);
 useEffect(()=>{if(page==='routes')api('/api/routes/history').then(x=>setHistory(x.history||[])).catch(()=>{});},[page,routeResult]);
 const go=p=>{setPage(p);setMobileNav(false);setError('');if(p==='report')setPickedLocation(null);};
 const visibleHazards=useMemo(()=>hazards.filter(h=>(filters.category==='All categories'||h.category===filters.category)&&(filters.severity==='All severities'||h.severity===filters.severity)&&(filters.status==='All statuses'||h.status===filters.status)&&(filters.days==='all'||Date.now()-Date.parse(h.createdAt)<=Number(filters.days)*86400000)&&(!filters.search||`${h.category} ${h.description} ${h.status} ${h.source}`.toLowerCase().includes(filters.search.toLowerCase()))),[hazards,filters]);
 const submitHazard=async e=>{e.preventDefault();if(!pickedLocation){notify('Choose a location on the map first.','error');return;}setSubmitting(true);try{const r=await api('/api/hazards',{method:'POST',body:JSON.stringify({...form,...pickedLocation})});await refresh();setSelected(r.hazard);setForm({category:'Pothole',severity:'medium',description:''});notify(r.duplicateWarning?r.duplicateWarning.message:'Hazard saved as unverified.');go('map');}catch(e){notify(e.message,'error');}finally{setSubmitting(false);}};
 const compareRoutes=async()=>{setRouteLoading(true);try{const r=await api('/api/routes/compare',{method:'POST',body:JSON.stringify({preference:routePreference})});setRouteResult(r);notify('Candidate route comparison updated.');}catch(e){notify(e.message,'error');}finally{setRouteLoading(false);}};
 const runAgent=async()=>{setAgentLoading(true);try{setAgent(await api('/api/agent/analyze', { method: 'POST', body: JSON.stringify({}) }));}catch(e){notify(e.message,'error');}finally{setAgentLoading(false);}};
 const runSimulation=async()=>{if(!simHazard){notify('Select a hazard to simulate.','error');return;}setSimLoading(true);try{setSimulation(await api('/api/simulate',{method:'POST',body:JSON.stringify({hazardId:simHazard,scenario:simScenario})}));}catch(e){notify(e.message,'error');}finally{setSimLoading(false);}};
 const resetDemo=async()=>{if(!window.confirm('Reset demonstration records? Community-submitted reports will be preserved.'))return;try{const r=await api('/api/demo/reset',{method:'POST',body:'{}'});await refresh();setRouteResult(null);setAgent(null);notify(r.message);}catch(e){notify(e.message,'error');}};
 const updateStatus=async(h,status)=>{try{await api(`/api/hazards/${h.id}/status`,{method:'PATCH',body:JSON.stringify({status})});await refresh();notify(`Status updated to ${status.replace('_',' ')}.`);}catch(e){notify(e.message,'error');}};
 const exportCsv=()=>{window.location.href=`${API_BASE}/api/export.csv`;};
 const activeTitle=NAV.find(n=>n[1]===page)?.[0]||'Overview';
 if(page==='landing')return <Landing onExplore={()=>go('overview')} onReport={()=>go('report')}/>;
 return <div className="app-shell">
  <aside className={`sidebar ${mobileNav?'open':''}`}>
<div className="brand" onClick={()=>go('overview')}>
<div className="brand-mark">
<Navigation size={21}/>
<span/>
</div>
<div>
<b>MoveMind<span> AI</span>
</b>
<small>Mobility intelligence</small>
</div>
<button className="icon-btn sidebar-close" onClick={()=>setMobileNav(false)} aria-label="Close menu">
<X size={18}/>
</button>
</div>
   <div className="workspace-label">WORKSPACE <span className="online-dot"/>
</div>
<nav>{NAV.map(([label,id,Icon])=>
<button key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>go(id)}>
<Icon size={18}/>
<span>{label}</span>{id==='report'&&<span className="nav-plus">+</span>}</button>)}</nav>
   <div className="sidebar-bottom">
<div className="city-mini">
<div className="city-mini-icon">
<MapPin size={16}/>
</div>
<div>
<b>Mangalore, IN</b>
<small>Demo region · IST</small>
</div>
<span className="green-dot"/>
</div>
<div className="prototype-label">
<span/> PROTOTYPE MODE</div>
<button className="about-link" onClick={()=>go('about')}>About MoveMind AI <ArrowRight size={14}/>
</button>
</div>
  </aside>
  {mobileNav&&<div className="scrim" onClick={()=>setMobileNav(false)}/>}
  <main className="main-shell">
<header className="topbar">
<div className="top-left">
<button className="icon-btn mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open menu">
<Menu size={20}/>
</button>
<div className="breadcrumb">Workspace <span>/</span> <b>{activeTitle}</b>
</div>
</div>
<div className="top-actions">
<span className="system-status">
<i/> API connected</span>
<button className="icon-btn" title="Refresh data" onClick={refresh}>
<RefreshCw size={16}/>
</button>
<button className="avatar" title="CodeOrbit team">CO</button>
</div>
</header>
  <div className="page-content">
   {error&&<div className="error-banner">
<AlertTriangle size={17}/>
<span>Could not load data: {error}. Is the backend running?</span>
<button onClick={refresh}>Retry</button>
</div>}
   {loading?<div className="loading-screen">
<div className="loader"/>
<span>Connecting to mobility intelligence…</span>
</div>:<>
    {page==='overview'&&<Overview dashboard={dashboard} hazards={hazards} onGo={go} onSelect={h=>{setSelected(h);go('map')}} onAgent={runAgent}/>}
    {page==='map'&&<MapPage hazards={visibleHazards} allCount={hazards.length} filters={filters} setFilters={setFilters} selected={selected} setSelected={setSelected} onGo={go} onRefresh={refresh} onStatus={updateStatus}/>}
    {page==='report'&&<ReportPage form={form} setForm={setForm} pickedLocation={pickedLocation} setPickedLocation={setPickedLocation} hazards={hazards} submitting={submitting} onSubmit={submitHazard} onCancel={()=>go('map')}/>}
    {page==='routes'&&<RoutesPage result={routeResult} loading={routeLoading} onCompare={compareRoutes} preference={routePreference} setPreference={setRoutePreference} history={history}/>}
    {page==='agent'&&<AgentPage agent={agent} loading={agentLoading} onRun={runAgent}/>}
    {page==='whatif'&&<WhatIfPage hazards={hazards} selected={simHazard} setSelected={setSimHazard} scenario={simScenario} setScenario={setSimScenario} result={simulation} loading={simLoading} onRun={runSimulation}/>}
    {page==='priorities'&&<PrioritiesPage hazards={hazards} filter={priorityFilter} setFilter={setPriorityFilter} onSelect={h=>{setSelected(h);go('map')}} onStatus={updateStatus}/>}
    {page==='insights'&&<InsightsPage dashboard={dashboard} hazards={hazards} onExport={exportCsv} history={history} onReset={resetDemo}/>}
    {page==='about'&&<AboutPage onGo={go}/>}
   </>}
   <footer className="page-footer">
<span>MoveMind AI <b>·</b> CodeOrbit</span>
<span>Community reports · Provisional estimates · Human decision-making</span>
</footer>
  </div>
</main>
  {toast&&<div className={`toast ${toast.type==='error'?'toast-error':''}`}>
<span>{toast.type==='error'?<AlertTriangle size={17}/>:<Check size={17}/>}</span>{toast.message}<button onClick={()=>setToast(null)} aria-label="Dismiss">
<X size={15}/>
</button>
</div>}
 </div>;
}

function Landing({onExplore,onReport}) {return <div className="landing">
<header className="landing-nav">
<div className="brand">
<div className="brand-mark">
<Navigation size={21}/>
<span/>
</div>
<div>
<b>MoveMind<span> AI</span>
</b>
<small>Mobility intelligence</small>
</div>
</div>
<div className="landing-nav-right">
<span>
<i/> Live prototype</span>
<button className="btn btn-ghost" onClick={onReport}>Report a hazard</button>
<button className="btn btn-primary" onClick={onExplore}>Explore dashboard <ArrowRight size={16}/>
</button>
</div>
</header>
 <section className="hero">
<div className="hero-copy">
<div className="hero-kicker">
<span className="kicker-line"/> CITIES OF THE FUTURE <span className="kicker-chip">AGENTIC AI</span>
</div>
<h1>Every route has a story.<br/>
<em>Know the risks</em> before you go.</h1>
<p>MoveMind AI brings community-reported road hazards, explainable risk estimates and route trade-offs into one clear view — so you can make a more informed journey decision.</p>
<div className="hero-actions">
<button className="btn btn-primary btn-large" onClick={onExplore}>Explore Mobility Dashboard <ArrowRight size={17}/>
</button>
<button className="btn btn-ghost btn-large" onClick={onReport}>
<Plus size={17}/> Report a hazard</button>
</div>
<div className="hero-proof">
<span>
<Check size={14}/> Explainable risk model</span>
<span>
<Check size={14}/> No paid AI dependency</span>
<span>
<Check size={14}/> You choose the route</span>
</div>
</div>
 <div className="hero-visual">
<div className="visual-topline">
<span>
<span className="live-dot"/> MOBILITY OVERVIEW</span>
<span>12.91° N · 74.85° E</span>
</div>
<div className="preview-map">
<div className="map-grid"/>
<svg viewBox="0 0 500 330" className="map-art" aria-label="Illustrative route map">
<path d="M-10 65 C100 90 115 25 200 80 S320 155 520 60" fill="none" stroke="#263a4d" strokeWidth="16"/>
<path d="M-10 65 C100 90 115 25 200 80 S320 155 520 60" fill="none" stroke="#3a5369" strokeWidth="2"/>
<path d="M50 -10 C85 80 120 120 110 185 S150 270 180 350 M240 -10 C225 65 300 90 275 160 S330 260 360 340 M430 -10 C390 80 430 130 410 180 S445 250 480 350" fill="none" stroke="#263a4d" strokeWidth="13"/>
<path d="M50 -10 C85 80 120 120 110 185 S150 270 180 350 M240 -10 C225 65 300 90 275 160 S330 260 360 340 M430 -10 C390 80 430 130 410 180 S445 250 480 350" fill="none" stroke="#3a5369" strokeWidth="2"/>
<path d="M18 285 C100 230 140 245 205 195 S330 125 475 170" fill="none" stroke="#2dd4bf" strokeWidth="5" strokeLinecap="round"/>
<path d="M18 285 C100 230 140 245 205 195 S330 125 475 170" fill="none" stroke="#2dd4bf" strokeWidth="14" strokeOpacity=".12" strokeLinecap="round"/>
<path d="M18 285 C100 230 140 245 205 195 S330 125 475 170" fill="none" stroke="#60a5fa" strokeWidth="3" strokeDasharray="5 8" strokeLinecap="round"/>{[[110,188,'#fbbf24'],[205,195,'#f87171'],[275,158,'#fbbf24'],[365,130,'#f87171'],[410,180,'#34d399']].map(([x,y,c],i)=>
<g key={i}>
<circle cx={x} cy={y} r="13" fill={c} opacity=".15"/>
<circle cx={x} cy={y} r="6" fill={c} stroke="#0b1220" strokeWidth="3"/>
</g>)}</svg>
<div className="map-label label-a">
<span className="tiny-dot red"/> High severity <b>03</b>
</div>
<div className="map-label label-b">
<span className="tiny-dot amber"/> Reports nearby <b>06</b>
</div>
<div className="map-coord">MANGALORE · DEMO MAP</div>
</div>
<div className="preview-bottom">
<div>
<span className="preview-label">LOWEST ESTIMATED RISK</span>
<b>
<span className="risk-number">42</span> <small>/ 100</small>
</b>
<span className="preview-note">Illustrative estimate</span>
</div>
<div className="preview-route">
<span className="route-line teal-line"/> <div>
<b>Greenway Alternative</b>
<small>7.4 km · 24 min estimate</small>
</div>
<span className="mini-pill">Lower risk</span>
</div>
</div>
<div className="preview-float">
<div className="float-icon">
<Bot size={17}/>
</div>
<div>
<b>Urban Response Agent</b>
<span>3 tools completed · Evidence ready</span>
</div>
<span className="float-check">
<Check size={14}/>
</span>
</div>
</div>
 <div className="hero-glow"/>
</section>
 <section className="landing-flow">
<div className="flow-heading">
<div>
<div className="eyebrow">A CLEARER WAY TO MOVE</div>
<h2>From a community report to a confident choice.</h2>
</div>
<p>Four connected stages. Transparent reasoning at every step.</p>
</div>
<div className="flow-cards">{[['01','Report','Capture potholes, waterlogging, damaged roads and obstructions.','report',Plus],['02','Assess','Estimate risk using severity, nearby report frequency and recency.','assess',Gauge],['03','Plan','Use a tool-based agent workflow to prioritize reports and surface evidence.','plan',Bot],['04','Recommend','Compare candidate routes on risk, distance and estimated time.','recommend',ArrowLeftRight]].map(([n,t,d,_,I])=>
<div className="flow-card" key={n}>
<div className="flow-card-top">
<span>{n}</span>
<I size={19}/>
</div>
<h3>{t}</h3>
<p>{d}</p>
</div>)}</div>
</section>
 <section className="landing-trust">
<div>
<ShieldAlert size={20}/>
<b>Decision support, not a safety guarantee.</b>
<span>Scores are provisional and depend on the quality and freshness of available reports. No live traffic or official municipal data is connected. You always make the final route choice.</span>
</div>
<button className="btn btn-primary" onClick={onExplore}>See how it works <ArrowRight size={16}/>
</button>
</section>
<footer className="landing-footer">
<span>MoveMind AI <b>·</b> Built by CodeOrbit</span>
<span>ChronoForge 2026 · Agentic AI · Prototype</span>
</footer>
</div>}

function Overview({dashboard, hazards, onGo,onSelect,onAgent}) {const s=dashboard?.stats||{};return <>
<div className="welcome-row">
<div>
<div className="eyebrow">{new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase()} <span className="live-dot"/>
</div>
<h1>Mobility overview<span className="heading-period">.</span>
</h1>
<p>Know what’s reported. Understand the trade-offs. Choose with context.</p>
</div>
<div className="welcome-actions">
<button className="btn btn-secondary" onClick={()=>onGo('map')}>
<MapIcon size={16}/> Open hazard map</button>
<button className="btn btn-primary" onClick={()=>onGo('report')}>
<Plus size={16}/> Report hazard</button>
</div>
</div>
 <div className="notice-bar">
<div className="notice-icon">
<CircleHelp size={17}/>
</div>
<div>
<b>Prototype data, clearly labelled</b>
<span>Sample records demonstrate the workflow. Community reports are unverified until reviewed; risk estimates are provisional.</span>
</div>
<button onClick={()=>onGo('about')}>How it works <ArrowRight size={14}/>
</button>
</div>
 <div className="stats-grid">
<StatCard label="Reported hazards" value={s.total??'—'} sub="Demo + community reports" icon={AlertTriangle} tone="green"/>
<StatCard label="High severity" value={s.highSeverity??'—'} sub="Reporter-selected severity" icon={ShieldAlert} tone="red"/>
<StatCard label="Awaiting verification" value={s.awaitingVerification??'—'} sub="Not yet marked verified" icon={Clock3} tone="amber"/>
<StatCard label="Verified reports" value={s.verified??'—'} sub="Status recorded in prototype" icon={Check} tone="blue"/>
</div>
 <div className="dashboard-grid">
<Card className="panel-map">
<div className="panel-head">
<div>
<h3>Hazard landscape</h3>
<p>Reported conditions around Mangalore</p>
</div>
<button className="text-action" onClick={()=>onGo('map')}>Full map <ArrowRight size={14}/>
</button>
</div>
<MapView hazards={hazards} onSelect={id=>onSelect(hazards.find(h=>h.id===id))}/>
<div className="map-legend">
<span>
<i className="legend-red"/>High severity</span>
<span>
<i className="legend-amber"/>Medium severity</span>
<span>
<i className="legend-green"/>Low severity</span>
<span>
<i className="legend-outline"/>Community report</span>
</div>
</Card>
 <Card>
<div className="panel-head">
<div>
<h3>Hazard distribution</h3>
<p>Based on saved report categories</p>
</div>
<span className="mini-tag">LIVE DATA</span>
</div>
<BarList data={dashboard?.categoryDistribution} colors={{Pothole:'#f87171',Waterlogging:'#60a5fa','Damaged road':'#fbbf24',Obstruction:'#a78bfa'}}/>
<div className="panel-divider"/>
<div className="panel-head compact">
<div>
<h3>Risk estimates</h3>
<p>Calculated from current report set</p>
</div>
</div>
<BarList data={dashboard?.riskDistribution} colors={{High:'#f87171',Elevated:'#fb923c',Moderate:'#fbbf24',Low:'#34d399'}}/>
</Card>
</div>
 <div className="dashboard-grid lower-grid">
<Card>
<div className="panel-head">
<div>
<h3>Recent reports</h3>
<p>Latest saved hazards and their status</p>
</div>
<button className="text-action" onClick={()=>onGo('map')}>View all <ArrowRight size={14}/>
</button>
</div>{dashboard?.recent?.length?<HazardRows items={dashboard.recent} onSelect={onSelect}/>:<Empty title="No reports yet" text="Submit a hazard to start building the community map."/>}</Card>
<Card>
<div className="panel-head">
<div>
<h3>Urban Response Agent</h3>
<p>Tool-based assessment, with evidence</p>
</div>
<div className="agent-avatar">
<Bot size={19}/>
</div>
</div>
<div className="agent-preview">
<div className="agent-state">
<span className="green-dot"/> READY TO ANALYZE</div>
<h4>Turn reports into a prioritized response plan.</h4>
<p>The deterministic workflow retrieves reports, calculates scores, compares routes and ranks inspection priorities.</p>
<div className="tool-chips">
<span>01 Retrieve</span>
<span>02 Assess</span>
<span>03 Compare</span>
<span>04 Plan</span>
</div>
<button className="btn btn-primary full-btn" onClick={()=>{onGo('agent');onAgent();}}>Run agent analysis <ArrowRight size={16}/>
</button>
</div>
<div className="trust-mini">
<ShieldAlert size={15}/> Recommendations are advisory. No external actions are taken.</div>
</Card>
</div>
 <div className="quick-actions">
<button onClick={()=>onGo('routes')}>
<Route size={17}/>
<span>
<b>Compare routes</b>
<small>Risk · distance · time</small>
</span>
<ArrowRight size={15}/>
</button>
<button onClick={()=>onGo('whatif')}>
<Sparkles size={17}/>
<span>
<b>What-if lab</b>
<small>Simulate a repair</small>
</span>
<ArrowRight size={15}/>
</button>
<button onClick={()=>onGo('priorities')}>
<Target size={17}/>
<span>
<b>Inspection priorities</b>
<small>See what needs review</small>
</span>
<ArrowRight size={15}/>
</button>
</div>
</>}

function MapPage({hazards,allCount,filters,setFilters,selected,setSelected,onGo,onRefresh,onStatus}) {const [detail,setDetail]=useState(null);useEffect(()=>{if(selected)setDetail(selected);},[selected]);return <>
<SectionTitle eyebrow="SITUATIONAL AWARENESS" title="Hazard map" description={`${hazards.length} of ${allCount} saved reports shown. Select a marker to inspect its evidence.`} action={<button className="btn btn-primary" onClick={()=>onGo('report')}>
<Plus size={16}/> New report</button>}/>
<Card className="filter-panel">
<div className="filter-title">
<Filter size={16}/> Filter reports</div>
<div className="filter-controls">
<select value={filters.category} onChange={e=>setFilters({...filters,category:e.target.value})}>
<option>All categories</option>{['Pothole','Waterlogging','Damaged road','Obstruction'].map(x=>
<option key={x}>{x}</option>)}</select>
<select value={filters.severity} onChange={e=>setFilters({...filters,severity:e.target.value})}>
<option>All severities</option>{['low','medium','high'].map(x=>
<option key={x}>{x}</option>)}</select>
<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}>
<option>All statuses</option>{['unverified','under_review','verified'].map(x=>
<option key={x}>{x}</option>)}</select>
<select value={filters.days} onChange={e=>setFilters({...filters,days:e.target.value})}>
<option value="all">Any age</option>
<option value="1">Last 24 hours</option>
<option value="7">Last 7 days</option>
<option value="30">Last 30 days</option>
</select>
<input placeholder="Search reports…" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/>
<button className="btn btn-secondary" onClick={()=>{setFilters({category:'All categories',severity:'All severities',status:'All statuses',days:'all',search:''});onRefresh();}}>Reset</button>
</div>
</Card>
 <div className="map-page-grid">
<Card className="full-map-card">
<div className="panel-head">
<div>
<h3>Mangalore report map</h3>
<p>OpenStreetMap · click a marker for report details</p>
</div>
<button className="icon-btn" onClick={onRefresh} title="Refresh reports">
<RefreshCw size={16}/>
</button>
</div>
<MapView hazards={hazards} selectedId={selected?.id} onSelect={id=>{setSelected(hazards.find(h=>h.id===id));setDetail(hazards.find(h=>h.id===id));}}/>
<div className="map-legend">
<span>
<i className="legend-red"/>High</span>
<span>
<i className="legend-amber"/>Medium</span>
<span>
<i className="legend-green"/>Low</span>
<span>
<i className="legend-outline"/>Community submission</span>
</div>
</Card>
 <Card className="report-detail-panel">
<div className="panel-head">
<div>
<h3>Report details</h3>
<p>Evidence and status</p>
</div>
<span className="count-badge">{hazards.length}</span>
</div>{detail&&hazards.some(h=>h.id===detail.id)?<>
<div className="detail-type">
<div className={`hazard-symbol ${detail.demo?'demo':''}`}>
<AlertTriangle size={18}/>
</div>
<div>
<h3>{detail.category}</h3>
<span>{detail.demo?'DEMONSTRATION RECORD':'COMMUNITY SUBMISSION'}</span>
</div>
</div>
<div className="detail-score">
<span>Provisional risk estimate</span>
<b>{detail.risk?.score??'—'}<small>/100</small>
</b>
<RiskPill category={detail.risk?.category||'Unknown'}/>
</div>
<div className="detail-grid">
<div>
<span>Severity</span>
<b>{detail.severity}</b>
</div>
<div>
<span>Status</span>
<StatusPill status={detail.status}/>
</div>
<div>
<span>Reported</span>
<b>{fmtDate(detail.createdAt)}</b>
</div>
<div>
<span>Coordinates</span>
<b>{detail.lat.toFixed(5)}, {detail.lng.toFixed(5)}</b>
</div>
</div>
<p className="detail-description">{detail.description||'No additional description.'}</p>
<div className="detail-source">
<FileText size={14}/>{detail.source}</div>
<div className="factor-mini">
<h4>Score contributions</h4>{Object.entries(detail.risk?.factors||{}).map(([k,v])=>
<div key={k}>
<span>{k}</span>
<div className="factor-track">
<i style={{width:`${v.normalized||0}%`}}/>
</div>
<b>{v.contribution}</b>
</div>)}</div>
<button className="btn btn-secondary full-btn" onClick={()=>onGo('whatif')}>Simulate this hazard <ArrowRight size={15}/>
</button>{detail.status!=='verified'&&<button className="btn btn-ghost full-btn" onClick={()=>onStatus(detail,'verified')}>Mark verified <Check size={15}/>
</button>}</>:<Empty title="Select a map marker" text="Choose a hazard to see its score, source, status and factor contributions."/>}</Card>
</div>
 <Card>
<div className="panel-head">
<div>
<h3>Visible reports</h3>
<p>Filtered list · select a row to focus details</p>
</div>
<span className="mini-tag">{hazards.length} RESULTS</span>
</div>{hazards.length?<HazardRows items={hazards} onSelect={h=>{setSelected(h);setDetail(h);}}/>:<Empty title="No reports match these filters" text="Try changing filters or submit a new report."/>}</Card>
</>}

function ReportPage({form,setForm,pickedLocation,setPickedLocation,hazards,submitting,onSubmit,onCancel}) {return <>
<SectionTitle eyebrow="COMMUNITY INTAKE" title="Report a road hazard" description="Share a reported condition with the community map. Every new report starts as unverified."/>
<div className="report-layout">
<Card className="form-card">
<div className="form-step">
<span>01</span>
<div>
<b>Describe the hazard</b>
<small>Tell us what you encountered</small>
</div>
</div>
<form onSubmit={onSubmit}>
<label>Hazard category <span>*</span>
<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required>{['Pothole','Waterlogging','Damaged road','Obstruction'].map(x=>
<option key={x}>{x}</option>)}</select>
</label>
<label>Severity <span>*</span>
<div className="severity-options">{['low','medium','high'].map(s=>
<button type="button" key={s} className={`severity-option ${s} ${form.severity===s?'chosen':''}`} onClick={()=>setForm({...form,severity:s})}>
<i/>{s[0].toUpperCase()+s.slice(1)}{form.severity===s&&<Check size={14}/>}</button>)}</div>
<small className="field-help">Use your best judgement. Severity is reporter-selected, not independently assessed.</small>
</label>
<label>Description <small>(optional)</small>
<textarea maxLength={500} rows={4} placeholder="What did you notice? Include useful context, not personal information." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
<small className="field-help">{form.description.length}/500 characters</small>
</label>
<div className="form-step location-step">
<span>02</span>
<div>
<b>Pin the location</b>
<small>Click on the map to place a marker</small>
</div>
</div>
<div className={`location-selected ${pickedLocation?'selected':''}`}>
<MapPin size={17}/>
<div>
<b>{pickedLocation?'Location selected':'No location selected'}</b>
<small>{pickedLocation?`${pickedLocation.lat}, ${pickedLocation.lng}`:'Select a point on the map to continue.'}{pickedLocation&&(pickedLocation.lat<12.6||pickedLocation.lat>13.3||pickedLocation.lng<74.6||pickedLocation.lng>75.3)?' — outside supported Mangalore area':''}</small>
</div>{pickedLocation&&<button type="button" className="icon-btn" onClick={()=>setPickedLocation(null)} aria-label="Clear location">
<X size={15}/>
</button>}</div>
<div className="form-actions">
<button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
<button type="submit" className="btn btn-primary" disabled={submitting||!pickedLocation}>{submitting?'Saving report…':<>
<Plus size={16}/> Submit report</>}</button>
</div>
</form>
</Card>
<div className="report-map-column">
<Card className="report-map-card">
<div className="panel-head">
<div>
<h3>Choose report location</h3>
<p>Map click sets the coordinates</p>
</div>
<span className="mini-tag">MANGALORE</span>
</div>
<MapView hazards={hazards} pickLocation onPick={setPickedLocation}/>{pickedLocation&&<div className="picked-coordinate">
<Check size={14}/> Pin selected at {pickedLocation.lat}, {pickedLocation.lng}</div>}{pickedLocation&&(pickedLocation.lat<12.6||pickedLocation.lat>13.3||pickedLocation.lng<74.6||pickedLocation.lng>75.3)&&<div className="notice-bar">
<div className="notice-icon">
<CircleHelp size={17}/>
</div>
<div>
<b>Location outside supported area</b>
<span>Choose a point within Mangalore area (latitude 12.6–13.3, longitude 74.6–75.3).</span>
</div>
</div>}</Card>
<Card className="trust-note">
<ShieldAlert size={18}/>
<div>
<b>What happens after submission?</b>
<p>Your report is saved and immediately becomes available to the risk engine. It remains <strong>unverified</strong> until someone uses the review action. A nearby same-category report may trigger a duplicate warning; your valid report is still saved.</p>
</div>
</Card>
</div>
</div>
</>}

function RoutesPage({result,loading,onCompare,preference,setPreference,history}) {const routes=result?.routes||[];const [sort,setSort]=useState('risk');const sorted=[...routes].sort((a,b)=>sort==='distance'?a.distanceKm-b.distanceKm:sort==='time'?a.durationMin-b.durationMin:(a.risk.score??101)-(b.risk.score??101));return <>
<SectionTitle eyebrow="ROUTE DECISION SUPPORT" title="Route intelligence" description="Compare illustrative candidate routes against known reports. The commuter makes the final choice." action={<button className="btn btn-primary" onClick={onCompare} disabled={loading}>{loading?<span className="btn-loader"/>:<Zap size={16}/>} {loading?'Analyzing…':'Analyze routes'}</button>}/>
<div className="notice-bar">
<div className="notice-icon">
<CircleHelp size={17}/>
</div>
<div>
<b>Demonstration route data</b>
<span>These Mangalore-area route corridors, distances and travel times are illustrative. No live traffic or turn-by-turn routing is connected.</span>
</div>
</div>
<div className="route-controls panel">
<div>
<label>Comparison preference</label>
<select value={preference} onChange={e=>setPreference(e.target.value)}>
<option value="balanced">Balanced view</option>
<option value="risk">Prioritize lower estimated risk</option>
<option value="time">Prioritize estimated time</option>
<option value="distance">Prioritize distance</option>
</select>
</div>
<div>
<label>Sort candidate routes</label>
<select value={sort} onChange={e=>setSort(e.target.value)}>
<option value="risk">Lowest reported risk first</option>
<option value="distance">Shortest distance first</option>
<option value="time">Shortest estimated time first</option>
</select>
</div>
<div className="route-control-note">
<Compass size={16}/>
<span>Risk is one factor, not a safety guarantee.</span>
</div>
</div>
 {!result?<Card className="route-empty">
<div className="empty-icon large">
<Route size={26}/>
</div>
<h3>Compare your candidate routes</h3>
<p>Run the analysis to associate current reports with route corridors and calculate risk estimates using the shared risk engine.</p>
<button className="btn btn-primary" onClick={onCompare} disabled={loading}>Run route analysis <ArrowRight size={16}/>
</button>
</Card>:<>
<div className="route-summary">
<div>
<span>ANALYSIS COMPLETED</span>
<b>{routes.length} candidate routes</b>
<small>{fmtDate(result.createdAt)}</small>
</div>
<div>
<span>LOWEST ESTIMATED RISK</span>
<b>{routes.find(r=>r.id===result.comparison.lowestRiskRouteId)?.name||'Insufficient data'}</b>
<small>Among routes with associated reports</small>
</div>
<div>
<span>FASTEST ESTIMATE</span>
<b>{routes.find(r=>r.id===result.comparison.fastestRouteId)?.name||'—'}</b>
<small>Estimated time, not live traffic</small>
</div>
</div>
<Card className="route-map-panel">
<div className="panel-head">
<div>
<h3>Candidate route corridors</h3>
<p>Colored lines are illustrative geometry</p>
</div>
<span className="mini-tag">3 ROUTES</span>
</div>
<MapView hazards={[]} routes={routes}/>
<div className="route-line-legend">{routes.map((r,i)=>
<span key={r.id}>
<i style={{background:['#2dd4bf','#60a5fa','#a78bfa'][i]}}/>{r.name}</span>)}</div>
</Card>
<div className="route-card-grid">{sorted.map((r,i)=>
<Card className="route-card" key={r.id}>
<div className="route-card-top">
<span className="route-index">0{routes.findIndex(x=>x.id===r.id)+1}</span>
<span className="mini-tag">{r.source}</span>
</div>
<h3>{r.name}</h3>
<div className="route-metrics">
<div>
<span>Distance</span>
<b>{r.distanceKm} <small>km</small>
</b>
</div>
<div>
<span>Time estimate</span>
<b>{r.durationMin} <small>min</small>
</b>
</div>
<div>
<span>Distinct incidents</span>
<b>{r.risk.hazardCount}</b>
<small>Repeated reports: {r.risk.repeatedReportCount||0}</small>
</div>
</div>
<div className="route-risk-box">
<div>
<span>Estimated route risk</span>
<RiskPill category={r.risk.category} score={r.risk.score}/>
</div>
<div className="risk-meter">
<i style={{width:`${r.risk.score??0}%`,background:r.risk.score>=80?'#f87171':r.risk.score>=60?'#fb923c':r.risk.score>=35?'#fbbf24':'#34d399'}}/>
</div>
<p>{r.risk.explanation}</p>
</div>
<div className="route-hazards">
<b>Associated reports</b>{r.risk.hazards.length?r.risk.hazards.slice(0,3).map(h=>
<div key={h.id}>
<span className="tiny-dot" style={{background:h.severity==='high'?'#f87171':h.severity==='medium'?'#fbbf24':'#34d399'}}/>{h.category}<span>{h.risk.score}/100</span>
</div>):<div className="route-no-data">
<CircleHelp size={14}/> No reports associated; risk is unknown, not zero.</div>}</div>
</Card>)}</div>
<Card className="tradeoff-card">
<div className="agent-avatar">
<ArrowLeftRight size={19}/>
</div>
<div>
<h3>What the comparison means</h3>
<p>{result.comparison.summary}</p>
<p className="muted">{result.note}</p>
</div>
</Card>
</>}
 <Card>
<div className="panel-head">
<div>
<h3>Recent comparison history</h3>
<p>Stored on this local prototype</p>
</div>
<span className="mini-tag">{history.length} SAVED</span>
</div>{history.length?<div className="history-list">{history.slice(0,5).map(h=>
<div key={h.id}>
<div>
<b>{h.routes?.length||3} candidate routes</b>
<small>{fmtDate(h.createdAt)} · {h.preference}</small>
</div>
<span>{h.comparison?.summary}</span>
</div>)}</div>:<Empty title="No saved comparisons" text="Run a route analysis to create the first history entry."/>}</Card>
</>}

function AgentPage({agent,loading,onRun}) {return <>
<SectionTitle eyebrow="TOOL-BASED ANALYSIS" title="Urban Response Agent" description="A deterministic orchestrator runs separate analysis tools and returns an evidence-backed response plan." action={<button className="btn btn-primary" onClick={onRun} disabled={loading}>{loading?<span className="btn-loader"/>:<Zap size={16}/>} {loading?'Running tools…':'Run analysis'}</button>}/>
<div className="agent-intro">
<div className="agent-avatar large">
<Bot size={25}/>
</div>
<div>
<div className="agent-state">
<span className="green-dot"/> READY · RULE-BASED WORKFLOW</div>
<h3>From reported hazards to a prioritized response plan.</h3>
<p>This is a transparent tool-using workflow, not an LLM-powered autonomous agent. Each tool is a testable JavaScript function operating on saved application data.</p>
</div>
</div>
<div className="agent-steps">{[['01','Observe','Retrieve relevant reports'],['02','Select tools','Fixed rule-based tool sequence; no LLM selection'],['03','Assess','Calculate hazard and route risk'],['04','Compare','Evaluate route trade-offs'],['05','Recommend','Rank priorities and draft a plan']].map(([n,t,d],i)=>
<div className={`agent-step ${agent?'done':''}`} key={n}>
<span className="step-num">{agent?<Check size={15}/>:n}</span>
<b>{t}</b>
<small>{d}</small>{i<4&&<span className="step-connector"/>}</div>)}</div>{!agent?<Card className="agent-empty">
<div className="empty-icon large">
<Bot size={27}/>
</div>
<h3>Ready when you are</h3>
<p>Run the analysis to retrieve the current report set, score hazards, compare the candidate routes and generate prioritized inspection suggestions.</p>
<button className="btn btn-primary" onClick={onRun} disabled={loading}>Run Urban Response Agent <ArrowRight size={16}/>
</button>
</Card>:<>
<div className="agent-result-head">
<div>
<div className="eyebrow">ANALYSIS COMPLETE · {fmtDate(agent.generatedAt)}</div>
<h2>{agent.plan.headline}</h2>
<p>{agent.reportsConsidered} reports considered · {agent.tools.length} tools executed · {agent.rejectedReports} records excluded by validation</p>
</div>
<span className="success-tag">
<Check size={14}/> Completed</span>
</div>
<div className="agent-result-grid">
<Card>
<div className="panel-head">
<div>
<h3>Tool execution trace</h3>
<p>Real backend functions called in sequence</p>
</div>
<span className="mini-tag">{agent.tools.length} TOOLS</span>
</div>
<div className="tool-trace">{agent.workflowSteps?.map((step)=>
<div key={step.step}>
<div className="trace-icon">
<Check size={14}/>
</div>
<div className="trace-main">
<b>{step.step}</b>
<span>{step.summary}</span>
</div>
<span className="trace-status">COMPLETED</span>
</div>)}{agent.tools.map((t,i)=>
<div key={t.tool}>
<div className="trace-icon">
<Check size={14}/>
</div>
<div className="trace-main">
<b>{t.tool}</b>
<span>{t.summary}</span>
</div>
<span className="trace-status">COMPLETED</span>
</div>)}</div>
</Card>
<Card>
<div className="panel-head">
<div>
<h3>Response plan</h3>
<p>Suggested actions, not municipal work orders</p>
</div>
<div className="agent-avatar">
<Target size={18}/>
</div>
</div>
<div className="plan-recommendations">{agent.plan.recommendations.map((x,i)=>
<div key={i}>
<span>{String(i+1).padStart(2,'0')}</span>
<p>{x}</p>
</div>)}</div>
<div className="panel-divider"/>
<h4 className="subsection-title">Highest inspection priorities</h4>{agent.priorities.slice(0,4).map(h=>
<div className="priority-mini" key={h.id}>
<div>
<b>{h.priorityRank}. {h.category}</b>
<small>{h.priorityReason}</small>
</div>
<RiskPill category={h.risk.category} score={h.risk.score}/>
</div>)}</Card>
</div>
<Card>
<div className="panel-head">
<div>
<h3>Route trade-off evidence</h3>
<p>Same candidate routes as route intelligence</p>
</div>
</div>
<div className="agent-route-table">
<div className="agent-route-row header">
<span>Candidate</span>
<span>Distance</span>
<span>Time est.</span>
<span>Reports</span>
<span>Risk estimate</span>
</div>{agent.routeAnalysis.map(r=>
<div className="agent-route-row" key={r.id}>
<b>{r.name}</b>
<span>{r.distanceKm} km</span>
<span>{r.durationMin} min</span>
<span>{r.risk.hazardCount}</span>
<span>
<RiskPill category={r.risk.category} score={r.risk.score}/>
</span>
</div>)}</div>
</Card>
<Card className="limitations-card">
<ShieldAlert size={18}/>
<div>
<b>Uncertainties and limitations</b>{agent.limitations.map((x,i)=>
<p key={i}>• {x}</p>)}</div>
</Card>
</>}</>}

function WhatIfPage({hazards,selected,setSelected,scenario,setScenario,result,loading,onRun}) {return <>
<SectionTitle eyebrow="HYPOTHETICAL SCENARIOS" title="Mobility Decision Lab" description="Explore how a reported condition could affect the risk estimate. Saved records are never changed."/>
<div className="whatif-layout">
<Card className="whatif-form">
<div className="lab-icon">
<Sparkles size={23}/>
</div>
<h3>Build a what-if scenario</h3>
<p>Choose a saved report and test one change. The simulation uses the same risk engine as the live analysis.</p>
<label>Hazard to simulate<select value={selected} onChange={e=>setSelected(e.target.value)}>
<option value="">Select a report…</option>{hazards.map(h=>
<option key={h.id} value={h.id}>{h.category} · {h.severity} · {h.id.slice(0,8)}</option>)}</select>
</label>
<label>Hypothetical change<select value={scenario} onChange={e=>setScenario(e.target.value)}>
<option value="repair">Assume the hazard is repaired</option>
<option value="reduce-severity">Reduce severity by one level</option>
<option value="age-report">Make the report 14 days old</option>
</select>
</label>
<div className="scenario-explain">{scenario==='repair'?'The selected report is excluded from the scenario calculations only.':scenario==='reduce-severity'?'The selected report’s severity is reduced by one level in the scenario.':'The selected report timestamp is set to 14 days ago in the scenario.'}</div>
<button className="btn btn-primary full-btn" onClick={onRun} disabled={loading||!selected}>{loading?'Simulating…':<>
<Sparkles size={16}/> Run simulation</>}</button>
</Card>
<div className="whatif-results">{!result?<Card className="lab-placeholder">
<div className="empty-icon large">
<TrendingUp size={26}/>
</div>
<h3>Your scenario results will appear here</h3>
<p>Run a simulation to see the before-and-after estimate, factor changes and route-level effects.</p>
</Card>:<>
<div className="simulation-banner">
<Sparkles size={17}/>
<div>
<b>Hypothetical scenario · Not a prediction</b>
<span>{result.explanation}</span>
</div>
</div>
<Card className="simulation-card">
<div className="panel-head">
<div>
<h3>Hazard risk comparison</h3>
<p>Same risk engine · hypothetical inputs</p>
</div>
<span className="mini-tag">SIMULATION</span>
</div>
<div className="before-after">
<div>
<span>ORIGINAL SCORE</span>
<b>{result.original.score}<small>/100</small>
</b>
<RiskPill category={result.original.category}/>
</div>
<div className="change-arrow">
<ArrowRight size={22}/>
<span>Δ {result.difference===null?'Excluded':`${result.difference>0?'+':''}${Math.round(result.difference*10)/10}`}</span>
</div>
<div>
<span>SIMULATED RESULT</span>
<b>{result.simulated.score===null?'—':<>{result.simulated.score}<small>/100</small>
</>}</b>
<RiskPill category={result.simulated.category} score={result.simulated.score}/>
</div>
</div>{result.simulated.score!==null&&<div className="simulation-factors">{[['Severity',result.original.factors.severity?.contribution,result.simulated.factors.severity?.contribution],['Frequency',result.original.factors.frequency?.contribution,result.simulated.factors.frequency?.contribution],['Recency',result.original.factors.recency?.contribution,result.simulated.factors.recency?.contribution]].map(([label,a,b])=>
<div key={label}>
<span>{label}</span>
<div>
<small>Before <b>{a??'—'}</b>
</small>
<small>After <b>{b??'—'}</b>
</small>
</div>
<span className={b<a?'delta-good':b>a?'delta-bad':''}>{b>a?'+':''}{(b??0)-(a??0)}</span>
</div>)}</div>}<div className="simulation-safe-note">
<Check size={15}/> Permanent data unchanged: {String(!result.savedDataChanged)}</div>
</Card>
<Card>
<div className="panel-head">
<div>
<h3>Route-level impact</h3>
<p>Candidate routes recalculated under the scenario</p>
</div>
</div>
<div className="agent-route-table">
<div className="agent-route-row header">
<span>Route</span>
<span>Before</span>
<span>After</span>
<span>Difference</span>
</div>{result.routeChanges.map(r=>
<div className="agent-route-row" key={r.id}>
<b>{r.name}</b>
<span>{r.before??'Unknown'}</span>
<span>{r.after??'Unknown'}</span>
<span>{r.difference===null?'—':`${r.difference>0?'+':''}${r.difference}`}</span>
</div>)}</div>
</Card>
</>}</div>
</div>
</>}

function PrioritiesPage({hazards,filter,setFilter,onSelect,onStatus}) {const [sort,setSort]=useState('risk');const priorities=[...hazards].filter(h=>filter==='All'||h.risk?.category===filter).sort((a,b)=>sort==='fresh'?Date.parse(b.createdAt)-Date.parse(a.createdAt):sort==='severity'?({high:3,medium:2,low:1}[b.severity]-({high:3,medium:2,low:1}[a.severity])):(b.risk?.score||0)-(a.risk?.score||0));return <>
<SectionTitle eyebrow="INSPECTION DECISION SUPPORT" title="Inspection priorities" description="A transparent ranking of reported hazards to help decide what may warrant review. These are suggestions, not work orders."/>
<div className="priority-summary">
<div>
<Target size={18}/>
<div>
<b>{hazards.filter(h=>h.risk?.score>=60).length}</b>
<span>Elevated or high estimates</span>
</div>
</div>
<div>
<Clock3 size={18}/>
<div>
<b>{hazards.filter(h=>h.status!=='verified').length}</b>
<span>Not marked verified</span>
</div>
</div>
<div>
<ShieldAlert size={18}/>
<div>
<b>{hazards.filter(h=>h.demo).length}</b>
<span>Demonstration records</span>
</div>
</div>
</div>
<Card>
<div className="priority-controls">
<div>
<h3>Ranked hazard queue</h3>
<p>Sorted using the shared provisional risk model</p>
</div>
<div>
<select value={filter} onChange={e=>setFilter(e.target.value)}>
<option>All</option>{['High','Elevated','Moderate','Low'].map(x=>
<option key={x}>{x}</option>)}</select>
<select value={sort} onChange={e=>setSort(e.target.value)}>
<option value="risk">Highest risk first</option>
<option value="severity">Severity first</option>
<option value="fresh">Newest first</option>
</select>
</div>
</div>{priorities.length?<div className="priority-board">{priorities.map((h,i)=>
<div className="priority-card" key={h.id}>
<div className="priority-rank">{String(i+1).padStart(2,'0')}</div>
<div className="priority-content">
<div className="priority-title-row">
<h4>{h.category}</h4>
<RiskPill category={h.risk?.category} score={h.risk?.score}/>
</div>
<p>{h.description||'No description supplied.'}</p>
<div className="priority-meta">
<span>
<MapPin size={12}/>{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</span>
<span>Severity: {h.severity}</span>
<span>Nearby independent reports: {h.risk?.factors.frequency.nearbyIndependentReports??'Unknown'}</span>
<span>{fmtDate(h.createdAt)}</span>
</div>
<div className="priority-reason">
<b>Why prioritized</b>
<span>{h.risk?.explanation}</span>
</div>
<div className="priority-bottom">
<StatusPill status={h.status}/>
<span className="suggested-action">
<Target size={13}/>{h.status!=='verified'&&h.risk?.score>=60?'Review high-priority unverified report':h.risk?.factors.frequency.nearbyIndependentReports>=3?'Consider inspection of a report cluster':h.status!=='verified'?'Review details and seek corroboration':'Monitor the reported condition'}</span>
<button className="text-action" onClick={()=>onSelect(h)}>View report <ArrowRight size={14}/>
</button>{h.status!=='verified'&&<button className="text-action" onClick={()=>onStatus(h,'verified')}>Mark verified <Check size={14}/>
</button>}</div>
</div>
</div>)}</div>:<Empty title="No matching priorities" text="Try a different risk filter or add a report."/>}</Card>
<div className="notice-bar">
<div className="notice-icon">
<CircleHelp size={17}/>
</div>
<div>
<b>How to interpret this board</b>
<span>High scores indicate higher estimates under provisional weights. Missing or sparse reports lower confidence; a low score is not proof of low danger. In this prototype, status changes are not authenticated; verification is a manual label, not an official check.</span>
</div>
</div>
</>}

function InsightsPage({dashboard,hazards,onExport,history,onReset}) {return <>
<SectionTitle eyebrow="DATA EXPLORER" title="Reports & insights" description="Explore the saved report set, status coverage and risk-factor distributions." action={<button className="btn btn-primary" onClick={onExport}>
<Download size={16}/> Export CSV</button>}/>
<div className="notice-bar">
<div className="notice-icon">
<FileText size={17}/>
</div>
<div>
<b>Source transparency</b>
<span>Charts are calculated from the current local dataset. Demonstration records are included and labelled. This is not a citywide hazard census.</span>
</div>
</div>
<div className="insights-grid">
<Card>
<div className="panel-head">
<div>
<h3>Hazards by category</h3>
<p>Saved records</p>
</div>
</div>
<BarList data={dashboard?.categoryDistribution} colors={{Pothole:'#f87171',Waterlogging:'#60a5fa','Damaged road':'#fbbf24',Obstruction:'#a78bfa'}}/>
</Card>
<Card>
<div className="panel-head">
<div>
<h3>Severity distribution</h3>
<p>Reporter-selected severity</p>
</div>
</div>
<BarList data={dashboard?.severityDistribution} colors={{high:'#f87171',medium:'#fbbf24',low:'#34d399'}}/>
</Card>
<Card>
<div className="panel-head">
<div>
<h3>Verification status</h3>
<p>Recorded workflow state</p>
</div>
</div>
<BarList data={dashboard?.statusDistribution} colors={{unverified:'#fb923c',under_review:'#60a5fa',verified:'#34d399'}}/>
</Card>
<Card>
<div className="panel-head">
<div>
<h3>Risk category</h3>
<p>Provisional estimates</p>
</div>
</div>
<BarList data={dashboard?.riskDistribution} colors={{High:'#f87171',Elevated:'#fb923c',Moderate:'#fbbf24',Low:'#34d399'}}/>
</Card>
</div>
<Card>
<div className="panel-head">
<div>
<h3>Current report register</h3>
<p>{hazards.length} records · risk score recalculated on request</p>
</div>
<button className="btn btn-secondary" onClick={onExport}>
<Download size={15}/> Download CSV</button>
</div>
<div className="data-table-wrap">
<table>
<thead>
<tr>
<th>Hazard</th>
<th>Severity</th>
<th>Risk estimate</th>
<th>Status</th>
<th>Source</th>
<th>Reported</th>
</tr>
</thead>
<tbody>{hazards.map(h=>
<tr key={h.id}>
<td>
<b>{h.category}</b>
<small>{h.id}</small>
</td>
<td>{h.severity}</td>
<td>
<RiskPill category={h.risk?.category} score={h.risk?.score}/>
</td>
<td>
<StatusPill status={h.status}/>
</td>
<td>{h.source}</td>
<td>{fmtDate(h.createdAt)}</td>
</tr>)}</tbody>
</table>
</div>
</Card>
<Card>
<div className="panel-head">
<div>
<h3>Route analysis history</h3>
<p>Stored local comparisons</p>
</div>
<span className="mini-tag">{dashboard?.stats?.routesAnalyzed||0} TOTAL</span>
</div>{history.length?<div className="history-list">{history.map(h=>
<div key={h.id}>
<div>
<b>{h.routes?.length||0} candidate routes</b>
<small>{fmtDate(h.createdAt)}</small>
</div>
<span>{h.comparison?.summary}</span>
</div>)}</div>:<Empty title="No route history yet" text="Compare candidate routes to create a saved analysis."/>}</Card>
<Card className="danger-zone">
<div>
<h3>Demonstration data controls</h3>
<p>Reset sample records for another demo run. Community-submitted records are preserved.</p>
</div>
<button className="btn btn-danger" onClick={onReset}>
<RefreshCw size={15}/> Reset demo records</button>
</Card>
</>}

function AboutPage({onGo}) {return <>
<SectionTitle eyebrow="PROJECT & METHOD" title="About MoveMind AI" description="A CodeOrbit prototype for ChronoForge 2026, Round 1 — Agentic AI track, Cities of the Future theme."/>
<Card className="about-hero">
<div className="brand-mark big">
<Navigation size={28}/>
<span/>
</div>
<div>
<div className="eyebrow">MOVE SMARTER. UNDERSTAND YOUR ROUTE.</div>
<h2>Community reports, explainable estimates, human choice.</h2>
<p>MoveMind AI helps commuters understand known road hazards before choosing a route. It combines report intake, a transparent risk engine, route trade-off comparison and a tool-based response-planning workflow.</p>
</div>
</Card>
<div className="about-grid">
<Card>
<h3>Risk model</h3>
<p>Each factor is normalized to 0–100 and weighted using the proposal’s provisional values.</p>
<div className="weight-list">{[['Severity',50,'Reporter-selected: Low 25, Medium 60, High 100','#10b981'],['Nearby report frequency',30,'Independent same-category reports within 500 m','#60a5fa'],['Recency',20,'Exponential decay; influence halves every 7 days','#fbbf24']].map(([n,w,d,c])=>
<div key={n}>
<div>
<b>{n}</b>
<strong>{w}%</strong>
</div>
<div className="weight-track">
<i style={{width:`${w*2}%`,background:c}}/>
</div>
<small>{d}</small>
</div>)}</div>
<div className="formula">Risk = 0.50 × Severity + 0.30 × Frequency + 0.20 × Recency</div>
</Card>
<Card>
<h3>Agent architecture</h3>
<p>The backend orchestrator explicitly calls seven separate JavaScript tools.</p>
<div className="architecture-flow">{['Report API','Report processing','Risk engine','Route analysis','Trade-off comparison','Inspection ranking','Response plan'].map((x,i)=>
<div key={x}>
<span>{String(i+1).padStart(2,'0')}</span>{x}</div>)}</div>
<div className="honest-note">
<CircleHelp size={16}/>
<span>No LLM, paid API, live traffic, official municipal integration, or external dispatch is used in this prototype.</span>
</div>
</Card>
<Card>
<h3>Project team</h3>
<div className="team-member">
<div className="avatar large-avatar">CO</div>
<div>
<b>CodeOrbit</b>
<span>Shriraksha Shenoy · Sanjana TR</span>
<small>Canara Engineering College, Mangalore</small>
</div>
</div>
<div className="project-tags">
<span>ChronoForge 2026</span>
<span>Agentic AI</span>
<span>Cities of the Future</span>
</div>
</Card>
<Card>
<h3>Limitations to keep in mind</h3>
<ul className="limitation-list">
<li>Scores are provisional estimates, not validated safety ratings.</li>
<li>Reports may be incomplete, stale, duplicated or inaccurate.</li>
<li>Candidate routes and travel times are illustrative demo data.</li>
<li>OpenStreetMap tiles require connectivity.</li>
<li>Human users retain the final route decision.</li>
<li>In this prototype, status changes are not authenticated; verification is a manual label, not an official check.</li>
</ul>
</Card>
</div>
<div className="about-cta">
<div>
<h3>Ready to explore?</h3>
<p>Inspect current reports or run the route comparison workflow.</p>
</div>
<button className="btn btn-primary" onClick={()=>onGo('routes')}>Explore route intelligence <ArrowRight size={16}/>
</button>
</div>
</>}
