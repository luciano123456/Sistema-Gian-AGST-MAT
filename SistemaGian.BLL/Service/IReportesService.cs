using SistemaGian.Models;

namespace SistemaGian.BLL.Service;

public interface IReportesService
{
    Task<List<ReporteCatalogoItemDto>> ListarClientesAsync();
    Task<List<ReporteCatalogoItemDto>> ListarProveedoresAsync();
    Task<List<ReporteCatalogoItemDto>> ListarProductosAsync();
    Task<List<ReporteCatalogoItemDto>> ListarProductosEvolucionAsync(int idCliente, int idProveedor);
    Task<List<ReportePedidoDiaDto>> PedidosPorDiaAsync(ReportesFiltroDto filtro);
    Task<List<ReporteGrupoDto>> EstadoCuentaClientesAsync(ReportesFiltroDto filtro, bool paraCliente);
    Task<List<ReporteGrupoDto>> EstadoCuentaProveedoresAsync(ReportesFiltroDto filtro);
    Task<List<ReporteGrupoDto>> EvolucionVentasAsync(ReportesFiltroDto filtro);
    Task<ReporteProductoMesResponseDto> EvolucionProductoAsync(ReportesFiltroDto filtro);
    Task<List<ReportePagoGrupoDto>> PagosClientesAsync(ReportesFiltroDto filtro);
    Task<List<ReportePagoGrupoDto>> PagosProveedoresAsync(ReportesFiltroDto filtro);
    Task<ReporteDetallePedidoDto?> DetallePedidoAsync(int idPedido, bool precioVenta);
}
