(function () {
    const state = {
        map: null,
        directionsService: null,
        directionsRenderer: null,
        geocoder: null,
        autocomplete: null,
        clientes: [],
        markers: [],
        paradas: [],
        origen: null,
        origenMarker: null,
        dragIndex: null,
        recorridoId: 0,
        estado: 'Borrador',
        distanciaMetros: null,
        duracionSegundos: null,
        activeInfo: null,
        tipoDestino: 'Clientes',
        puntos: [],
        routePolylines: [],
        lastOverviewPolyline: null
    };

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => [...document.querySelectorAll(sel)];

    function toast(msg) {
        const el = $('#recToast');
        if (!el) return;
        el.hidden = false;
        el.textContent = msg;
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { el.hidden = true; }, 3500);
    }

    function fmtKm(m) {
        if (m == null) return '—';
        return (m / 1000).toFixed(1) + ' km';
    }

    function fmtTime(s) {
        if (s == null) return '—';
        const mins = Math.round(s / 60);
        if (mins < 60) return mins + ' min';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h + ' h ' + m + ' m';
    }

    function labelEstado(estado) {
        switch (estado) {
            case 'EnCurso': return 'En curso';
            case 'Finalizado': return 'Finalizado';
            case 'Cancelado': return 'Cancelado';
            case 'Borrador':
            default: return 'Armando ruta';
        }
    }

    function updateStats() {
        $('#statParadas').textContent = state.paradas.length;
        $('#statDist').textContent = fmtKm(state.distanciaMetros);
        $('#statTime').textContent = fmtTime(state.duracionSegundos);
        $('#recEstadoPill').textContent = labelEstado(state.estado);
        lockEditorSegunEstado();
    }

    function refrescarRutaAuto() {
        if (!state.map || !state.directionsService) return;
        if (!state.origen || state.paradas.length < 1) {
            if (state.directionsRenderer) state.directionsRenderer.set('directions', null);
            state.distanciaMetros = null;
            state.duracionSegundos = null;
            updateStats();
            return;
        }
        dibujarRuta(false, true);
    }

    function paradaResuelta(p) {
        const est = p.estadoParada || 'Pendiente';
        return est === 'Visitada' || est === 'Omitida';
    }

    function indiceParadaActual() {
        if (state.estado !== 'EnCurso') return -1;
        return state.paradas.findIndex(p => !paradaResuelta(p));
    }

    function visualParada(p, idx) {
        const est = p.estadoParada || 'Pendiente';
        if (est === 'Visitada') return 'visitada';
        if (est === 'Omitida') return 'omitida';
        if (state.estado === 'EnCurso') {
            return idx === indiceParadaActual() ? 'actual' : 'pendiente';
        }
        return 'enruta';
    }

    function colorMarcador(visual, tipoEntidad) {
        if (visual === 'visitada') return '#22c55e';
        if (visual === 'omitida') return '#ef4444';
        if (visual === 'actual') return '#38bdf8';
        if (visual === 'pendiente') return '#f97316';
        if (visual === 'enruta') return tipoEntidad === 'Proveedor' ? '#a855f7' : '#ef4444';
        return tipoEntidad === 'Proveedor' ? '#8b5cf6' : '#e11d48';
    }

    function claveParada(p) {
        const tipo = p.tipoParada || p.TipoParada || 'Cliente';
        const id = tipo === 'Proveedor'
            ? (p.idProveedor ?? p.IdProveedor)
            : (p.idCliente ?? p.IdCliente);
        return `${tipo}:${id}`;
    }

    function setTipoDestino(tipo, opts = {}) {
        const nuevo = tipo || 'Clientes';

        // En curso: no se cambia el destino (parecería un recorrido nuevo)
        if (!opts.force && state.estado === 'EnCurso') {
            toast('El recorrido está en curso: no se puede cambiar el destino');
            syncTipoDestinoUi();
            return;
        }

        if (!opts.force && state.estado === 'Finalizado') {
            toast('Este recorrido ya está finalizado');
            syncTipoDestinoUi();
            return;
        }

        state.tipoDestino = nuevo;
        syncTipoDestinoUi();

        // Solo cambia qué puntos se muestran en el mapa para agregar.
        // NUNCA borra paradas ya armadas.
        if (!opts.skipCargarPuntos) cargarPuntos();
        lockEditorSegunEstado();
    }

    function syncTipoDestinoUi() {
        $$('#recTipoDestino .rec-dest-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tipo === state.tipoDestino);
        });

        const buscar = $('#txtBuscarClienteMapa');
        if (buscar) {
            buscar.placeholder = state.tipoDestino === 'Proveedores'
                ? 'Filtrar proveedores en el mapa...'
                : state.tipoDestino === 'Ambos'
                    ? 'Filtrar clientes y proveedores...'
                    : 'Filtrar clientes en el mapa...';
        }
    }

    function lockEditorSegunEstado() {
        const enCurso = state.estado === 'EnCurso';
        const cerrado = enCurso || state.estado === 'Finalizado' || state.estado === 'Cancelado';

        $$('#recTipoDestino .rec-dest-btn').forEach(b => {
            b.disabled = cerrado;
            b.classList.toggle('is-locked', cerrado);
            b.title = cerrado
                ? (enCurso ? 'Bloqueado: recorrido en curso' : 'Bloqueado')
                : '';
        });

        const toggle = $('#recTipoDestino');
        if (toggle) toggle.classList.toggle('is-locked', cerrado);

        const btnNuevo = $('#btnNuevoRecorrido');
        if (btnNuevo) {
            btnNuevo.disabled = enCurso;
            btnNuevo.classList.toggle('is-locked', enCurso);
            btnNuevo.title = enCurso
                ? 'No podés crear otro: tenés un recorrido en curso'
                : 'Nuevo recorrido';
        }
    }

    function bootSvg(color) {
        // Botita simple, relleno con color
        return `
        <svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="${color}" stroke="#fff" stroke-width="3" stroke-linejoin="round"
                d="M14 40c0-8 4-14 12-16l4-12c1-3 4-5 7-5h2c3 0 5 3 4 6l-3 11h8c7 0 12 4 12 10v4c0 2-2 4-4 4H18c-2 0-4-2-4-4v-0z"/>
            <path fill="rgba(0,0,0,.18)" d="M18 48h36c1 0 2 1 2 2v2H16v-2c0-1 1-2 2-2z"/>
            <circle cx="28" cy="34" r="2.2" fill="rgba(255,255,255,.55)"/>
            <circle cx="35" cy="34" r="2.2" fill="rgba(255,255,255,.55)"/>
            <circle cx="42" cy="34" r="2.2" fill="rgba(255,255,255,.55)"/>
        </svg>`;
    }

    function createBootOverlay(position, opts) {
        const overlay = new google.maps.OverlayView();
        overlay._pos = position;
        overlay._opts = opts;
        overlay._div = null;

        overlay.onAdd = function () {
            const div = document.createElement('div');
            div.className = 'rec-boot-marker' +
                (opts.visual ? ` is-${opts.visual}` : '') +
                (opts.isActual ? ' is-actual' : '');
            div.title = opts.title || '';
            div.innerHTML = `
                <div class="rec-boot-shadow"></div>
                <div class="rec-boot-icon">${bootSvg(opts.color)}</div>
                ${opts.isActual ? '<span class="rec-boot-pulse"></span>' : ''}`;
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof opts.onClick === 'function') opts.onClick();
            });
            overlay._div = div;
            const panes = overlay.getPanes();
            panes.overlayMouseTarget.appendChild(div);
        };

        overlay.draw = function () {
            if (!overlay._div) return;
            const projection = overlay.getProjection();
            if (!projection) return;
            const point = projection.fromLatLngToDivPixel(new google.maps.LatLng(overlay._pos.lat, overlay._pos.lng));
            if (!point) return;
            overlay._div.style.left = point.x + 'px';
            overlay._div.style.top = point.y + 'px';
            overlay._div.style.zIndex = String(opts.zIndex || 10);
        };

        overlay.onRemove = function () {
            if (overlay._div?.parentNode) overlay._div.parentNode.removeChild(overlay._div);
            overlay._div = null;
        };

        overlay.setMap(state.map);
        return overlay;
    }

    function clearMarkers() {
        if (state.activeInfo) {
            state.activeInfo.close();
            state.activeInfo = null;
        }
        state.markers.forEach(m => {
            if (m.setMap) m.setMap(null);
        });
        state.markers = [];
    }

    function styleInfoWindowChrome() {
        document.querySelectorAll('.gm-style-iw-c').forEach(el => {
            el.classList.add('rec-iw-chrome');
        });
        document.querySelectorAll('.gm-style-iw-d').forEach(el => {
            el.style.overflow = 'hidden';
            el.style.maxHeight = 'none';
        });
        document.querySelectorAll('.gm-style-iw-chr button, .gm-ui-hover-effect').forEach(btn => {
            btn.classList.add('rec-iw-close');
        });
    }

    function drawClientMarkers(filter = '', opts = {}) {
        if (!state.map) return;
        clearMarkers();
        const q = (filter || '').toLowerCase().trim();
        const bounds = new google.maps.LatLngBounds();
        let any = false;
        const idxActual = indiceParadaActual();

        state.puntos.forEach(c => {
            const hay = !q || (c.nombre || '').toLowerCase().includes(q) ||
                (c.direccion || '').toLowerCase().includes(q) ||
                (c.localidad || '').toLowerCase().includes(q) ||
                (c.apodo || '').toLowerCase().includes(q);
            if (!hay) return;

            const pos = { lat: Number(c.latitud), lng: Number(c.longitud) };
            const idxParada = state.paradas.findIndex(p => claveParada(p) === claveParada({
                tipoParada: c.tipo,
                idCliente: c.tipo === 'Cliente' ? c.id : null,
                idProveedor: c.tipo === 'Proveedor' ? c.id : null
            }));
            const inRoute = idxParada >= 0;
            const visual = inRoute ? visualParada(state.paradas[idxParada], idxParada) : 'cliente';
            const fill = colorMarcador(visual, c.tipo);
            const isActual = visual === 'actual';

            const addr = c.direccionMaps || c.direccion || 'Sin dirección';
            const tel = c.telefono ? escapeHtml(c.telefono) : '';
            const loc = [c.localidad, c.provincia, c.apodo].filter(Boolean).join(', ');
            const puedeVisitar = state.estado === 'EnCurso' && idxParada === idxActual;
            const tipoLabel = c.tipo === 'Proveedor' ? 'Proveedor' : 'Cliente';
            let actionHtml;
            if (puedeVisitar) {
                actionHtml = `<button type="button" class="rec-iw-btn" id="btnVisit_${c.tipo}_${c.id}"><i class="fa fa-check"></i> Marcar visitada</button>`
                    + `<button type="button" class="rec-iw-btn rec-iw-btn-omit" id="btnOmit_${c.tipo}_${c.id}"><i class="fa fa-forward"></i> Omitir</button>`;
            } else if (inRoute) {
                actionHtml = `<button type="button" class="rec-iw-btn is-added" disabled><i class="fa fa-check"></i> ${escapeHtml(labelVisual(visual))}</button>`;
            } else {
                actionHtml = `<button type="button" class="rec-iw-btn" id="btnAdd_${c.tipo}_${c.id}"><i class="fa fa-plus"></i> Agregar a ruta</button>`;
            }

            const info = new google.maps.InfoWindow({
                maxWidth: 320,
                pixelOffset: new google.maps.Size(0, -28),
                content: `
                <div class="rec-iw">
                    <div class="rec-iw-top">
                        <div class="rec-iw-avatar" style="background:${fill}33;color:${fill};border-color:${fill}55">${bootSvg(fill)}</div>
                        <div class="rec-iw-titles">
                            <strong class="rec-iw-name">${escapeHtml(c.nombre)}</strong>
                            <span class="rec-iw-loc"><i class="fa fa-tag"></i> ${tipoLabel}</span>
                            ${loc ? `<span class="rec-iw-loc"><i class="fa fa-map-pin"></i> ${escapeHtml(loc)}</span>` : ''}
                            ${inRoute ? `<span class="rec-stop-badge ${visual}">${labelVisual(visual)}</span>` : ''}
                        </div>
                    </div>
                    <div class="rec-iw-addr">
                        <i class="fa fa-map-marker"></i>
                        <span>${escapeHtml(addr)}</span>
                    </div>
                    ${tel ? `<div class="rec-iw-tel"><i class="fa fa-phone"></i> ${tel}</div>` : ''}
                    <div class="rec-iw-actions">${actionHtml}</div>
                </div>`
            });

            const openInfo = () => {
                if (state.activeInfo) state.activeInfo.close();
                state.activeInfo = info;
                info.setPosition(pos);
                info.open({ map: state.map });
                google.maps.event.addListenerOnce(info, 'domready', () => {
                    styleInfoWindowChrome();
                    const bAdd = document.getElementById(`btnAdd_${c.tipo}_${c.id}`);
                    if (bAdd) {
                        bAdd.onclick = () => {
                            addParadaFromPunto(c);
                            info.close();
                        };
                    }
                    const bVisit = document.getElementById(`btnVisit_${c.tipo}_${c.id}`);
                    if (bVisit) {
                        bVisit.onclick = async () => {
                            await marcarParadaVisitada(idxParada);
                            info.close();
                        };
                    }
                    const bOmit = document.getElementById(`btnOmit_${c.tipo}_${c.id}`);
                    if (bOmit) {
                        bOmit.onclick = () => {
                            info.close();
                            abrirModalOmitir(idxParada);
                        };
                    }
                });
            };

            const boot = createBootOverlay(pos, {
                color: fill,
                visual,
                isActual,
                title: `${c.nombre} (${tipoLabel})` + (inRoute ? ` · ${labelVisual(visual)}` : ''),
                zIndex: isActual ? 999 : (inRoute ? 50 : 10),
                onClick: openInfo
            });

            state.markers.push(boot);
            bounds.extend(pos);
            any = true;
        });

        if (state.origen) bounds.extend(state.origen);
        if (any && opts.fit) state.map.fitBounds(bounds, 60);
    }

    function highlightRouteMarkers() {
        drawClientMarkers($('#txtBuscarClienteMapa')?.value || '', { fit: false });
    }

    function labelVisual(visual) {
        switch (visual) {
            case 'visitada': return 'Visitado';
            case 'omitida': return 'Omitido';
            case 'actual': return 'Siguiente visita';
            case 'pendiente': return 'Pendiente';
            default: return 'En ruta';
        }
    }

    let omitirIdxPendiente = null;

    function abrirModalOmitir(idx) {
        omitirIdxPendiente = idx;
        const p = state.paradas[idx];
        const sub = $('#recOmitirSub');
        if (sub) {
            sub.textContent = p
                ? `Omitir «${p.nombreCliente || 'parada'}»: indicá por qué no se visitó (cerrado, no estaba, etc.).`
                : 'Indicá por qué no se visitó (cerrado, no estaba, etc.).';
        }
        const ta = $('#txtOmitirObs');
        if (ta) ta.value = '';
        const modal = $('#recModalOmitir');
        if (modal) modal.hidden = false;
        setTimeout(() => ta?.focus(), 50);
    }

    function cerrarModalOmitir() {
        const modal = $('#recModalOmitir');
        if (modal) modal.hidden = true;
        omitirIdxPendiente = null;
    }

    function abrirModalObs(idx) {
        const p = state.paradas[idx];
        if (!p) return;
        const title = $('#recObsTitle');
        if (title) title.textContent = 'Observación · ' + (p.nombreCliente || 'Parada');
        const texto = $('#recObsTexto');
        if (texto) texto.textContent = (p.notas || '').trim() || '(Sin observación)';
        const modal = $('#recModalVerObs');
        if (modal) modal.hidden = false;
    }

    function cerrarModalObs() {
        const modal = $('#recModalVerObs');
        if (modal) modal.hidden = true;
    }

    function renderParadas() {
        const ul = $('#listaParadas');
        ul.innerHTML = '';
        if (!state.paradas.length) {
            ul.innerHTML = '<li class="rec-hist-item"><small>Agregá clientes o proveedores desde el mapa</small></li>';
            updateStats();
            return;
        }

        const enCurso = state.estado === 'EnCurso';
        const idxActual = indiceParadaActual();

        state.paradas.forEach((p, idx) => {
            const visual = visualParada(p, idx);
            const puedeVisitar = enCurso && visual === 'actual';
            const tieneObs = !!(p.notas && String(p.notas).trim());
            const tipo = p.tipoParada || 'Cliente';
            const tipoCls = tipo === 'Proveedor' ? 'tipo-prov' : 'tipo-cli';
            const li = document.createElement('li');
            li.className = `rec-stop is-${visual}`;
            li.draggable = !enCurso;
            li.dataset.index = idx;
            li.innerHTML = `
                <div class="ord">${idx + 1}</div>
                <div class="meta">
                    <strong>${escapeHtml(p.nombreCliente || 'Parada')} <em class="rec-tipo-tag ${tipoCls}">${escapeHtml(tipo)}</em></strong>
                    <small>${escapeHtml(p.direccion || '')}</small>
                    <span class="rec-stop-badge ${visual}">${labelVisual(visual)}</span>
                </div>
                <div class="ops">
                    <button type="button" title="${puedeVisitar ? 'Marcar visitada' : (enCurso ? 'Primero resolvé la parada actual' : 'Iniciá el recorrido para marcar visitas')}"
                        data-act="visit" ${puedeVisitar ? '' : 'disabled'}>
                        <i class="fa fa-check"></i>
                    </button>
                    <button type="button" class="rec-act-omit" title="${puedeVisitar ? 'Omitir y pasar al siguiente' : 'Solo se puede omitir la parada actual'}"
                        data-act="omit" ${puedeVisitar ? '' : 'disabled'}>
                        <i class="fa fa-forward"></i>
                    </button>
                    <button type="button" class="rec-act-eye" title="${tieneObs ? 'Ver observación' : 'Sin observación'}"
                        data-act="obs" ${tieneObs ? '' : 'disabled'}>
                        <i class="fa fa-eye"></i>
                    </button>
                    <button type="button" title="Quitar" data-act="del" ${enCurso ? 'disabled' : ''}>
                        <i class="fa fa-trash"></i>
                    </button>
                </div>`;

            if (!enCurso) {
                li.addEventListener('dragstart', () => { state.dragIndex = idx; });
                li.addEventListener('dragover', (e) => e.preventDefault());
                li.addEventListener('drop', () => {
                    if (state.dragIndex == null || state.dragIndex === idx) return;
                    const moved = state.paradas.splice(state.dragIndex, 1)[0];
                    state.paradas.splice(idx, 0, moved);
                    state.dragIndex = null;
                    renderParadas();
                    highlightRouteMarkers();
                    refrescarRutaAuto();
                });
            }

            const btnDel = li.querySelector('[data-act="del"]');
            if (btnDel && !enCurso) {
                btnDel.onclick = () => {
                    state.paradas.splice(idx, 1);
                    renderParadas();
                    highlightRouteMarkers();
                    refrescarRutaAuto();
                };
            }

            const btnVisit = li.querySelector('[data-act="visit"]');
            if (btnVisit && puedeVisitar) {
                btnVisit.onclick = async () => {
                    await marcarParadaVisitada(idx);
                };
            }

            const btnOmit = li.querySelector('[data-act="omit"]');
            if (btnOmit && puedeVisitar) {
                btnOmit.onclick = () => abrirModalOmitir(idx);
            }

            const btnObs = li.querySelector('[data-act="obs"]');
            if (btnObs && tieneObs) {
                btnObs.onclick = () => abrirModalObs(idx);
            }

            ul.appendChild(li);
        });
        updateStats();

        const hint = document.querySelector('.rec-list-head small');
        if (hint) {
            hint.textContent = enCurso
                ? (idxActual >= 0
                    ? `En curso · siguiente: ${state.paradas[idxActual].nombreCliente || 'parada'}`
                    : 'Todas las paradas resueltas · podés finalizar')
                : 'Arrastrá para reordenar · Click en mapa para agregar';
        }
    }

    async function marcarParadaVisitada(idx) {
        if (state.estado !== 'EnCurso') {
            toast('Iniciá el recorrido para marcar visitas');
            return;
        }
        if (idx !== indiceParadaActual()) {
            toast('Tenés que resolver la parada actual primero');
            return;
        }
        const p = state.paradas[idx];
        const prevEstado = p.estadoParada;
        const prevFecha = p.fechaVisitada;
        p.estadoParada = 'Visitada';
        p.fechaVisitada = new Date().toISOString();

        const ok = await guardarRecorrido(true);
        if (!ok) {
            p.estadoParada = prevEstado || 'Pendiente';
            p.fechaVisitada = prevFecha;
            toast('No se pudo guardar la visita');
            return;
        }

        toast('Visitada: ' + (p.nombreCliente || 'parada'));
        renderParadas();
        highlightRouteMarkers();
        refrescarRutaAuto();
        if (window.RecorridoBanner) window.RecorridoBanner.refresh();
        if (indiceParadaActual() < 0) {
            await finalizarRecorrido(true, '¡Recorrido completado! Se finalizó automáticamente');
        }
    }

    async function confirmarOmitirParada() {
        const idx = omitirIdxPendiente;
        if (idx == null) return;
        if (state.estado !== 'EnCurso') {
            toast('Iniciá el recorrido para omitir paradas');
            return;
        }
        if (idx !== indiceParadaActual()) {
            toast('Solo se puede omitir la parada actual');
            cerrarModalOmitir();
            return;
        }
        const obs = ($('#txtOmitirObs')?.value || '').trim();
        if (!obs) {
            toast('Escribí una observación para omitir');
            $('#txtOmitirObs')?.focus();
            return;
        }
        if (obs.length > 2000) {
            toast('La observación no puede superar 2000 caracteres');
            return;
        }

        const p = state.paradas[idx];
        const prev = {
            estadoParada: p.estadoParada,
            notas: p.notas,
            fechaOmitida: p.fechaOmitida
        };
        p.estadoParada = 'Omitida';
        p.notas = obs;
        p.fechaOmitida = new Date().toISOString();

        const ok = await guardarRecorrido(true);
        if (!ok) {
            p.estadoParada = prev.estadoParada || 'Pendiente';
            p.notas = prev.notas;
            p.fechaOmitida = prev.fechaOmitida;
            toast('No se pudo omitir la parada');
            return;
        }

        cerrarModalOmitir();
        toast('Omitida: ' + (p.nombreCliente || 'parada') + ' · siguiente en celeste');
        renderParadas();
        highlightRouteMarkers();
        refrescarRutaAuto();
        if (window.RecorridoBanner) window.RecorridoBanner.refresh();
        if (indiceParadaActual() < 0) {
            await finalizarRecorrido(true, '¡Recorrido completado! Se finalizó automáticamente');
        }
    }

    async function sincronizarDesdeServidor(id) {
        const res = await fetch('/Recorridos/Obtener?id=' + id);
        if (!res.ok) return;
        const r = await res.json();
        const keepEstado = state.estado;
        state.recorridoId = r.id ?? r.Id;
        state.estado = r.estado ?? r.Estado ?? keepEstado;
        // Si estábamos en curso localmente, no pisar por un Borrador viejo del server en medio de marcar visita
        if (keepEstado === 'EnCurso' && state.estado === 'Borrador') state.estado = 'EnCurso';

        state.distanciaMetros = r.distanciaMetros ?? r.DistanciaMetros;
        state.duracionSegundos = r.duracionSegundos ?? r.DuracionSegundos;
        $('#txtRecId').value = state.recorridoId;
        if (r.nombre || r.Nombre) $('#txtRecNombre').value = r.nombre ?? r.Nombre;

        state.paradas = (r.paradas || r.Paradas || []).map(p => ({
            id: p.id ?? p.Id,
            idCliente: p.idCliente ?? p.IdCliente,
            idProveedor: p.idProveedor ?? p.IdProveedor,
            tipoParada: p.tipoParada ?? p.TipoParada ?? 'Cliente',
            orden: p.orden ?? p.Orden,
            nombreCliente: p.nombreCliente ?? p.NombreCliente,
            direccion: p.direccion ?? p.Direccion,
            latitud: Number(p.latitud ?? p.Latitud),
            longitud: Number(p.longitud ?? p.Longitud),
            estadoParada: p.estadoParada ?? p.EstadoParada ?? 'Pendiente',
            notas: p.notas ?? p.Notas ?? null,
            fechaVisitada: p.fechaVisitada ?? p.FechaVisitada ?? null,
            fechaOmitida: p.fechaOmitida ?? p.FechaOmitida ?? null
        }));
    }

    async function guardarRecorrido(silent) {
        const body = payloadGuardar();
        if (!body.paradas.length) {
            if (!silent) toast('Agregá paradas antes de guardar');
            return false;
        }
        const res = await fetch('/Recorridos/Guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.valor) {
            if (!silent) toast(data.mensaje || data.Mensaje || 'Error al guardar');
            return false;
        }
        state.recorridoId = data.id;
        $('#txtRecId').value = data.id;
        await sincronizarDesdeServidor(data.id);
        if (!silent) toast('Recorrido guardado');
        await cargarHistorial();
        if (window.RecorridoBanner) window.RecorridoBanner.refresh();
        return true;
    }

    async function iniciarRecorrido() {
        if (!state.recorridoId) {
            const ok = await guardarRecorrido(true);
            if (!ok) return;
        }
        if (!state.recorridoId) return;
        const res = await fetch('/Recorridos/Iniciar?id=' + state.recorridoId, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.valor) {
            toast(data.mensaje || data.Mensaje || 'No se pudo iniciar. ¿Ya tenés otro en curso?');
            return;
        }
        if (data.valor) {
            state.estado = 'EnCurso';
            try { localStorage.removeItem('recPendingDismissUntil'); } catch { /* ignore */ }
            await guardarRecorrido(true);
            updateStats();
            renderParadas();
            highlightRouteMarkers();
            toast('Recorrido en curso · la parada en celeste es la siguiente');
            if (window.RecorridoBanner) window.RecorridoBanner.refresh();
            await cargarHistorial();
        }
    }

    async function finalizarRecorrido(silentGuardar, mensajeExito) {
        if (!state.recorridoId) {
            toast('Guardá el recorrido primero');
            return false;
        }
        const res = await fetch('/Recorridos/Finalizar?id=' + state.recorridoId, { method: 'POST' });
        const data = await res.json();
        if (data.valor) {
            state.estado = 'Finalizado';
            updateStats();
            renderParadas();
            highlightRouteMarkers();
            toast(mensajeExito || 'Recorrido finalizado');
            await cargarHistorial();
            if (window.RecorridoBanner) window.RecorridoBanner.refresh();
            return true;
        }
        return false;
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function addParadaFromPunto(c) {
        const tipo = c.tipo === 'Proveedor' ? 'Proveedor' : 'Cliente';
        const draft = {
            tipoParada: tipo,
            idCliente: tipo === 'Cliente' ? c.id : null,
            idProveedor: tipo === 'Proveedor' ? c.id : null
        };
        if (state.paradas.some(p => claveParada(p) === claveParada(draft))) {
            toast('Ese ' + tipo.toLowerCase() + ' ya está en el recorrido');
            return;
        }
        state.paradas.push({
            id: 0,
            idCliente: draft.idCliente,
            idProveedor: draft.idProveedor,
            tipoParada: tipo,
            orden: state.paradas.length + 1,
            nombreCliente: c.nombre,
            direccion: c.direccionMaps || c.direccion || '',
            latitud: Number(c.latitud),
            longitud: Number(c.longitud),
            estadoParada: 'Pendiente'
        });
        renderParadas();
        highlightRouteMarkers();
        refrescarRutaAuto();
        toast('Agregado: ' + c.nombre);
    }

    // compat por si quedó alguna referencia
    function addParadaFromCliente(c) {
        addParadaFromPunto({ ...c, tipo: c.tipo || 'Cliente' });
    }

    function setOrigen(lat, lng, address) {
        state.origen = {
            lat: Number(lat),
            lng: Number(lng),
            direccion: address || state.origen?.direccion || null
        };
        if (!state.map) {
            $('#origenMeta').textContent = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            return;
        }
        if (!state.origenMarker) {
            state.origenMarker = new google.maps.Marker({
                map: state.map,
                draggable: true,
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 6,
                    fillColor: '#14b8a6',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                    rotation: 0
                }
            });
            state.origenMarker.addListener('dragend', (e) => {
                setOrigen(e.latLng.lat(), e.latLng.lng(), null);
                reverseGeocodeOrigen();
            });
        }
        state.origenMarker.setPosition(state.origen);
        state.map.panTo(state.origen);
        $('#origenMeta').textContent = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (address) $('#txtOrigen').value = address;
        if (state.paradas.length) refrescarRutaAuto();
    }

    function reverseGeocodeOrigen() {
        if (!state.geocoder || !state.origen) return;
        state.geocoder.geocode({ location: state.origen }, (results, status) => {
            if (status === 'OK' && results[0]) {
                $('#txtOrigen').value = results[0].formatted_address;
                $('#origenMeta').textContent = results[0].formatted_address;
            }
        });
    }

    function usarGps() {
        if (!navigator.geolocation) {
            toast('Geolocalización no disponible');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setOrigen(pos.coords.latitude, pos.coords.longitude, null);
                reverseGeocodeOrigen();
                toast('Origen tomado de tu GPS');
            },
            () => toast('No se pudo obtener tu ubicación'),
            { enableHighAccuracy: true, timeout: 12000 }
        );
    }

    function dist2(a, b) {
        const dx = a.lat - b.latitud;
        const dy = a.lng - b.longitud;
        return dx * dx + dy * dy;
    }

    function aplicarStatsDeRuta(result) {
        let metros = 0, segundos = 0;
        result.routes[0].legs.forEach(leg => {
            metros += leg.distance?.value || 0;
            segundos += leg.duration?.value || 0;
        });
        state.distanciaMetros = metros;
        state.duracionSegundos = segundos;
        updateStats();
    }

    function limpiarPolylinesRuta() {
        (state.routePolylines || []).forEach(p => {
            try { p.setMap(null); } catch { /* ignore */ }
        });
        state.routePolylines = [];
    }

    function limpiarRutaDibujada() {
        if (state.directionsRenderer) {
            state.directionsRenderer.set('directions', null);
        }
        limpiarPolylinesRuta();
    }

    function pintarRutaColoreada(result) {
        limpiarPolylinesRuta();
        if (!result?.routes?.[0]?.legs?.length || !state.map) return;

        const legs = result.routes[0].legs;
        // legs[i] llega a state.paradas[i]
        legs.forEach((leg, i) => {
            const parada = state.paradas[i];
            const est = (parada && (parada.estadoParada || '')) || '';
            const visitada = est === 'Visitada';
            const omitida = est === 'Omitida';
            const path = [];
            (leg.steps || []).forEach(step => {
                (step.path || []).forEach(ll => path.push(ll));
            });
            if (!path.length && leg.start_location && leg.end_location) {
                path.push(leg.start_location, leg.end_location);
            }
            if (!path.length) return;

            const strokeColor = visitada ? '#22c55e' : (omitida ? '#ef4444' : '#f59e0b');
            const poly = new google.maps.Polyline({
                path,
                map: state.map,
                geodesic: true,
                strokeColor,
                strokeOpacity: (visitada || omitida) ? 0.95 : 0.92,
                strokeWeight: (visitada || omitida) ? 6 : 5,
                zIndex: visitada ? 3 : (omitida ? 4 : 2)
            });
            state.routePolylines.push(poly);
        });
    }

    async function dibujarRuta(optimize, silent) {
        if (!state.map || !state.directionsService) {
            if (!silent) toast('Maps no está listo');
            return;
        }
        if (!state.origen) {
            if (!silent) toast('Definí el punto de partida');
            return;
        }
        if (state.paradas.length < 1) {
            if (!silent) toast('Agregá al menos una parada');
            return;
        }

        // Evitar trazo doble si había una ruta anterior
        limpiarRutaDibujada();

        // Ruta sugerida: una sola ruta ABIERTA (sin volver al origen).
        // Destino = parada más lejos del origen; el resto se optimiza como waypoints.
        if (optimize && state.paradas.length > 1) {
            let idxDest = 0;
            let best = -1;
            state.paradas.forEach((p, i) => {
                const d = dist2(state.origen, p);
                if (d > best) { best = d; idxDest = i; }
            });

            const destino = state.paradas[idxDest];
            const intermedias = state.paradas.filter((_, i) => i !== idxDest);

            state.directionsService.route({
                origin: state.origen,
                destination: { lat: destino.latitud, lng: destino.longitud },
                waypoints: intermedias.map(p => ({
                    location: { lat: p.latitud, lng: p.longitud },
                    stopover: true
                })),
                optimizeWaypoints: true,
                travelMode: google.maps.TravelMode.DRIVING
            }, (result, status) => {
                if (status !== 'OK' || !result) {
                    if (!silent) toast('No se pudo optimizar: ' + status);
                    return;
                }

                const order = result.routes[0].waypoint_order || [];
                state.paradas = [
                    ...order.map(i => intermedias[i]),
                    destino
                ];

                state.directionsRenderer.setDirections(result);
                pintarRutaColoreada(result);
                state.lastOverviewPolyline = result.routes[0]?.overview_polyline || null;
                aplicarStatsDeRuta(result);
                renderParadas();
                highlightRouteMarkers();
                if (!silent) toast('Ruta sugerida aplicada');
            });
            return;
        }

        const destination = state.paradas[state.paradas.length - 1];
        const waypoints = state.paradas.slice(0, -1).map(p => ({
            location: { lat: p.latitud, lng: p.longitud },
            stopover: true
        }));

        state.directionsService.route({
            origin: state.origen,
            destination: { lat: destination.latitud, lng: destination.longitud },
            waypoints,
            optimizeWaypoints: false,
            travelMode: google.maps.TravelMode.DRIVING
        }, (result, status) => {
            if (status !== 'OK' || !result) {
                if (!silent) toast('No se pudo calcular la ruta: ' + status);
                return;
            }

            state.directionsRenderer.setDirections(result);
            pintarRutaColoreada(result);
            state.lastOverviewPolyline = result.routes[0]?.overview_polyline || null;
            aplicarStatsDeRuta(result);
            if (!silent) toast('Ruta dibujada');
        });
    }

    function payloadGuardar() {
        return {
            id: state.recorridoId || 0,
            nombre: $('#txtRecNombre').value.trim() || ('Recorrido ' + new Date().toLocaleString()),
            estado: state.estado || 'Borrador',
            tipoDestino: state.tipoDestino || 'Clientes',
            origenLat: state.origen?.lat ?? null,
            origenLng: state.origen?.lng ?? null,
            origenDireccion: $('#txtOrigen').value || $('#origenMeta').textContent,
            distanciaMetros: state.distanciaMetros,
            duracionSegundos: state.duracionSegundos,
            paradas: state.paradas.map((p, i) => ({
                id: p.id || 0,
                idCliente: p.idCliente || null,
                idProveedor: p.idProveedor || null,
                tipoParada: p.tipoParada || 'Cliente',
                orden: i + 1,
                nombreCliente: p.nombreCliente,
                direccion: p.direccion,
                latitud: p.latitud,
                longitud: p.longitud,
                estadoParada: p.estadoParada || 'Pendiente',
                fechaVisitada: p.fechaVisitada || null,
                fechaOmitida: p.fechaOmitida || null,
                notas: p.notas || null
            }))
        };
    }

    async function cargarPuntos() {
        const tipo = state.tipoDestino || 'Clientes';
        const res = await fetch('/Recorridos/PuntosMapa?tipo=' + encodeURIComponent(tipo));
        const data = await res.json();
        state.puntos = (data || []).map(c => ({
            id: c.id ?? c.Id,
            tipo: c.tipo ?? c.Tipo ?? 'Cliente',
            nombre: c.nombre ?? c.Nombre,
            apodo: c.apodo ?? c.Apodo,
            telefono: c.telefono ?? c.Telefono,
            direccion: c.direccion ?? c.Direccion,
            direccionMaps: c.direccionMaps ?? c.DireccionMaps,
            localidad: c.localidad ?? c.Localidad,
            provincia: c.provincia ?? c.Provincia,
            latitud: c.latitud ?? c.Latitud,
            longitud: c.longitud ?? c.Longitud
        }));
        // alias legacy
        state.clientes = state.puntos.filter(p => p.tipo === 'Cliente');
        drawClientMarkers('', { fit: true });
        if (!state.puntos.length) {
            toast(tipo === 'Proveedores'
                ? 'No hay proveedores con coordenadas. Ubicalos desde Proveedores.'
                : tipo === 'Clientes'
                    ? 'No hay clientes con coordenadas. Ubicalos desde Clientes.'
                    : 'No hay puntos con coordenadas. Ubicalos desde Clientes/Proveedores.');
        }
    }

    function buildGoogleMapsUrl() {
        const stops = (state.estado === 'EnCurso'
            ? state.paradas.filter(p => !paradaResuelta(p))
            : state.paradas.slice()
        ).filter(p => p.latitud && p.longitud);

        if (!stops.length) return null;

        // Google Maps URL: origin opcional, hasta 9 waypoints + destination
        const dest = stops[stops.length - 1];
        const middles = stops.slice(0, -1).slice(0, 9);
        const params = new URLSearchParams({
            api: '1',
            destination: Number(dest.latitud) + ',' + Number(dest.longitud),
            travelmode: 'driving',
            dir_action: 'navigate'
        });

        if (state.origen?.lat != null && state.origen?.lng != null) {
            params.set('origin', Number(state.origen.lat) + ',' + Number(state.origen.lng));
        }

        if (middles.length) {
            params.set('waypoints', middles.map(w => Number(w.latitud) + ',' + Number(w.longitud)).join('|'));
        }

        return 'https://www.google.com/maps/dir/?' + params.toString();
    }

    function abrirEnGoogleMaps() {
        const url = buildGoogleMapsUrl();
        if (!url) {
            toast('Agregá al menos una parada con ubicación');
            return;
        }
        window.open(url, '_blank', 'noopener');
        toast('Abriendo Google Maps… tocá Iniciar navegación');
    }

    function nombreArchivoExport() {
        const base = ($('#txtRecNombre').value || 'recorrido').trim()
            .replace(/[\\/:*?"<>|]+/g, '-')
            .replace(/\s+/g, '_');
        const d = new Date();
        const stamp = d.getFullYear() +
            String(d.getMonth() + 1).padStart(2, '0') +
            String(d.getDate()).padStart(2, '0');
        return base + '_' + stamp;
    }

    function ensureSheetJs() {
        if (window.XLSX) return Promise.resolve(true);
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
            s.async = true;
            s.onload = () => resolve(!!window.XLSX);
            s.onerror = () => reject(new Error('No se pudo cargar SheetJS'));
            document.head.appendChild(s);
        });
    }

    async function exportarExcel() {
        if (!state.paradas.length) {
            toast('No hay paradas para exportar');
            return;
        }

        try {
            toast('Generando Excel…');
            await ensureSheetJs();
        } catch {
            toast('No se pudo cargar el exportador de Excel');
            return;
        }

        const nombreRec = ($('#txtRecNombre').value || 'Recorrido').trim();
        const info = [
            ['Campo', 'Valor'],
            ['Recorrido', nombreRec],
            ['Estado', labelEstado(state.estado)],
            ['Destino', state.tipoDestino || 'Clientes'],
            ['Origen', state.origen?.direccion || $('#txtOrigen')?.value || ''],
            ['Distancia', fmtKm(state.distanciaMetros)],
            ['Tiempo', fmtTime(state.duracionSegundos)],
            ['Paradas', state.paradas.length],
            ['Exportado', new Date().toLocaleString()]
        ];

        const paradasAoA = [
            ['Orden', 'Tipo', 'Nombre', 'Direccion', 'Estado', 'Latitud', 'Longitud', 'Link_Maps']
        ];

        state.paradas.forEach((p, i) => {
            const lat = p.latitud != null && p.latitud !== '' ? Number(p.latitud) : null;
            const lng = p.longitud != null && p.longitud !== '' ? Number(p.longitud) : null;
            const maps = (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng))
                ? ('https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving')
                : '';

            paradasAoA.push([
                i + 1,
                p.tipoParada || 'Cliente',
                p.nombreCliente || '',
                p.direccion || '',
                p.estadoParada || 'Pendiente',
                lat != null && !Number.isNaN(lat) ? lat : '',
                lng != null && !Number.isNaN(lng) ? lng : '',
                maps
            ]);
        });

        const wb = XLSX.utils.book_new();
        const wsInfo = XLSX.utils.aoa_to_sheet(info);
        const wsParadas = XLSX.utils.aoa_to_sheet(paradasAoA);

        // Forzar texto en Link_Maps y números en lat/lng
        const range = XLSX.utils.decode_range(wsParadas['!ref'] || 'A1');
        for (let R = 1; R <= range.e.r; R++) {
            const latCell = wsParadas[XLSX.utils.encode_cell({ r: R, c: 5 })];
            const lngCell = wsParadas[XLSX.utils.encode_cell({ r: R, c: 6 })];
            const linkCell = wsParadas[XLSX.utils.encode_cell({ r: R, c: 7 })];
            if (latCell && typeof latCell.v === 'number') {
                latCell.t = 'n';
                latCell.z = '0.0000000';
            }
            if (lngCell && typeof lngCell.v === 'number') {
                lngCell.t = 'n';
                lngCell.z = '0.0000000';
            }
            if (linkCell && linkCell.v) {
                linkCell.t = 's';
                linkCell.v = String(linkCell.v);
                // evita que Excel lo tome como fórmula
                if (String(linkCell.v).startsWith('=')) linkCell.v = "'" + linkCell.v;
            }
        }

        wsInfo['!cols'] = [{ wch: 14 }, { wch: 60 }];
        wsParadas['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 28 }, { wch: 45 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 55 }
        ];

        XLSX.utils.book_append_sheet(wb, wsInfo, 'Informacion');
        XLSX.utils.book_append_sheet(wb, wsParadas, 'Paradas');

        const fileName = nombreArchivoExport() + '.xlsm';
        XLSX.writeFile(wb, fileName, { bookType: 'xlsm' });
        toast('Excel exportado (.xlsm)');
        cerrarMenuExport();
    }

    function staticMapUrl() {
        const key = window.__googleMapsApiKey || '';
        if (!key || !state.paradas.length) return '';

        const parts = [];

        // Origen
        if (state.origen?.lat != null && state.origen?.lng != null) {
            parts.push('markers=color:0x14b8a6%7Csize:mid%7Clabel:O%7C'
                + Number(state.origen.lat) + ',' + Number(state.origen.lng));
        }

        // Paradas numeradas
        const idxActual = indiceParadaActual();
        state.paradas.forEach((p, i) => {
            if (!p.latitud || !p.longitud) return;
            const visitada = (p.estadoParada || '') === 'Visitada';
            const actual = state.estado === 'EnCurso' && i === idxActual;
            const color = visitada ? 'green' : (actual ? 'red' : 'orange');
            const label = i < 9 ? String(i + 1) : String.fromCharCode(65 + Math.min(i - 9, 25));
            parts.push('markers=color:' + color + '%7Csize:mid%7Clabel:' + label + '%7C'
                + Number(p.latitud) + ',' + Number(p.longitud));
        });

        // Trazo ya recorrido (verde)
        const hecha = [];
        if (state.origen?.lat != null && state.origen?.lng != null) {
            hecha.push(Number(state.origen.lat) + ',' + Number(state.origen.lng));
        }
        let lastVisitIdx = -1;
        state.paradas.forEach((p, i) => {
            if ((p.estadoParada || '') === 'Visitada' && p.latitud && p.longitud) {
                hecha.push(Number(p.latitud) + ',' + Number(p.longitud));
                lastVisitIdx = i;
            }
        });
        if (hecha.length >= 2) {
            parts.push('path=color:0x22c55eff%7Cweight:5%7C' + hecha.join('%7C'));
        }

        // Trazo pendiente (naranja)
        const pend = [];
        if (lastVisitIdx >= 0) {
            const last = state.paradas[lastVisitIdx];
            pend.push(Number(last.latitud) + ',' + Number(last.longitud));
        } else if (state.origen?.lat != null && state.origen?.lng != null) {
            pend.push(Number(state.origen.lat) + ',' + Number(state.origen.lng));
        }
        state.paradas.forEach((p) => {
            if ((p.estadoParada || '') !== 'Visitada' && p.latitud && p.longitud) {
                pend.push(Number(p.latitud) + ',' + Number(p.longitud));
            }
        });
        if (pend.length >= 2) {
            parts.push('path=color:0xf59e0bff%7Cweight:5%7C' + pend.join('%7C'));
        } else if (state.lastOverviewPolyline && hecha.length < 2) {
            // fallback: polyline completa de Directions si no hay visitas
            parts.push('path=color:0xf59e0bff%7Cweight:5%7Cenc:' + state.lastOverviewPolyline);
        }

        // Máx. 640px en Static Maps (más grande se ve mal / falla)
        let url = 'https://maps.googleapis.com/maps/api/staticmap'
            + '?size=640x360&scale=2&maptype=roadmap&format=png'
            + '&' + parts.join('&')
            + '&key=' + encodeURIComponent(key);

        if (url.length > 8000) {
            // si es muy largo, solo marcadores
            const onlyMarkers = parts.filter(p => p.startsWith('markers='));
            url = 'https://maps.googleapis.com/maps/api/staticmap'
                + '?size=640x360&scale=2&maptype=roadmap&format=png'
                + '&' + onlyMarkers.join('&')
                + '&key=' + encodeURIComponent(key);
        }

        return url;
    }

    function buildRouteSvgDiagram() {
        const pts = [];
        if (state.origen?.lat != null && state.origen?.lng != null) {
            pts.push({
                lat: Number(state.origen.lat),
                lng: Number(state.origen.lng),
                label: 'O',
                kind: 'origen',
                name: 'Origen'
            });
        }
        state.paradas.forEach((p, i) => {
            if (!p.latitud || !p.longitud) return;
            const visitada = (p.estadoParada || '') === 'Visitada';
            const actual = state.estado === 'EnCurso' && i === indiceParadaActual();
            pts.push({
                lat: Number(p.latitud),
                lng: Number(p.longitud),
                label: String(i + 1),
                kind: visitada ? 'visitada' : (actual ? 'actual' : 'pendiente'),
                name: p.nombreCliente || ('Parada ' + (i + 1))
            });
        });
        if (pts.length < 1) return '';

        const lats = pts.map(p => p.lat);
        const lngs = pts.map(p => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const pad = 0.02;
        const w = 720;
        const h = 280;
        const dx = Math.max(maxLng - minLng, 0.002);
        const dy = Math.max(maxLat - minLat, 0.002);

        const xy = (p) => {
            const x = ((p.lng - minLng + pad * dx) / (dx * (1 + 2 * pad))) * w;
            const y = (1 - (p.lat - minLat + pad * dy) / (dy * (1 + 2 * pad))) * h;
            return { x, y };
        };

        const projected = pts.map(p => ({ ...p, ...xy(p) }));

        let lines = '';
        for (let i = 0; i < projected.length - 1; i++) {
            const a = projected[i];
            const b = projected[i + 1];
            const color = b.kind === 'visitada' ? '#22c55e' : '#f59e0b';
            lines += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
        }

        const dots = projected.map(p => {
            const fill = p.kind === 'origen' ? '#14b8a6'
                : p.kind === 'visitada' ? '#22c55e'
                : p.kind === 'actual' ? '#ef4444' : '#f59e0b';
            return `<g>
                <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="14" fill="${fill}" stroke="#fff" stroke-width="3"/>
                <text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="Segoe UI, Arial">${escapeHtml(p.label)}</text>
              </g>`;
        }).join('');

        const legend = projected.map(p =>
            `<div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${
                p.kind === 'origen' ? '#14b8a6' : p.kind === 'visitada' ? '#22c55e' : p.kind === 'actual' ? '#ef4444' : '#f59e0b'
            };margin-right:6px"></span><strong>${escapeHtml(p.label)}</strong> ${escapeHtml(p.name)}</div>`
        ).join('');

        return `
        <div class="map-wrap">
          <svg viewBox="0 0 ${w} ${h}" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:block">
            ${lines}
            ${dots}
          </svg>
          <div class="map-legend">${legend}</div>
        </div>`;
    }

    function exportarPdf() {
        if (!state.paradas.length) {
            toast('No hay paradas para exportar');
            return;
        }

        const nombre = escapeHtml($('#txtRecNombre').value || 'Recorrido');
        const estado = escapeHtml(labelEstado(state.estado));
        const origen = escapeHtml(state.origen?.direccion || $('#txtOrigen')?.value || 'Sin origen');
        const dist = escapeHtml(fmtKm(state.distanciaMetros));
        const tiempo = escapeHtml(fmtTime(state.duracionSegundos));
        const mapsUrl = buildGoogleMapsUrl() || '';
        const mapImg = staticMapUrl();
        const svgDiagram = buildRouteSvgDiagram();

        const filas = state.paradas.map((p, i) => `
            <tr>
                <td class="ord">${i + 1}</td>
                <td>${escapeHtml(p.tipoParada || 'Cliente')}</td>
                <td><strong>${escapeHtml(p.nombreCliente || '')}</strong><br><small>${escapeHtml(p.direccion || '')}</small></td>
                <td>${escapeHtml(p.estadoParada || 'Pendiente')}</td>
                <td class="coords">${p.latitud && p.longitud ? Number(p.latitud).toFixed(5) + ', ' + Number(p.longitud).toFixed(5) : '—'}</td>
            </tr>`).join('');

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${nombre} · Ruta de trabajo</title>
<style>
  @page { margin: 14mm; }
  body { font-family: Segoe UI, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .sub { color: #64748b; margin-bottom: 18px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 16px; font-size: 13px; }
  .meta strong { display: inline-block; min-width: 90px; color: #334155; }
  .map { width: 100%; max-height: 360px; object-fit: contain; background:#f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin: 10px 0 8px; }
  .map-fallback { display:none; padding: 14px; border-radius: 12px; background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; margin: 10px 0; }
  .map-wrap { margin: 10px 0 18px; }
  .map-legend { display:grid; grid-template-columns: 1fr 1fr; gap:6px 16px; margin-top:10px; font-size:12px; color:#334155; }
  h2 { font-size: 15px; margin: 18px 0 8px; color:#0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 9px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; color: #475569; }
  .ord { width: 36px; font-weight: 800; color: #2563eb; }
  .coords { font-size: 11px; color: #64748b; white-space: nowrap; }
  .actions { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; }
  .btn { border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 700; cursor: pointer; }
  .btn-print { background: #2563eb; color: #fff; }
  .btn-maps { background: #10b981; color: #052e1c; text-decoration: none; display: inline-flex; align-items: center; }
  .foot { margin-top: 18px; font-size: 11px; color: #94a3b8; }
  @media print {
    .actions { display: none !important; }
    body { padding: 0; }
  }
</style>
</head>
<body>
  <h1>${nombre}</h1>
  <div class="sub">Ruta de trabajo · exportado ${escapeHtml(new Date().toLocaleString())}</div>
  <div class="meta">
    <div><strong>Estado</strong> ${estado}</div>
    <div><strong>Destino</strong> ${escapeHtml(state.tipoDestino || 'Clientes')}</div>
    <div><strong>Origen</strong> ${origen}</div>
    <div><strong>Paradas</strong> ${state.paradas.length}</div>
    <div><strong>Distancia</strong> ${dist}</div>
    <div><strong>Tiempo</strong> ${tiempo}</div>
  </div>

  <h2>Recorrido</h2>
  ${svgDiagram}
  ${mapImg ? `
    <h2>Mapa</h2>
    <img class="map" id="staticMapImg" src="${mapImg}" alt="Mapa del recorrido"
         onerror="this.style.display='none'; var f=document.getElementById('mapFail'); if(f) f.style.display='block';"/>
    <div class="map-fallback" id="mapFail">No se pudo cargar el mapa de Google (revisá que Static Maps esté habilitado en la API Key). El esquema de arriba tiene el recorrido.</div>
  ` : ''}

  <h2>Paradas</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Tipo</th><th>Parada</th><th>Estado</th><th>Coords</th></tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="actions">
    <button class="btn btn-print" onclick="window.print()">Guardar como PDF / Imprimir</button>
    ${mapsUrl ? `<a class="btn btn-maps" href="${mapsUrl}" target="_blank" rel="noopener">Abrir en Google Maps</a>` : ''}
  </div>
  <div class="foot">Sistema Gian · Recorridos</div>
  <script>
    (function(){
      var img = document.getElementById('staticMapImg');
      function go(){ setTimeout(function(){ window.print(); }, 250); }
      if (!img) { go(); return; }
      if (img.complete) go();
      else { img.onload = go; img.onerror = go; }
      setTimeout(go, 2500);
    })();
  <\/script>
</body>
</html>`;

        const w = window.open('', '_blank');
        if (!w) {
            toast('Permití popups para exportar el PDF');
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
        toast('PDF listo · el esquema muestra tu recorrido');
        cerrarMenuExport();
    }

    function cerrarMenuExport() {
        const m = $('#recExportMenu');
        if (m) m.hidden = true;
    }

    function toggleMenuExport() {
        const m = $('#recExportMenu');
        if (!m) return;
        m.hidden = !m.hidden;
    }

    async function cargarHistorial() {
        const res = await fetch('/Recorridos/Lista');
        const data = await res.json();
        const ul = $('#listaHistorial');
        ul.innerHTML = '';
        (data || []).forEach(r => {
            const id = r.id ?? r.Id;
            const estado = r.estado ?? r.Estado ?? '';
            const li = document.createElement('li');
            li.className = 'rec-hist-item' +
                (estado === 'EnCurso' ? ' is-en-curso' : '') +
                (estado === 'Borrador' ? ' is-borrador' : '') +
                (estado === 'Finalizado' ? ' is-finalizado' : '');
            li.innerHTML = `
                <div class="rec-hist-top">
                    <strong>${escapeHtml(r.nombre ?? r.Nombre)}</strong>
                    ${estado === 'EnCurso' ? '<span class="rec-hist-badge">EN CURSO</span>' : ''}
                </div>
                <small>${escapeHtml(labelEstado(estado))} · ${(r.cantidadParadas ?? r.CantidadParadas ?? 0)} paradas</small>
                <div class="row-actions">
                    <button type="button" class="rec-btn rec-btn-sm" data-load="${id}">Abrir</button>
                    ${estado === 'EnCurso' || estado === 'Borrador'
                        ? `<button type="button" class="rec-btn rec-btn-sm" data-fin="${id}">Finalizar</button>`
                        : ''}
                </div>`;
            li.querySelector('[data-load]').onclick = () => abrirRecorrido(id);
            const btnFin = li.querySelector('[data-fin]');
            if (btnFin) {
                btnFin.onclick = async () => {
                    await fetch('/Recorridos/Finalizar?id=' + id, { method: 'POST' });
                    await cargarHistorial();
                    if (window.RecorridoBanner) window.RecorridoBanner.refresh();
                };
            }
            ul.appendChild(li);
        });
    }

    async function abrirRecorrido(id) {
        const res = await fetch('/Recorridos/Obtener?id=' + id);
        if (!res.ok) return;
        const r = await res.json();
        state.recorridoId = r.id ?? r.Id;
        state.estado = r.estado ?? r.Estado;
        $('#txtRecId').value = state.recorridoId;
        $('#txtRecNombre').value = r.nombre ?? r.Nombre;
        state.distanciaMetros = r.distanciaMetros ?? r.DistanciaMetros;
        state.duracionSegundos = r.duracionSegundos ?? r.DuracionSegundos;

        const olat = r.origenLat ?? r.OrigenLat;
        const olng = r.origenLng ?? r.OrigenLng;
        if (olat != null && olng != null) {
            setOrigen(olat, olng, r.origenDireccion ?? r.OrigenDireccion);
        }

        state.paradas = (r.paradas || r.Paradas || []).map(p => ({
            id: p.id ?? p.Id,
            idCliente: p.idCliente ?? p.IdCliente,
            idProveedor: p.idProveedor ?? p.IdProveedor,
            tipoParada: p.tipoParada ?? p.TipoParada ?? 'Cliente',
            orden: p.orden ?? p.Orden,
            nombreCliente: p.nombreCliente ?? p.NombreCliente,
            direccion: p.direccion ?? p.Direccion,
            latitud: Number(p.latitud ?? p.Latitud),
            longitud: Number(p.longitud ?? p.Longitud),
            estadoParada: p.estadoParada ?? p.EstadoParada
        }));

        setTipoDestino(r.tipoDestino ?? r.TipoDestino ?? 'Clientes', { force: true, keepParadas: true });
        renderParadas();
        highlightRouteMarkers();
        updateStats();
        $$('.rec-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === 'editor'));
        $$('.rec-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-editor'));
        if (state.origen && state.paradas.length) dibujarRuta(false);
    }

    async function fetchEnCursoId() {
        try {
            const res = await fetch('/Recorridos/Pendiente');
            const p = await res.json();
            if (!(p.tienePendiente || p.TienePendiente)) return null;
            const estado = p.estado ?? p.Estado ?? '';
            if (estado !== 'EnCurso') return null;
            return p.id ?? p.Id ?? null;
        } catch {
            return null;
        }
    }

    async function nuevoRecorrido() {
        const enCursoId = await fetchEnCursoId();
        if (enCursoId || state.estado === 'EnCurso') {
            toast('Ya tenés un recorrido en curso. Solo puede haber uno a la vez.');
            if (enCursoId) await abrirRecorrido(enCursoId);
            const alertEl = $('#recPendingAlert');
            if (alertEl) alertEl.hidden = true;
            return;
        }

        state.recorridoId = 0;
        state.estado = 'Borrador';
        state.paradas = [];
        state.distanciaMetros = null;
        state.duracionSegundos = null;
        $('#txtRecId').value = '0';
        $('#txtRecNombre').value = '';
        if (state.directionsRenderer) state.directionsRenderer.set('directions', null);
        setTipoDestino('Clientes', { force: true, keepParadas: true, skipCargarPuntos: false });
        renderParadas();
        highlightRouteMarkers();
        updateStats();
        usarGps();
    }

    function wireUi() {
        $$('.rec-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                $$('.rec-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                $$('.rec-panel').forEach(p => p.classList.remove('active'));
                $('#panel-' + tab.dataset.panel)?.classList.add('active');
            });
        });

        $$('#recTipoDestino .rec-dest-btn').forEach(btn => {
            btn.addEventListener('click', () => setTipoDestino(btn.dataset.tipo));
        });

        $('#btnMiUbicacion')?.addEventListener('click', usarGps);
        $('#btnOptimizar')?.addEventListener('click', () => dibujarRuta(true));
        $('#btnGuardarRecorrido')?.addEventListener('click', () => guardarRecorrido(false));
        $('#btnIniciarRecorrido')?.addEventListener('click', iniciarRecorrido);
        $('#btnFinalizarRecorrido')?.addEventListener('click', finalizarRecorrido);
        $('#btnAbrirGoogleMaps')?.addEventListener('click', abrirEnGoogleMaps);
        $('#btnFabGoogleMaps')?.addEventListener('click', abrirEnGoogleMaps);
        $('#btnExportarMenu')?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenuExport();
        });
        $('#btnExportExcel')?.addEventListener('click', exportarExcel);
        $('#btnExportPdf')?.addEventListener('click', exportarPdf);
        document.addEventListener('click', (e) => {
            const wrap = document.querySelector('.rec-export-wrap');
            if (wrap && !wrap.contains(e.target)) cerrarMenuExport();
        });
        $('#btnNuevoRecorrido')?.addEventListener('click', nuevoRecorrido);
        $('#btnToggleSidebar')?.addEventListener('click', () => {
            $('.rec-sidebar')?.classList.toggle('collapsed');
        });
        $('#txtBuscarClienteMapa')?.addEventListener('input', (e) => {
            drawClientMarkers(e.target.value, { fit: false });
        });
    }

    function onMapsReady() {
        const el = $('#recorridoMap');
        if (!el) return;

        state.map = new google.maps.Map(el, {
            center: { lat: -34.6037, lng: -58.3816 },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            gestureHandling: 'greedy',
            styles: [
                { elementType: 'geometry', stylers: [{ color: '#1a2436' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#9db1d2' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3b55' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1726' }] },
                { featureType: 'poi', stylers: [{ visibility: 'off' }] }
            ]
        });

        state.directionsService = new google.maps.DirectionsService();
        state.directionsRenderer = new google.maps.DirectionsRenderer({
            map: state.map,
            suppressMarkers: true,
            suppressPolylines: true, // pintamos tramos verde/naranja a mano
            preserveViewport: false
        });
        state.geocoder = new google.maps.Geocoder();

        const origenInput = $('#txtOrigen');
        if (origenInput) {
            state.autocomplete = new google.maps.places.Autocomplete(origenInput, {
                fields: ['geometry', 'formatted_address'],
                componentRestrictions: { country: 'ar' }
            });
            state.autocomplete.addListener('place_changed', () => {
                const place = state.autocomplete.getPlace();
                if (!place.geometry) return;
                setOrigen(place.geometry.location.lat(), place.geometry.location.lng(), place.formatted_address);
            });
        }

        bootData();
    }

    async function bootData() {
        wireUi();
        renderParadas();
        await cargarPuntos();
        await cargarHistorial();
        usarGps();

        const params = new URLSearchParams(window.location.search);
        const abrirId = Number(params.get('abrir') || 0);
        if (abrirId > 0) {
            await abrirRecorrido(abrirId);
            const alertEl = $('#recPendingAlert');
            if (alertEl) alertEl.hidden = true;
            // limpiar query para no reabrir al refrescar
            try {
                const url = new URL(window.location.href);
                url.searchParams.delete('abrir');
                window.history.replaceState({}, '', url.pathname + url.search);
            } catch { /* ignore */ }
            toast('Recorrido en curso abierto');
            return;
        }

        await chequearPendienteAlEntrar();
    }

    async function chequearPendienteAlEntrar() {
        const alertEl = $('#recPendingAlert');
        if (!alertEl) return;

        try {
            const res = await fetch('/Recorridos/Pendiente');
            const p = await res.json();
            if (!(p.tienePendiente || p.TienePendiente)) {
                alertEl.hidden = true;
                return;
            }

            const id = p.id ?? p.Id;
            const nombre = p.nombre ?? p.Nombre ?? 'Recorrido';
            const estado = p.estado ?? p.Estado ?? '';
            const proxima = p.proximaParadaNombre ?? p.ProximaParadaNombre;
            const cant = p.cantidadParadas ?? p.CantidadParadas ?? 0;

            // Si hay uno en curso, abrirlo directo
            if (estado === 'EnCurso' && id) {
                await abrirRecorrido(id);
                alertEl.hidden = true;
                return;
            }

            $('#recPendingAlertTitle').textContent =
                estado === 'EnCurso'
                    ? 'Tenés un recorrido en curso'
                    : 'Tenés un recorrido pendiente';

            let sub = nombre;
            if (estado === 'EnCurso' && proxima) sub += ` · siguiente: ${proxima}`;
            else if (cant) sub += ` · ${cant} parada${cant === 1 ? '' : 's'}`;
            $('#recPendingAlertSub').textContent = sub;

            alertEl.hidden = false;
            alertEl.dataset.pendienteId = id || '';

            const btnAbrir = $('#btnAbrirPendiente');
            if (btnAbrir) {
                btnAbrir.onclick = async () => {
                    if (!id) return;
                    await abrirRecorrido(id);
                    alertEl.hidden = true;
                    toast(estado === 'EnCurso' ? 'Recorrido en curso abierto' : 'Recorrido pendiente abierto');
                };
            }

            const btnCerrar = $('#btnCerrarPendienteAlert');
            if (btnCerrar) {
                btnCerrar.onclick = () => { alertEl.hidden = true; };
            }
        } catch {
            alertEl.hidden = true;
        }
    }

    function bootWithoutMaps() {
        wireUi();
        renderParadas();
        cargarHistorial();
        chequearPendienteAlEntrar();
    }

    window.RecorridosApp = { onMapsReady, bootWithoutMaps };
})();
