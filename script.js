document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('visaApplicationForm');
    const usaFormSections = document.getElementById('usaFormSections');
    const canadaFormSections = document.getElementById('canadaFormSections');
    const visaTypeRadios = document.querySelectorAll('input[name="visaType"]');
    const countrySelectionError = document.getElementById('countrySelectionError');
    const saveProgressBtn = document.getElementById('saveProgressBtn');
    const reviewAndSubmitBtn = document.getElementById('reviewAndSubmitBtn'); // Cambiado de submit-btn

    // Modal de Mensajes Generales
    const customModal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const closeButtonSpan = customModal.querySelector('.close-button'); // Específico para customModal

    // Modal de Resumen
    const summaryModal = document.getElementById('summaryModal');
    const summaryContent = document.getElementById('summaryContent');
    const summaryCloseButton = document.getElementById('summaryCloseButton'); // Específico para summaryModal
    const editFormBtn = document.getElementById('editFormBtn');
    const confirmAndDownloadBtn = document.getElementById('confirmAndDownloadBtn');

    // Barra de Progreso
    const progressBarContainer = document.querySelector('.progress-bar-container');
    const progressBarFill = document.querySelector('.progress-bar-fill');
    const progressBarText = document.querySelector('.progress-bar-text');

    // --- Verificación de Elementos Críticos (para depuración) ---
    if (!usaFormSections) {
        console.error("Error: Elemento con ID 'usaFormSections' no encontrado en el HTML. Asegúrate de que el ID sea correcto.");
    }
    if (!canadaFormSections) {
        console.error("Error: Elemento con ID 'canadaFormSections' no encontrado en el HTML. Asegúrate de que el ID sea correcto.");
    }
    if (!form) {
        console.error("Error: Elemento con ID 'visaApplicationForm' no encontrado en el HTML. El formulario principal es crucial.");
        return; // Detener la ejecución si el formulario principal no se encuentra.
    }
    console.log("Elementos principales del formulario encontrados.");


    // --- Funciones de Utilidad para Modales ---

    // Muestra el modal general
    function showModal(title, message, isConfirmation = false, onConfirm = null) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        // Limpiar botones de confirmación previos
        const existingConfirmBtn = document.getElementById('modalConfirmBtn');
        if (existingConfirmBtn) existingConfirmBtn.remove();

        if (isConfirmation) {
            const confirmBtn = document.createElement('button');
            confirmBtn.id = 'modalConfirmBtn';
            confirmBtn.classList.add('modal-btn', 'primary-btn'); // Añadir clase para estilo primario
            confirmBtn.textContent = 'Sí, Cargar';
            confirmBtn.addEventListener('click', () => {
                hideModal(customModal);
                if (onConfirm) onConfirm();
            }, { once: true }); // Asegura que el evento se dispare solo una vez
            modalCloseBtn.textContent = 'No, Empezar de Nuevo'; // Cambiar texto del botón existente
            modalCloseBtn.parentNode.insertBefore(confirmBtn, modalCloseBtn); // Insertar antes del botón de cerrar
        } else {
            modalCloseBtn.textContent = 'Cerrar'; // Restablecer texto para alertas regulares
        }

        customModal.classList.add('show'); // Usar clase para mostrar con transición
    }

    // Oculta un modal específico
    function hideModal(modalElement) {
        modalElement.classList.remove('show');
    }

    // Event listeners para cerrar modales
    modalCloseBtn.addEventListener('click', () => hideModal(customModal));
    closeButtonSpan.addEventListener('click', () => hideModal(customModal));
    summaryCloseButton.addEventListener('click', () => hideModal(summaryModal));
    editFormBtn.addEventListener('click', () => hideModal(summaryModal)); // Volver al formulario

    // Cierra el modal si se hace clic fuera de él
    window.addEventListener('click', (event) => {
        if (event.target === customModal) {
            hideModal(customModal);
        }
        if (event.target === summaryModal) {
            hideModal(summaryModal);
        }
    });

    // --- Funciones para Manipulación de Datos ---

    // Establece un valor anidado en un objeto usando una ruta de cadena
    function setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            const arrayMatch = part.match(/\[(\d+)\]$/);

            if (arrayMatch) {
                const arrayName = part.substring(0, arrayMatch.index);
                const index = parseInt(arrayMatch[1], 10);

                if (!current[arrayName]) {
                    current[arrayName] = [];
                }
                if (i === parts.length - 1) {
                    current[arrayName][index] = value;
                } else {
                    if (!current[arrayName][index]) {
                        current[arrayName][index] = {};
                    }
                    current = current[arrayName][index];
                }
            } else {
                if (i === parts.length - 1) {
                    current[part] = value;
                } else {
                    if (!current[part]) {
                        current[part] = {};
                    }
                    current = current[part];
                }
            }
        }
    }

    // Obtiene un valor anidado de un objeto usando una ruta de cadena
    function getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            const arrayMatch = part.match(/\[(\d+)\]$/);

            if (arrayMatch) {
                const arrayName = part.substring(0, arrayMatch.index);
                const index = parseInt(arrayMatch[1], 10);
                if (!current || !Array.isArray(current[arrayName]) || !current[arrayName][index]) {
                    return undefined;
                }
                current = current[arrayName][index];
            } else {
                if (!current || typeof current !== 'object' || !current.hasOwnProperty(part)) {
                    return undefined;
                }
                current = current[part];
            }
        }
        return current;
    }

    // --- Funciones de Validación en Tiempo Real ---

    const validationRules = {
        email: (value) => {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(String(value).toLowerCase()) ? '' : 'Formato de correo electrónico inválido.';
        },
        phone: (value) => {
            // Permite dígitos, espacios, guiones, paréntesis y un signo de más al inicio
            const re = /^\+?[\d\s\-\(\)]{7,20}$/;
            return re.test(String(value)) ? '' : 'Formato de teléfono inválido (ej: +1-809-123-4567).';
        },
        date: (value) => {
            if (!value) return 'Este campo de fecha es requerido.';
            const date = new Date(value);
            return isNaN(date.getTime()) ? 'Fecha inválida.' : '';
        },
        text: (value) => {
            return value.trim() === '' ? 'Este campo es requerido.' : '';
        },
        number: (value) => {
            // Si el campo es opcional y está vacío, es válido. Si tiene valor, debe ser número.
            if (value.trim() === '') return '';
            return isNaN(parseFloat(value)) ? 'Debe ser un número válido.' : '';
        },
        passport: (value) => {
            // Ejemplo básico: alfanumérico, 6-20 caracteres
            const re = /^[a-zA-Z0-9]{6,20}$/;
            return re.test(String(value)) ? '' : 'Formato de pasaporte inválido (6-20 caracteres alfanuméricos).';
        },
        zipcode: (value) => {
            // Ejemplo básico: 5 dígitos o 5 dígitos-4 dígitos
            const re = /^\d{5}(?:[-\s]\d{4})?$/;
            return re.test(String(value)) ? '' : 'Formato de código postal inválido (ej: 12345 o 12345-6789).';
        }
    };

    function validateInput(inputElement) {
        const validationType = inputElement.dataset.validationType;
        const errorMessageElement = inputElement.nextElementSibling; // Asume que el div.error-message es el siguiente hermano

        if (!errorMessageElement || !validationType) {
            return true; // No hay tipo de validación o elemento de mensaje de error, se considera válido
        }

        let errorMessage = '';
        // Si el campo es opcional y está vacío, es válido.
        if (inputElement.hasAttribute('data-optional') && inputElement.value.trim() === '') {
            errorMessage = '';
        } else if (inputElement.hasAttribute('required') && inputElement.value.trim() === '') {
            errorMessage = 'Este campo es requerido.';
        } else if (validationRules[validationType]) {
            errorMessage = validationRules[validationType](inputElement.value);
        }

        if (errorMessage) {
            inputElement.classList.add('invalid');
            errorMessageElement.textContent = errorMessage;
            errorMessageElement.style.display = 'block';
            return false;
        } else {
            inputElement.classList.remove('invalid');
            errorMessageElement.textContent = '';
            errorMessageElement.style.display = 'none';
            return true;
        }
    }

    // Adjuntar validación a todos los campos con data-validation-type
    form.querySelectorAll('[data-validation-type]').forEach(input => {
        input.addEventListener('blur', () => validateInput(input)); // Valida al perder el foco
        input.addEventListener('input', () => { // Limpia el error al empezar a escribir
            if (input.classList.contains('invalid')) {
                validateInput(input); // Re-valida para actualizar el mensaje si es necesario
            }
            updateProgressBar(); // Actualiza la barra de progreso
        });
    });

    // --- Lógica de Mostrar/Ocultar Secciones Condicionales ---

    // Configura la visibilidad de un div basada en la selección de un radio button
    function setupConditionalDisplay(radioName, targetDivId, requiredInputSelectors = ['input', 'select', 'textarea']) {
        const radios = document.querySelectorAll(`input[name="${radioName}"]`);
        const targetDiv = document.getElementById(targetDivId);

        if (!targetDiv) {
            console.warn(`Target div con ID '${targetDivId}' no encontrado para el grupo de radio '${radioName}'.`);
            return;
        }

        const targetInputs = requiredInputSelectors.map(selector => Array.from(targetDiv.querySelectorAll(selector))).flat();

        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                const isYes = document.querySelector(`input[name="${radioName}"][value="Si"]`)?.checked;
                console.log(`Radio ${radioName} cambiado. Valor 'Si' seleccionado: ${isYes}`);
                if (isYes) {
                    targetDiv.style.display = 'block';
                    console.log(`Sección condicional '${targetDivId}' mostrada.`);
                    // Solo establece 'required' si la sección principal del formulario es visible Y el campo no es opcional
                    const parentFormSection = targetDiv.closest('#usaFormSections, #canadaFormSections');
                    if (parentFormSection && parentFormSection.style.display !== 'none') {
                        targetInputs.forEach(input => {
                            if (input.dataset.validationType && !input.hasAttribute('data-optional')) {
                                input.setAttribute('required', 'required');
                            }
                        });
                    }
                } else {
                    targetDiv.style.display = 'none';
                    console.log(`Sección condicional '${targetDivId}' oculta.`);
                    targetInputs.forEach(input => {
                        input.removeAttribute('required');
                        input.value = ''; // Limpia valores cuando se oculta
                        if (input.type === 'radio' || input.type === 'checkbox') {
                            input.checked = false;
                        }
                        input.classList.remove('invalid'); // Limpia el estado de validación
                        const errorMessageElement = input.nextElementSibling;
                        if (errorMessageElement && errorMessageElement.classList.contains('error-message')) {
                            errorMessageElement.textContent = '';
                            errorMessageElement.style.display = 'none';
                        }
                    });
                    if (targetDiv.id.includes('Container')) {
                        targetDiv.innerHTML = ''; // Limpia contenido dinámico
                    }
                }
                updateProgressBar(); // Actualiza la barra de progreso
            });
        });

        // Estado inicial: ocultar y desmarcar requerido si no hay "Sí" seleccionado
        const initialCheckedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
        if (!initialCheckedRadio || initialCheckedRadio.value === 'No') {
            targetDiv.style.display = 'none';
            targetInputs.forEach(input => input.removeAttribute('required'));
        } else if (initialCheckedRadio.value === 'Si') {
             targetDiv.style.display = 'block';
             const parentFormSection = targetDiv.closest('#usaFormSections, #canadaFormSections');
             if (parentFormSection && parentFormSection.style.display !== 'none') {
                 targetInputs.forEach(input => {
                    if (input.dataset.validationType && !input.hasAttribute('data-optional')) {
                        input.setAttribute('required', 'required');
                    }
                 });
             }
        }
    }

    // Configuración de todas las secciones condicionales para USA
    setupConditionalDisplay('usa.personalInfo.otherNationality', 'otherNationalityDetails');
    setupConditionalDisplay('usa.personalInfo.otherNamesUsed', 'otherNamesDetails');
    setupConditionalDisplay('usa.personalInfo.telecodeName', 'telecodeNameDetails');

    setupConditionalDisplay('usa.passportInfo.lostPassport', 'lostPassportDetails');
    setupConditionalDisplay('usa.travelInfo.personPayingTravel', 'otherPayerDetails');
    setupConditionalDisplay('usa.travelInfo.travelingWithOthers', 'travelingWithOthersDetails');
    setupConditionalDisplay('usa.travelInfo.previousUsTravel', 'previousUsTravelDetails');
    setupConditionalDisplay('usa.travelInfo.previousUsVisa', 'previousUsVisaDetails');
    setupConditionalDisplay('usa.travelInfo.deniedUsVisa', 'deniedUsVisaDetails');
    setupConditionalDisplay('usa.travelInfo.visaCancelled', 'visaCancelledDetails');

    setupConditionalDisplay('usa.familyInfo.hasSpouse', 'spouseDetails');
    setupConditionalDisplay('usa.familyInfo.hasChildren', 'childrenDetails');
    setupConditionalDisplay('usa.familyInfo.usFamily', 'usFamilyDetails');

    setupConditionalDisplay('usa.workEduInfo.previousEmployment', 'previousEmploymentDetails');
    setupConditionalDisplay('usa.workEduInfo.highestEducation', 'educationDetails'); // Note: This is a select, not a radio group, but the logic still applies if "Otro" shows a section.
    setupConditionalDisplay('usa.workEduInfo.countriesVisited', 'countriesVisitedDetails');
    setupConditionalDisplay('usa.workEduInfo.specializedSkills', 'specializedSkillsDetails');
    setupConditionalDisplay('usa.workEduInfo.militaryService', 'militaryServiceDetails');

    setupConditionalDisplay('usa.securityInfo.health', 'healthDetails');
    setupConditionalDisplay('usa.securityInfo.drugAbuse', 'drugAbuseDetails');
    setupConditionalDisplay('usa.securityInfo.criminal', 'criminalDetails');
    setupConditionalDisplay('usa.securityInfo.drugs', 'drugsDetails');
    setupConditionalDisplay('usa.securityInfo.prostitution', 'prostitutionDetails');
    setupConditionalDisplay('usa.securityInfo.moneyLaundering', 'moneyLaunderingDetails');
    setupConditionalDisplay('usa.securityInfo.humanTrafficking', 'humanTraffickingDetails');
    setupConditionalDisplay('usa.securityInfo.overstay', 'overstayDetails');
    setupConditionalDisplay('usa.securityInfo.misrepresentation', 'misrepresentationDetails');
    setupConditionalDisplay('usa.securityInfo.deported', 'deportedDetails');
    setupConditionalDisplay('usa.securityInfo.terrorist', 'terroristDetails');
    setupConditionalDisplay('usa.securityInfo.intendTerrorism', 'intendTerrorismDetails');
    setupConditionalDisplay('usa.securityInfo.terroristOrgMember', 'terroristOrgMemberDetails');
    setupConditionalDisplay('usa.securityInfo.publicCharge', 'publicChargeDetails');

    // Configuración de secciones condicionales para Canadá
    setupConditionalDisplay('canada.travelInfo.hasFunds', 'canFundsDetails');
    setupConditionalDisplay('canada.securityInfo.criminal', 'canCriminalDetails');

    // Lógica inversa para "misma dirección" (cuando "Sí" oculta la sección)
    function setupAddressSameLogic(radioName, targetDivId) {
        const radios = document.querySelectorAll(`input[name="${radioName}"]`);
        const targetDiv = document.getElementById(targetDivId);
        if (!targetDiv) return;

        const targetInputs = Array.from(targetDiv.querySelectorAll('input, select, textarea'));

        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                const isSameAddress = document.querySelector(`input[name="${radioName}"][value="Si"]`)?.checked;
                if (isSameAddress) {
                    targetDiv.style.display = 'none';
                    targetInputs.forEach(input => {
                        input.removeAttribute('required');
                        input.value = '';
                        if (input.type === 'radio' || input.type === 'checkbox') {
                            input.checked = false;
                        }
                        input.classList.remove('invalid');
                        const errorMessageElement = input.nextElementSibling;
                        if (errorMessageElement && errorMessageElement.classList.contains('error-message')) {
                            errorMessageElement.textContent = '';
                            errorMessageElement.style.display = 'none';
                        }
                    });
                } else {
                    targetDiv.style.display = 'block';
                    const parentFormSection = targetDiv.closest('#usaFormSections, #canadaFormSections');
                    if (parentFormSection && parentFormSection.style.display !== 'none') {
                        targetInputs.forEach(input => {
                            if (input.dataset.validationType && !input.hasAttribute('data-optional')) {
                                input.setAttribute('required', 'required');
                            }
                        });
                    }
                }
                updateProgressBar();
            });
        });
        // Estado inicial
        const initialCheckedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
        if (!initialCheckedRadio || initialCheckedRadio.value === 'Si') {
            targetDiv.style.display = 'none';
            targetInputs.forEach(input => input.removeAttribute('required'));
        } else if (initialCheckedRadio.value === 'No') {
            targetDiv.style.display = 'block';
            const parentFormSection = targetDiv.closest('#usaFormSections, #canadaFormSections');
            if (parentFormSection && parentFormSection.style.display !== 'none') {
                targetInputs.forEach(input => {
                    if (input.dataset.validationType && !input.hasAttribute('data-optional')) {
                        input.setAttribute('required', 'required');
                    }
                });
            }
        }
    }
    setupAddressSameLogic('usa.familyInfo.fatherAddressSame', 'fatherAddressDetails');
    setupAddressSameLogic('usa.familyInfo.motherAddressSame', 'motherAddressDetails');
    setupAddressSameLogic('usa.familyInfo.spouse.addressSame', 'spouseAddressDetails');


    // --- Funciones para Campos Dinámicos ---

    // Crea y añade un nuevo grupo de campos dinámicos
    function createDynamicEntry(containerId, namePrefix, fields, titlePrefix, data = null) {
        const container = document.getElementById(containerId);
        let counter = container.children.length + 1;

        const entryDiv = document.createElement('div');
        entryDiv.classList.add('dynamic-entry');
        entryDiv.setAttribute('data-index', counter - 1);

        let htmlContent = `<h3>${titlePrefix} ${counter}</h3>`;
        fields.forEach(field => {
            const fieldId = `${field.idPrefix}_${counter}`;
            const fieldName = `${namePrefix}[${counter-1}].${field.nameSuffix}`;
            const parentFormSection = container.closest('#usaFormSections, #canadaFormSections');
            const isParentSectionVisible = parentFormSection && parentFormSection.style.display !== 'none';
            const isRequired = field.required && isParentSectionVisible && field.validationType && !field.optional ? 'required' : '';
            const fieldValue = data && data[field.nameSuffix] !== undefined ? data[field.nameSuffix] : '';
            const validationTypeAttr = field.validationType ? `data-validation-type="${field.validationType}"` : '';
            const optionalAttr = field.optional ? 'data-optional="true"' : '';


            let inputHtml = '';
            if (field.tag === 'select') {
                inputHtml = `<select id="${fieldId}" name="${fieldName}" ${isRequired} ${optionalAttr}>
                                ${field.options.map(opt => `<option value="${opt.value}" ${opt.value === fieldValue ? 'selected' : ''}>${opt.text}</option>`).join('')}
                             </select>`;
            } else if (field.tag === 'textarea') {
                inputHtml = `<textarea id="${fieldId}" name="${fieldName}" ${isRequired} ${field.rows ? `rows="${field.rows}"` : ''} ${field.placeholder ? `placeholder="${field.placeholder}"` : ''} ${validationTypeAttr} ${optionalAttr}>${fieldValue}</textarea>`;
            } else {
                inputHtml = `<input id="${fieldId}" name="${fieldName}" type="${field.type || 'text'}" ${isRequired} ${field.placeholder ? `placeholder="${field.placeholder}"` : ''} value="${fieldValue}" ${validationTypeAttr} ${optionalAttr}>`;
            }

            htmlContent += `
                <div class="form-group">
                    <label for="${fieldId}">${field.label}:</label>
                    ${inputHtml}
                    <div class="error-message"></div>
                </div>
            `;
        });
        htmlContent += `<button type="button" class="remove-btn">Eliminar</button>`;
        entryDiv.innerHTML = htmlContent;
        container.appendChild(entryDiv);

        // Adjuntar validación a los nuevos campos dinámicos
        entryDiv.querySelectorAll('[data-validation-type]').forEach(input => {
            input.addEventListener('blur', () => validateInput(input));
            input.addEventListener('input', () => {
                if (input.classList.contains('invalid')) {
                    validateInput(input);
                }
                updateProgressBar();
            });
        });

        entryDiv.querySelector('.remove-btn').addEventListener('click', () => {
            entryDiv.remove();
            reIndexDynamicEntries(containerId, namePrefix);
            updateProgressBar(); // Actualiza la barra de progreso
        });

        return entryDiv;
    }

    // Re-indexa los campos dinámicos después de añadir/eliminar
    function reIndexDynamicEntries(containerId, namePrefix) {
        const container = document.getElementById(containerId);
        Array.from(container.children).forEach((entryDiv, index) => {
            entryDiv.setAttribute('data-index', index);
            const titleElement = entryDiv.querySelector('h3');
            if (titleElement) {
                titleElement.textContent = titleElement.textContent.split(' ')[0] + ' ' + (index + 1);
            }

            entryDiv.querySelectorAll('[name]').forEach(input => {
                const oldName = input.getAttribute('name');
                const parts = oldName.split('.');
                const lastPart = parts.pop();
                const arrayPartMatch = parts[parts.length - 1].match(/^(.+)\[\d+\]$/);

                if (arrayPartMatch) {
                    const arrayName = arrayPartMatch[1];
                    const newName = `${arrayName}[${index}].${lastPart}`;
                    input.setAttribute('name', newName);
                    // Update ID as well for consistency and label 'for' attributes
                    const oldId = input.id;
                    if (oldId && oldId.startsWith(field.idPrefix)) { // Check if it's a dynamic field ID
                        input.id = `${field.idPrefix}_${index + 1}`;
                        const label = entryDiv.querySelector(`label[for="${oldId}"]`);
                        if (label) label.setAttribute('for', input.id);
                    }
                }
            });
        });
    }

    // Event Listeners para añadir campos dinámicos
    document.getElementById('addOtherNameBtn')?.addEventListener('click', () => {
        createDynamicEntry('otherNamesContainer', 'usa.personalInfo.otherNames', [
            { idPrefix: 'otherNameSurname', nameSuffix: 'surname', label: 'Apellidos (Otros)', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'otherNameGivenName', nameSuffix: 'givenName', label: 'Nombres (Otros)', type: 'text', required: true, validationType: 'text' },
        ], 'Otro Nombre');
    });

    document.getElementById('addChildBtn')?.addEventListener('click', () => {
        createDynamicEntry('childrenContainer', 'usa.familyInfo.children', [
            { idPrefix: 'childSurname', nameSuffix: 'surname', label: 'Apellidos del Hijo', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'childGivenName', nameSuffix: 'givenName', label: 'Nombres del Hijo', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'childDob', nameSuffix: 'dob', label: 'Fecha de Nacimiento del Hijo', type: 'date', required: true, validationType: 'date' },
            { idPrefix: 'childPobCountry', nameSuffix: 'pobCountry', label: 'País de Nacimiento del Hijo', type: 'text', required: true, validationType: 'text' },
        ], 'Hijo');
    });

    document.getElementById('addPreviousUsTravelBtn')?.addEventListener('click', () => {
        createDynamicEntry('previousUsTravelContainer', 'usa.travelInfo.previousUsTravels', [
            { idPrefix: 'usTravelArrivalDate', nameSuffix: 'arrivalDate', label: 'Fecha de Llegada', type: 'date', required: true, validationType: 'date' },
            { idPrefix: 'usTravelDepartureDate', nameSuffix: 'departureDate', label: 'Fecha de Salida', type: 'date', required: true, validationType: 'date' },
            { idPrefix: 'usTravelStayDuration', nameSuffix: 'stayDuration', label: 'Duración de la Estancia', type: 'text', placeholder: 'Ej: 1 mes', validationType: 'text' },
        ], 'Viaje Anterior');
    });

    document.getElementById('addTravelCompanionBtn')?.addEventListener('click', () => {
        createDynamicEntry('travelCompanionsContainer', 'usa.travelInfo.travelCompanions', [
            { idPrefix: 'companionSurname', nameSuffix: 'surname', label: 'Apellidos del Compañero', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'companionGivenName', nameSuffix: 'givenName', label: 'Nombres del Compañero', type: 'text', required: true, validationType: 'text' },
            {
                idPrefix: 'companionRelationship', nameSuffix: 'relationship', label: 'Parentesco/Relación', tag: 'select', required: true,
                options: [
                    { value: '', text: 'Seleccione...' },
                    { value: 'FAMILIAR', text: 'FAMILIAR' },
                    { value: 'AMIGO', text: 'AMIGO' },
                    { value: 'COLEGA', text: 'COLEGA' },
                    { value: 'OTRO', text: 'OTRO' }
                ]
            },
        ], 'Compañero');
    });

    document.getElementById('addUsFamilyBtn')?.addEventListener('click', () => {
        createDynamicEntry('usFamilyContainer', 'usa.familyInfo.usFamilyMembers', [
            { idPrefix: 'usFamilySurname', nameSuffix: 'surname', label: 'Apellidos del Familiar', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'usFamilyGivenName', nameSuffix: 'givenName', label: 'Nombres del Familiar', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'usFamilyRelationship', nameSuffix: 'relationship', label: 'Parentesco', type: 'text', required: true, placeholder: 'Ej: Padre, Hermano, Cónyuge', validationType: 'text' },
            {
                idPrefix: 'usFamilyStatus', nameSuffix: 'status', label: 'Estatus en EE. UU.', tag: 'select', required: true,
                options: [
                    { value: '', text: 'Seleccione...' },
                    { value: 'Ciudadano', text: 'Ciudadano Estadounidense' },
                    { value: 'Residente Permanente', text: 'Residente Permanente Legal (Green Card)' }
                ]
            },
        ], 'Familiar en EE. UU.');
    });

    document.getElementById('addPreviousEmployerBtn')?.addEventListener('click', () => {
        createDynamicEntry('previousEmploymentContainer', 'usa.workEduInfo.previousEmployers', [
            { idPrefix: 'prevEmployerName', nameSuffix: 'name', label: 'Nombre de la Empresa', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'prevEmployerAddress', nameSuffix: 'address', label: 'Dirección de la Empresa', type: 'text', validationType: 'text', optional: true },
            { idPrefix: 'prevJobTitle', nameSuffix: 'jobTitle', label: 'Cargo/Puesto', type: 'text', validationType: 'text', optional: true },
            { idPrefix: 'prevStartDate', nameSuffix: 'startDate', label: 'Fecha de Inicio', type: 'date', validationType: 'date', optional: true },
            { idPrefix: 'prevEndDate', nameSuffix: 'endDate', label: 'Fecha de Fin', type: 'date', validationType: 'date', optional: true },
            { idPrefix: 'prevJobDescription', nameSuffix: 'description', label: 'Descripción de Funciones', tag: 'textarea', rows: 2, validationType: 'text', optional: true },
        ], 'Empleo Anterior');
    });

    document.getElementById('addEducationBtn')?.addEventListener('click', () => {
        createDynamicEntry('educationContainer', 'usa.workEduInfo.educationHistory', [
            { idPrefix: 'eduSchoolName', nameSuffix: 'schoolName', label: 'Nombre de la Institución', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'eduAddress', nameSuffix: 'address', label: 'Dirección', type: 'text', validationType: 'text', optional: true },
            { idPrefix: 'eduCourse', nameSuffix: 'course', label: 'Curso/Carrera', type: 'text', validationType: 'text', optional: true },
            { idPrefix: 'eduStartDate', nameSuffix: 'startDate', label: 'Fecha de Inicio', type: 'date', validationType: 'date', optional: true },
            { idPrefix: 'eduEndDate', nameSuffix: 'endDate', label: 'Fecha de Fin', type: 'date', validationType: 'date', optional: true },
        ], 'Educación');
    });

    document.getElementById('addCountryVisitedBtn')?.addEventListener('click', () => {
        createDynamicEntry('countriesVisitedContainer', 'usa.workEduInfo.countriesVisitedList', [
            { idPrefix: 'countryName', nameSuffix: 'name', label: 'Nombre del País', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'countryVisitDate', nameSuffix: 'date', label: 'Fecha de Visita (aprox.)', type: 'date', validationType: 'date', optional: true },
        ], 'País Visitado');
    });


    // --- Lógica de Selección de País y Barra de Progreso ---

    visaTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            console.log(`Evento 'change' en radio de tipo de visa. Valor seleccionado: ${radio.value}`);
            countrySelectionError.style.display = 'none';
            progressBarContainer.style.display = 'block';

            const toggleRequiredAndValidation = (section, isRequired) => {
                if (!section) {
                    console.warn(`Intento de alternar 'required' en una sección nula. isRequired: ${isRequired}`);
                    return;
                }
                console.log(`Alternando 'required' para la sección: ${section.id}, isRequired: ${isRequired}`);

                section.querySelectorAll('input, select, textarea').forEach(el => {
                    // Si el elemento es parte de una sección condicional, su 'required' lo maneja setupConditionalDisplay
                    const parentConditionalSection = el.closest('.conditional-section');
                    if (parentConditionalSection) {
                        // Si la sección condicional está oculta, el campo no debe ser requerido
                        if (parentConditionalSection.style.display === 'none') {
                            el.removeAttribute('required');
                        } else {
                            // Si la sección condicional está visible y el campo no es opcional, se establece requerido
                            if (el.dataset.validationType && !el.hasAttribute('data-optional')) {
                                el.setAttribute('required', 'required');
                            }
                        }
                    } else { // Si no es parte de una sección condicional, se maneja directamente
                        if (isRequired) {
                            if (el.dataset.validationType && !el.hasAttribute('data-optional')) {
                                el.setAttribute('required', 'required');
                            }
                        } else {
                            el.removeAttribute('required');
                        }
                    }

                    // Limpiar valores y estados de validación si la sección se oculta
                    if (!isRequired) {
                        el.value = '';
                        if (el.type === 'radio' || el.type === 'checkbox') {
                            el.checked = false;
                        }
                        el.classList.remove('invalid');
                        const errorMessageElement = el.nextElementSibling;
                        if (errorMessageElement && errorMessageElement.classList.contains('error-message')) {
                            errorMessageElement.textContent = '';
                            errorMessageElement.style.display = 'none';
                        }
                    }
                });

                // Disparar eventos 'change' en radios de la sección para activar condicionales
                section.querySelectorAll('input[type="radio"]').forEach(radioInput => {
                    // Solo disparar si el radio está marcado, para evitar bucles infinitos con setupConditionalDisplay
                    if (radioInput.checked) {
                        radioInput.dispatchEvent(new Event('change'));
                    }
                });
            };

            if (document.getElementById('visaTypeUSA').checked) {
                if (usaFormSections) {
                    usaFormSections.style.display = 'block';
                    console.log('usaFormSections.style.display establecido a:', usaFormSections.style.display);
                    toggleRequiredAndValidation(usaFormSections, true);
                } else {
                    console.error("usaFormSections no encontrado al intentar mostrarlo.");
                }
                if (canadaFormSections) {
                    canadaFormSections.style.display = 'none';
                    console.log('canadaFormSections.style.display establecido a:', canadaFormSections.style.display);
                    toggleRequiredAndValidation(canadaFormSections, false);
                }
            } else if (document.getElementById('visaTypeCanada').checked) {
                if (usaFormSections) {
                    usaFormSections.style.display = 'none';
                    console.log('usaFormSections.style.display establecido a:', usaFormSections.style.display);
                    toggleRequiredAndValidation(usaFormSections, false);
                }
                if (canadaFormSections) {
                    canadaFormSections.style.display = 'block';
                    console.log('canadaFormSections.style.display establecido a:', canadaFormSections.style.display);
                    toggleRequiredAndValidation(canadaFormSections, true);
                } else {
                    console.error("canadaFormSections no encontrado al intentar mostrarlo.");
                }
            }
            updateProgressBar();
        });
    });

    // Estado inicial: ocultar formularios y barra de progreso
    if (usaFormSections) {
        usaFormSections.style.display = 'none';
        console.log('usaFormSections.style.display inicial:', usaFormSections.style.display);
    }
    if (canadaFormSections) {
        canadaFormSections.style.display = 'none';
        console.log('canadaFormSections.style.display inicial:', canadaFormSections.style.display);
    }
    if (progressBarContainer) progressBarContainer.style.display = 'none';


    // Actualiza la barra de progreso
    function updateProgressBar() {
        const selectedVisaType = document.querySelector('input[name="visaType"]:checked');
        if (!selectedVisaType) {
            progressBarFill.style.width = '0%';
            progressBarText.textContent = '0% Completo';
            return;
        }

        const currentFormSection = selectedVisaType.value === 'USA' ? usaFormSections : canadaFormSections;
        if (!currentFormSection || currentFormSection.style.display === 'none') {
            progressBarFill.style.width = '0%';
            progressBarText.textContent = '0% Completo';
            return;
        }

        let totalVisibleRequiredFields = 0;
        let filledVisibleRequiredFields = 0;
        const radioGroupNames = new Set(); // Para evitar contar grupos de radio varias veces

        // Obtener todos los elementos de entrada relevantes dentro de la sección de formulario activa
        const formElements = Array.from(currentFormSection.querySelectorAll('input, select, textarea'));

        formElements.forEach(element => {
            const name = element.name;
            if (!name || element.tagName === 'BUTTON' || element.type === 'submit' || element.type === 'button') {
                return;
            }

            // Verificar si el elemento está dentro de una sección condicional actualmente oculta
            const parentConditionalSection = element.closest('.conditional-section');
            if (parentConditionalSection && parentConditionalSection.style.display === 'none') {
                return; // Saltar campos condicionales ocultos
            }

            // Solo contar campos que son requeridos o que tienen una validación específica y no son opcionales
            const isRequiredOrValidated = element.hasAttribute('required') || (element.dataset.validationType && !element.hasAttribute('data-optional'));
            if (!isRequiredOrValidated) {
                return; // No contar campos opcionales sin validación o no requeridos
            }

            if (element.type === 'radio') {
                if (!radioGroupNames.has(name)) {
                    totalVisibleRequiredFields++;
                    radioGroupNames.add(name);
                    if (document.querySelector(`input[name="${name}"]:checked`)) {
                        filledVisibleRequiredFields++;
                    }
                }
            } else if (element.type === 'checkbox') {
                totalVisibleRequiredFields++;
                if (element.checked) {
                    filledVisibleRequiredFields++;
                }
            } else {
                totalVisibleRequiredFields++;
                if (element.value.trim() !== '') {
                    filledVisibleRequiredFields++;
                }
            }
        });

        const progress = totalVisibleRequiredFields > 0 ? (filledVisibleRequiredFields / totalVisibleRequiredFields) * 100 : 0;
        progressBarFill.style.width = `${progress}%`;
        progressBarText.textContent = `${Math.round(progress)}% Completo`;
    }


    // Adjuntar actualización de progreso a todos los cambios de entrada
    form.addEventListener('input', updateProgressBar);
    form.addEventListener('change', updateProgressBar); // Para radios/checkboxes/selects


    // --- Validación General del Formulario y Control del Botón de Envío ---

    function checkFormValidityAndGetFirstInvalid() {
        const selectedVisaType = document.querySelector('input[name="visaType"]:checked');
        if (!selectedVisaType) {
            countrySelectionError.style.display = 'block';
            return document.querySelector('.country-selection-fieldset'); // Devolver el fieldset para enfocar
        } else {
            countrySelectionError.style.display = 'none';
        }

        const currentFormSection = selectedVisaType.value === 'USA' ? usaFormSections : canadaFormSections;
        let firstInvalidField = null;

        currentFormSection.querySelectorAll('input, select, textarea').forEach(input => {
            const parentConditionalSection = input.closest('.conditional-section');
            if (!parentConditionalSection || parentConditionalSection.style.display !== 'none') {
                if (input.hasAttribute('required') || (input.dataset.validationType && !input.hasAttribute('data-optional'))) {
                    if (!validateInput(input)) {
                        if (!firstInvalidField) {
                            firstInvalidField = input;
                        }
                    }
                }
            }
        });
        return firstInvalidField;
    }


    // --- Guardar y Cargar Progreso ---

    saveProgressBtn.addEventListener('click', () => {
        const formDataToSave = {};
        const elements = form.elements;

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const name = element.name;

            if (!name || element.tagName === 'BUTTON' || element.type === 'submit' || element.type === 'button') {
                continue;
            }

            if (element.type === 'radio') {
                if (element.checked) {
                    setNestedValue(formDataToSave, name, element.value);
                }
            } else if (element.type === 'checkbox') {
                setNestedValue(formDataToSave, name, element.checked ? element.value : '');
            } else if (element.tagName === 'SELECT' || element.tagName === 'TEXTAREA' || (element.tagName === 'INPUT')) {
                setNestedValue(formDataToSave, name, element.value);
            }
        }

        try {
            localStorage.setItem('visaFormData', JSON.stringify(formDataToSave));
            showModal("Progreso Guardado", "Su progreso ha sido guardado en este navegador. Puede continuar más tarde.");
            console.log("Form data saved:", formDataToSave);
        } catch (e) {
            console.error("Error saving data to localStorage:", e);
            showModal("Error al Guardar", "No se pudo guardar el progreso. Asegúrese de que su navegador permite el almacenamiento local.");
        }
    });

    // Carga los datos del formulario guardados
    function loadFormData() {
        try {
            const savedData = localStorage.getItem('visaFormData');
            if (!savedData) {
                console.log("No saved data found.");
                return;
            }

            const formData = JSON.parse(savedData);
            console.log("Loaded data:", formData);

            // Primero, establece el tipo de visa para asegurar que la sección correcta sea visible
            if (formData.visaType) {
                const visaTypeRadio = document.querySelector(`input[name="visaType"][value="${formData.visaType}"]`);
                if (visaTypeRadio) {
                    visaTypeRadio.checked = true;
                    // Dispara el evento 'change' para activar la lógica de visualización de las secciones
                    visaTypeRadio.dispatchEvent(new Event('change'));
                    console.log(`Tipo de visa '${formData.visaType}' cargado y evento 'change' disparado.`);
                } else {
                    console.warn(`Radio para tipo de visa '${formData.visaType}' no encontrado.`);
                }
            }

            const populateField = (path, value) => {
                const element = form.querySelector(`[name="${path}"]`);
                if (element) {
                    if (element.type === 'radio') {
                        if (element.value === value) {
                            element.checked = true;
                            // No disparamos 'change' aquí para radios que controlan secciones condicionales
                            // porque se manejarán en la segunda pasada o por el evento del visaTypeRadio.
                        }
                    } else if (element.type === 'checkbox') {
                        element.checked = (value === element.value || value === true);
                    } else {
                        element.value = value;
                    }
                    element.dispatchEvent(new Event('input', { bubbles: true })); // Para barra de progreso y validación
                }
            };

            const dynamicFieldMaps = {
                'usa.personalInfo.otherNames': { id: 'otherNamesContainer', fields: [
                    { idPrefix: 'otherNameSurname', nameSuffix: 'surname', label: 'Apellidos (Otros)', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'otherNameGivenName', nameSuffix: 'givenName', label: 'Nombres (Otros)', type: 'text', required: true, validationType: 'text' },
                ], titlePrefix: 'Otro Nombre', controllingRadioName: 'usa.personalInfo.otherNamesUsed'},
                'usa.familyInfo.children': { id: 'childrenContainer', fields: [
                    { idPrefix: 'childSurname', nameSuffix: 'surname', label: 'Apellidos del Hijo', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'childGivenName', nameSuffix: 'givenName', label: 'Nombres del Hijo', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'childDob', nameSuffix: 'dob', label: 'Fecha de Nacimiento del Hijo', type: 'date', required: true, validationType: 'date' },
                    { idPrefix: 'childPobCountry', nameSuffix: 'pobCountry', label: 'País de Nacimiento del Hijo', type: 'text', required: true, validationType: 'text' },
                ], titlePrefix: 'Hijo', controllingRadioName: 'usa.familyInfo.hasChildren'},
                'usa.travelInfo.previousUsTravels': { id: 'previousUsTravelContainer', fields: [
                    { idPrefix: 'usTravelArrivalDate', nameSuffix: 'arrivalDate', label: 'Fecha de Llegada', type: 'date', required: true, validationType: 'date' },
                    { idPrefix: 'usTravelDepartureDate', nameSuffix: 'departureDate', label: 'Fecha de Salida', type: 'date', required: true, validationType: 'date' },
                    { idPrefix: 'usTravelStayDuration', nameSuffix: 'stayDuration', label: 'Duración de la Estancia', type: 'text', placeholder: 'Ej: 1 mes', validationType: 'text' },
                ], titlePrefix: 'Viaje Anterior', controllingRadioName: 'usa.travelInfo.previousUsTravel'},
                'usa.travelInfo.travelCompanions': { id: 'travelCompanionsContainer', fields: [
                    { idPrefix: 'companionSurname', nameSuffix: 'surname', label: 'Apellidos del Compañero', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'companionGivenName', nameSuffix: 'givenName', label: 'Nombres del Compañero', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'companionRelationship', nameSuffix: 'relationship', label: 'Parentesco/Relación', tag: 'select', required: true, options: [{ value: '', text: 'Seleccione...' }, { value: 'FAMILIAR', text: 'FAMILIAR' }, { value: 'AMIGO', text: 'AMIGO' }, { value: 'COLEGA', text: 'COLEGA' }, { value: 'OTRO', text: 'OTRO' }] },
                ], titlePrefix: 'Compañero', controllingRadioName: 'usa.travelInfo.travelingWithOthers'},
                'usa.familyInfo.usFamilyMembers': { id: 'usFamilyContainer', fields: [
                    { idPrefix: 'usFamilySurname', nameSuffix: 'surname', label: 'Apellidos del Familiar', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'usFamilyGivenName', nameSuffix: 'givenName', label: 'Nombres del Familiar', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'usFamilyRelationship', nameSuffix: 'relationship', label: 'Parentesco', type: 'text', required: true, placeholder: 'Ej: Padre, Hermano, Cónyuge', validationType: 'text' },
                    { idPrefix: 'usFamilyStatus', nameSuffix: 'status', label: 'Estatus en EE. UU.', tag: 'select', required: true, options: [{ value: '', text: 'Seleccione...' }, { value: 'Ciudadano', text: 'Ciudadano Estadounidense' }, { value: 'Residente Permanente', text: 'Residente Permanente Legal (Green Card)' }] },
                ], titlePrefix: 'Familiar en EE. UU.', controllingRadioName: 'usa.familyInfo.usFamily'},
                'usa.workEduInfo.previousEmployers': { id: 'previousEmploymentContainer', fields: [
                    { idPrefix: 'prevEmployerName', nameSuffix: 'name', label: 'Nombre de la Empresa', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'prevEmployerAddress', nameSuffix: 'address', label: 'Dirección de la Empresa', type: 'text', validationType: 'text', optional: true },
                    { idPrefix: 'prevJobTitle', nameSuffix: 'jobTitle', label: 'Cargo/Puesto', type: 'text', validationType: 'text', optional: true },
                    { idPrefix: 'prevStartDate', nameSuffix: 'startDate', label: 'Fecha de Inicio', type: 'date', validationType: 'date', optional: true },
                    { idPrefix: 'prevEndDate', nameSuffix: 'endDate', label: 'Fecha de Fin', type: 'date', validationType: 'date', optional: true },
                    { idPrefix: 'prevJobDescription', nameSuffix: 'description', label: 'Descripción de Funciones', tag: 'textarea', rows: 2, validationType: 'text', optional: true },
                ], titlePrefix: 'Empleo Anterior', controllingRadioName: 'usa.workEduInfo.previousEmployment'},
                'usa.workEduInfo.educationHistory': { id: 'educationContainer', fields: [
                    { idPrefix: 'eduSchoolName', nameSuffix: 'schoolName', label: 'Nombre de la Institución', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'eduAddress', nameSuffix: 'address', label: 'Dirección', type: 'text', validationType: 'text', optional: true },
                    { idPrefix: 'eduCourse', nameSuffix: 'course', label: 'Curso/Carrera', type: 'text', validationType: 'text', optional: true },
                    { idPrefix: 'eduStartDate', nameSuffix: 'startDate', label: 'Fecha de Inicio', type: 'date', validationType: 'date', optional: true },
                    { idPrefix: 'eduEndDate', nameSuffix: 'endDate', label: 'Fecha de Fin', type: 'date', validationType: 'date', optional: true },
                ], titlePrefix: 'Educación', controllingRadioName: 'usa.workEduInfo.highestEducation'}, // Special handling for select
                'usa.workEduInfo.countriesVisitedList': { id: 'countriesVisitedContainer', fields: [
                    { idPrefix: 'countryName', nameSuffix: 'name', label: 'Nombre del País', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'countryVisitDate', nameSuffix: 'date', label: 'Fecha de Visita (aprox.)', type: 'date', validationType: 'date', optional: true },
                ], titlePrefix: 'País Visitado', controllingRadioName: 'usa.workEduInfo.countriesVisited'},
            };


            const traverseAndPopulate = (obj, currentPath = '') => {
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        const value = obj[key];
                        const newPath = currentPath ? `${currentPath}.${key}` : key;

                        if (Array.isArray(value)) {
                            const dynamicInfo = dynamicFieldMaps[newPath];
                            if (dynamicInfo) {
                                const containerElement = document.getElementById(dynamicInfo.id);
                                if (containerElement) {
                                    containerElement.innerHTML = ''; // Limpiar antes de poblar
                                    value.forEach(itemData => {
                                        createDynamicEntry(dynamicInfo.id, newPath, dynamicInfo.fields, dynamicInfo.titlePrefix, itemData);
                                    });
                                    // Asegurar que el radio "Sí" que controla esta sección dinámica esté marcado
                                    if (dynamicInfo.controllingRadioName) {
                                        const controllingRadio = document.querySelector(`input[name="${dynamicInfo.controllingRadioName}"][value="Si"]`);
                                        if (controllingRadio) {
                                            controllingRadio.checked = true;
                                            controllingRadio.dispatchEvent(new Event('change'));
                                        }
                                    }
                                } else {
                                    console.warn(`Contenedor dinámico con ID '${dynamicInfo.id}' no encontrado para la ruta '${newPath}'.`);
                                }
                            } else {
                                value.forEach((item, index) => {
                                    if (typeof item === 'object' && item !== null) {
                                        traverseAndPopulate(item, `${newPath}[${index}]`);
                                    } else {
                                        populateField(`${newPath}[${index}]`, item);
                                    }
                                });
                            }
                        } else if (typeof value === 'object' && value !== null) {
                            traverseAndPopulate(value, newPath);
                        } else {
                            populateField(newPath, value);
                        }
                    }
                }
            };

            traverseAndPopulate(formData);

            // Disparar eventos de cambio para radios y selects para asegurar visibilidad de condicionales
            // Esto es un paso de seguridad para los casos que no fueron cubiertos por el populateField
            form.querySelectorAll('input[type="radio"]:checked').forEach(radio => radio.dispatchEvent(new Event('change')));
            form.querySelectorAll('select').forEach(select => select.dispatchEvent(new Event('change')));

            updateProgressBar();
            showModal("Progreso Cargado", "Sus datos guardados han sido cargados exitosamente.");

        } catch (e) {
            console.error("Error loading data from localStorage:", e);
            showModal("Error al Cargar", "Hubo un problema al cargar los datos guardados. Es posible que los datos estén corruptos o el formato haya cambiado.");
            localStorage.removeItem('visaFormData'); // Limpiar datos corruptos
        }
    }

    // Verificar si hay datos guardados al cargar la página
    const savedDataExists = localStorage.getItem('visaFormData');
    if (savedDataExists) {
        showModal(
            "Cargar Progreso Guardado",
            "Hemos detectado datos guardados en este navegador. ¿Desea cargar su progreso?",
            true,
            loadFormData
        );
    } else {
        console.log("No se encontraron datos de sesión anteriores.");
    }


    // --- Lógica de Envío del Formulario (Revisar y Confirmar) ---

    // Función para recolectar todos los datos del formulario (solo campos visibles y relevantes)
    function collectFormDataForSummary() {
        const collectedData = {};
        const selectedVisaType = document.querySelector('input[name="visaType"]:checked');

        if (!selectedVisaType) {
            return null; // No hay tipo de visa seleccionado
        }
        setNestedValue(collectedData, 'visaType', selectedVisaType.value); // Añadir el tipo de visa

        const currentFormSection = selectedVisaType.value === 'USA' ? usaFormSections : canadaFormSections;

        currentFormSection.querySelectorAll('input, select, textarea').forEach(element => {
            const name = element.name;
            if (!name || element.tagName === 'BUTTON' || element.type === 'submit' || element.type === 'button') {
                return;
            }

            // Solo recolectar si el elemento no está en una sección condicional oculta
            const parentConditionalSection = element.closest('.conditional-section');
            if (parentConditionalSection && parentConditionalSection.style.display === 'none') {
                 return;
            }

            if (element.type === 'radio') {
                if (element.checked) {
                    setNestedValue(collectedData, name, element.value);
                }
            } else if (element.type === 'checkbox') {
                if (element.checked) {
                    setNestedValue(collectedData, name, element.value);
                }
            } else {
                setNestedValue(collectedData, name, element.value);
            }
        });
        return collectedData;
    }

    // Mapeo para formatear títulos de campos en el resumen
    const fieldTitleMap = {
        'surname': 'Apellidos',
        'givenName': 'Nombres',
        'dob': 'Fecha de Nacimiento',
        'pobCity': 'Ciudad de Nacimiento',
        'pobStateProvince': 'Provincia/Estado de Nacimiento',
        'pobCountry': 'País de Nacimiento',
        'nationality': 'Nacionalidad',
        'otherNationality': '¿Tiene otra nacionalidad?',
        'otherNationalityCountry': 'País de la otra nacionalidad',
        'otherNationalityPassportNumber': 'Número de pasaporte de la otra nacionalidad',
        'gender': 'Género',
        'maritalStatus': 'Estado Civil',
        'otherNamesUsed': '¿Ha usado otros nombres?',
        'telecodeName': '¿Tiene nombre con telecódigo?',
        'telecodeSurname': 'Apellidos (Telecódigo)',
        'telecodeGivenName': 'Nombres (Telecódigo)',
        'passportNumber': 'Número de Pasaporte',
        'passportBookNumber': 'Número de Libro de Pasaporte',
        'passportIssueDate': 'Fecha de Emisión del Pasaporte',
        'passportExpiryDate': 'Fecha de Caducidad del Pasaporte',
        'passportIssuingCountry': 'País de Emisión del Pasaporte',
        'lostPassport': '¿Ha perdido/robado un pasaporte?',
        'lostPassportExplanation': 'Explicación del pasaporte perdido/robado',
        'addressLine1': 'Dirección Línea 1',
        'addressLine2': 'Dirección Línea 2',
        'city': 'Ciudad',
        'stateProvince': 'Provincia/Estado',
        'zipCode': 'Código Postal',
        'country': 'País de Residencia',
        'primaryPhone': 'Teléfono Principal',
        'secondaryPhone': 'Teléfono Secundario',
        'workPhone': 'Teléfono del Trabajo',
        'email': 'Correo Electrónico',
        'purpose': 'Propósito del Viaje',
        'specificPurpose': 'Propósito Específico',
        'arrivalDate': 'Fecha de Llegada Prevista',
        'stayDuration': 'Duración Prevista de la Estancia',
        'usAddress': 'Dirección en EE. UU.',
        'personPayingTravel': '¿Quién paga su viaje?',
        'otherPayerName': 'Nombre de quien paga',
        'otherPayerRelationship': 'Relación con quien paga',
        'otherPayerPhone': 'Teléfono de quien paga',
        'otherPayerAddress': 'Dirección de quien paga',
        'travelingWithOthers': '¿Viaja con otras personas?',
        'previousUsTravel': '¿Ha viajado a EE. UU. anteriormente?',
        'previousUsVisa': '¿Ha tenido una visa de EE. UU. anteriormente?',
        'previousUsVisaNumber': 'Número de visa anterior',
        'previousUsVisaType': 'Tipo de visa anterior',
        'previousUsVisaIssueDate': 'Fecha de emisión de visa anterior',
        'previousUsVisaExpiryDate': 'Fecha de caducidad de visa anterior',
        'previousUsVisaSameType': '¿Es la misma clase de visa?',
        'deniedUsVisa': '¿Le han denegado una visa de EE. UU. o entrada?',
        'deniedUsVisaExplanation': 'Explicación de denegación/entrada',
        'visaCancelled': '¿Se le ha cancelado/revocado una visa de EE. UU.?',
        'visaCancelledExplanation': 'Explicación de cancelación/revocación',
        'fatherSurname': 'Apellidos del Padre',
        'fatherGivenName': 'Nombres del Padre',
        'fatherDob': 'Fecha de Nacimiento del Padre',
        'fatherAddressSame': '¿Dirección del padre es la misma que la suya?',
        'fatherAddress': 'Dirección del Padre',
        'motherSurname': 'Apellidos de la Madre',
        'motherGivenName': 'Nombres de la Madre',
        'motherDob': 'Fecha de Nacimiento de la Madre',
        'motherAddressSame': '¿Dirección de la madre es la misma que la suya?',
        'motherAddress': 'Dirección de la Madre',
        'hasSpouse': '¿Tiene cónyuge?',
        'spouse.surname': 'Apellidos del Cónyuge',
        'spouse.givenName': 'Nombres del Cónyuge',
        'spouse.dob': 'Fecha de Nacimiento del Cónyuge',
        'spouse.nationality': 'Nacionalidad del Cónyuge',
        'spouse.pobCity': 'Ciudad de Nacimiento del Cónyuge',
        'spouse.pobCountry': 'País de Nacimiento del Cónyuge',
        'spouse.addressSame': '¿Dirección del cónyuge es la misma que la suya?',
        'spouse.address': 'Dirección del Cónyuge',
        'hasChildren': '¿Tiene hijos?',
        'usFamily': '¿Tiene familiares en EE. UU.?',
        'currentOccupation': 'Ocupación Actual',
        'employerName': 'Nombre del Empleador Actual',
        'employerAddress': 'Dirección del Empleador',
        'employerPhone': 'Teléfono del Empleador',
        'startDate': 'Fecha de Inicio en el Empleo Actual',
        'monthlySalary': 'Salario Mensual',
        'jobDescription': 'Descripción de sus funciones',
        'previousEmployment': '¿Ha tenido empleo anterior?',
        'highestEducation': 'Nivel educativo más alto',
        'languagesSpoken': 'Idiomas que habla',
        'countriesVisited': '¿Ha visitado otros países en los últimos cinco años?',
        'specializedSkills': '¿Tiene habilidades especializadas o entrenamiento?',
        'specializedSkillsDescription': 'Descripción de habilidades especializadas',
        'militaryService': '¿Ha servido en el ejército o fuerzas armadas?',
        'militaryCountry': 'País de servicio militar',
        'militaryBranch': 'Rama de servicio militar',
        'militaryRank': 'Rango militar',
        'militaryDuties': 'Funciones/especialidad militar',
        'militaryStartDate': 'Fecha de inicio del servicio militar',
        'militaryEndDate': 'Fecha de fin del servicio militar',
        'health': '¿Tiene algún trastorno de salud o es adicto?',
        'healthExplanation': 'Explicación de trastorno de salud/adicción',
        'drugAbuse': '¿Es o ha sido drogadicto o consumidor de drogas?',
        'drugAbuseExplanation': 'Explicación de abuso de drogas',
        'criminal': '¿Ha sido arrestado/condenado por algún delito?',
        'criminalExplanation': 'Explicación de antecedentes penales',
        'drugs': '¿Ha violado leyes de sustancias controladas?',
        'drugsExplanation': 'Explicación de delitos de drogas',
        'prostitution': '¿Involucrado en prostitución o trata de personas?',
        'prostitutionExplanation': 'Explicación de prostitución/trata',
        'moneyLaundering': '¿Ha estado involucrado en lavado de dinero?',
        'moneyLaunderingExplanation': 'Explicación de lavado de dinero',
        'humanTrafficking': '¿Ha estado involucrado en trata de personas?',
        'humanTraffickingExplanation': 'Explicación de trata de personas',
        'overstay': '¿Se ha quedado más tiempo del permitido en EE. UU.?',
        'overstayExplanation': 'Explicación de estancia excedida',
        'misrepresentation': '¿Ha buscado obtener visa/entrada por fraude/tergiversación?',
        'misrepresentationExplanation': 'Explicación de fraude/tergiversación',
        'deported': '¿Ha sido deportado de EE. UU.?',
        'deportedExplanation': 'Explicación de deportación',
        'terrorist': '¿Involucrado en actividades terroristas o miembro de organización terrorista?',
        'terroristExplanation': 'Explicación de actividades terroristas',
        'intendTerrorism': '¿Tiene intención de participar en actividades terroristas en EE. UU.?',
        'intendTerrorismExplanation': 'Explicación de intención terrorista',
        'terroristOrgMember': '¿Ha sido miembro/representante de organización terrorista?',
        'terroristOrgMemberExplanation': 'Explicación de membresía terrorista',
        'publicCharge': '¿Es sujeto de una "carga pública" en EE. UU.?',
        'publicChargeExplanation': 'Explicación de carga pública',
        'hasFunds': '¿Dispone de fondos suficientes?',
        'fundsExplanation': 'Explicación de financiación del viaje',
    };

    function formatSummaryValue(key, value) {
        if (value === 'Si') return 'Sí';
        if (value === 'No') return 'No';
        if (value === true) return 'Sí';
        if (value === false) return 'No';
        if (key.includes('Date') && value) {
            try {
                return new Date(value).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            } catch (e) {
                return value; // Fallback if date is invalid
            }
        }
        return value || 'No proporcionado';
    }

    function generateSummaryHtml(data, currentPath = '') {
        let html = '';
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key];
                const fullPath = currentPath ? `${currentPath}.${key}` : key;
                const displayTitle = fieldTitleMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    html += `<h3>${displayTitle}</h3>`;
                    html += generateSummaryHtml(value, fullPath);
                } else if (Array.isArray(value)) {
                    if (value.length > 0) {
                        html += `<h3>${displayTitle}</h3><ul>`;
                        value.forEach((item, index) => {
                            html += `<li><strong>${displayTitle} ${index + 1}:</strong>`;
                            if (typeof item === 'object' && item !== null) {
                                html += `<ul>`;
                                for (const subKey in item) {
                                    if (item.hasOwnProperty(subKey)) {
                                        const subDisplayTitle = fieldTitleMap[subKey] || subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                        html += `<li><strong>${subDisplayTitle}:</strong> ${formatSummaryValue(subKey, item[subKey])}</li>`;
                                    }
                                }
                                html += `</ul>`;
                            } else {
                                html += ` ${formatSummaryValue(key, item)}`;
                            }
                            html += `</li>`;
                        });
                        html += `</ul>`;
                    }
                } else {
                    html += `<p><strong>${displayTitle}:</strong> ${formatSummaryValue(key, value)}</p>`;
                }
            }
        }
        return html;
    }


    reviewAndSubmitBtn.addEventListener('click', (event) => {
        event.preventDefault(); // Evitar el envío directo del formulario

        const firstInvalidField = checkFormValidityAndGetFirstInvalid();
        if (firstInvalidField) {
            showModal("Error de Validación", "Por favor, complete todos los campos requeridos y corrija los errores antes de continuar.");
            firstInvalidField.focus(); // Enfocar el primer campo inválido
            // Desplazarse al campo si no está visible
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const formData = collectFormDataForSummary();
        if (formData) {
            summaryContent.innerHTML = generateSummaryHtml(formData);
            summaryModal.classList.add('show');
        } else {
            showModal("Error", "No se pudo recolectar la información del formulario. Asegúrese de haber seleccionado un país.");
        }
    });

    confirmAndDownloadBtn.addEventListener('click', () => {
        const selectedVisaType = document.querySelector('input[name="visaType"]:checked');
        const formData = collectFormDataForSummary(); // Recolectar de nuevo para asegurar la última versión

        if (!formData || !selectedVisaType) {
            showModal("Error", "No se pudo recolectar la información para descargar.");
            return;
        }

        const jsonData = JSON.stringify(formData, null, 2);
        console.log("Generated JSON Data for download:", jsonData);

        try {
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `datos_visado_cliente_${selectedVisaType.value}_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log("Download initiated successfully.");

            hideModal(summaryModal); // Cerrar el modal de resumen
            showModal("¡Formulario Enviado y Descargado!", `Los datos para la solicitud de Visa ${selectedVisaType.value} han sido recopilados y descargados como un archivo JSON. Por favor, envíe este archivo a su asesor.`);
        } catch (error) {
            console.error("Error during file download:", error);
            showModal("Error al Descargar", "Hubo un problema al intentar descargar el archivo. Por favor, intente de nuevo o contacte a soporte.");
        }
    });
});
