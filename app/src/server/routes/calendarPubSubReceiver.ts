import calendarPushReceiverRouter from './calendarPushReceiver';

// Compatibility shim: index.ts mounts this module at /api/calendar/pubsub.
// Implementation now lives in calendarPushReceiver.ts.
export default calendarPushReceiverRouter;
