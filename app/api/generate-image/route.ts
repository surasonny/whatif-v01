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

    // 본문에서 핵심 장면 추출 (앞 500자)
    const excerpt = (content ?? "").slice(0, 500).trim();

    // 장르별 스타일 힌트
    const genreStyle: Record<string, string> = {
      "SF": "futuristic sci-fi setting, space station or high-tech environment, cool blue tones",
      "판타지": "fantasy world, magical atmosphere, mystical forest or ancient ruins, warm golden tones",
      "로맨스": "romantic urban setting, Seoul cityscape, soft warm lighting, emotional close-up",
      "일상": "everyday Korean life, apartment or convenience store, realistic warm tones, slice of life",
      "드라마": "dramatic Korean drama scene, intense emotions, cinematic lighting",
      "스릴러": "dark thriller atmosphere, shadows and tension, cold desaturated tones",
    };

    const styleHint = genreStyle[genre ?? ""] ?? "cinematic Korean webtoon scene";

    const imagePrompt = `Korean webtoon illustration style, manhwa art, clean line art, professional comic book quality.

Scene context: "${excerpt}"

Story: "${storyTitle}", Genre: ${genre}
Episode: "${episodeTitle}"

Visual style: ${styleHint}
Requirements: webtoon panel composition, expressive character emotions, detailed background, dramatic lighting effect, no text overlay, no speech bubbles, no watermark.`;

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

    // Cloudinary에 영구 저장
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
