import React, { useEffect, useState } from 'react';
import { mergeSettingsUpdate } from '../lib/adminApi';
import type { SiteSettings } from '../lib/siteSettingsSchema';
import { Button } from './Button';

interface AdminPanelProps {
  error: string | null;
  isSaving: boolean;
  onLogout: () => Promise<void>;
  onSave: (settings: SiteSettings) => Promise<void>;
  settings: SiteSettings;
  status: string | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  error,
  isSaving,
  onLogout,
  onSave,
  settings,
  status,
}) => {
  const [draft, setDraft] = useState<SiteSettings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl dark:border-white/10 dark:bg-slate-900/80 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Sentient Partners Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Site Settings</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Update the public banner and AI defaults used across the website.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/#"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            >
              Back to site
            </a>
            <Button onClick={() => void onLogout()} size="md" variant="outline">
              Log Out
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
            <h2 className="text-xl font-semibold">Banner</h2>
            <div className="mt-5 space-y-4">
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                <span className="text-sm font-medium">Enable banner</span>
                <input
                  checked={draft.banner.enabled}
                  onChange={(event) =>
                    setDraft((current) =>
                      mergeSettingsUpdate(current, {
                        banner: { enabled: event.target.checked },
                      })
                    )
                  }
                  type="checkbox"
                />
              </label>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="banner-message">
                  Message
                </label>
                <textarea
                  id="banner-message"
                  value={draft.banner.message}
                  onChange={(event) =>
                    setDraft((current) =>
                      mergeSettingsUpdate(current, {
                        banner: { message: event.target.value },
                      })
                    )
                  }
                  className="block min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="banner-cta-text">
                    CTA text
                  </label>
                  <input
                    id="banner-cta-text"
                    type="text"
                    value={draft.banner.ctaText}
                    onChange={(event) =>
                      setDraft((current) =>
                        mergeSettingsUpdate(current, {
                          banner: { ctaText: event.target.value },
                        })
                      )
                    }
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="banner-variant">
                    Variant
                  </label>
                  <select
                    id="banner-variant"
                    value={draft.banner.variant}
                    onChange={(event) =>
                      setDraft((current) =>
                        mergeSettingsUpdate(current, {
                          banner: { variant: event.target.value as SiteSettings['banner']['variant'] },
                        })
                      )
                    }
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="banner-cta-url">
                  CTA URL
                </label>
                <input
                  id="banner-cta-url"
                  type="text"
                  value={draft.banner.ctaUrl}
                  onChange={(event) =>
                    setDraft((current) =>
                      mergeSettingsUpdate(current, {
                        banner: { ctaUrl: event.target.value },
                      })
                    )
                  }
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
            <h2 className="text-xl font-semibold">AI Settings</h2>
            <div className="mt-5 space-y-4">
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                <span className="text-sm font-medium">Enable voice replies</span>
                <input
                  checked={draft.ai.voiceEnabled}
                  onChange={(event) =>
                    setDraft((current) =>
                      mergeSettingsUpdate(current, {
                        ai: { voiceEnabled: event.target.checked },
                      })
                    )
                  }
                  type="checkbox"
                />
              </label>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="ai-voice-id">
                  Voice ID
                </label>
                <input
                  id="ai-voice-id"
                  type="text"
                  value={draft.ai.voiceId}
                  onChange={(event) =>
                    setDraft((current) =>
                      mergeSettingsUpdate(current, {
                        ai: { voiceId: event.target.value },
                      })
                    )
                  }
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="ai-voice-provider">
                  Voice provider
                </label>
                <select
                  id="ai-voice-provider"
                  value={draft.ai.voiceProvider}
                  onChange={(event) =>
                    setDraft((current) =>
                      mergeSettingsUpdate(current, {
                        ai: { voiceProvider: event.target.value as SiteSettings['ai']['voiceProvider'] },
                      })
                    )
                  }
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="self_hosted_tts">Self-hosted TTS</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="ai-system-prompt">
                  System prompt
                </label>
                <textarea
                  id="ai-system-prompt"
                  value={draft.ai.systemPrompt}
                  onChange={(event) =>
                    setDraft((current) =>
                      mergeSettingsUpdate(current, {
                        ai: { systemPrompt: event.target.value },
                      })
                    )
                  }
                  className="block min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="ai-site-memory">
                  Site memory
                </label>
                <textarea
                  id="ai-site-memory"
                  value={draft.ai.siteMemory}
                  onChange={(event) =>
                    setDraft((current) =>
                      mergeSettingsUpdate(current, {
                        ai: { siteMemory: event.target.value },
                      })
                    )
                  }
                  className="block min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>
          </section>
        </div>

        {status ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
            {status}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <Button disabled={isSaving} onClick={() => void onSave(draft)} size="lg">
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};
