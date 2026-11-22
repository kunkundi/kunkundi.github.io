// Each language has a stable URL and static metadata and images.
const sponsorOrder =
  document.documentElement.lang === "en"
    ? ["kofi", "github", "afdian"]
    : ["afdian", "kofi", "github"];
function orderSponsorLinks(links) {
  sponsorOrder.forEach((platform) => {
    const link = links.querySelector(`[data-sponsor="${platform}"]`);
    if (link) links.append(link);
  });
}
document.querySelectorAll("[data-sponsor-links]").forEach(orderSponsorLinks);

const menuButton = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
function closeMenu(restoreFocus = false) {
  mobileMenu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener("click", () => {
  const open = mobileMenu.hidden;
  mobileMenu.hidden = !open;
  menuButton.setAttribute("aria-expanded", String(open));
});
mobileMenu
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", () => closeMenu()));
window.addEventListener("resize", () => {
  if (window.innerWidth > 960) closeMenu();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileMenu.hidden) closeMenu(true);
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const sponsorList = document.getElementById("hero-sponsor-list");
const sponsorGroup = sponsorList?.querySelector(".hero-sponsor-group");
if (sponsorGroup) {
  const canHover = window.matchMedia("(hover: hover)");
  const pixelsPerSecond = 40;
  let copy;
  let loopWidth = 0;
  let inView = false;
  let frame;
  let lastTime;
  let position = 0;

  function advance(time) {
    if (lastTime !== undefined) {
      // Keep subpixel progress between frames, including after a touch scroll.
      if (Math.abs(sponsorList.scrollLeft - position) > 1) position = sponsorList.scrollLeft;
      position = (position + pixelsPerSecond * Math.min(time - lastTime, 64) / 1000) % loopWidth;
      sponsorList.scrollLeft = position;
    }
    lastTime = time;
    frame = requestAnimationFrame(advance);
  }

  function updatePlayback() {
    cancelAnimationFrame(frame);
    lastTime = undefined;
    position = sponsorList.scrollLeft;
    const interacting = sponsorList.matches(":focus-within, :active") ||
      (canHover.matches && sponsorList.matches(":hover"));
    if (copy && inView && !document.hidden && !interacting) frame = requestAnimationFrame(advance);
  }

  function measureSponsors() {
    const overflow = sponsorGroup.getBoundingClientRect().width > sponsorList.clientWidth + 1;
    if (overflow && !reducedMotion.matches) {
      if (!copy) {
        // Continue into an identical row before wrapping back to the originals.
        copy = sponsorGroup.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        copy.querySelectorAll("a").forEach(link => { link.tabIndex = -1; });
        sponsorList.append(copy);
      }
      loopWidth = copy.getBoundingClientRect().left - sponsorGroup.getBoundingClientRect().left;
    } else if (copy) {
      copy.remove();
      copy = null;
    }
    sponsorList.classList.toggle("is-scrolling", Boolean(copy));
    updatePlayback();
  }

  const sizeObserver = new ResizeObserver(measureSponsors);
  sizeObserver.observe(sponsorList);
  sizeObserver.observe(sponsorGroup);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updatePlayback();
  }).observe(sponsorList);
  reducedMotion.addEventListener("change", measureSponsors);
  document.addEventListener("visibilitychange", updatePlayback);
  for (const event of ["pointerenter", "pointerleave", "focusin", "focusout", "pointerup", "pointercancel"]) {
    sponsorList.addEventListener(event, () => queueMicrotask(updatePlayback));
  }
  sponsorList.addEventListener("pointerdown", () => cancelAnimationFrame(frame));
}

// Manual previews stay still until the visitor selects a view or swipes.
const previewButtons = [...document.querySelectorAll("[data-slide]")];
if (typeof Swiper !== "undefined" && document.querySelector(".mySwiper")) {
  const preview = new Swiper(".mySwiper", {
    loop: true,
    slidesPerView: 1,
    spaceBetween: 0,
    speed: reducedMotion.matches ? 0 : 400,
    pagination: { el: ".swiper-pagination", clickable: true },
    on: {
      slideChange(swiper) {
        previewButtons.forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(Number(button.dataset.slide) === swiper.realIndex),
          ),
        );
      },
    },
  });
  previewButtons.forEach((button) =>
    button.addEventListener("click", () =>
      preview.slideToLoop(Number(button.dataset.slide)),
    ),
  );
  reducedMotion.addEventListener("change", (event) => {
    preview.params.speed = event.matches ? 0 : 400;
  });
}

// A cached badge count avoids GitHub's unauthenticated API rate limit.
async function loadGitHubStars() {
  const cacheKey = "crossdesk_github_stars_v1";
  const cacheLifetime = 30 * 60 * 1000;
  const validCount = (value) =>
    typeof value === "string" && /^\d+(?:\.\d+)?[kmb]?$/i.test(value);
  const renderCount = (count) => {
    document.querySelectorAll("[data-github-stars]").forEach((element) => {
      element.textContent = count;
      element.setAttribute("aria-label", `${count} stars`);
    });
  };

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (validCount(cached?.count) && Number.isFinite(cached?.timestamp)) {
      renderCount(cached.count);
      const age = Date.now() - cached.timestamp;
      if (age >= 0 && age < cacheLifetime) return;
    }
  } catch (_) {
    /* Missing or blocked storage must not prevent a fresh count. */
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      "https://img.shields.io/github/stars/kunkundi/crossdesk.json",
      { signal: controller.signal, credentials: "omit" },
    );
    if (!response.ok) return;
    const data = await response.json();
    if (!validCount(data.message)) return;
    renderCount(data.message);
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ count: data.message, timestamp: Date.now() }),
      );
    } catch (_) {
      /* The visible count does not depend on persistent storage. */
    }
  } catch (_) {
    /* Keep the last count, or the Star label and working repository link. */
  } finally {
    clearTimeout(timeout);
  }
}
loadGitHubStars();

// realtime stats
const STATS_API_URL = "https://api.crossdesk.cn:9099/stats";
const STATS_REFRESH_INTERVAL = 10000;
const STATS_REQUEST_TIMEOUT = 5000;

function formatStatsCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count.toLocaleString() : "--";
}

function updateStatsUI(data) {
  const onlineDeviceBaseCount = Number(data?.online_device_count);
  const onlineWebClientCount = Number(data?.online_web_client_count);
  const onlineDeviceTotalCount = Number.isFinite(onlineDeviceBaseCount)
    ? onlineDeviceBaseCount +
      (Number.isFinite(onlineWebClientCount) ? onlineWebClientCount : 0)
    : data?.online_device_count;
  const onlineDeviceCount = formatStatsCount(onlineDeviceTotalCount);
  const activeConnectionCount = formatStatsCount(data?.active_connection_count);

  document.querySelectorAll("[data-online-device-count]").forEach((el) => {
    el.textContent = onlineDeviceCount;
  });
  document.querySelectorAll("[data-active-connection-count]").forEach((el) => {
    el.textContent = activeConnectionCount;
  });
}

async function fetchRealtimeStats() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STATS_REQUEST_TIMEOUT);

  try {
    const response = await fetch(STATS_API_URL, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    updateStatsUI(data);
  } catch (error) {
    if (error.name === "AbortError") {
      console.warn("获取在线统计超时");
    } else {
      console.warn("获取在线统计失败:", error.message);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

if (document.querySelector("[data-online-device-count]")) {
  fetchRealtimeStats();
  setInterval(fetchRealtimeStats, STATS_REFRESH_INTERVAL);
}

async function loadDownloadVersion(dialog) {
  const VERSION_API_URL = "https://version.crossdesk.cn/version.json";
  const CACHE_KEY = "crossdesk_version_cache";
  const CACHE_TIMESTAMP_KEY = "crossdesk_version_timestamp";
  const CACHE_DURATION = 60 * 60 * 1000;

  const defaultVersionData = {
    version: dialog.querySelector("#version-display")?.textContent.trim().replace(/^v/, ""),
    releaseDate: dialog.querySelector("#release-date-display")?.textContent.trim(),
    downloads: Object.fromEntries(
      [...dialog.querySelectorAll("a[data-download][href]")].map((link) => [
        link.dataset.download,
        { url: link.href, filename: link.getAttribute("title") || "" },
      ]),
    ),
  };

  let versionData = defaultVersionData;

  // get cached version
  function getCachedVersion() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
          return JSON.parse(cached);
        }
      }
    } catch (e) {
      console.warn("读取缓存失败:", e);
    }
    return null;
  }

  // update version ui
  function updateVersionUI(data) {
    if (!data) return;

    const versionDisplay = dialog.querySelector("#version-display");
    if (versionDisplay && data.version) {
      versionDisplay.textContent = `v${data.version}`;
    }

    const dateDisplay = dialog.querySelector("#release-date-display");
    if (dateDisplay && data.releaseDate) {
      dateDisplay.textContent = data.releaseDate;
      if (dateDisplay.tagName === "TIME") dateDisplay.dateTime = data.releaseDate;
    }

    if (data.downloads) {
      const downloads = {
        ...defaultVersionData.downloads,
        ...data.downloads,
      };
      dialog.querySelectorAll("[data-download]").forEach((link) => {
        const key = link.dataset.download;
        // The App Store link stays independent of release packages and cached manifests.
        const downloadInfo =
          key === "ios-app-store" ? defaultVersionData.downloads[key] : downloads[key];
        if (downloadInfo && downloadInfo.url) {
          link.href = downloadInfo.url;
          link.removeAttribute("aria-disabled");
          if (downloadInfo.filename) {
            link.title = downloadInfo.filename;
          }

          // baidu tracking event
          link.onclick = function () {
            if (typeof _hmt !== "undefined") {
              const version = downloadInfo.version || data.version || "unknown";
              _hmt.push([
                "_trackEvent",
                "下载",
                "点击下载",
                `${key}-${version}`,
              ]);
            }
          };
        } else {
          // A package becomes downloadable only after it appears in the manifest.
          link.onclick = null;
          link.removeAttribute("href");
          link.removeAttribute("title");
          link.setAttribute("aria-disabled", "true");
        }
      });
    }
  }

  function saveToCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
      console.warn("保存缓存失败:", e);
    }
  }

  const cached = getCachedVersion();
  if (cached) {
    versionData = cached;
    updateVersionUI(versionData);
  } else {
    updateVersionUI(versionData);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(VERSION_API_URL, {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.version && data.downloads) {
        versionData = data;
        updateVersionUI(versionData);
        saveToCache(data);
      } else {
        console.warn("API 返回的数据格式不正确");
      }
    } else {
      console.warn("⚠️ API 请求失败:", response.status, response.statusText);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.warn("请求超时，使用缓存或默认值");
    } else {
      console.warn("获取版本信息失败:", error.message);
    }

    if (!cached) {
      updateVersionUI(versionData);
    }
  }
}
