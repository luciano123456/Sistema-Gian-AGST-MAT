# SistemaGian.DataBaseScripts

Capa de scripts SQL del sistema. Ejecutarlos en orden sobre la base (`Sistema_Gian` / `Sistema_Gian_Test`).

## Scripts

| Orden | Archivo | Descripción |
|------:|---------|-------------|
| 001 | `001_Recorridos_y_GeoClientes.sql` | Geo de clientes + tablas de Recorridos |
| 002 | `002_ProveedoresGeo_y_TipoDestinoRecorridos.sql` | Geo de proveedores + TipoDestino / TipoParada |
| 003 | `003_Recorridos_OmitirParada.sql` | Omitir parada (`FechaOmitida`, `Notas` ampliado) |

## Convención

- Prefijo numérico `001_`, `002_`, … para orden de ejecución.
- Scripts idempotentes cuando sea posible (`IF COL_LENGTH` / `IF NOT EXISTS`).
- No modificar scripts ya aplicados en producción: agregar uno nuevo.
