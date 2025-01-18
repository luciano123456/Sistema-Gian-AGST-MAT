using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.Application.Models.ViewModels
{
    public class VMPedidoFiltro
    {
        public DateTime FechaDesde { get; set; }
        public DateTime FechaHasta { get; set; }
    }
}
