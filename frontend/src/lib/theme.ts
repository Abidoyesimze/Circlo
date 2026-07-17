/** Applies the `.dark` class from system preference and keeps it in sync. */
export function initTheme() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const apply = (isDark: boolean) => {
    document.documentElement.classList.toggle("dark", isDark);
  };

  apply(media.matches);
  media.addEventListener("change", (e) => apply(e.matches));
}
