let clienteMap = null;
let clienteMarker = null;
let clienteAutocomplete = null;
let clienteGeocoder = null;
let clienteMapReady = false;
const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 };

window.initClienteMap = function () {
    clienteMapReady = true;
    const el = document.getElementById('clienteMap');
    if (!el) return;

    clienteMap = new google.maps.Map(el, {
        center: DEFAULT_CENTER,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
        styles: [
            { elementType: 'geometry', stylers: [{ color: '#1d2a3f' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2a3f' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#9db1d2' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3b55' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a2b' }] },
            { featureType: 'poi', stylers: [{ visibility: 'off' }] }
        ]
    });

    clienteGeocoder = new google.maps.Geocoder();
    clienteMarker = new google.maps.Marker({
        map: clienteMap,
        draggable: true,
        animation: google.maps.Animation.DROP
    });
    clienteMarker.setVisible(false);

    clienteMap.addListener('click', (e) => {
        setClientePos(e.latLng.lat(), e.latLng.lng(), true);
    });

    clienteMarker.addListener('dragend', (e) => {
        setClientePos(e.latLng.lat(), e.latLng.lng(), true);
    });

    const input = document.getElementById('txtBuscarMaps');
    if (input) {
        clienteAutocomplete = new google.maps.places.Autocomplete(input, {
            fields: ['place_id', 'geometry', 'formatted_address', 'address_components', 'name'],
            componentRestrictions: { country: 'ar' }
        });
        clienteAutocomplete.bindTo('bounds', clienteMap);
        clienteAutocomplete.addListener('place_changed', () => {
            const place = clienteAutocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setClientePos(lat, lng, false, place);
            clienteMap.fitBounds(place.geometry.viewport || new google.maps.LatLngBounds(
                place.geometry.location, place.geometry.location
            ));
            if (!place.geometry.viewport) clienteMap.setZoom(16);
        });
    }

    document.getElementById('btnMiUbicacionCliente')?.addEventListener('click', usarMiUbicacionCliente);
    document.getElementById('btnLimpiarUbicacion')?.addEventListener('click', limpiarUbicacionCliente);

    $('#modalEdicion').on('shown.bs.modal', () => {
        if (!clienteMap) return;
        google.maps.event.trigger(clienteMap, 'resize');
        syncClienteMapFromInputs();
    });
};

function setClientePos(lat, lng, reverseGeocode, place) {
    if (!clienteMap || !clienteMarker) return;

    const pos = { lat: Number(lat), lng: Number(lng) };
    clienteMarker.setPosition(pos);
    clienteMarker.setVisible(true);
    clienteMap.panTo(pos);

    $('#txtLatitud').val(pos.lat.toFixed(7));
    $('#txtLongitud').val(pos.lng.toFixed(7));

    if (place) {
        $('#txtPlaceId').val(place.place_id || '');
        const addr = place.formatted_address || place.name || '';
        $('#txtDireccionMaps').val(addr);
        if (addr && !$('#txtDireccion').val()) $('#txtDireccion').val(addr);
        if (addr && $('#txtUbicacion').length) $('#txtUbicacion').val(addr);
        aplicarComponentesDireccion(place.address_components);
        actualizarCoordsUI(pos.lat, pos.lng, addr);
        $('#cliMapHint').text(addr || 'Ubicación seleccionada');
        return;
    }

    if (reverseGeocode && clienteGeocoder) {
        clienteGeocoder.geocode({ location: pos }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                const r = results[0];
                $('#txtPlaceId').val(r.place_id || '');
                $('#txtDireccionMaps').val(r.formatted_address || '');
                if (!$('#txtDireccion').val()) $('#txtDireccion').val(r.formatted_address || '');
                if ($('#txtUbicacion').length) $('#txtUbicacion').val(r.formatted_address || '');
                aplicarComponentesDireccion(r.address_components);
                actualizarCoordsUI(pos.lat, pos.lng, r.formatted_address);
                $('#cliMapHint').text(r.formatted_address || 'Ubicación seleccionada');
            } else {
                actualizarCoordsUI(pos.lat, pos.lng, null);
            }
        });
    } else {
        actualizarCoordsUI(pos.lat, pos.lng, $('#txtDireccionMaps').val());
    }
}

function aplicarComponentesDireccion(components) {
    if (!components) return;
    const get = (type) => {
        const c = components.find(x => x.types.includes(type));
        return c ? c.long_name : '';
    };
    const localidad = get('locality') || get('administrative_area_level_2') || get('sublocality');
    if (localidad && !$('#txtLocalidad').val()) $('#txtLocalidad').val(localidad);

    const provinciaNombre = get('administrative_area_level_1');
    if (provinciaNombre) {
        const select = document.getElementById('Provincias');
        if (select) {
            const opt = [...select.options].find(o =>
                o.text.toLowerCase().includes(provinciaNombre.toLowerCase()) ||
                provinciaNombre.toLowerCase().includes(o.text.toLowerCase())
            );
            if (opt) select.value = opt.value;
        }
    }
}

function actualizarCoordsUI(lat, lng, address) {
    const el = document.getElementById('cliMapCoords');
    if (!el) return;
    el.classList.add('is-set');
    el.innerHTML = `<span><i class="fa fa-check-circle"></i> ${lat.toFixed(5)}, ${lng.toFixed(5)}</span>` +
        (address ? `<div class="mt-1" style="opacity:.85">${address}</div>` : '');
}

function limpiarUbicacionCliente() {
    $('#txtLatitud, #txtLongitud, #txtPlaceId, #txtDireccionMaps, #txtBuscarMaps').val('');
    if (clienteMarker) clienteMarker.setVisible(false);
    const el = document.getElementById('cliMapCoords');
    if (el) {
        el.classList.remove('is-set');
        el.innerHTML = '<span><i class="fa fa-crosshairs"></i> Sin ubicación</span>';
    }
    $('#cliMapHint').text('Tocá el mapa o buscá una dirección para ubicar');
}

function usarMiUbicacionCliente() {
    if (!navigator.geolocation) {
        if (typeof errorModal === 'function') errorModal('Tu navegador no permite geolocalización');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setClientePos(pos.coords.latitude, pos.coords.longitude, true);
            if (clienteMap) clienteMap.setZoom(16);
        },
        () => {
            if (typeof errorModal === 'function') errorModal('No se pudo obtener tu ubicación');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function syncClienteMapFromInputs() {
    const lat = parseFloat($('#txtLatitud').val());
    const lng = parseFloat($('#txtLongitud').val());
    if (!isNaN(lat) && !isNaN(lng) && clienteMap && clienteMarker) {
        setClientePos(lat, lng, false);
        clienteMap.setZoom(16);
        const addr = $('#txtDireccionMaps').val();
        if (addr) actualizarCoordsUI(lat, lng, addr);
        return;
    }

    // Sin coords: sacar marcador del registro anterior
    if (clienteMarker) {
        clienteMarker.setVisible(false);
        try { clienteMarker.setPosition(DEFAULT_CENTER); } catch { /* ignore */ }
    }
    if (clienteMap) {
        clienteMap.setCenter(DEFAULT_CENTER);
        clienteMap.setZoom(12);
    }
    const el = document.getElementById('cliMapCoords');
    if (el) {
        el.classList.remove('is-set');
        el.innerHTML = '<span><i class="fa fa-crosshairs"></i> Sin ubicación</span>';
    }
    const hint = document.getElementById('cliMapHint');
    if (hint) hint.textContent = 'Tocá el mapa o buscá una dirección para ubicar';
}

function cargarUbicacionEnModal(modelo) {
    const lat = modelo?.Latitud ?? modelo?.latitud;
    const lng = modelo?.Longitud ?? modelo?.longitud;
    const hasCoords = lat != null && lng != null
        && String(lat).trim() !== '' && String(lng).trim() !== ''
        && !isNaN(Number(lat)) && !isNaN(Number(lng));

    if (!hasCoords) {
        // Limpia pin/inputs del anterior antes de pintar este (sin ubicación)
        limpiarUbicacionCliente();
        $('#txtBuscarMaps').val('');
    } else {
        $('#txtLatitud').val(lat);
        $('#txtLongitud').val(lng);
        $('#txtPlaceId').val(modelo.PlaceId ?? modelo.placeId ?? '');
        $('#txtDireccionMaps').val(modelo.DireccionMaps ?? modelo.direccionMaps ?? '');
        $('#txtBuscarMaps').val(modelo.DireccionMaps ?? modelo.direccionMaps ?? modelo.Direccion ?? modelo.Ubicacion ?? '');
    }

    if (clienteMapReady) {
        setTimeout(() => {
            if (!clienteMap) return;
            google.maps.event.trigger(clienteMap, 'resize');
            syncClienteMapFromInputs();
        }, 250);
    }
}

window.cargarUbicacionEnModal = cargarUbicacionEnModal;
window.limpiarUbicacionCliente = limpiarUbicacionCliente;
window.obtenerDatosUbicacionCliente = function () {
    const lat = parseFloat($('#txtLatitud').val());
    const lng = parseFloat($('#txtLongitud').val());
    return {
        Latitud: !isNaN(lat) ? lat : null,
        Longitud: !isNaN(lng) ? lng : null,
        PlaceId: $('#txtPlaceId').val() || null,
        DireccionMaps: $('#txtDireccionMaps').val() || null
    };
};
