import { useEffect, useRef, useState } from 'react';
import { buildNoteInquiry } from '../lib/noteIntent';
import { submitLead } from '../services/geminiService';

interface NoteForTroyProps {
  /** What the visitor asked for, spoken or typed. Editable before sending. */
  initialNote: string;
  /** Where the note came from, shown to Troy (chat or voice). */
  source: string;
  onBook: () => void;
  onClose: () => void;
}

/**
 * The assistant can't send anything itself. This is the real path: the visitor
 * adds who they are, and the note reaches Troy through the same lead pipeline
 * as the contact form. Success is only shown when that pipeline confirms.
 */
export function NoteForTroy({ initialNote, source, onBook, onClose }: NoteForTroyProps) {
  const [note, setNote] = useState(initialNote);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const root = useRef<HTMLDivElement & HTMLFormElement>(null);

  useEffect(() => {
    root.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  const valid = note.trim().length > 0 && name.trim().length > 0 && /^\S+@\S+\.\S+$/.test(email.trim());

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || status === 'sending') return;
    setStatus('sending');
    const result = await submitLead({
      name: name.trim(),
      email: email.trim(),
      inquiry: buildNoteInquiry({
        note,
        phone,
        sentAt: new Date(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
      intent: 'contact',
      source,
      ctaLabel: 'Note for Troy',
    });
    setStatus(result.success ? 'sent' : 'failed');
  };

  if (status === 'sent') {
    return (
      <div ref={root} className="concierge-note" role="status">
        <p className="concierge-note-title">Sent.</p>
        <p className="concierge-note-status">Troy has your message and will reply by email to {email.trim()}.</p>
        <div className="concierge-note-actions">
          <button type="button" className="concierge-note-link" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <form ref={root} className="concierge-note" onSubmit={send} aria-label="Leave a note for Troy">
      <p className="concierge-note-title">Leave a note for Troy</p>
      <textarea aria-label="Your note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1500} />
      <div className="concierge-note-row">
        <input aria-label="Your name" autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input aria-label="Phone (optional)" type="tel" autoComplete="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <input aria-label="Your email" type="email" autoComplete="email" placeholder="Email, so Troy can reply" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <div className="concierge-note-actions">
        <button type="submit" className="concierge-note-send" disabled={!valid || status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send'}
        </button>
        <button type="button" className="concierge-note-link" onClick={onBook}>Pick a time instead</button>
        <button type="button" className="concierge-note-link" onClick={onClose}>Not now</button>
      </div>
      {status === 'failed' && (
        <p className="concierge-note-error" role="alert">That didn't send. Email hello@sentientpartners.ai and include your note.</p>
      )}
    </form>
  );
}
