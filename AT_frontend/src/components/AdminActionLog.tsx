import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCanister } from '../contexts/CanisterProvider';

const Section = styled.div`
  background: var(--bg-panel);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border);
`;

const SectionTitle = styled.h2`
  color: var(--text);
  margin-bottom: 1rem;
  font-size: 1.25rem;
`;

const Button = styled.button`
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-right: 1rem;
  margin-bottom: 1rem;

  &:hover {
    background: var(--primary-dark);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ExportButton = styled(Button)`
  background: var(--green);
`;

const LogsContainer = styled.div`
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border);
  max-height: 400px;
  overflow-y: auto;
`;

const LogEntry = styled.div`
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  
  &:last-child {
    border-bottom: none;
  }
`;

const LogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const LogAction = styled.div<{ $action: string }>`
  font-weight: bold;
  color: ${props => {
    switch (props.$action) {
      case 'CREDIT_USER': return '#00ff88';
      case 'APPROVE_WITHDRAWAL': return '#007bff';
      case 'REJECT_WITHDRAWAL': return '#ff4444';
      case 'PROCESS_WITHDRAWAL': return '#28a745';
      default: return 'var(--text)';
    }
  }};
  font-size: 0.9rem;
`;

const LogTimestamp = styled.div`
  color: var(--text-dim);
  font-size: 0.8rem;
  font-family: monospace;
`;

const LogDetails = styled.div`
  color: var(--text);
  font-size: 0.9rem;
  line-height: 1.4;
`;

const LoadingText = styled.div`
  text-align: center;
  color: var(--text-dim);
  padding: 2rem;
`;

const ErrorText = styled.div`
  text-align: center;
  color: #ff4444;
  padding: 1rem;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 6px;
  margin-bottom: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  color: var(--text-dim);
  padding: 2rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border);
`;

interface AdminLog {
  timestamp: number;
  action: string;
  details: string;
}

export const AdminActionLog: React.FC = () => {
  const { tradingCanister } = useCanister();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminLogs = async () => {
    if (!tradingCanister) {
      setError('Trading canister not available');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const adminLogs = await tradingCanister.get_admin_logs() as any;
      
      // ✅ FIX: Convert BigInt values to numbers
      const convertedLogs = adminLogs.map((log: any) => ({
        timestamp: Number(log.timestamp),
        action: log.action,
        details: log.details
      }));
      
      setLogs(convertedLogs);
    } catch (err) {
      console.error('Failed to fetch admin logs:', err);
      setError('Failed to fetch admin logs');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;

    const csvContent = [
      ['Timestamp', 'Action', 'Details'],
      ...logs.map(log => [
        new Date(Number(log.timestamp) / 1000000).toISOString(),
        log.action,
        log.details
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchAdminLogs();
  }, [tradingCanister]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(Number(timestamp) / 1000000).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREDIT_USER': return '💰';
      case 'APPROVE_WITHDRAWAL': return '✅';
      case 'REJECT_WITHDRAWAL': return '❌';
      case 'PROCESS_WITHDRAWAL': return '🔗';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <Section>
        <SectionTitle>📝 Admin Action Log</SectionTitle>
        <LoadingText>Loading admin logs...</LoadingText>
      </Section>
    );
  }

  return (
    <Section>
      <SectionTitle>📝 Admin Action Log</SectionTitle>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <Button onClick={fetchAdminLogs} disabled={loading}>
          🔄 Refresh Logs
        </Button>
        {logs.length > 0 && (
          <ExportButton onClick={exportToCSV}>
            📥 Export CSV
          </ExportButton>
        )}
      </div>

      {error && (
        <ErrorText>{error}</ErrorText>
      )}

      {logs.length === 0 ? (
        <EmptyState>
          No admin actions logged yet. Actions will appear here when admins perform operations.
        </EmptyState>
      ) : (
        <LogsContainer>
          {logs.slice().reverse().map((log, index) => (
            <LogEntry key={index}>
              <LogHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{getActionIcon(log.action)}</span>
                  <LogAction $action={log.action}>{log.action}</LogAction>
                </div>
                <LogTimestamp>{formatTimestamp(log.timestamp)}</LogTimestamp>
              </LogHeader>
              <LogDetails>{log.details}</LogDetails>
            </LogEntry>
          ))}
        </LogsContainer>
      )}

      {logs.length > 0 && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: 'rgba(255, 193, 7, 0.1)', 
          border: '1px solid #ffc107', 
          borderRadius: '6px',
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          <strong>📋 Audit Trail:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
            <li>All admin actions are automatically logged</li>
            <li>Logs include timestamp, action type, and details</li>
            <li>Useful for compliance and audit purposes</li>
            <li>Export functionality for record keeping</li>
          </ul>
        </div>
      )}
    </Section>
  );
};



