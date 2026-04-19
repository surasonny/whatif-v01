import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// 안전하지 않은 표현을 프롬프트에서 제거
function sanitizeForImage(text: string): string {
  return text
    .replace(/위협|협박|폭력|살인|죽|피|잔혹|공포|납치|폭행|칼|총|무기|범죄|악당/g, "")
    .replace(/위험한|잔인한|무서운|끔찍한/g, "긴장된")
    .slice(0, 200)
    .trim();
}

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

    // 장르별 시각적 스타일 (본문 내용 대신 장르로 분위기 결정)
    const genreVisual: Record<string, string> = {
      "SF": "two people in a futuristic space station corridor, cool blue neon lighting, high-tech panels on walls, tense atmosphere",
      "판타지": "a person standing in a magical glowing forest at night, mystical fireflies, ancient stone ruins, golden warm light",
      "로맨스": "two people in a Seoul cafe at night, warm street lights through window, emotional moment, soft bokeh background",
      "일상": "interior of a small Korean apartment room at night, warm lamp light, simple furniture, quiet contemplative mood",
      "드라마": "a person standing alone on a Seoul rooftop at sunset, city skyline in background, dramatic sky, emotional silhouette",
      "스릴러": "a dimly lit urban alley at night, long shadows, mysterious figure in distance, tense cinematic composition",
      "미스터리": "a mysterious room with scattered documents and dim light, noir atmosphere, dust particles in light beam",
    };

    const safeTitle = sanitizeForImage(storyTitle ?? "");
    const visualScene = genreVisual[genre ?? ""] ??
      "two characters in a dramatic moment, cinematic Korean webtoon scene, detailed urban background";

    const imagePrompt = `Korean webtoon illustration, manhwa art style, professional comic panel.
Scene: ${visualScene}.
Story mood from "${safeTitle}".
Style: clean line art, vibrant colors, expressive faces, detailed background, dramatic lighting, no text, no speech bubbles, no watermark, safe for all audiences.`;

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
