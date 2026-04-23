"use client";

import { useEffect, useState } from "react";

interface Props {
  x: number;
  y: number;
  onDone: () => void;
}

export default function LikeFloating({ x, y, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed z-50 pointer-events-none font-bold text-amber-400 text-sm"
      style={{
        left: x - 20,
        top: y - 10,
        transform: visible ? "translateY(-30px)" : "translateY(-60px)",
        opacity: visible ? 1 : 0,
        transition: "all 0.8s ease-out",
      }}
    >
      +1 ⚔
    </div>
  );
}
