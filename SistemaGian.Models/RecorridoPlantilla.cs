namespace SistemaGian.Models;

public partial class RecorridoPlantilla
{
    public int Id { get; set; }
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = null!;
    public bool EsPredeterminada { get; set; }
    public decimal? OrigenLat { get; set; }
    public decimal? OrigenLng { get; set; }
    public string? OrigenDireccion { get; set; }
    public DateTime FechaCreacion { get; set; }
    /// <summary>Clientes | Proveedores | Ambos</summary>
    public string TipoDestino { get; set; } = "Clientes";

    public virtual User IdUsuarioNavigation { get; set; } = null!;
    public virtual ICollection<RecorridoPlantillaParada> Paradas { get; set; } = new List<RecorridoPlantillaParada>();
}
