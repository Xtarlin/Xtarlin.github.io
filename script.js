document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('visaApplicationForm');
    const usaFormSections = document.getElementById('usaFormSections');
    const canadaFormSections = document.getElementById('canadaFormSections');
    const visaTypeRadios = document.querySelectorAll('input[name="visaType"]');
    const countrySelectionError = document.getElementById('countrySelectionError');
    const saveProgressBtn = document.getElementById('saveProgressBtn');
    const reviewAndSubmitBtn = document.getElementById('reviewAndSubmitBtn');

    // Modal de Mensajes Generales
    const customModal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const closeButtonSpan = customModal.querySelector('.close-button');

    // Modal de Resumen
    const summaryModal = document.getElementById('summaryModal');
    const summaryContent = document.getElementById('summaryContent');
    const summaryCloseButton = document.getElementById('summaryCloseButton');
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
        return;
    }
    console.log("Elementos principales del formulario encontrados.");


    // --- Funciones de Utilidad para Modales ---
    // Muestra el modal general con un título, mensaje y opcionalmente botones de confirmación.
    function showModal(title, message, isConfirmation = false, onConfirm = null) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        // Limpiar botones de confirmación previos
        const existingConfirmBtn = document.getElementById('modalConfirmBtn');
        if (existingConfirmBtn) existingConfirmBtn.remove();

        if (isConfirmation) {
            const confirmBtn = document.createElement('button');
            confirmBtn.id = 'modalConfirmBtn';
            confirmBtn.classList.add('modal-btn', 'primary-btn');
            confirmBtn.textContent = 'Sí, Cargar';
            confirmBtn.addEventListener('click', () => {
                hideModal(customModal);
                if (onConfirm) onConfirm();
            }, { once: true }); // Asegura que el evento se dispare solo una vez
            modalCloseBtn.textContent = 'No, Empezar de Nuevo';
            modalCloseBtn.parentNode.insertBefore(confirmBtn, modalCloseBtn); // Insertar antes del botón de cerrar
        } else {
            modalCloseBtn.textContent = 'Cerrar'; // Restablecer texto para alertas regulares
        }

        customModal.classList.add('show'); // Usar clase para mostrar con transición
    }

    // Oculta un modal específico eliminando la clase 'show'.
    function hideModal(modalElement) {
        modalElement.classList.remove('show');
    }

    // Event listeners para cerrar modales.
    modalCloseBtn.addEventListener('click', () => hideModal(customModal));
    closeButtonSpan.addEventListener('click', () => hideModal(customModal));
    summaryCloseButton.addEventListener('click', () => hideModal(summaryModal));
    editFormBtn.addEventListener('click', () => hideModal(summaryModal)); // Volver al formulario

    // Cierra el modal si se hace clic fuera de él.
    window.addEventListener('click', (event) => {
        if (event.target === customModal) {
            hideModal(customModal);
        }
        if (event.target === summaryModal) {
            hideModal(summaryModal);
        }
    });

    // --- Funciones para Manipulación de Datos ---
    // Establece un valor anidado en un objeto usando una ruta de cadena (ej. "usa.personalInfo.surname").
    function setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            const arrayMatch = part.match(/\[(\d+)\]$/); // Verifica si es un elemento de array (ej. "items[0]")

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

    // Obtiene un valor anidado de un objeto usando una ruta de cadena.
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
            if (value.trim() === '') return '';
            return isNaN(parseFloat(value)) ? 'Debe ser un número válido.' : '';
        },
        passport: (value) => {
            // Ejemplo básico: alfanumérico, 6-20 caracteres
            const re = /^[a-zA-Z0-9]{6,20}$/;
            return re.test(String(value)) ? '' : 'Formato de pasaporte inválido (6-20 caracteres alfanuméricos).';
        },
        zipcode: (value) => {
            const usaRe = /^\d{5}(?:[-\s]\d{4})?$/; // USA zip code regex
            const canRe = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/; // Canadian postal code regex
            // Check which country's form is active and validate accordingly
            const selectedVisaType = document.querySelector('input[name="visaType"]:checked')?.value;
            if (selectedVisaType === 'USA') {
                return usaRe.test(String(value)) ? '' : 'Formato de código postal de EE. UU. inválido (ej: 12345 o 12345-6789).';
            } else if (selectedVisaType === 'Canada') {
                return canRe.test(String(value)) ? '' : 'Formato de código postal canadiense inválido (ej: A1A 1A1).';
            }
            return 'Formato de código postal inválido.'; // Default if no country selected
        },
        year: (value) => {
            if (!value) return 'Este campo de año es requerido.';
            const year = parseInt(value, 10);
            return (year >= 1900 && year <= 2100) ? '' : 'Año inválido (AAAA).';
        },
        month: (value) => {
            if (!value) return 'Este campo de mes es requerido.';
            const month = parseInt(value, 10);
            return (month >= 1 && month <= 12) ? '' : 'Mes inválido (MM).';
        }
    };

    // Valida un elemento de entrada individual y muestra/oculta el mensaje de error.
    function validateInput(inputElement) {
        const validationType = inputElement.dataset.validationType;
        const errorMessageElement = inputElement.nextElementSibling; // Asume que el div.error-message es el siguiente hermano

        if (!errorMessageElement || !validationType) {
            return true; // No hay tipo de validación o elemento de mensaje de error, se considera válido
        }

        let errorMessage = '';
        const isOptional = inputElement.hasAttribute('data-optional');
        const isEmpty = inputElement.value.trim() === '';

        // Si el campo es requerido y está vacío y no es opcional, mostrar error de requerido.
        if (inputElement.hasAttribute('required') && isEmpty && !isOptional) {
            errorMessage = 'Este campo es requerido.';
        } else if (isEmpty && isOptional) {
            errorMessage = ''; // Los campos opcionales pueden estar vacíos
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

    // Adjuntar validación en tiempo real a todos los campos con el atributo `data-validation-type`.
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
    // Configura la visibilidad de un div basada en la selección de un radio button o un select.
    // `isInverse` es para lógicas donde "Sí" oculta la sección (ej. "misma dirección").
    function setupConditionalDisplay(controlName, targetDivId, requiredInputSelectors = ['input', 'select', 'textarea'], isInverse = false) {
        const controlElements = document.querySelectorAll(`input[name="${controlName}"], select[name="${controlName}"]`);
        const targetDiv = document.getElementById(targetDivId);

        if (!targetDiv) {
            console.warn(`Target div con ID '${targetDivId}' no encontrado para el control '${controlName}'.`);
            return;
        }

        const targetInputs = requiredInputSelectors.map(selector => Array.from(targetDiv.querySelectorAll(selector))).flat();

        const updateVisibility = (controlValue) => {
            let isYesChecked = false;
            // Determine if the "yes" condition is met based on control type
            if (controlElements.length > 0 && controlElements[0].type === 'radio') {
                isYesChecked = document.querySelector(`input[name="${controlName}"][value="Si"]`)?.checked;
            } else if (controlElements.length > 0 && controlElements[0].tagName === 'SELECT') {
                // Special handling for select elements, if the logic depends on specific values
                if (controlName === 'canada.imm5257e.personalInfo.maritalStatus') {
                    isYesChecked = (controlValue === 'Married' || controlValue === 'Common-Law');
                } else if (controlName === 'usa.workEduInfo.highestEducation') { // Example for USA section
                    isYesChecked = (controlValue === 'Otro' || controlValue === 'Universidad');
                } else {
                    isYesChecked = (controlValue === 'Si'); // Default for select if it behaves like a "Yes/No"
                }
            } else if (controlElements.length > 0 && controlElements[0].type === 'checkbox') {
                 // For checkboxes that control visibility, like "No Children"
                 // If `isInverse` is true (e.g., 'No Children' checkbox), `shouldShow` is true if checkbox is UNCHECKED
                isYesChecked = controlValue; // For a checkbox, value is its checked state
            }


            const shouldShow = isInverse ? !isYesChecked : isYesChecked;
            targetDiv.style.display = shouldShow ? 'block' : 'none';
            console.log(`Control '${controlName}' changed. Value: ${controlValue}. Section '${targetDivId}' ${shouldShow ? 'shown' : 'hidden'}.`);

            targetInputs.forEach(input => {
                if (shouldShow) {
                    const parentFormSection = targetDiv.closest('#usaFormSections, #canadaFormSections');
                    if (parentFormSection && parentFormSection.style.display !== 'none' && input.dataset.validationType && !input.hasAttribute('data-optional')) {
                        input.setAttribute('required', 'required');
                    }
                } else {
                    input.removeAttribute('required');
                    input.value = '';
                    if (input.type === 'radio') {
                        // Find the 'No' radio button in the same group and check it, if available
                        const noRadio = input.closest('.radio-group')?.querySelector(`input[name="${input.name}"][value="No"]`);
                        if (noRadio) {
                            noRadio.checked = true;
                        } else { // If no 'No' option, just uncheck
                            input.checked = false;
                        }
                    } else if (input.type === 'checkbox') {
                        input.checked = false;
                    } else if (input.tagName === 'SELECT') {
                        input.selectedIndex = 0; // Reset select to first option
                    }
                    input.classList.remove('invalid');
                    const errorMessageElement = input.nextElementSibling;
                    if (errorMessageElement && errorMessageElement.classList.contains('error-message')) {
                        errorMessageElement.textContent = '';
                        errorMessageElement.style.display = 'none';
                    }
                }
            });

            if (!shouldShow && targetDiv.id.includes('Container')) { // Clear dynamic children if container is hidden
                targetDiv.innerHTML = '';
            }
            updateProgressBar();
        };

        controlElements.forEach(control => {
            control.addEventListener('change', (event) => {
                let valueToCheck;
                if (event.target.type === 'radio' || event.target.tagName === 'SELECT') {
                    valueToCheck = event.target.value;
                } else if (event.target.type === 'checkbox') {
                    valueToCheck = event.target.checked;
                }
                updateVisibility(valueToCheck);
            });
        });

        // Initial state
        let initialValue;
        if (controlElements.length > 0 && controlElements[0].type === 'radio') {
            const initialCheckedRadio = document.querySelector(`input[name="${controlName}"]:checked`);
            initialValue = initialCheckedRadio ? initialCheckedRadio.value : '';
        } else if (controlElements.length > 0 && controlElements[0].tagName === 'SELECT') {
            initialValue = controlElements[0].value;
        } else if (controlElements.length > 0 && controlElements[0].type === 'checkbox') {
            initialValue = controlElements[0].checked;
        }
        updateVisibility(initialValue);
    }


    // Common (USA) Conditional Sections
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
    setupConditionalDisplay('usa.workEduInfo.highestEducation', 'educationDetails');
    setupConditionalDisplay('usa.workEduInfo.countriesVisited', 'countriesVisitedDetails');
    setupConditionalDisplay('usa.workEduInfo.specializedSkills', 'specializedSkillsDetails');
    setupConditionalDisplay('usa.workEduInfo.militaryService', 'militaryServiceDetails');
    setupConditionalDisplay('usa.securityInfo.health', 'healthDetails');
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
    setupConditionalDisplay('usa.familyInfo.fatherAddressSame', 'fatherAddressDetails', ['input', 'select', 'textarea'], true); // Inverse logic
    setupConditionalDisplay('usa.familyInfo.motherAddressSame', 'motherAddressDetails', ['input', 'select', 'textarea'], true); // Inverse logic
    setupConditionalDisplay('usa.familyInfo.spouse.addressSame', 'spouseAddressDetails', ['input', 'select', 'textarea'], true); // Inverse logic


    // Canada (IMM5257e) Conditional Sections - Updated from PDF
    setupConditionalDisplay('canada.imm5257e.personalInfo.otherNamesUsed', 'canadaOtherNamesDetails');
    setupConditionalDisplay('canada.imm5257e.personalInfo.prevResidenceCountries', 'canadaPrevResidenceCountriesDetails');
    setupConditionalDisplay('canada.imm5257e.personalInfo.maritalStatus', 'canadaMarriageDateDetails'); // Handled by specific event listener below for select
    setupConditionalDisplay('canada.imm5257e.personalInfo.prevMarried', 'canadaPrevMarriedDetails');
    setupConditionalDisplay('canada.imm5257e.personalInfo.applyingCountrySame', 'canadaApplyingCountryDetails', ['input', 'select', 'textarea'], true); // Inverse logic

    setupConditionalDisplay('canada.imm5257e.contactInfo.residentialAddressSame', 'canadaResidentialAddressDetails', ['input', 'select', 'textarea'], true); // Inverse logic

    setupConditionalDisplay('canada.imm5257e.languages.canCommunicateEnFr', 'canadaCanCommunicateEnFrDetails');
    setupConditionalDisplay('canada.imm5257e.languages.takenLanguageTest', 'canadaTakenLanguageTestDetails');

    setupConditionalDisplay('canada.imm5257e.nationalId.hasNationalId', 'canadaNationalIdDetails');
    setupConditionalDisplay('canada.imm5257e.usprCard.isUsPermanentResident', 'canadaUsprCardDetails');

    setupConditionalDisplay('canada.imm5257e.education.postSecondary', 'canadaPostSecondaryDetails');
    
    // Background Info (IMM5257e)
    setupConditionalDisplay('canada.imm5257e.backgroundInfo.tuberculosis', 'canadaTuberculosisDetails');
    setupConditionalDisplay('canada.imm5257e.backgroundInfo.physicalMentalDisorder', 'canadaPhysicalMentalDisorderDetails');
    setupConditionalDisplay('canada.imm5257e.backgroundInfo.violatedStatusCanada', 'canadaViolatedStatusCanadaDetails');
    setupConditionalDisplay('canada.imm5257e.backgroundInfo.refusedDeniedOrdered', 'canadaRefusedDeniedOrderedDetails');
    setupConditionalDisplay('canada.imm5257e.backgroundInfo.previouslyAppliedCanada', 'canadaPreviouslyAppliedCanadaDetails');
    setupConditionalDisplay('canada.imm5257e.backgroundInfo.criminalOffence', 'canadaCriminalOffenceDetails');
    setupConditionalDisplay('canada.imm5257e.backgroundInfo.militaryOrPoliceService', 'canadaMilitaryOrPoliceServiceDetails');
    setupConditionalDisplay('canada.imm5257e.backgroundInfo.violentOrgAffiliation', 'canadaViolentOrgAffiliationDetails');
    setupConditionalDisplay('canada.imm5257e.backgroundInfo.illTreatmentOrDesecration', 'canadaIllTreatmentOrDesecrationDetails');


    // Special handling for marital status select (IMM5257e)
    document.getElementById('canada.imm5257e.personalInfo.maritalStatus')?.addEventListener('change', (event) => {
        const maritalStatus = event.target.value;
        const marriageDateDetailsDiv = document.getElementById('canadaMarriageDateDetails');
        const spouseInputs = marriageDateDetailsDiv ? Array.from(marriageDateDetailsDiv.querySelectorAll('input, select, textarea')) : [];

        if (maritalStatus === 'Married' || maritalStatus === 'Common-Law') {
            marriageDateDetailsDiv.style.display = 'block';
            spouseInputs.forEach(input => {
                if (input.dataset.validationType && !input.hasAttribute('data-optional')) {
                    input.setAttribute('required', 'required');
                }
            });
        } else {
            marriageDateDetailsDiv.style.display = 'none';
            spouseInputs.forEach(input => {
                input.removeAttribute('required');
                input.value = '';
                input.classList.remove('invalid');
                const errorMessageElement = input.nextElementSibling;
                if (errorMessageElement && errorMessageElement.classList.contains('error-message')) {
                    errorMessageElement.textContent = '';
                    errorMessageElement.style.display = 'none';
                }
            });
        }
        updateProgressBar();
    });
    // Trigger initial state for marital status on load
    document.getElementById('canada.imm5257e.personalInfo.maritalStatus')?.dispatchEvent(new Event('change'));

    // Canada (IMM5707e) Conditional Sections - Assuming these are checkboxes or radios
    // For IMM5707e, Family Information
    setupConditionalDisplay('canada.imm5707e.familyInfo.hasSpouse', 'canadaSpouseDetailsIMM5707e');
    setupConditionalDisplay('canada.imm5707e.familyInfo.hasMother', 'canadaMotherDetailsIMM5707e');
    setupConditionalDisplay('canada.imm5707e.familyInfo.hasFather', 'canadaFatherDetailsIMM5707e');
    // Children logic: if "No Children" is checked, hide dynamic children section.
    setupConditionalDisplay('canada.imm5707e.familyInfo.noChildren', 'canadaChildrenDetailsIMM5707e', ['input', 'select', 'textarea'], true); // Inverse logic


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
            const fieldId = `${containerId.replace('Container', '')}_${field.nameSuffix}_${counter}`; // Unique ID for dynamic fields
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
            } else if (field.type === 'radio') {
                // For radio groups within dynamic fields
                inputHtml = `<div class="radio-group">${field.options.map(opt => `
                    <input type="radio" id="${fieldId}${opt.value}" name="${fieldName}" value="${opt.value}" ${fieldValue === opt.value ? 'checked' : ''} ${isRequired} ${optionalAttr}>
                    <label for="${fieldId}${opt.value}">${opt.text}</label>
                `).join('')}</div>`;
            }
            else {
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
            updateProgressBar();
        });

        // If the added dynamic field contains radios or selects, ensure their change events also trigger progress bar update
        entryDiv.querySelectorAll('input[type="radio"], select').forEach(control => {
            control.addEventListener('change', updateProgressBar);
        });

        return entryDiv;
    }

    // Re-indexa los campos dinámicos después de añadir/eliminar para mantener nombres únicos y ordenados.
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
                // Ensure the name starts with the namePrefix to avoid re-indexing unrelated elements
                if (oldName && oldName.startsWith(namePrefix)) {
                    const parts = oldName.split('.');
                    // Find the part that contains the array index (e.g., 'otherNames[0]')
                    const arrayPartIndex = parts.findIndex(part => part.match(/^(.+)\[\d+\]$/));

                    if (arrayPartIndex !== -1) {
                        const arrayPart = parts[arrayPartIndex];
                        const arrayNameMatch = arrayPart.match(/^(.+)\[\d+\]$/);
                        const arrayName = arrayNameMatch ? arrayNameMatch[1] : '';

                        if (arrayName) {
                             // Reconstruct the new name with the correct index
                            let newNameParts = [...parts];
                            newNameParts[arrayPartIndex] = `${arrayName}[${index}]`;
                            const newName = newNameParts.join('.');
                            input.setAttribute('name', newName);

                            // Update ID as well if it follows a similar pattern
                            // This specifically targets IDs like "containerPrefix_fieldSuffix_index"
                            const oldId = input.id;
                            const idParts = oldId.split('_');
                            if (idParts.length >= 3) { // Expect at least prefix, suffix, and index
                                const idSuffix = idParts[idParts.length - 2]; // Get the field suffix part
                                const idPrefix = idParts.slice(0, idParts.length - 2).join('_'); // Get the container prefix
                                input.id = `${idPrefix}_${idSuffix}_${index + 1}`;
                                const label = entryDiv.querySelector(`label[for="${oldId}"]`);
                                if (label) label.setAttribute('for', input.id);

                                // If it's a radio button within a dynamic group, update its label 'for' attribute
                                if (input.type === 'radio') {
                                     const radioLabel = entryDiv.querySelector(`label[for="${oldId}"]`);
                                     if(radioLabel) radioLabel.setAttribute('for', input.id);
                                }
                            }
                        }
                    }
                }
            });
        });
    }

    // Dynamic fields for USA (Existing)
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


    // Dynamic fields for Canada (New/Updated)
    document.getElementById('canadaAddOtherNameBtn')?.addEventListener('click', () => {
        createDynamicEntry('canadaOtherNamesContainer', 'canada.imm5257e.personalInfo.otherNames', [
            { idPrefix: 'canadaOtherNameSurname', nameSuffix: 'surname', label: 'Apellidos (Otros)', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'canadaOtherNameGivenName', nameSuffix: 'givenName', label: 'Nombres (Otros)', type: 'text', required: true, validationType: 'text' },
        ], 'Otro Nombre (Canadá)');
    });

    document.getElementById('canadaAddPrevResidenceCountryBtn')?.addEventListener('click', () => {
        createDynamicEntry('canadaPrevResidenceCountriesContainer', 'canada.imm5257e.personalInfo.prevResidenceHistory', [
            { idPrefix: 'canadaPrevResCountry', nameSuffix: 'country', label: 'País o Territorio', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'canadaPrevResStatus', nameSuffix: 'status', label: 'Estatus', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'canadaPrevResOther', nameSuffix: 'other', label: 'Otro (si aplica)', type: 'text', optional: true, validationType: 'text' },
            { idPrefix: 'canadaPrevResFrom', nameSuffix: 'from', label: 'Desde (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
            { idPrefix: 'canadaPrevResTo', nameSuffix: 'to', label: 'Hasta (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
        ], 'País de Residencia Anterior');
    });

    document.getElementById('canadaAddPrevMarriedBtn')?.addEventListener('click', () => {
        createDynamicEntry('canadaPrevMarriedContainer', 'canada.imm5257e.personalInfo.previousMarriages', [
            { idPrefix: 'prevSpouseSurname', nameSuffix: 'surname', label: 'Apellidos del Cónyuge/Pareja', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'prevSpouseGivenName', nameSuffix: 'givenName', label: 'Nombres del Cónyuge/Pareja', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'prevSpouseDob', nameSuffix: 'dob', label: 'Fecha de Nacimiento (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
            { idPrefix: 'prevSpouseRelationshipType', nameSuffix: 'relationshipType', label: 'Tipo de Relación', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'prevSpouseFromDate', nameSuffix: 'fromDate', label: 'Desde (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
            { idPrefix: 'prevSpouseToDate', nameSuffix: 'toDate', label: 'Hasta (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
        ], 'Pareja/Cónyuge Anterior');
    });

    document.getElementById('canadaAddVisitContactBtn')?.addEventListener('click', () => {
        createDynamicEntry('canadaVisitContactsContainer', 'canada.imm5257e.travelInfo.visitContacts', [
            { idPrefix: 'visitContactName', nameSuffix: 'name', label: 'Nombre', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'visitContactRelationship', nameSuffix: 'relationship', label: 'Relación', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'visitContactAddress', nameSuffix: 'address', label: 'Dirección en Canadá', type: 'text', required: true, validationType: 'text' },
        ], 'Contacto a Visitar');
    });

    document.getElementById('canadaAddPostSecondaryBtn')?.addEventListener('click', () => {
        createDynamicEntry('canadaPostSecondaryContainer', 'canada.imm5257e.education.postSecondaryHistory', [
            { idPrefix: 'eduFromYear', nameSuffix: 'fromYear', label: 'Desde (Año - AAAA)', type: 'number', required: true, validationType: 'year', placeholder: 'AAAA' },
            { idPrefix: 'eduFromMonth', nameSuffix: 'fromMonth', label: 'Desde (Mes - MM)', type: 'number', required: true, validationType: 'month', placeholder: 'MM' },
            { idPrefix: 'eduToYear', nameSuffix: 'toYear', label: 'Hasta (Año - AAAA)', type: 'number', required: true, validationType: 'year', placeholder: 'AAAA' },
            { idPrefix: 'eduToMonth', nameSuffix: 'toMonth', label: 'Hasta (Mes - MM)', type: 'number', required: true, validationType: 'month', placeholder: 'MM' },
            { idPrefix: 'eduFieldOfStudy', nameSuffix: 'fieldOfStudy', label: 'Campo de Estudio', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'eduSchoolName', nameSuffix: 'schoolName', label: 'Nombre de la Institución', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'eduCityTown', nameSuffix: 'cityTown', label: 'Ciudad/Pueblo', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'eduCountryTerritory', nameSuffix: 'countryTerritory', label: 'País o Territorio', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'eduProvinceState', nameSuffix: 'provinceState', label: 'Provincia/Estado (Opcional)', type: 'text', optional: true, validationType: 'text' },
        ], 'Educación Post-Secundaria');
    });

    document.getElementById('canadaAddPreviousEmployerBtn')?.addEventListener('click', () => {
        createDynamicEntry('canadaPreviousEmploymentContainer', 'canada.imm5257e.employment.previousEmploymentHistory', [
            { idPrefix: 'prevEmpFromYear', nameSuffix: 'fromYear', label: 'Desde (Año - AAAA)', type: 'number', required: true, validationType: 'year', placeholder: 'AAAA' },
            { idPrefix: 'prevEmpFromMonth', nameSuffix: 'fromMonth', label: 'Desde (Mes - MM)', type: 'number', required: true, validationType: 'month', placeholder: 'MM' },
            { idPrefix: 'prevEmpToYear', nameSuffix: 'toYear', label: 'Hasta (Año - AAAA)', type: 'number', required: true, validationType: 'year', placeholder: 'AAAA' },
            { idPrefix: 'prevEmpToMonth', nameSuffix: 'toMonth', label: 'Hasta (Mes - MM)', type: 'number', required: true, validationType: 'month', placeholder: 'MM' },
            { idPrefix: 'prevEmpActivity', nameSuffix: 'activityOccupation', label: 'Actividad/Ocupación', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'prevEmpCityTown', nameSuffix: 'cityTown', label: 'Ciudad/Pueblo', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'prevEmpCountryTerritory', nameSuffix: 'countryTerritory', label: 'País o Territorio', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'prevEmpCompanyName', nameSuffix: 'companyEmployerFacilityName', label: 'Nombre de la Compañía/Empleador', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'prevEmpProvinceState', nameSuffix: 'provinceState', label: 'Provincia/Estado (Opcional)', type: 'text', optional: true, validationType: 'text' },
        ], 'Empleo Anterior');
    });

    // Dynamic fields for IMM5707e family details
    document.getElementById('canadaAddChildBtnIMM5707e')?.addEventListener('click', () => {
        createDynamicEntry('canadaChildrenContainerIMM5707e', 'canada.imm5707e.familyInfo.children', [
            {
                idPrefix: 'childAccompany', nameSuffix: 'accompanyToCanada', label: '¿Acompañará a Canadá?', type: 'radio', required: true,
                options: [{ value: 'Si', text: 'Sí' }, { value: 'No', text: 'No' }]
            },
            { idPrefix: 'childRelationship', nameSuffix: 'relationship', label: 'Parentesco', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'childSurname', nameSuffix: 'surname', label: 'Apellidos', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'childGivenName', nameSuffix: 'givenName', label: 'Nombres', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'childDob', nameSuffix: 'dob', label: 'Fecha de Nacimiento (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
            { idPrefix: 'childPobCountry', nameSuffix: 'pobCountry', label: 'País o Territorio de Nacimiento', type: 'text', required: true, validationType: 'text' },
            { idPrefix: 'childPresentAddress', nameSuffix: 'presentAddress', label: 'Dirección Actual (si fallecido, Ciudad, País, Fecha de Fallecimiento)', tag: 'textarea', rows: 2, required: true, validationType: 'text' },
            {
                idPrefix: 'childMaritalStatus', nameSuffix: 'maritalStatus', label: 'Estado Civil', tag: 'select', required: true,
                options: [
                    { value: '', text: 'Seleccione...' },
                    { value: 'Annulled Marriage', text: 'Matrimonio Anulado' },
                    { value: 'Common-Law', text: 'Unión Libre' },
                    { value: 'Divorced', text: 'Divorciado' },
                    { value: 'Legally Separated', text: 'Separado Legalmente' },
                    { value: 'Married', text: 'Casado' },
                    { value: 'Single', text: 'Soltero' },
                    { value: 'Widowed', text: 'Viudo' },
                ]
            },
            { idPrefix: 'childOccupation', nameSuffix: 'occupation', label: 'Ocupación Actual', type: 'text', required: true, validationType: 'text' },
        ], 'Hijo');
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
                    const parentConditionalSection = el.closest('.conditional-section');
                    if (parentConditionalSection) {
                        if (parentConditionalSection.style.display === 'none') {
                            el.removeAttribute('required');
                        } else {
                            if (el.dataset.validationType && !el.hasAttribute('data-optional')) {
                                el.setAttribute('required', 'required');
                            }
                        }
                    } else {
                        if (isRequired) {
                            if (el.dataset.validationType && !el.hasAttribute('data-optional')) {
                                el.setAttribute('required', 'required');
                            }
                        } else {
                            el.removeAttribute('required');
                        }
                    }

                    if (!isRequired) {
                        el.value = '';
                        if (el.type === 'radio') {
                            const noRadio = el.closest('.radio-group')?.querySelector(`input[name="${el.name}"][value="No"]`);
                            if (noRadio) {
                                noRadio.checked = true;
                            } else {
                                el.checked = false;
                            }
                        } else if (el.type === 'checkbox') {
                            el.checked = false;
                        } else if (el.tagName === 'SELECT') {
                             el.selectedIndex = 0; // Reset select to first option
                        }
                        el.classList.remove('invalid');
                        const errorMessageElement = el.nextElementSibling;
                        if (errorMessageElement && errorMessageElement.classList.contains('error-message')) {
                            errorMessageElement.textContent = '';
                            errorMessageElement.style.display = 'none';
                        }
                    }
                });

                if (isRequired) {
                    // Trigger change events for radios and selects to re-evaluate conditional sections
                    section.querySelectorAll('input[type="radio"], select').forEach(control => {
                        if (control.type === 'radio' && control.checked) {
                            control.dispatchEvent(new Event('change'));
                        } else if (control.tagName === 'SELECT') {
                            control.dispatchEvent(new Event('change'));
                        }
                    });
                }
            };

            if (document.getElementById('visaTypeUSA').checked) {
                if (usaFormSections) {
                    usaFormSections.style.display = 'block';
                    toggleRequiredAndValidation(usaFormSections, true);
                }
                if (canadaFormSections) {
                    canadaFormSections.style.display = 'none';
                    toggleRequiredAndValidation(canadaFormSections, false);
                }
            } else if (document.getElementById('visaTypeCanada').checked) {
                if (usaFormSections) {
                    usaFormSections.style.display = 'none';
                    toggleRequiredAndValidation(usaFormSections, false);
                }
                if (canadaFormSections) {
                    canadaFormSections.style.display = 'block';
                    toggleRequiredAndValidation(canadaFormSections, true);
                }
            }
            updateProgressBar();
        });
    });

    // Estado inicial: ocultar formularios y barra de progreso al cargar la página.
    if (usaFormSections) usaFormSections.style.display = 'none';
    if (canadaFormSections) canadaFormSections.style.display = 'none';
    if (progressBarContainer) progressBarContainer.style.display = 'none';

    // Actualiza la barra de progreso en función de los campos visibles y requeridos.
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
        const selectGroupNames = new Set(); // Para evitar contar select múltiples veces si la lógica lo requiriera (actualmente no lo hace)

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
                totalVisibleRequiredFields++; // Each checkbox counts as one field for simplicity
                if (element.checked) {
                    filledVisibleRequiredFields++;
                }
            } else if (element.tagName === 'SELECT') {
                totalVisibleRequiredFields++;
                if (element.value.trim() !== '' && element.value !== element.querySelector('option[value=""]').value) { // Check if a meaningful option is selected
                    filledVisibleRequiredFields++;
                }
            }
            else { // Text, number, date, textarea, etc.
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

    // Valida todo el formulario y devuelve el primer campo inválido (si existe).
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

        // Iterar sobre todos los elementos de entrada dentro de la sección activa
        currentFormSection.querySelectorAll('input, select, textarea').forEach(input => {
            const parentConditionalSection = input.closest('.conditional-section');
            // Solo validar si el campo no está en una sección condicional oculta
            if (!parentConditionalSection || parentConditionalSection.style.display !== 'none') {
                // Solo validar campos requeridos o con tipo de validación específico y no opcionales
                if (input.hasAttribute('required') || (input.dataset.validationType && !input.hasAttribute('data-optional'))) {
                    if (!validateInput(input)) {
                        if (!firstInvalidField) {
                            firstInvalidField = input; // Guardar el primer campo inválido encontrado
                        }
                    }
                }
            }
        });
        return firstInvalidField;
    }


    // --- Guardar y Cargar Progreso ---

    // Guarda el progreso del formulario en localStorage.
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
                setNestedValue(formDataToSave, name, element.checked ? element.value : ''); // Guardar true/false o valor
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

    // Carga los datos del formulario guardados desde localStorage.
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

            // Función auxiliar para poblar un campo individual.
            const populateField = (path, value) => {
                const element = form.querySelector(`[name="${path}"]`);
                if (element) {
                    if (element.type === 'radio') {
                        if (element.value === value) {
                            element.checked = true;
                            // Do not dispatch change event here for conditional radios; will be handled later globally
                        }
                    } else if (element.type === 'checkbox') {
                        element.checked = (value === element.value || value === true);
                    } else {
                        element.value = value;
                    }
                    // Trigger input event to update progress bar and potential real-time validation feedback
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }
            };

            // Mapeo para información de campos dinámicos para recrearlos correctamente.
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
                ], titlePrefix: 'Compañero', controllingRadioName: 'usa.travelInfo.travelingWithOthers'},
                'usa.familyInfo.usFamilyMembers': { id: 'usFamilyContainer', fields: [
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

                // Canada Dynamic Fields (IMM5257e)
                'canada.imm5257e.personalInfo.otherNames': { id: 'canadaOtherNamesContainer', fields: [
                    { idPrefix: 'canadaOtherNameSurname', nameSuffix: 'surname', label: 'Apellidos (Otros)', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'canadaOtherNameGivenName', nameSuffix: 'givenName', label: 'Nombres (Otros)', type: 'text', required: true, validationType: 'text' },
                ], titlePrefix: 'Otro Nombre (Canadá)', controllingRadioName: 'canada.imm5257e.personalInfo.otherNamesUsed'},
                'canada.imm5257e.personalInfo.prevResidenceHistory': { id: 'canadaPrevResidenceCountriesContainer', fields: [
                    { idPrefix: 'canadaPrevResCountry', nameSuffix: 'country', label: 'País o Territorio', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'canadaPrevResStatus', nameSuffix: 'status', label: 'Estatus', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'canadaPrevResOther', nameSuffix: 'other', label: 'Otro (si aplica)', type: 'text', optional: true, validationType: 'text' },
                    { idPrefix: 'canadaPrevResFrom', nameSuffix: 'from', label: 'Desde (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
                    { idPrefix: 'canadaPrevResTo', nameSuffix: 'to', label: 'Hasta (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
                ], titlePrefix: 'País de Residencia Anterior', controllingRadioName: 'canada.imm5257e.personalInfo.prevResidenceCountries'},
                 'canada.imm5257e.personalInfo.previousMarriages': { id: 'canadaPrevMarriedContainer', fields: [
                    { idPrefix: 'prevSpouseSurname', nameSuffix: 'surname', label: 'Apellidos del Cónyuge/Pareja', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'prevSpouseGivenName', nameSuffix: 'givenName', label: 'Nombres del Cónyuge/Pareja', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'prevSpouseDob', nameSuffix: 'dob', label: 'Fecha de Nacimiento (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
                    { idPrefix: 'prevSpouseRelationshipType', nameSuffix: 'relationshipType', label: 'Tipo de Relación', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'prevSpouseFromDate', nameSuffix: 'fromDate', label: 'Desde (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
                    { idPrefix: 'prevSpouseToDate', nameSuffix: 'toDate', label: 'Hasta (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
                ], titlePrefix: 'Pareja/Cónyuge Anterior', controllingRadioName: 'canada.imm5257e.personalInfo.prevMarried'},
                'canada.imm5257e.travelInfo.visitContacts': { id: 'canadaVisitContactsContainer', fields: [
                    { idPrefix: 'visitContactName', nameSuffix: 'name', label: 'Nombre', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'visitContactRelationship', nameSuffix: 'relationship', label: 'Relación', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'visitContactAddress', nameSuffix: 'address', label: 'Dirección en Canadá', type: 'text', required: true, validationType: 'text' },
                ], titlePrefix: 'Contacto a Visitar', controllingRadioName: null}, // No direct radio controlling this
                'canada.imm5257e.education.postSecondaryHistory': { id: 'canadaPostSecondaryContainer', fields: [
                    { idPrefix: 'eduFromYear', nameSuffix: 'fromYear', label: 'Desde (Año - AAAA)', type: 'number', required: true, validationType: 'year', placeholder: 'AAAA' },
                    { idPrefix: 'eduFromMonth', nameSuffix: 'fromMonth', label: 'Desde (Mes - MM)', type: 'number', required: true, validationType: 'month', placeholder: 'MM' },
                    { idPrefix: 'eduToYear', nameSuffix: 'toYear', label: 'Hasta (Año - AAAA)', type: 'number', required: true, validationType: 'year', placeholder: 'AAAA' },
                    { idPrefix: 'eduToMonth', nameSuffix: 'toMonth', label: 'Hasta (Mes - MM)', type: 'number', required: true, validationType: 'month', placeholder: 'MM' },
                    { idPrefix: 'eduFieldOfStudy', nameSuffix: 'fieldOfStudy', label: 'Campo de Estudio', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'eduSchoolName', nameSuffix: 'schoolName', label: 'Nombre de la Institución', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'eduCityTown', nameSuffix: 'cityTown', label: 'Ciudad/Pueblo', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'eduCountryTerritory', nameSuffix: 'countryTerritory', label: 'País o Territorio', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'eduProvinceState', nameSuffix: 'provinceState', label: 'Provincia/Estado (Opcional)', type: 'text', optional: true, validationType: 'text' },
                ], titlePrefix: 'Educación Post-Secundaria', controllingRadioName: 'canada.imm5257e.education.postSecondary'},
                'canada.imm5257e.employment.previousEmploymentHistory': { id: 'canadaPreviousEmploymentContainer', fields: [
                    { idPrefix: 'prevEmpFromYear', nameSuffix: 'fromYear', label: 'Desde (Año - AAAA)', type: 'number', required: true, validationType: 'year', placeholder: 'AAAA' },
                    { idPrefix: 'prevEmpFromMonth', nameSuffix: 'fromMonth', label: 'Desde (Mes - MM)', type: 'number', required: true, validationType: 'month', placeholder: 'MM' },
                    { idPrefix: 'prevEmpToYear', nameSuffix: 'toYear', label: 'Hasta (Año - AAAA)', type: 'number', required: true, validationType: 'year', placeholder: 'AAAA' },
                    { idPrefix: 'prevEmpToMonth', nameSuffix: 'toMonth', label: 'Hasta (Mes - MM)', type: 'number', required: true, validationType: 'month', placeholder: 'MM' },
                    { idPrefix: 'prevEmpActivity', nameSuffix: 'activityOccupation', label: 'Actividad/Ocupación', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'prevEmpCityTown', nameSuffix: 'cityTown', label: 'Ciudad/Pueblo', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'prevEmpCountryTerritory', nameSuffix: 'countryTerritory', label: 'País o Territorio', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'prevEmpCompanyName', nameSuffix: 'companyEmployerFacilityName', label: 'Nombre de la Compañía/Empleador', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'prevEmpProvinceState', nameSuffix: 'provinceState', label: 'Provincia/Estado (Opcional)', type: 'text', optional: true, validationType: 'text' },
                ], titlePrefix: 'Empleo Anterior', controllingRadioName: 'canada.imm5257e.employment.previousEmployment'},
                // Canada Dynamic Fields (IMM5707e)
                'canada.imm5707e.familyInfo.children': { id: 'canadaChildrenContainerIMM5707e', fields: [
                    {
                        idPrefix: 'childAccompany', nameSuffix: 'accompanyToCanada', label: '¿Acompañará a Canadá?', type: 'radio', required: true,
                        options: [{ value: 'Si', text: 'Sí' }, { value: 'No', text: 'No' }]
                    },
                    { idPrefix: 'childRelationship', nameSuffix: 'relationship', label: 'Parentesco', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'childSurname', nameSuffix: 'surname', label: 'Apellidos', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'childGivenName', nameSuffix: 'givenName', label: 'Nombres', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'childDob', nameSuffix: 'dob', label: 'Fecha de Nacimiento (AAAA-MM-DD)', type: 'date', required: true, validationType: 'date' },
                    { idPrefix: 'childPobCountry', nameSuffix: 'pobCountry', label: 'País o Territorio de Nacimiento', type: 'text', required: true, validationType: 'text' },
                    { idPrefix: 'childPresentAddress', nameSuffix: 'presentAddress', label: 'Dirección Actual (si fallecido, Ciudad, País, Fecha de Fallecimiento)', tag: 'textarea', rows: 2, required: true, validationType: 'text' },
                    {
                        idPrefix: 'childMaritalStatus', nameSuffix: 'maritalStatus', label: 'Estado Civil', tag: 'select', required: true,
                        options: [
                            { value: '', text: 'Seleccione...' },
                            { value: 'Annulled Marriage', text: 'Matrimonio Anulado' },
                            { value: 'Common-Law', text: 'Unión Libre' },
                            { value: 'Divorced', text: 'Divorciado' },
                            { value: 'Legally Separated', text: 'Separado Legalmente' },
                            { value: 'Married', text: 'Casado' },
                            { value: 'Single', text: 'Soltero' },
                            { value: 'Widowed', text: 'Viudo' },
                        ]
                    },
                    { idPrefix: 'childOccupation', nameSuffix: 'occupation', label: 'Ocupación Actual', type: 'text', required: true, validationType: 'text' },
                ], titlePrefix: 'Hijo', controllingRadioName: 'canada.imm5707e.familyInfo.noChildren', inverseControllingRadio: true}, // inverse logic: if noChildren is true, hide
            };

            // Función recursiva para recorrer y poblar el formulario desde los datos cargados.
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
                                    // Asegurar que el radio/checkbox que controla esta sección dinámica esté marcado/desmarcado
                                    if (dynamicInfo.controllingRadioName) {
                                        const controllingElement = document.querySelector(`[name="${dynamicInfo.controllingRadioName}"]`);
                                        if (controllingElement) {
                                            if (controllingElement.type === 'radio') {
                                                const radioYes = document.querySelector(`input[name="${dynamicInfo.controllingRadioName}"][value="Si"]`);
                                                if(radioYes) radioYes.checked = true;
                                            } else if (controllingElement.type === 'checkbox') {
                                                if (dynamicInfo.inverseControllingRadio) {
                                                    controllingElement.checked = false; // Uncheck 'No Children' to show children
                                                } else {
                                                    controllingElement.checked = true;
                                                }
                                            }
                                            controllingElement.dispatchEvent(new Event('change')); // Trigger change to show/hide section
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

    // Verificar si hay datos guardados al cargar la página y preguntar al usuario si desea cargarlos.
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

    // Función para recolectar todos los datos del formulario (solo campos visibles y relevantes).
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

    // Mapeo para formatear títulos de campos en el resumen (para una mejor legibilidad).
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
        'health': '¿Tiene algún trastorno físico o mental, o es usted un consumidor de drogas o adicto?',
        'healthExplanation': 'Explicación de trastorno de salud/adicción',
        'drugAbuse': '¿Es o ha sido drogadicto o consumidor de drogas?',
        'drugAbuseExplanation': 'Explicación de abuso de drogas',
        'criminal': '¿Ha sido arrestado o condenado por algún delito, o ha cometido un delito?',
        'criminalExplanation': 'Explicación de antecedentes penales',
        'drugs': '¿Ha violado alguna ley relacionada con sustancias controladas?',
        'drugsExplanation': 'Explicación de delitos de drogas',
        'prostitution': '¿Alguna vez ha estado involucrado en la prostitución o la trata de personas?',
        'prostitutionExplanation': 'Explicación de prostitución/trata',
        'moneyLaundering': '¿Ha estado involucrado en el lavado de dinero?',
        'moneyLaunderingExplanation': 'Explicación de lavado de dinero',
        'humanTrafficking': '¿Ha estado involucrado en la trata de personas?',
        'humanTraffickingExplanation': 'Explicación de trata de personas',
        'overstay': '¿Alguna vez se ha quedado más tiempo del permitido en EE. UU. o ha violado los términos de una visa de EE. UU.?',
        'overstayExplanation': 'Explicación de estancia excedida',
        'misrepresentation': '¿Ha buscado obtener o ha ayudado a otros a obtener una visa o entrada a EE. UU. mediante fraude o tergiversación intencional de un hecho material?',
        'misrepresentationExplanation': 'Explicación de fraude/tergiversación',
        'deported': '¿Alguna vez ha sido deportado de EE. UU. o se le ha negado la entrada a EE. UU. y se le ha ordenado que se marche?',
        'deportedExplanation': 'Explicación de deportación',
        'terrorist': '¿Ha estado involucrado en actividades terroristas o es miembro de una organización terrorista?',
        'terroristExplanation': 'Explicación de actividades terroristas',
        'intendTerrorism': '¿Tiene la intención de participar en actividades terroristas en EE. UU.?',
        'intendTerrorismExplanation': 'Explicación de intención terrorista',
        'terroristOrgMember': '¿Ha sido miembro o representante de una organización terrorista?',
        'terroristOrgMemberExplanation': 'Explicación de membresía terrorista',
        'publicCharge': '¿Es usted sujeto de una "carga pública" en EE. UU.?',
        'publicChargeExplanation': 'Explicación de carga pública',

        // Canada IMM5257e Fields
        'currentMailingAddress.poBox': 'P.O. box (Dirección Actual)',
        'currentMailingAddress.aptUnit': 'Apt/Unit (Dirección Actual)',
        'currentMailingAddress.streetNo': 'Street no. (Dirección Actual)',
        'currentMailingAddress.streetName': 'Street name (Dirección Actual)',
        'currentMailingAddress.cityTown': 'Ciudad/Pueblo (Dirección Actual)',
        'currentMailingAddress.countryTerritory': 'País o Territorio (Dirección Actual)',
        'currentMailingAddress.provinceState': 'Provincia/Estado (Dirección Actual)',
        'currentMailingAddress.postalCode': 'Código Postal (Dirección Actual)',
        'currentMailingAddress.district': 'Distrito (Dirección Actual)',
        'residentialAddressSame': '¿Dirección residencial es la misma que la de correo?',
        'residentialAddress.aptUnit': 'Apt/Unit (Dirección Residencial)',
        'residentialAddress.streetNo': 'Street no. (Dirección Residencial)',
        'residentialAddress.streetName': 'Street name (Dirección Residencial)',
        'residentialAddress.cityTown': 'Ciudad/Pueblo (Dirección Residencial)',
        'residentialAddress.countryTerritory': 'País o Territorio (Dirección Residencial)',
        'residentialAddress.provinceState': 'Provincia/Estado (Dirección Residencial)',
        'residentialAddress.postalCode': 'Código Postal (Dirección Residencial)',
        'residentialAddress.district': 'Distrito (Dirección Residencial)',
        'telephoneNo.type': 'Tipo de Teléfono Principal',
        'telephoneNo.countryCode': 'Código de País (Teléfono Principal)',
        'telephoneNo.number': 'Número de Teléfono Principal',
        'telephoneNo.ext': 'Ext. (Teléfono Principal)',
        'alternateTelephoneNo.type': 'Tipo de Teléfono Alternativo',
        'alternateTelephoneNo.countryCode': 'Código de País (Teléfono Alternativo)',
        'alternateTelephoneNo.number': 'Número de Teléfono Alternativo',
        'alternateTelephoneNo.ext': 'Ext. (Teléfono Alternativo)',
        'faxNo.countryCode': 'Código de País (Fax)',
        'faxNo.number': 'Número de Fax',
        'faxNo.ext': 'Ext. (Fax)',
        'emailAddress': 'Correo Electrónico',
        'purposeOfVisit': 'Propósito de la Visita',
        'otherPurpose': 'Otro Propósito',
        'stayFromDate': 'Desde (Estancia)',
        'stayToDate': 'Hasta (Estancia)',
        'fundsAvailable': 'Fondos Disponibles para la Estancia (CAD)',
        'postSecondary': '¿Ha tenido educación post-secundaria?',
        'currentActivityOccupation': 'Actividad/Ocupación Actual',
        'programStartDate': 'Fecha de Inicio del Programa',
        'programEndDate': 'Fecha de Fin del Programa',
        'companyEmployerFacilityName': 'Nombre de la Compañía/Empleador/Facilidad',
        'currentCityTown': 'Ciudad/Pueblo Actual',
        'currentCountryTerritory': 'País o Territorio Actual',
        'currentProvinceState': 'Provincia/Estado Actual',
        'tuberculosis': '¿Ha tenido tuberculosis o contacto cercano?',
        'tuberculosisExplanation': 'Detalles de tuberculosis/contacto',
        'physicalMentalDisorder': '¿Tiene algún trastorno físico o mental que requiera servicios de salud/sociales en Canadá?',
        'physicalMentalDisorderExplanation': 'Detalles de trastorno físico/mental',
        'violatedStatusCanada': '¿Ha excedido la validez de su estatus, asistido a la escuela o trabajado sin autorización en Canadá?',
        'violatedStatusCanadaExplanation': 'Detalles de violación de estatus en Canadá',
        'refusedDeniedOrdered': '¿Se le ha denegado visa/permiso, entrada u ordenado abandonar Canadá o cualquier otro país?',
        'refusedDeniedOrderedExplanation': 'Detalles de denegación/orden de salida',
        'previouslyAppliedCanada': '¿Ha solicitado previamente entrar o permanecer en Canadá?',
        'previouslyAppliedCanadaExplanation': 'Detalles de solicitud previa a Canadá',
        'criminalOffence': '¿Ha cometido, sido arrestado, acusado o condenado por algún delito penal?',
        'criminalOffenceExplanation': 'Detalles de delito penal',
        'militaryOrPoliceService': '¿Sirvió en alguna unidad militar, milicia, defensa civil, organización de seguridad o fuerza policial?',
        'militaryOrPoliceServiceExplanation': 'Fechas y países/territorios donde sirvió en servicio militar/policial',
        'violentOrgAffiliation': '¿Es o ha sido miembro o asociado a algún partido político o grupo/organización que haya participado o abogado por la violencia?',
        'violentOrgAffiliationExplanation': 'Detalles de afiliación a organización violenta',
        'illTreatmentOrDesecration': '¿Ha presenciado o participado en maltrato a prisioneros/civiles, saqueo o profanación de edificios religiosos?',
        'illTreatmentOrDesecrationExplanation': 'Detalles de maltrato/profanación',
        'consentContactCIC': '¿Consiente ser contactado por CIC en el futuro?',
        'signatureDate': 'Fecha de Firma',

        // Canada IMM5707e Fields
        'familyInfo.hasSpouse': '¿Tiene cónyuge/pareja de unión libre?',
        'familyInfo.spouse.accompanyToCanada': '¿Acompañará a Canadá?',
        'familyInfo.spouse.relationship': 'Parentesco (Cónyuge/Pareja)',
        'familyInfo.spouse.surname': 'Apellidos (Cónyuge/Pareja)',
        'familyInfo.spouse.givenName': 'Nombres (Cónyuge/Pareja)',
        'familyInfo.spouse.dob': 'Fecha de Nacimiento (Cónyuge/Pareja)',
        'familyInfo.spouse.pobCountry': 'País de Nacimiento (Cónyuge/Pareja)',
        'familyInfo.spouse.presentAddress': 'Dirección Actual (Cónyuge/Pareja)',
        'familyInfo.spouse.maritalStatus': 'Estado Civil (Cónyuge/Pareja)',
        'familyInfo.spouse.occupation': 'Ocupación Actual (Cónyuge/Pareja)',

        'familyInfo.hasMother': '¿Tiene madre?',
        'familyInfo.mother.accompanyToCanada': '¿Acompañará a Canadá?',
        'familyInfo.mother.relationship': 'Parentesco (Madre)',
        'familyInfo.mother.surname': 'Apellidos (Madre)',
        'familyInfo.mother.givenName': 'Nombres (Madre)',
        'familyInfo.mother.dob': 'Fecha de Nacimiento (Madre)',
        'familyInfo.mother.pobCountry': 'País de Nacimiento (Madre)',
        'familyInfo.mother.presentAddress': 'Dirección Actual (Madre)',
        'familyInfo.mother.maritalStatus': 'Estado Civil (Madre)',
        'familyInfo.mother.occupation': 'Ocupación Actual (Madre)',

        'familyInfo.hasFather': '¿Tiene padre?',
        'familyInfo.father.accompanyToCanada': '¿Acompañará a Canadá?',
        'familyInfo.father.relationship': 'Parentesco (Padre)',
        'familyInfo.father.surname': 'Apellidos (Padre)',
        'familyInfo.father.givenName': 'Nombres (Padre)',
        'familyInfo.father.dob': 'Fecha de Nacimiento (Padre)',
        'familyInfo.father.pobCountry': 'País de Nacimiento (Padre)',
        'familyInfo.father.presentAddress': 'Dirección Actual (Padre)',
        'familyInfo.father.maritalStatus': 'Estado Civil (Padre)',
        'familyInfo.father.occupation': 'Ocupación Actual (Padre)',

        'familyInfo.noChildren': '¿No tiene hijos?',
        'accompanyToCanada': '¿Acompañará a Canadá?', // For dynamic children
        'relationship': 'Parentesco', // For dynamic children
        'presentAddress': 'Dirección Actual', // For dynamic children
        'occupation': 'Ocupación Actual', // For dynamic children
    };

    // Formatea el valor para mostrarlo en el resumen.
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

    // Genera el HTML para el resumen del formulario.
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
                        html += `<h3>${displayTitle} (${value.length} entr${value.length === 1 ? 'ada' : 'adas'})</h3><ul>`;
                        value.forEach((item, index) => {
                            html += `<li><strong>${displayTitle.replace(/s$/, '')} ${index + 1}:</strong>`; // Remove 's' for singular
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


    // Event listener para el botón de "Revisar y Enviar".
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

    // Event listener para el botón de "Confirmar y Descargar" dentro del modal de resumen.
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
