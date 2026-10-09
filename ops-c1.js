
function bookingCard(b){
  const st=b.status||'Pending';
  const roster=approved().map(r=>`<option value="${esc(r.phone)}" data-name="${esc(r.name)}">${esc(r.name)}</option>`).join('');
  let actions=st==='Pending'?`<select id="pick-${b.id}"><option value="">—</option>${roster}</select>
    <button class="btn btn-p" onclick="confirmPick('${esc(b.id)}')">Verify & assign</button>
    <button class="btn btn-d" onclick="setStatus('${esc(b.id)}','Cancelled')">Decline</button>`:
    `<p>Captain: ${esc(b.guide||'—')} ${esc(b.guide_phone||'')}</p>
    <button class="btn btn-p" onclick="openBook('${esc(b.id)}')">Dispatch</button>
    ${st==='Confirmed'?`<button class="btn btn-p" onclick="setStatus('${esc(b.id)}','In Progress')">Start</button>`:''}
    ${st==='In Progress'?`<button class="btn btn-p" onclick="setStatus('${esc(b.id)}','Completed')">Complete</button>`:''}`;
  return `<div class="card"><div class="row"><h3>${esc(b.tour_title)}</h3><span class="pill">${esc(st)}</span></div>
    <p class="muted">${esc(b.name)} · ${esc(b.date)} · NPR ${esc(b.total)}</p>${actions}${activeBooking===b.id?deskHtml(b):''}</div>`;
}
function deskHtml(b){
  const p=packOf(b);
  return `<div class="grid2" style="margin-top:12px"><div>
    <label>Meeting</label><input id="d-meet" value="${esc(p.meeting_point||'')}">
    <label>Time</label><input id="d-time" value="${esc(p.meeting_time||'')}">
    <label>Itinerary</label><textarea id="d-itin" rows="3">${esc(p.itinerary||'')}</textarea>
    <button class="btn btn-p" onclick="publishDesk('${esc(b.id)}')">Send briefing</button>
  </div><div id="deskMap"></div></div>`;
}
window.openBook=id=>{if(!can('bookings'))return;activeBooking=id;view='bookings';render();};
window.confirmPick=async id=>{
  const sel=document.getElementById('pick-'+id);const phone=sel.value;
  const name=(sel.selectedOptions[0]?.dataset.name||'').trim();
  if(!phone){toast('Choose captain');return;}
  const {error}=await sb.from('bookings').update({guide:name,guide_phone:phone,status:'Confirmed'}).eq('id',id);
  if(error)toast('Failed');else{toast('Assigned');await refresh();activeBooking=id;render();}
};
window.setStatus=async(id,status)=>{await sb.from('bookings').update({status}).eq('id',id);toast(status);await refresh();render();};
function drawDesk(id){
  const b=bookings.find(x=>x.id===id);const el=$('deskMap');if(!b||!el||!window.L)return;
  if(deskMap){try{deskMap.remove();}catch(e){}deskMap=null;}
  const p=packOf(b);
  deskMap=L.map(el).setView([p.live_lat||p.start_lat||27.7,p.live_lng||p.start_lng||85.3],8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'OSM'}).addTo(deskMap);
  deskMap.on('click',e=>{const lat=e.latlng.lat,lng=e.latlng.lng;if(!p.start_lat){p.start_lat=lat;p.start_lng=lng;}else if(!p.dest_lat){p.dest_lat=lat;p.dest_lng=lng;}else{p.live_lat=lat;p.live_lng=lng;}b._draft=p;L.marker([lat,lng]).addTo(deskMap);});
  setTimeout(()=>deskMap.invalidateSize(),200);
}
window.publishDesk=async id=>{
  const b=bookings.find(x=>x.id===id);const p=Object.assign(packOf(b),b._draft||{});
  p.meeting_point=$('d-meet')?.value||'';p.meeting_time=$('d-time')?.value||'';p.itinerary=$('d-itin')?.value||'';
  await sb.from('bookings').update({ride_details:JSON.stringify(p)}).eq('id',id);toast('Briefing saved');
};
function viewLive(){if(!can('live'))return deny();return `<div class="card"><div id="fleetMap"></div></div>`;}
function drawFleet(){const el=$('fleetMap');if(!el||!window.L)return;if(fleetMap){try{fleetMap.remove();}catch(e){}fleetMap=null;}fleetMap=L.map(el).setView([28.1,84.1],7);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(fleetMap);setTimeout(()=>fleetMap.invalidateSize(),200);}
function viewRiders(){if(!can('riders'))return deny();return `<div class="card"><h3>Captains</h3>${approved().map(r=>`<div class="row"><strong>${esc(r.name)}</strong> ${esc(r.phone)}</div>`).join('')||'<p class="muted">None</p>'}<label>Name</label><input id="nr-name"><label>Phone</label><input id="nr-phone"><button class="btn btn-p" onclick="addRider()">Add</button></div>`;}
