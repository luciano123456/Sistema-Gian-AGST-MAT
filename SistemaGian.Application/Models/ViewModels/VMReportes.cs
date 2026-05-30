namespace SistemaGian.Application.Models.ViewModels;

public class VMReportesFiltro
{
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public int IdCliente { get; set; } = -1;
    public int IdProveedor { get; set; } = -1;
    public int IdProducto { get; set; } = -1;
    public List<int> IdProductos { get; set; } = new();
    /// <summary>Cliente | Proveedor (evolución ventas)</summary>
    public string Tipo { get; set; } = "Cliente";
    /// <summary>Solo pedidos con saldo pendiente</summary>
    public bool SoloConSaldo { get; set; }
}

public class VMReportePedidoDia
{
    public DateTime Fecha { get; set; }
    public int CantidadPedidos { get; set; }
    public decimal TotalFacturado { get; set; }
    public decimal TotalCosto { get; set; }
    public decimal TotalGanancia { get; set; }
    public List<VMReportePedidoLinea> Pedidos { get; set; } = new();
}

public class VMReportePedidoLinea
{
    public int IdPedido { get; set; }
    public string Partida { get; set; } = "";
    public DateTime? FechaEntrega { get; set; }
    public decimal Monto { get; set; }
    public decimal Costo { get; set; }
    public decimal Haber { get; set; }
    public decimal Saldo { get; set; }
    public decimal Ganancia { get; set; }
    public decimal PorcGanancia { get; set; }
    public string? Cliente { get; set; }
    public string? Proveedor { get; set; }
    public string EstadoCliente { get; set; } = "";
    public string PagadoProveedor { get; set; } = "";
    public bool Seleccionado { get; set; }
}

public class VMReporteGrupo
{
    public int? IdEntidad { get; set; }
    public string Nombre { get; set; } = "";
    public string EtiquetaTotal { get; set; } = "Deuda total";
    public decimal TotalSaldo { get; set; }
    public decimal? TotalGanancia { get; set; }
    public List<VMReportePedidoLinea> Pedidos { get; set; } = new();
}

public class VMReportePagoLinea
{
    public int IdPago { get; set; }
    public int? IdPedido { get; set; }
    public string Partida { get; set; } = "";
    public DateTime? FechaEntrega { get; set; }
    public decimal Monto { get; set; }
    public string MetodoPago { get; set; } = "";
    public string? Cliente { get; set; }
    public string? Proveedor { get; set; }
}

public class VMReportePagoGrupo
{
    public DateTime FechaPago { get; set; }
    public decimal TotalDia { get; set; }
    public List<VMReportePagoLinea> Pagos { get; set; } = new();
}

public class VMReporteProductoMes
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public string Unidad { get; set; } = "";
    public Dictionary<string, decimal> CantidadesPorMes { get; set; } = new();
    public decimal MontoPrimerMes { get; set; }
    public decimal MontoUltimoMes { get; set; }
    public decimal VariacionMonto { get; set; }
    public decimal? VariacionPorcentaje { get; set; }
    public string Informacion { get; set; } = "";
}

public class VMReporteProductoMesResponse
{
    public DateTime FechaDesde { get; set; }
    public DateTime FechaHasta { get; set; }
    public List<string> Meses { get; set; } = new();
    public List<VMReporteProductoMes> Filas { get; set; } = new();
}

public class VMReporteDetalleProducto
{
    public string Producto { get; set; } = "";
    public string Unidad { get; set; } = "";
    public decimal Cantidad { get; set; }
    public decimal CantidadUsadaAcopio { get; set; }
    public decimal ProductoCantidad { get; set; } = 1;
    public decimal PrecioCosto { get; set; }
    public decimal PrecioVenta { get; set; }
    public decimal TotalLinea { get; set; }
}

public class VMReporteDetallePedido
{
    public int IdPedido { get; set; }
    public string Partida { get; set; } = "";
    public string? Cliente { get; set; }
    public string? Proveedor { get; set; }
    public List<VMReporteDetalleProducto> Productos { get; set; } = new();
}

public class VMReporteCatalogoItem
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
}

public class VMReporteComposicionProveedorRequest
{
    public List<int> IdsPedidos { get; set; } = new();
    public bool MostrarCliente { get; set; } = true;
}
