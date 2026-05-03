import React, { useState } from 'react';
import styled from 'styled-components';
import { geoFenceService } from '../../services/geofence/GeoFenceService';

const Panel = styled.div`
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  margin: 1rem 0;
  font-family: 'Inter', sans-serif;
`;

const Title = styled.h3`
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--text);
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.5rem 0;
  font-size: 0.85rem;
`;

const Label = styled.span`
  color: var(--text-dim);
`;

const Value = styled.span`
  color: var(--text);
  font-weight: 600;
`;

const Button = styled.button<{ active?: boolean; tone?: 'allow' | 'deny' | 'reset' }>`
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: ${p =>
    p.active && p.tone === 'allow'
      ? 'var(--green)'
      : p.active && p.tone === 'deny'
        ? 'var(--red)'
        : 'transparent'};
  color: ${p => (p.active ? '#0f1419' : 'var(--text)')};
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
`;

const List = styled.div`
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-dim);
  word-break: break-all;
`;

export const GeoFencePanel: React.FC = () => {
  const [override, setOverrideState] = useState<'allow' | 'deny' | null>(
    geoFenceService.getAdminOverride(),
  );
  const cfg = geoFenceService.describeConfig();

  const apply = (next: 'allow' | 'deny' | null) => {
    geoFenceService.setAdminOverride(next);
    setOverrideState(next);
  };

  return (
    <Panel>
      <Title>Geo-fence</Title>
      <Row>
        <Label>Deny list:</Label>
        <List>{cfg.denyList.length ? cfg.denyList.join(', ') : '(empty)'}</List>
      </Row>
      <Row>
        <Label>Allow-only:</Label>
        <List>{cfg.allowOnly.length ? cfg.allowOnly.join(', ') : '(disabled)'}</List>
      </Row>
      <Row>
        <Label>Admin override:</Label>
        <Value>{override ?? 'off'}</Value>
      </Row>
      <Row>
        <Button tone="allow" active={override === 'allow'} onClick={() => apply('allow')}>
          Force allow all
        </Button>
        <Button tone="deny" active={override === 'deny'} onClick={() => apply('deny')}>
          Force deny all
        </Button>
        <Button tone="reset" onClick={() => apply(null)}>
          Clear override
        </Button>
      </Row>
    </Panel>
  );
};
