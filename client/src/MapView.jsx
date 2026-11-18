import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip, useMapEvents } from 'react-leaflet';

const severityColors = { high: '#b8443b', medium: '#b87413', low: '#187a60' };
const riskColor = h => severityColors[h.severity?.toLowerCase()] || '#697789';
function ClickHandler({onPick}) { useMapEvents({click(e){onPick?.({lat:Number(e.latlng.lat.toFixed(6)),lng:Number(e.latlng.lng.toFixed(6))});}}); return null; }
export default function MapView({hazards=[], selectedId, onSelect, pickLocation=false, onPick, pickedLocation, routes=[], selectedRoute}) {
  return <div className="map-wrap"><MapContainer center={[12.9141,74.856]} zoom={13} scrollWheelZoom className="leaflet-map">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
    <ClickHandler onPick={pickLocation?onPick:undefined}/>
    {routes.filter(r=>!selectedRoute||r.id===selectedRoute).map((r,i)=><Polyline key={r.id} positions={r.geometry.map(p=>[p.lat,p.lng])} pathOptions={{color:['#2dd4bf','#60a5fa','#a78bfa'][i%3],weight:5,opacity:.85}}/>)}
    {hazards.map(h=><CircleMarker key={h.id} center={[h.lat,h.lng]} radius={selectedId===h.id?10:7} pathOptions={{color:riskColor(h),fillColor:riskColor(h),fillOpacity:.92,weight:selectedId===h.id?3:2,dashArray:h.demo?'4 3':undefined,className:'hazard-map-marker'}} eventHandlers={{click:()=>onSelect?.(h.id)}}>
      <Popup><div className="map-popup"><div className="map-popup-heading"><strong>{h.category}</strong><span className={`status status-${h.status}`}>{h.status?.replace('_',' ')}</span></div><p>{h.description||'No description provided.'}</p><small>Severity: {h.severity} · {new Date(h.createdAt).toLocaleDateString()}</small>{h.risk&&<p><b>Risk estimate: {h.risk.score??'Unknown'}{h.risk.score==null?'':'/100'} · {h.risk.category||'Unknown'}</b></p>}<small>{h.demo?'Demonstration record':'Community report'}</small></div></Popup>
    </CircleMarker>)}
    {pickedLocation&&<CircleMarker center={[pickedLocation.lat,pickedLocation.lng]} radius={9} pathOptions={{color:'#075e57',fillColor:'#0c8c7b',fillOpacity:1,weight:3,className:'report-location-marker'}} interactive={false}><Tooltip permanent direction="top" offset={[0,-10]}>Report pin</Tooltip></CircleMarker>}
  </MapContainer>{pickLocation&&<div className="map-pick-hint"> <span className="live-dot"/> Click the map to place or move the report pin</div>}</div>;
}
