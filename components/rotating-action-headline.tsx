"use client";

import { useEffect, useState } from "react";

const actions = ["sent.", "bought.", "booked.", "pushed.", "scheduled.", "changed."];

export function RotatingActionHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % actions.length);
    }, 1200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <h1 aria-label="Track what your AI agents did.">
      Track what your AI agents
      <br />
      <em className="rotating-action" key={actions[index]} aria-hidden="true">{actions[index]}</em>
    </h1>
  );
}
