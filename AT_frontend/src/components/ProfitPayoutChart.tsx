import React from 'react';
import styled from 'styled-components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ChartContainer = styled.div`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
`;

const ChartTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 1rem 0;
`;

interface ProfitPayoutChartProps {
  currentPrice: number;
  strikePrice?: number;
  optionType?: 'call' | 'put';
  contractSize: number;
}

export const ProfitPayoutChart: React.FC<ProfitPayoutChartProps> = ({
  currentPrice,
  strikePrice,
  optionType,
  contractSize
}) => {
  if (!strikePrice || !optionType) {
    return null;
  }

  // Generate data points for the profit/loss chart
  const generateChartData = () => {
    const data = [];
    const range = 100; // ±$100 range around current price
    const step = 5; // $5 increments
    
    for (let price = currentPrice - range; price <= currentPrice + range; price += step) {
      let profit = 0;
      let bonus = 0;
      const cost = contractSize * 1; // $1 per contract
      
      if (optionType === 'call' && price > strikePrice) {
        profit = Math.abs(price - strikePrice);
        const rangeDiff = Math.abs(strikePrice - price);
        if (rangeDiff <= 2.5) bonus = 0.06;
        else if (rangeDiff <= 5) bonus = 0.32;
        else if (rangeDiff <= 10) bonus = 1.02;
        else if (rangeDiff <= 15) bonus = 1.32;
      } else if (optionType === 'put' && price < strikePrice) {
        profit = Math.abs(strikePrice - price);
        const rangeDiff = Math.abs(strikePrice - price);
        if (rangeDiff <= 2.5) bonus = 0.06;
        else if (rangeDiff <= 5) bonus = 0.32;
        else if (rangeDiff <= 10) bonus = 1.02;
        else if (rangeDiff <= 15) bonus = 1.32;
      }
      
      const netGain = profit > 0 ? (profit + bonus - cost) : -cost;
      
      data.push({
        price: price,
        profit: netGain,
        label: `$${price.toFixed(0)}`
      });
    }
    
    return data;
  };

  const chartData = generateChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '0.5rem'
        }}>
          <p style={{ color: 'var(--text)', margin: 0 }}>
            {`Price: $${label}`}
          </p>
          <p style={{ 
            color: payload[0].value >= 0 ? 'var(--green)' : 'var(--red)', 
            margin: 0 
          }}>
            {`Net Gain: $${payload[0].value.toFixed(2)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer>
      <ChartTitle>Profit/Loss Chart - {optionType.toUpperCase()} ${strikePrice}</ChartTitle>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis 
            dataKey="label" 
            stroke="var(--text-dim)"
            fontSize={10}
          />
          <YAxis 
            stroke="var(--text-dim)"
            fontSize={8}
            tickFormatter={(value) => `$${value.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="profit" 
            stroke="var(--accent)" 
            strokeWidth={2}
            dot={false}
          />
          {/* Zero line */}
          <Line 
            type="monotone" 
            dataKey={() => 0} 
            stroke="var(--text-dim)" 
            strokeWidth={1}
            strokeDasharray="2 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};


