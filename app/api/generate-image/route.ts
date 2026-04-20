import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { storyTitle, genre, episodeTitle, content } = await req.json();

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 1단계: GPT로 본문을 안전한 장면 묘사로 변환
    const sceneRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You are a visual scene descriptor for webtoon illustrations.
Given a story excerpt, describe ONE specific visual scene in 2-3 sentences.
Rules:
- Focus on setting, character appearance, lighting, and emotion
- No violence, blood, weapons, or explicit content
- Use visual language only (colors, shapes, expressions, environment)
- Output in English only
- Keep it safe for image generation APIs`,
          },
          {
            role: "user",
            content: `Story: "${storyTitle}" (Genre: ${genre})
Episode: "${episodeTitle}"
Excerpt: ${(content ?? "").slice(0, 400)}

Describe the key visual scene:`,
          },
        ],
      }),
    });

    let sceneDescription = "";
    if (sceneRes.ok) {
      const sceneData = await sceneRes.json();
      sceneDescription = sceneData.choices?.[0]?.message?.content?.trim() ?? "";
    }

    // 장르별 폴백 (GPT 실패 시)
    const genreFallback: Record<string, string> = {
      "SF": "two characters in a futuristic space station, blue neon lighting, high-tech environment",
      "판타지": "a person in a magical glowing forest, mystical atmosphere, warm golden light",
      "로맨스": "two people in a cozy Seoul cafe at night, warm bokeh lights, emotional atmosphere",
      "일상": "a small Korean apartment room at night, warm lamp, quiet contemplative mood",
      "스릴러": "a person in a dimly lit urban setting, long shadows, tense cinematic composition",
      "미스터리": "a mysterious room with scattered papers, dim light, noir atmosphere",
      "드라마": "a person standing on a Seoul rooftop at sunset, city skyline, dramatic sky",
      "액션": "dynamic scene in an urban environment, motion blur, cinematic wide shot",
      "호러": "eerie empty corridor at night, single light source, unsettling atmosphere",
      "역사": "traditional Korean hanok architecture, historical period setting, soft daylight",
    };

    const firstGenre = (genre ?? "").split("/")[0];
    const fallback = genreFallback[firstGenre] ?? "two characters in a dramatic moment, cinematic scene";
    const finalScene = sceneDescription || fallback;

    // 2단계: DALL-E 3로 이미지 생성
    const imagePrompt = `Korean webtoon illustration, manhwa comic art style, professional panel quality.
${finalScene}
Art style: clean line art, vibrant colors, expressive character emotions, detailed background, dramatic lighting, cinematic composition.
No text, no speech bubbles, no watermark, safe for all audiences.`;

    const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
        style: "vivid",
      }),
    });

    if (!dalleRes.ok) {
      const err = await dalleRes.json();
      return NextResponse.json(
        { error: err.error?.message ?? "이미지 생성 실패" },
        { status: 500 }
      );
    }

    const dalleData = await dalleRes.json();
    const imageUrl = dalleData.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "이미지 URL을 받지 못했습니다." },
        { status: 500 }
      );
    }

    // 3단계: Cloudinary에 영구 저장
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ url: imageUrl, temporary: true });
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = "whatif-webtoon";
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHmac("sha1", apiSecret)
      .update(paramsToSign)
      .digest("hex");

    const formData = new URLSearchParams();
    formData.append("file", imageUrl);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", folder);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!cloudRes.ok) {
      return NextResponse.json({ url: imageUrl, temporary: true });
    }

    const cloudData = await cloudRes.json();
    return NextResponse.json({ url: cloudData.secure_url, temporary: false });

  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "서버 오류" },
      { status: 500 }
    );
  }
}
