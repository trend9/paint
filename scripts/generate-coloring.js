import fs from 'fs';
import path from 'path';

// Hugging Face authentication
const HF_TOKEN = process.env.HF_TOKEN;

if (!HF_TOKEN) {
  console.error('❌ Error: HF_TOKEN environment variable is missing.');
  console.log('Ensure you populate the HF_TOKEN secret in your GitHub repository secrets.');
  process.exit(1);
}

// Creative themes to feed the LLM for diversity, preventing repetitive concepts
const SUGGESTED_THEMES = [
  "宇宙飛行士のどうぶつ", "海の底のサンゴ礁と魚たち", "雲のうえでおやつを食べるユニコーン", "森の中のちいさな妖精とおうち",
  "魔法学校のネコのマジシャン", "お空を飛ぶかっこいいSL・きかんしゃ", "お花畑で遊ぶパタパタてんとう虫", "お城でお茶会をするプリンセスとテディベア",
  "恐竜たちののんびりピクニック", "お菓子の国のくるくるキャンディトレイン", "空飛ぶクジラとふしぎな風船", "美味しいクレープを作るコックのコアラ",
  "サファリパークの愉快な赤ちゃんライオン", "不思議の国のアリス風のうさぎの時計屋さん", "雪の世界ののんびりペンギン温泉"
];

// Fallback LLM Models on Hugging Face Serverless (via router.huggingface.co)
const LLM_MODELS = [
  "Qwen/Qwen2.5-72B-Instruct",
  "meta-llama/Llama-3.3-70B-Instruct",
  "meta-llama/Meta-Llama-3-8B-Instruct",
  "mistralai/Mistral-7B-Instruct-v0.3"
];

// Image generation model (via router.huggingface.co)
const FLUX_MODEL = "black-forest-labs/FLUX.1-schnell";

// HF Router base URLs (api-inference.huggingface.co is deprecated and DNS-unresolvable)
const HF_LLM_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_IMAGE_URL = (model) => `https://router.huggingface.co/hf-inference/models/${model}`;

/**
 * Call HF LLM model with fallback logic
 */
async function callLLM(prompt, retries = 3) {
  for (let model of LLM_MODELS) {
    console.log(`🤖 Using LLM model: ${model}...`);
    try {
      const response = await fetch(HF_LLM_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are a professional children's coloring page content creator and expert SEO content developer. You generate beautifully written educational materials in Japanese and optimized drawings instructions in English."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 3000,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Robust JSON extraction in case of markdown wrapping or extra commentary
      let jsonText = content.trim();
      const jsonStart = jsonText.indexOf('{');
      const jsonEnd = jsonText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      }
      return JSON.parse(jsonText);
    } catch (error) {
      console.warn(`⚠️ Model ${model} failed:`, error.message);
      if (error.cause) {
        console.warn(`   Cause:`, error.cause);
      }
      // Wait briefly before trying next model
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  throw new Error("❌ All fallback LLM models failed on Hugging Face inference API.");
}

/**
 * Generate binary image using FLUX.1-schnell
 */
async function generateColoringImage(prompt) {
  console.log(`🎨 Triggering image generation via ${FLUX_MODEL}...`);
  console.log(`💡 Image Prompt: "${prompt}"`);

  const response = await fetch(HF_IMAGE_URL(FLUX_MODEL), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: prompt
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`FLUX Generation failed with HTTP ${response.status}: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function run() {
  try {
    // 1. Pick a random base theme from the list for starting suggestion
    const randomSeedTheme = SUGGESTED_THEMES[Math.floor(Math.random() * SUGGESTED_THEMES.length)];
    console.log(`🌟 Selected seed theme: ${randomSeedTheme}`);

    // Build LLM Instruction
    const llmPrompt = `
Generate a new high-quality Japanese kids coloring page article, drawing instruction prompt, and metadata.
Return a STRICT JSON object with these keys. Do not include any standard markdown wrap around the JSON outside. Just return raw JSON.

Suggested Sub-theme: "${randomSeedTheme}"

Strict JSON Outline:
{
  "slug": "english-url-friendly-slug-lowercase",
  "title": "【日本語】子供心を惹きつけるキャッチーなぬりえのタイトル（例：海原をジャンプ！仲良しイルカさんのぬりえ）",
  "description": "【日本語】100〜120文字程度のぬりえの解説概要説明文",
  "category": "動物・生き物、ファンタジー、乗り物、スイーツ・食べ物、などから1つ適切に選択",
  "tags": ["タグ1", "タグ2", "タグ3", "タグ4"],
  "prompt": "Highly detailed premium English drawing prompt for FLUX.1-schnell text-to-image. MUST target a premium kids coloring booklet outline. For example: 'children coloring book sketch, clean thick outlines, bold black line-art, cute happy dinosaur playing under a sun, pure white background, no shading, no gray fills, zero gradients, thick borders, highly simplified for toddlers, SVG vector look, beautiful ink lines --ar 3:4'",
  "article": "【日本語】おもしろいストーリーや、ぬり方のコツ・お母様お父様へ贈る知育・知性発達の意味を含んだ、約600〜800文字程度のHTMLタグやMarkdownのH3、H4タグで構成された魅力的な記事本文",
  "seo": {
    "h1": "【日本語】SEOキーワードを含んだ見出しH1（例：【無料ダウンロード】イルカと海の簡単かわいいぬりえ用イラスト（子供・幼児向け）",
    "metaDescription": "【日本語】Google検索に評価され、クリック率が上がる120文字のメタディスクリプション",
    "keywords": ["ぬりえ 無料", "子供 ぬりえ", "かんたん ぬりえ", "【キーワードテーマ】"]
  }
}

Important details:
- The generated English 'prompt' must explicitly contain descriptions emphasizing thick, crisp black outlines, pure block-white segments, bold borders, toddler-friendly shapes, and absolutely no complex cross-hatching, gray backgrounds, or shadows. This is critical to guarantee a perfect printable blank coloring layout!
- Ensure the article is written in friendly, gentle Japanese (with appropriate furigana/hiragana mix for child-friendly style if naming animals, but detailed explanation for parents in H4).
- Make sure 'slug' is a unique English lowercase string (e.g., 'koala-baker-cake').
`;

    // Initialize content
    const generatedData = await callLLM(llmPrompt);
    console.log(`✅ LLM Content successfully generated for: "${generatedData.title}"`);

    // 2. Adjust slug to be safe and verify uniqueness
    const slug = (generatedData.slug || 'coloring-page-' + Date.now()).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    generatedData.slug = slug;

    // 3. Generate Image
    const imageBuffer = await generateColoringImage(generatedData.prompt);
    console.log(`✅ Coloring Image downloaded successfully.`);

    // 4. Save Image to local directory
    const outputDir = path.join(process.cwd(), 'public', 'coloring-pages');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const imageFilename = `${slug}.jpg`;
    const imagePathOnDisk = path.join(outputDir, imageFilename);
    fs.writeFileSync(imagePathOnDisk, imageBuffer);
    console.log(`💾 Saved coloring picture to disk at: ${imagePathOnDisk}`);

    // Update image path in JSON database
    generatedData.image = `/coloring-pages/${imageFilename}`;
    generatedData.imageType = 'jpg';
    generatedData.createdAt = new Date().toISOString();

    // 5. Read/Write to JSON database
    const dbPath = path.join(process.cwd(), 'src', 'data', 'coloring-pages.json');
    let dbContent = [];
    if (fs.existsSync(dbPath)) {
      try {
        dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      } catch (e) {
        console.warn(`⚠️ Failed to parse existing database, starting from blank list.`, e);
      }
    }

    // Set new ID
    const nextId = String(dbContent.length > 0 ? Math.max(...dbContent.map(x => parseInt(x.id || '0'))) + 1 : 1);
    generatedData.id = nextId;

    // Insert to the front so new articles appear at the top of the feed!
    dbContent.unshift(generatedData);

    // Save back to JSON DB
    fs.writeFileSync(dbPath, JSON.stringify(dbContent, null, 2), 'utf8');
    console.log(`🎉 Database successfully updated! Added item ID: ${nextId}, Slug: ${slug}`);

  } catch (error) {
    console.error(`❌ Critical error during automation pipeline execution:`, error);
    process.exit(1);
  }
}

run();
