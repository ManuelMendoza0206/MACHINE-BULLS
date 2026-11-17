"""Pruebas unitarias para la evaluación Fill-In-The-Blank (FITB) (historias 86e3122ex, bcen)."""

from ml.validation.evaluate_fitb import evaluate_fitb


def test_evaluate_fitb_with_perfect_scorer():
    positions = ["top", "bottom", "footwear"]
    garments_pool = []
    outfits = []

    for i in range(20):
        outfit = []
        for p in positions:
            g = {"id": f"g_{i}_{p}", "position": p, "aesthetic": f"aes_{i}"}
            outfit.append(g)
            garments_pool.append(g)
        outfits.append(outfit)

    # Scorer perfecto que da 1.0 si comparten estética del outfit
    def perfect_scorer(partial: list[dict], cand: dict) -> float:
        matches = sum(1 for g in partial if g.get("aesthetic") == cand.get("aesthetic"))
        return float(matches)

    res = evaluate_fitb(outfits, perfect_scorer, garments_pool, num_distractors=3, seed=42)
    assert res["total_evaluated"] == 20
    assert res["fitb_accuracy"] >= 0.70
    assert res["threshold_passed"] is True


def test_evaluate_fitb_skips_outfits_with_insufficient_items():
    garments_pool = [{"id": "g1", "position": "top"}]
    outfits = [[{"id": "g1", "position": "top"}]]  # solo 1 prenda, no se puede ocultar una y tener parcial

    res = evaluate_fitb(outfits, lambda p, c: 1.0, garments_pool)
    assert res["total_evaluated"] == 0
    assert res["fitb_accuracy"] == 0.0
