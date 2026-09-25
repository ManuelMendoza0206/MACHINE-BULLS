"""Framework de evaluación multilabel (historia bccz). Stdlib puro, sin sklearn.

Exact-match accuracy, precisión/recall/F1 micro y macro, matriz de
confusión (muestras mono-etiqueta) y reportes JSON + HTML.
"""

from __future__ import annotations

import html
import json
from collections.abc import Hashable
from pathlib import Path


def _safe_div(num: float, den: float) -> float:
    return num / den if den else 0.0


class Evaluator:
    """Acumula pares (true, pred) como conjuntos de etiquetas."""

    def __init__(self) -> None:
        self._pairs: list[tuple[frozenset, frozenset]] = []

    def update(self, y_true: list, y_pred: list) -> None:
        """Agrega un batch. Cada elemento es iterable de etiquetas hashables."""
        if len(y_true) != len(y_pred):
            raise ValueError(f"y_true ({len(y_true)}) e y_pred ({len(y_pred)}) difieren en largo")
        for t, p in zip(y_true, y_pred):
            self._pairs.append((frozenset(t), frozenset(p)))

    def __len__(self) -> int:
        return len(self._pairs)

    def accuracy(self) -> float:
        """Exact-match ratio."""
        if not self._pairs:
            return 0.0
        return sum(1 for t, p in self._pairs if t == p) / len(self._pairs)

    def _binary_counts(self) -> dict[Hashable, dict[str, int]]:
        counts: dict[Hashable, dict[str, int]] = {}
        for t, p in self._pairs:
            for label in t | p:
                c = counts.setdefault(label, {"tp": 0, "fp": 0, "fn": 0})
                if label in t and label in p:
                    c["tp"] += 1
                elif label in p:
                    c["fp"] += 1
                else:
                    c["fn"] += 1
        return counts

    @staticmethod
    def _prf(tp: int, fp: int, fn: int) -> dict[str, float]:
        precision = _safe_div(tp, tp + fp)
        recall = _safe_div(tp, tp + fn)
        f1 = _safe_div(2 * precision * recall, precision + recall)
        return {"precision": precision, "recall": recall, "f1": f1}

    def per_class(self) -> dict[Hashable, dict[str, float]]:
        out: dict[Hashable, dict[str, float]] = {}
        for label, c in self._binary_counts().items():
            out[label] = {"support": c["tp"] + c["fn"], **self._prf(c["tp"], c["fp"], c["fn"])}
        return out

    def micro(self) -> dict[str, float]:
        tp = fp = fn = 0
        for c in self._binary_counts().values():
            tp += c["tp"]
            fp += c["fp"]
            fn += c["fn"]
        return {"support": tp + fn, **self._prf(tp, fp, fn)}

    def macro(self) -> dict[str, float]:
        per = list(self.per_class().values())
        if not per:
            return {"precision": 0.0, "recall": 0.0, "f1": 0.0, "n_classes": 0}
        n = len(per)
        return {
            "precision": sum(m["precision"] for m in per) / n,
            "recall": sum(m["recall"] for m in per) / n,
            "f1": sum(m["f1"] for m in per) / n,
            "n_classes": n,
        }

    def confusion_matrix(self) -> dict[str, dict[str, int]]:
        """Conteo true×pred solo en muestras mono-etiqueta de ambos lados."""
        matrix: dict[str, dict[str, int]] = {}
        for t, p in self._pairs:
            if len(t) == 1 and len(p) == 1:
                row = matrix.setdefault(next(iter(t)), {})
                row[next(iter(p))] = row.get(next(iter(p)), 0) + 1
        return matrix

    def to_dict(self) -> dict:
        return {
            "n": len(self),
            "accuracy": self.accuracy(),
            "micro": self.micro(),
            "macro": self.macro(),
            "per_class": {str(k): v for k, v in self.per_class().items()},
            "confusion_matrix": self.confusion_matrix(),
        }

    def report_json(self, path: str | Path) -> Path:
        p = Path(path)
        p.write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")
        return p

    def report_html(self, path: str | Path) -> Path:
        d = self.to_dict()
        rows = "".join(
            f"<tr><td>{html.escape(str(k))}</td><td>{v['precision']:.4f}</td>"
            f"<td>{v['recall']:.4f}</td><td>{v['f1']:.4f}</td><td>{v['support']}</td></tr>"
            for k, v in sorted(d["per_class"].items())
        )
        page = (
            "<html><head><meta charset='utf-8'><title>Eval report</title></head><body>"
            f"<h1>Eval report (n={d['n']}, accuracy={d['accuracy']:.4f})</h1>"
            f"<h2>Micro: P={d['micro']['precision']:.4f} R={d['micro']['recall']:.4f} "
            f"F1={d['micro']['f1']:.4f}</h2>"
            f"<h2>Macro: P={d['macro']['precision']:.4f} R={d['macro']['recall']:.4f} "
            f"F1={d['macro']['f1']:.4f} ({d['macro']['n_classes']} clases)</h2>"
            "<table border='1'><tr><th>clase</th><th>P</th><th>R</th><th>F1</th><th>support</th></tr>"
            f"{rows}</table>"
            "</body></html>"
        )
        p = Path(path)
        p.write_text(page, encoding="utf-8")
        return p
