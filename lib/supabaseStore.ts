import { supabase } from "./supabase";
import { Story, Comment, AppState } from "./types";

// ─────────────────────────────────────────
// 전체 앱 상태 로드 (Supabase에서)
// ─────────────────────────────────────────
export async function loadStateFromSupabase(): Promise<AppState | null> {
  try {
    const { data: stories, error: storiesError } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: true });

    if (storiesError) throw storiesError;
    if (!stories || stories.length === 0) return null;

    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: true });

    if (commentsError) throw commentsError;

    const mappedStories: Story[] = stories.map((s: any) => ({
      id: s.id,
      title: s.title,
      genre: s.genre,
      author: s.author,
      hook: s.hook,
      coverColor: s.cover_color,
      coverImageUrl: s.cover_image_url,
      seedVersion: s.seed_version,
      universes: s.universes,
      mainHistory: s.main_history,
    }));

    const mappedComments: Comment[] = (comments || []).map((c: any) => ({
      id: c.id,
      storyId: c.story_id,
      universeId: c.universe_id,
      episodeIndex: c.episode_index,
      author: c.author,
      content: c.content,
      likes: c.likes,
      dislikes: c.dislikes,
      createdAt: c.created_at,
    }));

    return {
      dataVersion: 9,
      stories: mappedStories,
      comments: mappedComments,
    };
  } catch (e) {
    console.error("Supabase loadState 실패:", e);
    return null;
  }
}

// ─────────────────────────────────────────
// 작품 저장/업데이트
// ─────────────────────────────────────────
export async function saveStoryToSupabase(story: Story): Promise<void> {
  try {
    await supabase.from("stories").upsert({
      id: story.id,
      title: story.title,
      genre: story.genre,
      author: story.author,
      hook: story.hook,
      cover_color: story.coverColor,
      cover_image_url: story.coverImageUrl ?? null,
      seed_version: story.seedVersion,
      universes: story.universes,
      main_history: story.mainHistory ?? [],
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Supabase saveStory 실패:", e);
  }
}

// ─────────────────────────────────────────
// 작품 삭제
// ─────────────────────────────────────────
export async function deleteStoryFromSupabase(storyId: string): Promise<void> {
  try {
    await supabase.from("stories").delete().eq("id", storyId);
  } catch (e) {
    console.error("Supabase deleteStory 실패:", e);
  }
}

// ─────────────────────────────────────────
// 댓글 저장
// ─────────────────────────────────────────
export async function saveCommentToSupabase(comment: Comment): Promise<void> {
  try {
    await supabase.from("comments").upsert({
      id: comment.id,
      story_id: comment.storyId,
      universe_id: comment.universeId,
      episode_index: comment.episodeIndex,
      author: comment.author,
      content: comment.content,
      likes: comment.likes,
      dislikes: comment.dislikes,
      created_at: comment.createdAt,
    });
  } catch (e) {
    console.error("Supabase saveComment 실패:", e);
  }
}

// ─────────────────────────────────────────
// 투표 불러오기 (story 전체)
// ─────────────────────────────────────────
export async function fetchVotesForStory(
  storyId: string
): Promise<Array<{ universeId: string; nickname: string }>> {
  try {
    const { data, error } = await supabase
      .from("votes")
      .select("universe_id, nickname")
      .eq("story_id", storyId);
    if (error) throw error;
    return (data || []).map((r: any) => ({
      universeId: r.universe_id,
      nickname: r.nickname,
    }));
  } catch (e) {
    console.error("Supabase fetchVotes 실패:", e);
    return [];
  }
}

// ─────────────────────────────────────────
// 투표 저장
// ─────────────────────────────────────────
export async function insertVoteToSupabase(
  storyId: string,
  episodeIndex: number,
  universeId: string,
  nickname: string
): Promise<{ ok: boolean; duplicate: boolean }> {
  try {
    const { error } = await supabase.from("votes").insert({
      story_id: storyId,
      episode: episodeIndex,
      universe_id: universeId,
      nickname,
    });
    if (error) {
      if (error.code === "23505") return { ok: false, duplicate: true };
      throw error;
    }
    return { ok: true, duplicate: false };
  } catch (e) {
    console.error("Supabase insertVote 실패:", e);
    return { ok: false, duplicate: false };
  }
}

// ─────────────────────────────────────────
// seed 작품들을 Supabase에 업로드
// (최초 1회 또는 버전 업 시)
// ─────────────────────────────────────────
export async function seedSupabaseIfEmpty(stories: Story[]): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("stories")
      .select("id")
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0) return; // 이미 데이터 있음

    // seed 데이터 업로드
    for (const story of stories) {
      await saveStoryToSupabase(story);
    }
    console.log("Supabase seed 완료");
  } catch (e) {
    console.error("Supabase seed 실패:", e);
  }
}
