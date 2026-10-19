// Language preference is optional; storage restrictions must not break controls.
function switchLanguage(lang) {
  const language = lang === "en" ? "en" : "zh";
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document
    .querySelectorAll("img[data-src-zh][data-src-en]")
    .forEach((image) => {
      const source = image.getAttribute(`data-src-${language}`);
      if (image.getAttribute("src") !== source)
        image.setAttribute("src", source);
      const description = image.getAttribute(`data-alt-${language}`);
      if (description) image.alt = description;
    });
  document.querySelectorAll(".lang-zh, .lang-en").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.classList.contains(`lang-${language}`)),
    );
  });
  const sponsorLinks = document.querySelector("[data-sponsor-links]");
  const sponsorOrder =
    language === "zh"
      ? ["afdian", "kofi", "github"]
      : ["kofi", "github", "afdian"];
  sponsorOrder.forEach((platform) => {
    const link = sponsorLinks?.querySelector(`[data-sponsor="${platform}"]`);
    if (link) sponsorLinks.appendChild(link);
  });
  try {
    localStorage.setItem("lang", language);
  } catch (_) {
    /* Private storage may be unavailable. */
  }
}
let savedLang;
try {
  savedLang = localStorage.getItem("lang");
} catch (_) {
  /* Use browser language. */
}
switchLanguage(
  savedLang ||
    ((navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"),
);
document
  .querySelectorAll(".lang-zh")
  .forEach((button) =>
    button.addEventListener("click", () => switchLanguage("zh")),
  );
document
  .querySelectorAll(".lang-en")
  .forEach((button) =>
    button.addEventListener("click", () => switchLanguage("en")),
  );

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

const dropdowns = [...document.querySelectorAll(".download-dropdown")];
function closeDownloadMenus(except = null) {
  dropdowns.forEach((dropdown) => {
    if (dropdown === except) return;
    dropdown.querySelector("button").setAttribute("aria-expanded", "false");
    dropdown.querySelector(".download-menu").hidden = true;
  });
}
dropdowns.forEach((dropdown) => {
  const button = dropdown.querySelector("button");
  const menu = dropdown.querySelector(".download-menu");
  button.addEventListener("click", () => {
    const open = menu.hidden;
    closeDownloadMenus();
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  });
  button.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      closeDownloadMenus(dropdown);
      menu.hidden = false;
      button.setAttribute("aria-expanded", "true");
      menu.querySelector("a[href]")?.focus();
    }
  });
  // Delegation also handles links replaced by release-manifest updates.
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a[href]")) closeDownloadMenus();
  });
  dropdown.addEventListener("focusout", (event) => {
    if (!dropdown.contains(event.relatedTarget)) {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".download-dropdown")) closeDownloadMenus();
  if (!event.target.closest(".site-header")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const openDropdown = dropdowns.find(
    (dropdown) => !dropdown.querySelector(".download-menu").hidden,
  );
  if (openDropdown) {
    closeDownloadMenus();
    openDropdown.querySelector("button").focus();
  }
  if (!mobileMenu.hidden) closeMenu(true);
});

// Manual previews stay still until the visitor selects a view or swipes.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const previewButtons = [...document.querySelectorAll("[data-slide]")];
if (typeof Swiper !== "undefined") {
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

fetchRealtimeStats();
setInterval(fetchRealtimeStats, STATS_REFRESH_INTERVAL);

// version Management
(async function () {
  const VERSION_API_URL = "https://version.crossdesk.cn/version.json";
  const CACHE_KEY = "crossdesk_version_cache";
  const CACHE_TIMESTAMP_KEY = "crossdesk_version_timestamp";
  const CACHE_DURATION = 60 * 60 * 1000;

  const defaultVersionData = {
    version: "1.6.0-20260930",
    releaseDate: "2026-09-30",
    downloads: {
      "windows-x64": {
        url: "https://downloads.crossdesk.cn/crossdesk-win-x64-v1.6.0-20260930.exe",
        filename: "crossdesk-win-x64-v1.6.0-20260930.exe",
      },
      "windows-x64-portable": {
        url: "https://downloads.crossdesk.cn/crossdesk-win-x64-portable-v1.6.0-20260930.zip",
        filename: "crossdesk-win-x64-portable-v1.6.0-20260930.zip",
      },
      "macos-x64": {
        url: "https://downloads.crossdesk.cn/crossdesk-macos-x64-v1.6.0-20260930.pkg",
        filename: "crossdesk-macos-x64-v1.6.0-20260930.pkg",
      },
      "macos-arm64": {
        url: "https://downloads.crossdesk.cn/crossdesk-macos-arm64-v1.6.0-20260930.pkg",
        filename: "crossdesk-macos-arm64-v1.6.0-20260930.pkg",
      },
      "linux-amd64": {
        url: "https://downloads.crossdesk.cn/crossdesk-linux-amd64-v1.6.0-20260930.deb",
        filename: "crossdesk-linux-amd64-v1.6.0-20260930.deb",
      },
      "linux-arm64": {
        url: "https://downloads.crossdesk.cn/crossdesk-linux-arm64-v1.6.0-20260930.deb",
        filename: "crossdesk-linux-arm64-v1.6.0-20260930.deb",
      },
      "ios-arm64": {
        url: "https://downloads.crossdesk.cn/crossdesk-ios-arm64-unsigned-v0.0.1-20260930.zip",
        filename: "crossdesk-ios-arm64-unsigned-v0.0.1-20260930.zip",
        version: "0.0.1-20260930",
      },
      "android-arm64": {
        url: "https://downloads.crossdesk.cn/crossdesk-android-arm64-v1.6.0-20261002.apk",
        filename: "crossdesk-android-arm64-v1.6.0-20261002.apk",
        version: "1.6.0-20261002",
      },
    },
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

    const versionDisplay = document.getElementById("version-display");
    if (versionDisplay && data.version) {
      versionDisplay.textContent = `v${data.version}`;
    }

    const dateDisplay = document.getElementById("release-date-display");
    if (dateDisplay && data.releaseDate) {
      dateDisplay.textContent = data.releaseDate;
    }

    if (data.downloads) {
      const downloads = {
        ...defaultVersionData.downloads,
        ...data.downloads,
      };
      document.querySelectorAll("[data-download]").forEach((link) => {
        const key = link.dataset.download;
        const downloadInfo = downloads[key];
        // Replace links to clear tracking handlers from a prior cache/API update.
        const newLink = link.cloneNode(true);
        if (downloadInfo && downloadInfo.url) {
          newLink.href = downloadInfo.url;
          newLink.removeAttribute("aria-disabled");
          if (downloadInfo.filename) {
            newLink.title = downloadInfo.filename;
          }

          // baidu tracking event
          const trackDownload = function () {
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

          newLink.addEventListener("click", trackDownload);
        } else {
          // A package becomes downloadable only after it appears in the manifest.
          newLink.removeAttribute("href");
          newLink.removeAttribute("title");
          newLink.setAttribute("aria-disabled", "true");
        }
        link.parentNode.replaceChild(newLink, link);
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
})();
