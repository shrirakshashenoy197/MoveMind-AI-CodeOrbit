import React, {useEffect} from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMapEvents } from 'react-leaflet';

const riskColor = h => h.demo ? '#f59e0b' : h.severity==='high' ? '#f87171' : h.severity==='medium' ? '#fbbf24' : '#34d399';
function ClickHandler({onPick}) { useMapEvents({click(e){onPick?.({lat:Number(e.latlng.lat.toFixed(6)),lng:Number(e.latlng.lng.toFixed(6))});}}); return null; }
export default function MapView({hazards=[], selectedId, onSelect, pickLocation=false, onPick, routes=[], selectedRoute}) {
  useEffect(()=>{},[hazards]);
  return <div className="map-wrap"><MapContainer center={[12.9141,74.856]} zoom={13} scrollWheelZoom className="leaflet-map">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
    <ClickHandler onPick={pickLocation?onPick:undefined}/>
    {routes.filter(r=>!selectedRoute||r.id===selectedRoute).map((r,i)=><Polyline key={r.id} positions={r.geometry.map(p=>[p.lat,p.lng])} pathOptions={{color:['#2dd4bf','#60a5fa','#a78bfa'][i%3],weight:5,opacity:.85}}/>)}
    {hazards.map(h=><CircleMarker key={h.id} center={[h.lat,h.lng]} radius={selectedId===h.id?10:7} pathOptions={{color:riskColor(h),fillColor:riskColor(h),fillOpacity:.9,weight:selectedId===h.id?4:2}} eventHandlers={{click:()=>onSelect?.(h.id)}}>
      <Popup><div className="map-popup"><strong>{h.category}</strong><span className={`status status-${h.status}`}>{h.status?.replace('_',' ')}</span><p>{h.description||'No description provided.'}</p><small>Severity: {h.severity} · {new Date(h.createdAt).toLocaleDateString()}</small>{h.risk&&<p><b>Risk estimate: {h.risk.score}/100 · {h.risk.category}</b></p>}<small>{h.source}</small></div></Popup>
    </CircleMarker>)}
  </MapContainer>{pickLocation&&<div className="map-pick-hint"> <span className="live-dot"/> Click anywhere on the map to choose a report location</div>}</div>;
}