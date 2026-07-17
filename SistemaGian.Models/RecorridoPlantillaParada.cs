namespace SistemaGian.Models;

public partial class RecorridoPlantillaParada
{
    public int Id { get; set; }
    public int IdPlantilla { get; set; }
    public int? IdCliente { get; set; }
    public int? IdProveedor { get; set; }
    /// <summary>Cliente | Proveedor</summary>
    public string TipoParada { get; set; } = "Cliente";
    public int Orden { get; set; }

    public virtual RecorridoPlantilla IdPlantillaNavigation { get; set; } = null!;
    public virtual Cliente? IdClienteNavigation { get; set; }
    public virtual Proveedor? IdProveedorNavigation { get; set; }
}
