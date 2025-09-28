document.addEventListener("DOMContentLoaded", () => {
  try {
    const html = document.documentElement;
    const body = document.body;

    const params = new URLSearchParams(window.location.search);

    const address = params.get("address") || "127.0.0.1";
    const port = parseInt(params.get("port") || "8080", 10);
    const password = params.get("password") || "";

    function parseBoolParam(name, defaultVal) {
      if (!params.has(name)) return defaultVal;
      const v = (params.get(name) || "").trim().toLowerCase();

      if (v === "1" || v === "true" || v === "yes") return true;
      if (v === "0" || v === "false" || v === "no") return false;

      return defaultVal;
    }

    function parseNumberParam(name, defaultVal) {
      if (!params.has(name)) return defaultVal;
      const v = parseFloat(params.get(name));

      return Number.isFinite(v) ? v : defaultVal;
    }

    const AUTO_START = parseBoolParam(
      "autostart",
      parseBoolParam("autoplay", true)
    );
    const initialDelayMinutes = Math.max(0, parseNumberParam("delay", 10));

    const MINUTES_TO_MS = 60 * 1000;
    const INITIAL_DELAY_MS = Math.round(initialDelayMinutes * MINUTES_TO_MS);

    const startAtParam =
      params.get("startAt") || params.get("startAtMs") || null;
    const START_AT_MS = startAtParam ? parseInt(startAtParam, 10) : 0;

    console.log(
      "Gib das in die URL dazu ein.\nZusatz URL:\n'/?autoplay= ', ' true ' oder ' false '\n" +
        "dann sollte es so aus sehen:\n' /?autoplay=true '.\n" +
        "Danach gibt's du die Dauer der Pause ein z.B.:\n" +
        "' &delay=10 '.\n10 für die 10 Minuten oder 5 für 5 Minuten.\n" +
        "Man kann auch weniger setzten z.B.:\n0.5 sind nur dann 30 Sekunden."
    );

    function bodySecurityToken() {
      const fontFamilyVar = "--font-family";
      const robotoBold = getComputedStyle(html)
        .getPropertyValue(fontFamilyVar)
        .trim();
      if (!robotoBold) console.error("Die Schrift existiert nicht mehr.");

      if (robotoBold) body.style.fontFamily = robotoBold;

      Object.assign(body.style, {
        webkitUserSelect: "none",
        userSelect: "none",
        cursor: "default",
        pointerEvents: "none",
      });

      const ids = [
        "discordImgContainerId",
        "discordImgId",
        "instagramImgContainerId",
        "instagramImgId",
        "spotifyImgContainerId",
        "spotifyImgId",
        "twitchImgContainerId",
        "twitchImgId",
        "twitterImgContainerId",
        "twitterImgId",
        "youtubeImgContainerId",
        "youtubeImgId",
        "discordServerNameContainerId",
        "discordServerNameId",
        "socialMediaNameContainerId",
        "socialMediaNameId",
      ];

      const eventArray = ["copy", "keydown", "dragstart", "select"];

      const dataStyle = {
        webkitUserSelect: "none",
        userSelect: "none",
        cursor: "default",
        pointerEvents: "none",
      };

      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        eventArray.forEach((ev) => {
          body.addEventListener(ev, (e) => e.preventDefault());
          el.addEventListener(ev, (e) => e.preventDefault());
        });

        Object.assign(el.style, dataStyle);
      });
    }
    bodySecurityToken();

    function readCssMsVar(name, fallback = 1000) {
      try {
        const raw = getComputedStyle(html).getPropertyValue(name).trim();

        if (!raw) return fallback;
        const n = parseInt(raw, 10);

        return Number.isFinite(n) ? n : fallback;
      } catch {
        return fallback;
      }
    }

    const ANIM_MS = readCssMsVar("--time-ms", 2000);
    const VISIBLE_MS = Math.max(5000, ANIM_MS);
    const PAUSE_MS = 2000;
    const restartMs = 200;
    const WAIT_CHUNK = 50;
    const PRELOAD_TIMEOUT = 500;

    const zero = 0,
      one = 1;
    const get = (id) => document.getElementById(id);

    const icons = {
      discord: get("discordImgId"),
      instagram: get("instagramImgId"),
      spotify: get("spotifyImgId"),
      twitch: get("twitchImgId"),
      twitter: get("twitterImgId"),
      youtube: get("youtubeImgId"),
    };

    const discordName = get("discordServerNameId");
    const socialName = get("socialMediaNameId");

    const CLASSES = [
      "discord-img-slide-in",
      "discord-server-name-slide-in",
      "fade-in",
      "fade-out",
      "youtube-img-slide-out",
      "social-media-name-slide-out",
      "social-media-fade-in",
      "social-media-fade-out",
      "slide-in-bg",
      "social-media-slide-out",
      "fade-in-instagram",
      "fade-in-spotify",
      "fade-in-twitch",
      "fade-in-twitter",
      "fade-in-youtube",
      "fade-out-discord",
      "fade-out-instagram",
      "fade-out-spotify",
      "fade-out-twitch",
      "fade-out-twitter",
    ];

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const forceReflow = (el) => {
      if (el) void el.offsetWidth;
    };

    const safeAdd = (el, cls) => {
      if (el && cls && !el.classList.contains(cls)) el.classList.add(cls);
    };

    const safeRem = (el, cls) => {
      if (el && cls && el.classList.contains(cls)) el.classList.remove(cls);
    };

    const removeAllClasses = (el) => {
      if (!el) return;

      for (const c of CLASSES) safeRem(el, c);
    };

    const preloadImage = (url, timeout = PRELOAD_TIMEOUT) => {
      if (!url) return Promise.resolve(false);

      return Promise.race([
        new Promise((res) => {
          const img = new Image();

          img.onload = () => res(true);
          img.onerror = () => res(false);
          try {
            img.src = url;
          } catch {
            res(false);
          }
        }),
        new Promise((res) => setTimeout(() => res(false), timeout)),
      ]);
    };

    function initElements() {
      const allEls = Object.values(icons)
        .filter(Boolean)
        .concat([discordName, socialName].filter(Boolean));

      for (const el of allEls) {
        el.style.willChange = "opacity, transform";
        el.style.opacity = 0;
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";

        removeAllClasses(el);
      }
    }
    initElements();

    const rAFApply = (fn) =>
      new Promise((res) =>
        requestAnimationFrame(() => {
          try {
            fn();
          } catch {}
          res();
        })
      );

    function waitAnimationEnd(el, timeout = ANIM_MS + 200) {
      return new Promise((resolve) => {
        if (!el) return resolve();
        let done = false;

        const onEnd = (e) => {
          cleanup();

          resolve(e);
        };

        const cleanup = () => {
          if (done) return;
          done = true;

          el.removeEventListener("animationend", onEnd);
          el.removeEventListener("transitionend", onEnd);

          clearTimeout(timer);
        };

        el.addEventListener("animationend", onEnd);
        el.addEventListener("transitionend", onEnd);

        const timer = setTimeout(() => {
          cleanup();

          resolve();
        }, timeout);
      });
    }

    async function playInPair(imgEl, nameEl, imgClass, nameClass) {
      if (!imgEl && !nameEl) return;

      if (imgEl) {
        removeAllClasses(imgEl);

        imgEl.style.visibility = "visible";
      }

      if (nameEl) {
        removeAllClasses(nameEl);

        nameEl.style.visibility = "visible";
      }

      await rAFApply(() => {
        if (imgEl) forceReflow(imgEl);

        if (nameEl) forceReflow(nameEl);
      });

      if (imgEl && imgClass) safeAdd(imgEl, imgClass);
      if (nameEl && nameClass) safeAdd(nameEl, nameClass);

      await Promise.all([
        imgEl ? waitAnimationEnd(imgEl) : Promise.resolve(),
        nameEl ? waitAnimationEnd(nameEl) : Promise.resolve(),
      ]);

      if (imgEl) {
        imgEl.style.opacity = one;

        if (imgClass) safeRem(imgEl, imgClass);
      }

      if (nameEl) {
        nameEl.style.opacity = one;

        if (nameClass) safeRem(nameEl, nameClass);
      }
    }

    async function playOutPair(imgEl, nameEl, imgOutClass, nameOutClass) {
      if (!imgEl && !nameEl) return;

      if (imgEl) removeAllClasses(imgEl);
      if (nameEl) removeAllClasses(nameEl);

      await rAFApply(() => {
        if (imgEl) forceReflow(imgEl);

        if (nameEl) forceReflow(nameEl);
      });

      if (imgEl) {
        if (imgOutClass) safeAdd(imgEl, imgOutClass);
        else safeAdd(imgEl, "fade-out");
      }

      if (nameEl && nameOutClass) safeAdd(nameEl, nameOutClass);

      await Promise.all([
        imgEl ? waitAnimationEnd(imgEl) : Promise.resolve(),
        nameEl ? waitAnimationEnd(nameEl) : Promise.resolve(),
      ]);

      if (imgEl) {
        imgEl.style.opacity = zero;
        imgEl.style.visibility = "hidden";

        if (imgOutClass) safeRem(imgEl, imgOutClass);
        else safeRem(imgEl, "fade-out");
      }

      if (nameEl) {
        nameEl.style.opacity = zero;
        nameEl.style.visibility = "hidden";

        if (nameOutClass) safeRem(nameEl, nameOutClass);
      }
    }

    const steps = [
      {
        key: "discord",
        img: icons.discord,
        name: discordName,
        imgIn: "discord-img-slide-in",
        imgOut: "fade-out",
        nameIn: "discord-server-name-slide-in",
        nameOut: "fade-out",
        inMode: "discordSpecial",
        outMode: "discordOut",
      },
      {
        key: "instagram",
        img: icons.instagram,
        name: socialName,
        imgIn: "fade-in",
        imgOut: "fade-out",
        nameIn: "fade-in",
        nameOut: "fade-out",
        inMode: "genericPair",
        outMode: "genericPairOut",
      },
      {
        key: "spotify",
        img: icons.spotify,
        name: socialName,
        imgIn: "fade-in",
        imgOut: "fade-out",
        nameIn: "fade-in",
        nameOut: "fade-out",
        inMode: "genericPair",
        outMode: "genericPairOut",
      },
      {
        key: "twitch",
        img: icons.twitch,
        name: socialName,
        imgIn: "fade-in",
        imgOut: "fade-out",
        nameIn: "fade-in",
        nameOut: "fade-out",
        inMode: "genericPair",
        outMode: "genericPairOut",
      },
      {
        key: "twitter",
        img: icons.twitter,
        name: socialName,
        imgIn: "fade-in",
        imgOut: "fade-out",
        nameIn: "fade-in",
        nameOut: "fade-out",
        inMode: "genericPair",
        outMode: "genericPairOut",
      },
      {
        key: "youtube",
        img: icons.youtube,
        name: socialName,
        imgIn: "fade-in",
        imgOut: "youtube-img-slide-out",
        nameIn: "fade-in",
        nameOut: "social-media-name-slide-out",
        inMode: "pair",
        outMode: "youtubePairOut",
      },
    ];

    async function prepareNext(idx) {
      const next = steps[idx];
      if (!next || !next.img) return;

      removeAllClasses(next.img);
      if (next.name) removeAllClasses(next.name);

      next.img.style.opacity = zero;
      next.img.style.visibility = "hidden";
      next.img.style.pointerEvents = "none";

      if (next.name) {
        next.name.style.opacity = zero;
        next.name.style.visibility = "hidden";
        next.name.style.pointerEvents = "none";
      }

      const src =
        (next.img.getAttribute && next.img.getAttribute("src")) ||
        next.img.src ||
        "";

      try {
        if (next.img.complete) return;
      } catch {}

      await preloadImage(src).catch(() => false);
    }

    async function runStep(step, idx) {
      if (!step) return true;

      try {
        switch (step.inMode) {
          case "discordSpecial":
            await playInPair(step.img, step.name, step.imgIn, step.nameIn);

            break;

          case "genericPair":
          case "pair":
          default:
            await playInPair(step.img, step.name, step.imgIn, step.nameIn);

            break;
        }

        if (!(await waitGuard(VISIBLE_MS))) return false;

        switch (step.outMode) {
          case "discordOut":
            await playOutPair(
              step.img,
              step.name,
              step.imgOut || "fade-out",
              step.nameOut || "fade-out"
            );

            break;

          case "youtubePairOut":
            if (step.img) {
              removeAllClasses(step.img);

              safeAdd(step.img, step.imgOut);
            }

            if (step.name) {
              removeAllClasses(step.name);

              safeAdd(step.name, step.nameOut);
            }

            await Promise.all([
              step.img ? waitAnimationEnd(step.img) : Promise.resolve(),
              step.name ? waitAnimationEnd(step.name) : Promise.resolve(),
            ]);

            if (step.img) {
              step.img.style.opacity = zero;
              step.img.style.visibility = "hidden";

              safeRem(step.img, step.imgOut);
            }

            if (step.name) {
              step.name.style.opacity = zero;
              step.name.style.visibility = "hidden";

              safeRem(step.name, step.nameOut);
            }

            break;

          case "genericPairOut":
          default:
            await Promise.all([
              step.img
                ? playOutPair(step.img, null, step.imgOut || "fade-out", null)
                : Promise.resolve(),
              step.name
                ? playOutPair(null, step.name, null, step.nameOut)
                : Promise.resolve(),
            ]);

            break;
        }

        const nextIdx = (idx + 1) % steps.length;
        await prepareNext(nextIdx);

        if (!(await waitGuard(PAUSE_MS))) return false;

        return true;
      } catch (err) {
        console.error("runStep error:", err);

        return false;
      }
    }

    let stopFlag = false;

    async function waitGuard(ms) {
      const chunk = WAIT_CHUNK;
      let elapsed = 0;

      while (elapsed < ms) {
        if (stopFlag) return false;

        const step = Math.min(chunk, ms - elapsed);
        await wait(step);
        elapsed += step;
      }

      return !stopFlag;
    }

    async function runSequenceOnce(stepsArr) {
      for (let i = 0; i < stepsArr.length; i++) {
        if (stopFlag) return false;

        const ok = await runStep(stepsArr[i], i);
        if (!ok) return false;
      }

      return true;
    }

    async function loopRunner() {
      if (stopFlag) return;

      await runSequenceOnce(steps);
    }

    function hardReset() {
      for (const k in icons) {
        const el = icons[k];
        if (!el) continue;

        el.style.opacity = zero;
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";

        removeAllClasses(el);
      }
      if (discordName) {
        discordName.style.opacity = zero;
        discordName.style.visibility = "hidden";

        removeAllClasses(discordName);
      }

      if (socialName) {
        socialName.style.opacity = zero;
        socialName.style.visibility = "hidden";

        removeAllClasses(socialName);
      }
    }

    function start() {
      if (!steps || steps.length === 0) return;
      stopFlag = false;

      hardReset();
      initElements();

      prepareNext(0).catch(() => {});
      loopRunner().catch(() => {});
    }

    function stop() {
      stopFlag = true;

      hardReset();
    }

    function restart() {
      stop();

      setTimeout(() => start(), restartMs);
    }

    window.__socialRotator = { start, stop, restart };

    if (AUTO_START) {
      if (START_AT_MS && START_AT_MS > 0) {
        const now = Date.now();
        const waitMs = Math.max(0, START_AT_MS - now);
        console.log(
          "Geplanter synchroner Start in ms:",
          waitMs,
          " (startAt=",
          START_AT_MS,
          ")"
        );
        if (waitMs > 0) {
          setTimeout(() => start(), waitMs);
        } else {
          start();
        }
      } else {
        setTimeout(() => {
          start();
        }, INITIAL_DELAY_MS);
      }
    }

    console.log(
      "Manuel Social Media Rotated start:\n" +
        "' window.__socialRotator.start(); '\n\n" +
        "Manuel Social Media Rotated stop:\n" +
        "' window.__socialRotator.stop(); '"
    );
  } catch (error) {
    console.error("Fehler beim Script:", error);
  }
});
