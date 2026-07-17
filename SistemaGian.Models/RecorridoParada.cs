namespace SistemaGian.Models;

public partial class RecorridoParada
{
    public int Id { get; set; }
    public int IdRecorrido { get; set; }
    public int? IdCliente { get; set; }
    public int? IdProveedor { get; set; }
    /// <summary>Cliente | Proveedor</summary>
    public string TipoParada { get; set; } = "Cliente";
    public int Orden { get; set; }
    public string? NombreCliente { get; set; }
    public string? Direccion { get; set; }
    public decimal Latitud { get; set; }
    public decimal Longitud { get; set; }
    public string EstadoParada { get; set; } = "Pendiente";
    public DateTime? FechaVisitada { get; set; }
    public DateTime? FechaOmitida { get; set; }
    public string? Notas { get; set; }

    public virtual Recorrido IdRecorridoNavigation { get; set; } = null!;
    public virtual Cliente? IdClienteNavigation { get; set; }
    public virtual Proveedor? IdProveedorNavigation { get; set; }
}
