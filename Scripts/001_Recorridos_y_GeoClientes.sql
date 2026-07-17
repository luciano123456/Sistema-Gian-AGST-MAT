/*
  Script: Geo de clientes + módulo Recorridos
  Ejecutar en Sistema_Gian / Sistema_Gian_TEST
*/

-- ========== CLIENTES: coordenadas ==========
IF COL_LENGTH('dbo.Clientes', 'Latitud') IS NULL
    ALTER TABLE dbo.Clientes ADD Latitud DECIMAL(10, 7) NULL;

IF COL_LENGTH('dbo.Clientes', 'Longitud') IS NULL
    ALTER TABLE dbo.Clientes ADD Longitud DECIMAL(10, 7) NULL;

IF COL_LENGTH('dbo.Clientes', 'PlaceId') IS NULL
    ALTER TABLE dbo.Clientes ADD PlaceId VARCHAR(255) NULL;

IF COL_LENGTH('dbo.Clientes', 'DireccionMaps') IS NULL
    ALTER TABLE dbo.Clientes ADD DireccionMaps VARCHAR(500) NULL;
GO

-- Tabla de usuarios (puede llamarse Usuarios)
DECLARE @UsuariosTable SYSNAME = NULL;
IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL SET @UsuariosTable = 'Usuarios';
ELSE IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL SET @UsuariosTable = 'Users';
ELSE IF OBJECT_ID('dbo.User', 'U') IS NOT NULL SET @UsuariosTable = 'User';

-- ========== RECORRIDOS ==========
IF OBJECT_ID('dbo.Recorridos', 'U') IS NULL
BEGIN
    DECLARE @sql NVARCHAR(MAX) = N'
    CREATE TABLE dbo.Recorridos (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Recorridos PRIMARY KEY,
        IdUsuario       INT NOT NULL,
        Nombre          VARCHAR(200) NOT NULL,
        Estado          VARCHAR(30) NOT NULL CONSTRAINT DF_Recorridos_Estado DEFAULT (''Borrador''),
        FechaCreacion   DATETIME NOT NULL CONSTRAINT DF_Recorridos_FechaCreacion DEFAULT (GETDATE()),
        FechaInicio     DATETIME NULL,
        FechaFin        DATETIME NULL,
        OrigenLat       DECIMAL(10, 7) NULL,
        OrigenLng       DECIMAL(10, 7) NULL,
        OrigenDireccion VARCHAR(500) NULL,
        DistanciaMetros INT NULL,
        DuracionSegundos INT NULL,
        Observaciones   VARCHAR(1000) NULL
    );';
    EXEC sp_executesql @sql;

    IF @UsuariosTable IS NOT NULL
    BEGIN
        SET @sql = N'ALTER TABLE dbo.Recorridos ADD CONSTRAINT FK_Recorridos_Usuarios
            FOREIGN KEY (IdUsuario) REFERENCES dbo.' + QUOTENAME(@UsuariosTable) + N'(Id);';
        EXEC sp_executesql @sql;
    END
END
GO

IF OBJECT_ID('dbo.RecorridosParadas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecorridosParadas (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RecorridosParadas PRIMARY KEY,
        IdRecorrido     INT NOT NULL,
        IdCliente       INT NULL,
        Orden           INT NOT NULL,
        NombreCliente   VARCHAR(255) NULL,
        Direccion       VARCHAR(500) NULL,
        Latitud         DECIMAL(10, 7) NOT NULL,
        Longitud        DECIMAL(10, 7) NOT NULL,
        EstadoParada    VARCHAR(30) NOT NULL CONSTRAINT DF_RecorridosParadas_Estado DEFAULT ('Pendiente'),
        FechaVisitada   DATETIME NULL,
        Notas           VARCHAR(500) NULL,
        CONSTRAINT FK_RecorridosParadas_Recorridos FOREIGN KEY (IdRecorrido) REFERENCES dbo.Recorridos(Id) ON DELETE CASCADE,
        CONSTRAINT FK_RecorridosParadas_Clientes FOREIGN KEY (IdCliente) REFERENCES dbo.Clientes(Id)
    );

    CREATE INDEX IX_RecorridosParadas_IdRecorrido ON dbo.RecorridosParadas(IdRecorrido, Orden);
END
GO

IF OBJECT_ID('dbo.RecorridosPlantillas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecorridosPlantillas (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RecorridosPlantillas PRIMARY KEY,
        IdUsuario       INT NOT NULL,
        Nombre          VARCHAR(200) NOT NULL,
        EsPredeterminada BIT NOT NULL CONSTRAINT DF_RecorridosPlantillas_Pred DEFAULT (0),
        OrigenLat       DECIMAL(10, 7) NULL,
        OrigenLng       DECIMAL(10, 7) NULL,
        OrigenDireccion VARCHAR(500) NULL,
        FechaCreacion   DATETIME NOT NULL CONSTRAINT DF_RecorridosPlantillas_Fecha DEFAULT (GETDATE())
    );
END
GO

IF OBJECT_ID('dbo.RecorridosPlantillasParadas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecorridosPlantillasParadas (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RecorridosPlantillasParadas PRIMARY KEY,
        IdPlantilla     INT NOT NULL,
        IdCliente       INT NOT NULL,
        Orden           INT NOT NULL,
        CONSTRAINT FK_RecPlantillasParadas_Plantilla FOREIGN KEY (IdPlantilla) REFERENCES dbo.RecorridosPlantillas(Id) ON DELETE CASCADE,
        CONSTRAINT FK_RecPlantillasParadas_Cliente FOREIGN KEY (IdCliente) REFERENCES dbo.Clientes(Id)
    );

    CREATE INDEX IX_RecPlantillasParadas_Plantilla ON dbo.RecorridosPlantillasParadas(IdPlantilla, Orden);
END
GO

IF OBJECT_ID('dbo.RecorridosEventos', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecorridosEventos (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RecorridosEventos PRIMARY KEY,
        IdRecorrido     INT NULL,
        IdUsuario       INT NOT NULL,
        Tipo            VARCHAR(50) NOT NULL,
        Mensaje         VARCHAR(1000) NOT NULL,
        Fecha           DATETIME NOT NULL CONSTRAINT DF_RecorridosEventos_Fecha DEFAULT (GETDATE()),
        CONSTRAINT FK_RecorridosEventos_Recorridos FOREIGN KEY (IdRecorrido) REFERENCES dbo.Recorridos(Id) ON DELETE SET NULL
    );

    CREATE INDEX IX_RecorridosEventos_Usuario ON dbo.RecorridosEventos(IdUsuario, Fecha DESC);
END
GO
