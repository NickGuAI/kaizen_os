#!/usr/bin/env python3
"""Convert pg_dump COPY statements to INSERT statements for Supabase."""

import re
import sys
from pathlib import Path

def escape_value(val: str) -> str:
    """Escape a value for SQL INSERT."""
    if val == '\\N':
        return 'NULL'
    # Escape single quotes
    val = val.replace("'", "''")
    # Handle backslash escapes from COPY format
    val = val.replace('\\t', '\t')
    val = val.replace('\\n', '\n')
    val = val.replace('\\r', '\r')
    val = val.replace('\\\\', '\\')
    return f"'{val}'"

def parse_copy_block(lines: list, start_idx: int) -> tuple:
    """Parse a COPY block and return (table_name, columns, data_rows, end_idx)."""
    copy_line = lines[start_idx]

    # Parse: COPY public.table_name (col1, col2, ...) FROM stdin;
    match = re.match(r'COPY public\.(\w+) \(([^)]+)\) FROM stdin;', copy_line)
    if not match:
        return None, None, None, start_idx + 1

    table_name = match.group(1)
    columns = [c.strip() for c in match.group(2).split(',')]

    data_rows = []
    idx = start_idx + 1

    while idx < len(lines):
        line = lines[idx]
        if line.strip() == '\\.':
            break
        if line.strip():
            # Split by tabs (COPY format)
            values = line.rstrip('\n').split('\t')
            data_rows.append(values)
        idx += 1

    return table_name, columns, data_rows, idx + 1

def generate_inserts(table_name: str, columns: list, data_rows: list) -> list:
    """Generate INSERT statements from parsed data."""
    if not data_rows:
        return []

    inserts = []
    col_str = ', '.join(columns)

    for row in data_rows:
        if len(row) != len(columns):
            print(f"Warning: Row has {len(row)} values but {len(columns)} columns for {table_name}", file=sys.stderr)
            continue

        values = [escape_value(v) for v in row]
        val_str = ', '.join(values)
        inserts.append(f"INSERT INTO {table_name} ({col_str}) VALUES ({val_str});")

    return inserts

def main():
    backup_path = Path(__file__).parent.parent / 'app' / 'data' / 'kaizen_os_backup.sql'
    output_path = Path(__file__).parent / '20260115_002_seed_data.sql'

    print(f"Reading from: {backup_path}")

    with open(backup_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')

    # Track all tables and their INSERT statements
    table_inserts = {}

    idx = 0
    while idx < len(lines):
        line = lines[idx]

        if line.startswith('COPY public.'):
            table_name, columns, data_rows, end_idx = parse_copy_block(lines, idx)
            if table_name:
                inserts = generate_inserts(table_name, columns, data_rows)
                if inserts:
                    table_inserts[table_name] = inserts
                    print(f"  {table_name}: {len(inserts)} rows")
            idx = end_idx
        else:
            idx += 1

    # Write output in dependency order
    table_order = [
        'users',  # First (no FK dependencies)
        'seasons',
        'cards',
        'events',
        'calendar_accounts',
        'calendar_event_annotations',
        'event_classification_rules',
        'routine_calendar_links',
        'cached_calendar_events',
        'event_tags',
        'ai_classification_suggestions',
        'planning_sessions',
        'work_item_links',
        'daily_focus',
        'notion_accounts',
        'agent_sessions',
        'agent_messages',  # Last (FK to agent_sessions)
    ]

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("-- Kaizen OS: Data Seed Migration\n")
        f.write("-- Run this AFTER the RLS migration\n")
        f.write("-- Generated from kaizen_os_backup.sql\n\n")

        f.write("-- Disable triggers for bulk insert\n")
        f.write("SET session_replication_role = replica;\n\n")

        for table in table_order:
            if table in table_inserts:
                f.write(f"-- {table} ({len(table_inserts[table])} rows)\n")
                for insert in table_inserts[table]:
                    f.write(insert + '\n')
                f.write('\n')

        # Handle any tables not in our predefined order
        for table, inserts in table_inserts.items():
            if table not in table_order:
                f.write(f"-- {table} ({len(inserts)} rows)\n")
                for insert in inserts:
                    f.write(insert + '\n')
                f.write('\n')

        f.write("-- Re-enable triggers\n")
        f.write("SET session_replication_role = DEFAULT;\n\n")

        f.write("-- Reset sequences to max id + 1\n")
        f.write("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);\n")
        f.write("SELECT setval('cards_id_seq', COALESCE((SELECT MAX(id) FROM cards), 0) + 1, false);\n")
        f.write("SELECT setval('seasons_id_seq', COALESCE((SELECT MAX(id) FROM seasons), 0) + 1, false);\n")
        f.write("SELECT setval('events_id_seq', COALESCE((SELECT MAX(id) FROM events), 0) + 1, false);\n")

    print(f"\nOutput written to: {output_path}")

if __name__ == '__main__':
    main()
