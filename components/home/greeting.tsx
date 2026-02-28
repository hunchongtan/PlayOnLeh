"use client";

import { useEffect, useMemo, useState } from "react";

function getGreetingForHour(hour: number) {
  if (hour < 12) return "Good morning, Guest";
  if (hour < 18) return "Good afternoon, Guest";
  return "Good evening, Guest";
}

export function Greeting() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = useMemo(() => getGreetingForHour(now.getHours()), [now]);

  return <p className="pt-5 text-2xl font-semibold leading-snug text-white/85 sm:pt-7 sm:text-3xl">{greeting}</p>;
}
