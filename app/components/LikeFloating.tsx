"use client";

import { useEffect, useState } from "react";

interface Props {
  x: number;
  y: number;
  id: number;
}

export default function LikeFloating({ x, y }: Props) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed z-50 pointer-events-none select-none font-bold text-orange-400 text-sm"
      style={{
        left: x - 15,
        top: y - 10,
        transform: gone ? "translateY(-40px)" : "translateY(0px)",
        opacity: gone ? 0 : 1,
        transition: "transform 1s ease-out, opacity 1s ease-out",
      }}
    >
      +1 ⚔
    </div>
  );
}
