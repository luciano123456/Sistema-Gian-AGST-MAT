using SistemaGian.Models;

namespace SistemaGian.Application.Models.ViewModels
{
    public class VMZonas
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public string Nombre { get; set; } = null!;
        public decimal Precio { get; set; }

    }
}
