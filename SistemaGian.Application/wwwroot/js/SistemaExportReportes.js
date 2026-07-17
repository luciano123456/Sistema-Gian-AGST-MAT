/**
 * Renderizado exportación estructurada (reportes con pedidos + detalle)
 * Usado por SistemaExport cuando hoja.layout === 'estructurado'
 */
window.SistemaExportReportes = (function () {
    const C = {
        brand: '#1e2a3d',
        brandLine: '#4c8dff',
        diaHead: '#2a4570',
        diaHead2: '#3d5a8a',
        grupoHead: '#2d3f66',
        pedidoHead: '#e8f1ff',
        pedidoBorder: '#4c8dff',
        thead: '#1e2a3d',
        theadTxt: '#d4e4ff',
        zebra: '#f4f8ff',
        zebra2: '#e8f0fc',
        txt: '#1a2332',
        muted: '#5a6b82',
        ok: '#0d7a45',
        accent: '#2563b8'
    };

    function esc(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fmtMoney(n) {
        const v = Number(n) || 0;
        return '$ ' + v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function fmtNum(n) {
        return (Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 4 });
    }

    function fmtPct(n) {
        return ((Number(n) || 0) * 100).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' %';
    }

    const MONEY_FMT = '"$"#,##0.00';
    const DATE_FMT = 'dd/mm/yyyy';
    const PCT_FMT = '0.00%';

    const ST = {
        titulo: {
            font: { bold: true, size: 14, name: 'Segoe UI', color: { argb: 'FF1E2A3D' } }
        },
        meta: {
            font: { size: 10, name: 'Segoe UI', color: { argb: 'FF5A6B82' } }
        },
        grupoHeader: {
            font: { bold: true, size: 11, name: 'Segoe UI', color: { argb: 'FF1A2332' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } },
            border: {
                top: { style: 'medium', color: { argb: 'FF8FAADC' } },
                bottom: { style: 'medium', color: { argb: 'FF8FAADC' } }
            }
        },
        colHeader: {
            font: { bold: true, size: 10, name: 'Segoe UI', color: { argb: 'FF1A2332' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
            alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
            border: {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' }
            }
        },
        pedidoRow: {
            font: { size: 10, name: 'Segoe UI' },
            border: { bottom: { style: 'thin', color: { argb: 'FFDDE6F2' } } }
        },
        productHeader: {
            font: { bold: true, size: 9, name: 'Segoe UI', color: { argb: 'FFD4E4FF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2A3D' } },
            alignment: { vertical: 'middle' }
        },
        productRow: {
            font: { size: 9, name: 'Segoe UI' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F8FF' } }
        },
        resumenFoot: {
            font: { bold: true, size: 10, name: 'Segoe UI' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE8F8' } }
        }
    };

    function aplicarEstilo(celda, estilo) {
        if (!celda || !estilo) return;
        if (estilo.font) celda.font = { ...estilo.font };
        if (estilo.fill) celda.fill = { ...estilo.fill };
        if (estilo.border) celda.border = { ...estilo.border };
        if (estilo.alignment) celda.alignment = { ...estilo.alignment };
    }

    function colLetra(n) {
        let s = '';
        let num = n;
        while (num > 0) {
            const m = (num - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            num = Math.floor((num - 1) / 26);
        }
        return s;
    }

    /** Fecha local sin desfase UTC (ISO, dd/mm/yyyy o Date) */
    function parseFechaExport(val) {
        if (val == null || val === '') return null;
        if (val instanceof Date && !isNaN(val.getTime())) return val;
        const s = String(val).trim();
        if (!s || s === '—' || s === '-') return null;

        let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
        if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

        m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

        m = /^(\d{4})-(\d{2})-(\d{2})[T\s]/.exec(s);
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    function fmtFechaTexto(val) {
        const d = parseFechaExport(val);
        if (!(d instanceof Date)) return String(val ?? '—');
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
    }

    function valorFechaPedido(p) {
        return p.fechaEntregaIso || p.fechaEntrega;
    }

    function parseMoneyAr(val) {
        if (typeof val === 'number') return val;
        const t = String(val ?? '').replace(/\$/g, '').replace(/\s/g, '').trim();
        if (!t) return 0;
        if (t.includes(',')) {
            return Number(t.replace(/\./g, '').replace(',', '.')) || 0;
        }
        return Number(t.replace(/\./g, '')) || 0;
    }

    function inferirVariante(payload, bloque) {
        const p = bloque?.pedidos?.[0];
        if (p?.variante) return p.variante;
        const ctx = payload.contexto || '';
        if (ctx === 'pedidos-dia') return 'dia';
        if (ctx === 'ec-para-cliente') return 'paraCliente';
        if (ctx === 'ec-proveedores') return 'proveedor';
        if (ctx === 'evolucion-ventas') return 'evolucion';
        return 'cliente';
    }

    /** Tipos por columna: text | fecha | money | pct (índice = columna en values) */
    function configColumnas(variante) {
        switch (variante) {
            case 'dia':
                return {
                    headers: ['Partida', 'Fecha de entrega', 'Cliente', 'Proveedor', 'Facturado', 'Costo', 'Ganancia'],
                    values: (p) => [p.partida, valorFechaPedido(p), p.cliente, p.proveedor, p.monto, p.costo, p.ganancia],
                    columnTypes: ['text', 'fecha', 'text', 'text', 'money', 'money', 'money']
                };
            case 'paraCliente':
                return {
                    headers: ['Partida', 'Fecha de entrega', 'Monto', 'Haber', 'Saldo'],
                    values: (p) => [p.partida, valorFechaPedido(p), p.monto, p.haber, p.saldo],
                    columnTypes: ['text', 'fecha', 'money', 'money', 'money'],
                    sumColSaldo: 5
                };
            case 'proveedor':
                return {
                    headers: ['Partida', 'Fecha de entrega', 'Monto', 'Haber', 'Saldo', 'Cliente', 'Estado cliente'],
                    values: (p) => [p.partida, valorFechaPedido(p), p.monto, p.haber, p.saldo, p.cliente, p.estadoCliente],
                    columnTypes: ['text', 'fecha', 'money', 'money', 'money', 'text', 'text'],
                    sumColSaldo: 5
                };
            case 'evolucion':
                return {
                    headers: ['Partida', 'Fecha de entrega', 'Facturado', 'Ganancia', '% Ganancia'],
                    values: (p) => [p.partida, valorFechaPedido(p), p.monto, p.ganancia, p.porcGanancia],
                    columnTypes: ['text', 'fecha', 'money', 'money', 'pct']
                };
            default:
                return {
                    headers: ['Partida', 'Fecha de entrega', 'Monto', 'Haber', 'Saldo', 'Ganancia', 'Proveedor', 'Pagado prov.'],
                    values: (p) => [
                        p.partida, valorFechaPedido(p), p.monto, p.haber, p.saldo, p.ganancia, p.proveedor, p.pagadoProveedor
                    ],
                    columnTypes: ['text', 'fecha', 'money', 'money', 'money', 'money', 'text', 'text'],
                    sumColSaldo: 5,
                    sumColGanancia: 6
                };
        }
    }

    function escribirValorPedido(ws, row, col, val, p, cfg, tipoCol) {
        if (tipoCol === 'fecha') {
            escribirCelda(ws, row, col, valorFechaPedido(p), ST.pedidoRow, { fecha: true });
        } else if (tipoCol === 'money') {
            escribirCelda(ws, row, col, val, ST.pedidoRow, { money: true });
        } else if (tipoCol === 'pct') {
            escribirCelda(ws, row, col, val, ST.pedidoRow, { pct: true });
        } else {
            escribirCelda(ws, row, col, val, ST.pedidoRow);
        }
    }

    function headersProductos(variante) {
        const colPrecio = variante === 'proveedor' ? 'Precio costo' : 'Precio venta';
        return ['Producto', 'Unidad', 'Cantidad', 'Prod. cant.', colPrecio, 'Importe'];
    }

    function valoresProducto(pr, variante) {
        const precio = variante === 'proveedor' ? pr.precioCosto : pr.precioVenta;
        let cant = Number(pr.cantidad) || 0;
        if (Number(pr.cantidadUsadaAcopio) > 0) {
            cant += Number(pr.cantidadUsadaAcopio);
        }
        return [pr.producto, pr.unidad, cant, pr.productoCantidad, precio, pr.importe];
    }

    function escribirCelda(ws, row, col, valor, estilo, opts = {}) {
        const c = ws.getRow(row).getCell(col);
        if (opts.money) {
            c.value = Number(valor) || 0;
            c.numFmt = MONEY_FMT;
        } else if (opts.pct) {
            c.value = Number(valor) || 0;
            c.numFmt = PCT_FMT;
        } else if (opts.fecha) {
            const d = parseFechaExport(valor);
            if (d instanceof Date) {
                c.value = d;
                c.numFmt = DATE_FMT;
            } else {
                c.value = valor ?? '';
            }
        } else {
            c.value = valor ?? '';
        }
        aplicarEstilo(c, estilo);
        return c;
    }

    function escribirFilaMeta(ws, filas, startRow) {
        let r = startRow;
        (filas || []).forEach(fila => {
            fila.forEach((txt, i) => {
                escribirCelda(ws, r, i + 1, txt, ST.meta);
            });
            r++;
        });
        return r;
    }

    function escribirCeldaConTipo(ws, row, col, val, estilo, tipo) {
        if (tipo === 'money') {
            escribirCelda(ws, row, col, val, estilo, { money: true });
        } else if (tipo === 'pct') {
            escribirCelda(ws, row, col, val, estilo, { pct: true });
        } else if (tipo === 'fecha') {
            escribirCelda(ws, row, col, val, estilo, { fecha: true });
        } else if (typeof val === 'number') {
            escribirCelda(ws, row, col, val, estilo, { money: true });
        } else if (typeof val === 'string' && String(val).trim().startsWith('$')) {
            escribirCelda(ws, row, col, parseMoneyAr(val), estilo, { money: true });
        } else {
            escribirCelda(ws, row, col, val, estilo);
        }
    }

    function escribirResumenTabla(ws, b, startRow) {
        let r = startRow;
        escribirCelda(ws, r, 1, b.titulo || 'Resumen', ST.titulo);
        r++;
        const hdr = ws.getRow(r);
        (b.headers || []).forEach((h, i) => {
            const c = hdr.getCell(i + 1);
            c.value = h;
            aplicarEstilo(c, ST.colHeader);
        });
        r++;
        const tipos = b.columnTypes || [];
        (b.rows || []).forEach(row => {
            row.forEach((val, i) => {
                escribirCeldaConTipo(ws, r, i + 1, val, ST.pedidoRow, tipos[i] || (i === 0 ? 'text' : 'text'));
            });
            r++;
        });
        if (b.footer?.length) {
            b.footer.forEach((val, i) => {
                escribirCeldaConTipo(ws, r, i + 1, val, ST.resumenFoot, tipos[i] || 'text');
            });
            r++;
        }
        return r + 1;
    }

    function escribirHojaTablaPlana(ws, h) {
        let r = 1;
        escribirResumenTabla(ws, h, r);
        configurarAnchoColumnas(ws);
    }

    function escribirHojaInformacion(ws, payload) {
        escribirCelda(ws, 1, 1, 'Sistema Gian — AGS MAT', ST.titulo);
        escribirCelda(ws, 2, 1, 'Sección', ST.meta);
        escribirCelda(ws, 2, 2, payload.titulo || '', ST.meta);
        escribirCelda(ws, 3, 1, 'Filtros / notas', ST.meta);
        escribirCelda(ws, 3, 2, payload.filtros || '—', ST.meta);
        escribirCelda(ws, 4, 1, 'Generado', ST.meta);
        escribirCelda(ws, 4, 2, payload.generado || '', ST.meta);
        ws.getColumn(1).width = 18;
        ws.getColumn(2).width = 72;
    }

    function escribirHojaEstructurada(ws, hoja, payload) {
        ws.properties.outlineProperties = { summaryBelow: false, summaryRight: false };
        ws.properties.defaultRowHeight = 15;

        let r = 1;
        escribirCelda(ws, r, 1, 'Sistema Gian — AGS MAT', ST.titulo);
        r++;
        escribirCelda(ws, r, 1, payload.titulo || '', ST.titulo);
        r += 2;

        if (payload.metaFiltros?.length) {
            r = escribirFilaMeta(ws, payload.metaFiltros, r);
            r++;
        } else if (payload.filtros) {
            escribirCelda(ws, r, 1, payload.filtros, ST.meta);
            r++;
            escribirCelda(ws, r, 1, `Generado: ${payload.generado || ''}`, ST.meta);
            r += 2;
        }

        for (const b of hoja.bloques || []) {
            if (b.tipo === 'resumen-tabla') {
                r = escribirResumenTabla(ws, b, r);
            } else if (b.tipo === 'dia' || b.tipo === 'grupo') {
                const variante = inferirVariante(payload, b);
                r = escribirGrupo(ws, b, r, variante);
            } else if (b.tipo === 'total-periodo') {
                r = escribirTotalPeriodo(ws, b, r);
            }
        }

        configurarAnchoColumnas(ws);
    }

    function escribirGrupo(ws, b, startRow, variante) {
        const cfg = configColumnas(variante);
        let r = startRow + 1;
        const grupoRow = r;
        const gr = ws.getRow(grupoRow);

        const tituloGrupo = b.tipo === 'dia' ? (b.titulo || b.fecha) : (b.nombre || '—');
        escribirCelda(ws, grupoRow, 1, tituloGrupo, ST.grupoHeader);
        try { ws.mergeCells(grupoRow, 1, grupoRow, 2); } catch { /* ya fusionado */ }
        aplicarEstilo(gr.getCell(2), ST.grupoHeader);

        const filasSaldo = [];
        const filasGanancia = [];

        if (b.tipo === 'dia') {
            escribirCelda(ws, grupoRow, 3, 'Pedidos', ST.grupoHeader);
            escribirCelda(ws, grupoRow, 4, b.cantidadPedidos ?? 0, ST.grupoHeader);
            escribirCelda(ws, grupoRow, 5, 'Facturado', ST.grupoHeader);
            escribirCelda(ws, grupoRow, 6, b.totalFacturado ?? 0, ST.grupoHeader, { money: true });
            escribirCelda(ws, grupoRow, 7, 'Ganancia', ST.grupoHeader);
            escribirCelda(ws, grupoRow, 8, b.totalGanancia ?? 0, ST.grupoHeader, { money: true });
        } else {
            const etiqueta = b.etiquetaTotal || 'Deuda total';
            escribirCelda(ws, grupoRow, 3, etiqueta, ST.grupoHeader);
            escribirCelda(ws, grupoRow, 4, b.totalSaldo ?? 0, ST.grupoHeader, { money: true });
            if (b.totalGanancia != null) {
                escribirCelda(ws, grupoRow, 5, 'Ganancia', ST.grupoHeader);
                escribirCelda(ws, grupoRow, 6, b.totalGanancia, ST.grupoHeader, { money: true });
            }
        }

        r++;
        const headerRow = r;
        const hr = ws.getRow(headerRow);
        cfg.headers.forEach((h, i) => {
            const c = hr.getCell(i + 1);
            c.value = h;
            aplicarEstilo(c, ST.colHeader);
        });
        hr.outlineLevel = 1;

        r++;
        const prodHdrs = headersProductos(variante);

        for (const p of b.pedidos || []) {
            const pedRow = r;
            const vals = cfg.values(p);
            const tipos = cfg.columnTypes || [];
            vals.forEach((val, i) => {
                escribirValorPedido(ws, r, i + 1, val, p, cfg, tipos[i] || 'text');
            });
            ws.getRow(r).outlineLevel = 1;
            if (cfg.sumColSaldo) filasSaldo.push(r);
            if (cfg.sumColGanancia) filasGanancia.push(r);
            r++;

            const phr = ws.getRow(r);
            prodHdrs.forEach((h, i) => {
                const c = phr.getCell(i + 1);
                c.value = h;
                aplicarEstilo(c, ST.productHeader);
            });
            phr.outlineLevel = 2;
            r++;

            const prods = p.productos || [];
            if (!prods.length) {
                escribirCelda(ws, r, 1, 'Sin productos en este pedido', ST.productRow);
                ws.getRow(r).outlineLevel = 2;
                r++;
            } else {
                let sumImp = 0;
                prods.forEach(pr => {
                    const pvals = valoresProducto(pr, variante);
                    pvals.forEach((val, i) => {
                        const col = i + 1;
                        if (col >= 3 && col <= 4) {
                            escribirCelda(ws, r, col, val, ST.productRow);
                        } else if (col >= 5) {
                            escribirCelda(ws, r, col, val, ST.productRow, { money: true });
                        } else {
                            escribirCelda(ws, r, col, val, ST.productRow);
                        }
                    });
                    sumImp += Number(pr.importe) || 0;
                    ws.getRow(r).outlineLevel = 2;
                    r++;
                });
                escribirCelda(ws, r, 5, 'Total productos', ST.productRow);
                escribirCelda(ws, r, 6, sumImp, ST.productRow, { money: true });
                ws.getRow(r).outlineLevel = 2;
                r++;
            }
            r++;
        }

        if (b.tipo === 'grupo' && cfg.sumColSaldo && filasSaldo.length) {
            const col = colLetra(cfg.sumColSaldo);
            const formula = filasSaldo.map(row => `${col}${row}`).join('+');
            ws.getRow(grupoRow).getCell(4).value = { formula };
        }
        if (b.tipo === 'grupo' && cfg.sumColGanancia && filasGanancia.length && b.totalGanancia != null) {
            const col = colLetra(cfg.sumColGanancia);
            const formula = filasGanancia.map(row => `${col}${row}`).join('+');
            ws.getRow(grupoRow).getCell(6).value = { formula };
        }

        return r;
    }

    function escribirTotalPeriodo(ws, b, startRow) {
        const r = startRow;
        ws.mergeCells(r, 1, r, 7);
        const c = ws.getRow(r).getCell(1);
        c.value = `TOTAL PERÍODO · ${b.cantidadPedidos ?? 0} pedidos · Facturado ${fmtMoney(b.totalFacturado)} · Costo ${fmtMoney(b.totalCosto)} · Ganancia ${fmtMoney(b.totalGanancia)}`;
        aplicarEstilo(c, {
            font: { bold: true, size: 11, name: 'Segoe UI', color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3358' } },
            alignment: { vertical: 'middle', horizontal: 'left' }
        });
        ws.getRow(r).height = 22;
        return r + 2;
    }

    function configurarAnchoColumnas(ws) {
        const anchos = [14, 16, 18, 28, 14, 14, 16, 18];
        anchos.forEach((w, i) => {
            ws.getColumn(i + 1).width = w;
        });
    }

    function descargarBufferXlsx(buffer, archivo, stamp) {
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${archivo}-${stamp}.xlsx`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 200);
    }

    async function exportarExcelXlsx(payload, archivo, stamp) {
        if (typeof ExcelJS === 'undefined') {
            throw new Error('La librería Excel (ExcelJS) no está disponible. Recargá la página.');
        }
        const hojas = payload.hojas || [];
        const hayEstructurada = hojas.some(h => h.layout === 'estructurado' && h.bloques?.length);
        const hayPlana = hojas.some(h => h.layout === 'tabla-plana');
        if (!hayEstructurada && !hayPlana) throw new Error('Sin hojas para exportar.');

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Sistema Gian — AGS MAT';
        wb.created = new Date();

        const wsInfo = wb.addWorksheet('Información');
        escribirHojaInformacion(wsInfo, payload);

        for (const h of hojas) {
            const nombre = (h.nombre || 'Hoja').substring(0, 31);
            if (h.layout === 'tabla-plana') {
                const ws = wb.addWorksheet(nombre);
                escribirHojaTablaPlana(ws, h);
            } else if (h.layout === 'estructurado' && h.bloques?.length) {
                const ws = wb.addWorksheet(nombre, {
                    views: [{ showOutlineSymbols: true }]
                });
                escribirHojaEstructurada(ws, h, payload);
            }
        }

        const buffer = await wb.xlsx.writeBuffer();
        descargarBufferXlsx(buffer, archivo, stamp);
    }

    function estilosExport() {
        return `
body{font-family:Segoe UI,Calibri,Arial,sans-serif;color:${C.txt};margin:0;padding:16px 20px 28px;background:#fff;}
.sg-exp-brand{background:${C.brand};color:#fff;padding:14px 18px;border-radius:10px 10px 0 0;font-weight:800;font-size:15px;border-bottom:3px solid ${C.brandLine};}
.sg-exp-title{font-size:20px;font-weight:800;margin:16px 0 6px;color:${C.brand};}
.sg-exp-meta{font-size:12px;color:${C.muted};margin:0 0 20px;line-height:1.5;}
.sg-exp-section-lbl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:${C.muted};margin:18px 0 8px;}
.sg-exp-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;border:1px solid ${C.pedidoBorder};border-radius:8px;overflow:hidden;}
.sg-exp-table thead th{background:${C.thead};color:${C.theadTxt};padding:10px 12px;text-align:left;font-weight:700;border-bottom:2px solid ${C.brandLine};}
.sg-exp-table tbody td{padding:8px 12px;border-bottom:1px solid #dde6f2;}
.sg-exp-table tbody tr:nth-child(even) td{background:${C.zebra};}
.sg-exp-table tfoot td{background:#dce8f8;font-weight:800;padding:10px 12px;border-top:2px solid ${C.brandLine};}
.sg-exp-dia{margin:20px 0;border:1px solid ${C.pedidoBorder};border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(30,42,61,.12);}
.sg-exp-dia-head{background:linear-gradient(90deg,${C.diaHead},${C.diaHead2});color:#fff;padding:14px 18px;font-size:14px;}
.sg-exp-dia-head strong{font-size:16px;margin-right:12px;}
.sg-exp-dia-kpis{margin-top:8px;font-size:12px;opacity:.95;}
.sg-exp-dia-kpis span{margin-right:16px;}
.sg-exp-dia-kpis b{color:#b8d4ff;}
.sg-exp-grupo-head{background:linear-gradient(90deg,${C.grupoHead},${C.diaHead});color:#fff;padding:14px 18px;font-size:14px;}
.sg-exp-dia-body{padding:12px 14px 6px;background:#fafcff;}
.sg-exp-pedido{margin:0 0 14px;border:1px solid #c5d4e8;border-radius:10px;overflow:hidden;background:#fff;}
.sg-exp-pedido-head{background:${C.pedidoHead};border-left:4px solid ${C.pedidoBorder};padding:10px 14px;font-size:12px;display:flex;flex-wrap:wrap;gap:6px 20px;}
.sg-exp-pedido-head .sg-exp-ph-label{color:${C.muted};font-weight:600;font-size:10px;text-transform:uppercase;display:block;}
.sg-exp-pedido-head .sg-exp-ph-val{font-weight:800;color:${C.brand};font-size:13px;}
.sg-exp-pedido-head .sg-exp-ph-item{min-width:100px;}
.sg-exp-products{width:100%;border-collapse:collapse;font-size:11px;}
.sg-exp-products thead th{background:${C.thead};color:${C.theadTxt};padding:8px 10px;text-align:left;font-weight:700;}
.sg-exp-products tbody td{padding:7px 10px;border-top:1px solid #e2eaf5;}
.sg-exp-products tbody tr:nth-child(even) td{background:${C.zebra2};}
.sg-exp-products tfoot td{background:#e2ecf9;font-weight:700;padding:8px 10px;}
.sg-exp-sin-items{padding:12px 14px;font-size:12px;color:${C.muted};font-style:italic;background:#f8fafc;}
.sg-exp-total-periodo{margin-top:24px;padding:14px 18px;background:linear-gradient(90deg,#1a3358,#2a4570);color:#fff;border-radius:10px;font-size:14px;font-weight:700;}
.sg-exp-total-periodo span{margin-right:20px;}
.text-end{text-align:right;}
.sg-exp-ok{color:${C.ok};font-weight:700;}
`;
    }

    function kpisDiaHtml(b) {
        return `<span><b>${b.cantidadPedidos ?? 0}</b> pedido(s)</span>
            <span>Facturado <b>${esc(fmtMoney(b.totalFacturado))}</b></span>
            <span>Costo <b>${esc(fmtMoney(b.totalCosto))}</b></span>
            <span class="sg-exp-ok">Ganancia <b>${esc(fmtMoney(b.totalGanancia))}</b></span>`;
    }

    function pedidoCamposHtml(p) {
        const v = p.variante || 'dia';
        const items = [];
        const add = (label, val, money) => {
            items.push(`<div class="sg-exp-ph-item"><span class="sg-exp-ph-label">${esc(label)}</span>
                <span class="sg-exp-ph-val">${money ? esc(fmtMoney(val)) : esc(val || '—')}</span></div>`);
        };
        add('Partida', p.partida, false);
        add('Fecha entrega', p.fechaEntrega, false);
        if (p.cliente) add('Cliente', p.cliente, false);
        if (p.proveedor) add('Proveedor', p.proveedor, false);

        if (v === 'evolucion') {
            add('Facturado', p.monto, true);
            add('Ganancia', p.ganancia, true);
            add('% Ganancia', fmtPct(p.porcGanancia), false);
        } else if (v === 'dia') {
            add('Facturado', p.monto, true);
            add('Costo', p.costo, true);
            add('Ganancia', p.ganancia, true);
        } else if (v === 'paraCliente') {
            add('Monto', p.monto, true);
            add('Haber', p.haber, true);
            add('Saldo', p.saldo, true);
        } else if (v === 'proveedor') {
            add('Monto', p.monto, true);
            add('Haber', p.haber, true);
            add('Saldo', p.saldo, true);
            if (p.cliente) add('Cliente', p.cliente, false);
            if (p.estadoCliente) add('Estado cliente', p.estadoCliente, false);
        } else {
            add('Monto', p.monto, true);
            add('Haber', p.haber, true);
            add('Saldo', p.saldo, true);
            add('Ganancia', p.ganancia, true);
            if (p.proveedor) add('Proveedor', p.proveedor, false);
            if (p.pagadoProveedor) add('Pagado prov.', p.pagadoProveedor, false);
        }
        return items.join('');
    }

    function productosTableHtml(productos) {
        const prods = productos || [];
        if (!prods.length) {
            return '<div class="sg-exp-sin-items">Sin productos en este pedido</div>';
        }
        let sum = 0;
        let body = '';
        prods.forEach(pr => {
            const imp = Number(pr.importe) || 0;
            sum += imp;
            let cant = fmtNum(pr.cantidad);
            if (Number(pr.cantidadUsadaAcopio) > 0) {
                cant += ` (+ ${fmtNum(pr.cantidadUsadaAcopio)} acopio)`;
            }
            body += `<tr>
                <td>${esc(pr.producto)}</td>
                <td>${esc(pr.unidad)}</td>
                <td class="text-end">${esc(cant)}</td>
                <td class="text-end">${esc(fmtNum(pr.productoCantidad))}</td>
                <td class="text-end">${esc(fmtMoney(pr.precioVenta))}</td>
                <td class="text-end">${esc(fmtMoney(pr.precioCosto))}</td>
                <td class="text-end"><strong>${esc(fmtMoney(imp))}</strong></td>
            </tr>`;
        });
        return `<table class="sg-exp-products">
            <thead><tr>
                <th>Producto</th><th>Unidad</th>
                <th class="text-end">Cantidad</th><th class="text-end">Prod. cant.</th>
                <th class="text-end">Precio venta</th><th class="text-end">Precio costo</th>
                <th class="text-end">Importe</th>
            </tr></thead>
            <tbody>${body}</tbody>
            <tfoot><tr>
                <td colspan="6" class="text-end">Total productos</td>
                <td class="text-end">${esc(fmtMoney(sum))}</td>
            </tr></tfoot>
        </table>`;
    }

    function pedidoBlockHtml(p) {
        return `<div class="sg-exp-pedido">
            <div class="sg-exp-pedido-head">${pedidoCamposHtml(p)}</div>
            ${productosTableHtml(p.productos)}
        </div>`;
    }

    function bloqueHtml(b) {
        if (b.tipo === 'resumen-tabla') {
            const celda = (c, alignEnd) => {
                const cls = alignEnd ? ' class="text-end"' : '';
                return `<td${cls}>${esc(c)}</td>`;
            };
            let head = b.headers.map(h => `<th>${esc(h)}</th>`).join('');
            let body = (b.rows || []).map(row =>
                `<tr>${row.map((c, i) => celda(c, i > 0)).join('')}</tr>`
            ).join('');
            let foot = '';
            if (b.footer?.length) {
                foot = `<tfoot><tr>${b.footer.map((c, i) => celda(c, i > 0)).join('')}</tr></tfoot>`;
            }
            return `<div class="sg-exp-section-lbl">${esc(b.titulo || 'Resumen')}</div>
                <table class="sg-exp-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>`;
        }
        if (b.tipo === 'dia') {
            const pedidosHtml = (b.pedidos || []).map(pedidoBlockHtml).join('');
            return `<div class="sg-exp-dia">
                <div class="sg-exp-dia-head">
                    <strong>${esc(b.titulo || b.fecha)}</strong>
                    <div class="sg-exp-dia-kpis">${kpisDiaHtml(b)}</div>
                </div>
                <div class="sg-exp-dia-body">${pedidosHtml}</div>
            </div>`;
        }
        if (b.tipo === 'grupo') {
            const pedidosHtml = (b.pedidos || []).map(pedidoBlockHtml).join('');
            const totGan = b.totalGanancia != null
                ? `<span class="sg-exp-ok">Ganancia <b>${esc(fmtMoney(b.totalGanancia))}</b></span>` : '';
            return `<div class="sg-exp-dia">
                <div class="sg-exp-grupo-head">
                    <strong>${esc(b.nombre)}</strong>
                    <div class="sg-exp-dia-kpis">
                        <span>${esc(b.etiquetaTotal || 'Total')}: <b>${esc(fmtMoney(b.totalSaldo))}</b></span>
                        ${totGan}
                        <span>${(b.pedidos || []).length} pedido(s)</span>
                    </div>
                </div>
                <div class="sg-exp-dia-body">${pedidosHtml}</div>
            </div>`;
        }
        if (b.tipo === 'total-periodo') {
            return `<div class="sg-exp-total-periodo">
                <span>Total período</span>
                <span>${b.cantidadPedidos ?? ''} pedido(s)</span>
                <span>Facturado ${esc(fmtMoney(b.totalFacturado))}</span>
                <span>Costo ${esc(fmtMoney(b.totalCosto))}</span>
                <span>Ganancia ${esc(fmtMoney(b.totalGanancia))}</span>
            </div>`;
        }
        return '';
    }

    function generarHtml(payload) {
        const hoja = payload.hojas?.find(h => h.layout === 'estructurado') || payload.hojas?.[0];
        const bloques = hoja?.bloques || [];
        const cuerpo = bloques.map(bloqueHtml).join('\n');
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${estilosExport()}</style></head><body>
            <div class="sg-exp-brand">Sistema Gian — AGS MAT</div>
            <div class="sg-exp-title">${esc(payload.titulo)}</div>
            <p class="sg-exp-meta">${esc(payload.filtros || '')}<br>Generado: ${esc(payload.generado || '')}</p>
            ${cuerpo}
        </body></html>`;
    }

    function descargarHtmlComoExcel(html, archivo, stamp) {
        const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${archivo}-${stamp}.xls`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 200);
    }

    function filaPedidoPdf(p, cfg) {
        const tipos = cfg.columnTypes || [];
        return cfg.values(p).map((val, i) => {
            const tipo = tipos[i] || 'text';
            if (tipo === 'fecha') return fmtFechaTexto(valorFechaPedido(p));
            if (tipo === 'money') return fmtMoney(val);
            if (tipo === 'pct') return fmtPct(val);
            return String(val ?? '—');
        });
    }

    function filasProductosPdf(prods, variante) {
        const hdrs = headersProductos(variante);
        const rows = (prods || []).map(pr => {
            let cant = fmtNum(pr.cantidad);
            if (Number(pr.cantidadUsadaAcopio) > 0) {
                cant += ` (+${fmtNum(pr.cantidadUsadaAcopio)} ac.)`;
            }
            const precio = variante === 'proveedor' ? pr.precioCosto : pr.precioVenta;
            return [
                pr.producto || '',
                pr.unidad || '',
                cant,
                fmtNum(pr.productoCantidad),
                fmtMoney(precio),
                fmtMoney(pr.importe)
            ];
        });
        let sum = 0;
        (prods || []).forEach(pr => { sum += Number(pr.importe) || 0; });
        if (rows.length) {
            rows.push(['', '', '', '', 'Total productos', fmtMoney(sum)]);
        }
        return { hdrs, rows, sum };
    }

    function exportarPdf(payload, archivo, stamp, deps) {
        const { jsPDF: jspdfMod, obtenerLogo, dibujarEncabezado } = deps;
        const hoja = payload.hojas?.find(h => h.layout === 'estructurado');
        if (!hoja?.bloques?.length) throw new Error('Sin bloques para exportar.');

        const JsPDF = jspdfMod?.jsPDF || jspdfMod;
        if (!JsPDF) throw new Error('La librería PDF no está disponible. Recargá la página.');

        return (async () => {
            const logo = await obtenerLogo();
            const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const metaLineas = [];
            if (payload.filtros) metaLineas.push(`Filtros: ${payload.filtros}`);
            metaLineas.push(`Generado: ${payload.generado}`);

            const margin = 14;
            const pageH = doc.internal.pageSize.getHeight();
            const w = doc.internal.pageSize.getWidth() - margin * 2;
            let y = 40;

            const redibujarEncabezado = () => {
                dibujarEncabezado(
                    doc,
                    logo,
                    payload.titulo,
                    doc.internal.getNumberOfPages() === 1 ? metaLineas : []
                );
            };

            const estilosTabla = {
                styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak', textColor: [26, 35, 50] },
                headStyles: {
                    fillColor: [30, 42, 61],
                    textColor: [200, 220, 255],
                    fontStyle: 'bold',
                    fontSize: 7.5
                },
                alternateRowStyles: { fillColor: [240, 245, 255] },
                theme: 'striped'
            };

            const tablaPdf = (opts) => {
                doc.autoTable({
                    ...estilosTabla,
                    margin: { left: margin, right: margin, top: 36 },
                    didDrawPage: redibujarEncabezado,
                    ...opts
                });
                y = doc.lastAutoTable.finalY + 6;
            };

            redibujarEncabezado();

            const nuevaPaginaSiHaceFalta = (need) => {
                if (y + need > pageH - 14) {
                    doc.addPage();
                    redibujarEncabezado();
                    y = 40;
                }
            };

            const dibujarBandaGrupo = (titulo, subtitulo) => {
                nuevaPaginaSiHaceFalta(20);
                doc.setFillColor(30, 42, 61);
                doc.setDrawColor(91, 140, 255);
                doc.setLineWidth(0.4);
                doc.roundedRect(margin, y, w, 13, 2, 2, 'FD');
                doc.setTextColor(255, 255, 255);
                doc.setFont(undefined, 'bold');
                doc.setFontSize(11);
                doc.text(String(titulo).substring(0, 90), margin + 4, y + 5.5);
                doc.setFont(undefined, 'normal');
                doc.setFontSize(8);
                doc.setTextColor(184, 212, 255);
                doc.text(String(subtitulo).substring(0, 140), margin + 4, y + 10);
                y += 16;
            };

            for (const b of hoja.bloques) {
                if (b.tipo === 'resumen-tabla') {
                    nuevaPaginaSiHaceFalta(28);
                    doc.setFontSize(10);
                    doc.setTextColor(30, 42, 61);
                    doc.setFont(undefined, 'bold');
                    doc.text(b.titulo || 'Resumen', margin, y);
                    y += 5;
                    const body = [...(b.rows || [])];
                    if (b.footer?.length) body.push(b.footer);
                    tablaPdf({
                        head: [b.headers],
                        body: body.map(r => r.map(c => String(c ?? ''))),
                        startY: y,
                        footStyles: {
                            fillColor: [220, 232, 248],
                            textColor: [30, 42, 61],
                            fontStyle: 'bold'
                        }
                    });
                    y += 4;
                    continue;
                }

                if (b.tipo === 'dia' || b.tipo === 'grupo') {
                    const variante = inferirVariante(payload, b);
                    const cfg = configColumnas(variante);
                    const tit = b.tipo === 'dia' ? (b.titulo || b.fecha) : b.nombre;
                    const sub = b.tipo === 'dia'
                        ? `${b.cantidadPedidos} pedido(s) · Facturado ${fmtMoney(b.totalFacturado)} · Costo ${fmtMoney(b.totalCosto)} · Ganancia ${fmtMoney(b.totalGanancia)}`
                        : `${b.etiquetaTotal || 'Total'}: ${fmtMoney(b.totalSaldo)}${b.totalGanancia != null ? ` · Ganancia ${fmtMoney(b.totalGanancia)}` : ''} · ${(b.pedidos || []).length} pedido(s)`;
                    dibujarBandaGrupo(tit, sub);

                    for (const p of b.pedidos || []) {
                        nuevaPaginaSiHaceFalta(24);
                        tablaPdf({
                            head: [cfg.headers],
                            body: [filaPedidoPdf(p, cfg)],
                            startY: y,
                            bodyStyles: {
                                fillColor: [232, 241, 255],
                                textColor: [30, 42, 61],
                                fontStyle: 'bold',
                                fontSize: 7.5
                            },
                            columnStyles: (cfg.columnTypes || []).reduce((acc, tipo, i) => {
                                if (tipo === 'money' || tipo === 'pct') {
                                    acc[i] = { halign: 'right' };
                                }
                                return acc;
                            }, {})
                        });

                        const prods = p.productos || [];
                        if (prods.length) {
                            const { hdrs, rows } = filasProductosPdf(prods, variante);
                            tablaPdf({
                                head: [hdrs],
                                body: rows,
                                startY: y,
                                margin: { left: margin + 3, right: margin, top: 36 },
                                styles: { ...estilosTabla.styles, fontSize: 7 },
                                headStyles: { ...estilosTabla.headStyles, fontSize: 7 }
                            });
                        } else {
                            nuevaPaginaSiHaceFalta(8);
                            doc.setFontSize(8);
                            doc.setFont(undefined, 'italic');
                            doc.setTextColor(120, 130, 150);
                            doc.text('Sin productos en este pedido', margin + 4, y + 3);
                            y += 8;
                        }
                        y += 2;
                    }
                    y += 4;
                    continue;
                }

                if (b.tipo === 'total-periodo') {
                    nuevaPaginaSiHaceFalta(14);
                    doc.setFillColor(30, 42, 61);
                    doc.setDrawColor(91, 140, 255);
                    doc.setLineWidth(0.4);
                    doc.roundedRect(margin, y, w, 11, 2, 2, 'FD');
                    doc.setTextColor(255, 255, 255);
                    doc.setFont(undefined, 'bold');
                    doc.setFontSize(10);
                    doc.text(
                        `TOTAL PERÍODO  ·  ${b.cantidadPedidos} pedidos  ·  Facturado ${fmtMoney(b.totalFacturado)}  ·  Costo ${fmtMoney(b.totalCosto)}  ·  Ganancia ${fmtMoney(b.totalGanancia)}`,
                        margin + 4,
                        y + 7
                    );
                    y += 14;
                }
            }

            doc.save(`${archivo}-${stamp}.pdf`);
        })();
    }

    return {
        generarHtml,
        descargarHtmlComoExcel,
        exportarExcelXlsx,
        exportarPdf
    };
})();
