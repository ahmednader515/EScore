export {};

declare global {
  interface Window {
    fawaterkCheckout?: (config: Record<string, unknown>) => void;
  }
}
