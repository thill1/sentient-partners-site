import React from 'react';
import { Play, RotateCcw, Square, Volume2, VolumeX } from 'lucide-react';
import { HOME_DEMO } from '../../../content/homeContent';
import { useFrontDeskDemo } from '../../demo/useFrontDeskDemo';
import { Waveform } from '../../demo/Waveform';
import { Panel } from './parts';

const { voice } = HOME_DEMO;

/**
 * The site's working front-desk call, in miniature. Nothing plays until the
 * visitor presses play; every line is captioned, and the call can be stopped
 * or muted at any point.
 */
export const VoiceDemo: React.FC = () => {
  const demo = useFrontDeskDemo(voice.scenarioId);
  const running = demo.phase === 'running';
  const done = demo.phase === 'done';
  const line = demo.lines[demo.lines.length - 1];

  const MainIcon = running ? Square : done ? RotateCcw : Play;
  const mainLabel = running ? 'Stop the call' : done ? 'Play the call again' : 'Play the call';

  return (
    <Panel tone="dark" title={demo.scenario.businessName}>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <Waveform
          active={running && demo.speaking !== null}
          variant={demo.speaking === 'caller' ? 'caller' : 'agent'}
          className="h-12 w-full shrink-0"
        />

        <div aria-live="polite" className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {done ? (
            <p>
              <span className="block text-[11.5px] text-sp-mist">Booked</span>
              <span className="mt-1 block font-editorial text-[18px] leading-snug">{demo.scenario.bookedSlot.when}</span>
              <span className="mt-1 block text-sp-mist">{demo.scenario.bookedSlot.detail}</span>
            </p>
          ) : line ? (
            <p>
              <span className="block text-[11.5px] text-sp-mist">{line.speaker === 'agent' ? 'Agent' : 'Caller'}</span>
              <span className="mt-1 block">{line.text}</span>
            </p>
          ) : (
            <p className="text-sp-mist">{voice.idle}</p>
          )}
        </div>

        <div className="mt-3 flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={running ? demo.stop : demo.play}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[3px] bg-sp-champagne text-[13px] font-medium text-sp-deep transition-colors hover:bg-[#e8cfa3]"
          >
            <MainIcon aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
            {mainLabel}
          </button>
          <button
            type="button"
            onClick={() => demo.setMuted(!demo.muted)}
            aria-pressed={demo.muted}
            aria-label="Mute voices"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border border-white/20 text-sp-ivory transition-colors hover:border-white/50"
          >
            {demo.muted ? (
              <VolumeX aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Volume2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
        <p className="mt-2.5 shrink-0 text-[11.5px] leading-snug text-sp-mist">{voice.note}</p>
      </div>
    </Panel>
  );
};
