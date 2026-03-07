create index if not exists idx_events_user_type_card_time
on events(user_id, event_type, card_id, occurred_at desc);
