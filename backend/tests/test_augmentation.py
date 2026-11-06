"""Pruebas unitarias para el módulo de aumentación y anti-fuga (historias bccy, bcd5, bcd7)."""

from PIL import Image

from ml.augmentation import aplicar_aumentacion_pil, calcular_pesos_balanceo, verificar_splits_anti_fuga


def test_verificar_splits_detecta_splits_limpios():
    train = [{"garment_id": "g1"}, {"garment_id": "g2"}]
    val = [{"garment_id": "g3"}]
    test = [{"garment_id": "g4"}]

    is_clean, stats = verificar_splits_anti_fuga(train, val, test)
    assert is_clean is True
    assert stats["train_val_overlap"] == 0
    assert stats["train_test_overlap"] == 0
    assert stats["val_test_overlap"] == 0


def test_verificar_splits_detecta_fuga_de_datos():
    train = [{"garment_id": "g1"}, {"garment_id": "g2"}]
    val = [{"garment_id": "g2"}]  # g2 se fuga entre train y val
    test = [{"garment_id": "g3"}]

    is_clean, stats = verificar_splits_anti_fuga(train, val, test)
    assert is_clean is False
    assert stats["train_val_overlap"] == 1


def test_calcular_pesos_balanceo_pondera_inversamente():
    labels = ["casual", "casual", "casual", "formal"]
    weights = calcular_pesos_balanceo(labels)
    # "formal" es minoritaria (1/4), debe recibir mayor peso que "casual" (3/4)
    assert weights["formal"] > weights["casual"]
    assert weights["formal"] == 2.0  # 4 / (2 * 1)
    assert abs(weights["casual"] - (4 / (2 * 3))) < 1e-4


def test_aplicar_aumentacion_pil_conserva_tamano():
    img = Image.new("RGB", (224, 224), color=(200, 100, 50))
    augmented = aplicar_aumentacion_pil(img, seed=42)
    assert augmented.size == (224, 224)
    assert augmented.mode == "RGB"
