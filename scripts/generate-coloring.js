import fs from 'fs';
import path from 'path';

// Colab API URL
const COLAB_API_URL = process.env.COLAB_API_URL;

if (!COLAB_API_URL) {
  console.error('❌ Error: COLAB_API_URL environment variable is missing.');
  console.log('Ensure you populate the COLAB_API_URL secret in your GitHub repository secrets.');
  process.exit(1);
}

// Creative themes to feed the LLM for diversity, preventing repetitive concepts
const SUGGESTED_THEMES = [
  "宇宙飛行士のどうぶつ", "海の底のサンゴ礁と魚たち", "雲のうえでおやつを食べるユニコーン", "森の中のちいさな妖精とおうち",
  "魔法学校のネコのマジシャン", "お空を飛ぶかっこいいSL・きかんしゃ", "お花畑で遊ぶパタパタてんとう虫", "お城でお茶会をするプリンセスとテディベア",
  "恐竜たちののんびりピクニック", "お菓子の国のくるくるキャンディトレイン", "空飛ぶクジラとふしぎな風船", "美味しいクレープを作るコックのコアラ",
  "サファリパークの愉快な赤ちゃんライオン", "不思議の国のアリス風のうさぎの時計屋さん", "雪の世界ののんびりペンギン温泉"
];

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Fallback LLM Models on Hugging Face Serverless (direct endpoints, bypassing the router)
const LLM_MODELS = [
  "Qwen/Qwen2.5-7B-Instruct",
  "meta-llama/Meta-Llama-3-8B-Instruct",
  "meta-llama/Llama-3.2-3B-Instruct",
  "Qwen/Qwen2.5-72B-Instruct"
];

// Image generation model
const FLUX_MODEL = "black-forest-labs/FLUX.1-schnell";

// HF Router base URLs (api-inference.huggingface.co is deprecated and DNS-unresolvable)
const HF_LLM_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_IMAGE_URL = (model) => `https://router.huggingface.co/hf-inference/models/${model}`;

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest"
];

/**
 * Call Gemini API using native fetch with model fallback and retries
 */
async function callGemini(prompt) {
  for (let model of GEMINI_MODELS) {
    console.log(`🤖 Attempting generation via Gemini API (${model})...`);
    let retries = 2;
    while (retries >= 0) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{
                text: `You are a professional children's coloring page content creator and expert SEO content developer. You generate beautifully written educational materials in Japanese and optimized drawings instructions in English. Always respond with valid raw JSON only.\n\n${prompt}`
              }]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          // If it is 503 (temporary high demand) or 429 (rate limit), retry after a delay
          if ((response.status === 503 || response.status === 429) && retries > 0) {
            const waitMs = response.status === 429 ? 31000 : 3000;
            console.warn(`⚠️ Gemini model ${model} returned ${response.status}. Retrying in ${waitMs / 1000} seconds... (${retries} retries left)`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
          }
          throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error("No response candidates returned from Gemini API");
        }

        const content = data.candidates[0].content.parts[0].text;
        let jsonText = content.trim();
        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
        }
        return JSON.parse(jsonText);
      } catch (error) {
        console.warn(`⚠️ Gemini model ${model} attempt failed:`, error.message);
        const isRetryable = error.message.includes('503') || error.message.includes('429') || error.message.includes('fetch failed');
        if (retries > 0 && isRetryable) {
          const waitMs = error.message.includes('429') ? 31000 : 3000;
          console.log(`🔄 Retrying in ${waitMs / 1000} seconds...`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        break; // try next model
      }
    }
  }
  throw new Error("❌ All Gemini models and retries failed.");
}

/**
 * Call LLM model with fallback logic (Colab LLM)
 */
async function callLLM(prompt, retries = 3) {
  if (GEMINI_API_KEY) {
    try {
      return await callGemini(prompt);
    } catch (e) {
      console.warn('⚠️ Falling back to Colab LLM due to Gemini failure...');
    }
  }
  
  console.log(`🤖 Using Colab LLM...`);
  try {
    const response = await fetch(`${COLAB_API_URL}/generate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_prompt: "You are a professional children's coloring page content creator and expert SEO content developer. You generate beautifully written educational materials in Japanese and optimized drawings instructions in English. Always respond with valid raw JSON only, no markdown, no code blocks.",
        user_prompt: prompt
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.result;
    if (!content) {
      throw new Error("Invalid response format received from Colab");
    }
    
    // Robust JSON extraction
    let jsonText = content.trim();
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error(`❌ Colab LLM failed:`, error.message);
    throw new Error("❌ Fallback LLM failed on Colab API.");
  }
}

/**
 * Generate coloring page SVG via Gemini text API.
 * Since coloring pages are line art, SVG is the ideal format.
 * This uses the already-working Gemini text model - no image generation API needed!
 */
async function generateSVGViaGemini(drawingPrompt) {
  console.log(`🎨 Generating SVG coloring page via Gemini text API...`);
  console.log(`💡 Drawing description: "${drawingPrompt}"`);

  const svgPrompt = `Generate a children's coloring book SVG image based on this description:
"${drawingPrompt}"

STRICT REQUIREMENTS - Follow ALL of these exactly:
1. Output ONLY raw SVG code. No markdown, no code blocks, no explanation text. Start with <svg and end with </svg>.
2. Use viewBox="0 0 800 1000" for portrait orientation (3:4 ratio).
3. Use clean, thick black outlines: stroke="black" stroke-width="3" to "5".
4. All fills must be "white" or "none" - this is a COLORING page meant to be colored in by children.
5. Use simple, rounded shapes suitable for toddlers (circles, ellipses, rounded rectangles, simple paths).
6. NO shading, NO gradients, NO gray fills, NO complex patterns, NO cross-hatching.
7. Make the drawing cute, friendly, and appealing to young children (ages 2-6).
8. Include enough detail to be interesting but keep shapes large and simple enough for small hands to color.
9. Do NOT use <text> elements. Do NOT include any text in the image.
10. Keep the SVG clean and well-structured. Use groups <g> for logical parts.`;

  for (let model of GEMINI_MODELS) {
    console.log(`🤖 Trying Gemini model: ${model}...`);
    let retries = 2;
    while (retries >= 0) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: svgPrompt }] }]
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          if ((response.status === 503 || response.status === 429) && retries > 0) {
            const waitMs = response.status === 429 ? 31000 : 5000;
            console.warn(`⚠️ Gemini ${model} returned ${response.status}. Retrying in ${waitMs / 1000}s... (${retries} retries left)`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
          }
          throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error("No response candidates from Gemini");
        }

        let svgText = data.candidates[0].content.parts[0].text.trim();

        // Strip markdown code fences if present
        svgText = svgText.replace(/^```(?:svg|xml|html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

        // Extract just the SVG element
        const svgStart = svgText.indexOf('<svg');
        const svgEnd = svgText.lastIndexOf('</svg>');
        if (svgStart === -1 || svgEnd === -1) {
          throw new Error("Gemini response did not contain valid SVG markup");
        }
        svgText = svgText.substring(svgStart, svgEnd + 6);

        console.log(`✅ SVG generated successfully (${svgText.length} characters)`);
        return svgText;
      } catch (error) {
        console.warn(`⚠️ Gemini SVG generation (${model}) failed: ${error.message}`);
        const isRetryable = error.message.includes('503') || error.message.includes('429') || error.message.includes('fetch failed');
        if (retries > 0 && isRetryable) {
          const waitMs = error.message.includes('429') ? 31000 : 5000;
          console.log(`🔄 Retrying in ${waitMs / 1000}s...`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        break; // try next model
      }
    }
  }
  throw new Error("❌ All Gemini models failed for SVG generation.");
}

/**
 * Generate coloring page image with retry logic.
 * Primary: Gemini SVG (uses text API, most reliable)
 * Fallback: HF FLUX (if credits available)
 * Returns: { data: Buffer|string, type: 'svg'|'jpg' }
 */
async function generateColoringImage(prompt) {
  let retries = 2;
  while (retries >= 0) {
    // Strategy 1: Gemini SVG (primary - most reliable, uses text API)
    if (GEMINI_API_KEY) {
      try {
        const svgData = await generateSVGViaGemini(prompt);
        return { data: svgData, type: 'svg' };
      } catch (e) {
        console.warn(`⚠️ Gemini SVG generation failed: ${e.message}`);
      }
    }

    // Strategy 2: Colab Stable Diffusion (fallback)
    try {
      console.log(`🎨 Falling back to Colab Stable Diffusion...`);
      const response = await fetch(`${COLAB_API_URL}/generate/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: prompt, width: 512, height: 512 })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Colab SD HTTP ${response.status}: ${errText}`);
      }

      const resJson = await response.json();
      const base64Str = resJson.image_base64;
      if (base64Str) {
        return { data: Buffer.from(base64Str, 'base64'), type: 'jpg' };
      }
    } catch (error) {
      console.warn(`⚠️ Colab SD generation failed: ${error.message}`);
    }

    // Both strategies failed - retry after delay
    if (retries > 0) {
      console.log("🔄 All image generation methods failed. Retrying in 30 seconds...");
      retries--;
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      break;
    }
  }
  throw new Error("❌ All image generation methods exhausted after retries.");
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
    const imageResult = await generateColoringImage(generatedData.prompt);
    console.log(`✅ Coloring image generated successfully (type: ${imageResult.type}).`);

    // 4. Save Image to local directory
    const outputDir = path.join(process.cwd(), 'public', 'coloring-pages');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const imageExt = imageResult.type; // 'svg' or 'jpg'
    const imageFilename = `${slug}.${imageExt}`;
    const imagePathOnDisk = path.join(outputDir, imageFilename);

    if (imageResult.type === 'svg') {
      // SVG is text data
      fs.writeFileSync(imagePathOnDisk, imageResult.data, 'utf8');
    } else {
      // Raster image is a Buffer
      fs.writeFileSync(imagePathOnDisk, imageResult.data);
    }
    console.log(`💾 Saved coloring picture to disk at: ${imagePathOnDisk}`);

    // Update image path in JSON database
    generatedData.image = `/coloring-pages/${imageFilename}`;
    generatedData.imageType = imageExt;
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
