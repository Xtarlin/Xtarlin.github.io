// -------------------- UTILIDAD BÁSICA -------------------------
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector, parent)];

// -------------------- VALIDACIÓN Y FEEDBACK -------------------
function setError(input, message) {
    input.setAttribute('aria-invalid', 'true');
    const group = input.closest('.form-group');
    group?.classList.add('error');
    const errorDiv = group?.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.setAttribute('aria-live', 'polite');
    }
}

function clearError(input) {
    input.removeAttribute('aria-invalid');
    const group = input.closest('.form-group');
    group?.classList.remove('error');
    const errorDiv = group?.querySelector('.error-message');
    if (errorDiv) errorDiv.textContent = '';
}

function validateInput(input) {
    const type = input.dataset.validationType || input.type;
    const value = input.value.trim();
    const required = input.required || input.getAttribute('aria-required') === 'true';
    const optional = input.dataset.optional === 'true';

    if (!required && optional && !value) {
        clearError(input);
        return true;
    }

    // Basic checks
    if (required && !value) {
        setError(input, 'Este campo es obligatorio.');
        return false;
    }
    if (type === 'email' && value && !/^[^@]+@[^@]+\.[a-zA-Z]{2,}$/.test(value)) {
        setError(input, 'Ingrese un correo válido.');
        return false;
    }
    if (type === 'phone' && value && !/^[\d\s+\-()]{6,}$/.test(value)) {
        setError(input, 'Ingrese un teléfono válido.');
        return false;
    }
    if (type === 'date' && value && isNaN(Date.parse(value))) {
        setError(input, 'Ingrese una fecha válida.');
        return false;
    }
    if (type === 'number' && value && isNaN(Number(value))) {
        setError(input, 'Ingrese un número válido.');
        return false;
    }
    if (type === 'passport' && value && !/^[a-zA-Z0-9]{4,}$/.test(value)) {
        setError(input, 'Ingrese un número de pasaporte válido.');
        return false;
    }
    if (type === 'zipcode' && value && !/^[a-zA-Z0-9\s\-]{3,10}$/.test(value)) {
        setError(input, 'Ingrese un código postal válido.');
        return false;
    }
    // Add more specific validators here as needed

    clearError(input);
    return true;
}

function validateForm(form) {
    let valid = true;
    $$('.form-group input, .form-group select, .form-group textarea', form).forEach(input => {
        if (!validateInput(input)) valid = false;
    });
    return valid;
}

function setupLiveValidation(form) {
    $$('.form-group input, .form-group select, .form-group textarea', form).forEach(input => {
        input.addEventListener('input', () => validateInput(input));
        input.addEventListener('blur', () => validateInput(input));
    });
}

// -------------------- DINÁMICOS Y CONDICIONALES -------------------
function setupConditionalSections(form) {
    $$('input[type="radio"][aria-controls]', form).forEach(radio => {
        radio.addEventListener('change', e => {
            const controls = radio.getAttribute('aria-controls');
            if (!controls) return;
            const section = document.getElementById(controls);
            if (radio.checked && radio.value === "Si") {
                section?.classList.add('active');
            } else if (radio.checked && radio.value === "No") {
                section?.classList.remove('active');
            }
        });
        // Inicialización
        if (radio.checked && radio.value === "Si") {
            const controls = radio.getAttribute('aria-controls');
            document.getElementById(controls)?.classList.add('active');
        }
    });
}

// Helpers para campos dinámicos (añadir/eliminar)
function addDynamicField(containerId, htmlTemplate) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.classList.add('form-group');
    div.innerHTML = htmlTemplate;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Eliminar';
    removeBtn.setAttribute('aria-label', 'Eliminar este campo');
    removeBtn.onclick = () => div.remove();
    div.appendChild(removeBtn);
    container.appendChild(div);
}

function setupAllDynamicButtons() {
    // Ejemplo para compañeros de viaje
    $('#addTravelCompanionBtn')?.addEventListener('click', () => {
        addDynamicField('travelCompanionsContainer',
            `<label>Nombre completo del compañero:</label>
             <input type="text" name="usa.travelInfo.travelCompanions[]" data-validation-type="text" required aria-required="true">
             <label>Relación:</label>
             <input type="text" name="usa.travelInfo.travelCompanionsRelation[]" data-validation-type="text" required aria-required="true">`
        );
    });

    $('#addOtherNameBtn')?.addEventListener('click', () => {
        addDynamicField('otherNamesContainer',
            `<label>Otro nombre usado:</label>
             <input type="text" name="usa.personalInfo.otherNamesUsedList[]" data-validation-type="text" required aria-required="true">`
        );
    });

    $('#addPreviousUsTravelBtn')?.addEventListener('click', () => {
        addDynamicField('previousUsTravelContainer',
            `<label>Fecha de viaje:</label>
             <input type="date" name="usa.travelInfo.previousUsTravelDate[]" data-validation-type="date" required aria-required="true">
             <label>Duración:</label>
             <input type="text" name="usa.travelInfo.previousUsTravelDuration[]" data-validation-type="text" required aria-required="true">
             <label>Motivo:</label>
             <input type="text" name="usa.travelInfo.previousUsTravelReason[]" data-validation-type="text" required aria-required="true">`
        );
    });

    $('#addChildBtn')?.addEventListener('click', () => {
        addDynamicField('childrenContainer',
            `<label>Nombre del hijo/a:</label>
             <input type="text" name="usa.familyInfo.childrenName[]" data-validation-type="text" required aria-required="true">
             <label>Fecha de nacimiento:</label>
             <input type="date" name="usa.familyInfo.childrenDob[]" data-validation-type="date" required aria-required="true">`
        );
    });

    $('#addUsFamilyBtn')?.addEventListener('click', () => {
        addDynamicField('usFamilyContainer',
            `<label>Nombre del familiar en EE. UU.:</label>
             <input type="text" name="usa.familyInfo.usFamilyName[]" data-validation-type="text" required aria-required="true">
             <label>Relación:</label>
             <input type="text" name="usa.familyInfo.usFamilyRelation[]" data-validation-type="text" required aria-required="true">`
        );
    });

    $('#addPreviousEmployerBtn')?.addEventListener('click', () => {
        addDynamicField('previousEmploymentContainer',
            `<label>Nombre del empleador anterior:</label>
             <input type="text" name="usa.workEduInfo.previousEmployerName[]" data-validation-type="text" required aria-required="true">
             <label>Puesto:</label>
             <input type="text" name="usa.workEduInfo.previousEmployerPosition[]" data-validation-type="text" required aria-required="true">
             <label>Fecha de inicio:</label>
             <input type="date" name="usa.workEduInfo.previousEmployerStart[]" data-validation-type="date" required aria-required="true">
             <label>Fecha de fin:</label>
             <input type="date" name="usa.workEduInfo.previousEmployerEnd[]" data-validation-type="date" required aria-required="true">`
        );
    });

    $('#addEducationBtn')?.addEventListener('click', () => {
        addDynamicField('educationContainer',
            `<label>Institución:</label>
             <input type="text" name="usa.workEduInfo.educationInstitution[]" data-validation-type="text" required aria-required="true">
             <label>Nivel:</label>
             <input type="text" name="usa.workEduInfo.educationLevel[]" data-validation-type="text" required aria-required="true">
             <label>Campo de estudio:</label>
             <input type="text" name="usa.workEduInfo.educationField[]" data-validation-type="text" required aria-required="true">
             <label>Año de finalización:</label>
             <input type="number" name="usa.workEduInfo.educationYear[]" data-validation-type="number" required aria-required="true">`
        );
    });

    $('#addCountryVisitedBtn')?.addEventListener('click', () => {
        addDynamicField('countriesVisitedContainer',
            `<label>País visitado:</label>
             <input type="text" name="usa.workEduInfo.countriesVisitedName[]" data-validation-type="text" required aria-required="true">
             <label>Fecha:</label>
             <input type="date" name="usa.workEduInfo.countriesVisitedDate[]" data-validation-type="date" required aria-required="true">`
        );
    });
}

// -------------------- MODALES Y ACCIÓN PRINCIPAL -------------------
function openModal(id, title, message) {
    const modal = $(id);
    if (!modal) return;
    $('#modalTitle', modal).textContent = title || '';
    $('#modalMessage', modal).textContent = message || '';
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    modal.focus();
}

function closeModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

// Cerrar modales por botón o tecla ESC
function setupModalEvents() {
    $$('.close-button').forEach(btn => {
        btn.addEventListener('click', e => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    $$('.modal-btn, #modalCloseBtn').forEach(btn => {
        btn.addEventListener('click', e => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    window.addEventListener('keydown', e => {
        if (e.key === "Escape") {
            $$('.modal.active').forEach(modal => modal.classList.remove('active'));
        }
    });
}

// -------------------- GUARDADO Y RESTAURACIÓN -------------------
function saveFormProgress(form) {
    const data = new FormData(form);
    const obj = {};
    for (let [k, v] of data.entries()) {
        if (obj[k]) {
            if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
            obj[k].push(v);
        } else {
            obj[k] = v;
        }
    }
    localStorage.setItem('visaFormProgress', JSON.stringify(obj));
    openModal('#customModal', 'Progreso guardado', 'Su progreso ha sido guardado localmente.');
}

function restoreFormProgress(form) {
    const str = localStorage.getItem('visaFormProgress');
    if (!str) return;
    const obj = JSON.parse(str);
    for (const key in obj) {
        const el = form.elements[key];
        if (!el) continue;
        if (Array.isArray(obj[key])) {
            // Para campos dinámicos, sería necesario regenerar los campos y poner los valores. (Extendible)
        } else {
            el.value = obj[key];
            validateInput(el);
        }
    }
}

// -------------------- REVISIÓN Y RESUMEN -------------------
function showSummaryModal(form) {
    const summaryDiv = $('#summaryContent');
    summaryDiv.innerHTML = '';
    // Recorre el formulario y muestra los valores legibles
    const entries = new FormData(form).entries();
    for (const [key, value] of entries) {
        if (value && value !== '') {
            const row = document.createElement('div');
            row.innerHTML = `<strong>${key}:</strong> ${value}`;
            summaryDiv.appendChild(row);
        }
    }
    $('#summaryModal').classList.add('active');
    $('#summaryModal').setAttribute('aria-hidden', 'false');
    $('#summaryModal').focus();
}

// -------------------- INICIALIZACIÓN -------------------
document.addEventListener('DOMContentLoaded', () => {
    const form = $('#mainForm');
    setupLiveValidation(form);
    setupConditionalSections(form);
    setupAllDynamicButtons();
    setupModalEvents();

    // Guardar progreso
    $('#saveProgressBtn')?.addEventListener('click', () => saveFormProgress(form));
    // Revisar y enviar (mostrar resumen)
    $('#reviewAndSubmitBtn')?.addEventListener('click', (e) => {
        if (!validateForm(form)) {
            openModal('#customModal', 'Error', 'Por favor corrija los campos marcados antes de continuar.');
            return;
        }
        showSummaryModal(form);
    });

    // Cerrar resumen y volver a editar
    $('#editFormBtn')?.addEventListener('click', () => closeModal('#summaryModal'));
    // Confirmar y "descargar"
    $('#confirmAndDownloadBtn')?.addEventListener('click', () => {
        // Aquí puedes agregar la lógica para descargar como PDF o JSON
        openModal('#customModal', 'Listo', 'Su información ha sido procesada.');
        closeModal('#summaryModal');
    });

    // Restaurar progreso al cargar
    restoreFormProgress(form);
});
// ... (todo el bloque anterior, sin cambios) ...

// === EXPORTAR DATOS COMO JSON O PDF ===
function downloadAsJSON(form) {
    const data = new FormData(form);
    const obj = {};
    for (let [k, v] of data.entries()) {
        if (obj[k]) {
            if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
            obj[k].push(v);
        } else {
            obj[k] = v;
        }
    }
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'solicitud-visa.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function downloadAsPDF(form) {
    // Requiere jsPDF y html2canvas (añade los scripts en tu HTML si no los tienes)
    if (typeof html2canvas === "undefined" || typeof jsPDF === "undefined") {
        openModal('#customModal', 'Error', 'No se encontró jsPDF o html2canvas. No se puede generar el PDF.');
        return;
    }
    const summaryDiv = $('#summaryContent');
    html2canvas(summaryDiv).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 40;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
        pdf.save('resumen-solicitud.pdf');
    });
}

// === AUTOSAVE EN TIEMPO REAL ===
function startAutoSave(form) {
    let timeout;
    form.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => saveFormProgress(form), 1200);
    });
}

// === RESTAURAR CAMPOS DINÁMICOS ===
function restoreDynamicFields(form, obj) {
    const dynamicMap = {
        'usa.travelInfo.travelCompanions[]': {btn: '#addTravelCompanionBtn', container: 'travelCompanionsContainer', fields: 2},
        'usa.familyInfo.childrenName[]': {btn: '#addChildBtn', container: 'childrenContainer', fields: 2},
        'usa.familyInfo.usFamilyName[]': {btn: '#addUsFamilyBtn', container: 'usFamilyContainer', fields: 2},
        'usa.workEduInfo.previousEmployerName[]': {btn: '#addPreviousEmployerBtn', container: 'previousEmploymentContainer', fields: 4},
        'usa.workEduInfo.educationInstitution[]': {btn: '#addEducationBtn', container: 'educationContainer', fields: 4},
        'usa.workEduInfo.countriesVisitedName[]': {btn: '#addCountryVisitedBtn', container: 'countriesVisitedContainer', fields: 2},
        'usa.travelInfo.previousUsTravelDate[]': {btn: '#addPreviousUsTravelBtn', container: 'previousUsTravelContainer', fields: 3},
        'usa.personalInfo.otherNamesUsedList[]': {btn: '#addOtherNameBtn', container: 'otherNamesContainer', fields: 1}
    };
    for (const key in dynamicMap) {
        if (!obj[key]) continue;
        const info = dynamicMap[key];
        const values = Array.isArray(obj[key]) ? obj[key] : [obj[key]];
        for (let i = 0; i < values.length; ++i) {
            $(info.btn)?.click();
        }
        // Rellena los campos añadidos
        const container = document.getElementById(info.container);
        if (container) {
            const inputs = $$('input, select, textarea', container);
            let idx = 0;
            for (let i = 0; i < values.length; ++i) {
                for (let j = 0; j < info.fields; ++j) {
                    if (inputs[idx]) {
                        inputs[idx].value = obj[Object.keys(obj)[Object.keys(obj).indexOf(key)+j]]?.[i] || '';
                        validateInput(inputs[idx]);
                    }
                    idx++;
                }
            }
        }
    }
}

// === MEJORAS EN RESUMEN Y MODAL ===
function showSummaryModal(form) {
    const summaryDiv = $('#summaryContent');
    summaryDiv.innerHTML = '';
    const data = new FormData(form);
    for (const [key, value] of data.entries()) {
        if (value && value !== '') {
            const label = key.replace(/\.\w+\./g, ' ').replace(/\[\]$/, '').replace(/([A-Z])/g, ' $1').replace(/\./g, ' ').replace(/ +/g, ' ').trim();
            const row = document.createElement('div');
            row.innerHTML = `<strong>${label}:</strong> <span>${value}</span>`;
            summaryDiv.appendChild(row);
        }
    }
    $('#summaryModal').classList.add('active');
    $('#summaryModal').setAttribute('aria-hidden', 'false');
    $('#summaryModal').focus();
}

// === ACCESIBILIDAD EXTRA EN MODALES ===
function focusTrap(modal) {
    const focusables = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modal)
        .filter(el => !el.disabled && el.offsetParent !== null);
    if (focusables.length === 0) return;
    let first = focusables[0], last = focusables[focusables.length - 1];
    modal.addEventListener('keydown', function(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault(); last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
        }
    });
    setTimeout(() => first.focus(), 50);
}

// === INICIALIZACIÓN FINAL ===
document.addEventListener('DOMContentLoaded', () => {
    const form = $('#mainForm');
    setupLiveValidation(form);
    setupConditionalSections(form);
    setupAllDynamicButtons();
    setupModalEvents();
    startAutoSave(form);

    // Guardar progreso
    $('#saveProgressBtn')?.addEventListener('click', () => saveFormProgress(form));
    // Revisar y enviar (mostrar resumen)
    $('#reviewAndSubmitBtn')?.addEventListener('click', (e) => {
        if (!validateForm(form)) {
            openModal('#customModal', 'Error', 'Por favor corrija los campos marcados antes de continuar.');
            return;
        }
        showSummaryModal(form);
        focusTrap($('#summaryModal'));
    });

    // Cerrar resumen y volver a editar
    $('#editFormBtn')?.addEventListener('click', () => closeModal('#summaryModal'));

    // Confirmar y Descargar (elige formato)
    $('#confirmAndDownloadBtn')?.addEventListener('click', () => {
        // Opción: descargar como PDF o JSON
        openModal('#customModal', 'Descargar', '¿Cómo desea descargar? <br><button id="dlPDF" class="modal-btn primary-btn">PDF</button> <button id="dlJSON" class="modal-btn">JSON</button>');
        $('#dlPDF')?.addEventListener('click', () => { downloadAsPDF(form); closeModal('#customModal'); closeModal('#summaryModal'); });
        $('#dlJSON')?.addEventListener('click', () => { downloadAsJSON(form); closeModal('#customModal'); closeModal('#summaryModal'); });
    });

    // Restaurar progreso al cargar
    const str = localStorage.getItem('visaFormProgress');
    if (str) {
        const obj = JSON.parse(str);
        restoreFormProgress(form);
        restoreDynamicFields(form, obj);
    }
});
