/*
  Gestión AGS MAT — aplicar TODO lo de la Web en Sistema_Gian.
  Idempotente. Ejecutar UNA vez (o las veces que haga falta) antes de usar Home > Web.

  Orden interno:
    1) WebConfiguraciones + WebProductosPublicados
    2) Ofertas + WebBanners
    3) ImagenesJson
    4) WebHeroSlides
*/
USE [Sistema_Gian];
GO

/* 1) Config y productos publicados */
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

/* 2) Ofertas + banners */
IF COL_LENGTH('dbo.WebProductosPublicados', 'PrecioLista') IS NULL
    ALTER TABLE dbo.WebProductosPublicados ADD PrecioLista DECIMAL(20,2) NULL;
IF COL_LENGTH('dbo.WebProductosPublicados', 'DescuentoPorcentaje') IS NULL
    ALTER TABLE dbo.WebProductosPublicados ADD DescuentoPorcentaje DECIMAL(5,2) NULL;
IF COL_LENGTH('dbo.WebProductosPublicados', 'EtiquetaOferta') IS NULL
    ALTER TABLE dbo.WebProductosPublicados ADD EtiquetaOferta NVARCHAR(40) NULL;
IF COL_LENGTH('dbo.WebProductosPublicados', 'EnOferta') IS NULL
    ALTER TABLE dbo.WebProductosPublicados ADD EnOferta BIT NOT NULL CONSTRAINT DF_WebProductosPublicados_EnOferta DEFAULT(0);
GO

IF OBJECT_ID('dbo.WebBanners', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WebBanners
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Titulo NVARCHAR(160) NOT NULL,
        Subtitulo NVARCHAR(280) NULL,
        ImagenFileName NVARCHAR(260) NULL,
        ImagenOriginal NVARCHAR(260) NULL,
        LinkUrl NVARCHAR(1000) NULL,
        CtaLabel NVARCHAR(80) NULL,
        Orden INT NOT NULL CONSTRAINT DF_WebBanners_Orden DEFAULT(0),
        Activo BIT NOT NULL CONSTRAINT DF_WebBanners_Activo DEFAULT(1),
        MostrarInicio BIT NOT NULL CONSTRAINT DF_WebBanners_MostrarInicio DEFAULT(1),
        MostrarCatalogo BIT NOT NULL CONSTRAINT DF_WebBanners_MostrarCatalogo DEFAULT(1),
        FechaActualizacionUtc DATETIME2 NOT NULL CONSTRAINT DF_WebBanners_Fecha DEFAULT(SYSUTCDATETIME())
    );
END
GO

/* 3) Galería (hasta 4 imágenes) */
IF COL_LENGTH(N'dbo.WebProductosPublicados', N'ImagenesJson') IS NULL
    ALTER TABLE dbo.WebProductosPublicados ADD ImagenesJson NVARCHAR(MAX) NULL;
GO

/* 4) Carruseles de portada */
IF OBJECT_ID('dbo.WebHeroSlides', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WebHeroSlides
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Placement NVARCHAR(20) NOT NULL CONSTRAINT DF_WebHeroSlides_Placement DEFAULT('home'),
        ImagenFileName NVARCHAR(260) NULL,
        ImagenOriginal NVARCHAR(260) NULL,
        Orden INT NOT NULL CONSTRAINT DF_WebHeroSlides_Orden DEFAULT(0),
        Activo BIT NOT NULL CONSTRAINT DF_WebHeroSlides_Activo DEFAULT(1),
        FechaActualizacionUtc DATETIME2 NOT NULL CONSTRAINT DF_WebHeroSlides_Fecha DEFAULT(SYSUTCDATETIME())
    );

    CREATE INDEX IX_WebHeroSlides_Placement_Orden
        ON dbo.WebHeroSlides (Placement, Activo, Orden);
END
GO

PRINT 'Scripts Web aplicados sobre Sistema_Gian.';
GO
