import { NextRequest, NextResponse } from "next/server";

// 이전 화에서 캐릭터 말투/성격 자동 추출
function extractCharacterVoices(previousEpisodes: string): string {
  if (!previousEpisodes || previousEpisodes.length < 100) return "";

  // 대사 패턴 추출 (따옴표 안 내용)
  const dialogues = previousEpisodes.match(/["「『](.*?)["」』]/g) || [];
  if (dialogues.length === 0) return "";

  return `[이전 화에서 추출한 대사 패턴 — 반드시 이 말투를 유지할 것]
${dialogues.slice(0, 6).join("\n")}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storyTitle, previousEpisodes, currentEpisode, direction } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 없습니다" }, { status: 500 });
    }

    const isNewStory = !currentEpisode && !previousEpisodes;
    const isEdit = currentEpisode && previousEpisodes === "";
    const isContinue = currentEpisode === "위 내용에 이어서 작성";

    const characterVoices = extractCharacterVoices(previousEpisodes || "");

    const systemPrompt = `너는 한국 웹소설 전문 작가다. 아래 규칙을 절대 어겨서는 안 된다.

[절대 금지]
- 감정을 직접 서술하지 마라 ("그는 두려움을 느꼈다" → 금지)
- 철학적 질문으로 끝내지 마라
- 설명형 대사 금지 ("나는 모든 것을 통제하는 자야" → 금지)
- 단순 요약형 전개 금지
- 반복 표현 금지
- 마크다운 금지. 제목 금지. 순수 본문만.

[반드시 지켜야 할 것]
- 첫 3문장 안에 사건이 발생해야 한다
- 대사 비율 최소 50%
- 문장은 짧고 리듬감 있게
- 대화는 자연스럽고 간결하게
- 마지막 문장은 반드시 클리프행어로 끝낼 것
- 캐릭터 말투와 성격을 대사에 반영할 것`;

    // ─────────────────────────────────────────
    // 편집 모드 (단일 호출)
    // ─────────────────────────────────────────
    if (isEdit) {
      const editMap: Record<string, string> = {
        "풍성하게": "스토리와 등장인물을 절대 바꾸지 말고, 묘사와 감정 표현을 더 풍성하고 생생하게 다듬어줘.",
        "간결하게": "스토리와 등장인물을 절대 바꾸지 말고, 불필요한 부분을 제거해서 더 간결하고 임팩트 있게 다듬어줘.",
        "긴장감 있게": "스토리와 등장인물을 절대 바꾸지 말고, 긴장감과 속도감을 높여줘. 문장을 더 짧고 강렬하게.",
        "감성적으로": "스토리와 등장인물을 절대 바꾸지 말고, 감정 묘사를 더 섬세하고 감성적으로 다듬어줘.",
      };
      const editDirection = editMap[direction] || direction;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `아래 글을 편집해줘.\n\n[원본]\n${currentEpisode}\n\n[편집 방향]\n${editDirection}\n\n중요: 스토리, 등장인물, 사건 순서를 절대 바꾸지 마라. 분량은 원본과 비슷하게 유지.` },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
      const content = data.choices?.[0]?.message?.content || "";
      return NextResponse.json({ content, text: content, step: "complete" });
    }

    // ─────────────────────────────────────────
    // 1단계: 스토리 설계
    // ─────────────────────────────────────────
    const designPrompt = isNewStory
      ? `작품명: "${storyTitle}"\n\n가이드:\n${direction}\n\n위 정보를 바탕으로 1화 설계를 JSON으로 출력해줘.`
      : isContinue
      ? `작품명: "${storyTitle}"\n\n이전 내용:\n${previousEpisodes?.slice(-500)}\n\n이어쓰기 방향: ${direction}\n\n다음 장면 설계를 JSON으로 출력해줘.`
      : `작품명: "${storyTitle}"\n\n이전 화:\n${previousEpisodes?.slice(-500)}\n\n리믹스 방향: ${direction}\n\n이 화 설계를 JSON으로 출력해줘.`;

    const designRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `너는 웹소설 플롯 설계자다. 아래 JSON 형식으로만 응답해라. 다른 텍스트 없이 JSON만.
{
  "situation": "현재 상황 한 줄",
  "characters": "등장인물과 현재 상태",
  "conflict": "이 장면의 핵심 갈등",
  "direction": "전개 방향",
  "cliffhanger": "마지막 클리프행어 아이디어"
}`
          },
          { role: "user", content: designPrompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    const designData = await designRes.json();
    let design = { situation: "", characters: "", conflict: "", direction: "", cliffhanger: "" };
    try {
      const designText = designData.choices?.[0]?.message?.content || "{}";
      const cleaned = designText.replace(/```json|```/g, "").trim();
      design = JSON.parse(cleaned);
    } catch {
      design.direction = direction;
    }

    // ─────────────────────────────────────────
    // 2단계: 1차 생성
    // ─────────────────────────────────────────
    const draftContext = isNewStory
      ? `작품명: "${storyTitle}"\n\n가이드:\n${direction}`
      : isContinue
      ? `작품명: "${storyTitle}"\n\n[이전 내용 — 이 문체를 반드시 유지]\n${previousEpisodes}`
      : `작품명: "${storyTitle}"\n\n[이전 화]\n${previousEpisodes}\n\n[현재 화 원본]\n${currentEpisode}`;

    const draftUserPrompt = `${draftContext}

${characterVoices}

[설계 결과 — 반드시 따를 것]
상황: ${design.situation}
등장인물: ${design.characters}
갈등: ${design.conflict}
전개: ${design.direction}
클리프행어: ${design.cliffhanger}

[작성 규칙]
- 첫 3문장 안에 사건 발생
- 대사 비율 최소 50%
- 분량: ${isContinue ? "400~600자" : "800~1200자"}
- 마지막 문장: 클리프행어
- 제목 없이 본문만`;

    const draftRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: draftUserPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.85,
      }),
    });

    const draftData = await draftRes.json();
    if (draftData.error) return NextResponse.json({ error: draftData.error.message }, { status: 500 });
    const draft = draftData.choices?.[0]?.message?.content || "";
    if (!draft) return NextResponse.json({ error: "초안 생성 실패" }, { status: 500 });

    // ─────────────────────────────────────────
    // 3단계: 리라이팅
    // ─────────────────────────────────────────
    const rewriteRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `너는 한국 웹소설 편집자다. 주어진 초안을 아래 규칙으로 다듬어라.

[수정 규칙]
1. 불필요한 설명 제거 — 행동과 대사로 보여줄 것
2. 문장 압축 — 긴 문장을 짧게
3. 대사 강화 — 캐릭터 개성이 드러나게
4. 긴장감 추가 — 호흡을 빠르게
5. 마지막 문장 클리프행어 강화 — 독자가 다음을 반드시 읽고 싶게

[절대 금지]
- 스토리 변경 금지
- 등장인물 변경 금지
- 사건 순서 변경 금지
- 새로운 내용 추가 금지
- 마크다운 금지. 제목 금지. 본문만.`
          },
          {
            role: "user",
            content: `아래 초안을 리라이팅해줘.\n\n[클리프행어 아이디어]\n${design.cliffhanger}\n\n[초안]\n${draft}`
          },
        ],
        max_tokens: 2000,
        temperature: 0.75,
      }),
    });

    const rewriteData = await rewriteRes.json();
    if (rewriteData.error) {
      // 리라이팅 실패 시 초안 그대로 반환
      return NextResponse.json({ content: draft, text: draft, step: "draft" });
    }

    const content = rewriteData.choices?.[0]?.message?.content || draft;
    return NextResponse.json({ content, text: content, step: "complete" });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
