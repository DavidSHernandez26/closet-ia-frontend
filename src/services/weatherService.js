import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const WEATHER_CODES = {
  0:  { label: 'Despejado',           icon: '☀️' },
  1:  { label: 'Casi despejado',      icon: '🌤️' },
  2:  { label: 'Parcialmente nublado',icon: '⛅' },
  3:  { label: 'Nublado',             icon: '☁️' },
  45: { label: 'Niebla',              icon: '🌫️' },
  48: { label: 'Niebla helada',       icon: '🌫️' },
  51: { label: 'Llovizna ligera',     icon: '🌦️' },
  53: { label: 'Llovizna',            icon: '🌦️' },
  55: { label: 'Llovizna intensa',    icon: '🌦️' },
  61: { label: 'Lluvia ligera',       icon: '🌧️' },
  63: { label: 'Lluvia',              icon: '🌧️' },
  65: { label: 'Lluvia intensa',      icon: '🌧️' },
  71: { label: 'Nieve ligera',        icon: '🌨️' },
  73: { label: 'Nieve',              icon: '🌨️' },
  75: { label: 'Nieve intensa',       icon: '🌨️' },
  80: { label: 'Chubascos',           icon: '🌦️' },
  81: { label: 'Chubascos moderados', icon: '🌦️' },
  82: { label: 'Chubascos fuertes',   icon: '⛈️' },
  95: { label: 'Tormenta',            icon: '⛈️' },
  96: { label: 'Tormenta con granizo',icon: '⛈️' },
  99: { label: 'Tormenta fuerte',     icon: '⛈️' },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code]
    || WEATHER_CODES[Math.floor(code / 10) * 10]
    || { label: 'Clima variable', icon: '🌡️' };
}

async function getCoordinates() {
  if (Capacitor.isNativePlatform()) {
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
      { headers: { 'Accept-Language': 'es', 'User-Agent': 'ClosetIA/1.0' } }
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
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
    ),
    getCityName(lat, lon),
  ]);

  const { current } = await weatherRes.json();
  const info = getWeatherInfo(current.weather_code);
  const temp = Math.round(current.temperature_2m);
  const feels = Math.round(current.apparent_temperature);
  const wind = Math.round(current.wind_speed_10m);

  return {
    temp,
    feels,
    wind,
    city,
    icon: info.icon,
    label: info.label,
    // Resumen para el AI — incluye contexto de capas/abrigo
    resumen: `${info.label}, ${temp}°C (sensación ${feels}°C), viento ${wind} km/h en ${city}`,
  };
}
