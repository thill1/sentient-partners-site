import { toRichParts } from '../lib/speakable';

/** Chat text with links and email addresses made clickable. */
export const RichText = ({ text }: { text: string }) => (
  <>
    {toRichParts(text).map((part, i) =>
      part.kind === 'text' ? (
        <span key={i}>{part.text}</span>
      ) : (
        <a
          key={i}
          className="concierge-link"
          href={part.href}
          {...(part.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {part.text}
        </a>
      ),
    )}
  </>
);
