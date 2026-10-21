'use strict';

const ICONS = {
  wood: '<svg viewBox="0 0 24 24"><rect x="2" y="7.5" width="17" height="9" rx="4.5" fill="#9c6a3c" stroke="#2a1b12" stroke-width="1.6"/><path d="M5 10.5h8M7 13.5h8" stroke="#6e4524" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="18.5" cy="12" rx="3.3" ry="4.5" fill="#e8bb80" stroke="#2a1b12" stroke-width="1.6"/><ellipse cx="18.5" cy="12" rx="1.3" ry="2" fill="none" stroke="#b07a42" stroke-width="1"/></svg>',
  meat: '<svg viewBox="0 0 24 24"><path d="M13 13l6.5 6.5" stroke="#2a1b12" stroke-width="4.4" stroke-linecap="round"/><path d="M13 13l6.5 6.5" stroke="#f4ecd8" stroke-width="2.4" stroke-linecap="round"/><circle cx="21" cy="18" r="2" fill="#f4ecd8" stroke="#2a1b12" stroke-width="1.2"/><circle cx="18" cy="21" r="2" fill="#f4ecd8" stroke="#2a1b12" stroke-width="1.2"/><ellipse cx="9.5" cy="9.5" rx="7.6" ry="6.4" transform="rotate(45 9.5 9.5)" fill="#c4553e" stroke="#2a1b12" stroke-width="1.6"/><ellipse cx="7.6" cy="7.6" rx="3.2" ry="1.8" transform="rotate(45 7.6 7.6)" fill="#e07a5f"/></svg>',
  gold: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f5c242" stroke="#8a5d00" stroke-width="1.8"/><circle cx="12" cy="12" r="5.8" fill="none" stroke="#c9901a" stroke-width="1.4"/><ellipse cx="9" cy="8.2" rx="2.2" ry="1.4" fill="#fff4c2"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21z" fill="#ff5a5f" stroke="#5a1214" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="8" cy="9.5" rx="1.8" ry="1.2" fill="#ffb3b5"/></svg>',
  house: '<svg viewBox="0 0 24 24"><path d="M3 11L12 3l9 8" fill="#a8432e" stroke="#2a1b12" stroke-width="1.6" stroke-linejoin="round"/><rect x="5.5" y="10.5" width="13" height="10" fill="#9a6232" stroke="#2a1b12" stroke-width="1.6"/><rect x="10" y="14" width="4" height="6.5" fill="#4a2c14"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><g stroke="#ffcf4a" stroke-width="2" stroke-linecap="round"><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></g><circle cx="12" cy="12" r="5.5" fill="#ffd23f" stroke="#8a5d00" stroke-width="1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M15.5 3a8.5 8.5 0 1 0 5.5 14.5A7 7 0 0 1 15.5 3z" fill="#dfe6ff" stroke="#3b4a7a" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="13" r="1.3" fill="#b9c3e6"/><circle cx="13" cy="17" r="0.9" fill="#b9c3e6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 4l7 8h-4.5v8h-5v-8H5z" fill="currentColor" stroke="#1d130c" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  camp: '<svg viewBox="0 0 24 24"><path d="M2 12L12 3l10 9" fill="#a8432e" stroke="#2a1b12" stroke-width="1.6" stroke-linejoin="round"/><rect x="5" y="11" width="14" height="10" fill="#9a6232" stroke="#2a1b12" stroke-width="1.6"/><rect x="10" y="14.5" width="4" height="6.5" fill="#4a2c14"/><path d="M5 1.5v6" stroke="#2a1b12" stroke-width="1.4"/><path d="M5 1.5l4 1.5-4 1.5z" fill="#e5484d"/></svg>',
  walls: '<svg viewBox="0 0 24 24"><g fill="#9a6232" stroke="#2a1b12" stroke-width="1.3" stroke-linejoin="round"><path d="M2 21V8l2-3 2 3v13z"/><path d="M7 21V7l2-3 2 3v14z"/><path d="M12 21V7l2-3 2 3v14z"/><path d="M17 21V8l2-3 2 3v13z"/></g><path d="M2 14h19" stroke="#5d6b75" stroke-width="2"/></svg>',
  towers: '<svg viewBox="0 0 24 24"><path d="M7 22l2-11M17 22l-2-11" stroke="#6b4022" stroke-width="2.4" stroke-linecap="round"/><rect x="6" y="9" width="12" height="3" fill="#9a6232" stroke="#2a1b12" stroke-width="1.2"/><path d="M5 9l7-7 7 7z" fill="#a8432e" stroke="#2a1b12" stroke-width="1.3" stroke-linejoin="round"/><path d="M8.5 22l6-9M15.5 22l-6-9" stroke="#5a3519" stroke-width="1.3"/></svg>',
  archers: '<svg viewBox="0 0 24 24"><path d="M6 3q9 9 0 18" fill="none" stroke="#8a5a2e" stroke-width="2.4" stroke-linecap="round"/><path d="M6 3v18" stroke="#eee" stroke-width="1"/><path d="M4 12h17" stroke="#6b4022" stroke-width="1.8"/><path d="M22 12l-4-2.5v5z" fill="#c3ced6" stroke="#2a1b12" stroke-width="1"/><path d="M4 12l-2-2M4 12l-2 2" stroke="#fff" stroke-width="1.4"/></svg>',
  barrage: '<svg viewBox="0 0 24 24"><path d="M4 18l5-8 3 3 4-7 4 12H4z" fill="none" stroke="#ffb347" stroke-width="1.6"/><path d="M6 12h12M8 8h8M10 4h4" stroke="#ffe066" stroke-width="2" stroke-linecap="round"/></svg>',
  volley: '<svg viewBox="0 0 24 24"><path d="M4 16l7-10 2 4 7-8" fill="none" stroke="#c3ced6" stroke-width="2" stroke-linecap="round"/><path d="M3 20l6-8M9 20l6-8M15 20l6-8" stroke="#8a5a2e" stroke-width="1.6" stroke-linecap="round"/></svg>',
  campfire: '<svg viewBox="0 0 24 24"><path d="M4 20l16-4M4 16l16 4" stroke="#6b4022" stroke-width="2.6" stroke-linecap="round"/><path d="M12 2c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 0-5.5 2-8.5z" fill="#f7931e" stroke="#8a2d0b" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 9c1.5 2 3 3 3 5a3 3 0 0 1-6 0c0-1.5 1.5-3 3-5z" fill="#ffe066"/></svg>',
  mill: '<svg viewBox="0 0 24 24"><path d="M2 11l3-6h14l3 6z" fill="#7a6a55" stroke="#2a1b12" stroke-width="1.3" stroke-linejoin="round"/><rect x="4" y="11" width="16" height="10" fill="#8d5a2e" stroke="#2a1b12" stroke-width="1.3"/><circle cx="12" cy="16" r="4" fill="#c3ced6" stroke="#2a1b12" stroke-width="1.2" stroke-dasharray="1.6 0.8"/><circle cx="12" cy="16" r="1.2" fill="#5d6b75"/></svg>',
  mine: '<svg viewBox="0 0 24 24"><path d="M4 20l5-10 3 4 4-8 4 14H4z" fill="#5a5f66" stroke="#2a1b12" stroke-width="1.4" stroke-linejoin="round"/><rect x="9" y="10" width="6" height="10" fill="#2a2d32" stroke="#2a1b12" stroke-width="1.2"/><circle cx="18" cy="17" r="3" fill="#f5c242" stroke="#8a5d00" stroke-width="1.2"/></svg>',
  butcher: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" fill="#a07048" stroke="#2a1b12" stroke-width="1.4"/><path d="M4 10l8-7 8 7z" fill="#8a3a2a" stroke="#2a1b12" stroke-width="1.4" stroke-linejoin="round"/><ellipse cx="12" cy="16" rx="4.5" ry="3.2" fill="#c4553e" stroke="#2a1b12" stroke-width="1.2"/></svg>',
  blacksmith: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" fill="#6a6f76" stroke="#2a1b12" stroke-width="1.4"/><path d="M3 10l9-7 9 7z" fill="#8a3a2a" stroke="#2a1b12" stroke-width="1.4" stroke-linejoin="round"/><rect x="7" y="14" width="10" height="4" rx="1" fill="#3a3e44" stroke="#2a1b12" stroke-width="1.1"/><circle cx="17" cy="8" r="3" fill="#ffb347" stroke="#8a2d0b" stroke-width="1.1"/></svg>',
  forgeFire: '<svg viewBox="0 0 24 24"><path d="M12 2c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 0-5.5 2-8.5z" fill="#ff6a3d" stroke="#8a2d0b" stroke-width="1.3"/></svg>',
  forgeWater: '<svg viewBox="0 0 24 24"><path d="M12 3c4 5 7 8 7 12a7 7 0 1 1-14 0c0-4 3-7 7-12z" fill="#4db8ff" stroke="#1a4a68" stroke-width="1.3"/></svg>',
  forgeNature: '<svg viewBox="0 0 24 24"><path d="M12 21c0-8 6-10 9-14-6 1-9 4-9 4s-3-3-9-4c3 4 9 6 9 14z" fill="#6dd46a" stroke="#2a5a1a" stroke-width="1.3"/></svg>',
  forgeEarth: '<svg viewBox="0 0 24 24"><path d="M4 18l4-10 4 5 4-8 4 13H4z" fill="#c4a35a" stroke="#5a3a1a" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  forgeLight: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#ffe66d" stroke="#8a5d00" stroke-width="1.3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke="#ffe66d" stroke-width="1.6" stroke-linecap="round"/></svg>',
  forgeDark: '<svg viewBox="0 0 24 24"><path d="M15 4a8 8 0 1 0 5 14A7 7 0 0 1 15 4z" fill="#9b7bde" stroke="#3b2a68" stroke-width="1.3"/></svg>',
  ember: '<svg viewBox="0 0 24 24"><path d="M12 2c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 0-5.5 2-8.5z" fill="#ff6a3d" stroke="#8a2d0b" stroke-width="1.3"/></svg>',
  tide: '<svg viewBox="0 0 24 24"><path d="M12 3c4 5 7 8 7 12a7 7 0 1 1-14 0c0-4 3-7 7-12z" fill="#4db8ff" stroke="#1a4a68" stroke-width="1.3"/></svg>',
  bloom: '<svg viewBox="0 0 24 24"><path d="M12 21c0-8 6-10 9-14-6 1-9 4-9 4s-3-3-9-4c3 4 9 6 9 14z" fill="#6dd46a" stroke="#2a5a1a" stroke-width="1.3"/></svg>',
  quake: '<svg viewBox="0 0 24 24"><path d="M4 18l4-10 4 5 4-8 4 13H4z" fill="#c4a35a" stroke="#5a3a1a" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  radiance: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#ffe66d" stroke="#8a5d00" stroke-width="1.3"/></svg>',
  umbra: '<svg viewBox="0 0 24 24"><path d="M15 4a8 8 0 1 0 5 14A7 7 0 0 1 15 4z" fill="#9b7bde" stroke="#3b2a68" stroke-width="1.3"/></svg>',
  weapon: '<svg viewBox="0 0 24 24"><path d="M6 21L15.5 7" stroke="#b07a42" stroke-width="2.4" stroke-linecap="round"/><path d="M12.5 4.5l6-3q5 6 .6 11.5l-4.6-3.4z" fill="#dfe7ec" stroke="#2a1b12" stroke-width="1.3"/></svg>',
  mainWeapon: '<svg viewBox="0 0 24 24"><path d="M6 21L15.5 7" stroke="#b07a42" stroke-width="2.4" stroke-linecap="round"/><path d="M12.5 4.5l6-3q5 6 .6 11.5l-4.6-3.4z" fill="#dfe7ec" stroke="#2a1b12" stroke-width="1.3"/></svg>',
  offWeapon: '<svg viewBox="0 0 24 24"><path d="M4 20l10-12" stroke="#b07a42" stroke-width="2.4" stroke-linecap="round"/><path d="M12 4l8 3-2 7-6-4z" fill="#c3ced6" stroke="#2a1b12" stroke-width="1.3"/></svg>',
  armor: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" fill="#c8312b" stroke="#2a1b12" stroke-width="1.5"/></svg>',
  head: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="14" rx="7" ry="6" fill="#c8312b" stroke="#2a1b12" stroke-width="1.4"/><path d="M6 12c1-5 4-8 6-8s5 3 6 8" fill="#a82822" stroke="#2a1b12" stroke-width="1.3"/></svg>',
  chest: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" fill="#c8312b" stroke="#2a1b12" stroke-width="1.5"/></svg>',
  shoulders: '<svg viewBox="0 0 24 24"><path d="M3 10l5-3 4 2 4-2 5 3v4l-5-2-4 2-4-2-5 2z" fill="#a07048" stroke="#2a1b12" stroke-width="1.3"/></svg>',
  hands: '<svg viewBox="0 0 24 24"><path d="M8 4h3v7H8zm5 0h3v7h-3zM7 12h10v7H7z" fill="#c4553e" stroke="#2a1b12" stroke-width="1.2"/></svg>',
  belt: '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="5" rx="1.5" fill="#8a5a2e" stroke="#2a1b12" stroke-width="1.3"/><rect x="10" y="9" width="4" height="7" rx="1" fill="#f5c242" stroke="#8a5d00" stroke-width="1.1"/></svg>',
  pants: '<svg viewBox="0 0 24 24"><path d="M7 4h10l-1 16H13l-1-8-1 8H8z" fill="#5a6a7a" stroke="#2a1b12" stroke-width="1.3"/></svg>',
  boots: '<svg viewBox="0 0 24 24"><path d="M7 4h4v10l7 2v4H7z" fill="#6b4022" stroke="#2a1b12" stroke-width="1.3"/></svg>',
  trinket: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="#ffe066" stroke="#8a5d00" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="#f5c242"/></svg>',
  relic: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#c46bff" stroke="#4a2a6a" stroke-width="1.3"/></svg>',
  leftRing: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.5" fill="none" stroke="#f5c242" stroke-width="3"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#8a5d00" stroke-width="1.2"/></svg>',
  rightRing: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.5" fill="none" stroke="#c3ced6" stroke-width="3"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#2a1b12" stroke-width="1.2"/></svg>',
  necklace: '<svg viewBox="0 0 24 24"><path d="M6 5c3 6 4 8 6 8s3-2 6-8" fill="none" stroke="#f5c242" stroke-width="1.8"/><circle cx="12" cy="16" r="3.5" fill="#e5484d" stroke="#2a1b12" stroke-width="1.2"/></svg>',
  health: '<svg viewBox="0 0 24 24"><path d="M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21z" fill="#ff5a5f" stroke="#5a1214" stroke-width="1.6"/></svg>',
  move: '<svg viewBox="0 0 24 24"><path d="M7 5h6l1 7 5 2.5V18H6z" fill="#8a5a2e" stroke="#2a1b12" stroke-width="1.5"/><path d="M1.5 10h4M0.5 14h4" stroke="#7fd3ff" stroke-width="2" stroke-linecap="round"/></svg>',
  flatDmg: '<svg viewBox="0 0 24 24"><path d="M4 14l8-10 8 10-8 7z" fill="#ffd23f" stroke="#8a5d00" stroke-width="1.4"/></svg>',
  dmgPct: '<svg viewBox="0 0 24 24"><path d="M4 14l8-10 8 10-8 7z" fill="#ff8a3d" stroke="#8a2d0b" stroke-width="1.4"/></svg>',
  elemFlat: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="#4db8ff" stroke="#1a4a68" stroke-width="1.4"/></svg>',
  elemPct: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="#c46bff" stroke="#4a2a6a" stroke-width="1.4"/></svg>',
  income: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f5c242" stroke="#8a5d00" stroke-width="1.6"/></svg>',
  wallHp: '<svg viewBox="0 0 24 24"><g fill="#9a6232" stroke="#2a1b12" stroke-width="1.3"><path d="M2 21V8l2-3 2 3v13z"/><path d="M7 21V7l2-3 2 3v14z"/></g></svg>',
  towerDmg: '<svg viewBox="0 0 24 24"><path d="M5 9l7-7 7 7z" fill="#a8432e" stroke="#2a1b12" stroke-width="1.3"/><rect x="6" y="9" width="12" height="12" fill="#9a6232" stroke="#2a1b12" stroke-width="1.2"/></svg>',
  campHeal: '<svg viewBox="0 0 24 24"><path d="M12 2c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-3.5 2-4.5z" fill="#f7931e" stroke="#8a2d0b" stroke-width="1.3"/></svg>',
  smithLuck: '<svg viewBox="0 0 24 24"><circle cx="17" cy="8" r="3" fill="#ffb347" stroke="#8a2d0b" stroke-width="1.1"/><rect x="4" y="10" width="16" height="11" fill="#6a6f76" stroke="#2a1b12" stroke-width="1.4"/></svg>',
  rerolls: '<svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="#7fd3ff" stroke-width="2.4" stroke-linecap="round"/><path d="M4 4v5h5" fill="none" stroke="#7fd3ff" stroke-width="2.4"/></svg>',
  banishes: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#ff6b6b" stroke-width="2.6" stroke-linecap="round"/></svg>',
  axe: '<svg viewBox="0 0 24 24"><path d="M6 21L15.5 7" stroke="#2a1b12" stroke-width="4.2" stroke-linecap="round"/><path d="M6 21L15.5 7" stroke="#b07a42" stroke-width="2.4" stroke-linecap="round"/><path d="M12.5 4.5l6-3q5 6 .6 11.5l-4.6-3.4z" fill="#dfe7ec" stroke="#2a1b12" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  hatchet: '<svg viewBox="0 0 24 24"><path d="M4 20l10-12" stroke="#b07a42" stroke-width="2.6" stroke-linecap="round"/><path d="M12 4l8 3-2 7-6-4z" fill="#c3ced6" stroke="#2a1b12" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  saw: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="#c3ced6" stroke="#2a1b12" stroke-width="1.4"/><circle cx="12" cy="12" r="2" fill="#5d6b75"/><path d="M12 3.5l1.2 3.4L12 10 10.8 6.9zM20.5 12l-3.4 1.2L14 12l3.1-1.2zM12 20.5l-1.2-3.4L12 14l1.2 3.1zM3.5 12l3.4-1.2L10 12 6.9 13.2z" fill="#8a9096"/></svg>',
  aura: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7" fill="none" stroke="#f7931e" stroke-width="2"/><path d="M12 3c2 3 4 4.5 4 7a4 4 0 0 1-8 0c0-1.5 1-2.8 1.6-3.5 0 1.4.7 2.2 1.4 2.2C11 6.8 11 5 12 3z" fill="#ffe066" stroke="#8a2d0b" stroke-width="1.2"/></svg>',
  dynamite: '<svg viewBox="0 0 24 24"><rect x="9" y="6" width="6" height="14" rx="2" fill="#e5484d" stroke="#2a1b12" stroke-width="1.4"/><rect x="9" y="11" width="6" height="3" fill="#5a3a22"/><path d="M12 6c2-2 4-2 5-1" fill="none" stroke="#2a1b12" stroke-width="1.4"/><circle cx="17.5" cy="4.2" r="1.6" fill="#ffe066"/></svg>',
  pike: '<svg viewBox="0 0 24 24"><path d="M4 20l11-11" stroke="#9a6232" stroke-width="2.4" stroke-linecap="round"/><path d="M13 5l7 3-4 6-5-4z" fill="#c3ced6" stroke="#2a1b12" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  crossbow: '<svg viewBox="0 0 24 24"><path d="M4 12h16" stroke="#6b4022" stroke-width="2"/><path d="M7 6q6 6 0 12" fill="none" stroke="#8a5a2e" stroke-width="2.2"/><path d="M20 12l-4-2.4v4.8z" fill="#c3ced6" stroke="#2a1b12" stroke-width="1"/></svg>',
  spikes: '<svg viewBox="0 0 24 24"><path d="M4 20V9l3-6 3 6v11zM11 20V8l3-6 3 6v12zM17 20v-8l2.5-5 2.5 5v8z" fill="#9a6232" stroke="#2a1b12" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  hammerfall: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="8" rx="1.5" fill="#6a7076" stroke="#2a1b12" stroke-width="1.4"/><rect x="10" y="10" width="4" height="11" rx="1" fill="#8a5a2e" stroke="#2a1b12" stroke-width="1.3"/></svg>',
  longbow: '<svg viewBox="0 0 24 24"><path d="M5 3q12 9 0 18" fill="none" stroke="#8a5a2e" stroke-width="2.4" stroke-linecap="round"/><path d="M5 3v18" stroke="#eee" stroke-width="1"/><path d="M4 12h16" stroke="#6b4022" stroke-width="1.8"/><path d="M21 12l-4-2.6v5.2z" fill="#c3ced6" stroke="#2a1b12" stroke-width="1"/></svg>',
  knife: '<svg viewBox="0 0 24 24"><path d="M4 18l11-11" stroke="#8a5a2e" stroke-width="2.4" stroke-linecap="round"/><path d="M13 4l7 3-3 7-6-4z" fill="#dfe7ec" stroke="#2a1b12" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  guarddog: '<svg viewBox="0 0 24 24"><ellipse cx="11" cy="14" rx="8" ry="5" fill="#c4a574" stroke="#2a1b12" stroke-width="1.4"/><ellipse cx="17" cy="11" rx="4.5" ry="3.8" fill="#c4a574" stroke="#2a1b12" stroke-width="1.3"/><path d="M14 8l2-4 2 3" fill="#a88858" stroke="#2a1b12" stroke-width="1.1"/><circle cx="19" cy="10" r="1" fill="#2a1b12"/></svg>',
  greed: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f5c242" stroke="#8a5d00" stroke-width="1.6"/><path d="M9 10h6M9 14h6" stroke="#8a5d00" stroke-width="1.6" stroke-linecap="round"/></svg>',
  devil: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-7-10a5 5 0 0 1 10 0c0 1.2-.4 2.2-.9 3" fill="#e5484d" stroke="#5a1214" stroke-width="1.4"/><path d="M7 5l-2-3M17 5l2-3" stroke="#e5484d" stroke-width="2.2" stroke-linecap="round"/><circle cx="9.5" cy="11" r="1.2" fill="#2a1b12"/><circle cx="14.5" cy="11" r="1.2" fill="#2a1b12"/></svg>',
  angel: '<svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="4.5" fill="#ffe8b0" stroke="#8a5d00" stroke-width="1.3"/><path d="M4 12c3-1 5 1 8 1s5-2 8-1c-2 4-5 6-8 8-3-2-6-4-8-8z" fill="#dfe6ff" stroke="#3b4a7a" stroke-width="1.2"/><path d="M9 4l3-2 3 2" fill="none" stroke="#ffe066" stroke-width="1.6" stroke-linecap="round"/></svg>',
  might: '<svg viewBox="0 0 24 24"><path d="M4 14l8-10 8 10-8 7z" fill="#ffd23f" stroke="#8a5d00" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  haste: '<svg viewBox="0 0 24 24"><path d="M8 3h6l-2 8h5L9 21l2-8H7z" fill="#7fd3ff" stroke="#1a4a68" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  dash: '<svg viewBox="0 0 24 24"><path d="M3 12h10M9 6l6 6-6 6" fill="none" stroke="#7fd3ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 8h7M16 12h5M14 16h7" stroke="#b8e8ff" stroke-width="1.8" stroke-linecap="round"/></svg>',
  area: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="#9be37a" stroke-width="2" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="3" fill="#9be37a"/></svg>',
  speed: '<svg viewBox="0 0 24 24"><path d="M7 5h6l1 7 5 2.5V18H6z" fill="#8a5a2e" stroke="#2a1b12" stroke-width="1.5" stroke-linejoin="round"/><path d="M1.5 10h4M0.5 14h4" stroke="#7fd3ff" stroke-width="2" stroke-linecap="round"/></svg>',
  magnet: '<svg viewBox="0 0 24 24"><path d="M5 4v8a7 7 0 0 0 14 0V4h-4.5v8a2.5 2.5 0 0 1-5 0V4z" fill="#e5484d" stroke="#2a1b12" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 4h4.5v3H5zM14.5 4H19v3h-4.5z" fill="#dfe7ec" stroke="#2a1b12" stroke-width="1.2"/></svg>',
  vitality: '<svg viewBox="0 0 24 24"><path d="M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21z" fill="#ff5a5f" stroke="#5a1214" stroke-width="1.6"/></svg>',
  armor: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" fill="#c8312b" stroke="#2a1b12" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  regen: '<svg viewBox="0 0 24 24"><path d="M12 4c4 3 7 6 7 10a7 7 0 1 1-14 0c0-2.2 1.2-4.2 2.4-5.5" fill="#9ef08a" stroke="#2a5a1a" stroke-width="1.4"/></svg>',
  luck: '<svg viewBox="0 0 24 24"><path d="M12 3l2.4 6.8H21l-5.4 4.2 2 7L12 17.2 6.4 21l2-7L3 9.8h6.6z" fill="#ffe066" stroke="#8a5d00" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  amount: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4.5" fill="#dfe7ec" stroke="#2a1b12" stroke-width="1.3"/><circle cx="16" cy="12" r="4.5" fill="#dfe7ec" stroke="#2a1b12" stroke-width="1.3"/></svg>',
  heal: '<svg viewBox="0 0 24 24"><path d="M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21z" fill="#9ef08a" stroke="#2a5a1a" stroke-width="1.6"/></svg>',
};

const RES_ORDER = ['wood', 'meat', 'gold'];

const TUTORIAL_CONTENT = {
  enemy: {
    title: 'Know your beasts',
    body:
      '<p>When you meet a threat, look for these markings:</p>' +
      '<ul>' +
        '<li><b>Veterancy stars</b> — bronze (1–5), then silver (1–5), then gold (1–5). Higher tiers mean tougher fights and better loot.</li>' +
        '<li><b>Variants</b> — <b>Dire</b> (darker brutes), <b>Necromantic</b> (split into 3 lesser copies on death), <b>Demonic</b> (leave a fire pool on death).</li>' +
        '<li><b>Elements</b> — colored beasts lean on fire, water, nature, earth, light, or darkness. Matching your weapon element helps; theirs can resist yours.</li>' +
        '<li><b>Melee</b> — most animals charge and lunge up close.</li>' +
        '<li><b>Ranged</b> — sheep hurl wool, raccoons fling rocks, and beavers throw logs while keeping their distance.</li>' +
      '</ul>',
  },
  build: {
    title: 'Defend the camp',
    body:
      '<p>You have enough resources to fortify. Open the camp panel (<b>U</b>) while at camp to build.</p>' +
      '<ul>' +
        '<li><b>Palisades</b> stop raiders from walking straight into the cabin.</li>' +
        '<li><b>Watchtowers</b> shoot threats automatically — essential for nights.</li>' +
      '</ul>' +
      '<p>If the <b>camp is destroyed, the run is over</b> — keep it standing.</p>',
  },
  smith: {
    title: 'Blacksmith shop',
    body:
      '<p>The forge is open. Return to camp and open the <b>Smith</b> tab to buy gear.</p>' +
      '<ul>' +
        '<li>Every item fills a <b>unique equipment slot</b> (weapon, armor, rings…).</li>' +
        '<li>Buying for a slot that already has an item <b>replaces it</b> — the old item is lost.</li>' +
        '<li>Hover a shop item to <b>compare</b> it with what you already wear.</li>' +
      '</ul>',
  },
  firstNight: {
    title: 'Night raid incoming',
    body:
      '<p>Dusk is falling — <b>get back to camp</b> and prepare the walls.</p>' +
      '<ul>' +
        '<li>Each night a <b>miniboss</b> leads the raid.</li>' +
        '<li>Every <b>3rd night</b> a <b>true boss</b> arrives instead — much deadlier.</li>' +
        '<li>Raiders march on the camp from the forest edge. Hold the line or lose the run.</li>' +
      '</ul>',
  },
};

class UI {
  constructor(game) {
    this.game = game;
    const $ = (id) => document.getElementById(id);
    this.el = {
      wood: $('woodCount'), meat: $('meatCount'), gold: $('goldCount'),
      resWood: $('resWood'), resMeat: $('resMeat'), resGold: $('resGold'),
      hpBar: $('hpBar'), hpFill: $('hpFill'), hpText: $('hpText'),
      campBar: $('campBar'), campFill: $('campFill'), campText: $('campText'),
      lvl: $('lvlNum'), xpFill: $('xpFill'),
      clock: $('clock'), clockIcon: $('clockIcon'), dayText: $('dayText'), dayFill: $('dayFill'),
      phaseText: $('phaseText'), threatText: $('threatText'),
      panel: $('upgradePanel'), list: $('upgradeList'), campNote: $('campNote'),
      banner: $('banner'), bannerTitle: $('bannerTitle'), bannerSub: $('bannerSub'),
      pauseOverlay: $('pauseOverlay'), pauseSheet: $('pauseSheet'),
      gameOverOverlay: $('gameOverOverlay'), goStats: $('goStats'), goTitle: $('goTitle'),
      optionsOverlay: $('optionsOverlay'), optResolution: $('optResolution'),
      optMusicVolume: $('optMusicVolume'), optMusicPct: $('optMusicPct'),
      optUiScale: $('optUiScale'), optUiScalePct: $('optUiScalePct'),
      optFontScale: $('optFontScale'), optFontScalePct: $('optFontScalePct'),
      optShakeScale: $('optShakeScale'), optShakePct: $('optShakePct'),
      optTutorials: $('optTutorials'),
      tutorialOverlay: $('tutorialOverlay'), tutorialTitle: $('tutorialTitle'),
      tutorialBody: $('tutorialBody'),
      confirmOverlay: $('confirmOverlay'), confirmTitle: $('confirmTitle'),
      confirmMessage: $('confirmMessage'),
      updateOverlay: $('updateOverlay'), updateTitle: $('updateTitle'),
      updateMessage: $('updateMessage'), updateProgressWrap: $('updateProgressWrap'),
      updateProgressFill: $('updateProgressFill'), updateProgressText: $('updateProgressText'),
      updateHint: $('updateHint'),
      btnPause: $('btnPause'), btnRestart: $('btnRestart'), btnUpgrades: $('btnUpgrades'),
      btnSound: $('btnSound'), fpsText: $('fpsText'), runTimer: $('runTimer'),
      cardOverlay: $('cardOverlay'), cardRow: $('cardRow'), cardTitle: $('cardTitle'),
      cardReroll: $('cardReroll'), cardRerollLeft: $('cardRerollLeft'),
      cardBanishLeft: $('cardBanishLeft'),
      loadout: $('loadout'), buffHud: $('buffHud'), tipPop: $('tipPop'),
      bossHud: $('bossHud'), bossName: $('bossName'), bossFill: $('bossFill'), bossSub: $('bossSub'),
      smithPanel: $('smithPanel'), shopList: $('shopList'), gearRow: $('gearRow'),
      smithTimer: $('smithTimer'), gearHud: $('gearHud'),
      btnSmithReroll: $('btnSmithReroll'), smithRerollCost: $('smithRerollCost'),
      tabBuild: $('tabBuild'), tabSmith: $('tabSmith'),
      mainMenu: $('mainMenu'), menuHome: $('menuHome'), menuMeta: $('menuMeta'),
      menuGlossary: $('menuGlossary'), glossaryList: $('glossaryList'), glossaryCount: $('glossaryCount'),
      menuCreditsHome: $('menuCreditsHome'), menuCreditsMeta: $('menuCreditsMeta'),
      menuMetaStats: $('menuMetaStats'), metaList: $('metaList'), metaStats: $('metaStats'),
      btnMetaRefund: $('btnMetaRefund'), metaRefundAmount: $('metaRefundAmount'),
      menuVersionBtn: $('menuVersionBtn'), menuVersionLabel: $('menuVersionLabel'),
      menuUpdateBadge: $('menuUpdateBadge'),
      goCredits: $('goCredits'),
    };
    this.cache = {};
    this.items = new Map();
    this.lastKey = '';
    this.lastLoadout = '';
    this.lastShop = '';
    this.lastBuffs = '';
    this.glossaryTab = 'beasts';
    this.smithTab = false;
    this.panelOpen = window.innerWidth > 760;
    this.confirmAction = null;
    this.updatePhase = null; // 'ask' | 'downloading' | 'ready'
    this.updateInfo = null;
    this.restartArmed = false;
    this.restartTimer = 0;
    this.bannerTimer = 0;
    this.tipAnchor = null;

    document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ICONS[el.dataset.icon] || ''; });
    const wm = document.getElementById('buildWatermark');
    if (wm && typeof BUILD_VERSION === 'string') wm.textContent = BUILD_VERSION;
    this.refreshMenuVersion();
    this.buildUpgrades();
    this.bind();
    this.bindTooltips();
    this.bindUpdater();
    this.applyPanel();
    this.setSoundIcon();
  }

  bind() {
    const g = this.game;
    const onClick = (el, fn) => {
      if (!el) return;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        Sound.unlock();
        fn(e);
        el.blur();
      });
    };
    onClick(this.el.btnPause, () => g.togglePause());
    onClick(this.el.btnRestart, () => this.requestRestart());
    onClick(this.el.btnUpgrades, () => this.togglePanel());
    onClick(this.el.btnSound, () => g.toggleMute());
    onClick(document.getElementById('btnResume'), () => g.setPaused(false));
    onClick(document.getElementById('btnPauseOptions'), () => this.showOptions('pause'));
    onClick(document.getElementById('btnPauseMenu'), () => this.requestMainMenu());
    onClick(document.getElementById('btnPlayAgain'), () => this.requestRestart());
    onClick(document.getElementById('btnGoMenu'), () => this.requestMainMenu());
    onClick(document.getElementById('btnNewRun'), () => g.startNewRun());
    onClick(document.getElementById('btnOpenMeta'), () => this.showMetaUpgrades());
    onClick(document.getElementById('btnOpenGlossary'), () => this.showGlossary());
    onClick(document.getElementById('btnOpenOptions'), () => this.showOptions('menu'));
    onClick(document.getElementById('btnExitGame'), () => this.requestExitGame());
    onClick(document.getElementById('btnMetaBack'), () => this.showMenuHome());
    onClick(document.getElementById('btnGlossaryBack'), () => this.showMenuHome());
    onClick(document.getElementById('btnOptionsBack'), () => this.hideOptions());
    onClick(this.el.btnMetaRefund, () => this.refundMetaUpgrades());
    onClick(document.getElementById('btnConfirmYes'), () => this.acceptConfirm());
    onClick(document.getElementById('btnConfirmNo'), () => this.cancelConfirm());
    onClick(document.getElementById('btnUpdateYes'), () => this.acceptUpdate());
    onClick(document.getElementById('btnUpdateNo'), () => this.dismissUpdate());
    onClick(this.el.menuVersionBtn, () => this.requestMenuUpdate());
    document.querySelectorAll('.glossary-tab').forEach((tab) => {
      onClick(tab, () => this.setGlossaryTab(tab.dataset.glossary));
    });
    document.querySelectorAll('.options-mode').forEach((btn) => {
      onClick(btn, () => {
        Settings.setDisplayMode(btn.dataset.mode);
        this.syncOptionsForm();
      });
    });
    if (this.el.optResolution) {
      this.el.optResolution.addEventListener('change', () => {
        const [w, h] = (this.el.optResolution.value || '1280x720').split('x').map(Number);
        Settings.setResolution(w, h);
        this.syncOptionsForm();
      });
    }
    if (this.el.optMusicVolume) {
      const onVol = () => {
        const pct = Number(this.el.optMusicVolume.value) || 0;
        Settings.setMusicVolume(pct / 100);
        if (this.el.optMusicPct) this.el.optMusicPct.textContent = Math.round(pct) + '%';
      };
      this.el.optMusicVolume.addEventListener('input', onVol);
      this.el.optMusicVolume.addEventListener('change', onVol);
    }
    if (this.el.optUiScale) {
      const onUi = () => {
        const pct = Number(this.el.optUiScale.value) || 100;
        Settings.setUiScale(pct / 100);
        if (this.el.optUiScalePct) this.el.optUiScalePct.textContent = Math.round(pct) + '%';
      };
      this.el.optUiScale.addEventListener('input', onUi);
      this.el.optUiScale.addEventListener('change', onUi);
    }
    if (this.el.optFontScale) {
      const onFont = () => {
        const pct = Number(this.el.optFontScale.value) || 100;
        Settings.setFontScale(pct / 100);
        if (this.el.optFontScalePct) this.el.optFontScalePct.textContent = Math.round(pct) + '%';
      };
      this.el.optFontScale.addEventListener('input', onFont);
      this.el.optFontScale.addEventListener('change', onFont);
    }
    if (this.el.optShakeScale) {
      const onShake = () => {
        const pct = Number(this.el.optShakeScale.value) || 0;
        Settings.setShakeScale(pct / 100);
        if (this.el.optShakePct) this.el.optShakePct.textContent = Math.round(pct) + '%';
      };
      this.el.optShakeScale.addEventListener('input', onShake);
      this.el.optShakeScale.addEventListener('change', onShake);
    }
    onClick(this.el.optTutorials, () => {
      Settings.setTutorialsEnabled(!Settings.tutorialsEnabled);
      this.syncOptionsForm();
    });
    onClick(document.getElementById('btnTutorialOk'), () => g.dismissTutorial());
    onClick(document.getElementById('btnPanelClose'), () => this.togglePanel(false));
    onClick(this.el.tabBuild, () => this.setSmithTab(false));
    onClick(this.el.tabSmith, () => this.setSmithTab(true));
    onClick(this.el.cardReroll, () => g.rerollCards());
    onClick(this.el.btnSmithReroll, () => {
      if (!g.shop.reroll(g)) {
        Sound.play('deny');
        this.denyUpgrade('blacksmith');
      }
      this.lastShop = '';
      this.lastKey = '';
    });
  }

  bindTooltips() {
    const roots = [this.el.loadout, this.el.gearHud, this.el.buffHud];
    for (const root of roots) {
      if (!root) continue;
      root.addEventListener('pointerover', (e) => {
        const item = e.target.closest('[data-tip-kind]');
        if (!item || !root.contains(item)) return;
        this.showTip(item);
      });
      root.addEventListener('pointerout', (e) => {
        const item = e.target.closest('[data-tip-kind]');
        if (!item || !root.contains(item)) return;
        if (e.relatedTarget && item.contains(e.relatedTarget)) return;
        this.hideTip();
      });
    }
    window.addEventListener('scroll', () => this.hideTip(), true);
    window.addEventListener('resize', () => this.hideTip());
  }

  /** Human-readable rows for a weapon stats object. */
  formatWeaponStatRows(s, weaponId) {
    if (!s) return [];
    const rows = [];
    const push = (label, value) => { if (value != null && value !== '') rows.push([label, value]); };
    push('Damage', s.dmg != null ? String(Math.round(s.dmg * 10) / 10) : null);
    push('Count', s.count != null ? '×' + s.count : null);
    push('Pierce', s.pierce != null ? String(s.pierce) : null);
    push('Range', s.range != null ? String(Math.round(s.range)) : null);
    push('Reach', s.len != null ? String(Math.round(s.len)) : null);
    push('Orbit', s.orbit != null ? String(Math.round(s.orbit)) : null);
    push('Radius', s.radius != null ? String(Math.round(s.radius)) : null);
    push('Size', s.size != null ? String(Math.round(s.size)) : null);
    push('Distance', s.dist != null ? String(Math.round(s.dist)) : null);
    push('Cone', s.cone != null ? Math.round(s.cone * 100) + '%' : null);
    if (s.speed != null) {
      if (weaponId === 'axe') push('Spin', (Math.round(s.speed * 100) / 100) + ' r/s');
      else push('Speed', String(Math.round(s.speed)));
    }
    push('Cooldown', s.cd != null ? s.cd.toFixed(2) + 's' : null);
    push('Tick', s.tick != null ? s.tick.toFixed(2) + 's' : null);
    push('Bite CD', s.biteCd != null ? s.biteCd.toFixed(2) + 's' : null);
    push('Duration', s.duration != null ? s.duration + 's' : null);
    push('Respawn', s.spawnCd != null ? s.spawnCd.toFixed(1) + 's' : null);
    return rows;
  }

  tipStatsHtml(rows) {
    if (!rows || !rows.length) return '';
    return '<div class="tip-stats">' + rows.map((r) =>
      '<div class="tip-stat"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'
    ).join('') + '</div>';
  }

  tipContent(kind, id) {
    const g = this.game, ar = g.arsenal;
    if (kind === 'weapon') {
      const def = WEAPON_DEFS[id];
      if (!def) return null;
      const lvl = ar.weapons[id] || 0;
      const el = ar.weaponElements[id];
      const elDef = el && ELEMENTS[el];
      const inf = el && ELEMENT_INFUSE[el];
      const unique = ar.isUnique && ar.isUnique(id);
      const stats = ar.stats ? ar.stats(id) : def.stats(lvl);
      const rows = this.formatWeaponStatRows(stats, id);
      const unlocks = [];
      for (let i = 1; i < lvl && i < def.text.length; i++) {
        unlocks.push('<li>Lv' + (i + 1) + ': ' + def.text[i] + '</li>');
      }
      const extras = [];
      if (unique) extras.push('Unique form — stronger stats & elemental look');
      if (elDef) extras.push(elDef.name + (inf ? ': ' + inf.effect : ''));
      if (lvl < WEAPON_MAX && def.text[lvl]) extras.push('Next: ' + def.text[lvl]);
      return {
        name: ar.displayName ? ar.displayName(id) : def.name,
        tag: unique
          ? 'Unique · Lv ' + lvl + ' · ' + (elDef ? elDef.name : 'Element')
          : ('Weapon · Lv ' + lvl + (lvl >= WEAPON_MAX ? ' (MAX)' : '')),
        desc: def.text[0] || '',
        statsHtml: this.tipStatsHtml(rows),
        extra: (unlocks.length
          ? '<div class="tip-unlocks"><div class="tip-unlocks-lab">Upgrades</div><ul>' + unlocks.join('') + '</ul></div>'
          : '') + (extras.length ? extras.map((e) => '<div>' + e + '</div>').join('') : ''),
        color: elDef ? elDef.color : '#c98a12',
      };
    }
    if (kind === 'passive') {
      const def = PASSIVE_DEFS[id];
      if (!def) return null;
      const lvl = ar.passives[id] || 0;
      const rows = this.passiveTipStatRows(id, lvl);
      return {
        name: def.name,
        tag: 'Upgrade · Lv ' + lvl + ' / ' + def.max,
        desc: def.desc,
        statsHtml: this.tipStatsHtml(rows),
        extra: lvl < def.max ? 'Next stack: same bonus again' : 'Maxed',
        color: '#4a8ad4',
      };
    }
    if (kind === 'gear') {
      const label = (typeof SLOT_LABELS !== 'undefined' && SLOT_LABELS[id]) || id;
      const it = g.shop && g.shop.equipped[id];
      if (!it) {
        return {
          name: label,
          tag: 'Empty slot',
          desc: 'Buy gear at the blacksmith while at camp.',
          extra: '',
          color: '#888',
        };
      }
      const elDef = it.element && ELEMENTS[it.element];
      const rows = this.gearTipStatRows(it);
      return {
        name: it.qualityName + ' ' + it.name,
        tag: label + (elDef ? ' · ' + elDef.name : ''),
        desc: it.desc,
        statsHtml: this.tipStatsHtml(rows),
        extra: elDef ? (elDef.name + ' element') : '',
        // Border / title use rarity color; element is called out in the tag.
        color: it.color || '#c9a227',
      };
    }
    if (kind === 'elem') {
      const elDef = ELEMENTS[id];
      if (!elDef) return null;
      const inf = ELEMENT_INFUSE[id];
      return {
        name: elDef.name + ' Damage',
        tag: 'Active attack element',
        desc: inf ? inf.effect : 'Your attacks deal ' + elDef.name + ' damage.',
        extra: '',
        color: elDef.color,
      };
    }
    if (kind === 'buff') {
      const def = POWERUPS[id];
      if (!def) return null;
      const left = g.buffs && g.buffs[id] ? Math.ceil(g.buffs[id]) : 0;
      return {
        name: def.name,
        tag: left + 's remaining',
        desc: def.desc,
        extra: '',
        color: def.color,
      };
    }
    return null;
  }

  gearTipStatRows(it) {
    const m = (it && it.mods) || {};
    const rows = [];
    const pct = (v) => (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
    const flat = (v, d) => (v > 0 ? '+' : '') + (Math.round(v * Math.pow(10, d || 1)) / Math.pow(10, d || 1));
    if (m.might) rows.push(['Damage', pct(m.might)]);
    if (m.flatDmg) rows.push(['Flat dmg', flat(m.flatDmg)]);
    if (m.armor) rows.push(['Armor', pct(m.armor)]);
    if (m.maxHp) rows.push(['HP', flat(m.maxHp, 0)]);
    if (m.crit) rows.push(['Crit', pct(m.crit)]);
    if (m.move) rows.push(['Move', pct(m.move)]);
    if (m.regen) rows.push(['Regen', flat(m.regen) + '/s']);
    if (m.magnet) rows.push(['Magnet', pct(m.magnet)]);
    if (m.area) rows.push(['Area', pct(m.area)]);
    if (m.haste) rows.push(['Atk speed', pct(m.haste)]);
    if (m.lifesteal) rows.push(['Lifesteal', pct(m.lifesteal)]);
    if (m.thorns) rows.push(['Thorns', flat(m.thorns)]);
    if (m.xpGain) rows.push(['XP', pct(m.xpGain)]);
    if (m.elementPower) rows.push(['Elem dmg', pct(m.elementPower)]);
    return rows;
  }

  passiveTipStatRows(id, lvl) {
    if (!lvl) return [];
    const rows = [];
    switch (id) {
      case 'might': rows.push(['Damage', '+' + Math.round(15 * lvl) + '%']); break;
      case 'haste':
        rows.push(['Fire rate', '+' + Math.round(7 * lvl) + '%']);
        rows.push(['Axe spin', '+' + Math.round(8 * lvl) + '%']);
        break;
      case 'area': rows.push(['Area / reach', '+' + Math.round(10 * lvl) + '%']); break;
      case 'speed': rows.push(['Move speed', '+' + Math.round(8 * lvl) + '%']); break;
      case 'magnet': rows.push(['Pickup range', '+' + Math.round(35 * lvl) + '%']); break;
      case 'vitality': rows.push(['Max HP', '+' + (25 * lvl)]); break;
      case 'armor': rows.push(['Damage taken', '-' + Math.round(7 * lvl) + '%']); break;
      case 'regen': rows.push(['Regen', '+' + (Math.round(0.5 * lvl * 10) / 10) + ' HP/s']); break;
      case 'luck': rows.push(['Crit chance', '+' + Math.round(6 * lvl) + '%']); break;
      case 'amount': rows.push(['Extra projectiles', '+' + lvl]); break;
      case 'dash': rows.push(['Dash charges', '+' + lvl]); break;
      case 'greed':
        rows.push(['Max HP', '-' + Math.round(8 * lvl) + '%']);
        rows.push(['Drops / XP', '+' + Math.round(18 * lvl) + '%']);
        break;
      case 'devil':
        rows.push(['Max HP', '-' + Math.round(10 * lvl) + '%']);
        rows.push(['Damage', '+' + Math.round(12 * lvl) + '%']);
        break;
      case 'angel':
        rows.push(['Damage', '-' + Math.round(8 * lvl) + '%']);
        rows.push(['Max HP', '+' + (30 * lvl)]);
        break;
      case 'ember':
      case 'tide':
      case 'bloom':
      case 'quake':
      case 'radiance':
      case 'umbra':
        rows.push(['Element dmg', '+' + Math.round(36 * lvl) + '%']);
        break;
      default: break;
    }
    return rows;
  }

  showTip(anchor) {
    const tip = this.el.tipPop;
    if (!tip || !anchor) return;
    const kind = anchor.dataset.tipKind;
    const id = anchor.dataset.tipId;
    const c = this.tipContent(kind, id);
    if (!c) { this.hideTip(); return; }
    this.tipAnchor = anchor;
    tip.innerHTML =
      '<div class="tip-name">' + c.name + '</div>' +
      '<div class="tip-tag">' + c.tag + '</div>' +
      (c.desc ? '<p class="tip-desc">' + c.desc + '</p>' : '') +
      (c.statsHtml || '') +
      (c.extra ? '<div class="tip-extra">' + c.extra + '</div>' : '');
    tip.style.borderColor = c.color || '#c9a227';
    tip.classList.remove('hidden');
    this.placeTip(anchor);
  }

  placeTip(anchor) {
    const tip = this.el.tipPop;
    if (!tip || tip.classList.contains('hidden')) return;
    if (!anchor || !anchor.isConnected) {
      this.hideTip();
      return;
    }
    const r = anchor.getBoundingClientRect();
    const pad = 8;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    const nearLeft = r.left < vw * 0.42;
    const nearBottom = r.bottom > vh * 0.62;

    let left;
    let top;
    // Bottom-left HUD (loadout / gear): open to the right so tips stay on-screen.
    if (nearLeft && nearBottom) {
      left = r.right + pad;
      top = r.bottom - th;
      if (top < pad) top = r.top;
    } else if (nearLeft) {
      left = r.right + pad;
      top = r.top + (r.height - th) / 2;
    } else {
      left = r.left;
      top = r.top - th - pad;
      if (top < pad) top = r.bottom + pad;
    }

    if (left + tw > vw - pad) left = vw - tw - pad;
    if (left < pad) left = pad;
    if (top + th > vh - pad) top = vh - th - pad;
    if (top < pad) top = pad;

    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }

  hideTip() {
    this.tipAnchor = null;
    if (this.el.tipPop) {
      this.el.tipPop.classList.add('hidden');
      this.el.tipPop.classList.remove('tip-compare');
    }
  }

  /** Close tips whose anchor was destroyed (e.g. shop re-render after buying). */
  tipAnchorAlive() {
    const a = this.tipAnchor;
    if (!a) return false;
    return !!(a.isConnected && document.body.contains(a));
  }

  showShopCompare(anchor, shopIndex) {
    const tip = this.el.tipPop;
    const g = this.game;
    if (!tip || !g.shop) return;
    const item = g.shop.stock[shopIndex];
    if (!item) { this.hideTip(); return; }
    const equipped = g.shop.equipped[item.slot] || null;
    const slotLab = (SLOT_LABELS[item.slot] || item.slot);

    const head = (it, label) => {
      if (!it) {
        return '<div class="tip-compare-head"><div class="tip-compare-lab">' + label + '</div>' +
          '<div class="tip-compare-empty">Empty slot</div></div>';
      }
      const rarity = it.color || '#c9a227';
      return '<div class="tip-compare-head"><div class="tip-compare-lab">' + label + '</div>' +
        '<div class="tip-compare-name"><b style="color:' + rarity + '">' + it.qualityName + '</b> ' +
          it.name + '</div></div>';
    };

    tip.innerHTML =
      '<div class="tip-name">' + slotLab + '</div>' +
      '<div class="tip-tag">Hover compare · replaces on buy</div>' +
      '<div class="tip-compare-heads">' +
        head(equipped, 'Equipped') +
        '<div class="tip-compare-vs">VS</div>' +
        head(item, 'Shop') +
      '</div>' +
      this.gearCompareTable(equipped, item);
    tip.style.borderColor = item.color || '#c9a227';
    tip.classList.add('tip-compare');
    tip.classList.remove('hidden');
    this.tipAnchor = anchor;
    this.placeTip(anchor);
  }

  /** Ordered numeric gear stats used for side-by-side compare rows. */
  gearCompareStatDefs() {
    return [
      { key: 'might', label: 'dmg', kind: 'pct' },
      { key: 'flatDmg', label: 'flat dmg', kind: 'flat' },
      { key: 'armor', label: 'armor', kind: 'pct' },
      { key: 'maxHp', label: 'HP', kind: 'flat0' },
      { key: 'crit', label: 'crit', kind: 'pct' },
      { key: 'move', label: 'move', kind: 'pct' },
      { key: 'regen', label: 'HP/s', kind: 'flat' },
      { key: 'magnet', label: 'magnet', kind: 'pct' },
      { key: 'area', label: 'area', kind: 'pct' },
      { key: 'haste', label: 'atk speed', kind: 'pct' },
      { key: 'lifesteal', label: 'lifesteal', kind: 'pct' },
      { key: 'thorns', label: 'thorns', kind: 'flat' },
      { key: 'xpGain', label: 'XP', kind: 'pct' },
      { key: 'elementPower', label: 'elem dmg', kind: 'pct' },
    ];
  }

  formatGearCompareValue(kind, v) {
    if (v == null || !Number.isFinite(v) || Math.abs(v) < 1e-9) return '—';
    if (kind === 'pct') return (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
    if (kind === 'flat0') return (v > 0 ? '+' : '') + Math.round(v);
    return (v > 0 ? '+' : '') + (Math.round(v * 10) / 10);
  }

  formatGearCompareDelta(kind, d) {
    if (!Number.isFinite(d) || Math.abs(d) < 1e-9) return { cls: 'tip-delta-same', txt: '—' };
    if (kind === 'pct') {
      return {
        cls: d > 0 ? 'tip-delta-up' : 'tip-delta-down',
        txt: (d > 0 ? '+' : '') + Math.round(d * 100) + '%',
      };
    }
    if (kind === 'flat0') {
      return {
        cls: d > 0 ? 'tip-delta-up' : 'tip-delta-down',
        txt: (d > 0 ? '+' : '') + Math.round(d),
      };
    }
    return {
      cls: d > 0 ? 'tip-delta-up' : 'tip-delta-down',
      txt: (d > 0 ? '+' : '') + (Math.round(d * 10) / 10),
    };
  }

  numericMod(mods, key) {
    if (!mods) return 0;
    const v = mods[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  }

  gearCompareTable(oldIt, newIt) {
    if (!newIt) return '';
    const defs = this.gearCompareStatDefs();
    const rows = [];

    for (const def of defs) {
      const a = this.numericMod(oldIt && oldIt.mods, def.key);
      const b = this.numericMod(newIt.mods, def.key);
      if (Math.abs(a) < 1e-9 && Math.abs(b) < 1e-9) continue;
      const delta = this.formatGearCompareDelta(def.kind, b - a);
      rows.push(
        '<div class="tip-compare-row">' +
          '<span class="tip-compare-stat">' + def.label + '</span>' +
          '<span class="tip-compare-old">' + this.formatGearCompareValue(def.kind, a) + '</span>' +
          '<span class="tip-compare-arrow">→</span>' +
          '<span class="tip-compare-new">' + this.formatGearCompareValue(def.kind, b) + '</span>' +
          '<span class="' + delta.cls + '">' + delta.txt + '</span>' +
        '</div>'
      );
    }

    const oldEl = (oldIt && oldIt.element) || null;
    const newEl = newIt.element || null;
    if (oldEl || newEl) {
      const oe = oldEl && ELEMENTS[oldEl];
      const ne = newEl && ELEMENTS[newEl];
      const same = oldEl === newEl;
      const deltaCls = same ? 'tip-delta-same' : (newEl ? 'tip-delta-up' : 'tip-delta-down');
      const deltaTxt = same ? '—' : (ne ? ne.name : 'none');
      rows.push(
        '<div class="tip-compare-row">' +
          '<span class="tip-compare-stat">element</span>' +
          '<span class="tip-compare-old"' + (oe ? ' style="color:' + oe.color + '"' : '') + '>' +
            (oe ? oe.name : '—') + '</span>' +
          '<span class="tip-compare-arrow">→</span>' +
          '<span class="tip-compare-new"' + (ne ? ' style="color:' + ne.color + '"' : '') + '>' +
            (ne ? ne.name : '—') + '</span>' +
          '<span class="' + deltaCls + '">' + deltaTxt + '</span>' +
        '</div>'
      );
    }

    // Resist is an object on armor — show a compact row when either side has it.
    const oldRes = oldIt && oldIt.mods && oldIt.mods.resist;
    const newRes = newIt.mods && newIt.mods.resist;
    const resistId = (newIt.element && newRes && newRes[newIt.element] != null)
      ? newIt.element
      : (oldIt && oldIt.element && oldRes && oldRes[oldIt.element] != null)
        ? oldIt.element
        : (newEl || oldEl);
    if (resistId && ((oldRes && oldRes[resistId] != null) || (newRes && newRes[resistId] != null))) {
      const a = (oldRes && typeof oldRes[resistId] === 'number') ? oldRes[resistId] : 0;
      const b = (newRes && typeof newRes[resistId] === 'number') ? newRes[resistId] : 0;
      if (Math.abs(a) >= 1e-9 || Math.abs(b) >= 1e-9) {
        const elName = (ELEMENTS[resistId] && ELEMENTS[resistId].name) || resistId;
        const delta = this.formatGearCompareDelta('pct', b - a);
        rows.push(
          '<div class="tip-compare-row">' +
            '<span class="tip-compare-stat">resist ' + elName + '</span>' +
            '<span class="tip-compare-old">' + this.formatGearCompareValue('pct', a) + '</span>' +
            '<span class="tip-compare-arrow">→</span>' +
            '<span class="tip-compare-new">' + this.formatGearCompareValue('pct', b) + '</span>' +
            '<span class="' + delta.cls + '">' + delta.txt + '</span>' +
          '</div>'
        );
      }
    }

    if (!rows.length) {
      return '<div class="tip-compare-delta"><span class="tip-delta-same">' +
        (oldIt
          ? 'Buying replaces the equipped item in this slot.'
          : 'No stat modifiers on this item.') +
        '</span></div>';
    }

    return (
      '<div class="tip-compare-table">' +
        '<div class="tip-compare-row tip-compare-row-head">' +
          '<span class="tip-compare-stat">Stat</span>' +
          '<span class="tip-compare-old">Now</span>' +
          '<span class="tip-compare-arrow"></span>' +
          '<span class="tip-compare-new">Shop</span>' +
          '<span>Δ</span>' +
        '</div>' +
        rows.join('') +
      '</div>'
    );
  }

  setSmithTab(on) {
    this.smithTab = !!on;
    this.el.tabBuild.classList.toggle('active', !this.smithTab);
    this.el.tabSmith.classList.toggle('active', this.smithTab);
    this.el.list.classList.toggle('hidden', this.smithTab);
    this.el.smithPanel.classList.toggle('hidden', !this.smithTab);
    this.lastShop = '';
    if (this.smithTab) this.refreshShop(this.game.atCamp());
  }

  buildUpgrades() {
    const list = this.el.list;
    list.innerHTML = '';
    UPGRADES.forEach((def, i) => {
      const root = document.createElement('div');
      root.className = 'upg';
      root.innerHTML =
        '<div class="upg-icon">' + (ICONS[def.id] || '') + '<kbd>' + (i + 1) + '</kbd></div>' +
        '<div class="upg-body">' +
          '<div class="upg-title"><span class="upg-name">' + def.name + '</span><span class="upg-lvl"></span></div>' +
          '<div class="upg-desc">' + def.desc + '</div>' +
          '<div class="upg-val"></div>' +
        '</div>' +
        '<button class="upg-buy" type="button"><span class="upg-cost"></span></button>';
      const btn = root.querySelector('.upg-buy');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Sound.unlock();
        if (!this.game.buyUpgrade(def.id)) this.denyUpgrade(def.id);
        btn.blur();
      });
      list.appendChild(root);
      this.items.set(def.id, {
        root, btn,
        lvl: root.querySelector('.upg-lvl'),
        val: root.querySelector('.upg-val'),
        cost: root.querySelector('.upg-cost'),
        lastHtml: '', lastVal: '',
      });
    });
  }

  refreshUpgrades(atCamp) {
    const g = this.game;
    for (const def of UPGRADES) {
      const it = this.items.get(def.id);
      const lvl = g.levels[def.id];
      const maxed = lvl >= def.max;
      const lvlText = maxed ? def.max + '/' + def.max : lvl + '/' + def.max;
      if (it.lvl.textContent !== lvlText) it.lvl.textContent = lvlText;

      const reqMissing = def.requires && !def.requires(g.levels);
      let valHtml;
      if (maxed) {
        valHtml = '<span class="uv-cur">' + def.value(g.stats) + '</span>';
      } else if (reqMissing) {
        valHtml = '<span class="req">' + def.reqText + '</span>';
      } else {
        const nextLevels = Object.assign({}, g.levels);
        nextLevels[def.id] = lvl + 1;
        const nextStats = computeStats(nextLevels, g.metaBonuses ? g.metaBonuses() : null);
        valHtml =
          '<span class="uv-cur">' + def.value(g.stats) + '</span>' +
          '<span class="uv-next"><span class="arrow">&#9654;</span> <b>' + def.value(nextStats) + '</b></span>';
      }
      if (valHtml !== it.lastVal) { it.val.innerHTML = valHtml; it.lastVal = valHtml; }

      let html, affordable = false;
      if (maxed) {
        html = '<span class="max">MAXED</span>';
      } else {
        const cost = upgradeCost(def, lvl);
        affordable = g.canAfford(cost) && !reqMissing && atCamp;
        html = RES_ORDER.filter((k) => cost[k]).map((k) =>
          '<span class="ci' + (g.res[k] >= cost[k] ? '' : ' lack') + '">' + ICONS[k] + formatNum(cost[k]) + '</span>'
        ).join('');
      }
      if (html !== it.lastHtml) { it.cost.innerHTML = html; it.lastHtml = html; }
      it.root.classList.toggle('maxed', maxed);
      it.root.classList.toggle('affordable', affordable);
      it.root.classList.toggle('locked', !maxed && !affordable);
    }
  }

  retrigger(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  flashUpgrade(id) {
    const it = this.items.get(id);
    if (it) this.retrigger(it.root, 'bought');
  }

  denyUpgrade(id) {
    const it = this.items.get(id);
    if (it) this.retrigger(it.root, 'deny');
  }

  togglePanel(force) {
    this.panelOpen = typeof force === 'boolean' ? force : !this.panelOpen;
    this.applyPanel();
  }

  applyPanel() {
    this.el.panel.classList.toggle('collapsed', !this.panelOpen);
    this.el.btnUpgrades.classList.toggle('active', this.panelOpen);
  }

  setResource(key, value) {
    const prev = this.cache[key];
    if (prev === value) return;
    this.cache[key] = value;
    this.el[key].textContent = formatNum(value);
    if (prev !== undefined && value > prev) {
      const chip = this.el['res' + key[0].toUpperCase() + key.slice(1)];
      this.retrigger(chip, 'bump');
    }
  }

  setBar(key, value, max, text, lowFrac) {
    const ck = text + '|' + max;
    if (this.cache[key] === ck) return;
    this.cache[key] = ck;
    const f = clamp(value / max, 0, 1);
    this.el[key + 'Fill'].style.width = (f * 100).toFixed(1) + '%';
    this.el[key + 'Text'].textContent = text;
    this.el[key + 'Bar'].classList.toggle('low', f < lowFrac);
  }

  update() {
    if (this.tipAnchor && !this.tipAnchorAlive()) this.hideTip();
    const g = this.game, p = g.player;
    this.setResource('wood', g.res.wood);
    this.setResource('meat', g.res.meat);
    this.setResource('gold', g.res.gold);

    this.setBar('hp', p.hp, p.maxHp, Math.ceil(p.hp) + '/' + p.maxHp, 0.3);
    const core = g.base.core;
    this.setBar('camp', core.hp, core.maxHp, Math.ceil(core.hp) + '/' + core.maxHp, 0.35);

    const need = xpNeeded(g.level);
    const xpKey = g.level + ':' + Math.floor((g.xp / need) * 100);
    if (this.cache.xp !== xpKey) {
      this.cache.xp = xpKey;
      if (String(g.level) !== this.el.lvl.textContent) {
        this.el.lvl.textContent = g.level;
        this.retrigger(this.el.lvl.parentElement, 'bump');
      }
      this.el.xpFill.style.width = ((g.xp / need) * 100).toFixed(1) + '%';
    }

    if (this.cache.fps !== g.fps) {
      this.cache.fps = g.fps;
      this.el.fpsText.textContent = g.fps || '--';
    }
    const runSec = Math.floor(g.time || 0);
    if (this.cache.runSec !== runSec) {
      this.cache.runSec = runSec;
      if (this.el.runTimer) this.el.runTimer.textContent = formatTime(runSec);
    }

    this.updateClock();
    this.updateLoadout();
    this.updateGearHud();
    this.updateBuffHud();

    const atCamp = g.atCamp();
    const key = g.resVersion + '|' + atCamp + '|' + (g.shop && g.shop.version);
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.refreshUpgrades(atCamp);
      this.refreshShop(atCamp);
      this.el.campNote.classList.toggle('ok', atCamp);
      this.el.campNote.textContent = atCamp
        ? (this.smithTab ? 'At camp: buy gear (replaces equipped)' : 'At camp: build away!')
        : 'Return to camp to build / buy';
    }
    if (g.shop && g.shop.built && this.el.smithTimer) {
      const t = Math.max(0, Math.ceil(g.shop.refreshIn));
      const mm = Math.floor(t / 60), ss = t % 60;
      this.el.smithTimer.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
    }
  }

  updateBuffHud() {
    const b = this.game.buffs;
    if (!b || !this.el.buffHud) return;
    const key = Math.ceil(b.fury) + ':' + Math.ceil(b.vital) + ':' + Math.ceil(b.haste);
    if (key === this.lastBuffs) return;
    this.lastBuffs = key;
    const tipId = this.tipAnchor && this.tipAnchor.dataset.tipKind === 'buff' ? this.tipAnchor.dataset.tipId : null;
    const bits = [];
    for (const id of ['fury', 'vital', 'haste']) {
      if (b[id] <= 0) continue;
      const def = POWERUPS[id];
      bits.push('<div class="buff" data-tip-kind="buff" data-tip-id="' + id + '" style="border-color:' + def.color + ';color:' + def.color + '">' +
        '<span>' + def.label + '</span><b>' + Math.ceil(b[id]) + 's</b></div>');
    }
    this.el.buffHud.innerHTML = bits.join('');
    if (tipId) {
      const next = this.el.buffHud.querySelector('[data-tip-id="' + tipId + '"]');
      if (next) this.showTip(next);
      else this.hideTip();
    }
  }

  updateGearHud() {
    const shop = this.game.shop;
    if (!shop) return;
    const key = shop.version + ':' + (this.game.ps.attackElement || '');
    if (key === this.cache.gearHud) return;
    this.cache.gearHud = key;
    if (this.tipAnchor && this.el.gearHud.contains(this.tipAnchor)) this.hideTip();
    const bits = [];
    for (const slot of ITEM_SLOTS) {
      const it = shop.equipped[slot];
      if (!it) {
        bits.push('<div class="gear-slot empty" data-tip-kind="gear" data-tip-id="' + slot + '">' + (ICONS[slot] || '') + '</div>');
      } else {
        const el = it.element && ELEMENTS[it.element] ? ELEMENTS[it.element].color : it.color;
        bits.push('<div class="gear-slot" data-tip-kind="gear" data-tip-id="' + slot + '" style="border-color:' + el + '">' +
          (ICONS[slot] || '') + '<i style="background:' + it.color + '"></i></div>');
      }
    }
    if (this.game.ps.attackElement && ELEMENTS[this.game.ps.attackElement]) {
      const e = ELEMENTS[this.game.ps.attackElement];
      bits.push('<div class="gear-elem" data-tip-kind="elem" data-tip-id="' + e.id + '" style="background:' + e.color + '">' + e.name[0] + '</div>');
    }
    this.el.gearHud.innerHTML = bits.join('');
  }

  refreshShop(atCamp) {
    const g = this.game, shop = g.shop;
    if (!shop) return;
    const rerollCost = shop.rerollCost();
    const key = shop.version + '|' + g.resVersion + '|' + atCamp + '|' + shop.built + '|' + shop.rerolls + '|' + rerollCost;
    if (key === this.lastShop) return;
    this.lastShop = key;
    // Buying replaces the hovered button without a pointerleave — clear compare tip.
    if (this.tipAnchor && this.el.shopList && this.el.shopList.contains(this.tipAnchor)) {
      this.hideTip();
    } else if (this.tipAnchor && !this.tipAnchorAlive()) {
      this.hideTip();
    }

    const gearBits = [];
    for (const slot of ITEM_SLOTS) {
      const it = shop.equipped[slot];
      const lab = SLOT_LABELS[slot] || slot;
      gearBits.push('<div class="gear-eq"><div class="slot-lab">' + lab + '</div>' +
        (it
          ? '<div class="eq-name" style="color:' + it.color + '">' + it.qualityName + ' ' + it.name + '</div><div class="eq-desc">' + it.desc + '</div>'
          : '<div class="eq-name dim">Empty</div>') +
        '</div>');
    }
    this.el.gearRow.innerHTML = gearBits.join('');

    if (this.el.btnSmithReroll && this.el.smithRerollCost) {
      const canReroll = shop.built && atCamp && g.res.gold >= rerollCost;
      this.el.smithRerollCost.textContent = String(rerollCost);
      this.el.btnSmithReroll.disabled = !canReroll;
      this.el.btnSmithReroll.classList.toggle('locked', !canReroll);
      this.el.btnSmithReroll.title = !shop.built
        ? 'Build a Blacksmith first'
        : !atCamp
          ? 'Return to camp to reroll'
          : canReroll
            ? 'Reroll forge stock for ' + rerollCost + ' gold (cost rises each time)'
            : 'Need ' + rerollCost + ' gold to reroll';
    }

    if (!shop.built) {
      this.el.shopList.innerHTML = '<div class="shop-empty">Build a Blacksmith to open the forge shop.</div>';
      return;
    }
    const rows = [];
    shop.stock.forEach((item, i) => {
      if (!item) {
        rows.push('<div class="shop-item sold">Sold</div>');
        return;
      }
      const afford = atCamp && g.canAfford(item.price);
      const cost = RES_ORDER.filter((k) => item.price[k]).map((k) =>
        '<span class="ci' + (g.res[k] >= item.price[k] ? '' : ' lack') + '">' + ICONS[k] + formatNum(item.price[k]) + '</span>'
      ).join('');
      const elDot = item.element && ELEMENTS[item.element]
        ? '<span class="el-dot" style="background:' + ELEMENTS[item.element].color + '"></span>' : '';
      rows.push(
        '<button class="shop-item' + (afford ? ' afford' : '') + '" type="button" data-i="' + i + '">' +
          '<div class="si-top">' + elDot + '<b style="color:' + item.color + '">' + item.qualityName + '</b> ' + item.name +
          '<span class="si-slot">' + (SLOT_LABELS[item.slot] || item.slot) + '</span></div>' +
          '<div class="si-desc">' + item.desc + '</div>' +
          '<div class="si-cost">' + cost + '</div>' +
        '</button>'
      );
    });
    // Rebuilding the list detaches any previous hover target.
    if (this.tipAnchor && (this.el.tipPop && this.el.tipPop.classList.contains('tip-compare') || !this.tipAnchorAlive())) {
      this.hideTip();
    }
    this.el.shopList.innerHTML = rows.join('');
    this.el.shopList.querySelectorAll('.shop-item[data-i]').forEach((btn) => {
      const i = Number(btn.dataset.i);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Sound.unlock();
        this.hideTip();
        if (!g.shop.buy(i, g)) {
          Sound.play('deny');
          this.denyUpgrade('blacksmith');
        }
        this.lastShop = '';
        this.lastKey = '';
        btn.blur();
      });
      btn.addEventListener('pointerenter', () => this.showShopCompare(btn, i));
      btn.addEventListener('pointerleave', () => {
        if (this.tipAnchor === btn) this.hideTip();
      });
    });
  }

  updateLoadout() {
    const ar = this.game.arsenal;
    const elKey = Object.keys(ar.weaponElements).map((k) => k + ar.weaponElements[k]).join(',');
    const key = ar.version + ':' + ar.order.join(',') + Object.values(ar.weapons).join('.') + ':' + elKey
      + ':' + Object.keys(ar.passives).map((k) => k + ar.passives[k]).join(',');
    if (key === this.lastLoadout) return;
    this.lastLoadout = key;
    if (this.tipAnchor && this.el.loadout.contains(this.tipAnchor)) this.hideTip();
    const bits = [];
    for (const id of ar.order) {
      const el = ar.weaponElements[id];
      const elDef = el && ELEMENTS[el];
      const unique = ar.isUnique && ar.isUnique(id);
      let style = '';
      if (elDef) {
        style = 'border-color:' + elDef.color;
        if (unique) style += '; box-shadow:0 0 8px ' + elDef.color;
      }
      bits.push('<div class="load' + (unique ? ' unique' : '') + '" data-tip-kind="weapon" data-tip-id="' + id + '"' +
        (style ? ' style="' + style + '"' : '') + '>' +
        (ICONS[id] || '') +
        '<span>' + (unique ? '★' : ar.weapons[id]) + '</span>' +
        (elDef ? '<i class="el-dot" style="background:' + elDef.color + '"></i>' : '') + '</div>');
    }
    for (const id in ar.passives) {
      bits.push('<div class="load pass" data-tip-kind="passive" data-tip-id="' + id + '">' +
        (ICONS[id] || '') + '<span>' + ar.passives[id] + '</span></div>');
    }
    this.el.loadout.innerHTML = bits.join('');
  }

  updateClock() {
    const g = this.game;
    const night = g.phaseName === 'night' || g.phaseName === 'dusk';
    if (this.cache.night !== night) {
      this.cache.night = night;
      this.el.clockIcon.innerHTML = night ? ICONS.moon : ICONS.sun;
      this.el.clock.classList.toggle('night', night);
    }
    const day = g.dayNumber();
    if (this.cache.day !== day) {
      this.cache.day = day;
      this.el.dayText.textContent = 'Day ' + day;
    }
    const sec = Math.floor(g.time);
    if (this.cache.clockSec === sec && this.cache.raidAlive === g.raid.alive) return;
    this.cache.clockSec = sec;
    this.cache.raidAlive = g.raid.alive;
    this.el.dayFill.style.width = (g.phase() * 100).toFixed(1) + '%';
    let txt;
    const bossNight = g.isBossNight();
    if (g.raid.active) {
      txt = (g.activeBoss && !g.activeBoss.dead ? 'BOSS · ' : '') +
        'Raid: ' + (g.raid.alive + g.raid.queue.length) + ' left';
    } else if (g.phaseName === 'day') {
      txt = (bossNight ? 'Boss night' : 'Night') + ' in ' + formatTime(g.secondsToPhase(PHASE_NIGHT));
    } else if (g.phaseName === 'dusk') {
      txt = (bossNight ? 'Boss raid' : 'Raid') + ' in ' + formatTime(g.secondsToPhase(PHASE_NIGHT));
    } else {
      txt = 'Dawn in ' + formatTime(g.secondsToPhase(1));
    }
    this.el.phaseText.textContent = txt;
    this.el.phaseText.style.color = bossNight && g.phaseName !== 'night' ? '#ff8a9a' : '';
    this.el.clock.classList.toggle('raid', g.raid.active);
    this.el.threatText.textContent = 'Threat x' + g.threat().hp.toFixed(1);
  }

  cardCopy(card) {
    const ar = this.game.arsenal;
    if (card.kind === 'weapon') {
      const def = WEAPON_DEFS[card.id];
      const willUnique = card.level >= WEAPON_MAX && ar.elementOf(card.id);
      const uniqName = willUnique ? uniqueWeaponName(card.id, ar.elementOf(card.id)) : null;
      return {
        name: uniqName || def.name,
        tag: willUnique ? 'UNIQUE' : (card.level + '/' + WEAPON_MAX),
        desc: willUnique
          ? ('Awakens as ' + uniqName + ' — stronger stats & elemental look.')
          : (def.text[card.level - 1] || ''),
        icon: ICONS[card.id],
        color: willUnique && ELEMENTS[ar.elementOf(card.id)]
          ? ELEMENTS[ar.elementOf(card.id)].color
          : undefined,
      };
    }
    if (card.kind === 'passive') {
      const def = PASSIVE_DEFS[card.id];
      return {
        name: def.name,
        tag: card.level + '/' + def.max,
        desc: def.desc,
        icon: ICONS[card.id],
      };
    }
    if (card.kind === 'element') {
      const el = ELEMENTS[card.element];
      const wpn = WEAPON_DEFS[card.id];
      const inf = ELEMENT_INFUSE[card.element];
      const iconKey = { fire: 'ember', water: 'tide', nature: 'bloom', earth: 'quake', light: 'radiance', darkness: 'umbra' }[card.element];
      const atMax = ar.level(card.id) >= WEAPON_MAX;
      const uniqName = atMax ? uniqueWeaponName(card.id, card.element) : null;
      return {
        name: uniqName || inf.name,
        tag: atMax
          ? ('UNIQUE · ' + wpn.name + ' → ' + el.name)
          : ('1/1 · ' + wpn.name + ' → ' + el.name),
        desc: atMax
          ? ('Unlocks ' + uniqName + '. ' + inf.effect)
          : inf.effect,
        icon: ICONS[iconKey] || ICONS.ember,
        color: el.color,
      };
    }
    const def = BONUS_DEFS[card.id];
    return { name: def.name, tag: 'Bonus', desc: def.desc, icon: ICONS[card.id] || ICONS.gold };
  }

  showCards(cards, level) {
    const ov = this.el.cardOverlay;
    if (!cards) {
      ov.classList.add('hidden');
      this.el.cardRow.innerHTML = '';
      return;
    }
    const g = this.game;
    this.el.cardTitle.textContent = 'Level ' + level + ' — pick an upgrade';
    this.el.cardRerollLeft.textContent = g.rerollsLeft;
    this.el.cardBanishLeft.textContent = g.banishesLeft;
    this.el.cardReroll.disabled = g.rerollsLeft <= 0;
    this.el.cardReroll.classList.toggle('disabled', g.rerollsLeft <= 0);
    this.el.cardRow.innerHTML = '';
    cards.forEach((card, i) => {
      const c = this.cardCopy(card);
      const wrap = document.createElement('div');
      wrap.className = 'pick-wrap';
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'pick-card kind-' + card.kind;
      if (c.color) el.style.borderColor = c.color;
      el.innerHTML = '<kbd>' + (i + 1) + '</kbd><div class="pick-icon">' + (c.icon || '') + '</div>' +
        '<div class="pick-name">' + c.name + '</div><div class="pick-tag">' + c.tag + '</div>' +
        '<div class="pick-desc">' + c.desc + '</div>';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        Sound.unlock();
        this.game.pickCard(i);
      });
      const ban = document.createElement('button');
      ban.type = 'button';
      ban.className = 'banish-btn';
      ban.title = 'Banish this option for the rest of the run';
      ban.textContent = 'Banish';
      ban.disabled = g.banishesLeft <= 0;
      ban.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Sound.unlock();
        this.game.banishCard(i);
      });
      wrap.appendChild(el);
      wrap.appendChild(ban);
      this.el.cardRow.appendChild(wrap);
    });
    ov.classList.remove('hidden');
  }

  banner(title, sub, color) {
    const b = this.el.banner;
    this.el.bannerTitle.textContent = title;
    this.el.bannerTitle.style.color = color || '#ffe08a';
    this.el.bannerSub.textContent = sub || '';
    b.classList.remove('hidden');
    this.retrigger(b, 'show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.add('hidden'), 4200);
  }

  setSoundIcon() {
    this.el.btnSound.innerHTML = Sound.muted ? ICONS.mute : ICONS.sound;
    this.el.btnSound.classList.toggle('active', !Sound.muted);
  }

  setPausedIcon(paused) {
    this.el.btnPause.innerHTML = paused ? ICONS.play : ICONS.pause;
  }

  requestRestart() {
    const g = this.game;
    if (g.state === 'menu') {
      g.startNewRun();
      return;
    }
    this.askConfirm({
      title: 'Restart run?',
      message: 'Your current run will end. Credits are kept for progress already earned.',
      confirmLabel: 'Restart',
      onConfirm: () => g.startNewRun(),
    });
  }

  requestMainMenu() {
    const g = this.game;
    if (g.state === 'menu') {
      this.showMenuHome();
      return;
    }
    this.askConfirm({
      title: 'Return to main menu?',
      message: 'Leave this run and go back to the main menu?',
      confirmLabel: 'Main Menu',
      onConfirm: () => g.showMainMenu(),
    });
  }

  requestExitGame() {
    this.askConfirm({
      title: 'Exit game?',
      message: 'Close Forest Survivor and return to your desktop?',
      confirmLabel: 'Exit',
      onConfirm: () => this.exitGame(),
    });
  }

  isConfirmOpen() {
    return this.el.confirmOverlay && !this.el.confirmOverlay.classList.contains('hidden');
  }

  isUpdateOpen() {
    return this.el.updateOverlay && !this.el.updateOverlay.classList.contains('hidden');
  }

  askConfirm(opts) {
    if (!this.el.confirmOverlay) {
      if (opts.onConfirm) opts.onConfirm();
      return;
    }
    this.confirmAction = opts.onConfirm || null;
    if (this.el.confirmTitle) this.el.confirmTitle.textContent = opts.title || 'Are you sure?';
    if (this.el.confirmMessage) this.el.confirmMessage.textContent = opts.message || '';
    const yes = document.getElementById('btnConfirmYes');
    if (yes) yes.textContent = opts.confirmLabel || 'Yes';
    this.el.confirmOverlay.classList.remove('hidden');
  }

  acceptConfirm() {
    const fn = this.confirmAction;
    this.cancelConfirm();
    if (typeof fn === 'function') fn();
  }

  cancelConfirm() {
    this.confirmAction = null;
    if (this.el.confirmOverlay) this.el.confirmOverlay.classList.add('hidden');
  }

  currentBuildVersion() {
    return (typeof BUILD_VERSION === 'string' && BUILD_VERSION) || '?';
  }

  refreshMenuVersion() {
    const label = this.el.menuVersionLabel;
    const btn = this.el.menuVersionBtn;
    const badge = this.el.menuUpdateBadge;
    if (!label || !btn) return;
    const cur = (this.updateInfo && this.updateInfo.currentVersion) || this.currentBuildVersion();
    const hasUpdate = !!(this.updateInfo && this.updateInfo.version);
    const ready = this.updatePhase === 'ready' && hasUpdate;
    const downloading = this.updatePhase === 'downloading' && hasUpdate;
    label.textContent = 'v' + String(cur).replace(/^v/i, '');
    if (hasUpdate) {
      const next = String(this.updateInfo.version).replace(/^v/i, '');
      btn.disabled = downloading;
      btn.classList.add('has-update');
      btn.title = ready
        ? ('Version ' + next + ' downloaded — click to install')
        : downloading
          ? ('Downloading version ' + next + '…')
          : ('Version ' + next + ' available — click to update');
      if (badge) {
        badge.classList.remove('hidden');
        badge.textContent = ready ? 'Ready to install' : downloading ? 'Downloading…' : 'Update available';
      }
    } else {
      btn.disabled = true;
      btn.classList.remove('has-update');
      btn.title = 'Current version';
      if (badge) badge.classList.add('hidden');
    }
  }

  requestMenuUpdate() {
    if (!this.updateInfo || !this.updateInfo.version) return;
    if (this.updatePhase === 'downloading') return;
    if (this.updatePhase === 'ready') {
      this.showUpdateReady(this.updateInfo);
      return;
    }
    const cur = this.updateInfo.currentVersion || this.currentBuildVersion();
    const next = this.updateInfo.version;
    this.askConfirm({
      title: 'Update available',
      message: 'Version ' + next + ' is out (you have ' + cur +
        '). Download and install it now? The game will restart when the update finishes.',
      confirmLabel: 'Update',
      onConfirm: () => {
        this.showUpdateAvailable(this.updateInfo, { startDownload: true });
      },
    });
  }

  bindUpdater() {
    const api = typeof window !== 'undefined' ? window.jungleUpdate : null;
    if (!api || !api.available) return;
    api.onAvailable((info) => {
      this.updateInfo = info || null;
      this.updatePhase = 'ask';
      this.refreshMenuVersion();
      if (this.game && this.game.state === 'menu') {
        this.banner('Update available', 'v' + String(info.version || '').replace(/^v/i, '') + ' — tap version below the menu', '#9ef08a');
      }
    });
    api.onProgress((p) => this.showUpdateProgress(p));
    api.onReady((info) => {
      if (info && info.version && this.updateInfo) this.updateInfo.version = info.version;
      this.showUpdateReady(info);
      this.refreshMenuVersion();
    });
    api.onError((err) => this.showUpdateError(err));
  }

  showUpdateAvailable(info, opts) {
    if (!this.el.updateOverlay || !info) return;
    this.updateInfo = info;
    this.updatePhase = 'ask';
    this.refreshMenuVersion();
    const cur = info.currentVersion || this.currentBuildVersion();
    const next = info.version || '?';
    if (this.el.updateTitle) this.el.updateTitle.textContent = 'Update available';
    if (this.el.updateMessage) {
      this.el.updateMessage.textContent = 'Version ' + next + ' is out (you have ' + cur +
        '). Download and install it from inside the game.';
    }
    if (this.el.updateProgressWrap) this.el.updateProgressWrap.classList.add('hidden');
    const yes = document.getElementById('btnUpdateYes');
    const no = document.getElementById('btnUpdateNo');
    if (yes) {
      yes.disabled = false;
      yes.textContent = 'Update now';
    }
    if (no) {
      no.disabled = false;
      no.classList.remove('hidden');
      no.textContent = 'Later';
    }
    if (this.el.updateHint) {
      this.el.updateHint.textContent = 'Enter to update · Esc to dismiss';
    }
    this.el.updateOverlay.classList.remove('hidden');
    if (opts && opts.startDownload) this.acceptUpdate();
  }

  showUpdateProgress(p) {
    if (!this.el.updateOverlay) return;
    this.updatePhase = 'downloading';
    this.refreshMenuVersion();
    if (this.el.updateProgressWrap) this.el.updateProgressWrap.classList.remove('hidden');
    const pct = Math.max(0, Math.min(100, Number(p && p.percent) || 0));
    if (this.el.updateProgressFill) this.el.updateProgressFill.style.width = pct.toFixed(1) + '%';
    if (this.el.updateProgressText) {
      this.el.updateProgressText.textContent = 'Downloading… ' + pct.toFixed(0) + '%';
    }
    if (this.el.updateTitle) this.el.updateTitle.textContent = 'Downloading update';
    if (this.el.updateMessage) this.el.updateMessage.textContent = 'Please wait while the new version downloads.';
    const yes = document.getElementById('btnUpdateYes');
    const no = document.getElementById('btnUpdateNo');
    if (yes) yes.disabled = true;
    if (no) no.disabled = true;
    if (this.el.updateHint) this.el.updateHint.textContent = 'Installing will restart the game';
  }

  showUpdateReady(info) {
    if (!this.el.updateOverlay) return;
    this.updatePhase = 'ready';
    this.refreshMenuVersion();
    const ver = (info && info.version) || (this.updateInfo && this.updateInfo.version) || '';
    if (this.el.updateTitle) this.el.updateTitle.textContent = 'Ready to install';
    if (this.el.updateMessage) {
      this.el.updateMessage.textContent = 'Version ' + (ver || 'new') +
        ' downloaded. Restart now to finish updating.';
    }
    if (this.el.updateProgressWrap) this.el.updateProgressWrap.classList.add('hidden');
    const yes = document.getElementById('btnUpdateYes');
    const no = document.getElementById('btnUpdateNo');
    if (yes) {
      yes.disabled = false;
      yes.textContent = 'Restart & install';
    }
    if (no) {
      no.disabled = false;
      no.classList.remove('hidden');
      no.textContent = 'Later';
    }
    if (this.el.updateHint) this.el.updateHint.textContent = 'Enter to restart · Esc to dismiss';
    this.el.updateOverlay.classList.remove('hidden');
  }

  showUpdateError(err) {
    const msg = (err && err.message) || 'Update failed';
    this.banner('Update issue', msg.slice(0, 120), '#ff9a8a');
    if (this.updatePhase === 'downloading' || this.updatePhase === 'ask') {
      this.updatePhase = 'ask';
      this.refreshMenuVersion();
      const yes = document.getElementById('btnUpdateYes');
      const no = document.getElementById('btnUpdateNo');
      if (yes) {
        yes.disabled = false;
        yes.textContent = 'Retry download';
      }
      if (no) no.disabled = false;
      if (this.el.updateProgressWrap) this.el.updateProgressWrap.classList.add('hidden');
      if (this.el.updateTitle) this.el.updateTitle.textContent = 'Update available';
      if (this.el.updateMessage) {
        this.el.updateMessage.textContent = 'Download failed. Check your connection and try again.';
      }
      if (this.el.updateHint) this.el.updateHint.textContent = 'Enter to retry · Esc to dismiss';
    }
  }

  acceptUpdate() {
    const api = window.jungleUpdate;
    if (!api) {
      this.dismissUpdate();
      return;
    }
    if (this.updatePhase === 'ready') {
      api.install().catch(() => {});
      return;
    }
    if (this.updatePhase === 'downloading') return;
    this.updatePhase = 'downloading';
    this.showUpdateProgress({ percent: 0 });
    const yes = document.getElementById('btnUpdateYes');
    if (yes) yes.disabled = true;
    if (this.el.updateTitle) this.el.updateTitle.textContent = 'Starting update…';
    api.download().then((res) => {
      if (res && res.ok === false) {
        this.showUpdateError({ message: res.error || 'Download failed' });
      }
    }).catch((err) => {
      this.showUpdateError({ message: String(err && err.message || err) });
    });
  }

  dismissUpdate() {
    // Keep pending update info so the main-menu indicator stays clickable.
    if (this.updateInfo && this.updateInfo.version) {
      this.updatePhase = (this.updatePhase === 'ready') ? 'ready' : 'ask';
    } else {
      this.updatePhase = null;
    }
    if (this.el.updateOverlay) this.el.updateOverlay.classList.add('hidden');
    const yes = document.getElementById('btnUpdateYes');
    const no = document.getElementById('btnUpdateNo');
    if (yes) yes.disabled = false;
    if (no) no.disabled = false;
    this.refreshMenuVersion();
  }

  disarmRestart() {
    this.restartArmed = false;
    clearTimeout(this.restartTimer);
    if (this.el.btnRestart) {
      this.el.btnRestart.classList.remove('armed');
      this.el.btnRestart.title = 'Restart';
    }
  }

  showPause(on) {
    this.el.pauseOverlay.classList.toggle('hidden', !on);
    if (on) this.renderPauseSheet();
    else this.hideOptions(true);
    this.setPausedIcon(on);
  }

  pauseSection(title, body) {
    if (!body) return '';
    return '<section class="pause-sec"><h2>' + title + '</h2>' + body + '</section>';
  }

  pauseStatGrid(rows) {
    if (!rows || !rows.length) return '<p class="pause-empty">None</p>';
    return '<div class="pause-stat-grid">' + rows.map((r) =>
      '<div class="pause-stat"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'
    ).join('') + '</div>';
  }

  renderPauseSheet() {
    const el = this.el.pauseSheet;
    if (!el) return;
    const g = this.game;
    const p = g.player;
    const ps = g.ps || {};
    const ar = g.arsenal;
    const pct = (v) => Math.round((v || 0) * 100) + '%';
    const signedPct = (v) => ((v >= 0 ? '+' : '') + Math.round(v * 100) + '%');

    const runRows = [
      ['Time', formatTime(g.time || 0)],
      ['Day', String(g.dayNumber())],
      ['Phase', (g.phaseName ? g.phaseName.charAt(0).toUpperCase() + g.phaseName.slice(1) : '—')],
      ['Threat', '×' + (g.threat ? g.threat().hp.toFixed(1) : '1.0')],
      ['Level', String(g.level || 1)],
      ['XP', Math.floor(g.xp || 0) + ' / ' + xpNeeded(g.level || 1)],
      ['HP', Math.ceil(p.hp) + ' / ' + Math.ceil(p.maxHp)],
      ['Wood', formatNum(g.res.wood || 0)],
      ['Meat', formatNum(g.res.meat || 0)],
      ['Gold', formatNum(g.res.gold || 0)],
      ['Kills', String(g.counters.kills || 0)],
      ['Trees', String(g.counters.trees || 0)],
      ['Raids', String(g.counters.raids || 0)],
      ['Bosses', String(g.counters.bosses || 0)],
      ['Aim lock', g.faceNearest ? 'On' : 'Off'],
      ['Dash charges', String(ps.dashCharges || 1)],
    ];

    const combatRows = [
      ['Damage', pct(ps.might)],
      ['Flat damage', String(Math.round((ps.flatDamage || 0) * 10) / 10)],
      ['Crit chance', pct(ps.crit)],
      ['Cooldown', '×' + (ps.cooldown != null ? ps.cooldown.toFixed(2) : '1.00')],
      ['Axe spin', '×' + (ps.spin != null ? ps.spin.toFixed(2) : '1.00')],
      ['Area / reach', '×' + (ps.area != null ? ps.area.toFixed(2) : '1.00')],
      ['Move speed', String(Math.round(ps.moveSpeed || 0))],
      ['Pickup range', String(Math.round(ps.magnet || 0))],
      ['Armor', pct(ps.armor)],
      ['Regen', (ps.regen != null ? ps.regen.toFixed(2) : '0') + ' HP/s'],
      ['Lifesteal', pct(ps.lifesteal)],
      ['Thorns', String(Math.round((ps.thorns || 0) * 10) / 10)],
      ['XP gain', '×' + (ps.xpGain != null ? ps.xpGain.toFixed(2) : '1.00')],
      ['Loot', '×' + (ps.lootMult != null ? ps.lootMult.toFixed(2) : '1.00')],
      ['Extra projectiles', '+' + (ps.amount || 0)],
    ];
    if (ps.attackElement && ELEMENTS[ps.attackElement]) {
      combatRows.push(['Attack element', ELEMENTS[ps.attackElement].name]);
    }
    if (ps.elementPower) {
      for (const id of ELEMENT_IDS) {
        const v = ps.elementPower[id] || 0;
        if (v > 0.001) combatRows.push([ELEMENTS[id].name + ' power', signedPct(v)]);
      }
    }
    if (ps.resist) {
      for (const id of ELEMENT_IDS) {
        const v = ps.resist[id];
        if (v && v > 0.001) combatRows.push(['Resist ' + ELEMENTS[id].name, signedPct(v)]);
      }
    }

    let weaponsHtml = '';
    if (ar && ar.order && ar.order.length) {
      weaponsHtml = '<div class="pause-cards">' + ar.order.map((id) => {
        const def = WEAPON_DEFS[id];
        if (!def) return '';
        const lvl = ar.weapons[id] || 0;
        const unique = ar.isUnique && ar.isUnique(id);
        const el = ar.weaponElements[id];
        const elDef = el && ELEMENTS[el];
        const stats = ar.stats ? ar.stats(id) : def.stats(lvl);
        const rows = this.formatWeaponStatRows(stats, id);
        const name = ar.displayName ? ar.displayName(id) : def.name;
        return (
          '<article class="pause-card">' +
            '<div class="pause-card-head">' +
              '<div class="pause-card-icon">' + (ICONS[id] || '') + '</div>' +
              '<div>' +
                '<div class="pause-card-name"' + (elDef ? ' style="color:' + elDef.color + '"' : '') + '>' + name + '</div>' +
                '<div class="pause-card-tag">' +
                  (unique ? 'Unique · ' : '') + 'Lv ' + lvl + (lvl >= WEAPON_MAX ? ' (MAX)' : '') +
                  (elDef ? ' · ' + elDef.name : '') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<p class="pause-card-desc">' + (def.text[0] || '') + '</p>' +
            this.pauseStatGrid(rows) +
          '</article>'
        );
      }).join('') + '</div>';
    } else {
      weaponsHtml = '<p class="pause-empty">No weapons yet — level up to pick cards.</p>';
    }

    let passivesHtml = '';
    const passIds = ar ? Object.keys(ar.passives || {}) : [];
    if (passIds.length) {
      passivesHtml = '<div class="pause-cards pause-cards-compact">' + passIds.map((id) => {
        const def = PASSIVE_DEFS[id];
        if (!def) return '';
        const lvl = ar.passives[id] || 0;
        return (
          '<article class="pause-card">' +
            '<div class="pause-card-head">' +
              '<div class="pause-card-icon">' + (ICONS[id] || '') + '</div>' +
              '<div>' +
                '<div class="pause-card-name">' + def.name + '</div>' +
                '<div class="pause-card-tag">Lv ' + lvl + ' / ' + def.max + '</div>' +
              '</div>' +
            '</div>' +
            '<p class="pause-card-desc">' + def.desc + '</p>' +
            this.pauseStatGrid(this.passiveTipStatRows(id, lvl)) +
          '</article>'
        );
      }).join('') + '</div>';
    } else {
      passivesHtml = '<p class="pause-empty">No passive upgrades yet.</p>';
    }

    let gearHtml = '';
    const equipped = [];
    if (g.shop && g.shop.equipped) {
      for (const slot of ITEM_SLOTS) {
        const it = g.shop.equipped[slot];
        if (!it) continue;
        equipped.push({ slot, it });
      }
    }
    if (equipped.length) {
      gearHtml = '<div class="pause-cards pause-cards-compact">' + equipped.map(({ slot, it }) => {
        const elDef = it.element && ELEMENTS[it.element];
        return (
          '<article class="pause-card">' +
            '<div class="pause-card-head">' +
              '<div>' +
                '<div class="pause-card-name" style="color:' + (it.color || '#ffe08a') + '">' +
                  it.qualityName + ' ' + it.name +
                '</div>' +
                '<div class="pause-card-tag">' + (SLOT_LABELS[slot] || slot) +
                  (elDef ? ' · ' + elDef.name : '') + '</div>' +
              '</div>' +
            '</div>' +
            this.pauseStatGrid(this.gearTipStatRows(it)) +
          '</article>'
        );
      }).join('') + '</div>';
    } else {
      gearHtml = '<p class="pause-empty">No gear equipped — visit the blacksmith at camp.</p>';
    }

    let buffsHtml = '';
    const buffIds = [];
    if (g.buffs) {
      for (const id in g.buffs) {
        if (g.buffs[id] > 0 && POWERUPS[id]) buffIds.push(id);
      }
    }
    if (buffIds.length) {
      buffsHtml = this.pauseStatGrid(buffIds.map((id) => [
        POWERUPS[id].name,
        Math.ceil(g.buffs[id]) + 's · ' + POWERUPS[id].desc,
      ]));
    } else {
      buffsHtml = '<p class="pause-empty">No active power-ups.</p>';
    }

    el.innerHTML =
      this.pauseSection('Run', this.pauseStatGrid(runRows)) +
      this.pauseSection('Combat stats', this.pauseStatGrid(combatRows)) +
      this.pauseSection('Weapons', weaponsHtml) +
      this.pauseSection('Upgrades', passivesHtml) +
      this.pauseSection('Gear', gearHtml) +
      this.pauseSection('Buffs', buffsHtml);
  }

  showGameOver(stats) {
    this.el.goTitle.textContent = stats.reason === 'camp' ? 'Camp Destroyed!' : 'You Fainted!';
    const rows = [
      ['Survived', formatTime(stats.time) + ' (day ' + stats.day + ')'],
      ['Raids repelled', stats.raids],
      ['Bosses slain', stats.bosses || 0],
      ['Level reached', stats.level],
      ['Trees chopped', stats.trees],
      ['Animals defeated', stats.kills],
      ['Gold collected', stats.gold],
      ['Camp upgrades', stats.upgrades],
    ];
    this.el.goStats.innerHTML = rows.map((r) => '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('');
    if (this.el.goCredits) {
      this.el.goCredits.textContent = '+' + (stats.credits || 0) + ' Credits  ·  Wallet: ' + (stats.totalCredits || 0);
    }
    this.el.gameOverOverlay.classList.remove('hidden');
  }

  showMainMenu() {
    document.body.classList.add('in-menu');
    this.el.pauseOverlay.classList.add('hidden');
    this.el.gameOverOverlay.classList.add('hidden');
    this.hideOptions(true);
    this.cancelConfirm();
    this.showCards(null);
    this.showBossBar(null);
    this.showMenuHome();
    this.refreshMenuCredits();
    this.el.mainMenu.classList.remove('hidden');
  }

  hideMainMenu() {
    document.body.classList.remove('in-menu');
    this.el.mainMenu.classList.add('hidden');
  }

  isOptionsOpen() {
    return this.el.optionsOverlay && !this.el.optionsOverlay.classList.contains('hidden');
  }

  showOptions(from) {
    Settings.returnTo = from === 'pause' ? 'pause' : 'menu';
    this.syncOptionsForm();
    if (this.el.optionsOverlay) this.el.optionsOverlay.classList.remove('hidden');
  }

  hideOptions(silent) {
    if (this.el.optionsOverlay) this.el.optionsOverlay.classList.add('hidden');
    if (silent) return;
    // Pause overlay stays up underneath; menu stays on home.
  }

  syncOptionsForm() {
    const mode = Settings.displayMode;
    document.querySelectorAll('.options-mode').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    const sel = this.el.optResolution;
    if (sel) {
      const list = Settings.resolutions();
      const cur = Settings.width + 'x' + Settings.height;
      let html = '';
      let hasCur = false;
      for (const r of list) {
        const key = r.width + 'x' + r.height;
        if (key === cur) hasCur = true;
        html += '<option value="' + key + '"' + (key === cur ? ' selected' : '') + '>' +
          (r.label || key) + '</option>';
      }
      if (!hasCur) {
        html = '<option value="' + cur + '" selected>' + Settings.width + ' × ' + Settings.height + '</option>' + html;
      }
      sel.innerHTML = html;
      sel.disabled = mode !== 'windowed';
    }
    const vol = Math.round(Settings.musicVolume * 100);
    if (this.el.optMusicVolume) this.el.optMusicVolume.value = String(vol);
    if (this.el.optMusicPct) this.el.optMusicPct.textContent = vol + '%';
    const uiPct = Math.round(Settings.uiScale * 100);
    if (this.el.optUiScale) this.el.optUiScale.value = String(uiPct);
    if (this.el.optUiScalePct) this.el.optUiScalePct.textContent = uiPct + '%';
    const fontPct = Math.round(Settings.fontScale * 100);
    if (this.el.optFontScale) this.el.optFontScale.value = String(fontPct);
    if (this.el.optFontScalePct) this.el.optFontScalePct.textContent = fontPct + '%';
    const shakePct = Math.round(Settings.shakeScale * 100);
    if (this.el.optShakeScale) this.el.optShakeScale.value = String(shakePct);
    if (this.el.optShakePct) this.el.optShakePct.textContent = shakePct + '%';
    if (this.el.optTutorials) {
      const on = !!Settings.tutorialsEnabled;
      this.el.optTutorials.classList.toggle('on', on);
      this.el.optTutorials.setAttribute('aria-pressed', on ? 'true' : 'false');
      this.el.optTutorials.textContent = on ? 'On' : 'Off';
    }
  }

  isTutorialOpen() {
    return this.el.tutorialOverlay && !this.el.tutorialOverlay.classList.contains('hidden');
  }

  showTutorial(id) {
    const def = TUTORIAL_CONTENT[id];
    if (!def || !this.el.tutorialOverlay) return;
    if (this.el.tutorialTitle) this.el.tutorialTitle.textContent = def.title;
    if (this.el.tutorialBody) this.el.tutorialBody.innerHTML = def.body;
    this.el.pauseOverlay.classList.add('hidden');
    this.el.tutorialOverlay.classList.remove('hidden');
  }

  hideTutorial() {
    if (this.el.tutorialOverlay) this.el.tutorialOverlay.classList.add('hidden');
  }

  showMenuHome() {
    this.el.menuHome.classList.remove('hidden');
    this.el.menuMeta.classList.add('hidden');
    if (this.el.menuGlossary) this.el.menuGlossary.classList.add('hidden');
    const shell = this.el.mainMenu && this.el.mainMenu.querySelector('.menu-shell');
    if (shell) shell.classList.remove('glossary-open');
    this.refreshMenuCredits();
  }

  exitGame() {
    if (window.jungleSave && typeof window.jungleSave.quit === 'function') {
      window.jungleSave.quit();
      return;
    }
    window.close();
  }

  showMetaUpgrades() {
    this.el.menuHome.classList.add('hidden');
    this.el.menuMeta.classList.remove('hidden');
    if (this.el.menuGlossary) this.el.menuGlossary.classList.add('hidden');
    const shell = this.el.mainMenu && this.el.mainMenu.querySelector('.menu-shell');
    if (shell) shell.classList.remove('glossary-open');
    this.refreshMenuCredits();
    this.renderMetaPanel();
  }

  showGlossary() {
    this.el.menuHome.classList.add('hidden');
    this.el.menuMeta.classList.add('hidden');
    this.el.menuGlossary.classList.remove('hidden');
    const shell = this.el.mainMenu.querySelector('.menu-shell');
    if (shell) shell.classList.add('glossary-open');
    this.setGlossaryTab(this.glossaryTab || 'beasts');
  }

  setGlossaryTab(tab) {
    this.glossaryTab = tab || 'beasts';
    document.querySelectorAll('.glossary-tab').forEach((el) => {
      el.classList.toggle('active', el.dataset.glossary === this.glossaryTab);
    });
    this.renderGlossary();
  }

  renderGlossary() {
    const list = this.el.glossaryList;
    if (!list) return;
    let html = '';
    let count = 0;
    if (this.glossaryTab === 'beasts') {
      const ids = Object.keys(SPECIES);
      count = ids.length;
      const variantBlurb = (typeof ANIMAL_VARIANTS !== 'undefined')
        ? '<div class="glossary-section">Variants</div>' +
          '<p class="glossary-blurb">Any beast can spawn as <b>Basic</b>, <b>Dire</b> (darker, tougher), ' +
          '<b>Necromantic</b> (undead — splits into 3 lesser copies on death), or <b>Demonic</b> ' +
          '(crimson with spikes — leaves a large fire pool on death). ' +
          'Variants stack with veterancy (bronze → silver → gold stars) and elements.</p>'
        : '';
      html = variantBlurb + ids.map((id) => this.glossaryBeastCard(id)).join('');
    } else if (this.glossaryTab === 'cards') {
      const weapons = Object.keys(WEAPON_DEFS);
      const passives = Object.keys(PASSIVE_DEFS);
      const bonuses = typeof BONUS_DEFS !== 'undefined' ? Object.keys(BONUS_DEFS) : [];
      const powerups = typeof POWERUPS !== 'undefined' ? Object.keys(POWERUPS) : [];
      count = weapons.length + passives.length + bonuses.length + powerups.length;
      html =
        '<div class="glossary-section">Weapons</div>' +
        weapons.map((id) => this.glossaryWeaponCard(id)).join('') +
        '<div class="glossary-section">Passives</div>' +
        passives.map((id) => this.glossaryPassiveCard(id)).join('') +
        (bonuses.length
          ? '<div class="glossary-section">Bonus cards</div>' +
            bonuses.map((id) => this.glossaryBonusCard(id)).join('')
          : '') +
        (powerups.length
          ? '<div class="glossary-section">Power-ups</div>' +
            powerups.map((id) => this.glossaryPowerupCard(id)).join('')
          : '');
    } else {
      count = UPGRADES.length;
      html = UPGRADES.map((def) => this.glossaryBuildingCard(def)).join('');
    }
    list.innerHTML = html;
    if (this.el.glossaryCount) this.el.glossaryCount.textContent = count + ' entries';
  }

  glossaryStat(label, value) {
    return '<span class="glossary-stat">' + label + ' <b>' + value + '</b></span>';
  }

  glossaryBeastCard(id) {
    const sp = SPECIES[id];
    const tags = [];
    if (sp.ranged) tags.push('Ranged');
    if (sp.family) tags.push('Dire');
    if (sp.passive) tags.push('Passive');
    const stats = [
      this.glossaryStat('HP', sp.hp),
      this.glossaryStat('Dmg', sp.dmg),
      this.glossaryStat('Speed', sp.chase || sp.flee || sp.wander),
      this.glossaryStat('Aggro', Math.round((sp.aggro || 0) * (typeof AGGRO_RANGE_MULT === 'number' ? AGGRO_RANGE_MULT : 1))),
      this.glossaryStat('XP', sp.xp),
      this.glossaryStat('Meat', sp.meat[0] + '–' + sp.meat[1]),
    ];
    if (sp.ranged) {
      stats.push(this.glossaryStat('Range', sp.range || '—'));
      stats.push(this.glossaryStat('Shot', sp.shotKind || 'bolt'));
    }
    if (sp.goldChance > 0) stats.push(this.glossaryStat('Gold', Math.round(sp.goldChance * 100) + '%'));
    if (BOSS_NAMES[id]) stats.push(this.glossaryStat('Boss form', BOSS_NAMES[id]));
    return (
      '<div class="glossary-card">' +
        '<div class="glossary-icon"><div class="glossary-swatch" style="background:' + (sp.color || '#888') + '"></div></div>' +
        '<div class="glossary-body">' +
          '<div class="glossary-title"><span class="glossary-name">' + sp.name + '</span>' +
            (tags.length ? tags.map((t) => '<span class="glossary-tag">' + t + '</span>').join('') : '') +
          '</div>' +
          '<div class="glossary-desc">' + (sp.blurb
            ? sp.blurb
            : sp.ranged
              ? 'Keeps distance and hurls ' + (sp.shotKind === 'log' ? 'wooden logs'
                : sp.shotKind === 'wool' ? 'wool'
                : sp.shotKind === 'rock' ? ((sp.shotCount || 1) > 1 ? (sp.shotCount + ' rocks at once') : 'rocks')
                : 'projectiles') + '.'
              : 'Melee beast of the forest.') +
          '</div>' +
          '<div class="glossary-stats">' + stats.join('') + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  glossaryWeaponCard(id) {
    const def = WEAPON_DEFS[id];
    const s1 = def.stats(1);
    const sm = def.stats(WEAPON_MAX);
    const fmt = (s) => {
      const bits = [];
      if (s.dmg != null) bits.push('dmg ' + s.dmg);
      if (s.count != null) bits.push('×' + s.count);
      if (s.radius != null) bits.push('r ' + Math.round(s.radius));
      if (s.size != null) bits.push('size ' + Math.round(s.size));
      if (s.range != null) bits.push('rng ' + Math.round(s.range));
      if (s.dist != null) bits.push('dist ' + Math.round(s.dist));
      if (s.cd != null) bits.push('cd ' + s.cd.toFixed(2) + 's');
      if (s.pierce != null) bits.push('pierce ' + s.pierce);
      return bits.join(' · ') || '—';
    };
    const uniques = (typeof UNIQUE_NAMES !== 'undefined' && UNIQUE_NAMES[id])
      ? ELEMENT_IDS.map((el) => {
          const nm = UNIQUE_NAMES[id][el];
          const col = ELEMENTS[el] ? ELEMENTS[el].color : '#fff';
          return '<span class="glossary-tag" style="border-color:' + col + ';color:' + col + '">' + nm + '</span>';
        }).join('')
      : '';
    return (
      '<div class="glossary-card">' +
        '<div class="glossary-icon">' + (ICONS[id] || ICONS.weapon || '') + '</div>' +
        '<div class="glossary-body">' +
          '<div class="glossary-title"><span class="glossary-name">' + def.name + '</span>' +
            '<span class="glossary-tag">Max ' + WEAPON_MAX + '</span></div>' +
          '<div class="glossary-desc">' + (def.text[0] || '') +
            ' At max level + infusion, awakens into a unique elemental form.</div>' +
          (uniques ? '<div class="glossary-unique-row">' + uniques + '</div>' : '') +
          '<div class="glossary-stats">' +
            this.glossaryStat('Lv1', fmt(s1)) +
            this.glossaryStat('Lv' + WEAPON_MAX, fmt(sm)) +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  glossaryPassiveCard(id) {
    const def = PASSIVE_DEFS[id];
    const el = typeof ELEMENT_PASSIVES !== 'undefined' ? ELEMENT_PASSIVES[id] : null;
    return (
      '<div class="glossary-card">' +
        '<div class="glossary-icon">' + (ICONS[id] || '') + '</div>' +
        '<div class="glossary-body">' +
          '<div class="glossary-title"><span class="glossary-name">' + def.name + '</span>' +
            '<span class="glossary-tag">Max ' + def.max + '</span>' +
            (el ? '<span class="glossary-tag">' + el.charAt(0).toUpperCase() + el.slice(1) + '</span>' : '') +
          '</div>' +
          '<div class="glossary-desc">' + def.desc + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  glossaryBonusCard(id) {
    const def = BONUS_DEFS[id];
    return (
      '<div class="glossary-card">' +
        '<div class="glossary-icon">' + (ICONS[id] || ICONS.gold || '') + '</div>' +
        '<div class="glossary-body">' +
          '<div class="glossary-title"><span class="glossary-name">' + def.name + '</span>' +
            '<span class="glossary-tag">Bonus</span></div>' +
          '<div class="glossary-desc">' + def.desc + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  glossaryPowerupCard(id) {
    const def = POWERUPS[id];
    return (
      '<div class="glossary-card">' +
        '<div class="glossary-icon"><div class="glossary-swatch" style="background:' + def.color + '"></div></div>' +
        '<div class="glossary-body">' +
          '<div class="glossary-title"><span class="glossary-name">' + def.name + '</span>' +
            '<span class="glossary-tag">' + def.label + '</span></div>' +
          '<div class="glossary-desc">' + def.desc + '</div>' +
          '<div class="glossary-stats">' +
            this.glossaryStat('Duration', def.duration ? def.duration + 's' : 'Instant') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  glossaryBuildingCard(def) {
    const empty = {};
    const maxed = {};
    for (const u of UPGRADES) { empty[u.id] = 0; maxed[u.id] = u.max; }
    // Prerequisites for value() at max — unlock tower chain so dependent stats resolve.
    if (def.requires) {
      for (const u of UPGRADES) {
        if (u.id === 'towers') maxed.towers = Math.max(maxed.towers, 1);
      }
    }
    const at0 = computeStats(empty);
    const atMax = computeStats(maxed);
    const cost0 = upgradeCost(def, 0);
    const costBits = RES_ORDER.filter((k) => cost0[k]).map((k) => cost0[k] + ' ' + k).join(', ');
    return (
      '<div class="glossary-card">' +
        '<div class="glossary-icon">' + (ICONS[def.id] || ICONS.camp || '') + '</div>' +
        '<div class="glossary-body">' +
          '<div class="glossary-title"><span class="glossary-name">' + def.name + '</span>' +
            '<span class="glossary-tag">Max ' + def.max + '</span></div>' +
          '<div class="glossary-desc">' + def.desc +
            (def.reqText ? ' (' + def.reqText + ')' : '') + '</div>' +
          '<div class="glossary-stats">' +
            this.glossaryStat('Base cost', costBits || '—') +
            this.glossaryStat('Lv0', def.value(at0)) +
            this.glossaryStat('Max', def.value(atMax)) +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  refreshMenuCredits() {
    const m = this.game.meta;
    const txt = formatNum(m.credits) + ' Credits';
    if (this.el.menuCreditsHome) this.el.menuCreditsHome.textContent = txt;
    if (this.el.menuCreditsMeta) this.el.menuCreditsMeta.textContent = txt;
    if (this.el.menuMetaStats) {
      this.el.menuMetaStats.innerHTML =
        '<span>Runs ' + m.runs + '</span><span>Best day ' + m.bestDay + '</span><span>Earned ' + formatNum(m.totalCreditsEarned) + '</span>';
    }
  }

  /** Baseline run stats with permanent meta bonuses applied (no run gear/cards). */
  renderMetaCharacterStats() {
    const el = this.el.metaStats;
    if (!el) return;
    const b = this.game.meta.bonuses();
    const ps = computePlayerStats({}, null, 1, b);
    const pct = (v) => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
    const mul = (v) => '×' + (1 + (v || 0)).toFixed(2);
    const bonus = (text, on) => on
      ? '<span class="ms-bonus">' + text + '</span>'
      : '<span class="ms-flat">—</span>';
    const rows = [
      ['Max HP', String(ps.maxHp), bonus('+' + b.maxHp, b.maxHp > 0)],
      ['Regen', ps.regen.toFixed(2) + '/s', bonus('+' + b.regen.toFixed(2), b.regen > 0)],
      ['Move speed', Math.round(ps.moveSpeed) + '', bonus(pct(b.move), b.move > 0)],
      ['Pickup range', Math.round(ps.magnet) + '', bonus(pct(b.magnet), b.magnet > 0)],
      ['Damage', Math.round(ps.might * 100) + '%', bonus(pct(b.damagePct), b.damagePct > 0)],
      ['Flat damage', String(ps.flatDamage), bonus('+' + b.flatDamage, b.flatDamage > 0)],
      ['Elemental dmg', Math.round((1 + (b.elemPct || 0)) * 100) + '%', bonus(pct(b.elemPct), b.elemPct > 0)],
      ['Elemental flat', (b.elemFlat || 0).toFixed(1), bonus('+' + (b.elemFlat || 0).toFixed(1), b.elemFlat > 0)],
      ['Card rerolls', String(5 + (b.rerolls || 0)), bonus('+' + b.rerolls, b.rerolls > 0)],
      ['Card banishes', String(5 + (b.banishes || 0)), bonus('+' + b.banishes, b.banishes > 0)],
      ['Building income', mul(b.income), bonus(pct(b.income), b.income > 0)],
      ['Wall HP', mul(b.wallHp), bonus(pct(b.wallHp), b.wallHp > 0)],
      ['Tower damage', mul(b.towerDmg), bonus(pct(b.towerDmg), b.towerDmg > 0)],
      ['Campfire heal', mul(b.campHeal), bonus(pct(b.campHeal), b.campHeal > 0)],
      ['Smith quality', mul(b.smithLuck), bonus(pct(b.smithLuck), b.smithLuck > 0)],
    ];
    el.innerHTML =
      '<div class="ms-title">Current stats</div>' +
      '<div class="ms-grid">' +
      rows.map((r) =>
        '<div class="ms-row"><span class="ms-lab">' + r[0] + '</span>' +
        '<b class="ms-val">' + r[1] + '</b>' + r[2] + '</div>'
      ).join('') +
      '</div>';
  }

  renderMetaPanel() {
    this.renderMetaCharacterStats();
    this.renderMetaRefund();
    this.renderMetaList();
  }

  renderMetaRefund() {
    const meta = this.game.meta;
    const spent = meta.spentOnUpgrades();
    if (this.el.metaRefundAmount) this.el.metaRefundAmount.textContent = formatNum(spent);
    if (this.el.btnMetaRefund) {
      this.el.btnMetaRefund.disabled = spent <= 0;
      this.el.btnMetaRefund.classList.toggle('locked', spent <= 0);
      this.el.btnMetaRefund.title = spent > 0
        ? 'Reset all upgrades and refund ' + formatNum(spent) + ' credits'
        : 'No upgrades to refund';
    }
  }

  refundMetaUpgrades() {
    const meta = this.game.meta;
    const spent = meta.spentOnUpgrades();
    if (spent <= 0) {
      Sound.play('deny');
      return;
    }
    const ok = window.confirm('Refund all character upgrades for ' + formatNum(spent) + ' credits?\nThis resets every permanent upgrade.');
    if (!ok) return;
    const refunded = meta.refundAll();
    if (refunded > 0) {
      Sound.play('upgrade');
      this.refreshMenuCredits();
      this.renderMetaPanel();
    } else {
      Sound.play('deny');
    }
  }

  renderMetaList() {
    const meta = this.game.meta;
    const bits = [];
    for (const u of META_UPGRADES) {
      const lv = meta.levels[u.id] || 0;
      const maxed = lv >= u.max;
      const cost = maxed ? 0 : meta.costOf(u.id);
      const afford = !maxed && meta.canBuy(u.id);
      bits.push(
        '<div class="meta-row' + (maxed ? ' maxed' : afford ? ' afford' : '') + '">' +
          '<div><div class="mr-name">' + (ICONS[u.id] ? '<span class="icon" style="width:18px;height:18px;vertical-align:-3px;display:inline-flex;margin-right:4px">' + ICONS[u.id] + '</span>' : '') + u.name + '</div>' +
          '<div class="mr-desc">' + u.desc + '</div>' +
          '<div class="mr-lv">Lv ' + lv + ' / ' + u.max + '</div></div>' +
          '<button class="meta-buy" type="button" data-meta="' + u.id + '"' + (maxed || !afford ? ' disabled' : '') + '>' +
            (maxed ? 'MAX' : cost + ' cr') +
          '</button></div>'
      );
    }
    this.el.metaList.innerHTML = bits.join('');
    this.el.metaList.querySelectorAll('.meta-buy[data-meta]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Sound.unlock();
        const id = btn.dataset.meta;
        if (meta.buy(id)) {
          Sound.play('upgrade');
          this.renderMetaPanel();
          this.refreshMenuCredits();
        } else {
          Sound.play('deny');
        }
        btn.blur();
      });
    });
  }

  showBossBar(boss) {
    const hud = this.el.bossHud;
    if (!boss) {
      hud.classList.add('hidden');
      this.cache.bossHp = null;
      return;
    }
    this.el.bossName.textContent = boss.name;
    const bits = [];
    if (boss.element && ELEMENTS[boss.element]) bits.push(ELEMENTS[boss.element].name);
    if (boss.bossMoves && boss.bossMoves.length) {
      bits.push(boss.bossMoves.map((id) => BOSS_ABILITY[id].name).join(' · '));
    }
    this.el.bossSub.textContent = bits.join('  —  ');
    this.updateBossBar(boss);
    hud.classList.remove('hidden');
  }

  updateBossBar(boss) {
    if (!boss || !this.el.bossFill) return;
    const frac = clamp(boss.hp / boss.maxHp, 0, 1);
    const key = boss.hp + '/' + boss.maxHp;
    if (this.cache.bossHp === key) return;
    this.cache.bossHp = key;
    this.el.bossFill.style.width = (frac * 100).toFixed(1) + '%';
  }

  onReset() {
    this.cache = {};
    this.lastKey = '';
    this.lastLoadout = '';
    this.lastShop = '';
    this.lastBuffs = '';
    this.setSmithTab(false);
    this.disarmRestart();
    this.cancelConfirm();
    this.hideTip();
    this.el.pauseOverlay.classList.add('hidden');
    this.el.gameOverOverlay.classList.add('hidden');
    this.showCards(null);
    this.showBossBar(null);
    this.setPausedIcon(false);
    this.update();
  }
}
