import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { PriceData } from '../types/trading.types';
import { Tooltip } from './Tooltip';
import { externalPriceService, HistoricalPricePoint } from '../services/externalPriceService';

// ✅ MODIFIED: Main container for chart and buttons
const ChartWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 8px 20px 8px 4px;
  flex-shrink: 0;
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 400px;
  max-width: 100%;
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg,
    #1a1a2e 0%,
    #16213e 50%,
    #0f1419 100%
  );
  box-shadow:
    inset 8px 8px 16px rgba(0, 0, 0, 0.3),
    inset -8px -8px 16px rgba(255, 255, 255, 0.02),
    0 4px 16px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PriceDisplay = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
`;

const CurrentPrice = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
`;

// ✅ MODIFIED: Time range selector styling (inside chart, below x-axis, right-justified)
const TimeRangeContainer = styled.div`
  position: absolute;
  bottom: 0.25rem;  /* ✅ PUSHED LOWER: Even closer to bottom edge */
  right: 1rem;
  z-index: 10;
  display: flex;
  gap: 0.25rem;  /* ✅ REDUCED: Tighter spacing between buttons */
  justify-content: flex-end;
`;

const TimeRangeButton = styled.button<{ active: boolean }>`
  padding: 0.15rem 0.5rem;  /* ✅ REDUCED: Smaller padding for compact buttons */
  border: 1px solid ${props => props.active ? '#ffd700' : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 3px;  /* ✅ REDUCED: Smaller border radius */
  background: ${props => props.active ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.active ? '#ffd700' : 'rgba(255, 255, 255, 0.7)'};
  font-size: 0.7rem;  /* ✅ REDUCED: Smaller font size */
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 2rem;  /* ✅ ADDED: Consistent button width */
  
  &:hover {
    background: rgba(255, 215, 0, 0.1);
    color: #ffd700;
    border-color: #ffd700;
  }
`;

interface PriceChartProps {
  priceData: PriceData;
  isConnected: boolean;
  optionType?: 'call' | 'put' | null;
  strikeOffset?: number;
  isTradeActive?: boolean;
  entryPrice?: number | undefined;
}

const formatNumberCSV = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatChartPrice = (num: number): string => {
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

export const PriceChart: React.FC<PriceChartProps> = ({
  priceData,
  isConnected,
  optionType = null,
  strikeOffset = 0,
  isTradeActive = false,
  entryPrice
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trendHistory, setTrendHistory] = useState<Array<'up' | 'down' | 'same'>>([]);
  const previousPriceRef = useRef<number | null>(null);
  
  // ✅ MODIFIED: Historical data state (now using external APIs)
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(1); // minutes
  const [historicalData, setHistoricalData] = useState<HistoricalPricePoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Chart state management
  const chartTimeRef = useRef<number>(Date.now());
  const priceHistoryRef = useRef<Array<{ price: number; timestamp: number }>>([]);
  const chartIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Performance optimizations
  const rafRef = useRef<number>();
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef<number>(window.devicePixelRatio || 1);
  const chartDimensionsRef = useRef({ width: 0, height: 0, needsUpdate: true });
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 0 });
  
  // ✅ FIXED: Simplified drawing state - no complex cache needed
  const lastDrawTimeRef = useRef<number>(0);
  const isDrawingRef = useRef<boolean>(false);
  
  // Chart state
  const [chartState, setChartState] = useState({
    optionType: null as 'call' | 'put' | null,
    strikeOffset: 0,
    isTradeActive: false,
    entryPrice: undefined as number | undefined,
    frozenStrikePrice: null as number | null
  });

  // ✅ MODIFIED: Fetch historical data from external APIs
  const fetchHistoricalData = async (minutes: number) => {
    if (!isConnected) return;
    
    try {
      setIsLoadingHistory(true);
      console.log('📊 Fetching historical data for', minutes, 'minutes from external APIs');
      
      const data = await externalPriceService.fetchHistoricalData(minutes);
      console.log('📊 External historical data received:', data);
      
      setHistoricalData(data);
      console.log('✅ External historical data loaded:', data.length, 'points');
    } catch (error) {
      console.error('❌ Failed to fetch external historical data:', error);
      setHistoricalData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ✅ FIXED: Single RAF scheduling with proper debouncing
  const scheduleChartUpdate = () => {
    if (isDrawingRef.current) return; // Prevent multiple simultaneous draws
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      isDrawingRef.current = true;
      drawChart();
      isDrawingRef.current = false;
    });
  };

  // Update dimensions
  const updateChartDimensions = () => {
    if (chartRef.current) {
      const rect = chartRef.current.getBoundingClientRect();
      chartDimensionsRef.current = {
        width: rect.width,
        height: rect.height,
        needsUpdate: false
      };
    }
  };

  // ✅ MODIFIED: Fetch historical data when time range changes (now using external APIs)
  useEffect(() => {
    if (isConnected) {
      fetchHistoricalData(selectedTimeRange);
    }
  }, [selectedTimeRange, isConnected]);

  // Track price trends
  useEffect(() => {
    if (previousPriceRef.current !== null && priceData.current !== previousPriceRef.current) {
      const change = priceData.current - previousPriceRef.current;
      const trend: 'up' | 'down' | 'same' = change > 0 ? 'up' : change < 0 ? 'down' : 'same';
      
      setTrendHistory(prev => {
        const newHistory = [...prev, trend];
        return newHistory.slice(-4);
      });
    }
    previousPriceRef.current = priceData.current;
  }, [priceData.current]);

  // ✅ FIXED: Single timer for price history updates only
  useEffect(() => {
    if (!isConnected || !priceData.current || priceData.current <= 0) return;

    if (chartIntervalRef.current) {
      clearInterval(chartIntervalRef.current);
    }

    chartIntervalRef.current = setInterval(() => {
      const now = Date.now();
      chartTimeRef.current = now;
      
      // Only update price history, don't trigger redraw
      priceHistoryRef.current.push({
        price: priceData.current,
        timestamp: now
      });
      
      if (priceHistoryRef.current.length > 60) {
        priceHistoryRef.current = priceHistoryRef.current.slice(-60);
      }
    }, 1000);
    
    return () => {
      if (chartIntervalRef.current) {
        clearInterval(chartIntervalRef.current);
        chartIntervalRef.current = null;
      }
    };
  }, [isConnected, priceData.current]);

  // ✅ FIXED: Single state update effect
  useEffect(() => {
    setChartState(prevState => {
      const newState = {
        ...prevState,
        optionType,
        strikeOffset,
        isTradeActive,
        entryPrice,
        frozenStrikePrice: prevState.frozenStrikePrice
      };

      if (isTradeActive && optionType && strikeOffset > 0 && !prevState.frozenStrikePrice) {
        const entryPriceForStrike = entryPrice || priceData.current;
        const strikePrice = optionType === 'call'
          ? entryPriceForStrike + strikeOffset
          : entryPriceForStrike - strikeOffset;
        newState.frozenStrikePrice = strikePrice;
      } else if (!isTradeActive && prevState.frozenStrikePrice) {
        newState.frozenStrikePrice = null;
      }

      return newState;
    });

    // Only schedule update on state changes, not price changes
    scheduleChartUpdate();
  }, [optionType, strikeOffset, isTradeActive, entryPrice]);

  // ✅ FIXED: Throttled price updates (max 60fps)
  useEffect(() => {
    const now = Date.now();
    if (now - lastDrawTimeRef.current < 16) return; // Throttle to 60fps
    
    lastDrawTimeRef.current = now;
    scheduleChartUpdate();
  }, [priceData.current]);

  // ✅ FIXED: Always clear canvas and redraw everything
  const drawChart = () => {
    if (!canvasRef.current || !chartRef.current || priceData.current <= 0) return;

    const canvas = canvasRef.current;
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctxRef.current = ctx;
    }

    const dpr = dprRef.current;
    
    if (chartDimensionsRef.current.needsUpdate) {
      updateChartDimensions();
    }
    const { width, height } = chartDimensionsRef.current;
    
    const canvasSize = canvasSizeRef.current;
    if (width !== canvasSize.width || height !== canvasSize.height || dpr !== canvasSize.dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
      
      canvasSizeRef.current = { width, height, dpr };
    }

    // ✅ CRITICAL FIX: Always clear canvas before drawing
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 70, right: 60, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const currentPrice = priceData.current;
    let strikePrice = null;
    
    if (isTradeActive && chartState.frozenStrikePrice) {
      strikePrice = chartState.frozenStrikePrice;
    } else if (optionType && strikeOffset > 0) {
      strikePrice = optionType === 'call' 
        ? currentPrice + strikeOffset 
        : currentPrice - strikeOffset;
      
      if (optionType === 'call' && strikePrice <= currentPrice) {
        strikePrice = currentPrice + strikeOffset;
      }
      if (optionType === 'put' && strikePrice >= currentPrice) {
        strikePrice = currentPrice - strikeOffset;
      }
    }

    // Calculate bounds
    const prices = [currentPrice];
    if (entryPrice !== undefined) prices.push(entryPrice);
    if (strikePrice !== null) prices.push(strikePrice);
    
    if (priceHistoryRef.current.length > 0) {
      const historicalPrices = priceHistoryRef.current.map(p => p.price);
      prices.push(...historicalPrices);
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const priceRange = maxPrice - minPrice;
    const getDynamicStepSize = (range: number, strikeOffset?: number): number => {
      if (strikeOffset && strikeOffset >= 15) {
        return Math.max(5, Math.floor(strikeOffset / 3));
      }
      if (strikeOffset && strikeOffset >= 10) {
        return Math.max(3, Math.floor(strikeOffset / 3));
      }
      if (strikeOffset && strikeOffset >= 5) {
        return 2;
      }
      if (strikeOffset && strikeOffset >= 2.5) {
        return 1;
      }
      if (range < 20) return 2;
      if (range < 50) return 2;
      if (range < 100) return 2;
      return 5;
    };
    const stepSize = getDynamicStepSize(priceRange, chartState.strikeOffset);

    let minBound = Math.floor(minPrice / stepSize) * stepSize;
    let maxBound = Math.ceil(maxPrice / stepSize) * stepSize;

    const padding_calc = stepSize * 0.5;
    if (maxPrice > (maxBound - padding_calc)) {
      maxBound += stepSize;
    }
    if (minPrice < (minBound + padding_calc)) {
      minBound -= stepSize;
    }

    if (strikePrice !== null) {
      const strikePadding = stepSize * 2;
      if (strikePrice > maxBound - strikePadding) {
        maxBound = Math.ceil(strikePrice / stepSize) * stepSize + strikePadding;
      }
      if (strikePrice < minBound + strikePadding) {
        minBound = Math.floor(strikePrice / stepSize) * stepSize - strikePadding;
      }
    }

    if ((maxBound - minBound) < stepSize * 3) {
      const center = (maxBound + minBound) / 2;
      minBound = center - (stepSize * 1.5);
      maxBound = center + (stepSize * 1.5);
    }

    const dynamicBounds = {
      min: minBound,
      max: maxBound,
      range: maxBound - minBound,
      stepSize: stepSize
    };

    // Draw background elements (always redraw)
    const now = chartTimeRef.current;
    const numTimeTicks = 6;
    const timeLabels = [];
    
    // ✅ FIX: Dynamic time interval based on selected range
    const getTimeInterval = (rangeMinutes: number) => {
      if (rangeMinutes <= 1) return 10; // 10 seconds for 1m
      if (rangeMinutes <= 5) return 30; // 30 seconds for 5m  
      if (rangeMinutes <= 10) return 60; // 1 minute for 10m
      return 300; // 5 minutes for 30m
    };
    
    const timeIntervalMs = getTimeInterval(selectedTimeRange) * 1000;
    
    for (let i = 0; i < numTimeTicks; i++) {
      const time = now - ((numTimeTicks - 1 - i) * timeIntervalMs);
      timeLabels.push(new Date(time));
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    timeLabels.forEach((time, i) => {
      const x = padding.left + (i / (numTimeTicks - 1)) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      
      // ✅ FIX: Adaptive time formatting based on range
      const timeStr = time.toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: selectedTimeRange <= 5 ? '2-digit' : undefined // Hide seconds for longer ranges
      });
      ctx.fillText(timeStr, x, height - padding.bottom + 20);
    });

    const priceLabels = [];
    const numSteps = Math.floor(dynamicBounds.range / dynamicBounds.stepSize);
    const maxLabels = 5;
    
    if (numSteps <= maxLabels) {
      for (let i = 0; i <= numSteps; i++) {
        const price = dynamicBounds.min + (i * dynamicBounds.stepSize);
        priceLabels.push(price);
      }
    } else {
      const stepInterval = Math.ceil(numSteps / (maxLabels - 1));
      for (let i = 0; i <= numSteps; i += stepInterval) {
        const price = dynamicBounds.min + (i * dynamicBounds.stepSize);
        priceLabels.push(price);
      }
      if (priceLabels[priceLabels.length - 1] !== dynamicBounds.max) {
        priceLabels.push(dynamicBounds.max);
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    
    priceLabels.forEach((price) => {
      const y = height - padding.bottom - ((price - dynamicBounds.min) / dynamicBounds.range) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'right';
      
      ctx.fillText(formatChartPrice(price), padding.left - 10, y + 4);
    });

    // ✅ FIXED: Draw strike line (single line)
    if (strikePrice !== null) {
      const strikeY = height - padding.bottom -
        ((strikePrice - dynamicBounds.min) / dynamicBounds.range) * chartHeight;
      
      if (strikeY >= padding.top && strikeY <= height - padding.bottom) {
        ctx.save();
        const strikeColor = optionType === 'call' ? '#00cc44' : '#ff4444';
        ctx.strokeStyle = strikeColor;
        ctx.lineWidth = isTradeActive ? 3 : 2;
        ctx.setLineDash([8, 4]);
        ctx.shadowColor = strikeColor;
        ctx.shadowBlur = isTradeActive ? 10 : 8;

        ctx.beginPath();
        ctx.moveTo(padding.left, strikeY);
        ctx.lineTo(width - padding.right, strikeY);
        ctx.stroke();

        ctx.shadowBlur = 0;
        // ✅ FIX: Remove text rendering from chart - text now appears in status area
        ctx.restore();
      }
    }

    // ✅ FIXED: Draw entry line (single line)
    if (isTradeActive && entryPrice !== undefined) {
      const entryY = height - padding.bottom - ((entryPrice - dynamicBounds.min) / dynamicBounds.range) * chartHeight;
      
      if (entryY >= padding.top && entryY <= height - padding.bottom) {
        ctx.save();
        const entryColor = '#8a2be2';
        ctx.strokeStyle = entryColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.shadowColor = entryColor;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(padding.left, entryY);
        ctx.lineTo(width - padding.right, entryY);
        ctx.stroke();

        ctx.shadowBlur = 0;
        // ✅ FIX: Remove text rendering from chart - text now appears in status area
        ctx.restore();
      }
    }

    // ✅ MODIFIED: Draw price line with historical data
    const priceHistoryForDrawing = priceHistoryRef.current;
    
    // ✅ MODIFIED: Combine external historical data with real-time data
    const allPriceData = [
      ...historicalData.map(point => ({ price: point.price, timestamp: point.timestamp })),
      ...priceHistoryForDrawing
    ].sort((a, b) => a.timestamp - b.timestamp);
    
    if (allPriceData.length >= 2) {
      const points: Array<{ x: number; y: number }> = [];
      
      // ✅ MODIFIED: Calculate time range based on selected range
      const timeRangeMs = selectedTimeRange * 60 * 1000; // Convert minutes to milliseconds
      
      const visiblePoints = allPriceData.filter((point) => {
        const timeDiff = now - point.timestamp;
        const xRatio = (timeRangeMs - timeDiff) / timeRangeMs;
        return xRatio > 0;
      });
      
      visiblePoints.forEach((point) => {
        const timeDiff = now - point.timestamp;
        const xRatio = Math.max(0, Math.min(1, (timeRangeMs - timeDiff) / timeRangeMs));
        const x = padding.left + xRatio * chartWidth;
        
        const yRatio = (point.price - dynamicBounds.min) / dynamicBounds.range;
        let y = height - padding.bottom - (yRatio * chartHeight);
        
        y = Math.max(padding.top, Math.min(height - padding.bottom, y));
        
        points.push({ x, y });
      });

      const livePriceX = padding.left + chartWidth;
      const livePriceY = height - padding.bottom - ((currentPrice - dynamicBounds.min) / dynamicBounds.range) * chartHeight;
      const livePriceYClamped = Math.max(padding.top, Math.min(height - padding.bottom, livePriceY));
      points.push({ x: livePriceX, y: livePriceYClamped });

      if (points.length >= 2) {
        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        points.forEach((point, i) => {
          if (i === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        
        const lastPoint = points[points.length - 1];
        if (lastPoint) {
          ctx.beginPath();
          ctx.arc(lastPoint.x, lastPoint.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffd700';
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 12;
          ctx.fill();
        }
        
        ctx.restore();
      }
    } else {
      // Show single live price point
      const livePriceX = padding.left + chartWidth;
      const livePriceY = height - padding.bottom - ((currentPrice - dynamicBounds.min) / dynamicBounds.range) * chartHeight;
      const livePriceYClamped = Math.max(padding.top, Math.min(height - padding.bottom, livePriceY));
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(livePriceX, livePriceYClamped, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }
  };

  // Canvas setup
  useEffect(() => {
    if (chartRef.current && !canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      chartRef.current.appendChild(canvas);
      (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;
    }
  }, []);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      chartDimensionsRef.current.needsUpdate = true;
      updateChartDimensions();
      scheduleChartUpdate();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };
  }, []);

  return (
    <ChartWrapper>
      <ChartContainer ref={chartRef}>
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          left: '1rem',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            marginBottom: '0.25rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Tooltip content="Direction of the last price movement" position="right">
              Trend
            </Tooltip>
          </div>
          <div style={{
            display: 'flex',
            gap: '0.25rem',
            alignItems: 'center'
          }}>
            {trendHistory.map((trend, index) => (
              <div key={index} style={{
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: trend === 'up' ? '#00aa33' : trend === 'down' ? '#ff4444' : '#666666'
              }}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
              </div>
            ))}
          </div>
        </div>

        <PriceDisplay>
          <CurrentPrice>
            ${formatNumberCSV(priceData.current)}
          </CurrentPrice>
        </PriceDisplay>
        
        {/* ✅ MODIFIED: Time range selector (inside chart, below x-axis, right-justified) */}
        <TimeRangeContainer>
          {[1, 5, 10, 30].map((minutes) => (
            <TimeRangeButton
              key={minutes}
              active={selectedTimeRange === minutes}
              onClick={() => setSelectedTimeRange(minutes)}
              disabled={isLoadingHistory}
            >
              {minutes}m
            </TimeRangeButton>
          ))}
        </TimeRangeContainer>
      </ChartContainer>
    </ChartWrapper>
  );
};