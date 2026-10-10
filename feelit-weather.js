/* feelit-weather.js — live weather multi-API fallback (no key) */
(function () {
  'use strict';
  var HQ = { lat: 27.741, lng: 85.336, name: 'Kathmandu' };

  function iconFor(code, text) {
    var t = (text || '').toLowerCase();
    if (/thunder|storm|lightning/.test(t) || code === 95 || code === 96 || code === 99) return '⛈️';
    if (/heavy.?snow|blizzard/.test(t) || code === 75) return '☃️';
    if (/snow|sleet/.test(t) || [71, 73, 77, 85, 86].indexOf(code) >= 0) return '❄️';
    if (/freezing/.test(t) || code === 67) return '🧊';
    if (/heavy.?rain|torrential/.test(t) || code === 65) return '💧';
    if (/rain|drizzle|shower/.test(t) || [51, 53, 55, 61, 63, 80, 81, 82].indexOf(code) >= 0) return '🌧️';
    if (/fog|mist|haze/.test(t) || code === 45 || code === 48) return '🌫️';
    if (/cloud|overcast/.test(t) || code === 2 || code === 3) return '☁️';
    if (/clear|sunny/.test(t) || code === 0) {
      var h = new Date().getHours();
      return (h < 6 || h >= 19) ? '🌙' : '☀️';
    }
    if (code === 1) return '🌤️';
    return '🌡️';
  }

  function kindFor(text, code) {
    var t = (text || '').toLowerCase();
    if (/thunder|storm/.test(t) || [95, 96, 99].indexOf(code) >= 0) return 'thunder';
    if (/snow/.test(t) || [71, 73, 75, 77, 85, 86].indexOf(code) >= 0) return 'snow';
    if (/rain|drizzle|shower/.test(t) || [51, 53, 55, 61, 63, 65, 80, 81, 82].indexOf(code) >= 0) return 'rain';
    if (/fog|mist/.test(t) || code === 45 || code === 48) return 'fog';
    if (/clear|sunny/.test(t) || code <= 1) return 'clear';
    return 'clouds';
  }

  function apply(ui) {
    var el = document.getElementById('fiWeatherWidget');
    if (!el) return;
    var iconEl = el.querySelector('.hero-weather-icon');
    var textEl = el.querySelector('.hero-weather-text');
    if (iconEl) iconEl.textContent = ui.icon;
    if (textEl) textEl.textContent = ui.label;
    function set(id, v) { var n = document.getElementById(id); if (n) n.textContent = v; }
    set('fiWeatherTemp', ui.temp != null ? Math.round(ui.temp) + '°' : '—');
    set('fiWeatherHum', ui.humidity != null ? Math.round(ui.humidity) + '%' : '—');
    set('fiWeatherWind', ui.wind != null ? Math.round(ui.wind) + ' km/h' : '—');
    set('fiWeatherFeels', ui.feels != null ? Math.round(ui.feels) + '°' : '—');
    set('fiWeatherLoc', ui.place || 'Kathmandu');
    window.__fiWeather = ui;
    window.__fiWindKmh = ui.wind || 0;
    window.__fiWeatherKind = ui.kind;
    window.__fiWeatherCode = ui.code;
    el.setAttribute('data-weather-kind', ui.kind || 'unknown');
    el.classList.add('fi-weather-live');
    try { window.dispatchEvent(new CustomEvent('fi-weather-updated', { detail: ui })); } catch (e) {}
  }

  function fromOpenMeteo(lat, lng, place) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('meteo ' + r.status);
      return r.json();
    }).then(function (data) {
      if (data.error) throw new Error(data.reason || 'meteo limit');
      var c = data.current;
      if (!c) throw new Error('no current');
      var code = c.weather_code;
      var labelMap = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Showers',95:'Thunderstorm',96:'Storm + hail',99:'Severe storm'};
      var label = labelMap[code] || 'Live weather';
      return { temp:c.temperature_2m, feels:c.apparent_temperature, humidity:c.relative_humidity_2m, wind:c.wind_speed_10m, code:code, label:label, icon:iconFor(code,label), kind:kindFor(label,code), place:place, source:'open-meteo' };
    });
  }

  function fromWttr(place) {
    var q = encodeURIComponent(place || 'Kathmandu');
    return fetch('https://wttr.in/' + q + '?format=j1').then(function (r) {
      if (!r.ok) throw new Error('wttr ' + r.status);
      return r.json();
    }).then(function (data) {
      var cur = (data.current_condition && data.current_condition[0]) || {};
      var desc = (cur.weatherDesc && cur.weatherDesc[0] && cur.weatherDesc[0].value) || 'Weather';
      return { temp:parseFloat(cur.temp_C), feels:parseFloat(cur.FeelsLikeC), humidity:parseFloat(cur.humidity), wind:parseFloat(cur.windspeedKmph), code:0, label:desc, icon:iconFor(0,desc), kind:kindFor(desc,0), place:place||'Kathmandu', source:'wttr' };
    });
  }

  function fromMetNo(lat, lng, place) {
    var url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + lat + '&lon=' + lng;
    return fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'FeelItNepal/1.0' } }).then(function (r) {
      if (!r.ok) throw new Error('met ' + r.status);
      return r.json();
    }).then(function (data) {
      var ts = data.properties && data.properties.timeseries && data.properties.timeseries[0];
      if (!ts) throw new Error('no met series');
      var d = ts.data.instant.details;
      var next = (ts.data.next_1_hours && ts.data.next_1_hours.summary && ts.data.next_1_hours.summary.symbol_code) || '';
      var label = next.replace(/_/g, ' ') || 'Live weather';
      label = label.charAt(0).toUpperCase() + label.slice(1);
      return { temp:d.air_temperature, feels:d.air_temperature, humidity:d.relative_humidity, wind:d.wind_speed * 3.6, code:0, label:label, icon:iconFor(0,label), kind:kindFor(label,0), place:place, source:'met.no' };
    });
  }

  function loadWeather() {
    var lat = HQ.lat, lng = HQ.lng, place = HQ.name;
    function chain() {
      return fromOpenMeteo(lat, lng, place)
        .catch(function () { return fromWttr(place); })
        .catch(function () { return fromMetNo(lat, lng, place); })
        .then(apply)
        .catch(function (e) {
          console.warn('All weather APIs failed', e);
          apply({ temp:null, feels:null, humidity:null, wind:null, label:'Weather offline', icon:'🌡️', kind:null, place:place, source:'none' });
        });
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        lat = pos.coords.latitude; lng = pos.coords.longitude; place = 'Your location'; chain();
      }, function () { chain(); }, { timeout: 4000, maximumAge: 600000 });
    } else chain();
  }

  function boot() { loadWeather(); setInterval(loadWeather, 20 * 60 * 1000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.fiReloadWeather = loadWeather;
})();
