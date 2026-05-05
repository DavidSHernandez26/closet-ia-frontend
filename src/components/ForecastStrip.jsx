import React from "react";
import "./ForecastStrip.css";

export default function ForecastStrip({ forecast }) {
  if (!forecast?.length) return null;

  return (
    <div className="forecast-strip flex gap-2 px-4 py-2.5 border-b border-purple-light/[0.07] overflow-x-auto flex-shrink-0">
      {forecast.map((day, i) => (
        <div
          key={i}
          className="forecast-card flex-1 min-w-[80px] flex flex-col items-center gap-[3px] bg-purple-light/[0.05] border border-purple-light/[0.08] rounded-[14px] px-2 py-2.5 cursor-default transition-colors duration-200 hover:bg-purple-light/[0.09]"
        >
          <span className="forecast-dia text-[0.68rem] font-bold tracking-[0.04em] uppercase text-purple-light/75">
            {day.dia}
          </span>
          <span className="text-[1.3rem] leading-none my-0.5">{day.icon}</span>
          <div className="flex gap-[5px] items-baseline">
            <span className="forecast-max text-[0.85rem] font-bold text-cream/[0.92]">
              {day.maxTemp}°
            </span>
            <span className="forecast-min text-[0.72rem] text-cream/[0.45]">
              {day.minTemp}°
            </span>
          </div>
          <span className="forecast-hint text-[0.62rem] text-purple-light/75 text-center leading-[1.3] mt-0.5">
            {day.outfitHint}
          </span>
          {day.lluvia >= 40 && (
            <span className="forecast-lluvia text-[0.6rem] text-blue-300/80 mt-px">
              💧 {day.lluvia}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
