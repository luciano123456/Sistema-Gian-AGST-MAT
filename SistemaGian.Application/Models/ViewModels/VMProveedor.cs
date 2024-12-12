using SistemaGian.Models;

namespace SistemaGian.Application.Models.ViewModels
{
    public class VMProveedor
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = null!;

        public string? Apodo { get; set; }

        public string? Ubicacion { get; set; }

        public string? Telefono { get; set; }

    }
}
