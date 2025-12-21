import React from "react";

interface ScoreRingProps {
  score: number;
  size?: "small" | "large";
}

export function ScoreRing({ score, size = "large" }: ScoreRingProps) {
  const radius = size === "large" ? 50 : 20;
  const stroke = size === "large" ? 8 : 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // 动态颜色逻辑
  let colorClass = "text-emerald-500"; // Good
  let bgClass = "text-emerald-100";
  let label = "Excellent";
  
  if (score < 40) {
    colorClass = "text-rose-500"; // Bad
    bgClass = "text-rose-100";
    label = "Bad";
  } else if (score < 70) {
    colorClass = "text-amber-400"; // Poor/Avg
    bgClass = "text-amber-100";
    label = "Poor";
  }

  const dimension = size === "large" ? 140 : 48;
  const fontSize = size === "large" ? "text-4xl" : "text-sm";

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg
          height={dimension}
          width={dimension}
          className="rotate-[-90deg] transition-all duration-500"
        >
          {/* 背景圆环 */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={dimension / 2}
            cy={dimension / 2}
            className={bgClass}
          />
          {/* 进度圆环 */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={dimension / 2}
            cy={dimension / 2}
            className={colorClass}
          />
        </svg>
        {/* 中间数字 */}
        <div className="absolute inset-0 flex items-center justify-center font-bold text-neutral-800">
          <span className={fontSize}>{score}</span>
        </div>
      </div>
      {/* 仅在大尺寸显示文字评价 */}
      {size === "large" && (
        <span className={`mt-2 text-lg font-medium ${colorClass}`}>{label}</span>
      )}
    </div>
  );
}
