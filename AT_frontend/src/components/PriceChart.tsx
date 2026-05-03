import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { pricingEngine, PriceData } from '../services/OffChainPricingEngine';

export interface PriceChartProps {
  priceData: PriceData;
  isConnected: boolean;
  optionType: 'call' | 'put' | null | undefined;
  strikeOffset: number;
  isTradeActive: boolean;
  entryPrice?: number;
  /** Tenor of the active trade, e.g. '1m'. Used only for the countdown pill. */
  activeTenor?: string;
}

const Container = styled.div`
  position: relative;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 12px 8px;
  display: flex;
  flex-direction: column;
  min-height: 280px;
`;

const Header = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 4px;
  margin-bottom: 8px;
`;

const Title = styled.div`
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

const PriceTag = styled.div<{ tone: 'up' | 'down' | 'flat' }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 22px;
  color: ${p => (p.tone === 'up' ? 'var(--up)' : p.tone === 'down' ? 'var(--down)' : 'var(--text)')};
`;

const ChartArea = styled.div`
  position: relative;
  flex: 1;
  min-height: 220px;
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 4px 0;
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 0.04em;

  span.swatch {
    display: inline-block;
    width: 10px;
    height: 2px;
    margin-right: 6px;
    vertical-align: middle;
  }
  span.entry .swatch { background: var(--text-dim); border-top: 1px dashed var(--text-dim); }
  span.strike .swatch { background: var(--accent); }
  span.spot .swatch { background: var(--up); }
`;

const HISTORY_LIMIT = 240;

interface Sample {
  ts: number;
  price: number;
}

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

const formatPrice = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const computeStrike = (
  entryPrice: number | undefined,
  spot: number,
  optionType: 'call' | 'put' | null | undefined,
  offset: number,
): number | null => {
  if (!optionType || !offset || offset <= 0) return null;
  const base = entryPrice && entryPrice > 0 ? entryPrice : spot;
  if (!base) return null;
  return optionType === 'call' ? base + offset : base - offset;
};

export const PriceChart: React.FC<PriceChartProps> = ({
  priceData,
  isConnected,
  optionType,
  strikeOffset,
  isTradeActive,
  entryPrice,
}) => {
  const [history, setHistory] = useState<Sample[]>([]);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    const onTick = (data: PriceData) => {
      if (!data.isValid || data.current <= 0) return;
      if (data.timestamp === lastTickRef.current) return;
      lastTickRef.current = data.timestamp;
      setHistory(prev => {
        const next = [...prev, { ts: data.timestamp, price: data.current }];
        if (next.length > HISTORY_LIMIT) next.splice(0, next.length - HISTORY_LIMIT);
        return next;
      });
    };
    pricingEngine.addPriceListener(onTick);
    return () => pricingEngine.removePriceListener(onTick);
  }, []);

  const spot = priceData.current;

  const strike = useMemo(
    () => computeStrike(entryPrice, spot, optionType, strikeOffset),
    [entryPrice, spot, optionType, strikeOffset],
  );

  const showEntry = isTradeActive && entryPrice && entryPrice > 0;
  const showStrike = strike !== null && strike > 0 && (!!optionType);

  const tone: 'up' | 'down' | 'flat' = priceData.change.amount > 0 ? 'up' : priceData.change.amount < 0 ? 'down' : 'flat';

  const yDomain = useMemo<[number, number]>(() => {
    const prices = history.map(s => s.price);
    if (showStrike && strike) prices.push(strike);
    if (showEntry && entryPrice) prices.push(entryPrice);
    if (spot) prices.push(spot);
    if (!prices.length) return [0, 1];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = Math.max((max - min) * 0.15, max * 0.0005, 1);
    return [min - pad, max + pad];
  }, [history, showStrike, strike, showEntry, entryPrice, spot]);

  return (
    <Container>
      <Header>
        <Title>BTC · USD {!isConnected && <span style={{ color: 'var(--down)' }}>· offline</span>}</Title>
        <PriceTag tone={tone}>${formatPrice(spot)}</PriceTag>
      </Header>

      <ChartArea>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 8, right: 56, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--up)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--up)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="ts"
              tickFormatter={formatTime}
              minTickGap={48}
              stroke="var(--text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              dataKey="price"
              orientation="right"
              domain={yDomain}
              tickFormatter={(v: number) => `$${formatPrice(v)}`}
              stroke="var(--text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-elev-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text)',
              }}
              labelFormatter={(v: number) => formatTime(v)}
              formatter={(v: number) => [`$${formatPrice(v)}`, 'BTC']}
              cursor={{ stroke: 'var(--border-strong)' }}
            />

            {showEntry && (
              <ReferenceLine
                y={entryPrice}
                stroke="var(--text-dim)"
                strokeDasharray="4 4"
                label={{
                  value: `ENTRY  $${formatPrice(entryPrice!)}`,
                  position: 'right',
                  fill: 'var(--text-dim)',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  offset: 6,
                }}
              />
            )}

            {showStrike && strike && (
              <ReferenceLine
                y={strike}
                stroke="var(--accent)"
                strokeWidth={1.5}
                label={{
                  value: `STRIKE  $${formatPrice(strike)} · ${optionType === 'call' ? 'wins above' : 'wins below'}`,
                  position: 'right',
                  fill: 'var(--accent)',
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  offset: 6,
                }}
              />
            )}

            <Area
              type="linear"
              dataKey="price"
              stroke="var(--up)"
              strokeWidth={1.75}
              fill="url(#priceFill)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartArea>

      <Legend>
        <span className="spot"><span className="swatch" /> Live</span>
        {showEntry && <span className="entry"><span className="swatch" /> Entry</span>}
        {showStrike && <span className="strike"><span className="swatch" /> Strike ({optionType === 'call' ? 'wins above' : 'wins below'})</span>}
      </Legend>
    </Container>
  );
};
