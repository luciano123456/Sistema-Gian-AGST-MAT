using SistemaGian.DAL.Repository;
using SistemaGian.Models;

namespace SistemaGian.BLL.Service;

public class ReportesService : IReportesService
{
    private readonly IReportesRepository _repo;

    public ReportesService(IReportesRepository repo)
    {
        _repo = repo;
    }

    public Task<List<ReporteCatalogoItemDto>> ListarClientesAsync() => _repo.ListarClientesAsync();
    public Task<List<ReporteCatalogoItemDto>> ListarProveedoresAsync() => _repo.ListarProveedoresAsync();
    public Task<List<ReporteCatalogoItemDto>> ListarProductosAsync() => _repo.ListarProductosAsync();
    public Task<List<ReporteCatalogoItemDto>> ListarProductosEvolucionAsync(int idCliente, int idProveedor)
        => _repo.ListarProductosEvolucionAsync(idCliente, idProveedor);
    public Task<List<ReportePedidoDiaDto>> PedidosPorDiaAsync(ReportesFiltroDto filtro) => _repo.PedidosPorDiaAsync(filtro);
    public Task<List<ReporteGrupoDto>> EstadoCuentaClientesAsync(ReportesFiltroDto filtro, bool paraCliente) => _repo.EstadoCuentaClientesAsync(filtro, paraCliente);
    public Task<List<ReporteGrupoDto>> EstadoCuentaProveedoresAsync(ReportesFiltroDto filtro) => _repo.EstadoCuentaProveedoresAsync(filtro);
    public Task<List<ReporteGrupoDto>> EvolucionVentasAsync(ReportesFiltroDto filtro) => _repo.EvolucionVentasAsync(filtro);
    public Task<ReporteProductoMesResponseDto> EvolucionProductoAsync(ReportesFiltroDto filtro) => _repo.EvolucionProductoAsync(filtro);
    public Task<List<ReportePagoGrupoDto>> PagosClientesAsync(ReportesFiltroDto filtro) => _repo.PagosClientesAsync(filtro);
    public Task<List<ReportePagoGrupoDto>> PagosProveedoresAsync(ReportesFiltroDto filtro) => _repo.PagosProveedoresAsync(filtro);
    public Task<ReporteDetallePedidoDto?> DetallePedidoAsync(int idPedido, bool precioVenta) => _repo.DetallePedidoAsync(idPedido, precioVenta);
}
