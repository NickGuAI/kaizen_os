-- Add is_snack flag to work_item_links
-- Marks tasks as "snack-size" (quick tasks < 10 min, for in-between meetings)
ALTER TABLE work_item_links ADD COLUMN is_snack bool NOT NULL DEFAULT false;

CREATE INDEX work_item_links_user_snack_idx ON work_item_links(user_id, is_snack) WHERE is_snack = true;
