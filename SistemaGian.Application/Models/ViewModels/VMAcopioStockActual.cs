using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.Application.Models.ViewModels
{
    public class VMAcopioStockActual
    {
        public int IdProducto { get; set; }
        public int IdProveedor { get; set; }

        public decimal CantidadActual { get; set; }

        public DateTime FechaUltimaActualizacion { get; set; }

        public string? NombreProducto { get; set; }
        public string? Proveedor { get; set; }
    }

}
