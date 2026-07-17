namespace SistemaGian.Models;

public partial class RecorridoEvento
{
    public int Id { get; set; }
    public int? IdRecorrido { get; set; }
    public int IdUsuario { get; set; }
    public string Tipo { get; set; } = null!;
    public string Mensaje { get; set; } = null!;
    public DateTime Fecha { get; set; }

    public virtual Recorrido? IdRecorridoNavigation { get; set; }
    public virtual User IdUsuarioNavigation { get; set; } = null!;
}
