export const onRequestGet: PagesFunction = async (context) => {
  const key = context.env.API_KEY || context.env.GEMINI_API_KEY;
  const hasApiKey = !!key;
  const hasAdminUsername = !!context.env.ADMIN_USERNAME;
  const hasAdminPassword = !!context.env.ADMIN_PASSWORD;
  const hasAdminPasswordHash = !!context.env.ADMIN_PASSWORD_HASH;
  const hasAdminSessionSecret = !!context.env.ADMIN_SESSION_SECRET;
  const hasSiteSettingsBinding = !!context.env.SITE_SETTINGS;
  const hasTtsBaseUrl = !!context.env.TTS_BASE_URL;
  const hasTtsApiKey = !!context.env.TTS_API_KEY;

  return new Response(
    JSON.stringify(
      {
        ok: true,
        bindings: {
          siteSettings: hasSiteSettingsBinding,
        },
        env: {
          adminUsername: hasAdminUsername,
          adminPassword: hasAdminPassword,
          adminPasswordHash: hasAdminPasswordHash,
          adminSessionSecret: hasAdminSessionSecret,
          geminiApiKey: hasApiKey,
          ttsBaseUrl: hasTtsBaseUrl,
          ttsApiKey: hasTtsApiKey,
        },
        authMode: hasAdminPasswordHash
          ? 'password_hash'
          : hasAdminPassword
            ? 'plain_password'
            : 'missing',
        deploymentReady:
          hasSiteSettingsBinding &&
          hasAdminUsername &&
          hasAdminSessionSecret &&
          (hasAdminPassword || hasAdminPasswordHash) &&
          hasApiKey &&
          hasTtsBaseUrl,
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
};
