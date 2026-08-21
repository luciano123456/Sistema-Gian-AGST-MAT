namespace SistemaGian.Models;

public class WebProductoPublicado
{
    public int Id { get; set; }
    public int IdProducto { get; set; }
    public bool Publicado { get; set; }
    public decimal? PrecioPublico { get; set; }
    public decimal? PrecioLista { get; set; }
    public decimal? DescuentoPorcentaje { get; set; }
    public string? EtiquetaOferta { get; set; }
    public bool EnOferta { get; set; }
    public string? Slug { get; set; }
    public string? DescripcionPublica { get; set; }
    public string? ImagenUrl { get; set; }
    /// <summary>Metadatos de las imágenes seleccionadas en Gestión y pendientes de publicar.</summary>
    public string? ImagenesJson { get; set; }
    public string? Modelo3dUrl { get; set; }
    public bool Destacado { get; set; }
    public int Orden { get; set; }
    public DateTime FechaActualizacionUtc { get; set; } = DateTime.UtcNow;
    public virtual Producto? IdProductoNavigation { get; set; }
}
