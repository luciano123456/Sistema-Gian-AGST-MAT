using System;
using System.Collections.Generic;

namespace SistemaGian.Models;

public partial class Producto
{
    public int Id { get; set; }

    public DateTime? FechaActualizacion { get; set; }

    public string Descripcion { get; set; } = null!;

    public int? IdMarca { get; set; }

    public int? IdCategoria { get; set; }

    public int IdMoneda { get; set; }

    public int? IdUnidadDeMedida { get; set; }

    public decimal PCosto { get; set; }

    public decimal PVenta { get; set; }

    public decimal PorcGanancia { get; set; }

    public string? Image { get; set; }

    public int? IdProveedor { get; set; }

    public virtual ProductosCategoria? IdCategoriaNavigation { get; set; }

    public virtual ProductosMarca? IdMarcaNavigation { get; set; }

    public virtual Moneda IdMonedaNavigation { get; set; } = null!;


    public virtual ProductosUnidadesDeMedida? IdUnidadDeMedidaNavigation { get; set; }

    public virtual ICollection<ProductosPreciosCliente> ProductosPreciosClientes { get; set; } = new List<ProductosPreciosCliente>();

    public virtual ICollection<ProductosPreciosHistorial> ProductosPreciosHistorial { get; set; } = new List<ProductosPreciosHistorial>();

    public virtual ICollection<ProductosPreciosProveedor> ProductosPreciosProveedor { get; set; } = new List<ProductosPreciosProveedor>();
    public virtual ICollection<PedidosProducto> PedidosProductos { get; set; } = new List<PedidosProducto>();
}
