'use client';

import { useEffect, useRef, useState } from 'react';

const MAX_SECONDS = 45;

function pickMimeType() {
  const options = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4', // Safari and iOS
    'audio/ogg;codecs=opus',
  ];
  for (const t of options) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Records a short voice note and hands back a data URL.
 * Hard capped at 45 seconds so the database never fills up with audio.
 */
export function VoiceRecorder({ value, seconds, onChange }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => onChange(reader.result, Math.round(elapsedRef.current));
        reader.readAsDataURL(blob);
        setRecording(false);
      };

      rec.start();
      setRecording(true);
      setElapsed(0);
      elapsedRef.current = 0;

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_SECONDS) stop();
      }, 1000);
    } catch {
      setError('Could not use the microphone. Allow mic access and try again.');
    }
  }

  const elapsedRef = useRef(0);

  function stop() {
    try {
      recRef.current?.state !== 'inactive' && recRef.current?.stop();
    } catch {}
  }

  if (value) {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
        <VoicePlayer src={value} seconds={seconds} />
        <button
          onClick={() => onChange(null, null)}
          className="btn btn-ghost mt-2 w-full py-2 text-sm text-stop-600"
        >
          Delete and record again
        </button>
      </div>
    );
  }

  return (
    <div>
      {recording ? (
        <button onClick={stop} className="btn btn-red w-full py-3.5">
          <span className="size-2.5 animate-pulse rounded-full bg-white" />
          Stop recording · {mmss(elapsed)} / 0:45
        </button>
      ) : (
        <button onClick={start} className="btn btn-ghost w-full py-3.5">
          🎤 Record voice note
        </button>
      )}
      {error && <p className="mt-2 text-sm text-stop-600">{error}</p>}
      {!recording && !error && (
        <p className="mt-1 text-xs text-ink-400">Up to 45 seconds</p>
      )}
    </div>
  );
}

/**
 * Play button with a scrub bar and a running time, sized for a thumb.
 */
export function VoicePlayer({ src, seconds, tone = 'dark' }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [total, setTotal] = useState(seconds || 0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setAt(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setAt(0);
    };
    const onMeta = () => {
      if (Number.isFinite(a.duration)) setTotal(a.duration);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    a.addEventListener('loadedmetadata', onMeta);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('loadedmetadata', onMeta);
    };
  }, [src]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  }

  const pct = total > 0 ? Math.min(100, (at / total) * 100) : 0;
  const onRed = tone === 'red';

  return (
    <div className="flex items-center gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play voice note'}
        className={`btn size-11 shrink-0 rounded-full ${onRed ? 'btn-red' : 'btn-blue'}`}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={`h-2 w-full overflow-hidden rounded-full ${
            onRed ? 'bg-stop-100' : 'bg-ink-200'
          }`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${
              onRed ? 'bg-stop-500' : 'bg-brand-600'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className={`mt-1 flex justify-between text-xs tabular-nums ${
            onRed ? 'text-stop-900' : 'text-ink-500'
          }`}
        >
          <span>{mmss(at)}</span>
          <span>{mmss(total)}</span>
        </div>
      </div>
    </div>
  );
}
