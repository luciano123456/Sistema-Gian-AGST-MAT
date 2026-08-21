namespace SistemaGian.Models;

public class WebBanner
{
    public int Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string? Subtitulo { get; set; }
    public string? ImagenFileName { get; set; }
    public string? ImagenOriginal { get; set; }
    public string? LinkUrl { get; set; }
    public string? CtaLabel { get; set; }
    public int Orden { get; set; }
    public bool Activo { get; set; } = true;
    public bool MostrarInicio { get; set; } = true;
    public bool MostrarCatalogo { get; set; } = true;
    public DateTime FechaActualizacionUtc { get; set; } = DateTime.UtcNow;
}
