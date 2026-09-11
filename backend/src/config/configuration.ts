// Single typed source for every env-driven value. Modules inject ConfigService
// and read through this shape rather than calling process.env directly.
export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'v1',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  timezone: process.env.TZ ?? 'Asia/Dili',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'jofran_refresh',
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackUrl: process.env.MICROSOFT_CALLBACK_URL,
    },
  },

  ai: {
    apiKey: process.env.OPENAI_API_KEY,
    modelChat: process.env.OPENAI_MODEL_CHAT ?? 'gpt-5-mini',
    modelReasoning: process.env.OPENAI_MODEL_REASONING ?? 'gpt-5',
    modelTts: process.env.OPENAI_MODEL_TTS ?? 'gpt-4o-mini-tts',
    modelTranscribe: process.env.OPENAI_MODEL_TRANSCRIBE ?? 'gpt-4o-transcribe',
    modelModeration: process.env.OPENAI_MODEL_MODERATION ?? 'omni-moderation-latest',
    // Architecture §11: "rate-limited per student per day" — a real number, not just a sentence.
    jojoDailyMessageLimit: parseInt(process.env.JOJO_DAILY_MESSAGE_LIMIT ?? '60', 10),
    // Turns kept verbatim in a Jojo conversation before older ones are folded
    // into AiConversation.summary (see ConversationMemoryService).
    jojoContextWindowTurns: parseInt(process.env.JOJO_CONTEXT_WINDOW_TURNS ?? '8', 10),
  },

  storage: {
    region: process.env.AWS_REGION ?? 'ap-southeast-1',
    bucketMedia: process.env.S3_BUCKET_MEDIA ?? 'jofran-media-dev',
    signedUrlTtlSeconds: parseInt(process.env.S3_SIGNED_URL_TTL_SECONDS ?? '300', 10),
  },
});
