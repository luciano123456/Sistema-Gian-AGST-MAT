using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;

namespace SistemaGian.Application.Controllers;

[Authorize]
public class RecorridosController : Controller
{
    private readonly IRecorridosService _service;
    private readonly IUsuariosService _usuariosService;
    private readonly IConfiguration _config;

    public RecorridosController(IRecorridosService service, IUsuariosService usuariosService, IConfiguration config)
    {
        _service = service;
        _usuariosService = usuariosService;
        _config = config;
    }

    public async Task<IActionResult> Index(int? usuarioId)
    {
        ViewBag.GoogleMapsApiKey = _config["GoogleMaps:ApiKey"] ?? "";

        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        ViewBag.EsAdmin = user?.IdRol == 1;
        ViewBag.UsuarioSesionId = user?.Id ?? 0;
        ViewBag.VistaUsuarioId = 0;
        ViewBag.VistaUsuarioNombre = "";

        if (usuarioId is > 0 && user?.IdRol == 1)
        {
            var u = await _usuariosService.Obtener(usuarioId.Value);
            ViewBag.VistaUsuarioId = usuarioId.Value;
            ViewBag.VistaUsuarioNombre = u == null
                ? ("Usuario #" + usuarioId.Value)
                : $"{u.Nombre} {u.Apellido}".Trim();
        }

        return View();
    }

    private static bool EsAdmin(VMUser? user) => user?.IdRol == 1;

    private async Task<(bool ok, Recorrido? recorrido, IActionResult? error)> PuedeMutarRecorrido(int id, VMUser user)
    {
        var r = await _service.Obtener(id);
        if (r == null) return (false, null, NotFound(new { valor = false, mensaje = "Recorrido no encontrado" }));
        if (r.IdUsuario != user.Id)
            return (false, r, StatusCode(403, new { valor = false, mensaje = "Solo lectura: no podés modificar recorridos de otro usuario" }));
        return (true, r, null);
    }

    [HttpGet]
    public IActionResult ApiKey()
    {
        return Ok(new { apiKey = _config["GoogleMaps:ApiKey"] ?? "" });
    }

    [HttpGet]
    public async Task<IActionResult> Pendiente()
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Ok(new VMRecorridoPendiente { TienePendiente = false });

        var r = await _service.ObtenerPendiente(user.Id);
        if (r == null) return Ok(new VMRecorridoPendiente { TienePendiente = false });

        var paradas = (r.Paradas ?? new List<RecorridoParada>())
            .OrderBy(p => p.Orden)
            .ToList();
        var pendientes = paradas
            .Where(p => !string.Equals(p.EstadoParada, "Visitada", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(p.EstadoParada, "Omitida", StringComparison.OrdinalIgnoreCase))
            .ToList();
        var proxima = pendientes.FirstOrDefault();
        int? proximaId = proxima != null && proxima.Id > 0 ? proxima.Id : null;

        return Ok(new VMRecorridoPendiente
        {
            TienePendiente = true,
            Id = r.Id,
            Nombre = r.Nombre,
            Estado = r.Estado,
            CantidadParadas = paradas.Count,
            ParadasPendientes = pendientes.Count,
            ProximaParadaId = proximaId,
            ProximaParadaNombre = proxima?.NombreCliente,
            ProximaParadaTipo = proxima == null
                ? null
                : (string.IsNullOrWhiteSpace(proxima.TipoParada) ? "Cliente" : proxima.TipoParada),
            ProximaLat = proxima?.Latitud,
            ProximaLng = proxima?.Longitud
        });
    }

    [HttpGet]
    public async Task<IActionResult> Lista(int? usuarioId)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();

        var idLista = user.Id;
        if (usuarioId is > 0 && EsAdmin(user))
            idLista = usuarioId.Value;
        else if (usuarioId is > 0 && !EsAdmin(user))
            return StatusCode(403, new { mensaje = "No autorizado" });

        var lista = await _service.ListarPorUsuario(idLista);
        return Ok(lista.Select(MapRecorrido).ToList());
    }

    [HttpGet]
    public async Task<IActionResult> Obtener(int id)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();

        var r = await _service.Obtener(id);
        if (r == null) return NotFound();
        if (r.IdUsuario != user.Id && !EsAdmin(user))
            return StatusCode(403, new { mensaje = "No autorizado" });

        return Ok(MapRecorrido(r));
    }

    [HttpGet]
    public async Task<IActionResult> ResumenVisitas(string tipo = "Cliente")
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();
        if (!EsAdmin(user)) return StatusCode(403, new { mensaje = "Solo administradores" });

        var tipoNorm = string.Equals(tipo, "Proveedor", StringComparison.OrdinalIgnoreCase) ? "Proveedor" : "Cliente";
        var data = await _service.ResumenVisitas(tipoNorm);
        return Ok(data.Select(x => new VMResumenVisitas
        {
            Id = x.Id,
            Dias7 = x.Dias7,
            Dias15 = x.Dias15,
            Dias30 = x.Dias30
        }).ToList());
    }

    [HttpGet]
    public async Task<IActionResult> SinVisitaReciente(string tipo = "Cliente", int dias = 30)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();

        var tipoNorm = string.Equals(tipo, "Proveedor", StringComparison.OrdinalIgnoreCase) ? "Proveedor" : "Cliente";
        var umbral = dias <= 0 ? 30 : dias;
        var ahora = DateTime.Now;
        var data = await _service.SinVisitaReciente(tipoNorm, umbral);

        var items = data.Select(x =>
        {
            var nunca = !x.UltimaVisita.HasValue;
            int? diasSin = null;
            if (x.UltimaVisita.HasValue)
                diasSin = Math.Max(0, (int)Math.Floor((ahora - x.UltimaVisita.Value).TotalDays));

            return new VMSinVisitaReciente
            {
                Id = x.Id,
                Nombre = x.Nombre,
                Direccion = x.Direccion,
                Localidad = x.Localidad,
                Telefono = x.Telefono,
                UltimaVisita = x.UltimaVisita,
                DiasSinVisita = diasSin,
                NuncaVisitado = nunca
            };
        }).ToList();

        return Ok(new VMSinVisitaResumen
        {
            Tipo = tipoNorm,
            DiasUmbral = umbral,
            Cantidad = items.Count,
            Items = items
        });
    }

    [HttpGet]
    public async Task<IActionResult> ClientesMapa()
    {
        // Compat: solo clientes
        var clientes = await _service.ClientesConUbicacion();
        return Ok(clientes.Select(c => new VMPuntoMapa
        {
            Id = c.Id,
            Tipo = "Cliente",
            Nombre = c.Nombre,
            Telefono = c.Telefono,
            Direccion = c.Direccion,
            DireccionMaps = c.DireccionMaps,
            Localidad = c.Localidad,
            Provincia = c.IdProvinciaNavigation?.Nombre,
            Latitud = c.Latitud ?? 0,
            Longitud = c.Longitud ?? 0
        }).ToList());
    }

    [HttpGet]
    public async Task<IActionResult> PuntosMapa(string? tipo = "Ambos")
    {
        tipo = string.IsNullOrWhiteSpace(tipo) ? "Ambos" : tipo.Trim();
        var lista = new List<VMPuntoMapa>();

        if (tipo is "Clientes" or "Ambos")
        {
            var clientes = await _service.ClientesConUbicacion();
            lista.AddRange(clientes.Select(c => new VMPuntoMapa
            {
                Id = c.Id,
                Tipo = "Cliente",
                Nombre = c.Nombre,
                Telefono = c.Telefono,
                Direccion = c.Direccion,
                DireccionMaps = c.DireccionMaps,
                Localidad = c.Localidad,
                Provincia = c.IdProvinciaNavigation?.Nombre,
                Latitud = c.Latitud ?? 0,
                Longitud = c.Longitud ?? 0
            }));
        }

        if (tipo is "Proveedores" or "Ambos")
        {
            var proveedores = await _service.ProveedoresConUbicacion();
            lista.AddRange(proveedores.Select(p => new VMPuntoMapa
            {
                Id = p.Id,
                Tipo = "Proveedor",
                Nombre = p.Nombre,
                Apodo = p.Apodo,
                Telefono = p.Telefono,
                Direccion = p.Ubicacion,
                DireccionMaps = p.DireccionMaps,
                Latitud = p.Latitud ?? 0,
                Longitud = p.Longitud ?? 0
            }));
        }

        return Ok(lista.OrderBy(x => x.Nombre).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Guardar([FromBody] VMRecorridoGuardar model)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();
        if (model == null || string.IsNullOrWhiteSpace(model.Nombre))
            return BadRequest(new { mensaje = "Nombre requerido" });

        if (model.Id > 0)
        {
            var (okMutar, existenteMut, errMut) = await PuedeMutarRecorrido(model.Id, user);
            if (!okMutar) return errMut!;
            if (string.Equals(existenteMut!.Estado, "Finalizado", StringComparison.OrdinalIgnoreCase)
                || string.Equals(existenteMut.Estado, "Cancelado", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { valor = false, mensaje = "Este recorrido ya está cerrado y no se puede modificar" });
        }

        // Máximo 1 recorrido en curso: no crear otro mientras haya uno activo
        if (model.Id <= 0)
        {
            var enCurso = await _service.ObtenerEnCurso(user.Id);
            if (enCurso != null)
                return BadRequest(new { valor = false, mensaje = "Ya tenés un recorrido en curso. Finalizalo antes de crear otro." });
        }

        var tipoDestino = NormalizarTipoDestino(model.TipoDestino);

        // No degradar un recorrido en curso a borrador por un guardado parcial del cliente
        var estado = string.IsNullOrWhiteSpace(model.Estado) ? "Borrador" : model.Estado;
        if (model.Id > 0)
        {
            var existente = await _service.Obtener(model.Id);
            if (existente != null &&
                string.Equals(existente.Estado, "EnCurso", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(estado, "Borrador", StringComparison.OrdinalIgnoreCase))
            {
                estado = "EnCurso";
            }
        }

        var recorrido = new Recorrido
        {
            Id = model.Id,
            IdUsuario = user.Id,
            Nombre = model.Nombre.Trim(),
            Estado = estado,
            TipoDestino = tipoDestino,
            OrigenLat = model.OrigenLat,
            OrigenLng = model.OrigenLng,
            OrigenDireccion = model.OrigenDireccion,
            DistanciaMetros = model.DistanciaMetros,
            DuracionSegundos = model.DuracionSegundos,
            Observaciones = model.Observaciones
        };

        var paradas = (model.Paradas ?? new List<VMRecorridoParada>())
            .Select((p, i) =>
            {
                var tipo = string.Equals(p.TipoParada, "Proveedor", StringComparison.OrdinalIgnoreCase)
                    ? "Proveedor" : "Cliente";
                return new RecorridoParada
                {
                    IdCliente = tipo == "Cliente" ? p.IdCliente : null,
                    IdProveedor = tipo == "Proveedor" ? p.IdProveedor : null,
                    TipoParada = tipo,
                    Orden = p.Orden > 0 ? p.Orden : i + 1,
                    NombreCliente = p.NombreCliente,
                    Direccion = p.Direccion,
                    Latitud = p.Latitud,
                    Longitud = p.Longitud,
                    EstadoParada = string.IsNullOrWhiteSpace(p.EstadoParada) ? "Pendiente" : p.EstadoParada,
                    FechaVisitada = p.FechaVisitada,
                    FechaOmitida = p.FechaOmitida,
                    Notas = p.Notas
                };
            }).ToList();

        var evento = model.Id > 0 ? "Actualizado" : "Creado";
        var saved = await _service.Guardar(recorrido, paradas, evento, $"{evento} recorrido '{recorrido.Nombre}' con {paradas.Count} paradas");
        return Ok(new { valor = true, id = saved.Id });
    }

    [HttpPost]
    public async Task<IActionResult> Iniciar(int id)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();

        var (okMutar, _, errMut) = await PuedeMutarRecorrido(id, user);
        if (!okMutar) return errMut!;

        var enCurso = await _service.ObtenerEnCurso(user.Id);
        if (enCurso != null && enCurso.Id != id)
            return BadRequest(new { valor = false, mensaje = "Ya tenés un recorrido en curso. Finalizalo antes de iniciar otro." });

        var ok = await _service.ActualizarEstado(id, "EnCurso", DateTime.Now, null);
        if (ok) await _service.RegistrarEvento(id, user.Id, "Iniciado", "Recorrido iniciado");
        return Ok(new { valor = ok });
    }

    [HttpPost]
    public async Task<IActionResult> Finalizar(int id)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();

        var (okMutar, _, errMut) = await PuedeMutarRecorrido(id, user);
        if (!okMutar) return errMut!;

        var ok = await _service.ActualizarEstado(id, "Finalizado", null, DateTime.Now);
        if (ok) await _service.RegistrarEvento(id, user.Id, "Finalizado", "Recorrido finalizado");
        return Ok(new { valor = ok });
    }

    [HttpPost]
    public async Task<IActionResult> Cancelar(int id)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();

        var (okMutar, _, errMut) = await PuedeMutarRecorrido(id, user);
        if (!okMutar) return errMut!;

        var ok = await _service.ActualizarEstado(id, "Cancelado", null, DateTime.Now);
        if (ok) await _service.RegistrarEvento(id, user.Id, "Cancelado", "Recorrido cancelado");
        return Ok(new { valor = ok });
    }

    [HttpPost]
    public async Task<IActionResult> Eliminar(int id)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();
        if (!EsAdmin(user))
            return StatusCode(403, new { valor = false, mensaje = "Solo el administrador puede eliminar recorridos" });

        var r = await _service.Obtener(id);
        if (r == null) return NotFound(new { valor = false, mensaje = "Recorrido no encontrado" });

        var estado = r.Estado ?? "";
        var ok = await _service.Eliminar(id);
        if (ok)
        {
            await _service.RegistrarEvento(null, user.Id, "Eliminado",
                $"Admin eliminó recorrido #{id} «{r.Nombre}» ({estado})");
        }
        return Ok(new { valor = ok, estado });
    }

    [HttpPost]
    public async Task<IActionResult> MarcarParada(int idParada, string estado, string? notas = null)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();

        var estadoNorm = (estado ?? "").Trim();
        if (!string.Equals(estadoNorm, "Visitada", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(estadoNorm, "Omitida", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(estadoNorm, "Pendiente", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { valor = false, mensaje = "Estado inválido" });

        if (string.Equals(estadoNorm, "Omitida", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrWhiteSpace(notas))
            return BadRequest(new { valor = false, mensaje = "Indicá una observación para omitir" });

        // Validar ownership
        var parada = await _service.ObtenerParada(idParada);
        if (parada == null) return NotFound(new { valor = false, mensaje = "Parada no encontrada" });
        var recorrido = await _service.Obtener(parada.IdRecorrido);
        if (recorrido == null || recorrido.IdUsuario != user.Id)
            return StatusCode(403, new { valor = false, mensaje = "No autorizado" });
        if (!string.Equals(recorrido.Estado, "EnCurso", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { valor = false, mensaje = "El recorrido no está en curso" });

        var ok = await _service.ActualizarParadaEstado(idParada, estadoNorm, notas);
        if (!ok) return Ok(new { valor = false });

        await _service.RegistrarEvento(recorrido.Id, user.Id, "Parada",
            $"Parada {idParada} → {estadoNorm}" + (!string.IsNullOrWhiteSpace(notas) ? $": {notas}" : ""));

        // Si no quedan pendientes, finalizar
        var actualizado = await _service.Obtener(recorrido.Id);
        var quedan = (actualizado?.Paradas ?? new List<RecorridoParada>())
            .Any(p => !string.Equals(p.EstadoParada, "Visitada", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(p.EstadoParada, "Omitida", StringComparison.OrdinalIgnoreCase));
        var finalizado = false;
        if (!quedan)
        {
            finalizado = await _service.ActualizarEstado(recorrido.Id, "Finalizado", null, DateTime.Now);
            if (finalizado)
                await _service.RegistrarEvento(recorrido.Id, user.Id, "Finalizado", "Recorrido finalizado automáticamente");
        }

        return Ok(new { valor = true, finalizado, pendientesRestantes = quedan ? 1 : 0 });
    }

    private static string NormalizarTipoDestino(string? tipo)
    {
        return tipo switch
        {
            "Proveedores" => "Proveedores",
            "Ambos" => "Ambos",
            _ => "Clientes"
        };
    }

    private static VMRecorrido MapRecorrido(Recorrido r) => new()
    {
        Id = r.Id,
        IdUsuario = r.IdUsuario,
        Nombre = r.Nombre,
        Estado = r.Estado,
        TipoDestino = string.IsNullOrWhiteSpace(r.TipoDestino) ? "Clientes" : r.TipoDestino,
        FechaCreacion = r.FechaCreacion,
        FechaInicio = r.FechaInicio,
        FechaFin = r.FechaFin,
        OrigenLat = r.OrigenLat,
        OrigenLng = r.OrigenLng,
        OrigenDireccion = r.OrigenDireccion,
        DistanciaMetros = r.DistanciaMetros,
        DuracionSegundos = r.DuracionSegundos,
        Observaciones = r.Observaciones,
        CantidadParadas = r.Paradas?.Count ?? 0,
        Paradas = (r.Paradas ?? new List<RecorridoParada>())
            .OrderBy(p => p.Orden)
            .Select(p => new VMRecorridoParada
            {
                Id = p.Id,
                IdCliente = p.IdCliente,
                IdProveedor = p.IdProveedor,
                TipoParada = string.IsNullOrWhiteSpace(p.TipoParada) ? "Cliente" : p.TipoParada,
                Orden = p.Orden,
                NombreCliente = p.NombreCliente,
                Direccion = p.Direccion,
                Latitud = p.Latitud,
                Longitud = p.Longitud,
                EstadoParada = p.EstadoParada,
                FechaVisitada = p.FechaVisitada,
                FechaOmitida = p.FechaOmitida,
                Notas = p.Notas
            }).ToList()
    };
}
