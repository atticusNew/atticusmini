/**
 * MatchChart — the duel's centerpiece.
 *
 * Custom SVG (not recharts) so we can choreograph the tension beats:
 *  - the live BTC path scrolls in from the left, current price pinned at a
 *    fixed "now" marker;
 *  - each trader's HIGH/LOW pick draws a horizontal STRIKE line (the price
 *    they're measured against — the thing that decides who profits);
 *  - a coral DEADLINE wall closes in from the right edge toward the marker as
 *    the 30s runs out, literally squeezing the position.
 *
 * Pure presentational: all timing/price state is passed in.
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
  windowStart: number | null;
  durationSec: number;
  spot: number;
  strikes: StrikeMark[];
}

const Wrap = styled.div`
  width: 100%;
  flex: 1;
  min-height: clamp(240px, 40vh, 380px);
  background: var(--bg-elev);
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
const X_NOW = VB_W * 0.64;

export const MatchChart: React.FC<MatchChartProps> = ({
  series, now, windowStart, durationSec, spot, strikes,
}) => {
  const durMs = durationSec * 1000;
  const elapsed = windowStart != null ? Math.max(0, now - windowStart) : 0;
  const progress = windowStart != null ? Math.min(1, elapsed / durMs) : 0;

  // Vertical price scale from everything we need to show.
  const priceVals = [
    ...series.map(s => s.p),
    ...strikes.map(s => s.price),
    spot,
  ].filter(v => v > 0);
  const lo = priceVals.length ? Math.min(...priceVals) : (spot || 0);
  const hi = priceVals.length ? Math.max(...priceVals) : (spot || 1);
  const span = Math.max(hi - lo, Math.max(hi * 0.0004, 1));
  const padSpan = span * 0.35;
  const yLo = lo - padSpan;
  const yHi = hi + padSpan;

  const yOf = (p: number): number =>
    PAD_Y + (1 - (p - yLo) / (yHi - yLo)) * (VB_H - 2 * PAD_Y);

  // Horizontal: "now" pinned at X_NOW; history scrolls left over the window.
  const pxPerMs = (X_NOW - PAD_X) / durMs;
  const xOf = (t: number): number => X_NOW - (now - t) * pxPerMs;

  const pathPts = series
    .map(s => ({ x: xOf(s.t), y: yOf(s.p) }))
    .filter(pt => pt.x >= PAD_X - 2);
  const polyline = pathPts.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');

  // Deadline wall slides from the right edge to the marker as time runs out.
  const rightEdge = VB_W - PAD_X;
  const deadlineX = rightEdge - progress * (rightEdge - X_NOW);
  const secsLeft = Math.max(0, Math.ceil(durationSec - elapsed / 1000));

  const up = strikes.length > 0 && spot >= (strikes[0]?.price ?? spot);
  const pathColor = up ? 'var(--up)' : 'var(--down)';
  const spotY = yOf(spot || hi);

  return (
    <Wrap>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="liteWall" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--down)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--down)" stopOpacity="0.28" />
          </linearGradient>
        </defs>

        {/* Consumed-time zone: grows from the right as the wall closes in. */}
        <rect
          x={deadlineX}
          y={0}
          width={Math.max(0, VB_W - deadlineX)}
          height={VB_H}
          fill="url(#liteWall)"
        />

        {/* Strike lines — the price each trader is measured against. */}
        {strikes.map((s, i) => {
          const y = yOf(s.price);
          const color = s.direction === 'up' ? 'var(--up)' : 'var(--down)';
          return (
            <g key={i}>
              <line
                x1={PAD_X} y1={y} x2={rightEdge} y2={y}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={s.you ? '0' : '7 5'}
                vectorEffect="non-scaling-stroke"
                opacity={0.9}
              />
              <g transform={`translate(${PAD_X + 2}, ${y})`}>
                <rect x={0} y={-9} width={s.you ? 54 : 70} height={18} rx={5} fill={color} />
                <text x={6} y={4} fontSize={11} fontWeight={700} fill="#fff"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {s.label}
                </text>
              </g>
            </g>
          );
        })}

        {/* Live price path. */}
        {pathPts.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke={pathColor}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Position marker (current price) pinned at the "now" line. */}
        <line x1={X_NOW} y1={PAD_Y} x2={X_NOW} y2={VB_H - PAD_Y}
          stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="2 4"
          vectorEffect="non-scaling-stroke" opacity={0.4} />
        <circle cx={X_NOW} cy={spotY} r={6} fill={pathColor}
          stroke="var(--border-strong)" strokeWidth={2} vectorEffect="non-scaling-stroke" />

        {/* The closing-in deadline wall. */}
        <line x1={deadlineX} y1={0} x2={deadlineX} y2={VB_H}
          stroke="var(--down)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        <g transform={`translate(${deadlineX}, 14)`}>
          <rect x={-30} y={-11} width={28} height={20} rx={5} fill="var(--down)" />
          <text x={-16} y={4} fontSize={11} fontWeight={700} fill="#fff" textAnchor="middle"
            style={{ fontFamily: 'var(--font-display)' }}>
            {secsLeft}s
          </text>
        </g>
      </svg>
    </Wrap>
  );
};
