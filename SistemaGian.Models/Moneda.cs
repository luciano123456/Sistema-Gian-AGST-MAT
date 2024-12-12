using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class Moneda
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public decimal Cotizacion { get; set; }

    public string? Image { get; set; }

    public virtual ICollection<Producto> Productos { get; set; } = new List<Producto>();
}
