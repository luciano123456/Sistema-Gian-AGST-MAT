# SistemaGian.DataBaseScripts

Capa de scripts SQL. En Visual Studio: **SistemaGian.DataBaseScripts**.

## Web (Sistema_Gian)

Carpeta `Web/` — ejecutar sobre `Sistema_Gian` / `Sistema_Gian_Test`.

| Orden | Archivo | Descripción |
|------:|---------|-------------|
| 000 | `Web/000_Web_Aplicar_Todo.sql` | **Todo junto** (recomendado) |
| 001 | `Web/001_WebManagement.sql` | Config + productos publicados |
| 002 | `Web/002_WebOffersBanners.sql` | Ofertas + banners |
| 003 | `Web/003_WebProductImages.sql` | Galería JSON |
| 004 | `Web/004_WebHeroSlides.sql` | Carruseles Inicio / Catálogo |

Los archivos `20260816_*.sql` / `20260817_*.sql` de la raíz son los mismos (se dejan por compatibilidad).

## Recorridos

| Orden | Archivo | Descripción |
|------:|---------|-------------|
| 001 | `001_Recorridos_y_GeoClientes.sql` | Geo de clientes + tablas de Recorridos |
| 002 | `002_ProveedoresGeo_y_TipoDestinoRecorridos.sql` | Geo de proveedores + TipoDestino / TipoParada |
| 003 | `003_Recorridos_OmitirParada.sql` | Omitir parada |

## Convención

- Scripts idempotentes (`IF COL_LENGTH` / `IF NOT EXISTS`).
- No modificar scripts ya aplicados en producción: agregar uno nuevo.
