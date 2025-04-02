using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class VMPedidosProducto
{
    public int Id { get; set; }

    public int? IdPedido { get; set; }

    public int? IdProducto { get; set; }

    public decimal? PrecioVenta { get; set; }
    public decimal? PrecioCosto { get; set; }
    public decimal? Total { get; set; }
    public decimal? ProductoCantidad { get; set; }
    public string Nombre { get; set; }

    public int? Cantidad { get; set; }

    public virtual Pedido? IdPedidoNavigation { get; set; }

    public virtual Producto? IdProductoNavigation { get; set; }
}
