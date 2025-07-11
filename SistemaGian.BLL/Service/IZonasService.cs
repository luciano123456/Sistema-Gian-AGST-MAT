﻿using SistemaGian.Models;

namespace SistemaGian.BLL.Service
{
    public interface IZonasService
    {
        Task<bool> Eliminar(int id, int idCliente);
        Task<bool> Actualizar(Zona model);
        Task<bool> ActualizarZonaCliente(ZonasCliente model);
        Task<bool> Insertar(Zona model);
        Task<bool> InsertarZonaCliente(string zonas, int idCliente);

        Task<Zona> Obtener(int id, int idCliente);

        Task<IQueryable<Zona>> ObtenerTodos();
        Task<IQueryable<Zona>> ObtenerPorCliente(int IdCliente);

        Task<bool> AumentarPrecios(string zonas, int idCliente, decimal porcentaje);
        Task<bool> BajarPrecios(string zonas, int idCliente, decimal porcentaje);
    }

}
