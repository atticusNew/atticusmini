/**
 * MatchChart — pixel-accurate SVG over a real NYC skyline photo.
 *
 * LIVE model (what the trader sees):
 *  - The current price is pinned at a fixed point ~62% across; history scrolls
 *    in from the left, so the line "moves" as time passes.
 *  - To the right of the price is the remaining-time runway. A vertical EXPIRY
 *    line sits at its end and slides LEFT toward the price as the clock runs
 *    out ("closing in").
 *  - Each trader has a colored dot + horizontal STRIKE line (gold = you, cyan =
 *    opponent) running to the expiry line, so the lines shorten as it closes in.
 *
 * ARMING: simple right-anchored scroll (covered by the pick-clock overlay).
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

const PAD = 10;
const FRONT_FRAC = 0.62;
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
  const frontX = live ? left + (right - left) * FRONT_FRAC : right;

  const priceVals = [...series.map(s => s.p), ...strikes.map(s => s.price), spot].filter(v => v > 0);
  const lo = priceVals.length ? Math.min(...priceVals) : (spot || 0);
  const hi = priceVals.length ? Math.max(...priceVals) : (spot || 1);
  const span = Math.max(hi - lo, Math.max(hi * 0.0006, 1));
  const padSpan = span * 0.4;
  const yLo = lo - padSpan;
  const yHi = hi + padSpan;
  const yOf = (p: number): number => PAD + (1 - (p - yLo) / (yHi - yLo)) * (H - 2 * PAD);

  // History scrolls so the newest price sits at frontX.
  const pxPerMs = (frontX - left) / durMs;
  const xOf = (t: number): number => frontX - (now - t) * pxPerMs;

  const elapsedSec = live && windowStart != null ? Math.max(0, (now - windowStart) / 1000) : 0;
  const remainingSec = Math.max(0, durationSec - elapsedSec);
  const expiryX = frontX + (remainingSec / durationSec) * (right - frontX);

  const spotY = yOf(spot || hi);

  const pathPts = series
    .map(s => ({ x: xOf(s.t), y: yOf(s.p) }))
    .filter(pt => pt.x >= left - 2 && pt.x <= frontX + 2);
  const linePts = pathPts.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const areaPts = pathPts.length > 1
    ? `${pathPts[0]!.x.toFixed(1)},${(H - PAD).toFixed(1)} ${linePts} ${pathPts[pathPts.length - 1]!.x.toFixed(1)},${(H - PAD).toFixed(1)}`
    : '';

  const gridLevels = [0.25, 0.5, 0.75].map(f => yLo + (yHi - yLo) * f);

  return (
    <Wrap ref={ref}>
      {ready && (
        <svg width={W} height={H} style={{ display: 'block', position: 'relative' }}>
          <defs>
            <linearGradient id="litePriceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#efe0ff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#efe0ff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Legibility veil over the photo */}
          <rect x={0} y={0} width={W} height={H} fill="#0b0d18" opacity={0.3} />

          {/* Faint gridlines */}
          {gridLevels.map((p, i) => (
            <line key={i} x1={left} y1={yOf(p)} x2={right} y2={yOf(p)}
              stroke="#ffffff" strokeOpacity={0.09} strokeWidth={1} />
          ))}

          {/* Remaining-time runway (right of price), and expired veil beyond it */}
          {live && (
            <rect x={expiryX} y={0} width={Math.max(0, W - expiryX)} height={H}
              fill="#0b0d18" opacity={0.42} />
          )}

          {/* Per-trader strike lines (shorten toward the closing expiry) + dots */}
          {live && strikes.map((s, i) => {
            const color = s.you ? YOU_COLOR : OPP_COLOR;
            const sy = yOf(s.price);
            const arrow = s.direction === 'up' ? '▲' : '▼';
            const labelW = (s.you ? 48 : 62);
            return (
              <g key={i}>
                <line x1={left} y1={sy} x2={expiryX} y2={sy} stroke={color} strokeWidth={2.5}
                  strokeDasharray={s.you ? '0' : '8 5'} />
                <circle cx={frontX} cy={sy} r={5} fill={color} stroke="#140f28" strokeWidth={2} />
                <g transform={`translate(${left}, ${sy - 19})`}>
                  <rect x={0} y={0} width={labelW} height={16} rx={5} fill={color} />
                  <text x={5} y={12} fontSize={10} fontWeight={700} fill="#140f28"
                    style={{ fontFamily: 'var(--font-display)' }}>{arrow} {s.label}</text>
                </g>
              </g>
            );
          })}

          {/* Price area + line */}
          {areaPts && <polygon points={areaPts} fill="url(#litePriceFill)" />}
          {pathPts.length > 1 && (
            <polyline points={linePts} fill="none" stroke="#efe0ff" strokeWidth={3}
              strokeLinejoin="round" strokeLinecap="round" />
          )}

          {/* Current price marker + tag */}
          <circle cx={frontX} cy={spotY} r={6} fill="#fff" stroke="#7b5ea7" strokeWidth={3} />
          {spot > 0 && (
            <g transform={`translate(${Math.min(frontX + 9, right - 50)}, ${spotY - 9})`}>
              <rect x={0} y={0} width={50} height={18} rx={5} fill="#2a1f4a" opacity={0.92} />
              <text x={6} y={13} fontSize={10} fontWeight={700} fill="#fff"
                style={{ fontFamily: 'var(--font-mono)' }}>{fmtPrice(spot)}</text>
            </g>
          )}

          {/* Closing-in expiry line + countdown */}
          {live && (
            <>
              <line x1={expiryX} y1={0} x2={expiryX} y2={H} stroke="var(--down)" strokeWidth={3} />
              <g transform={`translate(${expiryX}, 14)`}>
                <rect x={-15} y={-11} width={30} height={20} rx={5} fill="var(--down)" />
                <text x={0} y={4} fontSize={11} fontWeight={700} fill="#fff" textAnchor="middle"
                  style={{ fontFamily: 'var(--font-display)' }}>{Math.ceil(remainingSec)}s</text>
              </g>
            </>
          )}
        </svg>
      )}
    </Wrap>
  );
};
