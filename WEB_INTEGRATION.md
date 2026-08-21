# Integración segura Gestión → AGS MAT Web

## Modelo de seguridad

`SistemaGian.Application` es la única fuente de verdad. La web pública mantiene
su propia base de datos y consume una proyección publicada; no comparte base de
datos, cookies, sesiones, usuarios ni acceso a los controladores internos de
Gestión.

El navegador del cliente solo habla con la Web pública. El único canal entre
aplicaciones es:

```text
Gestión > Web > Publicar
  └─ HTTPS POST firmado (HMAC SHA-256) ──> Web /internal/sync/catalog
```

La publicación contiene exclusivamente:

- configuración pública: nombre, textos, colores, WhatsApp, políticas;
- productos marcados para publicar, categoría, precio público, imagen y modelo 3D.

Nunca incluye costos, proveedores, clientes, stock operativo, pedidos internos,
usuarios ni contraseñas.

## Repositorio

La Web pública vive en un proyecto aparte (no dentro de Gestión):

- Local: `C:\Users\Luciano\source\repos\SistemaAgsMat.Web`
- GitHub: https://github.com/luciano123456/SistemaAgsMatWeb

## Instalación

1. Ejecutar sobre `Sistema_Gian` (uno solo alcanza):
   - `SistemaGian.DataBaseScripts/Web/000_Web_Aplicar_Todo.sql`
2. Ejecutar el esquema de la web sobre `Sistema_AgsMat_Web`:
   - `SistemaAgsMat.DatabaseScripts/Publica/001_Create_Database.sql`
   - `SistemaAgsMat.DatabaseScripts/Publica/002_Schema_Complete.sql`
3. En desarrollo local el secreto compartido se guarda con **user-secrets** en ambos
   proyectos (no viaja al repositorio):

```powershell
dotnet user-secrets set "WebIntegration:SyncSecret" "<secreto>" --project SistemaGian.Application
dotnet user-secrets set "SyncSecurity:Secret" "<mismo-secreto>" --project ..\SistemaAgsMat.Web\SistemaAgsMat.Web
```

   En servidores, alternativamente, crear **la misma** variable de entorno de máquina:

```powershell
[Environment]::SetEnvironmentVariable(
  "AGS_WEB_SYNC_SECRET",
  "<generar-secreto-aleatorio-de-64-o-mas-caracteres>",
  "Machine"
)
```

4. En Gestión configurar `WebIntegration:PublicSiteSyncUrl` con la URL HTTPS
   real de la Web:

```json
"WebIntegration": {
  "PublicSiteSyncUrl": "https://web.agsmat.com.ar/internal/sync/catalog"
}
```

5. En la Web, opcionalmente completar `SyncSecurity:AllowedSourceIps` con las
   IPs públicas del servidor de Gestión.

## Controles implementados

- HMAC SHA-256 y comparación en tiempo constante.
- Ventana máxima de cinco minutos para el timestamp.
- Rechazo de la misma publicación firmada dentro de la ventana (antireplay).
- Rate limit del endpoint interno.
- HTTPS, HSTS en producción y headers CSP / no-sniff / referrer-policy.
- Sin endpoints públicos de administración, productos o configuración.
- Auditoría local de cada publicación aplicada.

## Operación

Desde `Home > Web` en Gestión:

1. Guardar textos, colores y WhatsApp.
2. Marcar productos como publicados y definir precio público.
3. Presionar **Publicar cambios en la Web**.

El botón no expone ninguna credencial en el navegador: la firma se crea
únicamente en el servidor de Gestión.
