import React from "react";
import "./ForecastStrip.css";

export default function ForecastStrip({ forecast }) {
  if (!forecast?.length) return null;

  return (
    <div className="forecast-strip">
      {forecast.map((day, i) => (
        <div key={i} className="forecast-card">
          <span className="forecast-dia">{day.dia}</span>
          <span className="forecast-icon">{day.icon}</span>
          <div className="forecast-temps">
            <span className="forecast-max">{day.maxTemp}°</span>
            <span className="forecast-min">{day.minTemp}°</span>
          </div>
          <span className="forecast-hint">{day.outfitHint}</span>
          {day.lluvia >= 40 && (
            <span className="forecast-lluvia">💧 {day.lluvia}%</span>
          )}
        </div>
      ))}
    </div>
  );
}
