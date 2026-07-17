/**
 * Exportación global — modal Excel/PDF con logo (Sistema Gian)
 */
window.SistemaExport = (function () {
    const MODAL_ID = 'modalExportarSistema';
    let modalInstance = null;
    let logoBase64 = null;
    let pendingGetPayload = null;
    let pendingArchivo = 'export';

    function fmtStamp() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function stripHtml(html) {
        if (html == null || html === '') return '';
        if (typeof html === 'number' || typeof html === 'boolean') return String(html);
        if (html instanceof Date) return html.toLocaleDateString('es-AR');
        const s = String(html);
        const tmp = document.createElement('div');
        tmp.innerHTML = s;
        return (tmp.textContent || tmp.innerText || s).trim();
    }

    function formatearValorCelda(v) {
        if (v == null || v === '') return '';
        if (v instanceof HTMLElement) return stripHtml(v.innerHTML);
        if (typeof v === 'object' && typeof v.jquery !== 'undefined') return stripHtml(v.html?.() ?? v.text?.() ?? '');
        if (typeof v === 'object' && !(v instanceof Date)) {
            try { return stripHtml(JSON.stringify(v)); } catch { return ''; }
        }
        return stripHtml(v);
    }

    function valorDesdeRowData(api, colIdx, rowData) {
        if (!rowData) return '';
        try {
            const src = api.column(colIdx).dataSrc();
            if (src == null || src === '') return '';
            if (typeof src === 'function') {
                return formatearValorCelda(src(rowData, 'display', rowData));
            }
            if (typeof src === 'number') return formatearValorCelda(rowData[src]);
            return formatearValorCelda(rowData[src]);
        } catch {
            return '';
        }
    }

    function obtenerValorCelda(api, rowIdx, colIdx, rowData) {
        try {
            const cell = api.cell(rowIdx, colIdx);
            let v = null;
            try { v = cell.render('display'); } catch { /* */ }
            if (v === undefined || v === null || v === '') {
                try { v = cell.data(); } catch { /* */ }
            }
            if (v === undefined || v === null || v === '') {
                return valorDesdeRowData(api, colIdx, rowData);
            }
            return formatearValorCelda(v);
        } catch {
            return valorDesdeRowData(api, colIdx, rowData);
        }
    }

    function columnaIncluida(api, idx, cfg, node) {
        let visible = true;
        try { visible = api.column(idx).visible(); } catch { visible = true; }
        if (!visible) return false;
        if (typeof cfg.columnas === 'function') {
            try {
                return !!cfg.columnas(idx, null, node);
            } catch {
                return idx > 0;
            }
        }
        return idx > 0;
    }

    function init() {
        const el = document.getElementById(MODAL_ID);
        if (!el || el.dataset.sgExportInit === '1') return;
        el.dataset.sgExportInit = '1';

        if (typeof bootstrap !== 'undefined') {
            modalInstance = new bootstrap.Modal(el);
        }

        el.querySelectorAll('.sg-export-check').forEach(chk => {
            chk.addEventListener('change', actualizarBotonConfirmar);
        });

        document.getElementById('btnConfirmarExportarSistema')?.addEventListener('click', ejecutarSeleccion);
    }

    function actualizarBotonConfirmar() {
        const btn = document.getElementById('btnConfirmarExportarSistema');
        if (!btn) return;
        const n = document.querySelectorAll(`#${MODAL_ID} .sg-export-check:checked`).length;
        btn.disabled = n === 0;
    }

    function formatosSeleccionados() {
        return [...document.querySelectorAll(`#${MODAL_ID} .sg-export-check:checked`)].map(c => c.value);
    }

    function setProcesando(activo, mensaje = 'Exportando…') {
        if (!activo) {
            document.getElementById('sgExportOverlay')?.remove();
            return;
        }
        let el = document.getElementById('sgExportOverlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'sgExportOverlay';
            el.className = 'sg-export-overlay';
            el.innerHTML = `<div class="sg-export-overlay__box"><i class="fa fa-spinner fa-spin fa-2x"></i><p id="sgExportMsg"></p></div>`;
            document.body.appendChild(el);
        }
        const msg = document.getElementById('sgExportMsg');
        if (msg) msg.textContent = mensaje;
    }

    function esperar(ms) {
        return new Promise(r => setTimeout(r, ms || 80));
    }

    function abrir(opts) {
        init();
        const { titulo, subtitulo, getPayload, archivo, validar } = opts || {};
        if (typeof validar === 'function') {
            const err = validar();
            if (err) {
                if (typeof errorModal === 'function') errorModal(err);
                return;
            }
        }
        pendingGetPayload = getPayload;
        pendingArchivo = archivo || slug(titulo || 'export');

        const nombre = document.getElementById('modalExportarSistemaNombre');
        if (nombre) nombre.textContent = subtitulo || titulo || '—';

        document.querySelectorAll(`#${MODAL_ID} .sg-export-check`).forEach(c => { c.checked = false; });
        actualizarBotonConfirmar();

        if (modalInstance) modalInstance.show();
        else ejecutarSeleccion();
    }

    function slug(s) {
        return String(s || 'export')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'export';
    }

    async function ejecutarSeleccion() {
        const formatos = formatosSeleccionados();
        if (!formatos.length) {
            if (typeof errorModal === 'function') errorModal('Elegí al menos un formato (Excel o PDF).');
            return;
        }
        if (!pendingGetPayload) return;

        modalInstance?.hide();

        let payload;
        try {
            payload = await pendingGetPayload();
        } catch (e) {
            console.error('SistemaExport getPayload:', e);
            if (typeof errorModal === 'function') {
                errorModal('No se pudieron obtener los datos para exportar.'
                    + (e?.message ? ` (${e.message})` : ''));
            }
            return;
        }

        if (!payload?.hojas?.length) {
            if (typeof errorModal === 'function') errorModal('No hay datos para exportar.');
            return;
        }

        payload.generado = payload.generado || new Date().toLocaleString('es-AR');
        payload.filtros = payload.filtros ?? '';
        const stamp = fmtStamp();

        try {
            if (formatos.includes('excel')) {
                setProcesando(true, 'Generando Excel…');
                await esperar();
                await exportarExcel(payload, pendingArchivo, stamp);
            }
            if (formatos.includes('pdf')) {
                setProcesando(true, 'Generando PDF…');
                await esperar();
                await exportarPdf(payload, pendingArchivo, stamp);
            }
        } catch (e) {
            console.error(e);
            if (typeof errorModal === 'function') errorModal(e.message || 'No se pudo completar la exportación.');
        } finally {
            setProcesando(false);
        }
    }

    function payloadDesdeDataTable(dt, cfg) {
        const api = dt;
        const headers = [];
        const indices = [];

        api.columns().every(function () {
            const idx = this.index();
            let node = null;
            try { node = this.header(); } catch { /* */ }
            if (!columnaIncluida(api, idx, cfg, node)) return;

            indices.push(idx);
            let title = '';
            try {
                const t = api.column(idx).title();
                if (typeof t === 'string') title = t;
            } catch { /* */ }
            const nodeText = node ? stripHtml($(node).first().text()) : '';
            headers.push(nodeText || title || `Col ${idx}`);
        });

        if (!indices.length) {
            throw new Error('No hay columnas visibles para exportar.');
        }

        const rows = [];
        api.rows({ search: 'applied' }).every(function () {
            const rowIdx = this.index();
            const rowData = this.data();
            rows.push(indices.map(colIdx => obtenerValorCelda(api, rowIdx, colIdx, rowData)));
        });

        return {
            titulo: cfg.titulo || 'Listado',
            filtros: cfg.filtros || cfg.subtitulo || '',
            generado: new Date().toLocaleString('es-AR'),
            contexto: cfg.contexto || '',
            hojas: [{
                nombre: (cfg.nombreHoja || cfg.titulo || 'Datos').substring(0, 31),
                headers,
                rows
            }]
        };
    }

    function abrirDesdeDataTable(dt, cfg) {
        abrir({
            titulo: cfg.titulo,
            subtitulo: cfg.subtitulo || cfg.titulo,
            archivo: cfg.archivo,
            filtros: cfg.filtros,
            validar: () => {
                if (!dt.rows({ search: 'applied' }).count()) return 'No hay filas para exportar.';
                return null;
            },
            getPayload: () => {
                const p = payloadDesdeDataTable(dt, cfg);
                if (cfg.filtros) p.filtros = cfg.filtros;
                return p;
            }
        });
    }

    /** Botones DataTables: Exportar (modal) + Imprimir + pageLength */
    function columnasParaPrint(cfg) {
        if (typeof cfg.columnas === 'function') {
            return function (idx, data, node) {
                try { return cfg.columnas(idx, data, node); } catch { return idx > 0; }
            };
        }
        return (idx) => idx > 0;
    }

    function botonesDataTable(cfg) {
        const exportOptions = { columns: columnasParaPrint(cfg) };
        return [
            {
                text: '<i class="fa fa-download"></i> Exportar',
                className: 'btn-exportar-modal',
                action: function (e, dt) {
                    abrirDesdeDataTable(dt, cfg);
                }
            },
            {
                extend: 'print',
                text: 'Imprimir',
                title: cfg.titulo || '',
                exportOptions,
                className: 'btn-exportar-print'
            },
            'pageLength'
        ];
    }

    function hojaEsEstructurada(h) {
        return h && h.layout === 'estructurado' && Array.isArray(h.bloques) && h.bloques.length > 0;
    }

    function usaExportReportesExcel(payload) {
        return payload.hojas?.some(h =>
            hojaEsEstructurada(h) || (h.layout === 'tabla-plana' && h.rows?.length)
        );
    }

    async function exportarExcel(payload, archivo, stamp) {
        if (usaExportReportesExcel(payload)) {
            if (!window.SistemaExportReportes) {
                throw new Error('Módulo de exportación de reportes no cargado. Recargá la página.');
            }
            await SistemaExportReportes.exportarExcelXlsx(payload, archivo, stamp);
            return;
        }
        if (typeof XLSX === 'undefined') {
            throw new Error('La librería Excel no está disponible. Recargá la página.');
        }
        const wb = XLSX.utils.book_new();
        const info = [
            ['Sistema Gian — AGS MAT'],
            ['Sección', payload.titulo],
            ['Filtros / notas', payload.filtros || '—'],
            ['Generado', payload.generado]
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Información');

        payload.hojas.forEach(h => {
            const nombre = (h.nombre || 'Hoja').substring(0, 31);
            const data = [h.headers, ...h.rows.map(r =>
                r.map(c => (typeof c === 'number' ? c : String(c ?? '')))
            )];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), nombre);
        });

        XLSX.writeFile(wb, `${archivo}-${stamp}.xlsx`);
    }

    async function obtenerLogoBase64() {
        if (logoBase64) return logoBase64;
        const res = await fetch('/Imagenes/logo.png');
        if (!res.ok) return null;
        const blob = await res.blob();
        logoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        return logoBase64;
    }

    function dibujarEncabezadoPdf(doc, logo, titulo, lineasExtra) {
        const w = doc.internal.pageSize.getWidth();
        doc.setFillColor(30, 42, 61);
        doc.rect(0, 0, w, 30, 'F');
        doc.setDrawColor(91, 140, 255);
        doc.setLineWidth(0.6);
        doc.line(0, 30, w, 30);

        if (logo) {
            try { doc.addImage(logo, 'PNG', 12, 5, 34, 18); } catch { /* */ }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(14);
        doc.text('Sistema Gian — AGS MAT', logo ? 50 : 14, 11);
        doc.setFontSize(11);
        doc.text(titulo, logo ? 50 : 14, 19);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(184, 212, 255);
        let y = 27;
        (lineasExtra || []).forEach(linea => {
            if (y > 29) return;
            doc.text(String(linea).substring(0, 120), 14, y);
            y += 3.5;
        });
    }

    function fmtMoney(n) {
        const v = Number(n) || 0;
        return '$ ' + v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function fmtNum(n) {
        return (Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 4 });
    }

    function formatearCeldaPdf(val, header, contexto) {
        if (typeof val !== 'number') return String(val ?? '');
        const h = String(header || '').toLowerCase();
        if (h.includes('%')) {
            return val.toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' %';
        }
        if (h.includes('pedidos') && !h.includes('factur')) {
            return String(Math.round(val));
        }
        if (/facturado|costo|ganancia|monto|haber|saldo|importe|total|pago|cotizaci/.test(h)
            || (h === 'total' && contexto !== 'evolucion-producto')) {
            return fmtMoney(val);
        }
        return fmtNum(val);
    }

    async function exportarPdf(payload, archivo, stamp) {
        const jspdf = window.jspdf;
        if (!jspdf?.jsPDF) throw new Error('La librería PDF no está disponible. Recargá la página.');

        if (payload.hojas?.some(hojaEsEstructurada)) {
            if (!window.SistemaExportReportes) {
                throw new Error('Módulo de exportación de reportes no cargado. Recargá la página.');
            }
            await SistemaExportReportes.exportarPdf(payload, archivo, stamp, {
                jsPDF: jspdf,
                obtenerLogo: obtenerLogoBase64,
                dibujarEncabezado: dibujarEncabezadoPdf
            });
            return;
        }

        const logo = await obtenerLogoBase64();
        const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const metaLineas = [];
        if (payload.filtros) metaLineas.push(`Filtros: ${payload.filtros}`);
        metaLineas.push(`Generado: ${payload.generado}`);

        payload.hojas.forEach((hoja, idx) => {
            if (idx > 0) doc.addPage();
            dibujarEncabezadoPdf(doc, logo, payload.titulo, idx === 0 ? metaLineas : []);

            const body = hoja.rows.map(row =>
                row.map((c, i) => formatearCeldaPdf(c, hoja.headers[i], payload.contexto))
            );

            doc.setFontSize(10);
            doc.setTextColor(30, 42, 61);
            doc.text(hoja.nombre, 14, 36);

            doc.autoTable({
                head: [hoja.headers],
                body,
                startY: 40,
                margin: { left: 14, right: 14, top: 36 },
                styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak' },
                headStyles: {
                    fillColor: [30, 42, 61],
                    textColor: [200, 220, 255],
                    fontStyle: 'bold'
                },
                alternateRowStyles: { fillColor: [240, 245, 255] },
                theme: 'striped',
                didDrawPage: () => {
                    dibujarEncabezadoPdf(doc, logo, payload.titulo,
                        doc.internal.getNumberOfPages() === 1 ? metaLineas : []);
                }
            });
        });

        doc.save(`${archivo}-${stamp}.pdf`);
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        init,
        abrir,
        abrirDesdeDataTable,
        botonesDataTable,
        payloadDesdeDataTable,
        ejecutar: async (payload, formatos, archivo) => {
            pendingGetPayload = () => payload;
            pendingArchivo = archivo || 'export';
            document.querySelectorAll(`#${MODAL_ID} .sg-export-check`).forEach(c => {
                c.checked = formatos.includes(c.value);
            });
            actualizarBotonConfirmar();
            await ejecutarSeleccion();
        },
        exportarExcel,
        exportarPdf,
        setProcesando,
        fmtStamp
    };
})();
