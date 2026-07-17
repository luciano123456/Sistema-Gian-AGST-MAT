namespace SistemaGian.Models;

public partial class Recorrido
{
    public int Id { get; set; }
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = null!;
    public string Estado { get; set; } = "Borrador";
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
    public decimal? OrigenLat { get; set; }
    public decimal? OrigenLng { get; set; }
    public string? OrigenDireccion { get; set; }
    public int? DistanciaMetros { get; set; }
    public int? DuracionSegundos { get; set; }
    public string? Observaciones { get; set; }
    /// <summary>Clientes | Proveedores | Ambos</summary>
    public string TipoDestino { get; set; } = "Clientes";

    public virtual User IdUsuarioNavigation { get; set; } = null!;
    public virtual ICollection<RecorridoParada> Paradas { get; set; } = new List<RecorridoParada>();
    public virtual ICollection<RecorridoEvento> Eventos { get; set; } = new List<RecorridoEvento>();
}
