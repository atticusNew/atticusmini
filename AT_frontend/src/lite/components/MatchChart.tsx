/**
 * MatchChart — the duel's centerpiece (custom SVG).
 *
 * A "window into the market": a dusk city-skyline scene (à la the deck's MATCH
 * slide) with a glowing purple price line, price labels down the right edge,
 * and each trader's STRIKE drawn as a barrier line.
 *
 * Timeline behaviour:
 *  - ARMING (pre-trade): no countdown / wall. Price scrolls with "now" pinned
 *    to the right edge so the trader watches the live market before committing.
 *  - LIVE: "now" pins to a fixed marker and a coral DEADLINE wall closes in
 *    from the right edge toward it as the 30s runs out.
 *
 * Pure presentational.
 */

import React from 'react';
import styled from 'styled-components';

export interface StrikeMark {
  price: number;
  direction: 'up' | 'down';
  label: string;
  you: boolean;
}

export interface MatchChartProps {
  series: Array<{ t: number; p: number }>;
  now: number;
  live: boolean;
  windowStart: number | null;
  durationSec: number;
  spot: number;
  strikes: StrikeMark[];
}

const Wrap = styled.div`
  width: 100%;
  flex: 1;
  min-height: clamp(250px, 42vh, 400px);
  border: 2px solid var(--border-strong);
  border-radius: 18px;
  box-shadow: var(--shadow-hard);
  overflow: hidden;
  position: relative;
`;

const VB_W = 400;
const VB_H = 300;
const PAD_X = 10;
const PAD_Y = 18;
const X_NOW = VB_W * 0.62;

// Static dusk skyline silhouette (viewBox units). Baseline at VB_H.
const BUILDINGS: Array<[number, number, number]> = [
  [-2, 34, 70], [30, 22, 110], [50, 28, 64], [76, 18, 96], [92, 30, 130],
  [120, 24, 80], [142, 34, 150], [174, 20, 100], [192, 26, 72], [216, 30, 124],
  [244, 22, 92], [264, 36, 162], [298, 20, 78], [316, 28, 116], [342, 24, 88],
  [364, 30, 140], [392, 16, 70],
];

const fmtPrice = (n: number): string =>
  n >= 1000
    ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export const MatchChart: React.FC<MatchChartProps> = ({
  series, now, live, windowStart, durationSec, spot, strikes,
}) => {
  const durMs = durationSec * 1000;
  const elapsed = windowStart != null ? Math.max(0, now - windowStart) : 0;
  const progress = live && windowStart != null ? Math.min(1, elapsed / durMs) : 0;

  const priceVals = [...series.map(s => s.p), ...strikes.map(s => s.price), spot]
    .filter(v => v > 0);
  const lo = priceVals.length ? Math.min(...priceVals) : (spot || 0);
  const hi = priceVals.length ? Math.max(...priceVals) : (spot || 1);
  const span = Math.max(hi - lo, Math.max(hi * 0.0006, 1));
  const padSpan = span * 0.4;
  const yLo = lo - padSpan;
  const yHi = hi + padSpan;
  const yOf = (p: number): number =>
    PAD_Y + (1 - (p - yLo) / (yHi - yLo)) * (VB_H - 2 * PAD_Y);

  const rightEdge = VB_W - PAD_X;
  const markerX = live ? X_NOW : rightEdge;
  const usableMs = durMs;
  const pxPerMs = (markerX - PAD_X) / usableMs;
  const xOf = (t: number): number => markerX - (now - t) * pxPerMs;

  const pathPts = series
    .map(s => ({ x: xOf(s.t), y: yOf(s.p) }))
    .filter(pt => pt.x >= PAD_X - 2 && pt.x <= rightEdge + 2);
  const linePts = pathPts.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const areaPts = pathPts.length > 1
    ? `${pathPts[0]!.x.toFixed(1)},${(VB_H - PAD_Y).toFixed(1)} ${linePts} ${pathPts[pathPts.length - 1]!.x.toFixed(1)},${(VB_H - PAD_Y).toFixed(1)}`
    : '';

  const deadlineX = rightEdge - progress * (rightEdge - X_NOW);
  const secsLeft = Math.max(0, Math.ceil(durationSec - elapsed / 1000));

  const spotY = yOf(spot || hi);
  const gridLevels = [0.2, 0.5, 0.8].map(f => yLo + (yHi - yLo) * f);

  return (
    <Wrap>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none"
        width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="liteSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#23284f" />
            <stop offset="45%" stopColor="#4a3a73" />
            <stop offset="78%" stopColor="#9a4f6e" />
            <stop offset="100%" stopColor="#e0894e" />
          </linearGradient>
          <linearGradient id="litePriceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#caa8ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#caa8ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="liteWall" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0b0d12" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#0b0d12" stopOpacity="0.42" />
          </linearGradient>
        </defs>

        {/* Dusk sky */}
        <rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#liteSky)" />
        {/* Sun glow */}
        <circle cx={VB_W * 0.5} cy={VB_H * 0.74} r={46} fill="#ffd27a" opacity={0.5} />

        {/* Skyline silhouette */}
        <g fill="#1a1430" opacity={0.82}>
          {BUILDINGS.map(([x, w, h], i) => (
            <rect key={i} x={x} y={VB_H - h} width={w} height={h} rx={1.5} />
          ))}
        </g>

        {/* Price gridlines + right-edge labels */}
        {gridLevels.map((p, i) => {
          const y = yOf(p);
          return (
            <g key={i}>
              <line x1={PAD_X} y1={y} x2={rightEdge} y2={y}
                stroke="#ffffff" strokeOpacity={0.12} strokeWidth={1}
                vectorEffect="non-scaling-stroke" />
              <text x={rightEdge - 2} y={y - 3} fontSize={10} textAnchor="end"
                fill="#ffffff" fillOpacity={0.72}
                style={{ fontFamily: 'var(--font-mono)' }}>
                {fmtPrice(p)}
              </text>
            </g>
          );
        })}

        {/* Consumed-time zone (live only) */}
        {live && (
          <rect x={deadlineX} y={0} width={Math.max(0, VB_W - deadlineX)} height={VB_H}
            fill="url(#liteWall)" />
        )}

        {/* Strike barrier lines */}
        {strikes.map((s, i) => {
          const y = yOf(s.price);
          const color = s.direction === 'up' ? 'var(--up)' : 'var(--down)';
          return (
            <g key={i}>
              <line x1={PAD_X} y1={y} x2={rightEdge} y2={y} stroke={color}
                strokeWidth={2} strokeDasharray={s.you ? '0' : '7 5'}
                vectorEffect="non-scaling-stroke" />
              <g transform={`translate(${PAD_X + 1}, ${y})`}>
                <rect x={0} y={-9} width={s.you ? 50 : 66} height={18} rx={5} fill={color} />
                <text x={6} y={4} fontSize={11} fontWeight={700} fill="#fff"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {s.label}
                </text>
              </g>
            </g>
          );
        })}

        {/* Price area + line */}
        {areaPts && <polygon points={areaPts} fill="url(#litePriceFill)" />}
        {pathPts.length > 1 && (
          <polyline points={linePts} fill="none" stroke="#d9bcff" strokeWidth={3}
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}

        {/* "now" pin (live only) */}
        {live && (
          <line x1={X_NOW} y1={PAD_Y} x2={X_NOW} y2={VB_H - PAD_Y}
            stroke="#ffffff" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke" />
        )}

        {/* Current price marker */}
        <circle cx={markerX} cy={spotY} r={6} fill="#fff" stroke="#7b5ea7"
          strokeWidth={3} vectorEffect="non-scaling-stroke" />

        {/* Deadline wall (live only) */}
        {live && (
          <>
            <line x1={deadlineX} y1={0} x2={deadlineX} y2={VB_H} stroke="var(--down)"
              strokeWidth={3} vectorEffect="non-scaling-stroke" />
            <g transform={`translate(${deadlineX}, 14)`}>
              <rect x={-30} y={-11} width={28} height={20} rx={5} fill="var(--down)" />
              <text x={-16} y={4} fontSize={11} fontWeight={700} fill="#fff" textAnchor="middle"
                style={{ fontFamily: 'var(--font-display)' }}>
                {secsLeft}s
              </text>
            </g>
          </>
        )}
      </svg>
    </Wrap>
  );
};
