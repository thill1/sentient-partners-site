export type Speaker = 'caller' | 'agent';

export interface Beat {
  speaker: Speaker;
  text: string;
  /** TTS-friendly variant; falls back to text */
  spokenText?: string;
  /** ledger event id completed once this beat finishes */
  ledger?: string;
  pauseAfterMs?: number;
}

export interface LedgerEvent {
  id: string;
  label: string;
  clock: string;
}

export interface Scenario {
  id: string;
  industry: string;
  businessName: string;
  sceneLine: string;
  clockStart: string;
  beats: Beat[];
  ledger: LedgerEvent[];
  revenue: number;
  revenueNote: string;
  bookedSlot: { when: string; detail: string };
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'dental',
    industry: 'Dental practice',
    businessName: 'Bright Smile Dental',
    sceneLine: 'A patient calls after hours with a dental emergency. No one is in the office.',
    clockStart: '9:47 PM',
    beats: [
      { speaker: 'caller', text: "Hi, do you take emergency appointments? My crown just came off and I'm in a lot of pain.", ledger: 'captured' },
      { speaker: 'agent', text: "I'm so sorry, that sounds painful. Yes, Bright Smile Dental holds same-week emergency slots. Are you an existing patient with us?", ledger: 'triaged' },
      { speaker: 'caller', text: "No, this would be my first visit. How much does it cost to re-cement a crown?" },
      { speaker: 'agent', text: "For a new patient it's typically $180–$260 depending on the exam. Dr. Patel has an emergency opening tomorrow at 8:30 AM. Would you like me to hold it for you?", spokenText: "For a new patient it's typically one hundred eighty to two hundred sixty dollars depending on the exam. Dr. Patel has an emergency opening tomorrow at eight thirty A M. Would you like me to hold it for you?", ledger: 'pricing' },
      { speaker: 'caller', text: 'Yes please, that would be great.' },
      { speaker: 'agent', text: "Done. You're booked for tomorrow at 8:30 AM with Dr. Patel. I'm texting you a confirmation with our address and what to expect. Try to keep the crown safe tonight, and we'll see you in the morning.", spokenText: "Done. You're booked for tomorrow at eight thirty A M with Dr. Patel. I'm texting you a confirmation with our address and what to expect. Try to keep the crown safe tonight, and we'll see you in the morning.", ledger: 'booked' },
    ],
    ledger: [
      { id: 'captured', label: 'Lead captured', clock: '9:47 PM' },
      { id: 'triaged', label: 'Emergency triaged', clock: '9:48 PM' },
      { id: 'pricing', label: 'Pricing handled', clock: '9:48 PM' },
      { id: 'booked', label: 'Appointment booked', clock: '9:49 PM' },
    ],
    revenue: 450,
    revenueNote: 'New patient · emergency visit avg',
    bookedSlot: { when: 'Tomorrow, 8:30 AM', detail: 'Dr. Patel · emergency slot held' },
  },
  {
    id: 'hvac',
    industry: 'HVAC company',
    businessName: 'Summit Air & Heat',
    sceneLine: "It's a 104° weekend. A homeowner's AC just died — and your techs are off the clock.",
    clockStart: '7:12 PM',
    beats: [
      { speaker: 'caller', text: "My air conditioner completely stopped working and it's over a hundred degrees. Can anyone come out this weekend?", ledger: 'captured' },
      { speaker: 'agent', text: "I can absolutely help. Summit Air & Heat runs weekend emergency service. Can you tell me if the unit is making any sound at all, or is it completely dead?", ledger: 'triaged' },
      { speaker: 'caller', text: "It hums for a second and then shuts off. How much is a weekend visit?" },
      { speaker: 'agent', text: "That sounds like it could be a capacitor, which is a common fix. The weekend diagnostic is $99 and gets applied to the repair. I have a technician window tomorrow between 9 and 11 AM. Shall I lock that in?", spokenText: "That sounds like it could be a capacitor, which is a common fix. The weekend diagnostic is ninety nine dollars and gets applied to the repair. I have a technician window tomorrow between nine and eleven A M. Shall I lock that in?", ledger: 'pricing' },
      { speaker: 'caller', text: "Yes, book it. It's miserable in here." },
      { speaker: 'agent', text: "You're confirmed for tomorrow morning, 9–11 AM. I've texted you the confirmation and a photo of your technician, Marcus. One more thing — I can add you to our priority membership so emergencies like this jump the line. I'll include the details in the text.", spokenText: "You're confirmed for tomorrow morning, nine to eleven A M. I've texted you the confirmation and a photo of your technician, Marcus. One more thing — I can add you to our priority membership so emergencies like this jump the line. I'll include the details in the text.", ledger: 'booked' },
    ],
    ledger: [
      { id: 'captured', label: 'Emergency call answered', clock: '7:12 PM' },
      { id: 'triaged', label: 'Issue diagnosed', clock: '7:13 PM' },
      { id: 'pricing', label: 'Pricing handled', clock: '7:13 PM' },
      { id: 'booked', label: 'Weekend job booked', clock: '7:14 PM' },
    ],
    revenue: 2800,
    revenueNote: 'Repair + membership upsell avg',
    bookedSlot: { when: 'Tomorrow, 9–11 AM', detail: 'Marcus · weekend emergency window' },
  },
  {
    id: 'law',
    industry: 'Law firm',
    businessName: 'Hartwell & Associates',
    sceneLine: 'A potential client calls Sunday evening after a car accident. Every rival firm went to voicemail.',
    clockStart: '8:23 PM',
    beats: [
      { speaker: 'caller', text: "I was rear-ended on Friday and the insurance company keeps calling me. I don't know what to do. Do I need a lawyer?", ledger: 'captured' },
      { speaker: 'agent', text: "I'm glad you called before speaking with them further. Hartwell and Associates handles exactly these cases. First, are you okay? Were you or anyone else injured?", ledger: 'triaged' },
      { speaker: 'caller', text: "My neck has been hurting since it happened. I saw urgent care yesterday." },
      { speaker: 'agent', text: "I'm sorry to hear that, and it's good you have that visit documented. Please don't give the insurer a recorded statement before your consultation. Attorney Hartwell has an opening Monday at 10 AM for a free case review. May I reserve it for you?", spokenText: "I'm sorry to hear that, and it's good you have that visit documented. Please don't give the insurer a recorded statement before your consultation. Attorney Hartwell has an opening Monday at ten A M for a free case review. May I reserve it for you?", ledger: 'advised' },
      { speaker: 'caller', text: 'Yes, Monday at 10 works.' },
      { speaker: 'agent', text: "You're scheduled for Monday at 10 AM. I'm sending a confirmation with a short checklist — photos, the police report number, and your urgent care paperwork. Until then, let all insurance calls go to voicemail. We'll take it from here.", ledger: 'booked' },
    ],
    ledger: [
      { id: 'captured', label: 'Lead captured', clock: '8:23 PM' },
      { id: 'triaged', label: 'Case qualified', clock: '8:24 PM' },
      { id: 'advised', label: 'Client protected', clock: '8:25 PM' },
      { id: 'booked', label: 'Consultation booked', clock: '8:25 PM' },
    ],
    revenue: 3500,
    revenueNote: 'Avg. personal injury case intake value',
    bookedSlot: { when: 'Monday, 10:00 AM', detail: 'Attorney Hartwell · free case review' },
  },
  {
    id: 'fitness',
    industry: 'Fitness studio',
    businessName: 'Ironline Fitness',
    sceneLine: 'A prospect messages at 6 AM before work — motivated now, gone by lunch.',
    clockStart: '6:04 AM',
    beats: [
      { speaker: 'caller', text: "Hey, do you guys do free trials? I've been meaning to get back into the gym for months.", ledger: 'captured' },
      { speaker: 'agent', text: "You're in the right place — Ironline offers a free first week. What are you hoping to work on: strength, weight loss, or overall conditioning?", ledger: 'qualified' },
      { speaker: 'caller', text: "Mostly strength, but honestly I just need something that keeps me consistent." },
      { speaker: 'agent', text: "Then you'll love our coached small-group strength sessions — built-in accountability. There's a 6 AM class Thursday, which seems like your hour. Want me to reserve your trial spot?", spokenText: "Then you'll love our coached small-group strength sessions — built-in accountability. There's a six A M class Thursday, which seems like your hour. Want me to reserve your trial spot?", ledger: 'matched' },
      { speaker: 'caller', text: "Ha, it is my hour. Yes, book me in." },
      { speaker: 'agent', text: "Locked in — Thursday 6 AM with Coach Rivera. I've texted your trial pass and what to bring. If you crush it, your first week is free and there's a founding-member rate waiting. See you Thursday.", ledger: 'booked' },
    ],
    ledger: [
      { id: 'captured', label: 'Lead captured', clock: '6:04 AM' },
      { id: 'qualified', label: 'Goals qualified', clock: '6:05 AM' },
      { id: 'matched', label: 'Program matched', clock: '6:05 AM' },
      { id: 'booked', label: 'Trial class booked', clock: '6:06 AM' },
    ],
    revenue: 1068,
    revenueNote: 'Avg. first-year membership value',
    bookedSlot: { when: 'Thursday, 6:00 AM', detail: 'Coach Rivera · trial strength session' },
  },
];
