import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
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
  padding: 10px 10px 6px;
  display: flex;
  flex-direction: column;
  min-height: clamp(220px, 32vh, 320px);
`;

const Header = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px;
  margin-bottom: 8px;
`;

const TitleStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Title = styled.div`
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const LiveDot = styled.span<{ live: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: ${p => (p.live ? 'var(--up)' : 'var(--down)')};
  box-shadow: 0 0 0 0 ${p => (p.live ? 'rgba(27,196,125,0.55)' : 'rgba(255,93,108,0.55)')};
  animation: ${p => (p.live ? 'liveDotPulse 1.6s ease-out infinite' : 'none')};

  @keyframes liveDotPulse {
    0%   { box-shadow: 0 0 0 0 rgba(27,196,125,0.55); }
    70%  { box-shadow: 0 0 0 6px rgba(27,196,125,0); }
    100% { box-shadow: 0 0 0 0 rgba(27,196,125,0); }
  }
`;

const SubLine = styled.div<{ tone: 'up' | 'down' | 'flat' }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  font-weight: 600;
  color: ${p => (p.tone === 'up' ? 'var(--up)' : p.tone === 'down' ? 'var(--down)' : 'var(--text-dim)')};
`;

const tickFlashUp = keyframes`
  0%   { background: var(--up-dim); color: var(--up); }
  100% { background: transparent; color: var(--text); }
`;
const tickFlashDown = keyframes`
  0%   { background: var(--down-dim); color: var(--down); }
  100% { background: transparent; color: var(--text); }
`;

const PriceTag = styled.div<{ tickTone: 'up' | 'down' | 'flat'; flashKey: number }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 24px;
  color: var(--text);
  padding: 2px 8px;
  border-radius: 8px;
  letter-spacing: 0.01em;
  ${p =>
    p.tickTone === 'up' &&
    css`
      animation: ${tickFlashUp} 480ms ease-out;
    `}
  ${p =>
    p.tickTone === 'down' &&
    css`
      animation: ${tickFlashDown} 480ms ease-out;
    `}
`;

const ChartArea = styled.div`
  position: relative;
  flex: 1;
  min-height: 200px;
`;

const LineBadge = styled.div<{ tone: 'accent' | 'dim' }>`
  position: absolute;
  right: 60px;
  transform: translateY(-50%);
  pointer-events: none;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${p => (p.tone === 'accent' ? 'rgba(245,195,68,0.16)' : 'rgba(125,138,156,0.18)')};
  color: ${p => (p.tone === 'accent' ? 'var(--accent)' : 'var(--text-dim)')};
  border: 1px solid ${p => (p.tone === 'accent' ? 'rgba(245,195,68,0.42)' : 'var(--border)')};
  white-space: nowrap;
  z-index: 2;
`;


// Legend removed in v2 — floating line badges (LineBadge) carry the same
// information directly on the chart, so the bottom legend was duplicate.

const HISTORY_LIMIT = 240;

interface Sample {
  ts: number;
  price: number;
}

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

// BTC/USD ticks at $0.01 on Coinbase. Showing whole-dollar prices made
// most ticks invisible to the trader; we render two decimals everywhere
// the price is a focal point and integer dollars on Y-axis ticks where
// space is tight.
const formatPrice = (n: number, decimals: number = 2): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const formatAxisPrice = (n: number): string =>
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
  const lastPriceRef = useRef<number>(0);
  const [tickTone, setTickTone] = useState<'up' | 'down' | 'flat'>('flat');
  const [tickKey, setTickKey] = useState(0);

  // Pixel-space measurement for floating line badges. We can't rely on
  // recharts label `position: 'right'` because it overlaps the Y-axis
  // tick text (text labels were causing the readability complaint).
  const chartAreaRef = useRef<HTMLDivElement | null>(null);
  const [chartH, setChartH] = useState(0);
  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setChartH(e.contentRect.height);
    });
    ro.observe(el);
    setChartH(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onTick = (data: PriceData) => {
      if (!data.isValid || data.current <= 0) return;
      if (data.timestamp === lastTickRef.current) return;
      lastTickRef.current = data.timestamp;
      const prevPrice = lastPriceRef.current;
      lastPriceRef.current = data.current;
      if (prevPrice > 0) {
        const diff = data.current - prevPrice;
        if (Math.abs(diff) >= 0.005) {
          setTickTone(diff > 0 ? 'up' : 'down');
          setTickKey(k => k + 1);
        }
      }
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

  const sessionTone: 'up' | 'down' | 'flat' =
    priceData.change.amount > 0 ? 'up' : priceData.change.amount < 0 ? 'down' : 'flat';
  const changeAbs = Math.abs(priceData.change.amount);
  const changePct = Math.abs(priceData.change.percentage);
  const fillStop = sessionTone === 'down' ? 'var(--down)' : 'var(--up)';
  const lineStroke = sessionTone === 'down' ? 'var(--down)' : 'var(--up)';

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
        <TitleStack>
          <Title>
            <LiveDot live={isConnected} aria-hidden />
            BTC · USD {!isConnected && <span style={{ color: 'var(--down)' }}>· offline</span>}
          </Title>
          <SubLine tone={sessionTone}>
            {sessionTone === 'flat'
              ? '— flat —'
              : `${sessionTone === 'up' ? '▲' : '▼'} $${formatPrice(changeAbs)} (${changePct.toFixed(2)}%)`}
          </SubLine>
        </TitleStack>
        <PriceTag tickTone={tickTone} flashKey={tickKey} aria-live="polite" key={tickKey}>
          ${formatPrice(spot)}
        </PriceTag>
      </Header>

      <ChartArea ref={chartAreaRef}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 8, right: 56, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillStop} stopOpacity={0.28} />
                <stop offset="100%" stopColor={fillStop} stopOpacity={0} />
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
              tickFormatter={(v: number) => `$${formatAxisPrice(v)}`}
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
              />
            )}

            {showStrike && strike && (
              <ReferenceLine
                y={strike}
                stroke="var(--accent)"
                strokeWidth={1.5}
              />
            )}

            <Area
              type="monotone"
              dataKey="price"
              stroke={lineStroke}
              strokeWidth={2}
              fill="url(#priceFill)"
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3, fill: lineStroke, stroke: 'var(--bg-elev)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        {chartH > 0 && (() => {
          // Recharts margin: { top: 8, bottom: 0 } → plot area = chartH - 8.
          const plotTop = 8;
          const plotH = Math.max(1, chartH - plotTop);
          const [yMin, yMax] = yDomain;
          const yRange = Math.max(1e-9, yMax - yMin);
          const toPx = (v: number) => plotTop + (1 - (v - yMin) / yRange) * plotH;

          const items: Array<{
            key: string; tone: 'accent' | 'dim'; y: number; label: string;
          }> = [];
          if (showEntry && entryPrice) {
            items.push({
              key: 'entry', tone: 'dim',
              y: toPx(entryPrice), label: `entry $${formatPrice(entryPrice)}`,
            });
          }
          if (showStrike && strike) {
            items.push({
              key: 'strike', tone: 'accent',
              y: toPx(strike), label: `target $${formatPrice(strike)}`,
            });
          }
          // Anti-collision: if two badges are within 22px, push them apart
          // around their midpoint so they never overlap.
          if (items.length === 2) {
            const [a, b] = items as [typeof items[number], typeof items[number]];
            const gap = Math.abs(a.y - b.y);
            if (gap < 22) {
              const mid = (a.y + b.y) / 2;
              const sign = a.y <= b.y ? -1 : 1;
              a.y = mid + sign * 12;
              b.y = mid - sign * 12;
            }
          }
          return items.map(it => (
            <LineBadge key={it.key} tone={it.tone} style={{ top: it.y }}>
              {it.label}
            </LineBadge>
          ));
        })()}
      </ChartArea>
    </Container>
  );
};
