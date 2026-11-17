"""Pruebas unitarias para el adaptador de compatibilidad estética (historias bcdj, bcdr)."""

import torch

from ml.models.adapter import AestheticProjectionHead, ContrastiveCompatibilityLoss


def test_adapter_output_shapes_and_normalization():
    batch_size = 4
    input_dim = 512
    head = AestheticProjectionHead(input_dim=input_dim, hidden_dim=256, output_dim=128, num_aesthetics=12)

    x = torch.randn(batch_size, input_dim)
    embeddings, logits = head(x)

    assert embeddings.shape == (batch_size, 128)
    assert logits.shape == (batch_size, 12)

    # Verificar que los embeddings están normalizados en norma L2
    norms = torch.norm(embeddings, p=2, dim=-1)
    assert torch.allclose(norms, torch.ones(batch_size), atol=1e-4)


def test_contrastive_loss_decreases_for_similar_pairs():
    criterion = ContrastiveCompatibilityLoss(temperature=0.1)

    # Caso 1: embeddings idénticos (loss mínimo)
    emb_a = torch.randn(4, 128)
    loss_identical = criterion(emb_a, emb_a)

    # Caso 2: embeddings aleatorios (loss mayor)
    emb_b = torch.randn(4, 128)
    loss_random = criterion(emb_a, emb_b)

    assert loss_identical.item() < loss_random.item()
