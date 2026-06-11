import React from 'react';
import styled from 'styled-components';
import {
  Area, AreaChart, ReferenceLine, ResponsiveContainer, YAxis,
} from 'recharts';

export interface MatchChartProps {
  series: Array<{ t: number; p: number }>;
  entrySpot: number | null;
  spot: number;
}

const Wrap = styled.div`
  width: 100%;
  height: 180px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 8px 6px 4px;
`;

/**
 * Compact live BTC path for the duel window. Reference line marks the shared
 * entry spot; the area tints up/down relative to entry so the trader feels the
 * move without reading numbers.
 */
export const MatchChart: React.FC<MatchChartProps> = ({ series, entrySpot, spot }) => {
  const data = series.length > 0 ? series : [{ t: Date.now(), p: spot || 0 }];
  const prices = data.map(d => d.p);
  const ref = entrySpot ?? prices[0] ?? spot ?? 0;
  const lo = Math.min(...prices, ref);
  const hi = Math.max(...prices, ref);
  const pad = Math.max((hi - lo) * 0.25, 1);
  const up = entrySpot != null ? spot >= entrySpot : true;
  const color = up ? 'var(--up)' : 'var(--down)';

  return (
    <Wrap>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
          <defs>
            <linearGradient id="liteMatchFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[lo - pad, hi + pad]} hide />
          {entrySpot != null && (
            <ReferenceLine y={entrySpot} stroke="var(--text-dim)" strokeDasharray="4 4" />
          )}
          <Area
            type="monotone"
            dataKey="p"
            stroke={color}
            strokeWidth={2}
            fill="url(#liteMatchFill)"
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Wrap>
  );
};
