/*
  Galería Web AGS MAT: hasta cuatro imágenes por producto.
  Ejecutar UNA vez sobre Sistema_Gian.
*/
USE [Sistema_Gian];
GO

IF COL_LENGTH(N'dbo.WebProductosPublicados', N'ImagenesJson') IS NULL
BEGIN
    ALTER TABLE dbo.WebProductosPublicados
        ADD ImagenesJson NVARCHAR(MAX) NULL;
END
GO
