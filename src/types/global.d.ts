export {};

declare global {
  interface Window {
    jungleSave?: {
      load(): Record<string, unknown> | null;
      save(data: Record<string, unknown>): void;
      quit?: () => void;
    };
    jungleUpdate?: {
      pending?: boolean;
    };
  }
}
