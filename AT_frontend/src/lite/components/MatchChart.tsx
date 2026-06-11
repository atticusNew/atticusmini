/**
 * MatchChart — a plain stock chart over a NYC skyline.
 *
 * LIVE: a fixed 30s window. x maps time left→right (left = match start, right =
 * expiry "time line"). The price line GROWS from the left toward the right as
 * time passes — exactly like a normal live stock chart. Each trader's marker is
 * a dot placed ON the price line at the moment they entered, with a horizontal
 * line at that price running across to the expiry time line.
 *
 * ARMING: simple right-anchored preview (covered by the pick-clock overlay).
 *
 * The match countdown lives in the header, not on the chart.
 */

import React from 'react';
import styled from 'styled-components';
import { useElementSize } from '../hooks/useElementSize';

export interface StrikeMark {
  price: number;
  entrySpot: number;
  entryAt: number;
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
  min-height: 0;
  border: 2px solid var(--border-strong);
  border-radius: 18px;
  box-shadow: var(--shadow-hard);
  overflow: hidden;
  position: relative;
  background: #1b2150 url('/images/lite-nyc-skyline.png') center bottom / cover no-repeat;
`;

const PAD = 12;
const YOU_COLOR = '#ffd23f';
const OPP_COLOR = '#41d7ff';

const fmtPrice = (n: number): string =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export const MatchChart: React.FC<MatchChartProps> = ({
  series, now, live, windowStart, durationSec, spot, strikes,
}) => {
  const [ref, { width: W, height: H }] = useElementSize<HTMLDivElement>();
  const durMs = durationSec * 1000;
  const ready = W > 0 && H > 0;

  const left = PAD;
  const right = W - PAD;
  const innerW = Math.max(1, right - left);

  const priceVals = [...series.map(s => s.p), ...strikes.map(s => s.price), spot].filter(v => v > 0);
  const lo = priceVals.length ? Math.min(...priceVals) : (spot || 0);
  const hi = priceVals.length ? Math.max(...priceVals) : (spot || 1);
  const span = Math.max(hi - lo, Math.max(hi * 0.0006, 1));
  const padSpan = span * 0.45;
  const yLo = lo - padSpan;
  const yHi = hi + padSpan;
  const yOf = (p: number): number => PAD + (1 - (p - yLo) / (yHi - yLo)) * (H - 2 * PAD);

  // LIVE: fixed window, time → x (start at left, expiry at right).
  // ARMING: right-anchored scroll.
  const xOf = (t: number): number => {
    if (live && windowStart != null) {
      const frac = Math.min(1, Math.max(0, (t - windowStart) / durMs));
      return left + frac * innerW;
    }
    return right - (now - t) * (innerW / durMs);
  };

  const frontX = live && windowStart != null
    ? left + Math.min(1, Math.max(0, (now - windowStart) / durMs)) * innerW
    : right;
  const spotY = yOf(spot || hi);

  const pathPts = series
    .map(s => ({ x: xOf(s.t), y: yOf(s.p) }))
    .filter(pt => pt.x >= left - 2 && pt.x <= right + 2);
  const linePts = pathPts.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const areaPts = pathPts.length > 1
    ? `${pathPts[0]!.x.toFixed(1)},${(H - PAD).toFixed(1)} ${linePts} ${pathPts[pathPts.length - 1]!.x.toFixed(1)},${(H - PAD).toFixed(1)}`
    : '';

  const gridLevels = [0.18, 0.41, 0.64, 0.87].map(f => yLo + (yHi - yLo) * f);
  const vGrid = [0.2, 0.4, 0.6, 0.8].map(f => left + innerW * f);

  return (
    <Wrap ref={ref}>
      {ready && (
        <svg width={W} height={H} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="litePriceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#efe0ff" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#efe0ff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Legibility veil over the photo */}
          <rect x={0} y={0} width={W} height={H} fill="#0b0d18" opacity={0.32} />

          {/* Subtle stock-chart grid: vertical (time) + horizontal (price) */}
          {vGrid.map((x, i) => (
            <line key={`v${i}`} x1={x} y1={PAD} x2={x} y2={H - PAD}
              stroke="#ffffff" strokeOpacity={0.12} strokeWidth={1} strokeDasharray="2 4" />
          ))}
          {gridLevels.map((p, i) => {
            const y = yOf(p);
            return (
              <g key={`h${i}`}>
                <line x1={left} y1={y} x2={right} y2={y}
                  stroke="#ffffff" strokeOpacity={0.15} strokeWidth={1} strokeDasharray="2 4" />
                <text x={right - 2} y={y - 3} fontSize={9} textAnchor="end"
                  fill="#ffffff" fillOpacity={0.45} style={{ fontFamily: 'var(--font-mono)' }}>
                  {fmtPrice(p)}
                </text>
              </g>
            );
          })}

          {/* Per-trader entry markers: dot ON the line + horizontal line to expiry */}
          {live && strikes.map((s, i) => {
            const color = s.you ? YOU_COLOR : OPP_COLOR;
            const y = yOf(s.entrySpot);
            const ex = xOf(s.entryAt);
            const arrow = s.direction === 'up' ? '▲' : '▼';
            const labelW = s.you ? 46 : 60;
            return (
              <g key={i}>
                <line x1={ex} y1={y} x2={right} y2={y} stroke={color} strokeWidth={2.5}
                  strokeDasharray={s.you ? '0' : '7 5'} strokeOpacity={0.95} />
                <circle cx={ex} cy={y} r={5.5} fill={color} stroke="#140f28" strokeWidth={2} />
                <g transform={`translate(${Math.min(ex, right - labelW)}, ${y - 20})`}>
                  <rect x={0} y={0} width={labelW} height={16} rx={5} fill={color} />
                  <text x={5} y={12} fontSize={10} fontWeight={700} fill="#140f28"
                    style={{ fontFamily: 'var(--font-display)' }}>{arrow} {s.label}</text>
                </g>
              </g>
            );
          })}

          {/* Price line */}
          {areaPts && <polygon points={areaPts} fill="url(#litePriceFill)" />}
          {pathPts.length > 1 && (
            <polyline points={linePts} fill="none" stroke="#efe0ff" strokeWidth={3}
              strokeLinejoin="round" strokeLinecap="round" />
          )}

          {/* Current price marker (price value shown in the top-center pill) */}
          <circle cx={frontX} cy={spotY} r={6} fill="#fff" stroke="#7b5ea7" strokeWidth={3} />
        </svg>
      )}
    </Wrap>
  );
};
