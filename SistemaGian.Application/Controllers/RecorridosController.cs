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
    private readonly IConfiguration _config;

    public RecorridosController(IRecorridosService service, IConfiguration config)
    {
        _service = service;
        _config = config;
    }

    public IActionResult Index()
    {
        ViewBag.GoogleMapsApiKey = _config["GoogleMaps:ApiKey"] ?? "";
        return View();
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
            .Where(p => !string.Equals(p.EstadoParada, "Visitada", StringComparison.OrdinalIgnoreCase))
            .ToList();
        var proxima = pendientes.FirstOrDefault();

        return Ok(new VMRecorridoPendiente
        {
            TienePendiente = true,
            Id = r.Id,
            Nombre = r.Nombre,
            Estado = r.Estado,
            CantidadParadas = paradas.Count,
            ParadasPendientes = pendientes.Count,
            ProximaParadaNombre = proxima?.NombreCliente,
            ProximaParadaTipo = string.IsNullOrWhiteSpace(proxima?.TipoParada) ? "Cliente" : proxima!.TipoParada,
            ProximaLat = proxima?.Latitud,
            ProximaLng = proxima?.Longitud
        });
    }

    [HttpGet]
    public async Task<IActionResult> Lista()
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();

        var lista = await _service.ListarPorUsuario(user.Id);
        return Ok(lista.Select(MapRecorrido).ToList());
    }

    [HttpGet]
    public async Task<IActionResult> Obtener(int id)
    {
        var r = await _service.Obtener(id);
        if (r == null) return NotFound();
        return Ok(MapRecorrido(r));
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

        var ok = await _service.ActualizarEstado(id, "Finalizado", null, DateTime.Now);
        if (ok) await _service.RegistrarEvento(id, user.Id, "Finalizado", "Recorrido finalizado");
        return Ok(new { valor = ok });
    }

    [HttpPost]
    public async Task<IActionResult> Cancelar(int id)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();

        var ok = await _service.ActualizarEstado(id, "Cancelado", null, DateTime.Now);
        if (ok) await _service.RegistrarEvento(id, user.Id, "Cancelado", "Recorrido cancelado");
        return Ok(new { valor = ok });
    }

    [HttpPost]
    public async Task<IActionResult> MarcarParada(int idParada, string estado)
    {
        var user = await SessionHelper.GetUsuarioSesion(HttpContext);
        if (user == null) return Unauthorized();

        var ok = await _service.ActualizarParadaEstado(idParada, estado);
        if (ok) await _service.RegistrarEvento(null, user.Id, "Parada", $"Parada {idParada} → {estado}");
        return Ok(new { valor = ok });
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
