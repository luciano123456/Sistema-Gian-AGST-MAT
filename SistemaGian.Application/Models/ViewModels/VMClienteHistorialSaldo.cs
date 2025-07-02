using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.Application.Models.ViewModels
{
    public class VMClienteHistorialSaldo
    {
        public int Id { get; set; }

        public DateTime Fecha { get; set; }

        public int IdCliente { get; set; }

        public decimal Egreso { get; set; }

        public decimal Ingreso { get; set; }

        public string? Observaciones { get; set; }

        public virtual Cliente IdClienteNavigation { get; set; } = null!;

    }
}
