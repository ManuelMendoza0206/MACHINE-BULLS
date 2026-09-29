"""Trigger G5 (spec §2.4 + AC g5): éxito crea User idéntico; fallo en User
revierte también el INSERT en auth.users (rollback transaccional)."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


def test_signup_crea_fila_user_identica(db, auth_user) -> None:
    row = db.execute(
        text('SELECT id, email, name FROM "User" WHERE id = :id'), {"id": str(auth_user)}
    ).one()
    assert str(row[0]) == str(auth_user)
    assert "@x.com" in row[1]


def test_fallo_en_user_revierte_signup_completo(db) -> None:
    uid = uuid.uuid4()
    db.execute(
        text('INSERT INTO "User" (id, email) VALUES (:id, :email)'),
        {"id": str(uid), "email": "dupe@x.com"},
    )
    anidada = db.begin_nested()
    with pytest.raises(IntegrityError):
        db.execute(
            text("INSERT INTO auth.users (id, email) VALUES (:id, :email)"),
            {"id": str(uid), "email": "otro@x.com"},
        )
    anidada.rollback()
    n = db.execute(
        text("SELECT count(*) FROM auth.users WHERE email = 'otro@x.com'")
    ).scalar()
    assert n == 0
