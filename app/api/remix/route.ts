import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storyTitle, previousEpisodes, currentEpisode, direction } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 없습니다" }, { status: 500 });
    }

    const isNewStory = !currentEpisode && !previousEpisodes;

    const systemPrompt = `너는 한국 웹소설 전문 작가다.
독자를 첫 문장부터 끌어당기는 강렬한 오프닝을 쓴다.
문장은 짧고 리듬감 있게. 대화와 행동 중심으로 전개한다.
감정은 직접 서술하지 않고 행동과 대사로 보여준다.
마크다운 금지. 제목 금지. 순수 본문만 작성한다.`;

    const userPrompt = isNewStory
      ? `작품명: "${storyTitle}"

아래 가이드를 바탕으로 1화를 작성해줘.

${direction}

조건:
- 첫 문장이 독자를 즉시 끌어당겨야 함
- 등장인물이 가이드에 있으면 반드시 등장시킬 것
- 배경과 분위기를 자연스럽게 녹여낼 것
- 작가 스타일이 있으면 그 문체를 철저히 따를 것
- 분량: 800~1200자
- 마지막은 다음 화가 궁금하게 끝낼 것
- 제목 없이 본문만`
      : `작품명: "${storyTitle}"

이전 화 내용:
${previousEpisodes}

현재 화 원본:
${currentEpisode}

리믹스 방향: ${direction}

위 방향으로 현재 화를 완전히 새롭게 작성해줘.
조건:
- 이전 화 흐름과 등장인물 유지
- 리믹스 방향을 반영해서 원본과 다른 전개
- 분량: 800~1200자
- 제목 없이 본문만`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.85,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const content = data.choices?.[0]?.message?.content || "";
    if (!content) {
      return NextResponse.json({ error: "생성된 내용이 없습니다" }, { status: 500 });
    }

    // content 와 text 둘 다 반환 (프론트 호환성)
    return NextResponse.json({ content, text: content });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
