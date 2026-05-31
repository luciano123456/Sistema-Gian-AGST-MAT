using Microsoft.EntityFrameworkCore;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.DAL.Repository;

public class ReportesRepository : IReportesRepository
{
    /// <summary>Rango válido de SQL Server <c>datetime</c>.</summary>
    private static readonly DateTime SqlDateTimeMin = new(1753, 1, 1);
    private static readonly DateTime SqlDateTimeMax = new(9999, 12, 31, 23, 59, 59);

    private readonly SistemaGianContext _db;

    public ReportesRepository(SistemaGianContext db)
    {
        _db = db;
    }

    public async Task<List<ReporteCatalogoItemDto>> ListarClientesAsync()
    {
        return await _db.Clientes.AsNoTracking()
            .OrderBy(c => c.Nombre)
            .Select(c => new ReporteCatalogoItemDto { Id = c.Id, Nombre = c.Nombre })
            .ToListAsync();
    }

    public async Task<List<ReporteCatalogoItemDto>> ListarProveedoresAsync()
    {
        return await _db.Proveedores.AsNoTracking()
            .OrderBy(p => p.Nombre)
            .Select(p => new ReporteCatalogoItemDto { Id = p.Id, Nombre = p.Nombre })
            .ToListAsync();
    }

    public async Task<List<ReporteCatalogoItemDto>> ListarProductosAsync()
    {
        return await _db.Productos.AsNoTracking()
            .OrderBy(p => p.Descripcion)
            .Select(p => new ReporteCatalogoItemDto { Id = p.Id, Nombre = p.Descripcion ?? $"Producto {p.Id}" })
            .ToListAsync();
    }

    public async Task<List<ReporteCatalogoItemDto>> ListarProductosEvolucionAsync(List<int> idClientes, List<int> idProveedores)
    {
        var clientes = idClientes?.Where(x => x > 0).Distinct().ToList() ?? new List<int>();
        var proveedores = idProveedores?.Where(x => x > 0).Distinct().ToList() ?? new List<int>();
        HashSet<int>? ids = null;

        if (clientes.Count > 0)
        {
            var porCliente = await _db.ProductosPreciosClientes.AsNoTracking()
                .Where(x => clientes.Contains(x.IdCliente))
                .Select(x => x.IdProducto)
                .Distinct()
                .ToListAsync();
            ids = porCliente.ToHashSet();
        }

        if (proveedores.Count > 0)
        {
            var porProveedor = await _db.ProductosPreciosProveedores.AsNoTracking()
                .Where(x => proveedores.Contains(x.IdProveedor))
                .Select(x => x.IdProducto)
                .Distinct()
                .ToListAsync();

            var porProducto = await _db.Productos.AsNoTracking()
                .Where(p => p.IdProveedor != null && proveedores.Contains(p.IdProveedor.Value))
                .Select(p => p.Id)
                .ToListAsync();

            var unionProv = porProveedor.Union(porProducto).ToHashSet();
            ids = ids == null ? unionProv : ids.Intersect(unionProv).ToHashSet();
        }

        if (ids != null && ids.Count == 0)
            return new List<ReporteCatalogoItemDto>();

        var q = _db.Productos.AsNoTracking();
        if (ids != null)
            q = q.Where(p => ids.Contains(p.Id));

        return await q
            .OrderBy(p => p.Descripcion)
            .Select(p => new ReporteCatalogoItemDto { Id = p.Id, Nombre = p.Descripcion ?? $"Producto {p.Id}" })
            .ToListAsync();
    }

    public async Task<List<ReportePedidoDiaDto>> PedidosPorDiaAsync(ReportesFiltroDto filtro)
    {
        var q = BasePedidos(filtro, usarFechaEntrega: true);
        var lista = await q.ToListAsync();

        return lista
            .Where(p => p.FechaEntrega.HasValue)
            .GroupBy(p => p.FechaEntrega!.Value.Date)
            .OrderBy(g => g.Key)
            .Select(g => new ReportePedidoDiaDto
            {
                Fecha = g.Key,
                CantidadPedidos = g.Count(),
                TotalFacturado = g.Sum(x => x.TotalCliente ?? 0),
                TotalCosto = g.Sum(x => x.TotalProveedor ?? 0),
                TotalGanancia = g.Sum(x => x.TotalGanancia ?? 0),
                Pedidos = g.OrderBy(x => x.Id).Select(MapLineaPedidoDia).ToList()
            })
            .ToList();
    }

    public async Task<List<ReporteGrupoDto>> EstadoCuentaClientesAsync(ReportesFiltroDto filtro, bool paraCliente)
    {
        var q = BasePedidos(filtro, usarFechaEntrega: true);
        if (filtro.SoloConSaldo)
            q = q.Where(p => (p.RestanteCliente ?? 0) > 0);

        var pedidos = await q.OrderBy(p => p.IdClienteNavigation!.Nombre).ThenBy(p => p.FechaEntrega).ToListAsync();

        return pedidos
            .GroupBy(p => new { p.IdCliente, Nombre = p.IdClienteNavigation?.Nombre ?? "Sin cliente" })
            .Select(g => new ReporteGrupoDto
            {
                IdEntidad = g.Key.IdCliente,
                Nombre = g.Key.Nombre,
                EtiquetaTotal = "Deuda total",
                TotalSaldo = g.Sum(x => x.RestanteCliente ?? 0),
                TotalGanancia = paraCliente ? null : g.Sum(x => x.TotalGanancia ?? 0),
                Pedidos = g.Select(MapLineaCliente).ToList()
            })
            .Where(g => !filtro.SoloConSaldo || g.TotalSaldo > 0)
            .ToList();
    }

    public async Task<List<ReporteGrupoDto>> EstadoCuentaProveedoresAsync(ReportesFiltroDto filtro)
    {
        var q = BasePedidos(filtro, usarFechaEntrega: true);
        if (filtro.SoloConSaldo)
            q = q.Where(p => (p.RestanteProveedor ?? 0) > 0);

        var pedidos = await q.OrderBy(p => p.IdProveedorNavigation!.Nombre).ThenBy(p => p.FechaEntrega).ToListAsync();

        return pedidos
            .GroupBy(p => new { p.IdProveedor, Nombre = p.IdProveedorNavigation?.Nombre ?? "Sin proveedor" })
            .Select(g => new ReporteGrupoDto
            {
                IdEntidad = g.Key.IdProveedor,
                Nombre = g.Key.Nombre,
                EtiquetaTotal = "Deuda total",
                TotalSaldo = g.Sum(x => x.RestanteProveedor ?? 0),
                Pedidos = g.Select(MapLineaProveedor).ToList()
            })
            .Where(g => !filtro.SoloConSaldo || g.TotalSaldo > 0)
            .ToList();
    }

    public async Task<List<ReporteGrupoDto>> EvolucionVentasAsync(ReportesFiltroDto filtro)
    {
        var esCliente = !string.Equals(filtro.Tipo, "Proveedor", StringComparison.OrdinalIgnoreCase);
        var q = BasePedidos(filtro, usarFechaEntrega: true);
        var pedidos = await q.ToListAsync();

        if (esCliente)
        {
            var idsCli = ResolverIds(filtro.IdClientes, filtro.IdCliente);
            if (idsCli.Count > 0)
                pedidos = pedidos.Where(p => p.IdCliente != null && idsCli.Contains(p.IdCliente.Value)).ToList();

            return pedidos
                .GroupBy(p => new { p.IdCliente, Nombre = p.IdClienteNavigation?.Nombre ?? "Sin cliente" })
                .Select(g => new ReporteGrupoDto
                {
                    IdEntidad = g.Key.IdCliente,
                    Nombre = g.Key.Nombre,
                    EtiquetaTotal = "Facturado",
                    TotalSaldo = g.Sum(x => x.TotalCliente ?? 0),
                    TotalGanancia = g.Sum(x => x.TotalGanancia ?? 0),
                    Pedidos = g.Select(p => MapLineaEvolucion(p, true)).ToList()
                })
                .OrderBy(g => g.Nombre)
                .ToList();
        }

        var idsProv = ResolverIds(filtro.IdProveedores, filtro.IdProveedor);
        if (idsProv.Count > 0)
            pedidos = pedidos.Where(p => p.IdProveedor != null && idsProv.Contains(p.IdProveedor.Value)).ToList();

        return pedidos
            .GroupBy(p => new { p.IdProveedor, Nombre = p.IdProveedorNavigation?.Nombre ?? "Sin proveedor" })
            .Select(g => new ReporteGrupoDto
            {
                IdEntidad = g.Key.IdProveedor,
                Nombre = g.Key.Nombre,
                EtiquetaTotal = "Facturado",
                TotalSaldo = g.Sum(x => x.TotalProveedor ?? 0),
                TotalGanancia = g.Sum(x => x.TotalGanancia ?? 0),
                Pedidos = g.Select(p => MapLineaEvolucion(p, false)).ToList()
            })
            .OrderBy(g => g.Nombre)
            .ToList();
    }

    public async Task<ReporteProductoMesResponseDto> EvolucionProductoAsync(ReportesFiltroDto filtro)
    {
        var desde = NormalizarDesde(filtro.FechaDesde);
        var hasta = NormalizarHasta(filtro.FechaHasta);

        var meses = GenerarMeses(desde, hasta);

        var query = _db.PedidosProductos.AsNoTracking()
            .Include(pp => pp.IdProductoNavigation)
                .ThenInclude(p => p!.IdUnidadDeMedidaNavigation)
            .Include(pp => pp.IdPedidoNavigation)
            .Where(pp => pp.IdPedidoNavigation != null
                && pp.IdPedidoNavigation.FechaEntrega.HasValue
                && pp.IdPedidoNavigation.FechaEntrega >= SqlDateTimeMin
                && pp.IdPedidoNavigation.FechaEntrega <= SqlDateTimeMax
                && pp.IdPedidoNavigation.FechaEntrega >= desde
                && pp.IdPedidoNavigation.FechaEntrega <= hasta);

        var idsCli = ResolverIds(filtro.IdClientes, filtro.IdCliente);
        if (idsCli.Count > 0)
            query = query.Where(pp => pp.IdPedidoNavigation!.IdCliente != null && idsCli.Contains(pp.IdPedidoNavigation.IdCliente.Value));
        var idsProv = ResolverIds(filtro.IdProveedores, filtro.IdProveedor);
        if (idsProv.Count > 0)
            query = query.Where(pp => pp.IdPedidoNavigation!.IdProveedor != null && idsProv.Contains(pp.IdPedidoNavigation.IdProveedor.Value));
        var idsProducto = ResolverIdsProducto(filtro);
        if (idsProducto.Count > 0)
            query = query.Where(pp => pp.IdProducto != null && idsProducto.Contains(pp.IdProducto.Value));

        var lineas = await query.ToListAsync();

        var filas = lineas
            .GroupBy(l => new
            {
                l.IdProducto,
                Nombre = l.IdProductoNavigation?.Descripcion ?? $"#{l.IdProducto}",
                Unidad = l.IdProductoNavigation?.IdUnidadDeMedidaNavigation?.Nombre ?? ""
            })
            .Select(g =>
            {
                var porMes = meses.ToDictionary(m => m, _ => 0m);
                var montosPorMes = meses.ToDictionary(m => m, _ => 0m);
                foreach (var item in g)
                {
                    var f = item.IdPedidoNavigation?.FechaEntrega;
                    if (!f.HasValue) continue;
                    var key = $"{f.Value:yyyy-MM}";
                    if (!porMes.ContainsKey(key)) continue;
                    porMes[key] += item.Cantidad ?? 0;
                    montosPorMes[key] += MontoLineaProducto(item);
                }

                var primerMes = meses.Count > 0 ? meses[0] : "";
                var ultimoMes = meses.Count > 0 ? meses[^1] : "";
                var montoIni = primerMes != "" ? montosPorMes[primerMes] : 0m;
                var montoFin = ultimoMes != "" ? montosPorMes[ultimoMes] : 0m;
                var variacion = montoFin - montoIni;
                decimal? pct = montoIni != 0 ? variacion / montoIni * 100m : null;

                return new ReporteProductoMesDto
                {
                    IdProducto = g.Key.IdProducto ?? 0,
                    Producto = g.Key.Nombre,
                    Unidad = g.Key.Unidad,
                    CantidadesPorMes = porMes,
                    MontoPrimerMes = montoIni,
                    MontoUltimoMes = montoFin,
                    VariacionMonto = variacion,
                    VariacionPorcentaje = pct,
                    Informacion = ArmarInformacionEvolucionProducto(desde.Date, hasta.Date, montoIni, montoFin, variacion, pct)
                };
            })
            .OrderBy(f => f.Producto)
            .ToList();

        return new ReporteProductoMesResponseDto
        {
            FechaDesde = desde,
            FechaHasta = hasta,
            Meses = meses,
            Filas = filas
        };
    }

    public Task<List<ReportePagoGrupoDto>> PagosClientesAsync(ReportesFiltroDto filtro)
        => PagosAsync(filtro, esProveedor: false);

    public Task<List<ReportePagoGrupoDto>> PagosProveedoresAsync(ReportesFiltroDto filtro)
        => PagosAsync(filtro, esProveedor: true);

    private async Task<List<ReportePagoGrupoDto>> PagosAsync(ReportesFiltroDto filtro, bool esProveedor)
    {
        var desde = NormalizarDesde(filtro.FechaDesde);
        var hasta = NormalizarHasta(filtro.FechaHasta);

        if (esProveedor)
        {
            var q = _db.PagosPedidosProveedores.AsNoTracking()
                .Where(p => p.Fecha >= SqlDateTimeMin && p.Fecha <= SqlDateTimeMax)
                .Where(p => p.Fecha >= desde && p.Fecha <= hasta);

            var idsProv = ResolverIds(filtro.IdProveedores, filtro.IdProveedor);
            if (idsProv.Count > 0)
                q = q.Where(p => p.IdPedidoNavigation != null && p.IdPedidoNavigation.IdProveedor != null && idsProv.Contains(p.IdPedidoNavigation.IdProveedor.Value));

            var pagos = await q
                .OrderBy(p => p.Fecha)
                .Select(p => new PagoReporteRow
                {
                    Id = p.Id,
                    IdPedido = p.IdPedido,
                    Fecha = p.Fecha,
                    TotalArs = p.TotalArs,
                    Observacion = p.Observacion,
                    NroRemito = p.IdPedidoNavigation != null ? p.IdPedidoNavigation.NroRemito : null,
                    PedidoId = p.IdPedidoNavigation != null ? p.IdPedidoNavigation.Id : null,
                    FechaEntrega = p.IdPedidoNavigation != null
                        && p.IdPedidoNavigation.FechaEntrega >= SqlDateTimeMin
                        && p.IdPedidoNavigation.FechaEntrega <= SqlDateTimeMax
                        ? p.IdPedidoNavigation.FechaEntrega
                        : null,
                    Cliente = p.IdPedidoNavigation != null ? p.IdPedidoNavigation.IdClienteNavigation!.Nombre : null,
                    Proveedor = p.IdPedidoNavigation != null ? p.IdPedidoNavigation.IdProveedorNavigation!.Nombre : null
                })
                .ToListAsync();

            return AgruparPagos(pagos);
        }

        var qc = _db.PagosPedidosClientes.AsNoTracking()
            .Where(p => p.Fecha >= SqlDateTimeMin && p.Fecha <= SqlDateTimeMax)
            .Where(p => p.Fecha >= desde && p.Fecha <= hasta);

        var idsCli = ResolverIds(filtro.IdClientes, filtro.IdCliente);
        if (idsCli.Count > 0)
            qc = qc.Where(p => p.IdPedidoNavigation != null && p.IdPedidoNavigation.IdCliente != null && idsCli.Contains(p.IdPedidoNavigation.IdCliente.Value));

        var pagosCli = await qc
            .OrderBy(p => p.Fecha)
            .Select(p => new PagoReporteRow
            {
                Id = p.Id,
                IdPedido = p.IdPedido,
                Fecha = p.Fecha,
                TotalArs = p.TotalArs,
                Observacion = p.Observacion,
                NroRemito = p.IdPedidoNavigation != null ? p.IdPedidoNavigation.NroRemito : null,
                PedidoId = p.IdPedidoNavigation != null ? p.IdPedidoNavigation.Id : null,
                FechaEntrega = p.IdPedidoNavigation != null
                    && p.IdPedidoNavigation.FechaEntrega >= SqlDateTimeMin
                    && p.IdPedidoNavigation.FechaEntrega <= SqlDateTimeMax
                    ? p.IdPedidoNavigation.FechaEntrega
                    : null,
                Cliente = p.IdPedidoNavigation != null ? p.IdPedidoNavigation.IdClienteNavigation!.Nombre : null,
                Proveedor = p.IdPedidoNavigation != null ? p.IdPedidoNavigation.IdProveedorNavigation!.Nombre : null
            })
            .ToListAsync();

        return AgruparPagos(pagosCli);
    }

    private static List<ReportePagoGrupoDto> AgruparPagos(List<PagoReporteRow> pagos) =>
        pagos
            .GroupBy(p => p.Fecha.Date)
            .Select(g => new ReportePagoGrupoDto
            {
                FechaPago = g.Key,
                TotalDia = g.Sum(x => x.TotalArs),
                Pagos = g.Select(p => new ReportePagoLineaDto
                {
                    IdPago = p.Id,
                    IdPedido = p.IdPedido,
                    Partida = Partida(p.NroRemito, p.PedidoId),
                    FechaEntrega = p.FechaEntrega,
                    Monto = p.TotalArs,
                    MetodoPago = ExtraerMetodoPago(p.Observacion),
                    Cliente = p.Cliente,
                    Proveedor = p.Proveedor
                }).ToList()
            })
            .ToList();

    private sealed class PagoReporteRow
    {
        public int Id { get; set; }
        public int? IdPedido { get; set; }
        public DateTime Fecha { get; set; }
        public decimal TotalArs { get; set; }
        public string? Observacion { get; set; }
        public string? NroRemito { get; set; }
        public int? PedidoId { get; set; }
        public DateTime? FechaEntrega { get; set; }
        public string? Cliente { get; set; }
        public string? Proveedor { get; set; }
    }

    public async Task<ReporteDetallePedidoDto?> DetallePedidoAsync(int idPedido, bool precioVenta)
    {
        var pedido = await _db.Pedidos.AsNoTracking()
            .Include(p => p.IdClienteNavigation)
            .Include(p => p.IdProveedorNavigation)
            .FirstOrDefaultAsync(p => p.Id == idPedido);

        if (pedido == null) return null;

        var productos = await _db.PedidosProductos.AsNoTracking()
            .Include(pp => pp.IdProductoNavigation)
                .ThenInclude(pr => pr!.IdUnidadDeMedidaNavigation)
            .Where(pp => pp.IdPedido == idPedido)
            .ToListAsync();

        return new ReporteDetallePedidoDto
        {
            IdPedido = pedido.Id,
            Partida = Partida(pedido),
            Cliente = pedido.IdClienteNavigation?.Nombre,
            Proveedor = pedido.IdProveedorNavigation?.Nombre,
            Productos = productos.Select(pp => new ReporteDetalleProductoDto
            {
                Producto = pp.IdProductoNavigation?.Descripcion ?? "",
                Unidad = pp.IdProductoNavigation?.IdUnidadDeMedidaNavigation?.Nombre ?? "",
                Cantidad = pp.Cantidad ?? 0,
                CantidadUsadaAcopio = pp.CantidadUsadaAcopio ?? 0,
                ProductoCantidad = FactorBultoLinea(pp),
                PrecioCosto = pp.PrecioCostoArs ?? pp.PrecioCosto ?? 0,
                PrecioVenta = pp.PrecioVentaArs ?? pp.PrecioVenta ?? 0,
                TotalLinea = ImporteLineaDetalle(pp, precioVenta)
            }).ToList()
        };
    }

    private IQueryable<Pedido> BasePedidos(ReportesFiltroDto filtro, bool usarFechaEntrega)
    {
        var desde = NormalizarDesde(filtro.FechaDesde);
        var hasta = NormalizarHasta(filtro.FechaHasta);

        var q = _db.Pedidos.AsNoTracking()
            .Include(p => p.IdClienteNavigation)
            .Include(p => p.IdProveedorNavigation)
            .AsQueryable();

        if (usarFechaEntrega)
            q = q.Where(p => p.FechaEntrega.HasValue
                && p.FechaEntrega >= SqlDateTimeMin && p.FechaEntrega <= SqlDateTimeMax
                && p.FechaEntrega >= desde && p.FechaEntrega <= hasta);
        else
            q = q.Where(p => p.Fecha.HasValue
                && p.Fecha >= SqlDateTimeMin && p.Fecha <= SqlDateTimeMax
                && p.Fecha >= desde && p.Fecha <= hasta);

        var idsCli = ResolverIds(filtro.IdClientes, filtro.IdCliente);
        if (idsCli.Count > 0)
            q = q.Where(p => p.IdCliente != null && idsCli.Contains(p.IdCliente.Value));
        var idsProv = ResolverIds(filtro.IdProveedores, filtro.IdProveedor);
        if (idsProv.Count > 0)
            q = q.Where(p => p.IdProveedor != null && idsProv.Contains(p.IdProveedor.Value));

        return q;
    }

    private static ReportePedidoLineaDto MapLineaPedidoDia(Pedido p) => new()
    {
        IdPedido = p.Id,
        Partida = Partida(p),
        FechaEntrega = p.FechaEntrega,
        Cliente = p.IdClienteNavigation?.Nombre,
        Proveedor = p.IdProveedorNavigation?.Nombre,
        Monto = p.TotalCliente ?? 0,
        Costo = p.TotalProveedor ?? 0,
        Ganancia = p.TotalGanancia ?? 0
    };

    private static ReportePedidoLineaDto MapLineaCliente(Pedido p)
    {
        var total = p.TotalCliente ?? 0;
        var saldo = p.RestanteCliente ?? 0;
        return new ReportePedidoLineaDto
        {
            IdPedido = p.Id,
            Partida = Partida(p),
            FechaEntrega = p.FechaEntrega,
            Monto = total,
            Haber = total - saldo,
            Saldo = saldo,
            Ganancia = p.TotalGanancia ?? 0,
            Proveedor = p.IdProveedorNavigation?.Nombre,
            PagadoProveedor = (p.RestanteProveedor ?? 0) <= 0 ? "Sí" : "No"
        };
    }

    private static ReportePedidoLineaDto MapLineaProveedor(Pedido p)
    {
        var total = p.TotalProveedor ?? 0;
        var saldo = p.RestanteProveedor ?? 0;
        var saldoCli = p.RestanteCliente ?? 0;
        return new ReportePedidoLineaDto
        {
            IdPedido = p.Id,
            Partida = Partida(p),
            FechaEntrega = p.FechaEntrega,
            Monto = total,
            Haber = total - saldo,
            Saldo = saldo,
            Cliente = p.IdClienteNavigation?.Nombre,
            EstadoCliente = saldoCli <= 0 ? "Cobrado" : "Debe",
            PagadoProveedor = saldo <= 0 ? "Sí" : "No"
        };
    }

    private static ReportePedidoLineaDto MapLineaEvolucion(Pedido p, bool esCliente)
    {
        var facturado = esCliente ? (p.TotalCliente ?? 0) : (p.TotalProveedor ?? 0);
        var gan = p.TotalGanancia ?? 0;
        var porc = facturado > 0 ? gan / facturado : 0;
        return new ReportePedidoLineaDto
        {
            IdPedido = p.Id,
            Partida = Partida(p),
            FechaEntrega = p.FechaEntrega,
            Monto = facturado,
            Ganancia = gan,
            PorcGanancia = porc
        };
    }

    private static string Partida(Pedido? p)
    {
        if (p == null) return "";
        return Partida(p.NroRemito, p.Id);
    }

    private static string Partida(string? nroRemito, int? pedidoId)
    {
        if (!string.IsNullOrWhiteSpace(nroRemito)) return nroRemito.Trim();
        return pedidoId?.ToString() ?? "";
    }

    private static string ExtraerMetodoPago(string? obs)
    {
        if (string.IsNullOrWhiteSpace(obs)) return "—";
        var u = obs.ToUpperInvariant();
        if (u.Contains("EFECTIVO")) return "Efectivo";
        if (u.Contains("TRANSFER")) return "Transferencia";
        if (u.Contains("CHEQUE")) return "Cheque";
        return obs.Length > 40 ? obs[..40] + "…" : obs;
    }

    private static DateTime? FechaFiltroValida(DateTime? d)
    {
        if (!d.HasValue) return null;
        if (d.Value < SqlDateTimeMin || d.Value > SqlDateTimeMax) return null;
        return d;
    }

    private static DateTime NormalizarDesde(DateTime? d)
        => (FechaFiltroValida(d) ?? DateTime.Today.AddMonths(-1)).Date;

    private static DateTime NormalizarHasta(DateTime? d)
        => (FechaFiltroValida(d) ?? DateTime.Today).Date.AddDays(1).AddTicks(-1);

    private static List<string> GenerarMeses(DateTime desde, DateTime hasta)
    {
        var meses = new List<string>();
        var cursor = new DateTime(desde.Year, desde.Month, 1);
        var fin = new DateTime(hasta.Year, hasta.Month, 1);
        while (cursor <= fin)
        {
            meses.Add(cursor.ToString("yyyy-MM"));
            cursor = cursor.AddMonths(1);
        }
        return meses;
    }

    private static List<int> ResolverIds(List<int>? ids, int legacyId = -1)
    {
        var list = (ids ?? new List<int>()).Where(x => x > 0).Distinct().ToList();
        if (list.Count == 0 && legacyId > 0)
            list.Add(legacyId);
        return list;
    }

    private static List<int> ResolverIdsProducto(ReportesFiltroDto filtro)
        => ResolverIds(filtro.IdProductos, filtro.IdProducto);

    private static decimal MontoLineaProducto(PedidosProducto item)
    {
        return ImporteLineaDetalle(item, precioVenta: true);
    }

    /// <summary>Bultos por unidad de venta (línea del pedido o, si falta, ficha del producto).</summary>
    private static decimal FactorBultoLinea(PedidosProducto pp)
    {
        var linea = pp.ProductoCantidad;
        if (linea is > 1) return linea.Value;

        var prod = pp.IdProductoNavigation?.ProductoCantidad;
        if (prod is > 1) return prod.Value;

        var factor = linea ?? prod ?? 1;
        return factor == 0 ? 1 : factor;
    }

    /// <summary>Importe ARS: (cantidad + acopio) × ProductoCantidad × precio unit.</summary>
    private static decimal ImporteLineaDetalle(PedidosProducto pp, bool precioVenta)
    {
        var nombre = pp.IdProductoNavigation?.Descripcion ?? "";
        if (nombre.Contains("FAC. IVA", StringComparison.OrdinalIgnoreCase))
        {
            if (precioVenta && pp.TotalArs.HasValue)
                return pp.TotalArs.Value;
            var precioFac = precioVenta
                ? (pp.PrecioVentaArs ?? pp.PrecioVenta ?? 0)
                : (pp.PrecioCostoArs ?? pp.PrecioCosto ?? 0);
            return (pp.Cantidad ?? 0) * (precioFac / 100m);
        }

        var precioUnit = precioVenta
            ? (pp.PrecioVentaArs ?? pp.PrecioVenta ?? 0)
            : (pp.PrecioCostoArs ?? pp.PrecioCosto ?? 0);
        var cant = (pp.Cantidad ?? 0) + (pp.CantidadUsadaAcopio ?? 0);
        var factorBulto = FactorBultoLinea(pp);
        return precioUnit * cant * factorBulto;
    }

    private static string ArmarInformacionEvolucionProducto(
        DateTime desde,
        DateTime hasta,
        decimal montoIni,
        decimal montoFin,
        decimal variacion,
        decimal? porcentaje)
    {
        var hastaDia = hasta.Date;
        if (montoIni == 0 && montoFin == 0)
        {
            return $"Del {desde:dd/MM/yyyy} al {hastaDia:dd/MM/yyyy}: sin facturación en el primer y último mes del período.";
        }

        string movimiento;
        if (variacion > 0) movimiento = "incremento";
        else if (variacion < 0) movimiento = "decremento";
        else movimiento = "sin cambio";

        var montoTxt = Math.Abs(variacion).ToString("N2", System.Globalization.CultureInfo.GetCultureInfo("es-AR"));
        var pctTxt = porcentaje.HasValue
            ? $" ({porcentaje.Value.ToString("+0.##;-0.##;0", System.Globalization.CultureInfo.GetCultureInfo("es-AR"))}%)"
            : "";

        return $"Del {desde:dd/MM/yyyy} al {hastaDia:dd/MM/yyyy}: {movimiento} de $ {montoTxt} en facturación " +
               $"(primer mes $ {montoIni:N2} → último mes $ {montoFin:N2}){pctTxt}.";
    }
}
