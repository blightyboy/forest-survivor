export {};

export type UpdateInfo = {
  version?: string;
  currentVersion?: string;
  hasUpdateFeed?: boolean;
};

declare global {
  interface Window {
    /** Wired from main.ts — toggle Phaser rAF vs uncapped timer loop. */
    __forestApplyVsync?: (on: boolean) => void;
    /** Wired from main.ts — re-apply RunScene camera zoom after Options commit. */
    __forestApplyZoom?: (zoomScale?: number) => void;
    forestSave?: {
      load(): Record<string, unknown> | null;
      save(data: Record<string, unknown>): void;
      quit?: () => void;
    };
    forestDisplay?: {
      available?: boolean;
      list(): { resolutions: { width: number; height: number; label?: string }[]; native?: { width: number; height: number } };
      get(): { mode: string; width: number; height: number; available?: boolean };
      apply(settings: { mode?: string; width?: number; height?: number }): unknown;
    };
    forestUpdate?: {
      available?: boolean;
      pending?: () => Promise<UpdateInfo | null>;
      check?: () => Promise<unknown>;
      download?: () => Promise<{ ok?: boolean; error?: string }>;
      install?: () => Promise<unknown>;
      onAvailable?: (cb: (info: UpdateInfo) => void) => void;
      onProgress?: (cb: (p: { percent?: number }) => void) => void;
      onReady?: (cb: (info: UpdateInfo) => void) => void;
      onError?: (cb: (err: { message?: string }) => void) => void;
      onStatus?: (cb: (info: unknown) => void) => void;
    };
  }
}
