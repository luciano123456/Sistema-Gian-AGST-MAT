﻿using SistemaGian.DAL.DataContext;
using SistemaGian.Models;

namespace SistemaGian.Application.Models.ViewModels
{
    public class VMPedido
    {
        public int? Id { get; set; }

        public DateTime? Fecha { get; set; }

        public int? IdCliente { get; set; }

        public DateTime? FechaEntrega { get; set; }

        public string? NroRemito { get; set; }

        public decimal? CostoFlete { get; set; }

        public int? IdProveedor { get; set; }

        public int? IdZona { get; set; }

        public int? IdChofer { get; set; }

        public decimal? TotalCliente { get; set; }

        public decimal? RestanteCliente { get; set; }

        public decimal? TotalProveedor { get; set; }

        public decimal? RestanteProveedor { get; set; }

        public string? Estado { get; set; }

        public string? Observacion { get; set; }

        public virtual Cliente? IdClienteNavigation { get; set; }

        public virtual Proveedor? IdProveedorNavigation { get; set; }

        public virtual ICollection<PagosPedidosCliente>? PagosPedidosClientes { get; set; } = new List<PagosPedidosCliente>();

        public virtual ICollection<PagosPedidosProveedor>? PagosPedidosProveedores { get; set; } = new List<PagosPedidosProveedor>();

        public virtual ICollection<PedidosProducto>? PedidosProductos { get; set; } = new List<PedidosProducto>();
    }
}
