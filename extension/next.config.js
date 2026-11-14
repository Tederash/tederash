const fs = require('fs');
const path = require('path');

function getGroqEnv() {
  const env = { key: '', model: 'openai/gpt-oss-120b' };
  const possiblePaths = [
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'extension', '.env'),
    path.resolve(__dirname, '..', '.env'),
  ];
  for (const envPath of possiblePaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const keyMatch = content.match(/GROQ_API_KEY\s*=\s*(.*)/);
        if (keyMatch && keyMatch[1]) {
          env.key = keyMatch[1].trim().replace(/^["']|["']$/g, '');
        }
        const modelMatch = content.match(/GROQ_MODEL\s*=\s*(.*)/);
        if (modelMatch && modelMatch[1]) {
          env.model = modelMatch[1].trim().replace(/^["']|["']$/g, '');
        }
        if (env.key) break;
      }
    } catch {}
  }
  if (!env.key && process.env.GROQ_API_KEY) env.key = process.env.GROQ_API_KEY;
  if (process.env.GROQ_MODEL) env.model = process.env.GROQ_MODEL;
  return env;
}

const groqEnv = getGroqEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  env: {
    GROQ_API_KEY: groqEnv.key,
    GROQ_MODEL: groqEnv.model,
  },
};

module.exports = nextConfig;
