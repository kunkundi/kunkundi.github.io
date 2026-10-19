// Keep section links when following a language link. Plain links also work
// without JavaScript, and the URL always determines the displayed language.
function updateLanguageLinks() {
  const hash = window.location.hash;
  const legacyLanguage = /^#(?:english|%E4%B8%AD%E6%96%87|中文)$/i.test(hash);
  document.querySelectorAll("a.lang-zh, a.lang-en").forEach((link) => {
    const destination = new URL(link.href);
    destination.hash = legacyLanguage ? "" : hash;
    link.href = destination.href;
  });

  // Preserve published policy URLs that selected a language with a fragment.
  if (legacyLanguage) {
    const language = hash.toLowerCase() === "#english" ? "en" : "zh";
    const current = document.documentElement.lang === "en" ? "en" : "zh";
    const link = document.querySelector(`a.lang-${language}`);
    if (language !== current && link) window.location.replace(link.href);
  }
}

updateLanguageLinks();
window.addEventListener("hashchange", updateLanguageLinks);
