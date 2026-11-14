const fs = require('fs');
const path = require('path');

function getGroqKey() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const match = fs.readFileSync(envPath, 'utf8').match(/GROQ_API_KEY\s*=\s*(.*)/);
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {}
  return process.env.GROQ_API_KEY || '';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  env: {
    GROQ_API_KEY: getGroqKey(),
  },
};

module.exports = nextConfig;
