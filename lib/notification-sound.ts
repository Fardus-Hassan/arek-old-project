/** Shared notification beep — unlock after a user gesture so complete can play later. */

let sharedAudio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio("/notification-sound.mp3");
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

/** Call on Generate click / first tap on analyzing so later play() is allowed. */
export function unlockNotificationSound(): void {
  if (typeof window === "undefined" || unlocked) return;
  const audio = getAudio();
  if (!audio) return;
  const prev = audio.volume;
  audio.volume = 0.001;
  void audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = prev || 1;
      unlocked = true;
    })
    .catch(() => {
      audio.volume = prev || 1;
    });
}

export function playNotificationSound(): void {
  if (typeof window === "undefined") return;
  const audio = getAudio();
  if (!audio) return;

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
  } catch {
    // ignore
  }

  void audio.play().catch(() => {
    // Still blocked — try one silent unlock then replay once
    unlockNotificationSound();
    window.setTimeout(() => {
      try {
        audio.currentTime = 0;
        void audio.play().catch(() => {
          // Browsers may block until the user has interacted with the page.
        });
      } catch {
        // ignore
      }
    }, 50);
  });
}
