"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useBrowserTime() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
