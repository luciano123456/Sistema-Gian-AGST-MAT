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
    public decimal? Peso { get; set; }
    public string UnidadMedida { get; set; }
    public string Nombre { get; set; }

    public decimal? Cantidad { get; set; }

    public virtual Pedido? IdPedidoNavigation { get; set; }

    public virtual Producto? IdProductoNavigation { get; set; }

    public decimal CantidadUsadaAcopio { get; set; }

    public int IdMoneda { get; set; }

    public string Moneda { get; set; }

    public decimal Cotizacion { get; set; }

    public decimal PrecioCostoArs { get; set; }

    public decimal PrecioVentaArs { get; set; }

    public decimal TotalArs { get; set; }

}
