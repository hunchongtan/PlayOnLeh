"use client";

export const ONLINE_SOURCES_PREF_KEY = "playonleh.useOnlineSources";

export function readOnlineSourcesPreference() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ONLINE_SOURCES_PREF_KEY) === "true";
}

export function writeOnlineSourcesPreference(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONLINE_SOURCES_PREF_KEY, enabled ? "true" : "false");
}
