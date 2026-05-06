import { motion } from "framer-motion";
import { GripHorizontal } from "lucide-react";
import { useTheme } from "next-themes";
import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const Skiper26 = () => {
  const [variant, setVariant] = useState("rectangle");
  const [start, setStart] = useState("bottom-up");
  const [blur, setBlur] = useState(false);
  const [gifType, setGifType] = useState("1");
  const [gifUrl, setGifUrl] = useState(
    "https://media.giphy.com/media/KBbr4hHl9DSahKvInO/giphy.gif?cid=790b76112m5eeeydoe7et0cr3j3ekb1erunxozyshuhxx2vl&ep=v1_stickers_search&rid=giphy.gif&ct=s",
  );

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <div className="mx-auto max-w-lg space-y-5">
        <h2 className="mt-36 text-4xl font-medium tracking-tight">
          07.09.2025 <br />
          Skiper ui is live now
        </h2>
        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p>
        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p>
        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p>
      </div>

      <div className="text-foreground grid content-start justify-items-center gap-6 py-20 text-center">
        <span className="after:from-background after:to-foreground relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:content-['']">
          Click to toggle the theme
        </span>
      </div>

      <ThemeToggleButton variant={variant} start={start} blur={blur} gifUrl={gifUrl} />
      <Options
        variant={variant} start={start} blur={blur}
        gifType={gifType} gifUrl={gifUrl}
        setVariant={setVariant} setStart={setStart} setBlur={setBlur}
        setGifType={setGifType} setGifUrl={setGifUrl}
      />
    </div>
  );
};

export { Skiper26 };

const Options = ({ variant, start, blur, gifType, gifUrl, setVariant, setStart, setBlur, setGifType, setGifUrl }) => {
  return (
    <motion.div
      drag
      className="top-30 border-foreground/10 bg-muted2 absolute right-1/2 flex w-[245px] translate-x-1/2 flex-col gap-3 rounded-3xl border p-3 backdrop-blur-sm lg:right-4 lg:translate-x-0"
    >
      <div className="flex items-center justify-between">
        <span className="size-4 cursor-grab active:cursor-grabbing">
          <GripHorizontal className="size-4 opacity-50" />
        </span>
        <p className="group flex cursor-pointer items-center justify-center gap-1 rounded-lg px-2 py-1 text-sm opacity-50">
          Options
        </p>
      </div>

      <div className="flex flex-col">
        <div className="mt-1 flex justify-between py-1">
          <p className="w-20 whitespace-nowrap text-sm opacity-50">variant :</p>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {["circle", "rectangle", "gif", "polygon", "circle-blur"].map((v) => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                className={cn("cursor-pointer px-1 text-sm transition-opacity",
                  variant === v ? "opacity-100" : "hover:bg-foreground/10 opacity-50 hover:opacity-100")}
              >{v}</button>
            ))}
          </div>
        </div>

        <div className="mt-1 flex justify-between py-1">
          <p className="w-20 whitespace-nowrap text-sm opacity-50">blur :</p>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {[false, true].map((b) => (
              <button
                key={String(b)}
                onClick={() => setBlur(b)}
                className={cn("cursor-pointer px-1 text-sm transition-opacity",
                  blur === b ? "opacity-100" : "hover:bg-foreground/10 opacity-50 hover:opacity-100")}
              >{b ? "on" : "off"}</button>
            ))}
          </div>
        </div>

        {(variant === "circle" || variant === "rectangle" || variant === "polygon" || variant === "circle-blur") && (
          <div className="mt-1 flex justify-between py-1">
            <p className="w-20 whitespace-nowrap text-sm opacity-50">start :</p>
            <div className="flex flex-wrap items-center justify-end gap-1">
              {(variant === "circle" || variant === "circle-blur") && (
                <button onClick={() => setStart("center")}
                  className={cn("cursor-pointer px-1 text-sm transition-opacity",
                    start === "center" ? "opacity-100" : "hover:bg-foreground/10 opacity-50 hover:opacity-100")}>
                  center
                </button>
              )}
              {variant === "rectangle" && ["bottom-up","top-down","left-right","right-left"].map((s) => (
                <button key={s} onClick={() => setStart(s)}
                  className={cn("cursor-pointer px-1 text-sm transition-opacity",
                    start === s ? "opacity-100" : "hover:bg-foreground/10 opacity-50 hover:opacity-100")}>
                  {s}
                </button>
              ))}
              {(variant === "circle" || variant === "polygon" || variant === "circle-blur") &&
                ["top-left","top-right","bottom-left","bottom-right"].filter(s =>
                  variant !== "polygon" || !s.startsWith("bottom")).map((s) => (
                  <button key={s} onClick={() => setStart(s)}
                    className={cn("cursor-pointer px-1 text-sm transition-opacity",
                      start === s ? "opacity-100" : "hover:bg-foreground/10 opacity-50 hover:opacity-100")}>
                    {s}
                  </button>
                ))
              }
              {(variant === "circle" || variant === "circle-blur") &&
                ["top-center","bottom-center"].map((s) => (
                  <button key={s} onClick={() => setStart(s)}
                    className={cn("cursor-pointer px-1 text-sm transition-opacity",
                      start === s ? "opacity-100" : "hover:bg-foreground/10 opacity-50 hover:opacity-100")}>
                    {s}
                  </button>
                ))
              }
            </div>
          </div>
        )}

        {variant === "gif" && (
          <div className="mt-1 flex justify-between py-1">
            <p className="w-20 text-sm opacity-50">gif type :</p>
            <div className="flex flex-wrap items-center justify-end gap-1">
              {[
                { id: "1", url: "https://media.giphy.com/media/KBbr4hHl9DSahKvInO/giphy.gif?cid=790b76112m5eeeydoe7et0cr3j3ekb1erunxozyshuhxx2vl&ep=v1_stickers_search&rid=giphy.gif&ct=s" },
                { id: "2", url: "https://media.giphy.com/media/5PncuvcXbBuIZcSiQo/giphy.gif?cid=ecf05e47j7vdjtytp3fu84rslaivdun4zvfhej6wlvl6qqsz&ep=v1_stickers_search&rid=giphy.gif&ct=s" },
                { id: "3", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3JwcXdzcHd5MW92NWprZXVpcTBtNXM5cG9obWh0N3I4NzFpaDE3byZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/WgsVx6C4N8tjy/giphy.gif" },
              ].map(({ id, url }) => (
                <button key={id} onClick={() => { setGifType(id); setGifUrl(url); }}
                  className={cn("cursor-pointer px-1 text-sm transition-opacity",
                    gifType === id ? "opacity-100" : "hover:bg-foreground/10 opacity-50 hover:opacity-100")}>
                  {id}
                </button>
              ))}
              <button onClick={() => setGifType("custom")}
                className={cn("cursor-pointer px-1 text-sm transition-opacity",
                  gifType === "custom" ? "opacity-100" : "hover:bg-foreground/10 opacity-50 hover:opacity-100")}>
                custom
              </button>
            </div>
          </div>
        )}

        {variant === "gif" && gifType === "custom" && (
          <div className="mt-1 flex flex-col gap-1 py-1">
            <p className="text-sm opacity-50">gif url :</p>
            <input
              type="text" value={gifUrl}
              onChange={(e) => setGifUrl(e.target.value)}
              placeholder="Enter GIF URL"
              className="text-foreground placeholder:text-foreground/50 w-full rounded-lg bg-transparent px-2 py-1 text-xs focus:outline-none"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const useThemeToggle = ({ variant = "circle", start = "center", blur = false, gifUrl = "" } = {}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const styleId = "theme-transition-styles";

  const updateStyles = useCallback((css) => {
    if (typeof window === "undefined") return;
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = css;
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(!isDark);
    const animation = createAnimation(variant, start, blur, gifUrl);
    updateStyles(animation.css);
    if (typeof window === "undefined") return;
    const switchTheme = () => setTheme(theme === "light" ? "dark" : "light");
    if (!document.startViewTransition) { switchTheme(); return; }
    document.startViewTransition(switchTheme);
  }, [theme, setTheme, variant, start, blur, gifUrl, updateStyles, isDark]);

  const setCrazyLightTheme = useCallback(() => {
    setIsDark(false);
    const animation = createAnimation(variant, start, blur, gifUrl);
    updateStyles(animation.css);
    if (typeof window === "undefined") return;
    const switchTheme = () => setTheme("light");
    if (!document.startViewTransition) { switchTheme(); return; }
    document.startViewTransition(switchTheme);
  }, [setTheme, variant, start, blur, gifUrl, updateStyles]);

  const setCrazyDarkTheme = useCallback(() => {
    setIsDark(true);
    const animation = createAnimation(variant, start, blur, gifUrl);
    updateStyles(animation.css);
    if (typeof window === "undefined") return;
    const switchTheme = () => setTheme("dark");
    if (!document.startViewTransition) { switchTheme(); return; }
    document.startViewTransition(switchTheme);
  }, [setTheme, variant, start, blur, gifUrl, updateStyles]);

  const setCrazySystemTheme = useCallback(() => {
    if (typeof window === "undefined") return;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    const animation = createAnimation(variant, start, blur, gifUrl);
    updateStyles(animation.css);
    const switchTheme = () => setTheme("system");
    if (!document.startViewTransition) { switchTheme(); return; }
    document.startViewTransition(switchTheme);
  }, [setTheme, variant, start, blur, gifUrl, updateStyles]);

  return { isDark, setIsDark, toggleTheme, setCrazyLightTheme, setCrazyDarkTheme, setCrazySystemTheme };
};

export const ThemeToggleButton = ({ className = "", variant = "circle", start = "center", blur = false, gifUrl = "" }) => {
  const { isDark, toggleTheme } = useThemeToggle({ variant, start, blur, gifUrl });

  return (
    <button
      type="button"
      className={cn("size-10 cursor-pointer rounded-full bg-black p-0 transition-all duration-300 active:scale-95", className)}
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <span className="sr-only">Toggle theme</span>
      <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.g animate={{ rotate: isDark ? -180 : 0 }} transition={{ ease: "easeInOut", duration: 0.5 }}>
          <path d="M120 67.5C149.25 67.5 172.5 90.75 172.5 120C172.5 149.25 149.25 172.5 120 172.5" fill="white" />
          <path d="M120 67.5C90.75 67.5 67.5 90.75 67.5 120C67.5 149.25 90.75 172.5 120 172.5" fill="black" />
        </motion.g>
        <motion.path
          animate={{ rotate: isDark ? 180 : 0 }}
          transition={{ ease: "easeInOut", duration: 0.5 }}
          d="M120 3.75C55.5 3.75 3.75 55.5 3.75 120C3.75 184.5 55.5 236.25 120 236.25C184.5 236.25 236.25 184.5 236.25 120C236.25 55.5 184.5 3.75 120 3.75ZM120 214.5V172.5C90.75 172.5 67.5 149.25 67.5 120C67.5 90.75 90.75 67.5 120 67.5V25.5C172.5 25.5 214.5 67.5 214.5 120C214.5 172.5 172.5 214.5 120 214.5Z"
          fill="white"
        />
      </svg>
    </button>
  );
};

const getPositionCoords = (position) => {
  const map = {
    "top-left": { cx: "0", cy: "0" }, "top-right": { cx: "40", cy: "0" },
    "bottom-left": { cx: "0", cy: "40" }, "bottom-right": { cx: "40", cy: "40" },
    "top-center": { cx: "20", cy: "0" }, "bottom-center": { cx: "20", cy: "40" },
    "bottom-up": { cx: "20", cy: "20" }, "top-down": { cx: "20", cy: "20" },
    "left-right": { cx: "20", cy: "20" }, "right-left": { cx: "20", cy: "20" },
  };
  return map[position];
};

const generateSVG = (variant, start) => {
  if (variant === "circle-blur") {
    const { cx, cy } = start === "center" ? { cx: "20", cy: "20" } : getPositionCoords(start);
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="${cx}" cy="${cy}" r="18" fill="white" filter="url(%23blur)"/></svg>`;
  }
  if (start === "center" || variant === "rectangle") return "";
  const { cx, cy } = getPositionCoords(start);
  if (variant === "circle") {
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="${cx}" cy="${cy}" r="20" fill="white"/></svg>`;
  }
  return "";
};

const getTransformOrigin = (start) => {
  const map = {
    "top-left": "top left", "top-right": "top right",
    "bottom-left": "bottom left", "bottom-right": "bottom right",
    "top-center": "top center", "bottom-center": "bottom center",
  };
  return map[start] || "center";
};

export const createAnimation = (variant, start = "center", blur = false, url = "") => {
  const svg = generateSVG(variant, start);
  const transformOrigin = getTransformOrigin(start);

  if (variant === "rectangle") {
    const clipPaths = {
      "bottom-up":    { from: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      "top-down":     { from: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      "left-right":   { from: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      "right-left":   { from: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      "top-left":     { from: "polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      "top-right":    { from: "polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      "bottom-left":  { from: "polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      "bottom-right": { from: "polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
    };
    const cp = clipPaths[start] || clipPaths["bottom-up"];
    const b = blur ? "-blur" : "";
    return { name: `rectangle-${start}${b}`, css: `
      ::view-transition-group(root) { animation-duration: 0.7s; animation-timing-function: var(--expo-out); }
      ::view-transition-new(root) { animation-name: reveal-light-${start}${b}; ${blur ? "filter:blur(2px);" : ""} }
      ::view-transition-old(root), .dark::view-transition-old(root) { animation: none; z-index: -1; }
      .dark::view-transition-new(root) { animation-name: reveal-dark-${start}${b}; ${blur ? "filter:blur(2px);" : ""} }
      @keyframes reveal-dark-${start}${b} { from { clip-path: ${cp.from}; ${blur ? "filter:blur(8px);" : ""} } to { clip-path: ${cp.to}; ${blur ? "filter:blur(0px);" : ""} } }
      @keyframes reveal-light-${start}${b} { from { clip-path: ${cp.from}; ${blur ? "filter:blur(8px);" : ""} } to { clip-path: ${cp.to}; ${blur ? "filter:blur(0px);" : ""} } }
    `};
  }

  if (variant === "circle" && start === "center") {
    const b = blur ? "-blur" : "";
    return { name: `circle-center${b}`, css: `
      ::view-transition-group(root) { animation-duration: 0.7s; animation-timing-function: var(--expo-out); }
      ::view-transition-new(root) { animation-name: reveal-light${b}; ${blur ? "filter:blur(2px);" : ""} }
      ::view-transition-old(root), .dark::view-transition-old(root) { animation: none; z-index: -1; }
      .dark::view-transition-new(root) { animation-name: reveal-dark${b}; ${blur ? "filter:blur(2px);" : ""} }
      @keyframes reveal-dark${b} { from { clip-path: circle(0% at 50% 50%); ${blur ? "filter:blur(8px);" : ""} } to { clip-path: circle(100% at 50% 50%); ${blur ? "filter:blur(0px);" : ""} } }
      @keyframes reveal-light${b} { from { clip-path: circle(0% at 50% 50%); ${blur ? "filter:blur(8px);" : ""} } to { clip-path: circle(100% at 50% 50%); ${blur ? "filter:blur(0px);" : ""} } }
    `};
  }

  if (variant === "gif") {
    return { name: "gif", css: `
      ::view-transition-group(root) { animation-timing-function: var(--expo-in); }
      ::view-transition-new(root) { mask: url('${url}') center / 0 no-repeat; animation: scale 3s; }
      ::view-transition-old(root), .dark::view-transition-old(root) { animation: scale 3s; }
      @keyframes scale { 0% { mask-size: 0; } 10% { mask-size: 50vmax; } 90% { mask-size: 50vmax; } 100% { mask-size: 2000vmax; } }
    `};
  }

  if (variant === "circle-blur") {
    const pos = start === "center" ? "center" : start.replace("-", " ");
    return { name: `circle-blur-${start}`, css: `
      ::view-transition-group(root) { animation-timing-function: var(--expo-out); }
      ::view-transition-new(root) { mask: url('${svg}') ${pos} / 0 no-repeat; mask-origin: content-box; animation: scale 1s; transform-origin: ${start === "center" ? "center" : transformOrigin}; }
      ::view-transition-old(root), .dark::view-transition-old(root) { animation: scale 1s; transform-origin: ${start === "center" ? "center" : transformOrigin}; z-index: -1; }
      @keyframes scale { to { mask-size: 350vmax; } }
    `};
  }

  if (variant === "polygon") {
    const polygonPaths = {
      "top-left":  { darkFrom: "polygon(50% -71%, -50% 71%, -50% 71%, 50% -71%)", darkTo: "polygon(50% -71%, -50% 71%, 50% 171%, 171% 50%)", lightFrom: "polygon(171% 50%, 50% 171%, 50% 171%, 171% 50%)", lightTo: "polygon(171% 50%, 50% 171%, -50% 71%, 50% -71%)" },
      "top-right": { darkFrom: "polygon(150% -71%, 250% 71%, 250% 71%, 150% -71%)", darkTo: "polygon(150% -71%, 250% 71%, 50% 171%, -71% 50%)", lightFrom: "polygon(-71% 50%, 50% 171%, 50% 171%, -71% 50%)", lightTo: "polygon(-71% 50%, 50% 171%, 250% 71%, 150% -71%)" },
    };
    const cp = polygonPaths[start] || polygonPaths["top-left"];
    const b = blur ? "-blur" : "";
    return { name: `polygon-${start}${b}`, css: `
      ::view-transition-group(root) { animation-duration: 0.7s; animation-timing-function: var(--expo-out); }
      ::view-transition-new(root) { animation-name: reveal-light-${start}${b}; ${blur ? "filter:blur(2px);" : ""} }
      ::view-transition-old(root), .dark::view-transition-old(root) { animation: none; z-index: -1; }
      .dark::view-transition-new(root) { animation-name: reveal-dark-${start}${b}; ${blur ? "filter:blur(2px);" : ""} }
      @keyframes reveal-dark-${start}${b} { from { clip-path: ${cp.darkFrom}; } to { clip-path: ${cp.darkTo}; } }
      @keyframes reveal-light-${start}${b} { from { clip-path: ${cp.lightFrom}; } to { clip-path: ${cp.lightTo}; } }
    `};
  }

  if (variant === "circle" && start !== "center") {
    const posMap = { "top-left": "0% 0%", "top-right": "100% 0%", "bottom-left": "0% 100%", "bottom-right": "100% 100%", "top-center": "50% 0%", "bottom-center": "50% 100%" };
    const clipPos = posMap[start] || "50% 50%";
    const b = blur ? "-blur" : "";
    return { name: `circle-${start}${b}`, css: `
      ::view-transition-group(root) { animation-duration: 1s; animation-timing-function: var(--expo-out); }
      ::view-transition-new(root) { animation-name: reveal-light-${start}${b}; ${blur ? "filter:blur(2px);" : ""} }
      ::view-transition-old(root), .dark::view-transition-old(root) { animation: none; z-index: -1; }
      .dark::view-transition-new(root) { animation-name: reveal-dark-${start}${b}; ${blur ? "filter:blur(2px);" : ""} }
      @keyframes reveal-dark-${start}${b} { from { clip-path: circle(0% at ${clipPos}); } to { clip-path: circle(150% at ${clipPos}); } }
      @keyframes reveal-light-${start}${b} { from { clip-path: circle(0% at ${clipPos}); } to { clip-path: circle(150% at ${clipPos}); } }
    `};
  }

  return { name: `${variant}-${start}`, css: `
    ::view-transition-group(root) { animation-timing-function: var(--expo-in); }
    ::view-transition-new(root) { mask: url('${svg}') ${start.replace("-", " ")} / 0 no-repeat; mask-origin: content-box; animation: scale-${start} 1s; transform-origin: ${transformOrigin}; }
    ::view-transition-old(root), .dark::view-transition-old(root) { animation: scale-${start} 1s; transform-origin: ${transformOrigin}; z-index: -1; }
    @keyframes scale-${start} { to { mask-size: 2000vmax; } }
  `};
};
