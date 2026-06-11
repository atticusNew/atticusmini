/**
 * MatchChart — the duel's centerpiece (custom SVG).
 *
 * A dusk NYC skyline scene (suspension bridge + spired towers, à la the deck's
 * MATCH slide) with a glowing price line, price labels, and each trader's entry
 * marked by a colored dot + a strike barrier line that extends toward the
 * closing deadline.
 *
 * Pacing:
 *  - The current price ("now") is pinned to the CENTER. History scrolls in from
 *    the left so the line appears to move but stays centered.
 *  - ARMING: no countdown / wall (the 5s pick-clock overlay lives in
 *    MatchScreen).
 *  - LIVE: a coral DEADLINE wall closes in from the right edge toward the
 *    centered marker as the 30s elapses.
 */

import React from 'react';
import styled from 'styled-components';

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
  min-height: clamp(320px, 54vh, 520px);
  border: 2px solid var(--border-strong);
  border-radius: 18px;
  box-shadow: var(--shadow-hard);
  overflow: hidden;
  position: relative;
`;

const VB_W = 400;
const VB_H = 340;
const PAD_X = 10;
const PAD_Y = 18;
const X_NOW = VB_W * 0.5;

const YOU_COLOR = '#ffd23f';   // gold — your line
const OPP_COLOR = '#41d7ff';   // cyan — opponent line

const fmtPrice = (n: number): string =>
  n >= 1000
    ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { maximumFractionDigits: 2 });

const Skyline: React.FC = () => (
  <g>
    {/* Brooklyn-Bridge-style suspension bridge (left) */}
    <g stroke="#140f28" strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" opacity={0.9}>
      <path d="M0,232 Q16,176 34,166" />
      <path d="M34,166 Q72,214 112,166" />
      <path d="M112,166 Q132,176 150,214" />
    </g>
    <g fill="#171029" opacity={0.92}>
      {/* towers with twin gothic arches */}
      <path d="M28,272 L28,158 L46,158 L46,272 L41,272 L41,176 L37,176 L37,272 L33,272 L33,176 L31,176 L31,272 Z" />
      <path d="M106,272 L106,158 L124,158 L124,272 L119,272 L119,176 L115,176 L115,272 L111,272 L111,176 L109,176 L109,272 Z" />
      {/* suspenders */}
      <g stroke="#171029" strokeWidth={1} vectorEffect="non-scaling-stroke">
        <line x1="50" y1="196" x2="50" y2="262" />
        <line x1="62" y1="204" x2="62" y2="262" />
        <line x1="74" y1="206" x2="74" y2="262" />
        <line x1="86" y1="204" x2="86" y2="262" />
        <line x1="98" y1="196" x2="98" y2="262" />
      </g>
      {/* deck */}
      <rect x={0} y={262} width={152} height={8} />
    </g>

    {/* Skyline buildings (right) */}
    <g fill="#171029" opacity={0.92}>
      <rect x={150} y={196} width={22} height={144} rx={1} />
      <rect x={174} y={150} width={16} height={190} rx={1} />
      {/* One WTC — tapered with spire */}
      <path d="M196,340 L201,168 L213,168 L218,340 Z" />
      <rect x={206} y={132} width={2} height={38} />
      <rect x={222} y={210} width={20} height={130} rx={1} />
      {/* Empire State — stepped with antenna */}
      <rect x={250} y={176} width={30} height={164} rx={1} />
      <rect x={258} y={146} width={14} height={34} />
      <rect x={263} y={112} width={4} height={36} />
      <rect x={286} y={206} width={18} height={134} rx={1} />
      {/* Chrysler-ish stepped crown */}
      <path d="M312,340 L312,184 L322,162 L332,184 L332,340 Z" />
      <rect x={338} y={196} width={22} height={144} rx={1} />
      <rect x={364} y={168} width={18} height={172} rx={1} />
      <rect x={386} y={206} width={18} height={134} rx={1} />
    </g>
    {/* tiny windows glow */}
    <g fill="#ffce6b" opacity={0.5}>
      <rect x={258} y={196} width={3} height={4} /><rect x={266} y={210} width={3} height={4} />
      <rect x={203} y={210} width={2} height={4} /><rect x={325} y={210} width={3} height={4} />
      <rect x={156} y={220} width={3} height={4} /><rect x={344} y={224} width={3} height={4} />
      <rect x={370} y={200} width={3} height={4} /><rect x={291} y={232} width={3} height={4} />
    </g>
  </g>
);

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
  const padSpan = span * 0.45;
  const yLo = lo - padSpan;
  const yHi = hi + padSpan;
  const yOf = (p: number): number =>
    PAD_Y + (1 - (p - yLo) / (yHi - yLo)) * (VB_H - 2 * PAD_Y);

  const rightEdge = VB_W - PAD_X;
  const pxPerMs = (X_NOW - PAD_X) / durMs;
  const xOf = (t: number): number => X_NOW - (now - t) * pxPerMs;

  const pathPts = series
    .map(s => ({ x: xOf(s.t), y: yOf(s.p) }))
    .filter(pt => pt.x >= PAD_X - 2 && pt.x <= X_NOW + 2);
  const linePts = pathPts.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const areaPts = pathPts.length > 1
    ? `${pathPts[0]!.x.toFixed(1)},${(VB_H - PAD_Y).toFixed(1)} ${linePts} ${pathPts[pathPts.length - 1]!.x.toFixed(1)},${(VB_H - PAD_Y).toFixed(1)}`
    : '';

  const deadlineX = rightEdge - progress * (rightEdge - X_NOW);
  const secsLeft = Math.max(0, Math.ceil(durationSec - elapsed / 1000));
  const spotY = yOf(spot || hi);
  const gridLevels = [0.18, 0.5, 0.82].map(f => yLo + (yHi - yLo) * f);

  return (
    <Wrap>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none"
        width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="liteSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b2150" />
            <stop offset="42%" stopColor="#46396f" />
            <stop offset="74%" stopColor="#9a4f6e" />
            <stop offset="100%" stopColor="#e89a52" />
          </linearGradient>
          <linearGradient id="litePriceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#e9d5ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="liteWall" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0b0d12" stopOpacity="0" />
            <stop offset="100%" stopColor="#0b0d12" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#liteSky)" />
        <circle cx={VB_W * 0.52} cy={VB_H * 0.7} r={50} fill="#ffd27a" opacity={0.45} />
        <Skyline />

        {/* Gridlines + price labels (left) */}
        {gridLevels.map((p, i) => {
          const y = yOf(p);
          return (
            <g key={i}>
              <line x1={PAD_X} y1={y} x2={rightEdge} y2={y} stroke="#ffffff"
                strokeOpacity={0.1} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <text x={PAD_X + 2} y={y - 3} fontSize={10} fill="#ffffff" fillOpacity={0.7}
                style={{ fontFamily: 'var(--font-mono)' }}>
                {fmtPrice(p)}
              </text>
            </g>
          );
        })}

        {/* Consumed-time zone (live) */}
        {live && (
          <rect x={deadlineX} y={0} width={Math.max(0, VB_W - deadlineX)} height={VB_H}
            fill="url(#liteWall)" />
        )}

        {/* Per-trader strike barrier lines + entry dots */}
        {strikes.map((s, i) => {
          const color = s.you ? YOU_COLOR : OPP_COLOR;
          const sy = yOf(s.price);
          const ex = Math.max(PAD_X, xOf(s.entryAt));
          const ey = yOf(s.entrySpot);
          const arrow = s.direction === 'up' ? '▲' : '▼';
          return (
            <g key={i}>
              <line x1={ex} y1={sy} x2={rightEdge} y2={sy} stroke={color} strokeWidth={2.5}
                strokeDasharray={s.you ? '0' : '8 5'} vectorEffect="non-scaling-stroke" />
              {/* connector from entry dot to strike line */}
              <line x1={ex} y1={ey} x2={ex} y2={sy} stroke={color} strokeWidth={1.5}
                strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />
              <circle cx={ex} cy={ey} r={5} fill={color} stroke="#140f28" strokeWidth={2}
                vectorEffect="non-scaling-stroke" />
              {/* label near the wall side */}
              <g transform={`translate(${rightEdge - (s.you ? 52 : 66)}, ${sy - 11})`}>
                <rect x={0} y={0} width={s.you ? 50 : 64} height={18} rx={5} fill={color} />
                <text x={6} y={13} fontSize={11} fontWeight={700} fill="#140f28"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {arrow} {s.label}
                </text>
              </g>
            </g>
          );
        })}

        {/* Price area + line */}
        {areaPts && <polygon points={areaPts} fill="url(#litePriceFill)" />}
        {pathPts.length > 1 && (
          <polyline points={linePts} fill="none" stroke="#efe0ff" strokeWidth={3}
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}

        {/* "now" pin (center) */}
        <line x1={X_NOW} y1={PAD_Y} x2={X_NOW} y2={VB_H - PAD_Y} stroke="#ffffff"
          strokeOpacity={0.28} strokeWidth={1} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
        <circle cx={X_NOW} cy={spotY} r={6.5} fill="#fff" stroke="#7b5ea7" strokeWidth={3}
          vectorEffect="non-scaling-stroke" />

        {/* Deadline wall (live) */}
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
