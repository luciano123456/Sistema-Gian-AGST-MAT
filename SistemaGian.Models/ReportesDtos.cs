namespace SistemaGian.Models;

public class ReportesFiltroDto
{
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public int IdCliente { get; set; } = -1;
    public int IdProveedor { get; set; } = -1;
    public int IdProducto { get; set; } = -1;
    public List<int> IdProductos { get; set; } = new();
    public string Tipo { get; set; } = "Cliente";
    public bool SoloConSaldo { get; set; }
}

public class ReportePedidoDiaDto
{
    public DateTime Fecha { get; set; }
    public int CantidadPedidos { get; set; }
    public decimal TotalFacturado { get; set; }
    public decimal TotalCosto { get; set; }
    public decimal TotalGanancia { get; set; }
    public List<ReportePedidoLineaDto> Pedidos { get; set; } = new();
}

public class ReportePedidoLineaDto
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
}

public class ReporteGrupoDto
{
    public int? IdEntidad { get; set; }
    public string Nombre { get; set; } = "";
    public string EtiquetaTotal { get; set; } = "Deuda total";
    public decimal TotalSaldo { get; set; }
    public decimal? TotalGanancia { get; set; }
    public List<ReportePedidoLineaDto> Pedidos { get; set; } = new();
}

public class ReportePagoLineaDto
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

public class ReportePagoGrupoDto
{
    public DateTime FechaPago { get; set; }
    public decimal TotalDia { get; set; }
    public List<ReportePagoLineaDto> Pagos { get; set; } = new();
}

public class ReporteProductoMesDto
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

public class ReporteProductoMesResponseDto
{
    public DateTime FechaDesde { get; set; }
    public DateTime FechaHasta { get; set; }
    public List<string> Meses { get; set; } = new();
    public List<ReporteProductoMesDto> Filas { get; set; } = new();
}

public class ReporteDetalleProductoDto
{
    public string Producto { get; set; } = "";
    public string Unidad { get; set; } = "";
    public decimal Cantidad { get; set; }
    public decimal CantidadUsadaAcopio { get; set; }
    public decimal ProductoCantidad { get; set; } = 1;
    public decimal PrecioCosto { get; set; }
    public decimal PrecioVenta { get; set; }
    /// <summary>Importe de la línea en ARS (TotalArs del pedido o cálculo con bulto/acopio).</summary>
    public decimal TotalLinea { get; set; }
}

public class ReporteDetallePedidoDto
{
    public int IdPedido { get; set; }
    public string Partida { get; set; } = "";
    public string? Cliente { get; set; }
    public string? Proveedor { get; set; }
    public List<ReporteDetalleProductoDto> Productos { get; set; } = new();
}

public class ReporteCatalogoItemDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
}
