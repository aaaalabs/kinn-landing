/**
 * KINN Event Schema Definitions
 *
 * Comprehensive event data structure supporting:
 * - Schema.org Event standards
 * - Google Calendar API format
 * - iCalendar (ICS) export
 * - JSON-LD structured data
 * - OpenGraph social sharing
 *
 * Last updated: 2025-12-07
 */

/**
 * DateTime: ISO 8601 string or Date object
 * Format: "2025-12-20T18:30:00+01:00" or "2025-12-20" for all-day events
 */
export type DateTime = string | Date;

/**
 * EventStatus: Current state of the event
 */
export enum EventStatus {
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  POSTPONED = 'postponed',
  CONFIRMED = 'confirmed'
}

/**
 * EventAttendanceMode: How people can attend
 */
export enum EventAttendanceMode {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MIXED = 'mixed'
}

/**
 * EventFormat: Type of event
 */
export enum EventFormat {
  MEETUP = 'meetup',
  WORKSHOP = 'workshop',
  CONFERENCE = 'conference',
  PANEL = 'panel',
  NETWORKING = 'networking',
  LECTURE = 'lecture',
  HACKATHON = 'hackathon',
  TOUR = 'tour',
  SOCIAL = 'social',
  ONLINE_WEBINAR = 'online-webinar'
}

/**
 * SkillLevel: Technical difficulty level
 */
export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MIXED = 'mixed'
}

/**
 * Address: Physical location details (Schema.org PostalAddress)
 */
export interface Address {
  /** Street address (e.g., "Dreiheiligenstraße 21a") */
  streetAddress: string;
  /** City name */
  addressLocality: string;
  /** Postal code */
  postalCode: string;
  /** Country (ISO 3166-1 code, e.g., "AT") */
  addressCountry: string;
  /** Region/state */
  addressRegion?: string;
  /** Place name (friendly display name) */
  name?: string;
  /** Latitude for mapping */
  latitude?: number;
  /** Longitude for mapping */
  longitude?: number;
  /** URL for directions/map */
  url?: string;
}

/**
 * Attendee: Person attending or invited to event
 */
export interface Attendee {
  /** Email address (required for calendar integration) */
  email: string;
  /** Display name */
  name?: string;
  /** RSVP status: "needsAction" | "accepted" | "tentative" | "declined" */
  responseStatus?: 'needsAction' | 'accepted' | 'tentative' | 'declined';
  /** Whether attendee is required */
  optional?: boolean;
  /** Organizer flag */
  organizer?: boolean;
  /** Avatar URL */
  avatarUrl?: string;
  /** Bio or role */
  role?: string;
}

/**
 * Speaker: Person presenting or facilitating
 */
export interface Speaker {
  /** Full name */
  name: string;
  /** Email address */
  email?: string;
  /** Professional title/role */
  title?: string;
  /** Company/organization */
  organization?: string;
  /** Biography/description */
  bio?: string;
  /** Avatar image URL */
  avatarUrl?: string;
  /** Profile/social media links */
  links?: {
    website?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Sponsor: Organization sponsoring the event
 */
export interface Sponsor {
  /** Organization name */
  name: string;
  /** Logo URL */
  logoUrl?: string;
  /** Website */
  website?: string;
  /** Sponsorship level (gold, silver, bronze, partner) */
  level?: 'platinum' | 'gold' | 'silver' | 'bronze' | 'partner';
  /** Sponsor description */
  description?: string;
}

/**
 * Offer: Ticketing or pricing information
 */
export interface Offer {
  /** Display name of the offer */
  name: string;
  /** Price value */
  price: number;
  /** Currency code (ISO 4217, e.g., "EUR") */
  priceCurrency: string;
  /** Availability status */
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder' | 'BackOrder';
  /** Number of items available */
  inventoryLevel?: number;
  /** URL to purchase/register */
  url?: string;
  /** Description of what's included */
  description?: string;
  /** Valid from date */
  validFrom?: DateTime;
  /** Valid until date */
  validUntil?: DateTime;
}

/**
 * Reminder: Notification settings
 */
export interface Reminder {
  /** Method: email, popup, sms, notification */
  method: 'email' | 'popup' | 'sms' | 'notification';
  /** Minutes before event */
  minutes: number;
}

/**
 * ConferenceData: Virtual meeting information
 */
export interface ConferenceData {
  /** Conference type: hangoutsMeet, phone, sipAddress */
  conferenceType: 'hangoutsMeet' | 'phone' | 'sipAddress' | 'entryPoints';
  /** URL to join conference */
  entryUrl?: string;
  /** Entry points for different methods */
  entryPoints?: {
    entryPointType: string;
    uri: string;
    label?: string;
    pin?: string;
    accessCode?: string;
    meetingCode?: string;
    passcode?: string;
  }[];
  /** Conference ID */
  conferenceId?: string;
  /** Conference notes */
  notes?: string;
}

/**
 * RecurrenceRule: iCalendar RRULE format
 * Examples:
 *   - "FREQ=WEEKLY;BYDAY=TH"
 *   - "FREQ=MONTHLY;BYMONTHDAY=1"
 *   - "FREQ=DAILY;COUNT=5"
 */
export type RecurrenceRule = string;

/**
 * MediaObject: Image or video attachment
 */
export interface MediaObject {
  /** URL to media file */
  url: string;
  /** Media type (image/jpeg, image/png, video/mp4) */
  type: string;
  /** Display name */
  name?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Image caption/description */
  caption?: string;
  /** Whether this is the primary/featured image */
  featured?: boolean;
}

/**
 * AISpecificMetadata: AI/Tech specific event details
 */
export interface AISpecificMetadata {
  /** Primary topics (e.g., "Local LLMs", "RAG", "Fine-tuning") */
  topics: string[];
  /** AI technologies featured (e.g., "GPT-4", "Llama", "Mistral") */
  technologies?: string[];
  /** Learning outcomes for attendees */
  learningOutcomes?: string[];
  /** Required prerequisites/prior knowledge */
  prerequisites?: string[];
  /** Skill level of content */
  skillLevel?: SkillLevel;
  /** Code samples or repo links */
  resourceLinks?: {
    title: string;
    url: string;
    type?: 'github' | 'colab' | 'documentation' | 'example' | 'other';
  }[];
  /** Will slides be available? */
  slidesUrl?: string;
  /** Recording available after event? */
  recordingUrl?: string;
}

/**
 * SocialMetadata: Social sharing and engagement
 */
export interface SocialMetadata {
  /** Hashtags for social media (without #) */
  hashtags?: string[];
  /** Custom social media message */
  socialMessage?: string;
  /** Featured image for social sharing */
  ogImage?: string;
  /** Custom OpenGraph description */
  ogDescription?: string;
  /** Twitter handle of organizer */
  twitterHandle?: string;
  /** LinkedIn event ID (if published there) */
  linkedinEventUrl?: string;
  /** EventBrite event ID (if published there) */
  eventbriteUrl?: string;
  /** Meetup.com event ID (if published there) */
  meetupUrl?: string;
}

/**
 * RegistrationDetails: How to register or attend
 */
export interface RegistrationDetails {
  /** Registration required? */
  required: boolean;
  /** URL to register/RSVP */
  url?: string;
  /** Registration deadline */
  deadline?: DateTime;
  /** Capacity information */
  capacity?: {
    /** Max attendees */
    maximum?: number;
    /** Currently registered */
    current?: number;
    /** Waitlist enabled */
    hasWaitlist?: boolean;
  };
  /** Custom registration instructions */
  instructions?: string;
  /** Fields required for registration */
  fields?: {
    name: string;
    type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';
    required: boolean;
    options?: string[];
  }[];
}

/**
 * EventMetadata: Internal tracking and admin details
 */
export interface EventMetadata {
  /** Unique event ID */
  id: string;
  /** UUID for global uniqueness */
  uuid?: string;
  /** URL slug for web pages */
  slug?: string;
  /** Creation timestamp (ISO 8601) */
  createdAt: DateTime;
  /** Last updated timestamp */
  updatedAt: DateTime;
  /** Created by user ID */
  createdBy?: string;
  /** Event creator email */
  creatorEmail?: string;
  /** Tags for filtering/organization */
  tags?: string[];
  /** Internal notes (admin only) */
  internalNotes?: string;
  /** Privacy level */
  privacy?: 'public' | 'unlisted' | 'private';
  /** Whether to show in public listings */
  publishedAt?: DateTime;
  /** External event IDs for sync */
  externalIds?: {
    googleCalendarEventId?: string;
    eventbriteId?: string;
    meetupId?: string;
    facebookEventId?: string;
  };
  /** Analytics tracking */
  analytics?: {
    views?: number;
    clicks?: number;
    registrations?: number;
    lastViewedAt?: DateTime;
  };
}

/**
 * KINNEventBase: Minimum required fields for any KINN event
 */
export interface KINNEventBase {
  /** Unique event identifier */
  id: string;
  /** Event title */
  title: string;
  /** Brief description (max 160 chars for previews) */
  description: string;
  /** Detailed description (supports markdown) */
  fullDescription?: string;
  /** When the event starts */
  startDate: DateTime;
  /** When the event ends */
  endDate: DateTime;
  /** Physical location (address) */
  location: Address;
  /** How people attend this event */
  attendanceMode: EventAttendanceMode;
  /** Event format/type */
  format: EventFormat;
  /** Organizer information */
  organizer: {
    name: string;
    email: string;
    url?: string;
    logoUrl?: string;
  };
  /** Event status */
  status?: EventStatus;
}

/**
 * StammtischEvent: KINN's regular monthly meetup format
 *
 * Standardized structure for KINN's "Stammtisch" (regular table)
 * recurring events in Innsbruck
 */
export interface StammtischEvent extends KINNEventBase {
  /** Occurrence number (1st, 2nd, 3rd Stammtisch, etc.) */
  occurrenceNumber: number;
  /** Main topic for this month's discussion */
  topic: string;
  /** Speakers/presenters */
  speakers?: Speaker[];
  /** AI topics covered */
  aiMetadata?: AISpecificMetadata;
  /** Attendees list */
  attendees?: Attendee[];
  /** Is this the default "Stammtisch" event? */
  isRegularStammtisch?: boolean;
  /** Recurring rule for future occurrences */
  recurrenceRule?: RecurrenceRule;
}

/**
 * CompleteKINNEvent: Fully featured event with all optional fields
 *
 * This represents a complete event record with all possible fields
 * filled in. Used for:
 * - Admin dashboard display
 * - Detailed event pages
 * - Calendar synchronization
 * - Email invitations
 * - Social media sharing
 */
export interface CompleteKINNEvent extends KINNEventBase {
  /* Core Event Details */
  /** Longer description (Markdown supported) */
  fullDescription: string;
  /** Timezone for the event */
  timezone: string;
  /** URL/slug for event page */
  url: string;
  /** Featured image/banner */
  image?: MediaObject;
  /** Additional media (photos, videos) */
  media?: MediaObject[];

  /* Technical Details */
  /** Format/type of event */
  format: EventFormat;
  /** How people can attend */
  attendanceMode: EventAttendanceMode;
  /** Is it a repeating event */
  isRecurring: boolean;
  /** Recurrence pattern */
  recurrenceRule?: RecurrenceRule;
  /** Previous occurrence (if rescheduled) */
  previousStartDate?: DateTime;

  /* Attendance & Registration */
  /** Is registration required */
  registrationRequired: boolean;
  /** Registration details and form */
  registration?: RegistrationDetails;
  /** Confirmed attendees */
  attendees: Attendee[];
  /** Speakers/presenters */
  speakers?: Speaker[];
  /** Expected capacity */
  expectedAttendees?: number;
  /** Max capacity */
  maximumAttendees?: number;

  /* Ticketing & Offers */
  /** Ticket/pricing options */
  offers?: Offer[];
  /** Is free event */
  isFree: boolean;

  /* Virtual & Hybrid */
  /** Conference/video call details */
  conferenceData?: ConferenceData;
  /** Virtual attendance URL */
  virtualUrl?: string;

  /* Content & Learning */
  /** AI/tech specific metadata */
  aiMetadata?: AISpecificMetadata;
  /** Learning outcomes for attendees */
  learningOutcomes?: string[];
  /** Skill level required */
  skillLevel?: SkillLevel;

  /* Organization & Partners */
  /** Co-organizers */
  coOrganizers?: Attendee[];
  /** Sponsors */
  sponsors?: Sponsor[];
  /** Partners */
  partners?: Sponsor[];

  /* Communication */
  /** Email reminders before event */
  reminders: Reminder[];
  /** Confirmation email template */
  confirmationEmailTemplate?: string;
  /** Reminder email template */
  reminderEmailTemplate?: string;

  /* Social & Sharing */
  /** Social sharing metadata */
  social: SocialMetadata;

  /* Administrative */
  /** Internal metadata */
  metadata: EventMetadata;

  /* Status */
  /** Event status */
  status: EventStatus;
  /** Whether event is published */
  published: boolean;
  /** Cancellation reason (if cancelled) */
  cancellationReason?: string;
}

/**
 * EventResponse: API response format
 */
export interface EventResponse {
  success: boolean;
  data?: CompleteKINNEvent | CompleteKINNEvent[];
  error?: string;
  message?: string;
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * EventCreateInput: Minimal fields needed to create an event
 */
export interface EventCreateInput {
  title: string;
  description: string;
  startDate: DateTime;
  endDate: DateTime;
  location: Address;
  format?: EventFormat;
  topic?: string;
  speakers?: Speaker[];
  attendanceMode?: EventAttendanceMode;
  registrationRequired?: boolean;
  registrationUrl?: string;
  virtualUrl?: string;
  description?: string;
  aiMetadata?: AISpecificMetadata;
  social?: SocialMetadata;
}

/**
 * EventUpdateInput: Fields that can be modified
 */
export interface EventUpdateInput {
  title?: string;
  description?: string;
  fullDescription?: string;
  startDate?: DateTime;
  endDate?: DateTime;
  location?: Address;
  format?: EventFormat;
  topic?: string;
  speakers?: Speaker[];
  status?: EventStatus;
  attendees?: Attendee[];
  offers?: Offer[];
  aiMetadata?: AISpecificMetadata;
  registrationRequired?: boolean;
  registration?: RegistrationDetails;
  image?: MediaObject;
  media?: MediaObject[];
  published?: boolean;
  cancellationReason?: string;
}

/**
 * Utility Types
 */

/** Event with only public-facing fields */
export type PublicEvent = Pick<
  CompleteKINNEvent,
  | 'id'
  | 'title'
  | 'description'
  | 'startDate'
  | 'endDate'
  | 'location'
  | 'format'
  | 'attendanceMode'
  | 'image'
  | 'url'
  | 'speakers'
  | 'offers'
  | 'isFree'
  | 'registrationRequired'
  | 'social'
  | 'organizer'
>;

/** Event with admin fields only */
export type AdminEvent = CompleteKINNEvent;

/** Summary event for listings */
export type EventSummary = Pick<
  CompleteKINNEvent,
  | 'id'
  | 'title'
  | 'description'
  | 'startDate'
  | 'format'
  | 'location'
  | 'image'
  | 'speakers'
  | 'isFree'
  | 'url'
  | 'organizer'
>;

/**
 * Default/Example Data
 */

/** Default event location: Die Bäckerei, Innsbruck */
export const DEFAULT_LOCATION: Address = {
  name: 'Die Bäckerei',
  streetAddress: 'Dreiheiligenstraße 21a',
  addressLocality: 'Innsbruck',
  postalCode: '6020',
  addressCountry: 'AT',
  addressRegion: 'Tyrol',
  latitude: 47.2652,
  longitude: 11.3945
};

/** Default KINN organizer */
export const DEFAULT_ORGANIZER = {
  name: 'KINN',
  email: 'treff@kinn.at',
  url: 'https://kinn.at',
  logoUrl: 'https://kinn.at/logo.svg'
};

/** Default reminders (1 day before + 1 hour before) */
export const DEFAULT_REMINDERS: Reminder[] = [
  { method: 'email', minutes: 24 * 60 },  // 1 day
  { method: 'popup', minutes: 60 }         // 1 hour
];

/** Default attendance mode for Stammtisch */
export const DEFAULT_ATTENDANCE_MODE = EventAttendanceMode.OFFLINE;

/** Default format for Stammtisch */
export const DEFAULT_FORMAT = EventFormat.MEETUP;

/**
 * Helper Functions
 */

/**
 * Check if event is in the future
 */
export function isUpcomingEvent(event: KINNEventBase): boolean {
  return new Date(event.startDate) > new Date();
}

/**
 * Check if event is currently happening
 */
export function isOngoingEvent(event: KINNEventBase): boolean {
  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  return now >= start && now <= end;
}

/**
 * Check if event has passed
 */
export function isPastEvent(event: KINNEventBase): boolean {
  return new Date(event.endDate) < new Date();
}

/**
 * Format event date for display
 */
export function formatEventDate(event: KINNEventBase, locale = 'de-AT'): string {
  const date = new Date(event.startDate);
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format event time
 */
export function formatEventTime(event: KINNEventBase, locale = 'de-AT'): string {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);

  const startTime = start.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });

  const endTime = end.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${startTime} - ${endTime}`;
}

/**
 * Get event duration in hours
 */
export function getEventDurationHours(event: KINNEventBase): number {
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  return (end - start) / (1000 * 60 * 60);
}

/**
 * Format address for display
 */
export function formatAddress(address: Address): string {
  return `${address.streetAddress}, ${address.postalCode} ${address.addressLocality}`;
}
