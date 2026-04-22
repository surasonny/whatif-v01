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
    const isEdit = currentEpisode && previousEpisodes === "";
    const isContinue = currentEpisode === "위 내용에 이어서 작성";

    const systemPrompt = `너는 한국 웹소설 전문 작가다. 아래 규칙을 절대 어겨서는 안 된다.

[절대 금지]
- 감정을 직접 서술하지 마라. ("그는 두려움을 느꼈다" → 금지)
- 철학적 질문으로 끝내지 마라. ("그는 무엇을 선택할 것인가?" → 금지)
- 설명형 대사 금지. ("나는 모든 것을 통제하는 자야" → 금지)
- 마크다운 금지. 제목 금지. 순수 본문만.

[반드시 지켜야 할 것]
- 감정은 행동과 대사로만 보여줘.
- 문장은 짧고 리듬감 있게.
- 대화는 자연스럽고 간결하게.
- 마지막 문장은 독자가 다음을 궁금하게 만들어야 한다.
- 작가 스타일이 지정되면 그 스타일을 철저히 따라라.
- 등장인물 특징이 지정되면 대사와 행동에 반드시 반영해라.`;

    let userPrompt = "";

    if (isNewStory) {
      userPrompt = `작품명: "${storyTitle}"

아래 가이드를 반드시 따라서 1화를 작성해줘.
가이드에 적힌 내용은 반드시 글에 포함되어야 한다.

=== 가이드 (반드시 따를 것) ===
${direction}
=== 가이드 끝 ===

[작성 규칙]
1. 가이드의 등장인물이 있으면 반드시 등장시키고, 성격과 특징을 대사/행동으로 보여줄 것
2. 가이드의 "이번 화에서 일어날 일"을 줄거리의 뼈대로 삼을 것
3. 가이드의 세계관/배경을 자연스럽게 녹여낼 것
4. 가이드의 작가 스타일을 문체에 반드시 반영할 것
5. 첫 문장이 독자를 즉시 끌어당겨야 함
6. 감정은 행동과 대사로만 보여줄 것. 직접 서술 금지
7. 분량: 800~1200자
8. 마지막은 다음 화가 궁금하게 끝낼 것
9. 제목 없이 본문만`;

    } else if (isEdit) {
      userPrompt = `아래 글을 편집해줘.

[원본]
${currentEpisode}

[편집 방향]
${direction}

중요:
- 스토리, 등장인물, 사건 순서를 절대 바꾸지 마라
- 같은 장면을 다른 문체로 다듬는 것만 허용
- 분량은 원본과 비슷하게 유지
- 원본에 없는 새로운 사건이나 대사를 추가하지 마라`;

    } else if (isContinue) {
      userPrompt = `작품명: "${storyTitle}"

[이전 내용 — 반드시 이 문체와 톤을 유지할 것]
${previousEpisodes}

위 내용에 이어서 다음 장면을 써줘.

[이어쓰기 방향 — 반드시 따를 것]
${direction}

[작성 규칙]
1. 이전 내용의 문체, 호흡, 대사 스타일을 반드시 유지할 것
2. 같은 등장인물의 말투와 성격을 유지할 것
3. 이어쓰기 방향에 적힌 내용을 반드시 포함할 것
4. 분량: 400~700자
5. 자연스럽게 이어지는 한 장면으로`;

    } else {
      userPrompt = `작품명: "${storyTitle}"

[이전 화 내용]
${previousEpisodes}

[현재 화 원본]
${currentEpisode}

[리믹스 방향]
${direction}

위 방향으로 현재 화를 완전히 새롭게 작성해줘.
- 이전 화 흐름과 등장인물 유지
- 분량: 800~1200자`;
    }

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
        temperature: 0.8,
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

    return NextResponse.json({ content, text: content });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
