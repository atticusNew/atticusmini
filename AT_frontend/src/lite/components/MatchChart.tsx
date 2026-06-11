/**
 * MatchChart — custom pixel-accurate SVG (no aspect stretching).
 *
 * Model (LIVE): the time axis is a FIXED 30s window. The entry dots sit at a
 * fixed x (where/when each trader entered) and never move. The price marches
 * left→right toward a fixed EXPIRY wall on the right; the gap between the live
 * price front and the wall is the time remaining. Strike barrier lines run from
 * each entry to the wall. This keeps the frame stable — only the price advances.
 *
 * ARMING: simple right-anchored live scroll (covered by the pick-clock overlay).
 *
 * The dusk NYC skyline is a nested aspect-preserving SVG so it never distorts.
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
  height: clamp(220px, 32vh, 300px);
  flex: none;
  border: 2px solid var(--border-strong);
  border-radius: 18px;
  box-shadow: var(--shadow-hard);
  overflow: hidden;
  position: relative;
`;

const PAD = 10;
const YOU_COLOR = '#ffd23f';
const OPP_COLOR = '#41d7ff';

const fmtPrice = (n: number): string =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { maximumFractionDigits: 2 });

/** Dusk sky + recognizable NYC skyline, drawn in its own 400x300 viewBox and
 *  slice-scaled so it always fills the frame without distortion. */
const SkylineScene: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <svg x={0} y={0} width={w} height={h} viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice">
    <defs>
      <linearGradient id="liteSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1b2150" />
        <stop offset="42%" stopColor="#46396f" />
        <stop offset="74%" stopColor="#9a4f6e" />
        <stop offset="100%" stopColor="#e89a52" />
      </linearGradient>
    </defs>
    <rect x={0} y={0} width={400} height={300} fill="url(#liteSky)" />
    <circle cx={208} cy={210} r={46} fill="#ffd27a" opacity={0.42} />
    {/* Bridge */}
    <g stroke="#140f28" strokeWidth={2} fill="none" opacity={0.9}>
      <path d="M0,212 Q16,160 34,150" />
      <path d="M34,150 Q72,196 112,150" />
      <path d="M112,150 Q132,160 150,196" />
    </g>
    <g fill="#171029" opacity={0.92}>
      <path d="M28,252 L28,142 L46,142 L46,252 L41,252 L41,160 L37,160 L37,252 L33,252 L33,160 L31,160 L31,252 Z" />
      <path d="M106,252 L106,142 L124,142 L124,252 L119,252 L119,160 L115,160 L115,252 L111,252 L111,160 L109,160 L109,252 Z" />
      <g stroke="#171029" strokeWidth={1}>
        <line x1="50" y1="180" x2="50" y2="244" /><line x1="62" y1="188" x2="62" y2="244" />
        <line x1="74" y1="190" x2="74" y2="244" /><line x1="86" y1="188" x2="86" y2="244" />
        <line x1="98" y1="180" x2="98" y2="244" />
      </g>
      <rect x={0} y={244} width={152} height={8} />
    </g>
    <g fill="#171029" opacity={0.92}>
      <rect x={150} y={184} width={22} height={116} rx={1} />
      <rect x={174} y={140} width={16} height={160} rx={1} />
      <path d="M196,300 L201,156 L213,156 L218,300 Z" />
      <rect x={206} y={122} width={2} height={34} />
      <rect x={222} y={196} width={20} height={104} rx={1} />
      <rect x={250} y={164} width={30} height={136} rx={1} />
      <rect x={258} y={134} width={14} height={32} />
      <rect x={263} y={104} width={4} height={32} />
      <rect x={286} y={192} width={18} height={108} rx={1} />
      <path d="M312,300 L312,172 L322,152 L332,172 L332,300 Z" />
      <rect x={338} y={184} width={22} height={116} rx={1} />
      <rect x={364} y={158} width={18} height={142} rx={1} />
      <rect x={386} y={192} width={18} height={108} rx={1} />
    </g>
    <g fill="#ffce6b" opacity={0.5}>
      <rect x={258} y={184} width={3} height={4} /><rect x={266} y={196} width={3} height={4} />
      <rect x={203} y={196} width={2} height={4} /><rect x={325} y={196} width={3} height={4} />
      <rect x={156} y={206} width={3} height={4} /><rect x={344} y={208} width={3} height={4} />
      <rect x={370} y={188} width={3} height={4} /><rect x={291} y={214} width={3} height={4} />
    </g>
  </svg>
);

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
  const padSpan = span * 0.4;
  const yLo = lo - padSpan;
  const yHi = hi + padSpan;
  const yOf = (p: number): number => PAD + (1 - (p - yLo) / (yHi - yLo)) * (H - 2 * PAD);

  // LIVE: fixed 30s window, time → x left..right. ARMING: right-anchored scroll.
  const xOf = (t: number): number => {
    if (live && windowStart != null) {
      const frac = Math.min(1, Math.max(0, (t - windowStart) / durMs));
      return left + frac * innerW;
    }
    const pxPerMs = innerW / durMs;
    return right - (now - t) * pxPerMs;
  };

  const elapsed = live && windowStart != null ? Math.max(0, now - windowStart) : 0;
  const progress = Math.min(1, elapsed / durMs);
  const nowX = live ? left + progress * innerW : right;
  const secsLeft = Math.max(0, Math.ceil(durationSec - elapsed / 1000));
  const spotY = yOf(spot || hi);

  const pathPts = series
    .map(s => ({ x: xOf(s.t), y: yOf(s.p) }))
    .filter(pt => pt.x >= left - 2 && pt.x <= right + 2);
  const linePts = pathPts.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const areaPts = pathPts.length > 1
    ? `${pathPts[0]!.x.toFixed(1)},${(H - PAD).toFixed(1)} ${linePts} ${pathPts[pathPts.length - 1]!.x.toFixed(1)},${(H - PAD).toFixed(1)}`
    : '';

  const gridLevels = [0.2, 0.5, 0.8].map(f => yLo + (yHi - yLo) * f);

  return (
    <Wrap ref={ref}>
      {ready && (
        <svg width={W} height={H} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="litePriceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#efe0ff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#efe0ff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <SkylineScene w={W} h={H} />

          {/* Remaining-time runway dimmed (live) */}
          {live && (
            <rect x={nowX} y={0} width={Math.max(0, right - nowX)} height={H} fill="#0b0d12" opacity={0.28} />
          )}

          {/* Gridlines + price labels (left) */}
          {gridLevels.map((p, i) => {
            const y = yOf(p);
            return (
              <g key={i}>
                <line x1={left} y1={y} x2={right} y2={y} stroke="#ffffff" strokeOpacity={0.1} strokeWidth={1} />
                <text x={left + 2} y={y - 3} fontSize={10} fill="#ffffff" fillOpacity={0.7}
                  style={{ fontFamily: 'var(--font-mono)' }}>{fmtPrice(p)}</text>
              </g>
            );
          })}

          {/* Strike barrier lines + fixed entry dots */}
          {live && strikes.map((s, i) => {
            const color = s.you ? YOU_COLOR : OPP_COLOR;
            const sy = yOf(s.price);
            const ex = xOf(s.entryAt);
            const ey = yOf(s.entrySpot);
            const arrow = s.direction === 'up' ? '▲' : '▼';
            const labelW = (s.you ? 50 : 64);
            return (
              <g key={i}>
                <line x1={ex} y1={sy} x2={right} y2={sy} stroke={color} strokeWidth={2.5}
                  strokeDasharray={s.you ? '0' : '8 5'} />
                <line x1={ex} y1={ey} x2={ex} y2={sy} stroke={color} strokeWidth={1.5} strokeOpacity={0.6} />
                <circle cx={ex} cy={ey} r={5} fill={color} stroke="#140f28" strokeWidth={2} />
                <g transform={`translate(${Math.min(ex, right - labelW)}, ${sy - 19})`}>
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

          {/* Live price front marker */}
          <circle cx={nowX} cy={spotY} r={6} fill="#fff" stroke="#7b5ea7" strokeWidth={3} />

          {/* Fixed expiry wall (live) */}
          {live && (
            <>
              <line x1={right} y1={0} x2={right} y2={H} stroke="var(--down)" strokeWidth={3} />
              <g transform={`translate(${right - 2}, 14)`}>
                <rect x={-30} y={-11} width={30} height={20} rx={5} fill="var(--down)" />
                <text x={-15} y={4} fontSize={11} fontWeight={700} fill="#fff" textAnchor="middle"
                  style={{ fontFamily: 'var(--font-display)' }}>{secsLeft}s</text>
              </g>
            </>
          )}
        </svg>
      )}
    </Wrap>
  );
};
