/*
  Extensión: geo proveedores + tipo de destino en recorridos
*/

-- ========== PROVEEDORES: coordenadas ==========
IF COL_LENGTH('dbo.Proveedores', 'Latitud') IS NULL
    ALTER TABLE dbo.Proveedores ADD Latitud DECIMAL(10, 7) NULL;

IF COL_LENGTH('dbo.Proveedores', 'Longitud') IS NULL
    ALTER TABLE dbo.Proveedores ADD Longitud DECIMAL(10, 7) NULL;

IF COL_LENGTH('dbo.Proveedores', 'PlaceId') IS NULL
    ALTER TABLE dbo.Proveedores ADD PlaceId VARCHAR(255) NULL;

IF COL_LENGTH('dbo.Proveedores', 'DireccionMaps') IS NULL
    ALTER TABLE dbo.Proveedores ADD DireccionMaps VARCHAR(500) NULL;
GO

-- ========== RECORRIDOS: tipo destino ==========
IF COL_LENGTH('dbo.Recorridos', 'TipoDestino') IS NULL
    ALTER TABLE dbo.Recorridos ADD TipoDestino VARCHAR(20) NOT NULL
        CONSTRAINT DF_Recorridos_TipoDestino DEFAULT ('Clientes');
GO

IF COL_LENGTH('dbo.RecorridosPlantillas', 'TipoDestino') IS NULL
    ALTER TABLE dbo.RecorridosPlantillas ADD TipoDestino VARCHAR(20) NOT NULL
        CONSTRAINT DF_RecPlantillas_TipoDestino DEFAULT ('Clientes');
GO

-- ========== PARADAS: proveedor ==========
IF COL_LENGTH('dbo.RecorridosParadas', 'TipoParada') IS NULL
    ALTER TABLE dbo.RecorridosParadas ADD TipoParada VARCHAR(20) NOT NULL
        CONSTRAINT DF_RecorridosParadas_Tipo DEFAULT ('Cliente');
GO

IF COL_LENGTH('dbo.RecorridosParadas', 'IdProveedor') IS NULL
    ALTER TABLE dbo.RecorridosParadas ADD IdProveedor INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_RecorridosParadas_Proveedores')
BEGIN
    ALTER TABLE dbo.RecorridosParadas
        ADD CONSTRAINT FK_RecorridosParadas_Proveedores
        FOREIGN KEY (IdProveedor) REFERENCES dbo.Proveedores(Id);
END
GO

-- Plantillas paradas
IF COL_LENGTH('dbo.RecorridosPlantillasParadas', 'TipoParada') IS NULL
    ALTER TABLE dbo.RecorridosPlantillasParadas ADD TipoParada VARCHAR(20) NOT NULL
        CONSTRAINT DF_RecPlantParadas_Tipo DEFAULT ('Cliente');
GO

IF COL_LENGTH('dbo.RecorridosPlantillasParadas', 'IdProveedor') IS NULL
    ALTER TABLE dbo.RecorridosPlantillasParadas ADD IdProveedor INT NULL;
GO

-- IdCliente puede ser null si es proveedor
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.RecorridosPlantillasParadas')
      AND name = 'IdCliente' AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.RecorridosPlantillasParadas ALTER COLUMN IdCliente INT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_RecPlantillasParadas_Proveedor')
BEGIN
    ALTER TABLE dbo.RecorridosPlantillasParadas
        ADD CONSTRAINT FK_RecPlantillasParadas_Proveedor
        FOREIGN KEY (IdProveedor) REFERENCES dbo.Proveedores(Id);
END
GO
