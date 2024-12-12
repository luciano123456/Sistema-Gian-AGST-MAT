using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class ProductosPreciosCliente
{
    public int Id { get; set; }

    public int IdProducto { get; set; }

    public DateTime? FechaActualizacion { get; set; }

    public int IdCliente { get; set; }

    public int IdProveedor { get; set; }

    public decimal PCosto { get; set; }

    public decimal PVenta { get; set; }

    public decimal PorcGanancia { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual Proveedor IdProveedorNavigation { get; set; } = null!;
}
