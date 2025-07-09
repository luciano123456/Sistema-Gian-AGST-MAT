using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.Application.Models.ViewModels
{
    public class VMAcopioHistorial
    {
        public int Id { get; set; }

        public int IdProducto { get; set; }

        public decimal? Ingreso { get; set; }

        public decimal? Egreso { get; set; }

        public string? Observaciones { get; set; }

        public DateTime Fecha { get; set; }

        public string? NombreProducto { get; set; }
    }

}
