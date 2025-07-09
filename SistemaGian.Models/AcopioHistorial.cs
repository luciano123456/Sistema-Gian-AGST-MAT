using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class AcopioHistorial
{
    public int Id { get; set; }

    public int IdProducto { get; set; }

    public decimal? Ingreso { get; set; }

    public decimal? Egreso { get; set; }

    public string? Observaciones { get; set; }

    public DateTime Fecha { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;
}
