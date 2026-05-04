/**
 * InfoTooltip — tiny "?" disclosure rendered with a native <details>
 * element so it works on touch (tap to toggle) and keyboard
 * (Enter/Space) without managing focus or click-outside state.
 *
 * Used inline in form-row labels for one-line plain-English
 * explanations of jargon-y choices.
 */

import React from 'react';
import styled from 'styled-components';

const Wrap = styled.details`
  position: relative;
  display: inline-block;
  margin-left: 4px;
  vertical-align: middle;

  summary {
    list-style: none;
    cursor: pointer;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    color: var(--text-dim);
    font-family: var(--font-sans);
    font-size: 9px;
    font-weight: 800;
    line-height: 12px;
    text-align: center;
    user-select: none;
    @media (hover: hover) {
      &:hover { color: var(--text); border-color: var(--border-strong); }
    }
  }
  summary::-webkit-details-marker { display: none; }
  summary::marker { content: ''; }

  /* Anchored popover */
  &[open] > div {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 50;
    width: 240px;
    padding: 10px 12px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    color: var(--text);
    white-space: normal;
  }
`;

interface InfoTooltipProps {
  label: string;
  children: React.ReactNode;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ label, children }) => (
  <Wrap>
    <summary aria-label={label} title={label}>?</summary>
    <div role="tooltip">{children}</div>
  </Wrap>
);

export default InfoTooltip;
