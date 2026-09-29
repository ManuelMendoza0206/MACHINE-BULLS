"""GarmentOwnership N:1 sin duplicar Garment (AC gh)."""

from __future__ import annotations

import uuid

from sqlalchemy import text


def _user(db, email: str) -> str:
    uid = uuid.uuid4()
    db.execute(
        text("INSERT INTO auth.users (id, email) VALUES (:id, :email)"),
        {"id": str(uid), "email": email},
    )
    return str(uid)


def test_dos_usuarios_adoptan_misma_capsula(db) -> None:
    gid = uuid.uuid4()
    emb = "[" + ",".join(["0.1"] * 128) + "]"
    db.execute(
        text(
            'INSERT INTO "Garment" (id, image_url, processed_image_url, category, '
            "aesthetic_scores, dominant_colors_hsv, compatibility_embedding) "
            "VALUES (:id, 'http://x/a.jpg', 'http://x/b.jpg', 'tops', "
            "'[]', '[]', CAST(:emb AS vector))"
        ),
        {"id": str(gid), "emb": emb},
    )
    u1, u2 = _user(db, "a@x.com"), _user(db, "b@x.com")
    for u in (u1, u2):
        db.execute(
            text('INSERT INTO "GarmentOwnership" (user_id, garment_id, source) '
                 "VALUES (:u, :g, 'capsule')"),
            {"u": u, "g": str(gid)},
        )
    n_own = db.execute(
        text('SELECT count(*) FROM "GarmentOwnership" WHERE garment_id = :g'), {"g": str(gid)}
    ).scalar()
    n_gar = db.execute(
        text('SELECT count(*) FROM "Garment" WHERE id = :g'), {"g": str(gid)}
    ).scalar()
    assert n_own == 2
    assert n_gar == 1
