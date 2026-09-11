// Queue names — see architecture §09. Kept as constants so a typo in a
// producer silently creating a new queue is a compile error, not a 3am bug.
export const QUEUE_AI_GRADING = 'ai-grading';
export const QUEUE_NOTIFICATION_FANOUT = 'notification-fanout';
export const QUEUE_REPORT_GENERATION = 'report-generation';
export const QUEUE_MEDIA_TRANSCODE = 'media-transcode';
export const QUEUE_CACHE_INVALIDATION = 'cache-invalidation';
