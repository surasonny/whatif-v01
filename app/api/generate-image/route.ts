import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { prompt, storyTitle, genre, episodeTitle, content } = await req.json();

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    // 웹툰 스타일 프롬프트 생성
    const koreanContext = `
Story: "${storyTitle}" (Genre: ${genre})
Episode: "${episodeTitle}"
Content summary: ${content?.slice(0, 300) ?? prompt ?? ""}
    `.trim();

    const imagePrompt = `Webtoon style illustration, Korean manhwa art style, clean line art, vibrant colors, cinematic composition.
Scene from: ${koreanContext}
Style requirements: webtoon panel, expressive characters, detailed background, dramatic lighting, no text, no speech bubbles.`;

    // DALL-E 3 호출
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
      return NextResponse.json({ error: "이미지 URL을 받지 못했습니다." }, { status: 500 });
    }

    // Cloudinary에 저장 (OpenAI URL은 1시간 후 만료되므로)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      // Cloudinary 없으면 임시 URL 그대로 반환
      return NextResponse.json({ url: imageUrl, temporary: true });
    }

    // Cloudinary upload via URL
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
      {
        method: "POST",
        body: formData,
      }
    );

    if (!cloudRes.ok) {
      // Cloudinary 저장 실패해도 임시 URL 반환
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
