/*
  Recorridos: omitir parada + observaciones más largas
  Estados de parada: Pendiente | Visitada | Omitida
*/

-- Ampliar Notas para observaciones al omitir
IF COL_LENGTH('dbo.RecorridosParadas', 'Notas') IS NOT NULL
BEGIN
    ALTER TABLE dbo.RecorridosParadas ALTER COLUMN Notas VARCHAR(2000) NULL;
END
GO

-- Fecha de resolución (visita u omisión); si ya existe FechaVisitada se reutiliza
IF COL_LENGTH('dbo.RecorridosParadas', 'FechaOmitida') IS NULL
BEGIN
    ALTER TABLE dbo.RecorridosParadas ADD FechaOmitida DATETIME NULL;
END
GO
