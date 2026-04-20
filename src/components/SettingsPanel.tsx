'use client';

import { useState, useEffect } from 'react';
import { GLASS_PRESETS, DEFAULT_DAILY_GOAL, DEFAULT_GLASS_ML } from '@/lib/hydration';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  currentGoal: number;
  currentGlassMl: number;
  onSave: (goal: number, glassMl: number) => void;
}

export default function SettingsPanel({
  open,
  onClose,
  currentGoal,
  currentGlassMl,
  onSave,
}: SettingsPanelProps) {
  const [goal, setGoal]           = useState(currentGoal);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customMl, setCustomMl]   = useState(currentGlassMl);
  const [isCustom, setIsCustom]   = useState(false);
  const [saved, setSaved]         = useState(false);

  // Sync when panel opens
  useEffect(() => {
    if (open) {
      setGoal(currentGoal);
      setSaved(false);
      // Detect if current ml matches a preset
      const preset = GLASS_PRESETS.find(p => p.ml === currentGlassMl && p.ml !== 0);
      if (preset) {
        setSelectedPreset(preset.ml);
        setIsCustom(false);
        setCustomMl(currentGlassMl);
      } else {
        setSelectedPreset(null);
        setIsCustom(true);
        setCustomMl(currentGlassMl);
      }
    }
  }, [open, currentGoal, currentGlassMl]);

  if (!open) return null;

  function handlePresetClick(ml: number) {
    if (ml === 0) {
      setIsCustom(true);
      setSelectedPreset(0);
    } else {
      setIsCustom(false);
      setSelectedPreset(ml);
      setCustomMl(ml);
    }
  }

  function handleSave() {
    const finalMl = isCustom ? Math.max(50, Math.min(2000, customMl)) : selectedPreset ?? DEFAULT_GLASS_ML;
    const finalGoal = Math.max(1, Math.min(20, goal));
    onSave(finalGoal, finalMl);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  }

  const effectiveMl = isCustom ? customMl : (selectedPreset ?? currentGlassMl);
  const totalMlGoal = goal * effectiveMl;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t-4 p-6 overflow-y-auto"
        style={{
          backgroundColor: '#0f0f0f',
          borderColor: '#C8FF00',
          maxHeight: '85vh',
          fontFamily: "'Share Tech Mono', monospace",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            style={{
              fontFamily: "'Bebas Neue', monospace",
              fontSize: '2rem',
              color: '#C8FF00',
              letterSpacing: '0.2em',
            }}
          >
            ⚙ PARAMÈTRES
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: '#555', fontFamily: 'monospace' }}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* ── SECTION 1 : Objectif journalier ── */}
        <section className="mb-8">
          <p
            className="text-xs mb-4 tracking-widest"
            style={{ color: '#888', letterSpacing: '0.3em' }}
          >
            OBJECTIF JOURNALIER (VERRES)
          </p>

          {/* Stepper */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setGoal(g => Math.max(1, g - 1))}
              className="text-3xl w-14 h-14 border-2 flex items-center justify-center font-black transition-colors"
              style={{
                borderColor: goal <= 1 ? '#333' : '#C8FF00',
                color: goal <= 1 ? '#333' : '#C8FF00',
                fontFamily: "'Bebas Neue', monospace",
              }}
              disabled={goal <= 1}
            >
              −
            </button>

            <div className="flex-1 text-center">
              <p
                style={{
                  fontFamily: "'Bebas Neue', monospace",
                  fontSize: '4rem',
                  color: '#C8FF00',
                  lineHeight: 1,
                }}
              >
                {goal}
              </p>
              <p className="text-xs mt-1" style={{ color: '#555', letterSpacing: '0.2em' }}>
                VERRES / JOUR
              </p>
            </div>

            <button
              onClick={() => setGoal(g => Math.min(20, g + 1))}
              className="text-3xl w-14 h-14 border-2 flex items-center justify-center font-black transition-colors"
              style={{
                borderColor: goal >= 20 ? '#333' : '#C8FF00',
                color: goal >= 20 ? '#333' : '#C8FF00',
                fontFamily: "'Bebas Neue', monospace",
              }}
              disabled={goal >= 20}
            >
              +
            </button>
          </div>

          {/* Quick presets for goal */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {[6, 8, 10, 12].map(n => (
              <button
                key={n}
                onClick={() => setGoal(n)}
                className="px-3 py-1 border text-sm transition-all"
                style={{
                  borderColor: goal === n ? '#C8FF00' : '#333',
                  color: goal === n ? '#0A0A0A' : '#555',
                  backgroundColor: goal === n ? '#C8FF00' : 'transparent',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-dashed mb-8" style={{ borderColor: '#222' }} />

        {/* ── SECTION 2 : Taille des verres ── */}
        <section className="mb-8">
          <p
            className="text-xs mb-4 tracking-widest"
            style={{ color: '#888', letterSpacing: '0.3em' }}
          >
            TAILLE D&apos;UN VERRE (ML)
          </p>

          {/* Preset buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {GLASS_PRESETS.map(preset => {
              const isActive = preset.ml === 0 ? isCustom : selectedPreset === preset.ml && !isCustom;
              return (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset.ml)}
                  className="py-3 px-4 border-2 text-left transition-all"
                  style={{
                    borderColor: isActive ? '#C8FF00' : '#222',
                    backgroundColor: isActive ? 'rgba(200,255,0,0.08)' : 'transparent',
                    color: isActive ? '#C8FF00' : '#555',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  }}
                >
                  <span className="block font-bold">
                    {preset.ml === 0 ? '✏ Personnalisé' : `${preset.ml} ml`}
                  </span>
                  <span className="block text-xs mt-0.5" style={{ color: isActive ? '#888' : '#333' }}>
                    {preset.ml === 0 ? 'Saisir une valeur' : preset.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom input */}
          {isCustom && (
            <div className="flex items-center gap-3 border-2 p-3" style={{ borderColor: '#C8FF00' }}>
              <input
                type="number"
                min={50}
                max={2000}
                value={customMl}
                onChange={e => setCustomMl(Number(e.target.value))}
                className="flex-1 bg-transparent text-center text-2xl outline-none"
                style={{
                  fontFamily: "'Bebas Neue', monospace",
                  color: '#C8FF00',
                  border: 'none',
                }}
              />
              <span style={{ color: '#666', fontFamily: 'monospace', fontSize: '0.85rem' }}>ML</span>
            </div>
          )}
        </section>

        {/* ── RÉSUMÉ ── */}
        <div
          className="border-l-4 pl-4 py-3 mb-6"
          style={{ borderColor: '#C8FF00', backgroundColor: '#111' }}
        >
          <p className="text-xs" style={{ color: '#666', letterSpacing: '0.2em' }}>
            RÉSUMÉ DE TON OBJECTIF
          </p>
          <p className="text-xl mt-1" style={{ color: '#C8FF00', fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.1em' }}>
            {goal} verres × {effectiveMl || '?'} ml = {effectiveMl ? totalMlGoal : '?'} ml / jour
          </p>
          {effectiveMl > 0 && (
            <p className="text-xs mt-1" style={{ color: '#555' }}>
              {totalMlGoal >= 2000
                ? `✓ Objectif OMS atteint (${totalMlGoal}ml)`
                : `⚠ L'OMS recommande ~2000ml/jour (tu vises ${totalMlGoal}ml)`}
            </p>
          )}
        </div>

        {/* ── SAVE BUTTON ── */}
        <button
          onClick={handleSave}
          className="w-full py-5 border-4 font-black text-2xl uppercase tracking-widest transition-all active:translate-y-1"
          style={{
            fontFamily: "'Bebas Neue', monospace",
            fontSize: '1.8rem',
            letterSpacing: '0.2em',
            backgroundColor: saved ? '#0d1a00' : '#C8FF00',
            color: saved ? '#C8FF00' : '#0A0A0A',
            borderColor: '#C8FF00',
            boxShadow: saved ? 'none' : '4px 4px 0px #888',
          }}
        >
          {saved ? '✓ SAUVEGARDÉ !' : 'SAUVEGARDER'}
        </button>

        {/* Reset defaults */}
        <button
          onClick={() => { setGoal(DEFAULT_DAILY_GOAL); setSelectedPreset(DEFAULT_GLASS_ML); setCustomMl(DEFAULT_GLASS_ML); setIsCustom(false); }}
          className="w-full mt-3 py-2 text-xs tracking-widest"
          style={{ color: '#333', fontFamily: 'monospace', letterSpacing: '0.2em' }}
        >
          Remettre les valeurs par défaut ({DEFAULT_DAILY_GOAL} verres · {DEFAULT_GLASS_ML}ml)
        </button>
      </div>
    </>
  );
}
