'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ALERT_THRESHOLD_MS,
  loadState,
  saveState,
  getMinutesSinceLastDrink,
  getHarassmentTier,
  getRandomMessage,
  formatTimeSince,
  HydrationState,
  HarassMessage,
} from '@/lib/hydration';
import SettingsPanel from './SettingsPanel';

interface BtnPos { top: string; left: string }

export default function HydroForce() {
  const [state, setState]               = useState<HydrationState | null>(null);
  const [minutesSince, setMinutesSince] = useState(0);
  const [alertMode, setAlertMode]       = useState(false);
  const [btnPos, setBtnPos]             = useState<BtnPos>({ top: '70%', left: '50%' });
  const [currentMsg, setCurrentMsg]     = useState<HarassMessage | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const [glassAnim, setGlassAnim]       = useState(false);
  const [successMsg, setSuccessMsg]     = useState('');
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const wakeLockRef  = useRef<WakeLockSentinel | null>(null);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const btnMoveRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const vibrateRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifRef     = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Load initial state ────────────────────────────────────────────────
  useEffect(() => {
    const s = loadState();
    setState(s);
    const mins = getMinutesSinceLastDrink(s.lastDrinkTime);
    setMinutesSince(mins);
    if (mins * 60 * 1000 >= ALERT_THRESHOLD_MS) setAlertMode(true);
    setCurrentMsg(getRandomMessage(getHarassmentTier(mins)));
    if ('Notification' in window) setNotifGranted(Notification.permission === 'granted');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwRegistered(true));
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'drink') setTimeout(() => logDrink(), 300);
    return () => { navigator.serviceWorker?.removeEventListener('message', handleSWMessage); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Main tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state) return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const mins = getMinutesSinceLastDrink(state.lastDrinkTime);
      setMinutesSince(mins);
      const shouldAlert = mins * 60 * 1000 >= ALERT_THRESHOLD_MS;
      setAlertMode(shouldAlert);
      if (shouldAlert) setCurrentMsg(getRandomMessage(getHarassmentTier(mins)));
    }, 10000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [state]);

  // ── Alert mode effects ────────────────────────────────────────────────
  useEffect(() => {
    if (alertMode) {
      document.body.classList.add('alert-mode');
      moveBtnRandom();
      btnMoveRef.current = setInterval(moveBtnRandom, 2500);
      triggerVibration();
      vibrateRef.current = setInterval(triggerVibration, 5000);
      acquireWakeLock();
    } else {
      document.body.classList.remove('alert-mode');
      setBtnPos({ top: '70%', left: '50%' });
      if (btnMoveRef.current)  clearInterval(btnMoveRef.current);
      if (vibrateRef.current)  clearInterval(vibrateRef.current);
      releaseWakeLock();
    }
    return () => {
      if (btnMoveRef.current) clearInterval(btnMoveRef.current);
      if (vibrateRef.current) clearInterval(vibrateRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertMode]);

  // ── Schedule notifications ────────────────────────────────────────────
  useEffect(() => {
    if (!state || !notifGranted) return;
    scheduleNotifications(state.lastDrinkTime);
    return () => { notifRef.current.forEach(clearTimeout); notifRef.current = []; };
  }, [state, notifGranted]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSWMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === 'DRINK_LOGGED') logDrink();
    if (event.data?.type === 'SNOOZE_10') {
      setState(prev => {
        if (!prev) return prev;
        const next = { ...prev, lastDrinkTime: Date.now() + 10 * 60 * 1000 };
        saveState(next);
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function moveBtnRandom() {
    const m = 15;
    setBtnPos({ top: `${m + Math.random() * (85 - m * 2)}%`, left: `${m + Math.random() * (85 - m * 2)}%` });
  }

  function triggerVibration() {
    if ('vibrate' in navigator) navigator.vibrate([150, 80, 150, 80, 300, 80, 300]);
  }

  async function acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current!.addEventListener('release', () => setWakeLockActive(false));
      } catch {}
    }
  }

  async function releaseWakeLock() {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }

  function scheduleNotifications(lastDrinkTime: number) {
    if (!('serviceWorker' in navigator) || !swRegistered) return;
    notifRef.current.forEach(clearTimeout);
    notifRef.current = [];
    [
      { delay: 30 * 60 * 1000, tier: 1 },
      { delay: 60 * 60 * 1000, tier: 2 },
      { delay: 90 * 60 * 1000, tier: 3 },
      { delay: 120 * 60 * 1000, tier: 4 },
      { delay: 150 * 60 * 1000, tier: 4 },
    ].forEach(({ delay, tier }) => {
      const remaining = lastDrinkTime + delay - Date.now();
      if (remaining > 0) {
        const t = setTimeout(() => {
          navigator.serviceWorker.ready.then(reg =>
            reg.active?.postMessage({ type: 'SCHEDULE_NOTIFICATION', delay: 0, tier })
          );
        }, remaining);
        notifRef.current.push(t);
      }
    });
  }

  function logDrink() {
    setState(prev => {
      const base = prev || loadState();
      const next: HydrationState = {
        ...base,
        glassesConsumed: Math.min(base.glassesConsumed + 1, base.dailyGoal),
        lastDrinkTime: Date.now(),
        totalMlToday: base.totalMlToday + base.glassMl,
      };
      saveState(next);
      return next;
    });
    setAlertMode(false);
    setMinutesSince(0);
    setGlassAnim(true);
    setTimeout(() => setGlassAnim(false), 600);
    const msgs = ['HYDRATÉ(E) !', 'BIEN JOUÉ !', 'TES REINS SONT SOULAGÉS !', '+1 VERRE !', 'TU MÉRITES UNE MÉDAILLE !'];
    setSuccessMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    setTimeout(() => setSuccessMsg(''), 2000);
    if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
  }

  async function requestNotifPermission() {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifGranted(perm === 'granted');
    if (perm === 'granted' && state) scheduleNotifications(state.lastDrinkTime);
  }

  function resetDay() {
    setState(prev => {
      const fresh: HydrationState = {
        glassesConsumed: 0,
        lastDrinkTime: Date.now(),
        dailyDate: new Date().toISOString().split('T')[0],
        totalMlToday: 0,
        notifPermission: 'default',
        dailyGoal: prev?.dailyGoal ?? 8,
        glassMl:   prev?.glassMl   ?? 250,
      };
      saveState(fresh);
      return fresh;
    });
    setAlertMode(false);
    setMinutesSince(0);
  }

  function handleSaveSettings(goal: number, glassMl: number) {
    setState(prev => {
      if (!prev) return prev;
      const next: HydrationState = {
        ...prev,
        dailyGoal: goal,
        glassMl,
        // Cap consumed glasses to new goal
        glassesConsumed: Math.min(prev.glassesConsumed, goal),
      };
      saveState(next);
      return next;
    });
  }

  // ── Early loading ─────────────────────────────────────────────────────
  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <p style={{ fontFamily: 'monospace', color: '#C8FF00', fontSize: '1.5rem' }}>INITIALISATION...</p>
      </div>
    );
  }

  const DAILY_GOAL  = state.dailyGoal;
  const GLASS_ML    = state.glassMl;
  const tier        = getHarassmentTier(minutesSince);
  const progressPct = Math.round((state.glassesConsumed / DAILY_GOAL) * 100);
  const isComplete  = state.glassesConsumed >= DAILY_GOAL;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen relative select-none overflow-hidden"
      style={{ backgroundColor: alertMode ? undefined : '#0A0A0A', fontFamily: 'var(--font-mono)' }}
    >
      {/* Alert bg pattern */}
      {alertMode && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{ background: 'repeating-linear-gradient(45deg, #1a0000 0px, #1a0000 10px, #200000 10px, #200000 20px)' }}
        />
      )}

      {/* Alert top banner */}
      {alertMode && (
        <div
          className="fixed top-0 left-0 w-full z-50 py-2 text-center blink"
          style={{
            backgroundColor: '#FF2D00',
            fontFamily: "'Bebas Neue', monospace",
            fontSize: '1rem',
            color: '#FFE600',
            letterSpacing: '0.3em',
          }}
        >
          ▲ ALERTE DÉSHYDRATATION — BOIS DE L&apos;EAU MAINTENANT ▲
        </div>
      )}

      {/* ── HEADER ── */}
      <header
        className="relative z-10 border-b-4 p-4 flex items-center justify-between"
        style={{
          borderColor: alertMode ? '#FF2D00' : '#C8FF00',
          backgroundColor: alertMode ? '#0d0000' : '#0A0A0A',
          marginTop: alertMode ? '2.5rem' : 0,
        }}
      >
        <div>
          <h1
            className={`text-4xl md:text-5xl tracking-widest ${alertMode ? 'shake' : ''}`}
            style={{
              fontFamily: "'Bebas Neue', monospace",
              color: alertMode ? '#FF2D00' : '#C8FF00',
              letterSpacing: '0.15em',
            }}
          >
            HYDROFORCE
          </h1>
          <p className="text-xs tracking-widest uppercase mt-1" style={{ color: alertMode ? '#FF6B6B' : '#888', letterSpacing: '0.3em' }}>
            {alertMode ? '⚠ ALERTE DÉSHYDRATATION ACTIVE ⚠' : 'Système de Surveillance Hydrique'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {wakeLockActive && (
            <span className="text-xs px-2 py-1 border font-bold" style={{ borderColor: '#FFE600', color: '#FFE600', fontSize: '0.6rem', letterSpacing: '0.2em' }}>
              ◉ ÉCRAN ACTIF
            </span>
          )}
          <div className="flex gap-2">
            {/* Settings button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-xs px-3 py-1 border transition-colors"
              style={{ borderColor: '#C8FF00', color: '#C8FF00', letterSpacing: '0.1em' }}
              title="Paramètres"
            >
              ⚙ PARAM
            </button>
            <button
              onClick={resetDay}
              className="text-xs px-3 py-1 border border-gray-700 hover:border-gray-400 transition-colors"
              style={{ color: '#555', letterSpacing: '0.1em' }}
            >
              RESET
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 max-w-lg mx-auto px-4 py-8 space-y-8">

        {/* Status panel */}
        <div
          className={`border-4 p-6 ${alertMode ? 'shake' : ''}`}
          style={{ borderColor: alertMode ? '#FF2D00' : '#C8FF00', backgroundColor: alertMode ? '#0d0000' : '#0f0f0f' }}
        >
          <div className="text-center mb-6">
            <p className="text-xs tracking-widest mb-2" style={{ color: '#666', letterSpacing: '0.3em' }}>
              DERNIER VERRE IL Y A
            </p>
            <p
              className={`text-6xl md:text-7xl font-black ${alertMode ? 'blink' : ''}`}
              style={{
                fontFamily: "'Bebas Neue', monospace",
                color: alertMode ? '#FF2D00' : minutesSince >= 45 ? '#FFE600' : '#C8FF00',
                lineHeight: 1,
              }}
            >
              {formatTimeSince(minutesSince).toUpperCase()}
            </p>
            {alertMode && (
              <p className="text-sm mt-2 font-bold blink tracking-widest" style={{ color: '#FF2D00', letterSpacing: '0.2em' }}>
                ▲ NIVEAU CRITIQUE ▲
              </p>
            )}
          </div>

          {currentMsg && (
            <div
              className="border-l-4 pl-4 py-2"
              style={{ borderColor: alertMode ? '#FF2D00' : '#C8FF00', backgroundColor: alertMode ? '#1a0000' : '#111' }}
            >
              <p className="text-xl mb-1">{currentMsg.emoji}</p>
              <p className="text-sm leading-relaxed" style={{ color: alertMode ? '#FF9999' : '#C8FF00', fontFamily: 'var(--font-mono)' }}>
                {currentMsg.text}
              </p>
              <p className="text-xs mt-2" style={{ color: '#444', letterSpacing: '0.2em' }}>— TIER {tier} / 4</p>
            </div>
          )}
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between items-baseline mb-3">
            <p className="text-xs tracking-widest uppercase" style={{ color: '#666', letterSpacing: '0.3em' }}>
              Objectif journalier
            </p>
            <p className="text-2xl" style={{ fontFamily: "'Bebas Neue', monospace", color: isComplete ? '#C8FF00' : '#888' }}>
              {state.glassesConsumed} / {DAILY_GOAL}
            </p>
          </div>

          <div className="w-full h-8 border-2 relative overflow-hidden" style={{ borderColor: '#333', backgroundColor: '#111' }}>
            <div
              className="h-full transition-all duration-700 ease-out relative"
              style={{ width: `${progressPct}%`, backgroundColor: isComplete ? '#C8FF00' : alertMode ? '#FF2D00' : '#C8FF00' }}
            >
              {progressPct > 10 && (
                <span
                  className="absolute inset-0 flex items-center justify-end pr-2"
                  style={{ fontFamily: "'Bebas Neue', monospace", color: '#0A0A0A', fontSize: '0.9rem' }}
                >
                  {progressPct}%
                </span>
              )}
            </div>
          </div>

          {/* Glass grid */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {Array.from({ length: DAILY_GOAL }).map((_, i) => (
              <div
                key={i}
                className="border-2 min-w-[24px] transition-all duration-300"
                style={{
                  flex: `1 1 ${Math.max(24, Math.floor(280 / DAILY_GOAL) - 8)}px`,
                  height: '2rem',
                  borderColor: i < state.glassesConsumed ? '#C8FF00' : '#222',
                  backgroundColor: i < state.glassesConsumed ? '#C8FF00' : 'transparent',
                  transform: glassAnim && i === state.glassesConsumed - 1 ? 'scale(1.2)' : 'scale(1)',
                }}
                title={`Verre ${i + 1} · ${GLASS_ML}ml`}
              />
            ))}
          </div>

          <p className="text-xs mt-2" style={{ color: '#555', fontFamily: 'monospace' }}>
            {state.totalMlToday}ml ingérés · {Math.max(0, DAILY_GOAL - state.glassesConsumed) * GLASS_ML}ml restants
            <span className="ml-2 opacity-50">({GLASS_ML}ml/verre · objectif {DAILY_GOAL} verres)</span>
          </p>
        </div>

        {/* Success flash */}
        {successMsg && (
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-center pointer-events-none"
            style={{ fontFamily: "'Bebas Neue', monospace", fontSize: '3rem', color: '#C8FF00', textShadow: '4px 4px 0px #000' }}
          >
            {successMsg}
          </div>
        )}

        {/* Normal drink button */}
        {!alertMode && (
          <button
            onClick={logDrink}
            disabled={isComplete}
            className="w-full py-6 border-4 font-black uppercase transition-all duration-150 active:translate-y-1"
            style={{
              fontFamily: "'Bebas Neue', monospace",
              fontSize: '2rem',
              letterSpacing: '0.2em',
              backgroundColor: isComplete ? '#111' : '#C8FF00',
              color: isComplete ? '#444' : '#0A0A0A',
              borderColor: isComplete ? '#333' : '#C8FF00',
              boxShadow: isComplete ? 'none' : '6px 6px 0px #888',
              cursor: isComplete ? 'not-allowed' : 'pointer',
            }}
          >
            {isComplete ? '✓ OBJECTIF ATTEINT !' : '💧 J\'AI BU'}
          </button>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Verres', value: state.glassesConsumed.toString() },
            { label: 'Objectif', value: `${progressPct}%` },
            { label: 'Tier', value: `#${tier}` },
          ].map(({ label, value }) => (
            <div key={label} className="border-2 p-3 text-center" style={{ borderColor: '#222', backgroundColor: '#0f0f0f' }}>
              <p className="text-2xl" style={{ fontFamily: "'Bebas Neue', monospace", color: '#C8FF00' }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: '#555', letterSpacing: '0.2em' }}>{label.toUpperCase()}</p>
            </div>
          ))}
        </div>

        {/* Notification permission */}
        {!notifGranted ? (
          <button
            onClick={requestNotifPermission}
            className="w-full py-3 border-2 text-sm tracking-widest uppercase transition-all"
            style={{ borderColor: '#FFE600', color: '#FFE600', backgroundColor: 'rgba(255,230,0,0.05)', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em' }}
          >
            🔔 Activer les notifications de harcèlement
          </button>
        ) : (
          <p className="text-center text-xs" style={{ color: '#444', letterSpacing: '0.2em' }}>
            ✓ NOTIFICATIONS ACTIVES — TU NE PEUX PLUS NOUS ÉCHAPPER
          </p>
        )}

        <footer className="text-center pb-4">
          <p className="text-xs" style={{ color: '#333', letterSpacing: '0.2em', fontFamily: 'monospace' }}>
            HYDROFORCE v1.1 · {new Date().toLocaleDateString('fr-FR')}
          </p>
        </footer>
      </main>

      {/* Flying alert button */}
      {alertMode && (
        <button
          className="flying-btn py-5 px-8 border-4 font-black uppercase"
          style={{
            top: btnPos.top,
            left: btnPos.left,
            transform: 'translate(-50%, -50%)',
            fontFamily: "'Bebas Neue', monospace",
            fontSize: '1.8rem',
            letterSpacing: '0.15em',
            backgroundColor: '#FF2D00',
            color: '#FFFFFF',
            borderColor: '#FFE600',
            boxShadow: '6px 6px 0px #FFE600, 0 0 30px rgba(255,45,0,0.5)',
            animation: 'pulse_brutal 1s ease-in-out infinite',
            cursor: 'pointer',
            minWidth: '180px',
            textAlign: 'center',
          }}
          onClick={logDrink}
        >
          💧 J&apos;AI BU !!!
        </button>
      )}

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentGoal={state.dailyGoal}
        currentGlassMl={state.glassMl}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
