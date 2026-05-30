using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaGian.Application.Models.ViewModels;
using SistemaGian.BLL.Service;
using SistemaGian.Models;

namespace SistemaGian.Application.Controllers;

[Authorize]
public class ReportesController : Controller
{
    private readonly IReportesService _reportes;

    public ReportesController(IReportesService reportes)
    {
        _reportes = reportes;
    }

    public IActionResult Index() => View();

    [HttpGet]
    public async Task<IActionResult> ProductosEvolucion(int idCliente = -1, int idProveedor = -1)
    {
        var productos = await _reportes.ListarProductosEvolucionAsync(idCliente, idProveedor);
        return Ok(productos.Select(MapCatalogo));
    }

    [HttpGet]
    public async Task<IActionResult> Catalogos()
    {
        var clientes = await _reportes.ListarClientesAsync();
        var proveedores = await _reportes.ListarProveedoresAsync();
        var productos = await _reportes.ListarProductosAsync();
        return Ok(new
        {
            clientes = clientes.Select(MapCatalogo),
            proveedores = proveedores.Select(MapCatalogo),
            productos = productos.Select(MapCatalogo)
        });
    }

    [HttpPost]
    public async Task<IActionResult> PedidosPorDia([FromBody] VMReportesFiltro vm)
        => Ok((await _reportes.PedidosPorDiaAsync(MapFiltro(vm))).Select(MapDia));

    [HttpPost]
    public async Task<IActionResult> EstadoCuentaClientes([FromBody] VMReportesFiltro vm)
        => Ok((await _reportes.EstadoCuentaClientesAsync(MapFiltro(vm), paraCliente: false)).Select(MapGrupo));

    [HttpPost]
    public async Task<IActionResult> EstadoCuentaParaCliente([FromBody] VMReportesFiltro vm)
        => Ok((await _reportes.EstadoCuentaClientesAsync(MapFiltro(vm), paraCliente: true)).Select(MapGrupo));

    [HttpPost]
    public async Task<IActionResult> EstadoCuentaProveedores([FromBody] VMReportesFiltro vm)
        => Ok((await _reportes.EstadoCuentaProveedoresAsync(MapFiltro(vm))).Select(MapGrupo));

    [HttpPost]
    public async Task<IActionResult> EvolucionVentas([FromBody] VMReportesFiltro vm)
        => Ok((await _reportes.EvolucionVentasAsync(MapFiltro(vm))).Select(MapGrupo));

    [HttpPost]
    public async Task<IActionResult> EvolucionProducto([FromBody] VMReportesFiltro vm)
    {
        var r = await _reportes.EvolucionProductoAsync(MapFiltro(vm));
        return Ok(new VMReporteProductoMesResponse
        {
            FechaDesde = r.FechaDesde,
            FechaHasta = r.FechaHasta,
            Meses = r.Meses,
            Filas = r.Filas.Select(f => new VMReporteProductoMes
            {
                IdProducto = f.IdProducto,
                Producto = f.Producto,
                Unidad = f.Unidad,
                CantidadesPorMes = f.CantidadesPorMes,
                MontoPrimerMes = f.MontoPrimerMes,
                MontoUltimoMes = f.MontoUltimoMes,
                VariacionMonto = f.VariacionMonto,
                VariacionPorcentaje = f.VariacionPorcentaje,
                Informacion = f.Informacion
            }).ToList()
        });
    }

    [HttpPost]
    public async Task<IActionResult> PagosClientes([FromBody] VMReportesFiltro vm)
        => Ok((await _reportes.PagosClientesAsync(MapFiltro(vm))).Select(MapPagoGrupo));

    [HttpPost]
    public async Task<IActionResult> PagosProveedores([FromBody] VMReportesFiltro vm)
        => Ok((await _reportes.PagosProveedoresAsync(MapFiltro(vm))).Select(MapPagoGrupo));

    [HttpGet]
    public async Task<IActionResult> DetallePedido(int id, bool precioVenta = true)
    {
        var d = await _reportes.DetallePedidoAsync(id, precioVenta);
        if (d == null) return NotFound();
        return Ok(MapDetalle(d));
    }

    private static ReportesFiltroDto MapFiltro(VMReportesFiltro vm) => new()
    {
        FechaDesde = SanearFechaFiltro(vm.FechaDesde),
        FechaHasta = SanearFechaFiltro(vm.FechaHasta),
        IdCliente = vm.IdCliente,
        IdProveedor = vm.IdProveedor,
        IdProducto = vm.IdProducto,
        IdProductos = vm.IdProductos?.Where(x => x > 0).Distinct().ToList() ?? new List<int>(),
        Tipo = vm.Tipo ?? "Cliente",
        SoloConSaldo = vm.SoloConSaldo
    };

    private static DateTime? SanearFechaFiltro(DateTime? d)
    {
        if (!d.HasValue) return null;
        if (d.Value.Year < 1753 || d.Value.Year > 9999) return null;
        return d;
    }

    private static VMReporteCatalogoItem MapCatalogo(ReporteCatalogoItemDto x)
        => new() { Id = x.Id, Nombre = x.Nombre };

    private static VMReportePedidoDia MapDia(ReportePedidoDiaDto x) => new()
    {
        Fecha = x.Fecha,
        CantidadPedidos = x.CantidadPedidos,
        TotalFacturado = x.TotalFacturado,
        TotalCosto = x.TotalCosto,
        TotalGanancia = x.TotalGanancia,
        Pedidos = x.Pedidos.Select(MapLinea).ToList()
    };

    private static VMReporteGrupo MapGrupo(ReporteGrupoDto g) => new()
    {
        IdEntidad = g.IdEntidad,
        Nombre = g.Nombre,
        EtiquetaTotal = g.EtiquetaTotal,
        TotalSaldo = g.TotalSaldo,
        TotalGanancia = g.TotalGanancia,
        Pedidos = g.Pedidos.Select(MapLinea).ToList()
    };

    private static VMReportePedidoLinea MapLinea(ReportePedidoLineaDto p) => new()
    {
        IdPedido = p.IdPedido,
        Partida = p.Partida,
        FechaEntrega = p.FechaEntrega,
        Monto = p.Monto,
        Costo = p.Costo,
        Haber = p.Haber,
        Saldo = p.Saldo,
        Ganancia = p.Ganancia,
        PorcGanancia = p.PorcGanancia,
        Cliente = p.Cliente,
        Proveedor = p.Proveedor,
        EstadoCliente = p.EstadoCliente,
        PagadoProveedor = p.PagadoProveedor
    };

    private static VMReportePagoGrupo MapPagoGrupo(ReportePagoGrupoDto g) => new()
    {
        FechaPago = g.FechaPago,
        TotalDia = g.TotalDia,
        Pagos = g.Pagos.Select(p => new VMReportePagoLinea
        {
            IdPago = p.IdPago,
            IdPedido = p.IdPedido,
            Partida = p.Partida,
            FechaEntrega = p.FechaEntrega,
            Monto = p.Monto,
            MetodoPago = p.MetodoPago,
            Cliente = p.Cliente,
            Proveedor = p.Proveedor
        }).ToList()
    };

    private static VMReporteDetallePedido MapDetalle(ReporteDetallePedidoDto d) => new()
    {
        IdPedido = d.IdPedido,
        Partida = d.Partida,
        Cliente = d.Cliente,
        Proveedor = d.Proveedor,
        Productos = d.Productos.Select(p => new VMReporteDetalleProducto
        {
            Producto = p.Producto,
            Unidad = p.Unidad,
            Cantidad = p.Cantidad,
            CantidadUsadaAcopio = p.CantidadUsadaAcopio,
            ProductoCantidad = p.ProductoCantidad,
            PrecioCosto = p.PrecioCosto,
            PrecioVenta = p.PrecioVenta,
            TotalLinea = p.TotalLinea
        }).ToList()
    };
}
