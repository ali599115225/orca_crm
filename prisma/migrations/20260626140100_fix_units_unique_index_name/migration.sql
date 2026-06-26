-- SCHEMA_GAP closure, Migration 59: fixes a bug discovered when applying
-- Migration 58 to a real Production Clone -- `units_project_id_unit_number_key`
-- is a plain unique INDEX (CREATE UNIQUE INDEX), not a table CONSTRAINT, so
-- Migration 58's `pg_constraint`-based guard (and `RENAME CONSTRAINT`) never
-- matched it and the rename never fired there. Migration 58 is already
-- applied and frozen (checksum 63735ad9c3a5fed851942aef7302b46f70ae162bc84e129aac3e87856f9c6737)
-- and is not touched here. This migration is index-aware (`pg_class`/`pg_index`/
-- `pg_namespace`), not constraint-aware, and is the only thing that changes.

DO $migration$
DECLARE
    source_exists BOOLEAN;
    source_table TEXT;
    target_exists BOOLEAN;
    target_table TEXT;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_class i
        JOIN pg_namespace n ON n.oid = i.relnamespace
        WHERE i.relname = 'units_project_id_unit_number_key'
          AND n.nspname = 'public'
          AND i.relkind = 'i'
    ), (
        SELECT t.relname FROM pg_class i
        JOIN pg_index ix ON ix.indexrelid = i.oid
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_namespace n ON n.oid = i.relnamespace
        WHERE i.relname = 'units_project_id_unit_number_key'
          AND n.nspname = 'public'
    )
    INTO source_exists, source_table;

    SELECT EXISTS (
        SELECT 1 FROM pg_class i
        JOIN pg_namespace n ON n.oid = i.relnamespace
        WHERE i.relname = 'uq_project_unit_number'
          AND n.nspname = 'public'
          AND i.relkind = 'i'
    ), (
        SELECT t.relname FROM pg_class i
        JOIN pg_index ix ON ix.indexrelid = i.oid
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_namespace n ON n.oid = i.relnamespace
        WHERE i.relname = 'uq_project_unit_number'
          AND n.nspname = 'public'
    )
    INTO target_exists, target_table;

    IF source_exists AND target_exists THEN
        RAISE EXCEPTION 'units: both "units_project_id_unit_number_key" and "uq_project_unit_number" exist simultaneously -- refusing to guess which to keep';
    END IF;

    IF source_exists AND source_table <> 'units' THEN
        RAISE EXCEPTION '"units_project_id_unit_number_key" exists but belongs to table "%", not "units" -- refusing to rename', source_table;
    END IF;

    IF target_exists AND target_table <> 'units' THEN
        RAISE EXCEPTION '"uq_project_unit_number" exists but belongs to table "%", not "units" -- refusing to treat as already converged', target_table;
    END IF;

    IF source_exists AND NOT target_exists THEN
        ALTER INDEX public."units_project_id_unit_number_key" RENAME TO "uq_project_unit_number";
    ELSIF target_exists AND NOT source_exists THEN
        -- Already converged (e.g. a from-scratch deploy that created the
        -- short name directly) -- no-op so Fresh Deploy succeeds too.
        NULL;
    ELSE
        RAISE EXCEPTION 'units: neither "units_project_id_unit_number_key" nor "uq_project_unit_number" exists -- unexpected state';
    END IF;
END
$migration$;
