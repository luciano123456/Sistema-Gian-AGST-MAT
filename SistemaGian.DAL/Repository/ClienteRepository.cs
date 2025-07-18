﻿using Microsoft.EntityFrameworkCore;
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
    public class ClienteRepository : IClienteRepository<Cliente>
    {

        private readonly SistemaGianContext _dbcontext;

        public ClienteRepository(SistemaGianContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Cliente model)
        {
            _dbcontext.Clientes.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Cliente model = _dbcontext.Clientes.First(c => c.Id == id);
            _dbcontext.Clientes.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Cliente model)
        {
            _dbcontext.Clientes.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Cliente> Obtener(int id)
        {
            Cliente model = await _dbcontext.Clientes.FindAsync(id);
            return model;
        }





        public async Task<IQueryable<Cliente>> ObtenerTodos()
        {
            IQueryable<Cliente> query = _dbcontext.Clientes.Include(c => c.IdProvinciaNavigation);
            return await Task.FromResult(query);
        }

        public async Task<bool> SumarSaldoInterno(int idCliente, decimal saldo, string observaciones = null)
        {
            try
            {
                        var model = await _dbcontext.Clientes.FindAsync(idCliente);

                if (model == null)
                    return false;

                model.SaldoAfavor = (model.SaldoAfavor ?? 0) + saldo;

                var historial = new ClientesHistorialSaldo
                {
                    Fecha = DateTime.Now,
                    IdCliente = idCliente,
                    Ingreso = saldo,
                    Egreso = 0,
                    Observaciones = observaciones
                };

                _dbcontext.ClientesHistorialSaldos.Add(historial);

                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch
            {
                throw;
            }
        }


        public async Task<bool> SumarSaldo(int idCliente, decimal saldo, string observaciones = null)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var model = await _dbcontext.Clientes.FindAsync(idCliente);

                if (model == null)
                    return false;

                model.SaldoAfavor = (model.SaldoAfavor ?? 0) + saldo;

                var historial = new ClientesHistorialSaldo
                {
                    Fecha = DateTime.Now,
                    IdCliente = idCliente,
                    Ingreso = saldo,
                    Egreso = 0,
                    Observaciones = observaciones
                };

                _dbcontext.ClientesHistorialSaldos.Add(historial);

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw; // O simplemente return false si preferís no propagar la excepción
            }
        }

        public async Task<bool> RestarSaldo(int idCliente, decimal saldo, string observaciones = null)
        {
            using var transaction = await _dbcontext.Database.BeginTransactionAsync();
            try
            {
                var model = await _dbcontext.Clientes.FindAsync(idCliente);

                if (model == null)
                    return false;

                model.SaldoAfavor = (model.SaldoAfavor ?? 0) - saldo;

                var historial = new ClientesHistorialSaldo
                {
                    Fecha = DateTime.Now,
                    IdCliente = idCliente,
                    Ingreso = 0,
                    Egreso = saldo,
                    Observaciones = observaciones
                };

                _dbcontext.ClientesHistorialSaldos.Add(historial);

                await _dbcontext.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw; // O return false si no querés propagar
            }
        }

        public async Task<IQueryable<ClientesHistorialSaldo>> ObtenerHistorialCrediticio(int idCliente)
        {
            IQueryable<ClientesHistorialSaldo> query = _dbcontext.ClientesHistorialSaldos
                .Where(h => h.IdCliente == idCliente)
                .OrderByDescending(h => h.Fecha);

            return await Task.FromResult(query);
        }



    }
}
