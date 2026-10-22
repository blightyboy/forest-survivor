import type Phaser from 'phaser';
import { clamp } from './math';
import { settings } from '../meta/Settings';

/** Cap like legacy MAX_DPR — sharper than 1× CSS, without crushing FPS on 3× displays. */
export const MAX_DPR = 1.5;

/** Design reference: keep roughly this many world units on screen (legacy 1100×720). */
export const ZOOM_REF_W = 1100;
export const ZOOM_REF_H = 720;

export function deviceDpr() {
  return Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, MAX_DPR);
}

/**
 * Adaptive zoom from CSS viewport.
 * Legacy clamped the upper end at 1.25, which made large/4K screens show far more
 * world and look "zoomed out". We keep the same reference fit but allow zoom to
 * grow with the window so ~1100×720 world units stay visible.
 */
export function adaptiveZoom(cssW: number, cssH: number) {
  const fit = Math.min(cssW / ZOOM_REF_W, cssH / ZOOM_REF_H);
  return clamp(fit, 0.55, 3.5);
}

/**
 * Phaser camera zoom = adaptive × DPR × user zoomScale.
 * World units stay CSS-pixel sized while the HiDPI buffer stays sharp.
 * `zoomScale` default/max is 0.6; lower values zoom further out.
 */
export function cameraZoom(cssW: number, cssH: number) {
  const user = Number.isFinite(settings.zoomScale) ? settings.zoomScale : 0.6;
  return adaptiveZoom(cssW, cssH) * deviceDpr() * user;
}

/**
 * Visible world AABB for culling / ground sync.
 * Must use `worldView` — with zoom ≠ 1, `scrollX` is NOT the left edge of the view
 * (Phaser zooms around the midpoint), so scrollX-based culls shift off-center.
 */
export function cameraWorldBounds(cam: Phaser.Cameras.Scene2D.Camera, margin = 0) {
  const v = cam.worldView;
  return {
    x0: v.x - margin,
    y0: v.y - margin,
    x1: v.x + v.width + margin,
    y1: v.y + v.height + margin,
  };
}
