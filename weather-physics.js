/* ============================================================================
   WEATHER PHYSICS ENGINE
   Real-time particle effects, wind simulation, light bulb animation
   ============================================================================ */

class WeatherPhysics {
  constructor() {
    this.container = document.getElementById('weatherEffectsContainer');
    this.bulbContainer = document.getElementById('lightBulbContainer');
    this.currentWeather = 'clear';
    this.windStrength = 0;
    this.windAngle = 0;
    this.particles = [];
    this.animationId = null;
    this.enabled = localStorage.getItem('weather_fx') !== 'off';
    
    this.init();
  }

  init() {
    if (!this.container) return;
    
    // Setup light bulb
    this.setupLightBulb();
    
    // Listen for weather updates
    if (window.fetchWeatherFor) {
      this.startWeatherLoop();
    }
  }

  setupLightBulb() {
    if (!this.bulbContainer) return;
    
    // Create bulb structure
    this.bulbContainer.innerHTML = `
      <div class="light-bulb">
        <div class="bulb-glow"></div>
        <div class="bulb-rays">
          <div class="light-ray"></div>
          <div class="light-ray"></div>
          <div class="light-ray"></div>
          <div class="light-ray"></div>
        </div>
      </div>
    `;
  }

  startWeatherLoop() {
    const updateWeather = async () => {
      try {
        const loc = window.fiGetLocation ? await window.fiGetLocation() : null;
        const lat = loc?.lat ?? 27.7410;
        const lng = loc?.lng ?? 85.3360;
        
        const weatherText = await window.fetchWeatherFor(lat, lng);
        this.updateFromWeather(weatherText);
      } catch (e) {
        console.log('Weather update error:', e.message);
      }
      
      // Update every 30 minutes
      setTimeout(updateWeather, 30 * 60 * 1000);
    };
    
    updateWeather();
  }

  updateFromWeather(weatherText) {
    if (!weatherText || !this.enabled) {
      this.clear();
      return;
    }

    const text = weatherText.toLowerCase();
    let weather = 'clear';
    let wind = 0;

    // Detect weather type
    if (text.includes('rain')) weather = 'rain';
    else if (text.includes('snow')) weather = 'snow';
    else if (text.includes('fog') || text.includes('mist')) weather = 'fog';
    else if (text.includes('thunder') || text.includes('storm')) weather = 'thunder';
    else if (text.includes('cloud')) weather = 'cloud';
    else if (text.includes('sun') || text.includes('clear')) weather = 'clear';

    // Extract wind speed (assume format like "12 km/h" or "Wind: 12")
    const windMatch = text.match(/(\d+)\s*(?:km\/h|kmh|wind)/i);
    if (windMatch) {
      wind = Math.min(100, parseInt(windMatch[1]) / 5); // Normalize to 0-100
    }

    if (weather !== this.currentWeather) {
      this.transitionTo(weather, wind);
    } else {
      this.updateWind(wind);
    }
  }

  transitionTo(weather, wind) {
    this.currentWeather = weather;
    this.clear();
    
    document.body.classList.remove('weather-active', 'high-wind');
    
    switch(weather) {
      case 'rain':
        this.createRain(40);
        document.body.classList.add('weather-active');
        break;
      case 'snow':
        this.createSnow(30);
        document.body.classList.add('weather-active');
        break;
      case 'fog':
        this.createFog();
        break;
      case 'thunder':
        this.createThunder();
        document.body.classList.add('weather-active');
        break;
      case 'cloud':
        this.createClouds();
        break;
      case 'clear':
        this.createClearSky();
        break;
    }
    
    this.updateWind(wind);
  }

  createRain(count) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    for (let i = 0; i < count; i++) {
      const drop = document.createElement('div');
      drop.className = 'rain-drop';
      
      const x = Math.random() * vw;
      const delay = Math.random() * 2;
      const duration = 0.5 + Math.random() * 0.5; // Faster rain
      
      drop.style.left = x + 'px';
      drop.style.top = '-20px';
      drop.style.animationDuration = duration + 's';
      drop.style.animationDelay = delay + 's';
      
      this.container.appendChild(drop);
    }
  }

  createSnow(count) {
    const vw = window.innerWidth;
    
    for (let i = 0; i < count; i++) {
      const flake = document.createElement('div');
      flake.className = 'snow-flake';
      
      const x = Math.random() * vw;
      const size = 3 + Math.random() * 6;
      const delay = Math.random() * 3;
      const duration = 8 + Math.random() * 4;
      
      flake.style.left = x + 'px';
      flake.style.top = '-10px';
      flake.style.width = size + 'px';
      flake.style.height = size + 'px';
      flake.style.animationDuration = duration + 's';
      flake.style.animationDelay = delay + 's';
      
      this.container.appendChild(flake);
    }
  }

  createFog() {
    const fog = document.createElement('div');
    fog.className = 'fog-layer';
    fog.style.animationDuration = '6s';
    this.container.appendChild(fog);
  }

  createThunder() {
    // Thunder creates rain + occasional flashes
    this.createRain(50);
    
    // Periodic lightning flashes
    const flash = () => {
      if (this.currentWeather !== 'thunder') return;
      
      const lightning = document.createElement('div');
      lightning.className = 'lightning-flash';
      this.container.appendChild(lightning);
      
      setTimeout(() => lightning.remove(), 300);
      
      // Random interval for next flash
      setTimeout(flash, 2000 + Math.random() * 3000);
    };
    
    flash();
  }

  createClouds() {
    for (let i = 0; i < 3; i++) {
      const cloud = document.createElement('div');
      cloud.className = 'cloud';
      
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * (window.innerHeight * 0.3);
      const size = 80 + Math.random() * 120;
      const duration = 20 + Math.random() * 10;
      
      cloud.style.left = x + 'px';
      cloud.style.top = y + 'px';
      cloud.style.width = size + 'px';
      cloud.style.height = (size * 0.4) + 'px';
      cloud.style.animationDuration = duration + 's';
      
      this.container.appendChild(cloud);
    }
  }

  createClearSky() {
    const clear = document.createElement('div');
    clear.className = 'clear-overlay';
    this.container.appendChild(clear);
  }

  updateWind(strength) {
    this.windStrength = strength;
    
    if (strength > 30) {
      document.body.classList.add('high-wind');
    } else {
      document.body.classList.remove('high-wind');
    }
    
    // Update CSS variable for wind offset in animations
    const offset = (strength / 100) * 50; // Max 50px offset
    document.documentElement.style.setProperty('--wind-offset', offset + 'px');
    document.documentElement.style.setProperty('--weather-opacity', Math.min(1, 0.4 + strength / 150));
    
    // Move light bulb based on wind
    if (this.bulbContainer) {
      this.bulbContainer.style.transform = `translateX(${offset * 0.5}px)`;
    }
    
    // Emit wind lines
    if (strength > 20 && Math.random() < 0.1) {
      this.createWindLine();
    }
  }

  createWindLine() {
    const line = document.createElement('div');
    line.className = 'wind-line';
    
    const y = Math.random() * window.innerHeight;
    const height = 1 + Math.random();
    const duration = 0.5 + Math.random() * 0.5;
    
    line.style.top = y + 'px';
    line.style.height = height + 'px';
    line.style.animationDuration = duration + 's';
    
    this.container.appendChild(line);
    
    setTimeout(() => line.remove(), duration * 1000);
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  // Preview function for admin panel
  static preview(weatherType) {
    const instance = window.weatherPhysics;
    if (!instance) return;
    
    if (weatherType) {
      instance.transitionTo(weatherType, Math.random() * 40);
    } else {
      instance.transitionTo('clear', 0);
    }
  }

  // Toggle weather on/off
  static toggleEnabled(enabled) {
    const instance = window.weatherPhysics;
    if (instance) {
      instance.enabled = enabled;
      if (!enabled) {
        instance.clear();
        document.body.classList.remove('weather-active', 'high-wind');
      }
    }
  }
}

// Initialize weather physics when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.weatherPhysics = new WeatherPhysics();
  });
} else {
  window.weatherPhysics = new WeatherPhysics();
}

// Responsive adjustments
window.addEventListener('resize', () => {
  if (window.weatherPhysics && window.weatherPhysics.currentWeather !== 'clear') {
    // Recreate particles on resize to fit new viewport
    const weather = window.weatherPhysics.currentWeather;
    const wind = window.weatherPhysics.windStrength;
    
    window.weatherPhysics.transitionTo(weather, wind);
  }
});

// Pause animations when tab is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (window.weatherPhysics) {
      window.weatherPhysics.container.style.animation = 'paused';
    }
  } else {
    if (window.weatherPhysics) {
      window.weatherPhysics.container.style.animation = 'running';
    }
  }
});
