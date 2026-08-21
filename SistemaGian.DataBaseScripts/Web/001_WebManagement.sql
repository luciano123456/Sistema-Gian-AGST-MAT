/*
  Gestión AGS MAT -> Web pública
  Ejecutar UNA vez sobre la base Sistema_Gian antes de usar Home > Web.
  No otorga acceso a la Web ni contiene secretos.
*/
USE [Sistema_Gian];
GO

IF OBJECT_ID(N'dbo.WebConfiguraciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WebConfiguraciones (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebConfiguraciones PRIMARY KEY,
        Clave VARCHAR(100) NOT NULL,
        Valor NVARCHAR(MAX) NOT NULL CONSTRAINT DF_WebConfiguraciones_Valor DEFAULT(N''),
        FechaActualizacionUtc DATETIME2 NOT NULL CONSTRAINT DF_WebConfiguraciones_Fecha DEFAULT(SYSUTCDATETIME()),
        CONSTRAINT UQ_WebConfiguraciones_Clave UNIQUE (Clave)
    );
END
GO

IF OBJECT_ID(N'dbo.WebProductosPublicados', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WebProductosPublicados (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebProductosPublicados PRIMARY KEY,
        IdProducto INT NOT NULL,
        Publicado BIT NOT NULL CONSTRAINT DF_WebProductosPublicados_Publicado DEFAULT(0),
        PrecioPublico DECIMAL(20,2) NULL,
        Slug VARCHAR(220) NULL,
        DescripcionPublica NVARCHAR(MAX) NULL,
        ImagenUrl VARCHAR(1000) NULL,
        Modelo3dUrl VARCHAR(1000) NULL,
        Destacado BIT NOT NULL CONSTRAINT DF_WebProductosPublicados_Destacado DEFAULT(0),
        Orden INT NOT NULL CONSTRAINT DF_WebProductosPublicados_Orden DEFAULT(0),
        FechaActualizacionUtc DATETIME2 NOT NULL CONSTRAINT DF_WebProductosPublicados_Fecha DEFAULT(SYSUTCDATETIME()),
        CONSTRAINT UQ_WebProductosPublicados_IdProducto UNIQUE (IdProducto),
        CONSTRAINT FK_WebProductosPublicados_Productos FOREIGN KEY (IdProducto) REFERENCES dbo.Productos(Id) ON DELETE CASCADE
    );
END
GO
