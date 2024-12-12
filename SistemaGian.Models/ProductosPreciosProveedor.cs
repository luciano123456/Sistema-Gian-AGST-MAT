using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class ProductosPreciosProveedor
{
    public int Id { get; set; }

    public int IdProducto { get; set; }

    public DateTime? FechaActualizacion { get; set; }

    public int IdProveedor { get; set; }

    public decimal PCosto { get; set; }

    public decimal PVenta { get; set; }

    public decimal PorcGanancia { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual Proveedor IdProveedorNavigation { get; set; } = null!;
}
