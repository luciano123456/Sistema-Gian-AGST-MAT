-- Ofertas de productos web + banners promocionales.
IF COL_LENGTH('dbo.WebProductosPublicados', 'PrecioLista') IS NULL
    ALTER TABLE dbo.WebProductosPublicados ADD PrecioLista DECIMAL(20,2) NULL;

IF COL_LENGTH('dbo.WebProductosPublicados', 'DescuentoPorcentaje') IS NULL
    ALTER TABLE dbo.WebProductosPublicados ADD DescuentoPorcentaje DECIMAL(5,2) NULL;

IF COL_LENGTH('dbo.WebProductosPublicados', 'EtiquetaOferta') IS NULL
    ALTER TABLE dbo.WebProductosPublicados ADD EtiquetaOferta NVARCHAR(40) NULL;

IF COL_LENGTH('dbo.WebProductosPublicados', 'EnOferta') IS NULL
    ALTER TABLE dbo.WebProductosPublicados ADD EnOferta BIT NOT NULL CONSTRAINT DF_WebProductosPublicados_EnOferta DEFAULT(0);

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
