import React, { useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  useEffect(() => {
    // Listen for deposit received events
    const handleDepositReceived = (event: CustomEvent) => {
      const { amount, confirmations } = event.detail;
      
      toast.success(
        `💰 Deposit Received!\n${amount.toFixed(8)} BTC\nConfirmations: ${confirmations}`,
        {
          duration: 8000,
          position: 'top-right',
          style: {
            background: 'var(--bg-panel)',
            color: 'var(--text)',
            border: '1px solid var(--green)',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
            whiteSpace: 'pre-line'
          },
          icon: '💰',
          iconTheme: {
            primary: 'var(--green)',
            secondary: 'var(--bg-panel)'
          }
        }
      );
    };

    // Listen for deposit processing events
    const handleDepositProcessing = (event: CustomEvent) => {
      const { amount, txid } = event.detail;
      
      toast.loading(
        `🔄 Processing Deposit...\n${amount.toFixed(8)} BTC\nTX: ${txid.substring(0, 16)}...`,
        {
          duration: 5000,
          position: 'top-right',
          style: {
            background: 'var(--bg-panel)',
            color: 'var(--text)',
            border: '1px solid var(--primary)',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
            whiteSpace: 'pre-line'
          }
        }
      );
    };

    // Listen for deposit error events
    const handleDepositError = (event: CustomEvent) => {
      const { error, txid } = event.detail;
      
      toast.error(
        `❌ Deposit Error\n${error}\nTX: ${txid.substring(0, 16)}...`,
        {
          duration: 10000,
          position: 'top-right',
          style: {
            background: 'var(--bg-panel)',
            color: 'var(--text)',
            border: '1px solid var(--red)',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
            whiteSpace: 'pre-line'
          },
          icon: '❌',
          iconTheme: {
            primary: 'var(--red)',
            secondary: 'var(--bg-panel)'
          }
        }
      );
    };

    // Add event listeners
    window.addEventListener('depositReceived', handleDepositReceived as EventListener);
    window.addEventListener('depositProcessing', handleDepositProcessing as EventListener);
    window.addEventListener('depositError', handleDepositError as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('depositReceived', handleDepositReceived as EventListener);
      window.removeEventListener('depositProcessing', handleDepositProcessing as EventListener);
      window.removeEventListener('depositError', handleDepositError as EventListener);
    };
  }, []);

  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: 'var(--bg-panel)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '400px'
        },
        // Success toast options
        success: {
          duration: 6000,
          style: {
            border: '1px solid var(--green)'
          },
          iconTheme: {
            primary: 'var(--green)',
            secondary: 'var(--bg-panel)'
          }
        },
        // Error toast options
        error: {
          duration: 8000,
          style: {
            border: '1px solid var(--red)'
          },
          iconTheme: {
            primary: 'var(--red)',
            secondary: 'var(--bg-panel)'
          }
        },
        // Loading toast options
        loading: {
          duration: 5000,
          style: {
            border: '1px solid var(--primary)'
          }
        }
      }}
    />
  );
};

// Export toast functions for manual use
export const showDepositToast = (amount: number, confirmations: number) => {
  toast.success(
    `💰 Deposit Received!\n${amount.toFixed(8)} BTC\nConfirmations: ${confirmations}`,
    {
      duration: 8000,
      position: 'top-right',
      style: {
        background: 'var(--bg-panel)',
        color: 'var(--text)',
        border: '1px solid var(--green)',
        borderRadius: '8px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '500',
        maxWidth: '400px',
        whiteSpace: 'pre-line'
      },
      icon: '💰',
      iconTheme: {
        primary: 'var(--green)',
        secondary: 'var(--bg-panel)'
      }
    }
  );
};

export const showDepositErrorToast = (error: string, txid: string) => {
  toast.error(
    `❌ Deposit Error\n${error}\nTX: ${txid.substring(0, 16)}...`,
    {
      duration: 10000,
      position: 'top-right',
      style: {
        background: 'var(--bg-panel)',
        color: 'var(--text)',
        border: '1px solid var(--red)',
        borderRadius: '8px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '500',
        maxWidth: '400px',
        whiteSpace: 'pre-line'
      },
      icon: '❌',
      iconTheme: {
        primary: 'var(--red)',
        secondary: 'var(--bg-panel)'
      }
    }
  );
};
