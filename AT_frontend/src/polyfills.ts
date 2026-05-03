// Polyfills for browser compatibility
import { Buffer } from 'buffer';

// Make Buffer globally available
(globalThis as any).Buffer = Buffer;

// Also make it available on window for browser
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

export {};


