/**
 * Shared responsive class strings (mobile-first; sm/md/lg apply on web).
 * Native uses base classes only.
 */

/** Horizontal padding for screen content */
export const screenPadding = "px-4 sm:px-6 lg:px-8";

/** Vertical section gaps */
export const pageGap = "gap-6 sm:gap-7 lg:gap-8";

/** Page title typography */
export const fluidTitle = "text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white";

/** Page subtitle */
export const fluidSubtitle = "text-sm sm:text-base text-slate-400 leading-relaxed";

/** Safe top inset below status bar / browser chrome */
export const screenTopInset = "pt-12 sm:pt-14 lg:pt-16";

/** Centered form / onboarding column */
export const contentMaxWidthMd =
  "w-full max-w-md sm:max-w-lg lg:max-w-xl self-center";

/** Standard app content column */
export const contentMaxWidthLg =
  "w-full max-w-lg sm:max-w-xl lg:max-w-2xl self-center";

/** Tabbed main areas on desktop web */
export const contentMaxWidthTab =
  "w-full max-w-full lg:max-w-4xl lg:mx-auto self-center";

/** Chat thread column */
export const contentMaxWidthChat =
  "w-full max-w-lg lg:max-w-2xl self-center";

/** List content inset (matches screenPadding) */
export const listContentInset = "px-4 sm:px-6 lg:px-8";

/** Swipe deck card width */
export const deckCardWidth =
  "w-full max-w-[340px] sm:max-w-md md:max-w-lg self-center";

/** Empty state description width */
export const emptyStateMaxWidth = "max-w-xs sm:max-w-sm md:max-w-md";

export type ContentWidthPreset = "md" | "lg" | "tab" | "chat" | "full";

export const contentMaxWidthByPreset: Record<ContentWidthPreset, string> = {
  md: contentMaxWidthMd,
  lg: contentMaxWidthLg,
  tab: contentMaxWidthTab,
  chat: contentMaxWidthChat,
  full: "w-full max-w-full self-center",
};

/** Breakpoints (px) for JS layout — keep in sync with global.css @theme */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;
