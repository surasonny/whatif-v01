"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Story } from "@/lib/types";

interface Transfer {
  story_id: string;
  from_universe_id: string;
  to_universe_id: string;
  transferred_at: string;
}

interface Props {
  stories: Story[];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function EventFeed({ stories }: Props) {
  const [events, setEvents] = useState<Transfer[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    supabase
      .from("main_transfers")
      .select("story_id, from_universe_id, to_universe_id, transferred_at")
      .order("transferred_at", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setEvents(data as Transfer[]); });
  }, []);

  if (events.length === 0) return null;

  const storyMap = new Map(stories.map((s) => [s.id, s]));

  return (
    <div className="mx-4 mb-1 rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2"
      >
        <span className="text-xs font-semibold" style={{ color: "rgba(251,191,36,0.7)" }}>
          ⚔ 최근 정사 교체
        </span>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="flex flex-col divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {events.map((ev, i) => {
            const story = storyMap.get(ev.story_id);
            const title = story?.title ?? "알 수 없는 작품";
            const fromLabel = story?.universes.find((u) => u.id === ev.from_universe_id)?.label ?? ev.from_universe_id.slice(0, 6);
            const toLabel   = story?.universes.find((u) => u.id === ev.to_universe_id)?.label   ?? ev.to_universe_id.slice(0, 6);
            return (
              <div key={i} className="flex items-center justify-between px-3 py-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {title}
                  </span>
                  <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {fromLabel} <span style={{ color: "rgba(251,191,36,0.5)" }}>→</span> {toLabel}
                  </span>
                </div>
                <span className="text-xs ml-3 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {relativeTime(ev.transferred_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
