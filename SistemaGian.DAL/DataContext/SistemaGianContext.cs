using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SistemaGian.Models;

namespace SistemaGian.DAL.DataContext;

public partial class SistemaGianContext : DbContext
{
    public SistemaGianContext()
    {
    }

    public SistemaGianContext(DbContextOptions<SistemaGianContext> options)
        : base(options)
    {
    }

    private readonly IConfiguration _configuration;


    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var connectionString = _configuration.GetConnectionString("SistemaDB");
            optionsBuilder.UseSqlServer(connectionString);
        }
    }

    public virtual DbSet<AcopioHistorial> AcopioHistorial { get; set; }

    public virtual DbSet<AcopioStockActual> AcopioStockActual { get; set; }

    public virtual DbSet<Chofer> Choferes { get; set; }

    public virtual DbSet<Cliente> Clientes { get; set; }

    public virtual DbSet<ClientesHistorialSaldo> ClientesHistorialSaldos { get; set; }

    public virtual DbSet<EstadosUsuario> EstadosUsuarios { get; set; }

    public virtual DbSet<Gasto> Gastos { get; set; }

    public virtual DbSet<GastosTipo> GastosTipos { get; set; }

    public virtual DbSet<Moneda> Monedas { get; set; }

    public virtual DbSet<PagosPedidosCliente> PagosPedidosClientes { get; set; }

    public virtual DbSet<PagosPedidosProveedor> PagosPedidosProveedores { get; set; }

    public virtual DbSet<Pedido> Pedidos { get; set; }

    public virtual DbSet<PedidosProducto> PedidosProductos { get; set; }

    public virtual DbSet<Producto> Productos { get; set; }

    public virtual DbSet<ProductosCategoria> ProductosCategorias { get; set; }

    public virtual DbSet<ProductosMarca> ProductosMarcas { get; set; }

    public virtual DbSet<ProductosPreciosCliente> ProductosPreciosClientes { get; set; }

    public virtual DbSet<ProductosPreciosHistorial> ProductosPreciosHistorial { get; set; }

    public virtual DbSet<ProductosPreciosProveedor> ProductosPreciosProveedores { get; set; }

    public virtual DbSet<ProductosUnidadesDeMedida> ProductosUnidadesDeMedida { get; set; }

    public virtual DbSet<Proveedor> Proveedores { get; set; }

    public virtual DbSet<Provincia> Provincias { get; set; }

    public virtual DbSet<Rol> Roles { get; set; }

    public virtual DbSet<User> Usuarios { get; set; }

    public virtual DbSet<Zona> Zonas { get; set; }

    public virtual DbSet<ZonasCliente> ZonasClientes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AcopioHistorial>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Acopio_H__3214EC073EB4E8B4");

            entity.ToTable("Acopio_Historial");

            entity.Property(e => e.Egreso).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Fecha)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Ingreso).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Observaciones)
                .HasMaxLength(250)
                .IsUnicode(false);

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.AcopioHistorial)
                .HasForeignKey(d => d.IdProducto)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_AcopioHistorial_Producto");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.AcopioHistorial)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_Acopio_Historial_Proveedores");
        });

        modelBuilder.Entity<AcopioStockActual>(entity =>
        {
            entity.HasKey(e => e.IdProducto).HasName("PK__Acopio_S__098892100FB8CA8A");

            entity.ToTable("Acopio_StockActual");

            entity.Property(e => e.IdProducto).ValueGeneratedNever();
            entity.Property(e => e.CantidadActual).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.FechaUltimaActualizacion)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.IdProductoNavigation).WithOne(p => p.AcopioStockActual)
                .HasForeignKey<AcopioStockActual>(d => d.IdProducto)
                .HasConstraintName("FK_AcopioStockActual_Producto");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.AcopioStockActual)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_Acopio_StockActual_Proveedores");
        });

        modelBuilder.Entity<Chofer>(entity =>
        {
            entity.Property(e => e.Direccion)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Cliente>(entity =>
        {
            entity.Property(e => e.Direccion)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Dni)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("DNI");
            entity.Property(e => e.Localidad)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Saldo).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.SaldoAfavor)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("SaldoAFavor");
            entity.Property(e => e.Telefono)
                .HasMaxLength(20)
                .IsUnicode(false);

            entity.HasOne(d => d.IdProvinciaNavigation).WithMany(p => p.Clientes)
                .HasForeignKey(d => d.IdProvincia)
                .HasConstraintName("FK_Clientes_Provincias");
        });

        modelBuilder.Entity<ClientesHistorialSaldo>(entity =>
        {
            entity.Property(e => e.Egreso).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.Ingreso).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Observaciones)
                .HasMaxLength(500)
                .IsUnicode(false);

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ClientesHistorialSaldos)
                .HasForeignKey(d => d.IdCliente)
                .HasConstraintName("FK_ClientesHistorialSaldos_ClientesHistorialSaldos");
        });

        modelBuilder.Entity<EstadosUsuario>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Gasto>(entity =>
        {
            entity.Property(e => e.Concepto)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Cotizacion).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.Importe).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.ImporteArs)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("ImporteARS");

            entity.HasOne(d => d.IdMonedaNavigation).WithMany(p => p.Gastos)
                .HasForeignKey(d => d.IdMoneda)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Gastos_Monedas");

            entity.HasOne(d => d.IdTipoNavigation).WithMany(p => p.Gastos)
                .HasForeignKey(d => d.IdTipo)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Gastos_Gastos_Tipos");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.Gastos)
                .HasForeignKey(d => d.IdUsuario)
                .HasConstraintName("FK_Gastos_Usuarios");
        });

        modelBuilder.Entity<GastosTipo>(entity =>
        {
            entity.ToTable("Gastos_Tipos");

            entity.Property(e => e.Nombre)
                .HasMaxLength(250)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Moneda>(entity =>
        {
            entity.Property(e => e.Cotizacion).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Image).IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<PagosPedidosCliente>(entity =>
        {
            entity.Property(e => e.Cotizacion).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.Observacion)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.SaldoUsado).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Total).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.TotalArs)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("TotalARS");

            entity.HasOne(d => d.IdPedidoNavigation).WithMany(p => p.PagosPedidosClientes)
                .HasForeignKey(d => d.IdPedido)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_PagosPedidosClientes_Pedidos");
        });

        modelBuilder.Entity<PagosPedidosProveedor>(entity =>
        {
            entity.Property(e => e.Cotizacion).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.Observacion)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.Total).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.TotalArs)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("TotalARS");

            entity.HasOne(d => d.IdPedidoNavigation).WithMany(p => p.PagosPedidosProveedores)
                .HasForeignKey(d => d.IdPedido)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_PagosPedidosProveedores_Pedidos");
        });

        modelBuilder.Entity<Pedido>(entity =>
        {
            entity.Property(e => e.CostoFlete).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Estado)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.FechaEntrega).HasColumnType("datetime");
            entity.Property(e => e.NroRemito)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Observacion)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.PorcGanancia).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.RestanteCliente).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.RestanteProveedor).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.TotalCliente).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.TotalGanancia).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.TotalProveedor).HasColumnType("decimal(20, 2)");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.Pedidos)
                .HasForeignKey(d => d.IdCliente)
                .HasConstraintName("FK_Pedidos_Clientes");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.Pedidos)
                .HasForeignKey(d => d.IdProveedor)
                .HasConstraintName("FK_Pedidos_Proveedores");
        });

        modelBuilder.Entity<PedidosProducto>(entity =>
        {
            entity.Property(e => e.Cantidad).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.CantidadUsadaAcopio).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.Cotizacion).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.IdMoneda).HasDefaultValueSql("((1))");
            entity.Property(e => e.PrecioCosto).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.PrecioCostoArs).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PrecioVenta).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.PrecioVentaArs).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ProductoCantidad).HasColumnType("decimal(20, 10)");
            entity.Property(e => e.TotalArs).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.IdMonedaNavigation).WithMany(p => p.PedidosProductos)
                .HasForeignKey(d => d.IdMoneda)
                .HasConstraintName("FK_PedidosProductos_Monedas");

            entity.HasOne(d => d.IdPedidoNavigation).WithMany(p => p.PedidosProductos)
                .HasForeignKey(d => d.IdPedido)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_PedidosProductos_PedidosProductos");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.PedidosProductos)
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_PedidosProductos_Productos");
        });

        modelBuilder.Entity<Producto>(entity =>
        {
            entity.Property(e => e.Descripcion)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.FechaActualizacion)
                .HasColumnType("datetime")
                .HasColumnName("Fecha_Actualizacion");
            entity.Property(e => e.Image).IsUnicode(false);
            entity.Property(e => e.PCosto)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("P_Costo");
            entity.Property(e => e.PVenta)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("P_Venta");
            entity.Property(e => e.Peso).HasColumnType("decimal(20, 2)");
            entity.Property(e => e.PorcGanancia)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("Porc_Ganancia");
            entity.Property(e => e.ProductoCantidad).HasColumnType("decimal(20, 10)");

            entity.HasOne(d => d.IdCategoriaNavigation).WithMany(p => p.Productos)
                .HasForeignKey(d => d.IdCategoria)
                .HasConstraintName("FK_Productos_ProductosCategorias");

            entity.HasOne(d => d.IdMarcaNavigation).WithMany(p => p.Productos)
                .HasForeignKey(d => d.IdMarca)
                .HasConstraintName("FK_Productos_ProductosMarcas");

            entity.HasOne(d => d.IdMonedaNavigation).WithMany(p => p.Productos)
                .HasForeignKey(d => d.IdMoneda)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Productos_Monedas");

            entity.HasOne(d => d.IdUnidadDeMedidaNavigation).WithMany(p => p.Productos)
                .HasForeignKey(d => d.IdUnidadDeMedida)
                .HasConstraintName("FK_Productos_ProductosUnidadesDeMedida");
        });

        modelBuilder.Entity<ProductosCategoria>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ProductosMarca>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<ProductosPreciosCliente>(entity =>
        {
            entity.Property(e => e.FechaActualizacion)
                .HasColumnType("datetime")
                .HasColumnName("Fecha_Actualizacion");
            entity.Property(e => e.PCosto)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("P_Costo");
            entity.Property(e => e.PVenta)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("P_Venta");
            entity.Property(e => e.PorcGanancia)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("Porc_Ganancia");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ProductosPreciosClientes)
                .HasForeignKey(d => d.IdCliente)
                .HasConstraintName("FK_ProductosPreciosClientes_Clientes");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ProductosPreciosClientes)
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_ProductosPreciosClientes_Productos");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.ProductosPreciosClientes)
                .HasForeignKey(d => d.IdProveedor)
                .HasConstraintName("FK_ProductosPreciosClientes_Proveedores");
        });

        modelBuilder.Entity<ProductosPreciosHistorial>(entity =>
        {
            entity.ToTable("ProductosPreciosHistorial");

            entity.Property(e => e.Fecha).HasColumnType("datetime");
            entity.Property(e => e.PCostoAnterior)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("P_Costo_Anterior");
            entity.Property(e => e.PCostoNuevo)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("P_Costo_Nuevo");
            entity.Property(e => e.PVentaAnterior)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("P_Venta_Anterior");
            entity.Property(e => e.PVentaNuevo)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("P_Venta_Nuevo");
            entity.Property(e => e.PorGananciaNuevo)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("Por_Ganancia_Nuevo");
            entity.Property(e => e.PorcGananciaAnterior)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("Porc_Ganancia_Anterior");
            entity.Property(e => e.ProductoCantidad).HasColumnType("decimal(20, 10)");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ProductosPreciosHistorial)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_ProductosPreciosHistorial_Clientes");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ProductosPreciosHistorial)
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_ProductosPreciosHistorial_Productos");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.ProductosPreciosHistorial)
                .HasForeignKey(d => d.IdProveedor)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_ProductosPreciosHistorial_Proveedores");
        });

        modelBuilder.Entity<ProductosPreciosProveedor>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_ProductosPrecios");

            entity.Property(e => e.FechaActualizacion)
                .HasColumnType("datetime")
                .HasColumnName("Fecha_Actualizacion");
            entity.Property(e => e.PCosto)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("P_Costo");
            entity.Property(e => e.PVenta)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("P_Venta");
            entity.Property(e => e.PorcGanancia)
                .HasColumnType("decimal(20, 2)")
                .HasColumnName("Porc_Ganancia");
            entity.Property(e => e.ProductoCantidad).HasColumnType("decimal(20, 10)");

            entity.HasOne(d => d.IdProductoNavigation).WithMany(p => p.ProductosPreciosProveedor)
                .HasForeignKey(d => d.IdProducto)
                .HasConstraintName("FK_ProductosPrecios_Productos");

            entity.HasOne(d => d.IdProveedorNavigation).WithMany(p => p.ProductosPreciosProveedores)
                .HasForeignKey(d => d.IdProveedor)
                .HasConstraintName("FK_ProductosPrecios_Proveedores");
        });

        modelBuilder.Entity<ProductosUnidadesDeMedida>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Proveedor>(entity =>
        {
            entity.Property(e => e.Apodo)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Ubicacion)
                .HasMaxLength(500)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Provincia>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Rol>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.Apellido)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.CodigoRecuperacion)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.Contrasena)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Correo)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.Direccion)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Dni)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.Telefono)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Usuario)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("Usuario");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.IdEstado)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Usuarios_EstadosUsuarios");

            entity.HasOne(d => d.IdRolNavigation).WithMany(p => p.Usuarios)
                .HasForeignKey(d => d.IdRol)
                .HasConstraintName("FK_Usuarios_Roles");
        });

        modelBuilder.Entity<Zona>(entity =>
        {
            entity.Property(e => e.Nombre)
                .HasMaxLength(250)
                .IsUnicode(false);
            entity.Property(e => e.Precio).HasColumnType("decimal(20, 2)");
        });

        modelBuilder.Entity<ZonasCliente>(entity =>
        {
            entity.Property(e => e.Precio).HasColumnType("decimal(20, 2)");

            entity.HasOne(d => d.IdClienteNavigation).WithMany(p => p.ZonasClientes)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ZonasClientes_Clientes");

            entity.HasOne(d => d.IdZonaNavigation).WithMany(p => p.ZonasClientes)
                .HasForeignKey(d => d.IdZona)
                .HasConstraintName("FK_ZonasClientes_Zonas");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
