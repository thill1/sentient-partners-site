import {
  Database,
  Layout,
  MessageSquare,
  Phone,
  Star,
  Zap,
} from 'lucide-react';
import { ServiceItem } from './types';
import {
  BOOKING_URL,
  FAQS,
  NAV_LINKS,
  SERVICE_CATALOG,
  TESTIMONIALS,
  buildAiSystemInstruction,
} from './content/siteContent';

const SERVICE_ICONS = {
  voice: Phone,
  chat: MessageSquare,
  crm: Database,
  web: Layout,
  reputation: Star,
  strategy: Zap,
} as const;

export { BOOKING_URL, FAQS, NAV_LINKS, TESTIMONIALS };

export const SERVICES: ServiceItem[] = SERVICE_CATALOG.map((service) => ({
  id: service.id,
  title: service.title,
  description: service.description,
  features: [...service.features],
  details: {
    heading: service.details.heading,
    useCase: service.details.useCase,
    benefits: [...service.details.benefits],
  },
  icon: SERVICE_ICONS[service.id],
}));

export const SYSTEM_INSTRUCTION = buildAiSystemInstruction();
