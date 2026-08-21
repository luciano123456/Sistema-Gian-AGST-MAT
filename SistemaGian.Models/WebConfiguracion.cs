namespace SistemaGian.Models;

public class WebConfiguracion
{
    public int Id { get; set; }
    public string Clave { get; set; } = string.Empty;
    public string Valor { get; set; } = string.Empty;
    public DateTime FechaActualizacionUtc { get; set; } = DateTime.UtcNow;
}
