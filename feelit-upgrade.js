/* Feel It Nepal — production-preserving upgrade layer
   Loaded after script.js. Adds route builder, Hidden Gems, customer hotel/food
   choices, transparent cost controls, and an operations dashboard without
   replacing the existing booking/auth/payment system. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc0 = window.esc || (s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const npr = window.fmtNPR || (n => 'NPR ' + Math.round(Number(n)||0).toLocaleString());

  /* ---------------- Cost model ---------------- */
  const COST_KEY='feelit_cost_model_v2';
  const defaultCosts={fuelPerLiter:170,kmPerLiter:25,riderPerDay:2500,hotelPerPersonDay:1800,foodPerPersonDay:900,companyReservePct:10,founderPct:40,partnerBPct:20,partnerCPct:20,reservePct:20,roundTo:100};
  const readCosts=()=>{try{return {...defaultCosts,...JSON.parse(localStorage.getItem(COST_KEY)||'{}')}}catch{return {...defaultCosts}}};
  const saveCosts=v=>{try{localStorage.setItem(COST_KEY,JSON.stringify(v))}catch{}};
  window.FI_COSTS=readCosts();
  window.FI_RULES={localFactor:.6,roundTo:100};

  function parseDays(s){ const m=String(s||'').match(/\d+/); return Math.max(1, m?+m[0]:1); }
  function estimateTourCost(t, travelers=1, hotelChoice=null, foodChoice=null){
    const c=readCosts(), days=parseDays(t.duration), km=Number(t.distance_km)||Math.max(40,days*100);
    const fuel=(km/c.kmPerLiter)*c.fuelPerLiter;
    const rider=c.riderPerDay*days;
    const hotel=(hotelChoice?.cost||0)*days;
    const food=(foodChoice?.cost||0)*days;
    return Math.max(0,(fuel+rider+hotel+food)*Math.max(1,travelers));
  }

  /* ---------------- Hidden Gems ---------------- */
  const hiddenGems=[
    {id:'hg-bandipur',title:'Bandipur Ridge Escape',region:'Hidden Gems · Bandipur',duration:'1–2 days',price:null,guide:'Assigned after booking',guide_phone:'',bio:'Preserved hill-town atmosphere, ridge roads and Himalayan views.',desc:'A quieter hill-town ride with a Newari heritage core. The central bazaar is pedestrian-oriented, so the ride is paired with walking time.',includes:['Local rider','Route planning','Safety briefing'],lat:27.9385,lng:84.4067,image_url:'',coming_soon:true,category:'Hidden Gems'},
    {id:'hg-tansen',title:'Palpa / Tansen Old Hills',region:'Hidden Gems · Palpa',duration:'1–2 days',price:null,guide:'Assigned after booking',guide_phone:'',bio:'Historic hill-town roads and Kali Gandaki viewpoints.',desc:'A lesser-ridden hill-town route through Palpa/Tansen. Exact riding stops and road conditions are confirmed before departure.',includes:['Local rider','Route planning','Safety briefing'],lat:27.8673,lng:83.5467,image_url:'',coming_soon:true,category:'Hidden Gems'},
    {id:'hg-ilam',title:'Ilam Tea Hills',region:'Hidden Gems · Ilam',duration:'2 days',price:null,guide:'Assigned after booking',guide_phone:'',bio:'Tea-country switchbacks and eastern Nepal landscapes.',desc:'A green eastern-hills escape through Ilam tea country. Final route depends on weather, road conditions and the rider’s local checks.',includes:['Local rider','Route planning','Safety briefing'],lat:26.9096,lng:87.9282,image_url:'',coming_soon:true,category:'Hidden Gems'},
    {id:'hg-khaptad',title:'Khaptad Far-West Escape',region:'Hidden Gems · Khaptad',duration:'3+ days',price:null,guide:'Assigned after booking',guide_phone:'',bio:'Remote far-west riding with protected-area planning.',desc:'A remote far-west journey toward Khaptad. This is a planning-led adventure; protected-area access and the final ride/hike split are confirmed before booking.',includes:['Local rider','Route planning','Permit check'],lat:29.3370,lng:81.1690,image_url:'',coming_soon:true,category:'Hidden Gems'},
    {id:'hg-rara',title:'Rara Lake Expedition',region:'Hidden Gems · Rara',duration:'6+ days',price:null,guide:'Assigned after booking',guide_phone:'',bio:'Remote western roads and Rara National Park planning.',desc:'A longer hidden-gem expedition to Rara Lake. It is not a short ride, but it belongs here for riders asking for routes beyond the main tourist circuit.',includes:['Local rider','Route planning','Permit check'],lat:29.5320,lng:82.0820,image_url:'',coming_soon:true,category:'Hidden Gems'}
  ];

  function isHidden(t){return String(t.category||'').toLowerCase()==='hidden gems'||String(t.region||'').toLowerCase().startsWith('hidden gems');}
  function addHiddenToMemory(){
    if(typeof tours === "undefined" || !Array.isArray(tours)) return;
    const ids=new Set(tours.map(t=>t.id));
    hiddenGems.forEach(g=>{if(!ids.has(g.id)) window.tours.push(g);});
  }

  function insertHiddenSection(){
    if($('hiddenGems')) return;
    const toursSec=$('tours'); if(!toursSec) return;
    const s=document.createElement('section'); s.id='hiddenGems'; s.className='fi-hidden-gems';
    s.innerHTML=`<div class="wrap"><div class="section-head"><span class="fi-eyebrow">OFF THE MAIN ROAD</span><h2>Hidden Gems</h2><p>Short escapes and lesser-known corners of Nepal. Routes are confirmed against current road, permit and weather conditions before payment.</p></div><div id="fiHiddenGrid" class="grid"></div></div>`;
    toursSec.insertAdjacentElement('afterend',s);
    renderHidden();
  }
  function renderHidden(){
    const host=$('fiHiddenGrid'); if(!host) return;
    host.innerHTML=hiddenGems.map(g=>`<article class="fi-gem-card"><div class="fi-gem-top"><span>HIDDEN GEM</span><span>${esc0(g.duration)}</span></div><h3>${esc0(g.title)}</h3><p>${esc0(g.desc)}</p><div class="fi-gem-note">Price & availability: confirm with Feel It</div><a class="btn btn-outline" href="https://wa.me/9779825344810?text=${encodeURIComponent('Hi Feel It, I want to plan the Hidden Gem route: '+g.title)}" target="_blank" rel="noopener">Plan this ride</a></article>`).join('');
  }

  /* ---------------- Customer hotel + food choice ---------------- */
  const hotelOptions=[
    {id:'basic',name:'Local guesthouse',cost:900,desc:'Simple, clean local stay'},
    {id:'comfort',name:'Comfort hotel',cost:1800,desc:'Private room / standard hotel'},
    {id:'premium',name:'Premium lodge / hotel',cost:3200,desc:'Higher-comfort stay where available'},
    {id:'self',name:'I will choose my own hotel',cost:0,desc:'Price confirmed separately by the team'}
  ];
  const foodOptions=[
    {id:'local',name:'Local meals',cost:650,desc:'Dal bhat / local set meals'},
    {id:'standard',name:'Standard mixed meals',cost:900,desc:'Local + familiar options'},
    {id:'premium',name:'Premium meal allowance',cost:1400,desc:'Higher meal allowance'},
    {id:'self',name:'I will choose my own food',cost:0,desc:'Price confirmed separately by the team'}
  ];
  let originalGoToCheckout=null;
  let originalSubmitFinalBooking=null;
  function renderChoice(id){
    const t=(typeof tours!=='undefined'?tours:[]).find(x=>x.id===id); if(!t) return;
    const days=parseDays(t.duration), base=Number(t.price)||0;
    $('modalContent').innerHTML=`<button class="modal-close" onclick="closeOverlay()">&times;</button>
      <span class="fi-eyebrow">YOUR STAY + MEALS</span><h2>${esc0(t.title)}</h2>
      <p class="sub">Choose your own hotel and food. Your rider/guide remains assigned by Feel It and cannot be changed by the customer.</p>
      <div class="field"><label for="tourDate">Date</label><input type="date" id="tourDate" min="${new Date().toISOString().slice(0,10)}"></div>
      <div class="field"><label for="tourTravelers">Travelers</label><input type="number" id="tourTravelers" min="1" max="6" value="1"></div>
      <div class="fi-choice-grid"><div><h3>Hotel</h3>${hotelOptions.map((o,i)=>`<label class="fi-choice"><input type="radio" name="fiHotel" value="${o.id}" ${i===1?'checked':''}><span><b>${esc0(o.name)}</b><small>${esc0(o.desc)} · +${npr(o.cost)}/person/day</small></span></label>`).join('')}</div>
      <div><h3>Food</h3>${foodOptions.map((o,i)=>`<label class="fi-choice"><input type="radio" name="fiFood" value="${o.id}" ${i===0?'checked':''}><span><b>${esc0(o.name)}</b><small>${esc0(o.desc)} · +${npr(o.cost)}/person/day</small></span></label>`).join('')}</div></div>
      <div class="fi-price-box"><div><span>Base tour</span><b id="fiBasePrice">${npr(base)}</b></div><div><span>Hotel + food</span><b id="fiExtraPrice">${npr(hotelOptions[1].cost*days+foodOptions[0].cost*days)}</b></div><div class="total"><span>Estimated total / person</span><b id="fiChoiceTotal">${npr(base+hotelOptions[1].cost*days+foodOptions[0].cost*days)}</b></div></div>
      <button class="btn btn-primary" style="width:100%;" onclick="fiConfirmTourChoices('${esc0(id)}')">Continue to payment</button>`;
    const update=()=>{const h=hotelOptions.find(o=>o.id===document.querySelector('input[name=fiHotel]:checked')?.value)||hotelOptions[1];const f=foodOptions.find(o=>o.id===document.querySelector('input[name=fiFood]:checked')?.value)||foodOptions[0];const tr=Math.max(1,+( $('tourTravelers')?.value||1));const extra=(h.cost+f.cost)*days; if($('fiExtraPrice'))$('fiExtraPrice').textContent=npr(extra);if($('fiChoiceTotal'))$('fiChoiceTotal').textContent=npr((base+extra)*tr);};
    document.querySelectorAll('#modalContent input[name=fiHotel],#modalContent input[name=fiFood],#tourTravelers').forEach(x=>x.addEventListener('change',update));$('tourTravelers')?.addEventListener('input',update);showOverlay();
  }
  window.fiConfirmTourChoices=async id=>{
    const t=(typeof tours!=='undefined'?tours:[]).find(x=>x.id===id);if(!t)return;
    const date=$('tourDate')?.value, travelers=Math.max(1,Math.min(6,+($('tourTravelers')?.value||1)));
    if(!date){showToast('Please select a date.','error');return;}
    const h=hotelOptions.find(o=>o.id===document.querySelector('input[name=fiHotel]:checked')?.value)||hotelOptions[1];
    const f=foodOptions.find(o=>o.id===document.querySelector('input[name=fiFood]:checked')?.value)||foodOptions[0];
    if(!originalGoToCheckout)return;
    await originalGoToCheckout(id);
    if(typeof pendingBooking==='undefined' || !pendingBooking)return;
    const days=parseDays(t.duration), extra=(h.cost+f.cost)*days*travelers;
    pendingBooking.hotelChoice=h.name;pendingBooking.foodChoice=f.name;pendingBooking.hotelCost=h.cost;pendingBooking.foodCost=f.cost;pendingBooking.baseTotal=pendingBooking.total;pendingBooking.total=pendingBooking.total+extra;
    pendingBooking.date=date;pendingBooking.travelers=travelers;
    if(typeof window.renderPaymentMethodSelector==='function')window.renderPaymentMethodSelector();
  };

  /* Wrap the existing booking entry point after all original scripts have loaded. */
  function installBookingWrapper(){
    if(!window.openTour||window.openTour.__fiWrapped)return;
    const oldOpen=window.openTour;
    window.openTour=function(id){
      const t=(typeof tours!=='undefined'?tours:[]).find(x=>x.id===id);if(!t)return;
      if(t.coming_soon){oldOpen(id);return;}
      renderChoice(id);
    };window.openTour.__fiWrapped=true;
    originalGoToCheckout=window.goToCheckout;
    originalSubmitFinalBooking=window.submitFinalBooking;
    if(originalSubmitFinalBooking&&!originalSubmitFinalBooking.__fiWrapped){
      /* Add selections to the existing booking row without requiring a new DB column:
         the admin sees them in the tour title and the email payload remains intact. */
      const oldSubmit=originalSubmitFinalBooking;
      window.submitFinalBooking=async function(){
        if(typeof pendingBooking!=='undefined' && pendingBooking?.hotelChoice){
          const p=pendingBooking;
          p.title=`${p.title} · Hotel: ${p.hotelChoice} · Food: ${p.foodChoice}`;
        }
        return oldSubmit();
      };window.submitFinalBooking.__fiWrapped=true;
    }
  }

  /* ---------------- Build-your-own route ---------------- */
  const routeStart={name:'Basundhara, Kathmandu',lat:27.7410,lng:85.3360};
  const routeStops=[]; let routeMap=null,routeLine=null,routeGeocodeTimer=null,routeCalcToken=0;
  const routePricing={highway:{perKm:34,perDay:2200,roadFactor:1.25},offroad:{perKm:48,perDay:3000,roadFactor:1.5}};
  function initRoute(){
    if(!$('routeBuilderMap')||typeof L==='undefined'||routeMap)return;
    routeMap=L.map('routeBuilderMap',{scrollWheelZoom:false}).setView([28.2,84.0],7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(routeMap);
    routeMap.on('click',e=>addStop({name:`Pinned stop ${routeStops.length+1}`,lat:e.latlng.lat,lng:e.latlng.lng}));
    renderRouteList();
  }
  function addStop(s){if(routeStops.some(x=>Math.abs(x.lat-s.lat)<.0001&&Math.abs(x.lng-s.lng)<.0001))return;routeStops.push(s);renderRouteList();redrawRoute();calcRoute();}
  function removeStop(i){routeStops.splice(i,1);renderRouteList();redrawRoute();calcRoute();}
  function renderRouteList(){const h=$('routeItineraryList');if(!h)return;h.innerHTML=routeStops.length?routeStops.map((s,i)=>`<li><span>${i+1}. ${esc0(s.name)}</span><button type="button" aria-label="Remove stop" onclick="fiRemoveRouteStop(${i})">×</button></li>`).join(''):'<li class="route-empty">Search or click the map to add your first stop.</li>';}
  window.fiRemoveRouteStop=removeStop;
  window.resetRouteBuilder=()=>{routeStops.length=0;renderRouteList();redrawRoute();calcRoute();};
  function redrawRoute(){if(!routeMap)return;if(routeLine)routeMap.removeLayer(routeLine);const pts=[routeStart,...routeStops].map(x=>[x.lat,x.lng]);if(pts.length>1)routeLine=L.polyline(pts,{color:'#22d3ee',weight:4,dashArray:'8 8'}).addTo(routeMap);}
  async function geocode(q){const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=7&countrycodes=np&q=${encodeURIComponent(q+', Nepal')}`;const r=await fetch(url,{headers:{'Accept':'application/json'}});return r.json();}
  function initRouteSearch(){const inp=$('routeSearchInput'),res=$('routeSearchResults');if(!inp||!res)return;inp.addEventListener('input',()=>{clearTimeout(routeGeocodeTimer);const q=inp.value.trim();if(q.length<2){res.classList.remove('open');return;}routeGeocodeTimer=setTimeout(async()=>{try{const rows=await geocode(q);res.innerHTML=rows.map(x=>`<button type="button" class="route-result" data-lat="${x.lat}" data-lng="${x.lon}" data-name="${esc0(x.display_name.split(',').slice(0,2).join(', '))}">${esc0(x.display_name)}</button>`).join('')||'<div class="route-no-result">No Nepal place found.</div>';res.classList.add('open');res.querySelectorAll('.route-result').forEach(b=>b.onclick=()=>{addStop({name:b.dataset.name,lat:+b.dataset.lat,lng:+b.dataset.lng});res.classList.remove('open');inp.value='';});}catch{res.innerHTML='<div class="route-no-result">Search temporarily unavailable.</div>';res.classList.add('open');}},350);});document.addEventListener('click',e=>{if(!res.contains(e.target)&&e.target!==inp)res.classList.remove('open');});}
  function hav(a,b){const R=6371,d=Math.PI/180,la1=a.lat*d,la2=b.lat*d,dl=(b.lat-a.lat)*d,dn=(b.lng-a.lng)*d;const x=Math.sin(dl/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dn/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
  async function roadDistance(points,terrain){if(points.length<2)return{km:0,durationMin:0};const coords=points.map(p=>`${p.lng},${p.lat}`).join(';');try{const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=false`);const d=await r.json();if(d.code==='Ok'&&d.routes?.[0])return{km:d.routes[0].distance/1000,durationMin:d.routes[0].duration/60000};}catch{}let km=0;for(let i=1;i<points.length;i++)km+=hav(points[i-1],points[i]);km*=routePricing[terrain].roadFactor;return{km,durationMin:km/(terrain==='offroad'?25:45)*60};}
  window.getRoadDistanceKm=async(points,terrain)=>roadDistance(points,terrain);
  async function calcRoute(){const host=$('routeSummaryBody');if(!host)return;const token=++routeCalcToken;const days=Math.max(1,+($('routeDays')?.value||1)),pass=Math.max(1,+($('routePassengers')?.value||1)),terrain=$('routeTerrain')?.value||'highway';const hotel=$('routeIncludeHotel')?.checked,food=$('routeIncludeFood')?.checked;const pts=[routeStart,...routeStops];const d=await roadDistance(pts,terrain);if(token!==routeCalcToken)return;const c=readCosts(),rates=routePricing[terrain];const base=(rates.perKm*d.km+rates.perDay*days);const hotelCost=hotel?c.hotelPerPersonDay*days:0,foodCost=food?c.foodPerPersonDay*days:0;const total=Math.round((base+hotelCost+foodCost)*pass/c.roundTo)*c.roundTo;host.innerHTML=`<div class="fi-route-total"><span>Distance</span><b>${d.km.toFixed(0)} km</b></div><div class="fi-route-total"><span>Ride time</span><b>${(d.durationMin/60).toFixed(1)} h</b></div><div class="fi-route-total"><span>Hotel</span><b>${hotel? npr(hotelCost):'Not included'}</b></div><div class="fi-route-total"><span>Food</span><b>${food?npr(foodCost):'Not included'}</b></div><div class="fi-route-grand"><span>Estimated package</span><b>${npr(total)}</b></div><p class="route-summary-note">Estimate only. Final price is confirmed after road, permit, hotel and food checks.</p><a class="btn btn-outline" target="_blank" rel="noopener" href="https://wa.me/9779825344810?text=${encodeURIComponent('Hi Feel It, I want a custom route: '+routeStops.map(x=>x.name).join(' → '))}">Send this route to Feel It</a>`;}

  window.__FI_ROUTE_STOPS=routeStops;
  window.recalcRouteEstimate=calcRoute;
  window.initRouteBuilder=initRoute;

  /* ---------------- Operations dashboard ---------------- */
  function insertOpsButton(){
    const auth=$('authNavBtn');if(!auth||$('fiOpsBtn'))return;const b=document.createElement('button');b.id='fiOpsBtn';b.className='btn btn-outline';b.textContent='Operations';b.style.display='none';b.onclick=()=>window.renderAdminPanel&&window.renderAdminPanel('operations');auth.insertAdjacentElement('afterend',b);
    try{if(sessionStorage.getItem('feelit_admin_session'))b.style.display='inline-flex'}catch{}
  }
  function opsPanel(){
    const c=readCosts();$('modalContent').innerHTML=`<button class="modal-close" onclick="closeOverlay()">&times;</button><div class="admin-head"><h2>Operations Dashboard</h2><p class="sub">Central pricing controls. Rider assignment stays with the team.</p></div><div class="fi-ops-grid">
      ${[['fuelPerLiter','Fuel price (NPR/L)'],['kmPerLiter','Bike efficiency (km/L)'],['riderPerDay','Rider cost / day (NPR)'],['hotelPerPersonDay','Hotel cost / person / day (NPR)'],['foodPerPersonDay','Food cost / person / day (NPR)'],['companyReservePct','Company reserve (%)']].map(([k,l])=>`<div class="field"><label>${l}</label><input type="number" step="any" id="fiCost_${k}" value="${esc0(c[k])}"></div>`).join('')}</div><div class="fi-admin-tool"><h3>Automatic partner split</h3><div class="fi-ops-grid"><div class="field"><label>Founder %</label><input type="number" id="fiCost_founderPct" value="${esc0(c.founderPct)}"></div><div class="field"><label>Partner B %</label><input type="number" id="fiCost_partnerBPct" value="${esc0(c.partnerBPct)}"></div><div class="field"><label>Partner C %</label><input type="number" id="fiCost_partnerCPct" value="${esc0(c.partnerCPct)}"></div><div class="field"><label>Reserve %</label><input type="number" id="fiCost_reservePct" value="${esc0(c.reservePct)}"></div></div><p class="form-note">The four shares must total 100%. Net profit is calculated after fuel, rider, hotel and food costs.</p></div><div class="fi-cost-preview"><h3>Example calculation</h3><p>Fuel, rider, hotel and food inputs are used by the custom-route estimator. Tour prices remain editable in Manage Tours.</p></div><button class="btn btn-primary" onclick="fiSaveOpsCosts()">Save pricing controls</button>
      <div class="fi-admin-tool"><h3>Hidden Gems manager</h3><p class="form-note">Publish or update a Hidden Gem using the existing tours table. Customer rider assignment remains locked to the team.</p>${hiddenGems.map(g=>`<div class="fi-admin-mini"><input id="hgtitle-${g.id}" value="${esc0(g.title)}"><input id="hgprice-${g.id}" type="number" value="${g.price??''}" placeholder="Price / person"><textarea id="hgdesc-${g.id}" rows=2>${esc0(g.desc)}</textarea><button class="btn btn-outline" onclick="fiSaveHiddenGem('${esc0(g.id)}')">Save / publish</button></div>`).join('')}</div>
      <div class="fi-admin-tool"><h3>Gallery upload</h3><p class="form-note">Use a Google Drive image URL or upload directly if your Supabase Storage bucket is named <code>gallery</code>.</p><input id="fiGalleryFile" type="file" accept="image/*"><input id="fiGalleryUrl" placeholder="Google Drive image/share URL"><input id="fiGalleryCaption" placeholder="Caption"><button class="btn btn-outline" onclick="fiPublishGallery()">Publish photo</button></div>`;showOverlay();
  }
  window.fiSaveHiddenGem=async id=>{const g=hiddenGems.find(x=>x.id===id);if(!g)return;g.title=$('hgtitle-'+id).value.trim()||g.title;g.price=$('hgprice-'+id).value===''?null:+$('hgprice-'+id).value;g.desc=$('hgdesc-'+id).value.trim()||g.desc;g.coming_soon=g.price==null;const row={id:g.id,title:g.title,region:g.region,duration:g.duration,price:g.price,guide:g.guide,guide_phone:g.guide_phone,desc:g.desc,includes:g.includes,lat:g.lat,lng:g.lng,image_url:g.image_url,coming_soon:g.coming_soon};try{const {error}=await supabaseClient.from('tours').upsert(row);if(error)throw error;showToast('Hidden Gem saved to Supabase.','success');renderHidden();}catch(e){showToast('Could not save Hidden Gem. Check Supabase tours columns/RLS.','error')}};
  window.fiPublishGallery=async()=>{const file=$('fiGalleryFile')?.files?.[0],url=$('fiGalleryUrl')?.value.trim(),caption=$('fiGalleryCaption')?.value.trim()||'Feel It Nepal';let finalUrl=url;if(file){try{const safe=file.name.replace(/[^a-z0-9._-]/gi,'-');const path='gallery/'+Date.now()+'-'+safe;const up=await supabaseClient.storage.from('gallery').upload(path,file,{upsert:false});if(up.error)throw up.error;finalUrl=supabaseClient.storage.from('gallery').getPublicUrl(path).data.publicUrl;}catch(e){showToast('Upload failed. Create a public Supabase Storage bucket named gallery, or paste a Google Drive URL.','error');return}}if(!finalUrl){showToast('Choose an image or paste a URL.','error');return}try{const {error}=await supabaseClient.from('gallery_photos').insert([{url:finalUrl,caption}]);if(error)throw error;showToast('Photo published.','success');}catch(e){showToast('Photo upload succeeded but gallery_photos insert failed. Create that table/RLS or keep using your existing gallery table.','error')}};
  window.fiSaveOpsCosts=async()=>{const c=readCosts();['fuelPerLiter','kmPerLiter','riderPerDay','hotelPerPersonDay','foodPerPersonDay','companyReservePct','founderPct','partnerBPct','partnerCPct','reservePct'].forEach(k=>{c[k]=Math.max(0,+($('fiCost_'+k)?.value||0))});const split=Number(c.founderPct)+Number(c.partnerBPct)+Number(c.partnerCPct)+Number(c.reservePct);if(Math.round(split*100)/100!==100){showToast('Partner shares must total 100%.','error');return}saveCosts(c);window.FI_COSTS=c;try{const {error}=await supabaseClient.from('site_settings').upsert({key:'pricing_controls',value:JSON.stringify(c)});if(error)throw error;showToast('Pricing controls saved for the site.','success')}catch{showToast('Pricing controls saved on this device; Supabase site_settings is not writable yet.','success')}};


  /* ---------------- Preloader + wind-driven lamp ---------------- */
  function initPreloader(){
    const loader=$('pageLoader'); if(!loader)return;
    const messages=['getting your Nepal adventure ready…','packing the map…','checking the mountain roads…','Dowie & Snowie are ready to ride.'];
    let i=0; const msg=$('fiLoaderMessage');
    const timer=setInterval(()=>{i=(i+1)%messages.length;if(msg)msg.textContent=messages[i]},900);
    const done=()=>{clearInterval(timer);loader.classList.add('loader-done');setTimeout(()=>loader.remove(),700)};
    if(document.readyState==='complete')setTimeout(done,700);else window.addEventListener('load',()=>setTimeout(done,350),{once:true});
    setTimeout(done,5200);
  }
  function initWindBulb(){
    const bulb=$('fiWindBulb'); if(!bulb||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let wind=5,dir=90,last=performance.now(),x=window.innerWidth*.5,y=Math.min(window.innerHeight*.23,220),vx=0;
    async function readWind(){try{let lat=27.741,lng=85.336;if(navigator.geolocation){try{const p=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:3500,maximumAge:1200000}));lat=p.coords.latitude;lng=p.coords.longitude}catch{}}const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m`);const d=await r.json();wind=Number(d.current.wind_speed_10m)||5;dir=Number(d.current.wind_direction_10m)||90;}catch{}}
    readWind();setInterval(readWind,10*60*1000);
    function frame(now){const dt=Math.min(32,now-last);last=now;const rad=dir*Math.PI/180;const push=Math.sin(rad)*wind*.003;vx+=(push-vx)*.035;x+=vx*dt+Math.sin(now*.0008)*.12*dt;y+=Math.cos(now*.0007)*.035*dt+Math.cos(rad)*wind*.001*dt;if(x>window.innerWidth+40)x=-40;if(x<-40)x=window.innerWidth+40;y=Math.max(90,Math.min(window.innerHeight*.48,y));bulb.style.transform=`translate3d(${x}px,${y}px,0) rotate(${Math.sin(now*.001)*4}deg)`;bulb.style.setProperty('--fi-wind',Math.min(1.8,wind/20).toFixed(2));if(Math.floor(now/500)%2===0){const fx=document.getElementById('fiSiteFx');if(fx){const drift=Math.max(-70,Math.min(70,Math.sin(rad)*wind*2.2));fx.style.setProperty('--fi-wind-drift',drift.toFixed(1)+'px');fx.style.setProperty('--fi-wind-rot',(9+Math.sin(rad)*Math.min(18,wind*.7)).toFixed(1)+'deg');fx.querySelectorAll('.fi-drop').forEach((d,j)=>{const base=Number(d.dataset.baseDur||3.2);d.style.animationDuration=Math.max(.55,base/(.8+wind/22)).toFixed(2)+'s';})}}requestAnimationFrame(frame)}
    requestAnimationFrame(frame);
  }

  async function loadRemoteCosts(){try{const {data}=await supabaseClient.from('site_settings').select('value').eq('key','pricing_controls').maybeSingle();if(data?.value){const v=typeof data.value==='string'?JSON.parse(data.value):data.value;window.FI_COSTS={...readCosts(),...v};saveCosts(window.FI_COSTS)}}catch{}}

  /* ---------------- Boot ---------------- */
  function boot(){
    loadRemoteCosts();
    initPreloader();initWindBulb();
    insertHiddenSection();addHiddenToMemory();renderHidden();
    installBookingWrapper();
    initRoute();initRouteSearch();
    $('routeDays')?.addEventListener('input',calcRoute);$('routePassengers')?.addEventListener('input',calcRoute);$('routeTerrain')?.addEventListener('change',calcRoute);$('routeIncludeHotel')?.addEventListener('change',calcRoute);$('routeIncludeFood')?.addEventListener('change',calcRoute);
    insertOpsButton();
    const oldAdmin=window.renderAdminPanel;
    if(oldAdmin&&!oldAdmin.__fiOpsWrapped){window.renderAdminPanel=async tab=>{if(tab==='operations'){opsPanel();return}return oldAdmin(tab)};window.renderAdminPanel.__fiOpsWrapped=true;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250));else setTimeout(boot,250);
  setTimeout(()=>{addHiddenToMemory();renderHidden();installBookingWrapper();},1200);
})();
