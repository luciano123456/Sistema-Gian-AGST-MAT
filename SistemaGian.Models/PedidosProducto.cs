using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class PedidosProducto
{
    public int Id { get; set; }

    public int? IdPedido { get; set; }

    public int? IdProducto { get; set; }

    public decimal? PrecioCosto { get; set; }

    public decimal? PrecioVenta { get; set; }

    public decimal? Cantidad { get; set; }

    public decimal? ProductoCantidad { get; set; }

    public decimal? CantidadUsadaAcopio { get; set; }

    public int? IdMoneda { get; set; }

    public decimal? Cotizacion { get; set; }

    public decimal? PrecioCostoArs { get; set; }

    public decimal? PrecioVentaArs { get; set; }

    public decimal? TotalArs { get; set; }

    public virtual Moneda? IdMonedaNavigation { get; set; }

    public virtual Pedido? IdPedidoNavigation { get; set; }

    public virtual Producto? IdProductoNavigation { get; set; }
}
