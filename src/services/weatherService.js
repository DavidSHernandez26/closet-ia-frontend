import { Capacitor } from '@capacitor/core';

const WEATHER_CODES = {
  0:  { label: 'Despejado',            icon: '☀️' },
  1:  { label: 'Casi despejado',       icon: '🌤️' },
  2:  { label: 'Parcialmente nublado', icon: '⛅' },
  3:  { label: 'Nublado',              icon: '☁️' },
  45: { label: 'Niebla',               icon: '🌫️' },
  48: { label: 'Niebla helada',        icon: '🌫️' },
  51: { label: 'Llovizna ligera',      icon: '🌦️' },
  53: { label: 'Llovizna',             icon: '🌦️' },
  55: { label: 'Llovizna intensa',     icon: '🌦️' },
  61: { label: 'Lluvia ligera',        icon: '🌧️' },
  63: { label: 'Lluvia',               icon: '🌧️' },
  65: { label: 'Lluvia intensa',       icon: '🌧️' },
  71: { label: 'Nieve ligera',         icon: '🌨️' },
  73: { label: 'Nieve',                icon: '🌨️' },
  75: { label: 'Nieve intensa',        icon: '🌨️' },
  80: { label: 'Chubascos',            icon: '🌦️' },
  81: { label: 'Chubascos moderados',  icon: '🌦️' },
  82: { label: 'Chubascos fuertes',    icon: '⛈️' },
  95: { label: 'Tormenta',             icon: '⛈️' },
  96: { label: 'Tormenta con granizo', icon: '⛈️' },
  99: { label: 'Tormenta fuerte',      icon: '⛈️' },
};

const RAIN_CODES = new Set([51,53,55,61,63,65,80,81,82,95,96,99]);

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function getWeatherInfo(code) {
  return WEATHER_CODES[code]
    || WEATHER_CODES[Math.floor(code / 10) * 10]
    || { label: 'Clima variable', icon: '🌡️' };
}

function getOutfitHint(maxTemp, weatherCode) {
  const lluvia = RAIN_CODES.has(weatherCode);
  let hint;
  if      (maxTemp < 10) hint = 'Abrigo grueso';
  else if (maxTemp < 16) hint = 'Chaqueta o abrigo';
  else if (maxTemp < 22) hint = 'Suéter o capa';
  else if (maxTemp < 28) hint = 'Outfit casual';
  else                   hint = 'Ropa ligera';
  return lluvia ? hint + ' + paraguas' : hint;
}

async function getCoordinates() {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== 'granted') throw new Error('permiso_denegado');
    const pos = await Geolocation.getCurrentPosition({ timeout: 10000 });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      err => reject(err),
      { timeout: 10000 }
    );
  });
}

async function getCityName(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'es', 'User-Agent': 'BeConfident/1.0' } }
    );
    const data = await res.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      'Tu ciudad'
    );
  } catch {
    return 'Tu ciudad';
  }
}

export async function getWeather() {
  const { lat, lon } = await getCoordinates();

  const [weatherRes, city] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
      `&timezone=auto&forecast_days=4`
    ),
    getCityName(lat, lon),
  ]);

  const data = await weatherRes.json();
  const { current, daily } = data;

  const info = getWeatherInfo(current.weather_code);
  const temp  = Math.round(current.temperature_2m);
  const feels = Math.round(current.apparent_temperature);
  const wind  = Math.round(current.wind_speed_10m);

  // Próximos 3 días (índices 1, 2, 3 del daily — índice 0 es hoy)
  const forecast = [1, 2, 3].map(i => {
    const fecha    = new Date(daily.time[i] + 'T12:00:00');
    const wCode    = daily.weather_code[i];
    const wInfo    = getWeatherInfo(wCode);
    const maxTemp  = Math.round(daily.temperature_2m_max[i]);
    const minTemp  = Math.round(daily.temperature_2m_min[i]);
    const lluvia   = daily.precipitation_probability_max[i] ?? 0;
    return {
      dia:       DIAS[fecha.getDay()],
      icon:      wInfo.icon,
      label:     wInfo.label,
      maxTemp,
      minTemp,
      lluvia,
      outfitHint: getOutfitHint(maxTemp, wCode),
    };
  });

  const rainProbHoy = daily.precipitation_probability_max?.[0] ?? 0;

  return {
    temp,
    feels,
    wind,
    city,
    lat,
    lon,
    icon:       info.icon,
    label:      info.label,
    rain_prob:  rainProbHoy,
    forecast,
    resumen:    `${info.label}, ${temp}°C (sensación ${feels}°C), viento ${wind} km/h en ${city}`,
  };
}
