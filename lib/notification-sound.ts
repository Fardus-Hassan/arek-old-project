export function playNotificationSound() {
  if (typeof window === "undefined") return;

  const audio = new Audio("/notification-sound.mp3");
  void audio.play().catch(() => {
    // Browsers may block autoplay until the user has interacted with the page.
  });
}
