(() => {
  if (typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal) return;

  const triggers = [...document.querySelectorAll("[data-open-download], [data-open-sponsors]")];
  const downloadPage = new URL(document.querySelector("[data-open-download]").href);
  const onDownloadPage = location.pathname === downloadPage.pathname;
  let dialog = document.querySelector("dialog.download-dialog");
  let ready;
  let opener;

  function isDownloadHash(hash) {
    return hash === "#download" || (onDownloadPage && /^#(packages|windows|macos|linux|ios|android|sponsor-profiles)$/.test(hash));
  }

  function prepareSponsorDirectory() {
    const directory = dialog.querySelector(".sponsor-directory");
    if (!directory) return;

    const search = directory.querySelector("input");
    const status = directory.querySelector('[role="status"]');
    const normalize = (text) => text.normalize("NFKC").toLowerCase().trim();
    const cards = [...dialog.querySelectorAll(".project-sponsor")].map((card) => ({
      card,
      name: normalize(card.querySelector(".project-sponsor-identity").textContent),
    }));
    function filterSponsors() {
      const query = normalize(search.value);
      let matches = 0;
      for (const { card, name } of cards) {
        card.hidden = !name.includes(query);
        if (!card.hidden) matches++;
      }
      status.textContent = "";
      if (query) {
        status.textContent = document.documentElement.lang === "en"
          ? `${matches} matching ${matches === 1 ? "sponsor" : "sponsors"}`
          : `找到 ${matches} 家赞助商`;
      }
    }
    search.closest("label").hidden = false;
    search.addEventListener("input", filterSponsors);
    directory.addEventListener("toggle", () => {
      if (!directory.open) {
        search.value = "";
        filterSponsors();
      }
    });
    dialog.addEventListener("close", () => { directory.open = false; });
  }

  async function prepareDialog() {
    if (!dialog) {
      // The localized installation guide owns the package URLs and dialog markup.
      const response = await fetch(downloadPage.pathname);
      if (!response.ok) throw new Error("Download guide unavailable");
      const template = document.createElement("template");
      template.innerHTML = await response.text();
      const source = template.content.querySelector("dialog.download-dialog");
      if (!source) throw new Error("Download dialog unavailable");
      dialog = document.body.appendChild(source);
      orderSponsorLinks(dialog.querySelector("[data-sponsor-links]"));
    }

    dialog.querySelector(".dialog-close").addEventListener("click", (event) => {
      event.preventDefault();
      dialog.close();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (dialog.open) return;
      if (isDownloadHash(location.hash)) {
        const url = new URL(location.href);
        url.hash = "";
        history.replaceState(history.state, "", url);
        updateLanguageLinks();
      }
      opener?.focus({ preventScroll: true });
    });
    prepareSponsorDirectory();
    loadDownloadVersion(dialog);
  }

  async function openDialog(trigger, hash = "") {
    const showSponsors = hash ? hash === "#sponsor-profiles" : trigger?.hasAttribute("data-open-sponsors");
    try {
      ready ??= prepareDialog();
      await ready;
    } catch {
      ready = null;
      location.assign(showSponsors ? new URL("#sponsor-profiles", downloadPage).href : downloadPage.href);
      return;
    }
    if (hash && location.hash !== hash) return;
    const platform = [...dialog.querySelectorAll(".dialog-packages details")].find((group) => "#" + group.id === hash);
    if (platform) platform.open = true;
    const profile = showSponsors ? dialog.querySelector("#sponsor-profiles") : null;
    const directory = profile?.closest(".sponsor-directory");
    if (directory) directory.open = true;
    opener = trigger?.closest("#mobile-menu") ? document.getElementById("menu-toggle") : trigger;
    if (!dialog.open) dialog.showModal();
    (directory?.querySelector("summary") ?? profile)?.focus();
  }

  triggers.forEach((trigger) => {
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openDialog(trigger);
    });
  });

  function followHash() {
    if (isDownloadHash(location.hash)) {
      openDialog(triggers.find((trigger) => trigger.getClientRects().length), location.hash);
    } else if (dialog?.open) {
      opener = null;
      dialog.close();
    }
  }
  window.addEventListener("hashchange", followHash);
  followHash();
})();
