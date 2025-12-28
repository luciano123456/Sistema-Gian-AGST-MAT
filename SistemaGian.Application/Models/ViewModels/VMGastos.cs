using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.Application.Models.ViewModels
{
    public class VMGastos
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public int IdTipo { get; set; }
        public string Tipo { get; set; } = "";
        public int IdMoneda { get; set; }
        public string Moneda { get; set; } = "";
        public decimal Importe { get; set; }
        public decimal? Cotizacion { get; set; }
        public decimal? ImporteArs { get; set; }
        public string? Concepto { get; set; }
    }

    public class VMGastosFiltro
    {
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public int IdMoneda { get; set; } = -1;
        public int IdTipo { get; set; } = -1;
    }

    public class VMGastosResumen
    {
        public int IdMoneda { get; set; }
        public string Moneda { get; set; } = "";
        public int Cantidad { get; set; }
        public decimal Total { get; set; }
    }
}
