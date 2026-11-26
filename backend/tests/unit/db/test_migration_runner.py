from __future__ import annotations

import pytest

from scripts.apply_migrations import migration_actions


def test_fresh_database_schedules_every_migration() -> None:
    actions = migration_actions(
        {"0001_initial.sql": "a", "0002_more.sql": "b"}, {}, legacy_state="empty"
    )
    assert actions == [("apply", "0001_initial.sql", "a"), ("apply", "0002_more.sql", "b")]


def test_complete_legacy_schema_is_adopted_without_replaying_sql() -> None:
    actions = migration_actions(
        {"0001_initial.sql": "a", "0002_more.sql": "b"}, {}, legacy_state="complete"
    )
    assert actions == [("adopt", "0001_initial.sql", "a"), ("adopt", "0002_more.sql", "b")]


def test_partial_legacy_schema_fails_without_migration_actions() -> None:
    with pytest.raises(RuntimeError, match="incompleto"):
        migration_actions({"0001_initial.sql": "a"}, {}, legacy_state="partial")


def test_applied_migration_hash_must_match_current_file() -> None:
    with pytest.raises(RuntimeError, match="checksum"):
        migration_actions({"0001_initial.sql": "new"}, {"0001_initial.sql": "old"}, legacy_state="empty")


def test_runner_applies_only_unrecorded_migrations() -> None:
    actions = migration_actions(
        {"0001_initial.sql": "a", "0002_more.sql": "b"},
        {"0001_initial.sql": "a"},
        legacy_state="empty",
    )
    assert actions == [("apply", "0002_more.sql", "b")]
