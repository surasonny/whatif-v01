import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storyTitle, previousEpisodes, currentEpisode, direction } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 없습니다" }, { status: 500 });
    }

    const prompt = `너는 웹소설 작가다. 아래는 "${storyTitle}"이라는 작품의 내용이다.

## 이전 화 내용
${previousEpisodes}

## 현재 화 원본
${currentEpisode}

## 리믹스 방향
사용자가 원하는 새로운 방향: "${direction}"

## 요청
위 리믹스 방향을 바탕으로 현재 화를 완전히 새롭게 작성해줘.
조건:
- 웹소설 스타일로 자연스럽게
- 이전 화의 흐름과 등장인물을 유지
- 리믹스 방향을 반영해서 원본과 다른 전개
- 분량은 500~800자 내외
- 제목 없이 본문만 작성
- 마크다운 없이 순수 텍스트만`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1024,
        temperature: 0.9,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.choices?.[0]?.message?.content || "";
    if (!text) {
      return NextResponse.json({ error: "생성된 내용이 없습니다" }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}