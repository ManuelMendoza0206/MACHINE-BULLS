# Prompts efectivos de CLIP

Generado por `notebooks/03_clip_zero_shot.ipynb`. Los templates de este documento
viven en `backend/src/ml/models/prompts.py` y la derivacion de pares y los
splits en `backend/src/ml/models/clip_classifier.py`. Ambos son la fuente de
verdad: el notebook importa de ahi y no redefine nada.

La ruta de esos modulos no es la que pide el manifiesto de
`garment-analysis-service` §6. La diferencia y su motivo estan en
`docs/adr/adr-sprint-4/ADR-401-clip-classifier-location.md`.

## Procedencia

- Modelo: `openai/clip-vit-base-patch32`
- Device: `cuda`; seed 42; kernels deterministas activos
- Dataset: `ArtmeScienceLab/Garments2Look`, metadatos `mytheresa_image_v1.0_2512.json` y `polyvore_image_v1.0_2512.json` (189.385 prendas catalogadas)
- Subset de imagenes: `polyvore/women`
- Etiquetado: `manual_label` a mano en los CSV de plantilla, foto por foto
- Pares imagen-texto: 12.000, derivados de los metadatos sin descargar imagenes (6,3% del catalogo)

## Como quedaron los splits

El reparto se hace agrupando por texto, no por `garment_id`. grouping por texto
impide que dos prendas con la descripcion identica caigan en splits distintos: con
seis pares de "Women's Dark Wash Skinny Jeans, Dark Blue pants" repartidos por ID,
el modelo puede memorizar la descripcion en train y cobrarla en val.

Los 12.000 pares cubren 11.865 textos distintos y quedan en 9.625 / 1.187 / 1.188
(80,2% / 9,9% / 9,9%). La estratificacion por tipo de prenda reparte los tipos
raros: un tipo con una sola prenda no puede estar en los tres splits, y si queda
entero en test el modelo no tiene forma de aprenderlo.

La validacion vive en `backend/src/ml/testing/test_clip_classifier.py`, que el job
`backend` de `.github/workflows/ci.yml` corre en cada push y PR. Si alguien
regenera los archivos con una fuga, el job cae.

Para regenerar los splits sin volver a bajar el catalogo gated:

```bash
cd backend
uv run python -m ml.models.clip_classifier --desde-pares ../sample_data --salida ../sample_data --seed 42
```

## Como se resuelve cada par a una imagen

Los pares son `{"garment_id": ..., "text": ...}`. La imagen no esta en el JSONL
porque son varios GB: los shards `.tar.gz` del dataset pesan gigabytes y no se
versionan. El vinculo es el `garment_id`, y tiene dos pasos:

1. El `garment_id` es el nombre del miembro dentro del shard. Los ids son del
   tipo `100002074_3`, con el sufijo de variante.
2. El notebook guarda cada foto como `clip_grueso/01_100002074_3.jpg`. El
   indice va adelante para que el `ls` coincida con el orden del CSV, y
   `parsear_nombre_imagen` (en `ml.metrics.zero_shot`) lo deshace.

Los shards se descubren en runtime con `list_repo_files` y se abren en streaming:
`_shards_de_imagenes` y `_descargar_shard` en el notebook. Por eso hace falta
`HF_TOKEN`: el repo `ArtmeScienceLab/Garments2Look` esta gated.

Un limite explicito: `parsear_nombre_imagen` parte por el primer guion bajo, asi
que asume que el `garment_id` tiene uno solo. Los ids del dataset cumplen, y hay
un test que fija ese supuesto en vez de dejarlo escondido.

## Configuracion del eval

Los dos niveles se diferencian por granularidad. La categoria funcional es la que
evalua `plan-base.md` 9.1; la subcategoria son subtipos dentro de una sola
categoria, mas dificiles y mas cerca del fine-tuning.

## Categoria funcional

- Fotos evaluadas: 30
- Categorias: 2
- Accuracy: 1.000 (IC95% [0.886, 1.000])
- F1 macro: 1.000
- top-3: 1.000
- Objetivo 0.82 de `plan-base.md` 9.1: el IC95% completo queda por encima, asi que se sostiene con esta muestra
- Ensemble de 3 prompts: +0.000 frente al prompt unico (0 arregla, 0 rompe). McNemar p=1.000, con n=30 no se distingue del prompt unico
- Exploratorio: confianza >= 0.718 da accuracy >= 0.82 sobre el 100% de las muestras. El umbral se ajusto sobre las mismas imagenes con las que se mide, asi que es una cota optimista y no un valor de produccion

### Distribucion

- shoe: 15
- bag: 15

### Confusiones mas frecuentes

Ninguna.

## Subcategoria (subtipo de bolso)

- Fotos evaluadas: 45
- Categorias: 10
- Accuracy: 0.511 (IC95% [0.370, 0.650])
- F1 macro: 0.510
- top-3: 0.733
- Objetivo 0.75 de `plan-base.md` 9.1: el IC95% entra bajo el objetivo, asi que con estos datos no se puede afirmar que se alcance
- Ensemble de 3 prompts: +0.044 frente al prompt unico (3 arregla, 1 rompe). McNemar p=0.625, con n=45 no se distingue del prompt unico
- Exploratorio: confianza >= 0.447 da accuracy >= 0.75 sobre el 38% de las muestras. El umbral se ajusto sobre las mismas imagenes con las que se mide, asi que es una cota optimista y no un valor de produccion

### Distribucion

- handbag: 9
- tote: 7
- clutch: 7
- satchel: 6
- crossbody: 5
- shoulder: 5
- backpack: 2
- bucket: 2
- duffel: 1
- boston: 1

### Confusiones mas frecuentes

- shoulder -> clutch (3x)
- satchel -> crossbody (2x)
- satchel -> handbag (2x)
- handbag -> crossbody (2x)
- tote -> handbag (2x)
- crossbody -> handbag (1x)
- backpack -> bucket (1x)
- bucket -> handbag (1x)

## Templates

Los templates van separados por nivel porque `bag` y `dress` necesitan
redacciones distintas. El ensemble promedia las distribuciones de las tres
redacciones de cada clase.

Categoria funcional:

```
a photo of a {c}
a studio product photo of a {c}
a product photo of a {c} for sale
```

Subcategoria (subtipo de bolso):

```
a photo of a {c} bag
a studio product photo of a {c} bag
a close-up photo of a {c} bag
```

## Figuras

Las figuras (galerias, accuracy por clase, curvas de calibracion) las dibuja el
notebook en `sample_data/figures/`, carpeta que esta gitignoreada a proposito por
peso. No se versionan, asi que este documento no las enlaza. Para verlas hay que
correr el notebook en una maquina con GPU.

## Como volver a correr la evaluacion

El AC de bccv pide un evaluation script ejecutable. Las metricas viven en
`backend/src/ml/metrics/zero_shot.py` y el notebook las importa de ahi en vez de
redefinirlas:

```bash
cd backend
uv run python -m ml.metrics.zero_shot \
  --fotos ../sample_data/clip_grueso \
  --etiquetas ../sample_data/clip_labels_grueso.csv \
  --nivel CATEGORIA \
  --salida ../sample_data/clip_eval_categoria.json
```

`wilson`, `macro_f1` y `mcnemar_exact` son stdlib puro y tienen tests en CI, que
incluyen una regresion contra los numeros de este documento: si cambia una
formula y el reporte deja de corresponder a lo que el codigo produce, esos tests
caen. La inferencia necesita GPU (torch y transformers); las metricas no.

El JSON de salida es material crudo. La lectura de estos numeros es de este
documento, escrita a mano a proposito: automatizar el juicio es lo que haria que
el reporte dejara de ser honesto.

## Como leer los numeros

Cada accuracy viene con su intervalo de confianza de Wilson. Con n=30 y n=45 los
intervalos son anchos, del orden de 11 y 28 puntos respectivamente, asi que el
punto estimado dice poco por si solo: lo que sostiene una conclusion es si el
intervalo completo queda del lado del objetivo.

La metrica que pide `plan-base.md` 9.1 es F1 macro, y sale distinta del accuracy
porque las clases estan desbalanceadas (handbag tiene 9 fotos y boston 1). Van las
dos por eso.

El umbral de confianza sale ajustado sobre las mismas imagenes con las que se
mide. Sirve para entender como se comporta el modelo y para dibujar la curva, no
como valor para produccion: para eso hay que ajustar el umbral en una particion y
medir cobertura y accuracy en otra que no se uso para elegirlo.

El ensemble de tres prompts se comparo contra el prompt unico con McNemar
pareado, que es el test que corresponde porque las dos configuraciones evaluan
las mismas imagenes. Cuando el p sale alto, la diferencia entre las dos no se
distingue del ruido de muestra y conviene reportar la mas simple.
