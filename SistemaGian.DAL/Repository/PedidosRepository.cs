﻿using Azure;
using Microsoft.EntityFrameworkCore;
using SistemaGian.DAL.DataContext;
using SistemaGian.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaGian.DAL.Repository
{
    public class PedidosRepository : IPedidosRepository<Pedido>
    {
        private readonly IClienteRepository<Cliente> _clienteRepository;
        private readonly SistemaGianContext _dbcontext;


        public PedidosRepository(SistemaGianContext context, IClienteRepository<Cliente> clienteRepository)
        {
            _dbcontext = context;
            _clienteRepository = clienteRepository;
        }

        public async Task<bool> EliminarPagoCliente(int idPago)
        {
            PagosPedidosCliente pago = _dbcontext.PagosPedidosClientes.First(c => c.Id == idPago);
            await _dbcontext.SaveChangesAsync();
            return true;

        }

        public async Task<bool> EliminarPagoProveedor(int idPago)
        {
            PagosPedidosProveedor pago = _dbcontext.PagosPedidosProveedores.First(c => c.Id == idPago);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int idPedido)
        {
            using (var transaction = await _dbcontext.Database.BeginTransactionAsync())
            {
                try
                {
                    decimal devolucionPagos = 0;

                    // Obtener el pedido
                    var pedido = _dbcontext.Pedidos.FirstOrDefault(c => c.Id == idPedido);
                    if (pedido == null)
                        return false;

                    // Obtener los pagos de cliente asociados
                    var pagosCliente = await _dbcontext.PagosPedidosClientes
                        .Where(p => p.IdPedido == idPedido)
                        .ToListAsync();

                    // Devolver el saldo usado en cada pago
                    foreach (var pago in pagosCliente)
                    {
                        devolucionPagos = pago.SaldoUsado;
                    }

                    if (devolucionPagos > 0)
                    {
                        await _clienteRepository.SumarSaldoInterno((int)pedido.IdCliente, devolucionPagos,
                            $"Devolución por eliminación del pedido N° {pedido.Id}");
                    }

                    // Eliminar los pagos de cliente
                    _dbcontext.PagosPedidosClientes.RemoveRange(pagosCliente);

                    // Eliminar los pagos de proveedor
                    var pagosProveedor = await _dbcontext.PagosPedidosProveedores
                        .Where(p => p.IdPedido == idPedido)
                        .ToListAsync();
                    _dbcontext.PagosPedidosProveedores.RemoveRange(pagosProveedor);

                    // Obtener los productos del pedido
                    var productos = await _dbcontext.PedidosProductos
                        .Where(p => p.IdPedido == idPedido)
                        .ToListAsync();

                    foreach (var producto in productos)
                    {
                        if (producto.CantidadUsadaAcopio > 0)
                        {
                            var stock = await _dbcontext.AcopioStockActual
                                .FirstOrDefaultAsync(x => x.IdProducto == producto.IdProducto);

                            if (stock != null)
                            {
                                // Sumar la cantidad devuelta al stock
                                stock.CantidadActual += producto.CantidadUsadaAcopio;

                                // Registrar historial
                                _dbcontext.AcopioHistorial.Add(new AcopioHistorial
                                {
                                    IdProducto = (int)producto.IdProducto,
                                    IdProveedor = (int)pedido.IdProveedor,
                                    Fecha = DateTime.Now,
                                    Ingreso = producto.CantidadUsadaAcopio,
                                    Egreso = null,
                                    Observaciones = $"Devolución de acopio por eliminación del pedido N° {idPedido}"
                                });
                            }
                        }
                    }

                    // Eliminar los productos
                    _dbcontext.PedidosProductos.RemoveRange(productos);

                    // Eliminar el pedido
                    _dbcontext.Pedidos.Remove(pedido);

                    await _dbcontext.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    Console.WriteLine(ex);
                    return false;
                }
            }
        }



        public async Task<bool> Actualizar(Pedido pedido, List<PagosPedidosCliente> pagosCliente, List<PagosPedidosProveedor> pagosProveedores, List<PedidosProducto> productos)
        {
            // Inicia la transacción
            using (var transaction = await _dbcontext.Database.BeginTransactionAsync())
            {
                try
                {

                    // Insertar pagos de clientes
                    bool pagosClienteResult = await InsertarPagosCliente(pedido.Id, pagosCliente).ConfigureAwait(false);
                    if (!pagosClienteResult)
                    {
                        await transaction.RollbackAsync();
                        return false; // Si hubo un error en los pagos de clientes, rollback y retorno falso
                    }

                    // Insertar pagos de proveedores
                    bool pagosProveedorResult = await InsertarPagosProveedor(pedido.Id,pagosProveedores).ConfigureAwait(false);
                    if (!pagosProveedorResult)
                    {
                        await transaction.RollbackAsync();
                        return false; // Si hubo un error en los pagos de proveedores, rollback y retorno falso
                    }

                    // Insertar productos
                    bool productosResult = await InsertarProductos(productos, (int)pedido.IdProveedor).ConfigureAwait(false);
                    if (!productosResult)
                    {
                        await transaction.RollbackAsync();
                        return false; // Si hubo un error en los productos, rollback y retorno falso
                    }

                    // Si todo fue exitoso, confirmar la transacción
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    // Si ocurre cualquier error, hacer rollback de la transacción
                    await transaction.RollbackAsync();
                    Console.WriteLine(ex); // Opcional: loguear el error
                    return false;
                }
            }
        }

        public async Task<bool> Insertar(Pedido pedido, List<PagosPedidosCliente> pagosCliente, List<PagosPedidosProveedor> pagosProveedores, List<PedidosProducto> productos)
        {
            // Inicia la transacción
            using (var transaction = await _dbcontext.Database.BeginTransactionAsync())
            {
                try
                {
                    // Insertar el nuevo pedido y obtener el Id
                    bool pedidoResult = await NuevoPedido(pedido).ConfigureAwait(false);
                    if (!pedidoResult)
                    {
                        await transaction.RollbackAsync();
                        return false; // Si hubo un error en la inserción del pedido, rollback y retorno falso
                    }

                    // Obtener el Id del pedido recién insertado
                    int idPedido = pedido.Id;

                    // Asociar el Id del pedido a los pagos de clientes
                    foreach (var pagoCliente in pagosCliente)
                    {
                        pagoCliente.IdPedido = idPedido;
                    }

                    // Insertar pagos de clientes
                    bool pagosClienteResult = await InsertarPagosCliente(pedido.Id, pagosCliente).ConfigureAwait(false);
                    if (!pagosClienteResult)
                    {
                        await transaction.RollbackAsync();
                        return false; // Si hubo un error en los pagos de clientes, rollback y retorno falso
                    }

                    // Asociar el Id del pedido a los pagos de proveedores
                    foreach (var pagoProveedor in pagosProveedores)
                    {
                        pagoProveedor.IdPedido = idPedido;
                    }

                    // Insertar pagos de proveedores
                    bool pagosProveedorResult = await InsertarPagosProveedor(pedido.Id, pagosProveedores).ConfigureAwait(false);
                    if (!pagosProveedorResult)
                    {
                        await transaction.RollbackAsync();
                        return false; // Si hubo un error en los pagos de proveedores, rollback y retorno falso
                    }

                    // Asociar el Id del pedido a los productos
                    foreach (var producto in productos)
                    {
                        producto.IdPedido = idPedido;
                    }

                    // Insertar productos
                    bool productosResult = await InsertarProductos(productos, (int)pedido.IdProveedor).ConfigureAwait(false);
                    if (!productosResult)
                    {
                        await transaction.RollbackAsync();
                        return false; // Si hubo un error en los productos, rollback y retorno falso
                    }

                    // Si todo fue exitoso, confirmar la transacción
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    // Si ocurre cualquier error, hacer rollback de la transacción
                    await transaction.RollbackAsync();
                    Console.WriteLine(ex); // Opcional: loguear el error
                    return false;
                }
            }
        }

        public async Task<bool> InsertarPagosCliente(int idPedido, List<PagosPedidosCliente> pagos)
        {
            try
            {
                var pedido = await _dbcontext.Pedidos
                                             .AsNoTracking()
                                             .FirstOrDefaultAsync(p => p.Id == idPedido);

                if (pedido == null)
                    return false;

                var cliente = await _dbcontext.Clientes
                                              .FirstOrDefaultAsync(c => c.Id == pedido.IdCliente);

                if (cliente == null)
                    return false;

                var pagosExistentes = await _dbcontext.PagosPedidosClientes
                                                      .Where(x => x.IdPedido == idPedido)
                                                      .ToListAsync();

                // 🔍 Identificar pagos a eliminar
                var pagosAEliminar = pagosExistentes
                    .Where(pe => !pagos.Any(p => p.Id == pe.Id))
                    .ToList();

                foreach (var pe in pagosAEliminar)
                {
                    cliente.SaldoAfavor += pe.SaldoUsado;

                    _dbcontext.ClientesHistorialSaldos.Add(new ClientesHistorialSaldo
                    {
                        Fecha = DateTime.Now,
                        IdCliente = cliente.Id,
                        Ingreso = pe.SaldoUsado,
                        Egreso = 0,
                        Observaciones = $"Devolución de saldo por eliminación de pago del pedido N° {idPedido}"
                    });
                }

                _dbcontext.PagosPedidosClientes.RemoveRange(pagosAEliminar);

                // 🔁 Insertar nuevos o modificar existentes
                foreach (var p in pagos)
                {
                    var existente = pagosExistentes.FirstOrDefault(x => x.Id == p.Id);

                    if (existente != null)
                    {
                        // 🔁 Modificación
                        decimal diferencia = p.SaldoUsado - existente.SaldoUsado;

                        if (diferencia != 0)
                        {
                            cliente.SaldoAfavor -= diferencia;

                            _dbcontext.ClientesHistorialSaldos.Add(new ClientesHistorialSaldo
                            {
                                Fecha = DateTime.Now,
                                IdCliente = cliente.Id,
                                Ingreso = diferencia < 0 ? Math.Abs(diferencia) : 0,
                                Egreso = diferencia > 0 ? diferencia : 0,
                                Observaciones = $"Ajuste de saldo por modificación de pago del pedido N° {idPedido}"
                            });
                        }

                        existente.Fecha = p.Fecha;
                        existente.Cotizacion = p.Cotizacion;
                        existente.Total = p.Total;
                        existente.TotalArs = p.TotalArs;
                        existente.Observacion = p.Observacion;
                        existente.SaldoUsado = p.SaldoUsado;
                    }
                    else
                    {
                        // ➕ Nuevo
                        p.IdPedido = idPedido;
                        cliente.SaldoAfavor -= p.SaldoUsado;

                        if (p.SaldoUsado > 0)
                        {
                            _dbcontext.ClientesHistorialSaldos.Add(new ClientesHistorialSaldo
                            {
                                Fecha = DateTime.Now,
                                IdCliente = cliente.Id,
                                Ingreso = 0,
                                Egreso = p.SaldoUsado,
                                Observaciones = $"Uso de saldo por nuevo pago del pedido N° {idPedido}"
                            });
                        }

                        _dbcontext.PagosPedidosClientes.Add(p);
                    }
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }






        public async Task<bool> InsertarPagosProveedor(int idPedido, List<PagosPedidosProveedor> pagos)
        {
            try
            {
                var pagosExistentes = await _dbcontext.PagosPedidosProveedores
                                                      .Where(x => x.IdPedido == idPedido)
                                                      .ToListAsync();

                // ✅ Si no hay pagos nuevos, eliminar todos los existentes
                if (pagos.Count == 0)
                {
                    _dbcontext.PagosPedidosProveedores.RemoveRange(pagosExistentes);

                    await _dbcontext.SaveChangesAsync();
                }

                // ✅ Si hay pagos nuevos, actualizar lo necesario
                var pagosAEliminar = pagosExistentes
                                     .Where(pe => !pagos.Any(p => p.Id == pe.Id))
                                     .ToList();

                _dbcontext.PagosPedidosProveedores.RemoveRange(pagosAEliminar);

                foreach (PagosPedidosProveedor p in pagos)
                {
                    var pagoExistente = pagosExistentes
                                        .FirstOrDefault(x => x.Id == p.Id);

                    if (pagoExistente != null)
                    {
                        pagoExistente.Fecha = p.Fecha;
                        pagoExistente.Cotizacion = p.Cotizacion;
                        pagoExistente.Total = p.Total;
                        pagoExistente.TotalArs = p.TotalArs;
                        pagoExistente.Observacion = p.Observacion;
                    }
                    else
                    {
                        _dbcontext.PagosPedidosProveedores.Add(p);
                    }
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }



        public async Task<bool> InsertarProductos(List<PedidosProducto> productos, int idProveedor)
        {
            try
            {
                var idPedidos = productos.Select(p => p.IdPedido).Distinct().ToList();

                foreach (var idPedido in idPedidos)
                {
                    var productosExistentes = await _dbcontext.PedidosProductos
                        .Where(x => x.IdPedido == idPedido)
                        .ToListAsync();

                    var productosAEliminar = productosExistentes
                        .Where(pe => !productos.Any(p => p.IdPedido == pe.IdPedido && p.IdProducto == pe.IdProducto))
                        .ToList();

                    foreach (var eliminado in productosAEliminar)
                    {
                        if (eliminado.CantidadUsadaAcopio > 0)
                        {
                            var stock = await _dbcontext.AcopioStockActual
                                .FirstOrDefaultAsync(x => x.IdProducto == eliminado.IdProducto);
                            if (stock != null)
                            {
                                stock.CantidadActual += eliminado.CantidadUsadaAcopio;

                                _dbcontext.AcopioHistorial.Add(new AcopioHistorial
                                {
                                    IdProducto = (int)eliminado.IdProducto,
                                    IdProveedor = idProveedor,
                                    Fecha = DateTime.Now,
                                    Ingreso = eliminado.CantidadUsadaAcopio,
                                    Egreso = 0,
                                    Observaciones = $"Devolución por eliminación del producto en pedido N° {idPedido}"
                                });
                            }
                        }
                    }

                    _dbcontext.PedidosProductos.RemoveRange(productosAEliminar);

                    foreach (var p in productos)
                    {
                        var productoExistente = productosExistentes
                            .FirstOrDefault(x => x.IdPedido == p.IdPedido && x.IdProducto == p.IdProducto);

                        var stock = await _dbcontext.AcopioStockActual
                            .FirstOrDefaultAsync(x => x.IdProducto == p.IdProducto);

                        if (productoExistente != null)
                        {
                            var diferencia = p.CantidadUsadaAcopio - productoExistente.CantidadUsadaAcopio;

                            if (diferencia != 0 && stock != null)
                            {
                                if (diferencia > 0)
                                {
                                    if (stock.CantidadActual < diferencia)
                                        throw new InvalidOperationException("Stock de acopio insuficiente.");

                                    stock.CantidadActual -= diferencia;

                                    _dbcontext.AcopioHistorial.Add(new AcopioHistorial
                                    {
                                        IdProducto = (int)p.IdProducto,
                                        IdProveedor = idProveedor,
                                        Fecha = DateTime.Now,
                                        Ingreso = 0,
                                        Egreso = diferencia,
                                        Observaciones = $"Uso adicional por modificación de producto en pedido N° {idPedido}"
                                    });
                                }
                                else
                                {
                                    stock.CantidadActual += Math.Abs(diferencia);

                                    _dbcontext.AcopioHistorial.Add(new AcopioHistorial
                                    {
                                        IdProducto = (int)p.IdProducto,
                                        IdProveedor = idProveedor,
                                        Fecha = DateTime.Now,
                                        Ingreso = Math.Abs(diferencia),
                                        Egreso = 0,
                                        Observaciones = $"Devolución por modificación de producto en pedido N° {idPedido}"
                                    });
                                }
                            }

                            productoExistente.PrecioCosto = p.PrecioCosto;
                            productoExistente.PrecioVenta = p.PrecioVenta;
                            productoExistente.Cantidad = p.Cantidad;
                            productoExistente.ProductoCantidad = p.ProductoCantidad;
                            productoExistente.CantidadUsadaAcopio = p.CantidadUsadaAcopio;
                        }
                        else
                        {
                            if (p.CantidadUsadaAcopio > 0 && stock != null)
                            {
                                if (stock.CantidadActual < p.CantidadUsadaAcopio)
                                    throw new InvalidOperationException("Stock de acopio insuficiente.");

                                stock.CantidadActual -= p.CantidadUsadaAcopio;

                                _dbcontext.AcopioHistorial.Add(new AcopioHistorial
                                {
                                    IdProducto = (int)p.IdProducto,
                                    IdProveedor = idProveedor,
                                    Fecha = DateTime.Now,
                                    Ingreso = 0,
                                    Egreso = p.CantidadUsadaAcopio,
                                    Observaciones = $"Uso de acopio por alta de producto en pedido N° {idPedido}"
                                });
                            }

                            _dbcontext.PedidosProductos.Add(p);
                        }
                    }
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }



        public async Task<bool> NuevoPedido(Pedido model)
        {
            try
            {
                _dbcontext.Pedidos.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }


        public async Task<bool> ActualizarPagosCliente(List<PagosPedidosCliente> pagos)
        {
            try
            {
                foreach (PagosPedidosCliente p in pagos)
                {
                    var pagoOriginal = await _dbcontext.PagosPedidosClientes
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x => x.Id == p.Id && x.IdPedido == p.IdPedido);

                    if (pagoOriginal != null)
                    {
                        decimal diferencia = p.SaldoUsado - pagoOriginal.SaldoUsado;

                        var pedido = await _dbcontext.Pedidos
                            .AsNoTracking()
                            .FirstOrDefaultAsync(x => x.Id == p.IdPedido);

                        if (pedido != null)
                        {
                            var cliente = await _dbcontext.Clientes.FirstOrDefaultAsync(c => c.Id == pedido.IdCliente);
                            if (cliente != null)
                            {
                                cliente.SaldoAfavor -= diferencia;
                            }
                        }

                        _dbcontext.PagosPedidosClientes.Update(p);
                    }
                }

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }




        public async Task<bool> ActualizarProductos(List<PedidosProducto> productos)
        {
            foreach (PedidosProducto p in productos)
            {
                _dbcontext.PedidosProductos.Update(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;

        }


        public async Task<bool> ActualizarPagosProveedor(List<PagosPedidosProveedor> pagos)
        {
            foreach (PagosPedidosProveedor p in pagos)
            {
                _dbcontext.PagosPedidosProveedores.Update(p);
            }

            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Pedido model)
        {
            _dbcontext.Pedidos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }


        public async Task<PagosPedidosProveedor> ObtenerPagoaProveedor(int idPago)
        {
            PagosPedidosProveedor pago = _dbcontext.PagosPedidosProveedores.First(c => c.Id == idPago);
            return pago;
        }

        public async Task<PagosPedidosCliente> ObtenerPagoCliente(int idPago)
        {
            PagosPedidosCliente pago = _dbcontext.PagosPedidosClientes.First(c => c.Id == idPago);
            return pago;
        }

        public async Task<List<PagosPedidosProveedor>> ObtenerPagosaProveedores(int idPedido)
        {
            List<PagosPedidosProveedor> pagos = _dbcontext.PagosPedidosProveedores.Where(c => c.IdPedido == idPedido).ToList();
            return pagos;
        }

        public async Task<List<PagosPedidosCliente>> ObtenerPagosClientes(int idPedido)
        {
            List<PagosPedidosCliente> pagos = _dbcontext.PagosPedidosClientes.Where(c => c.IdPedido == idPedido).ToList();
            return pagos;
        }

        public async Task<Pedido> ObtenerPedido(int idPedido)
        {
            Pedido pedido = _dbcontext.Pedidos
                .Include(c => c.IdClienteNavigation)
                .Include(c => c.IdProveedorNavigation)
                .FirstOrDefault(c => c.Id == idPedido);
            return pedido;
        }

        public async Task<List<PedidosProducto>> ObtenerProductosPedido(int idPedido)
        {
            try
            {

                List<PedidosProducto> productos = _dbcontext.PedidosProductos
                    .Include(c => c.IdProductoNavigation)
                    .ThenInclude(c => c.IdUnidadDeMedidaNavigation)
                    .Where(c => c.IdPedido == idPedido).ToList();
                return productos;

            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return null;
            }
        }

        public async Task<IQueryable<Pedido>> ObtenerTodos()
        {
            IQueryable<Pedido> query = _dbcontext.Pedidos
                .Include(c => c.IdClienteNavigation)
                .Include(c => c.IdProveedorNavigation);
            return await Task.FromResult(query);
        }

        public async Task<int> ObtenerUltimoNroRemito()
        {
            var ultimoNroRemitoStr = await _dbcontext.Pedidos
                .OrderByDescending(p => p.NroRemito)
                .Select(p => p.NroRemito)
                .FirstOrDefaultAsync();

            if (string.IsNullOrWhiteSpace(ultimoNroRemitoStr))
                return 0;

            if (int.TryParse(ultimoNroRemitoStr, out int nro))
                return nro;

            return 0;
        }




    }
}
