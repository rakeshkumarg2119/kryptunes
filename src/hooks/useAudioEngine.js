import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

const audio = new Audio();
audio.preload = 'auto';

let _ctx      = null;
let _source   = null;
let _filters  = [];
let _analyser = null;
let _gain     = null;
let _blobUrl  = null;
let _loadedId = null;

export function invalidateLoadedTrack() {
  _loadedId = null;
}

function buildGraph(eqBands, eqEnabled, volume) {
  if (_ctx) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  _ctx = ctx;

  _analyser = ctx.createAnalyser();
  _analyser.fftSize = 2048;

  _gain = ctx.createGain();
  _gain.gain.value = volume;

  _filters = eqBands.map(band => {
    const f = ctx.createBiquadFilter();
    f.type = 'peaking';
    f.frequency.value = band.freq;
    f.Q.value = 1.4;
    f.gain.value = eqEnabled ? band.gain : 0;
    return f;
  });

  _filters.forEach((f, i) => {
    if (i < _filters.length - 1) f.connect(_filters[i + 1]);
  });
  _filters[_filters.length - 1].connect(_analyser);
  _analyser.connect(_gain);
  _gain.connect(ctx.destination);
}

function wireSource() {
  if (!_ctx || _source) return;
  try {
    _source = _ctx.createMediaElementSource(audio);
    if (_filters[0]) _source.connect(_filters[0]);
  } catch (_) {}
}

export function useAudioEngine() {
  const audioRef    = useRef(audio);
  const analyserRef = useRef(null);
  const store       = useStore();
  const storeRef    = useRef(store);
  storeRef.current  = store;

  useEffect(() => {
    storeRef.current.setAudioRef(audioRef);

    const onTimeUpdate     = () => storeRef.current.setProgress(audio.currentTime);
    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0)
        storeRef.current.setDuration(audio.duration);
    };

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0)
        storeRef.current.setDuration(audio.duration);

      // KEY FIX: seek to restored session position instead of resetting to 0
      const restored = storeRef.current.restoredProgress;
      if (restored && restored > 0) {
        audio.currentTime = restored;
        storeRef.current.setProgress(restored);
        storeRef.current.clearRestoredProgress();
      } else {
        storeRef.current.setProgress(0);
      }
    };

    const onPlay  = () => storeRef.current.setPlaying(true);
    const onPause = () => storeRef.current.setPlaying(false);
    const onEnded = () => {
      if (storeRef.current.repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        storeRef.current.nextTrack?.();
      }
    };

    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('ended',          onEnded);

    let rafId;
    const poll = () => {
      if (_analyser && !analyserRef.current) analyserRef.current = _analyser;
      if (!audio.paused && !audio.ended) {
        storeRef.current.setProgress(audio.currentTime);
        if (isFinite(audio.duration) && audio.duration > 0)
          storeRef.current.setDuration(audio.duration);
      }
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId);
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('ended',          onEnded);
    };
  }, []);

  const track     = store.currentTrack;
  const isPlaying = store.isPlaying;
  const trackId   = track?.id   ?? '';
  const hasSource = !!(track?.url || track?.file);

  useEffect(() => {
    const t       = storeRef.current.currentTrack;
    const playing = storeRef.current.isPlaying;

    if (!t) { audio.pause(); return; }
    if (!t.url && !t.file) { audio.pause(); return; }

    const { eqBands, eqEnabled, volume } = storeRef.current;

    if (_loadedId !== t.id) {
      _loadedId = t.id;

      if (_blobUrl) { URL.revokeObjectURL(_blobUrl); _blobUrl = null; }

      if (t.url) {
        audio.src = t.url;
      } else {
        _blobUrl  = URL.createObjectURL(t.file);
        audio.src = _blobUrl;
      }

      // Don't reset progress here — onLoadedMetadata will seek to restored pos
      audio.load();
    }

    buildGraph(eqBands, eqEnabled, volume);
    if (_analyser) analyserRef.current = _analyser;
    wireSource();
    if (_ctx?.state === 'suspended') _ctx.resume();

    if (playing) {
      audio.play().catch(err => console.warn('play():', err.message));
    } else {
      audio.pause();
    }
  }, [trackId, hasSource, isPlaying]);

  useEffect(() => {
    audio.volume = store.volume;
    if (_gain) _gain.gain.value = store.volume;
  }, [store.volume]);

  useEffect(() => {
    _filters.forEach((f, i) => {
      if (store.eqBands[i])
        f.gain.value = store.eqEnabled ? store.eqBands[i].gain : 0;
    });
  }, [store.eqBands, store.eqEnabled]);

  return { audioRef, analyserRef };
}