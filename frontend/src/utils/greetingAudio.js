/**
 * Solvane Voice Greeting Utility
 * Handles audio playback for English and Tamil greetings with robust fallbacks:
 * 1. Checks localStorage for mute state ('solvane_muted').
 * 2. Attempts to play /audio/welcome-en.mp3 or /audio/welcome-ta.mp3.
 * 3. If audio file fails or is missing, gracefully falls back to browser speechSynthesis.
 * 4. Silently skips if voice is unsupported or unavailable—never throws or breaks UI.
 */

const GREETING_TEXTS = {
  en: "Welcome to Solvane, your guide to Ramanathapuram. Let's explore the Land of Setu together.",
  ta: "சொல்வானே-க்கு வரவேற்கிறோம். ராமநாதபுரத்தை ஒன்றாகச் சுற்றிப் பார்க்கலாம் வாருங்கள்."
};

let currentAudioInstance = null;

export function isAudioMuted() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('solvane_muted') === 'true';
}

export function setAudioMuted(muted) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('solvane_muted', muted ? 'true' : 'false');
  if (muted) {
    stopVoiceGreeting();
  }
}

export function stopVoiceGreeting() {
  try {
    if (currentAudioInstance) {
      currentAudioInstance.pause();
      currentAudioInstance.currentTime = 0;
      currentAudioInstance = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore any cleanup errors silently
  }
}

/**
 * Plays the voice greeting for the specified language ('en' or 'ta').
 * @param {string} language - 'en' or 'ta'
 * @param {object} options - { force: boolean } force ignores mute state (e.g. replay button)
 */
export async function playVoiceGreeting(language = 'en', options = {}) {
  const { force = false } = options;

  if (isAudioMuted() && !force) {
    return false;
  }

  stopVoiceGreeting();

  const langCode = (language === 'ta' || language === 'ta-IN') ? 'ta' : 'en';
  const audioSrc = `/audio/welcome-${langCode}.mp3`;
  const fallbackText = GREETING_TEXTS[langCode] || GREETING_TEXTS.en;
  const synthLang = langCode === 'ta' ? 'ta-IN' : 'en-IN';

  // 1. Attempt playing MP3 file first
  try {
    const audio = new Audio(audioSrc);
    currentAudioInstance = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
      return true; // Successfully started playing audio file
    }
  } catch {
    // Audio file not found or playback blocked -> proceed to speech synthesis fallback
  }

  // 2. Speech Synthesis Fallback
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(fallbackText);
      utterance.lang = synthLang;
      utterance.rate = 0.95; // Friendly cadence

      // Check available voices for best match
      const voices = window.speechSynthesis.getVoices?.() || [];
      const matchVoice = voices.find(
        (v) => v.lang === synthLang || v.lang.startsWith(langCode)
      );
      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      window.speechSynthesis.speak(utterance);
      return true;
    }
  } catch {
    // Silently continue if speechSynthesis fails
  }

  return false;
}
