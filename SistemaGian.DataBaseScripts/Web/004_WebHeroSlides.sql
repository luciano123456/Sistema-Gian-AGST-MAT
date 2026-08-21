-- Carruseles de portada: Inicio y Catálogo, independientes.
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
