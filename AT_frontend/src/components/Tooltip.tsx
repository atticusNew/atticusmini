import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const TooltipIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  font-weight: 600;
  cursor: help;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.8);
  }
`;

const TooltipContent = styled.div<{ visible: boolean; position: 'top' | 'bottom' | 'right' }>`
  position: absolute;
  ${props => {
    switch (props.position) {
      case 'top': return 'bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px;';
      case 'bottom': return 'top: 100%; left: 50%; transform: translateX(-50%); margin-top: 8px;';
      case 'right': return 'left: 100%; top: 50%; transform: translateY(-50%); margin-left: 8px;';
      default: return 'bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px;';
    }
  }};
  
  background: rgba(0, 0, 0, 0.95);
  color: white;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  max-width: ${props => props.position === 'right' ? '280px' : '320px'};
  min-width: 200px;
  white-space: normal;
  text-align: left;
  word-wrap: break-word;
  hyphens: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  
  opacity: ${props => props.visible ? 1 : 0};
  visibility: ${props => props.visible ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  
  z-index: 10000;
  
  /* Arrow */
  &::before {
    content: '';
    position: absolute;
    ${props => {
      switch (props.position) {
        case 'top': return 'top: 100%; left: 50%; transform: translateX(-50%); border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid rgba(0, 0, 0, 0.95);';
        case 'bottom': return 'bottom: 100%; left: 50%; transform: translateX(-50%); border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid rgba(0, 0, 0, 0.95);';
        case 'right': return 'right: 100%; top: 50%; transform: translateY(-50%); border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 6px solid rgba(0, 0, 0, 0.95);';
        default: return 'top: 100%; left: 50%; transform: translateX(-50%); border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid rgba(0, 0, 0, 0.95);';
      }
    }};
    width: 0;
    height: 0;
  }
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    max-width: ${props => props.position === 'right' ? '220px' : '280px'};
    min-width: 160px;
    font-size: 11px;
    padding: 8px 12px;
    
    /* On mobile, always position to the right */
    ${props => props.position === 'right' ? '' : `
      left: 100% !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      margin-left: 8px !important;
      margin-bottom: 0 !important;
      margin-top: 0 !important;
      
      &::before {
        right: 100% !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        border-top: 6px solid transparent !important;
        border-bottom: 6px solid transparent !important;
        border-right: 6px solid rgba(0, 0, 0, 0.95) !important;
        border-left: none !important;
        border-top-color: transparent !important;
        border-bottom-color: transparent !important;
      }
    `};
  }
`;

interface TooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'right';
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  position = 'top',
  children 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(true);
  };

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <TooltipContainer 
      ref={containerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      <TooltipIcon>?</TooltipIcon>
      <TooltipContent visible={isVisible} position={position}>
        {content}
      </TooltipContent>
    </TooltipContainer>
  );
};

export default Tooltip;
