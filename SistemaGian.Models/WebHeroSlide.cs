namespace SistemaGian.Models;

public class WebHeroSlide
{
    public int Id { get; set; }
    public string Placement { get; set; } = "home";
    public string? ImagenFileName { get; set; }
    public string? ImagenOriginal { get; set; }
    public int Orden { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaActualizacionUtc { get; set; } = DateTime.UtcNow;
}
