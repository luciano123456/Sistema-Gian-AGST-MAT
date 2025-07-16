using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class AcopioStockActual
{
    public int IdProducto { get; set; }

    public decimal CantidadActual { get; set; }

    public int? IdProveedor { get; set; }

    public DateTime FechaUltimaActualizacion { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;
    public virtual Proveedor? IdProveedorNavigation { get; set; }
}
