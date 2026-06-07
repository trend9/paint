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
 * Call LLM model with fallback logic (direct HF models)
 */
async function callLLM(prompt, retries = 3) {
  if (GEMINI_API_KEY) {
    try {
      return await callGemini(prompt);
    } catch (e) {
      console.warn('⚠️ Falling back to Hugging Face models due to Gemini failure...');
    }
  }
  for (let model of LLM_MODELS) {
    console.log(`🤖 Using HF LLM model: ${model}...`);
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
              content: "You are a professional children's coloring page content creator and expert SEO content developer. You generate beautifully written educational materials in Japanese and optimized drawings instructions in English. Always respond with valid raw JSON only, no markdown, no code blocks."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 3000
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices ? data.choices[0].message.content : null;
      if (!content) {
        throw new Error("Invalid response format received from Hugging Face");
      }
      
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

const AI_HORDE_API_KEY = process.env.AI_HORDE_API_KEY;

/**
 * Generate image using AI Horde API
 */
async function generateImageViaHorde(prompt) {
  const apiKey = AI_HORDE_API_KEY || "0000000000";
  console.log(`🎨 Triggering image generation via AI Horde (using key: ${apiKey === "0000000000" ? "anonymous" : "provided"})...`);
  console.log(`💡 Image Prompt: "${prompt}"`);

  const response = await fetch('https://aihorde.net/api/v2/generate/async', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Client-Agent': 'coloring-page-generator:1.0.0:github-actions@users.noreply.github.com'
    },
    body: JSON.stringify({
      prompt: prompt,
      models: ["Flux.1-Schnell fp8 (Compact)", "FLUX.1-schnell", "flux"],
      params: {
        width: 768,
        height: 1024,
        steps: 4,
        n: 1
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Horde job submission failed with HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const jobId = data.id;
  console.log(`Job submitted successfully. Job ID: ${jobId}. Polling for completion...`);

  let done = false;
  let attempts = 0;
  // Limit to 60 attempts for anonymous queue, 30 for registered
  const maxAttempts = apiKey === "0000000000" ? 60 : 30;
  while (!done && attempts < maxAttempts) {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const checkRes = await fetch(`https://aihorde.net/api/v2/generate/check/${jobId}`);
    if (!checkRes.ok) {
      console.warn(`⚠️ Failed to check job status (HTTP ${checkRes.status}). Retrying...`);
      continue;
    }
    
    const checkData = await checkRes.json();
    console.log(`   [Horde Status] done: ${checkData.done}, wait time: ${checkData.wait_time}s, queue position: ${checkData.queue_position}`);
    
    if (checkData.done) {
      done = true;
      break;
    }
  }

  if (!done) {
    throw new Error(`AI Horde job timed out after ${maxAttempts * 5} seconds.`);
  }

  console.log("Job completed! Retrieving image data...");
  const statusRes = await fetch(`https://aihorde.net/api/v2/generate/status/${jobId}`);
  if (!statusRes.ok) {
    throw new Error(`Failed to retrieve results from AI Horde (HTTP ${statusRes.status})`);
  }

  const statusData = await statusRes.json();
  if (!statusData.generations || statusData.generations.length === 0) {
    throw new Error("AI Horde returned no generated images.");
  }

  const imgData = statusData.generations[0].img;
  if (imgData.startsWith('http')) {
    const imgRes = await fetch(imgData);
    if (!imgRes.ok) throw new Error(`Failed to download image from Horde URL: ${imgRes.status}`);
    const arrayBuffer = await imgRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else {
    return Buffer.from(imgData, 'base64');
  }
}

/**
 * Generate binary image using FLUX.1-schnell (via HF or AI Horde fallback) with retries
 */
async function generateColoringImage(prompt) {
  let retries = 2;
  while (retries >= 0) {
    try {
      // If AI Horde API key is explicitly configured, prefer AI Horde first
      if (AI_HORDE_API_KEY) {
        try {
          return await generateImageViaHorde(prompt);
        } catch (e) {
          console.warn(`⚠️ AI Horde generation failed: ${e.message}. Falling back to Hugging Face...`);
        }
      }

      // Otherwise try Hugging Face FLUX
      try {
        console.log(`🎨 Triggering image generation via HF ${FLUX_MODEL}...`);
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
          throw new Error(`HF FLUX Generation failed with HTTP ${response.status}: ${errText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        console.warn(`⚠️ HF FLUX generation failed: ${error.message}`);
        // If AI Horde key was NOT configured, try it as a final fallback
        if (!AI_HORDE_API_KEY) {
          console.log("🔄 Attempting final fallback via AI Horde (anonymous)...");
          return await generateImageViaHorde(prompt);
        }
        throw error;
      }
    } catch (finalError) {
      console.warn(`⚠️ Image generation attempt failed: ${finalError.message}`);
      if (retries > 0) {
        console.log("🔄 Retrying image generation in 30 seconds...");
        retries--;
        await new Promise(resolve => setTimeout(resolve, 30000));
        continue;
      }
      throw finalError;
    }
  }
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
