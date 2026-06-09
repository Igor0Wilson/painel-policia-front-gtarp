let state = {
    selectedCrimes: new Set(),
    acaoMaior: null,
    modifiers: { advogado: false, primario: false, confesso: false, oac: false },
    mentions: new Set(),
    files: {}
};

// Mapeamento de ID para crime (para facilitar busca)
let crimeMap = {};

document.addEventListener('DOMContentLoaded', () => {
    buildCrimeMap();
    renderCrimes();
    setupEventListeners();
    calculateTotals();
    fillPenalCodeModal();
});

function buildCrimeMap() {
    Object.entries(crimesData).forEach(([categoryKey, category]) => {
        category.crimes.forEach(crime => {
            crimeMap[crime.id] = { ...crime, categoryKey, categoryTitle: category.title };
        });
    });
}

function renderCrimes() {
    const container = document.getElementById('crimesContainer');
    Object.entries(crimesData).forEach(([key, category]) => {
        const accordion = document.createElement('div');
        accordion.className = 'category-accordion animate-in';
        accordion.dataset.category = key;

        const crimesList = category.crimes.map(crime => `
                    <div class="crime-item-modern" data-crime-id="${crime.id}" data-values="${crime.values}" onclick="toggleCrime('${crime.id}')">
                        <div class="crime-checkbox"><i class="bi bi-check-lg"></i></div>
                        <div class="crime-info">
                            <div class="crime-name">${crime.name}</div>
                            <div class="crime-meta">
                                <span><i class="bi bi-file-text"></i> ${crime.article}</span>
                                <span><i class="bi bi-clock"></i> ${crime.values.split('|')[0]} meses</span>
                            </div>
                        </div>
                        <button class="crime-info-btn" onclick="event.stopPropagation(); showCrimeInfo('${key}', '${crime.id}')">
                            <i class="bi bi-info-circle-fill"></i>
                        </button>
                    </div>
                `).join('');

        accordion.innerHTML = `
                    <div class="category-header" onclick="toggleAccordion(this)">
                        <div class="category-icon ${category.color}"><i class="bi ${category.icon}"></i></div>
                        <h3 class="category-title">${category.title}</h3>
                        <span class="category-count">${category.crimes.length}</span>
                        <i class="bi bi-chevron-down category-arrow"></i>
                    </div>
                    <div class="category-body">${crimesList}</div>
                `;
        container.appendChild(accordion);
    });

    // Ações Maiores como accordion também
    const acoesAccordion = document.createElement('div');
    acoesAccordion.className = 'category-accordion animate-in';
    acoesAccordion.innerHTML = `
                <div class="category-header" onclick="toggleAccordion(this)">
                    <div class="category-icon" style="background: rgba(239, 68, 68, 0.15); color: var(--accent-red);">
                        <i class="bi bi-exclamation-diamond-fill"></i>
                    </div>
                    <h3 class="category-title">Ações Maiores</h3>
                    <i class="bi bi-chevron-down category-arrow"></i>
                </div>
                <div class="category-body">
                    <select class="acoes-select" id="acoes-select" onchange="selectAcaoMaior(this)">
                        ${acoesMaiores.map(a => `<option value="${a.value}" ${a.disabled ? 'disabled selected' : ''}>${a.name}</option>`).join('')}
                    </select>
                </div>
            `;
    container.appendChild(acoesAccordion);
}

function toggleAccordion(header) {
    const accordion = header.closest('.category-accordion');
    accordion.classList.toggle('expanded');
}

function setupEventListeners() {
    document.getElementById('search-crimes').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.crime-item-modern').forEach(item => {
            const name = item.querySelector('.crime-name').textContent.toLowerCase();
            const accordion = item.closest('.category-accordion');
            if (name.includes(term)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
            // Expandir acordeões que têm resultados visíveis
            const visibleItems = accordion.querySelectorAll('.crime-item-modern[style="display: flex;"], .crime-item-modern:not([style*="display: none"])');
            if (term && visibleItems.length > 0) {
                accordion.classList.add('expanded');
            }
        });
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.presets-dropdown')) {
            document.getElementById('presetsMenu').classList.remove('show');
        }
    });
}

function toggleCrime(crimeId) {
    const item = document.querySelector(`[data-crime-id="${crimeId}"]`);
    if (state.selectedCrimes.has(crimeId)) {
        state.selectedCrimes.delete(crimeId);
        item.classList.remove('selected');
    } else {
        state.selectedCrimes.add(crimeId);
        item.classList.add('selected');
    }
    calculateTotals();
    updateSelectedCrimesList();
}

function removeCrime(crimeId) {
    const item = document.querySelector(`[data-crime-id="${crimeId}"]`);
    if (item) {
        state.selectedCrimes.delete(crimeId);
        item.classList.remove('selected');
        calculateTotals();
        updateSelectedCrimesList();
    }
}

function removeAcaoMaior() {
    state.acaoMaior = null;
    document.getElementById('acoes-select').selectedIndex = 0;
    calculateTotals();
    updateSelectedCrimesList();
}

function selectAcaoMaior(select) {
    const selected = select.options[select.selectedIndex];
    state.acaoMaior = selected.disabled ? null : { name: selected.text, values: selected.value };
    calculateTotals();
    updateSelectedCrimesList();
}

function updateSelectedCrimesList() {
    const listContainer = document.getElementById('selectedCrimesList');
    const countBadge = document.getElementById('selectedCount');

    const totalItems = state.selectedCrimes.size + (state.acaoMaior ? 1 : 0);
    countBadge.textContent = totalItems;

    if (totalItems === 0) {
        listContainer.innerHTML = '<div class="no-crimes-message">Nenhum crime selecionado</div>';
        return;
    }

    let html = '';

    // Crimes individuais
    state.selectedCrimes.forEach(crimeId => {
        const crime = crimeMap[crimeId];
        if (crime) {
            const pena = crime.values.split('|')[0];
            html += `
                        <div class="selected-crime-item">
                            <span class="selected-crime-name">${crime.name}</span>
                            <span class="selected-crime-pena">${pena}m</span>
                            <button class="selected-crime-remove" onclick="removeCrime('${crimeId}')" title="Remover">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    `;
        }
    });

    // Ação Maior
    if (state.acaoMaior) {
        const pena = state.acaoMaior.values.split('|')[0];
        html += `
                    <div class="selected-crime-item acao-maior">
                        <span class="selected-crime-name"><i class="bi bi-exclamation-diamond-fill"></i> ${state.acaoMaior.name}</span>
                        <span class="selected-crime-pena">${pena}m</span>
                        <button class="selected-crime-remove" onclick="removeAcaoMaior()" title="Remover">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                `;
    }

    listContainer.innerHTML = html;
}

function toggleModifier(type) {
    const element = document.getElementById(`mod-${type}`);
    switch (type) {
        case 'advogado':
            state.modifiers.advogado = !state.modifiers.advogado;
            element.classList.toggle('active', state.modifiers.advogado);
            document.getElementById('sub-atenuantes').classList.toggle('show', state.modifiers.advogado);
            if (!state.modifiers.advogado) {
                state.modifiers.primario = false;
                state.modifiers.confesso = false;
                document.getElementById('mod-primario').classList.remove('active');
                document.getElementById('mod-confesso').classList.remove('active');
            }
            break;
        case 'primario':
            if (state.modifiers.advogado) {
                state.modifiers.primario = !state.modifiers.primario;
                element.classList.toggle('active', state.modifiers.primario);
            }
            break;
        case 'confesso':
            if (state.modifiers.advogado) {
                state.modifiers.confesso = !state.modifiers.confesso;
                element.classList.toggle('active', state.modifiers.confesso);
            }
            break;
        case 'oac':
            state.modifiers.oac = !state.modifiers.oac;
            element.classList.toggle('active', state.modifiers.oac);
            break;
    }
    calculateTotals();
}

function calculateTotals() {
    let totalPena = 0, totalMulta = 0, totalFianca = 0;
    let isFiancaPossible = true;
    state.selectedCrimes.forEach(crimeId => {
        const item = document.querySelector(`[data-crime-id="${crimeId}"]`);
        const values = item.dataset.values.split('|');
        totalPena += parseInt(values[0]) || 0;
        totalMulta += parseInt(values[1]) || 0;
        if (values[2] !== 'NA') totalFianca += parseInt(values[2]) || 0;
        else isFiancaPossible = false;
    });
    if (state.acaoMaior) {
        const values = state.acaoMaior.values.split('|');
        totalPena += parseInt(values[0]) || 0;
        totalMulta += parseInt(values[1]) || 0;
        if (values[2] !== 'NA' && values[2] !== '0') totalFianca += parseInt(values[2]) || 0;
    }
    let penaModificada = totalPena;
    let multaModificada = totalMulta;
    let fiancaModificada = totalFianca;
    if (state.modifiers.advogado) {
        penaModificada *= 0.70;
        multaModificada *= 0.70;
        fiancaModificada *= 0.70;
        if (state.modifiers.primario) penaModificada *= 0.50;
        if (state.modifiers.confesso) penaModificada *= 0.85;
    }
    if (state.modifiers.oac) penaModificada *= 4.0;
    const penaFinal = Math.round(penaModificada);
    const penaDisplay = document.getElementById('pena_total');
    const maximaAviso = document.getElementById('pena-maxima-aviso');
    if (penaFinal > 100) {
        penaDisplay.textContent = '100 meses';
        document.getElementById('pena-original-calculada').textContent = penaFinal;
        maximaAviso.style.display = 'block';
    } else {
        penaDisplay.textContent = `${penaFinal} meses`;
        maximaAviso.style.display = 'none';
    }
    document.getElementById('multa_total').textContent = 'R$ ' + Math.round(multaModificada).toLocaleString('pt-BR');
    document.getElementById('fianca_total').textContent = isFiancaPossible ? 'R$ ' + Math.round(fiancaModificada).toLocaleString('pt-BR') : 'INAFIANÇÁVEL';
    document.getElementById('fianca_total').className = `result-value ${isFiancaPossible ? 'fianca' : 'inafiancavel'}`;
}

function showCrimeInfo(categoryKey, crimeId) {
    const crime = crimesData[categoryKey].crimes.find(c => c.id === crimeId);
    document.getElementById('crimeInfoTitle').textContent = `${crime.article} - ${crime.name}`;
    document.getElementById('crimeInfoBody').innerHTML = `
                <p style="font-size: 0.9375rem; line-height: 1.6;">${crime.desc}</p>
                <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
                    <div style="display: flex; gap: 1.5rem; font-size: 0.8125rem; flex-wrap: wrap;">
                        <div><strong>Pena:</strong> ${crime.values.split('|')[0]} meses</div>
                        <div><strong>Multa:</strong> R$ ${parseInt(crime.values.split('|')[1]).toLocaleString('pt-BR')}</div>
                        <div><strong>Fiança:</strong> ${crime.values.split('|')[2] === 'NA' ? 'Inafiançável' : 'R$ ' + parseInt(crime.values.split('|')[2]).toLocaleString('pt-BR')}</div>
                    </div>
                </div>
            `;
    new bootstrap.Modal(document.getElementById('crimeInfoModal')).show();
}

function togglePresets() {
    document.getElementById('presetsMenu').classList.toggle('show');
}

function applyPreset(preset) {
    // Limpa apenas os crimes selecionados e mantém os dados digitados e fotos
    state.selectedCrimes.clear();
    document.querySelectorAll('.crime-item-modern').forEach(item => item.classList.remove('selected'));
    
    if (presets[preset]) {
        presets[preset].forEach(crimeId => {
            state.selectedCrimes.add(crimeId);
            const item = document.querySelector(`[data-crime-id="${crimeId}"]`);
            if (item) item.classList.add('selected');
        });
        showToast('Preset aplicado com sucesso!', 'success');
    }
    
    calculateTotals();
    updateSelectedCrimesList();
    document.getElementById('presetsMenu').classList.remove('show');
}

function triggerUpload(type) {
    document.getElementById(`file-${type}`).click();
}

function handleFile(input, type) {
    const file = input.files[0];
    if (file && file.type.startsWith('image/')) {
        state.files[type] = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById(`preview-${type}`).src = e.target.result;
            document.getElementById(`uploader-${type}`).classList.add('has-image');
        };
        reader.readAsDataURL(file);
    }
}

function toggleMention(element, roleId) {
    element.classList.toggle('selected');
    if (state.mentions.has(roleId)) state.mentions.delete(roleId);
    else state.mentions.add(roleId);
}

function copyToClipboard() {
    const crimesText = Array.from(state.selectedCrimes).map(id => {
        return document.querySelector(`[data-crime-id="${id}"]`).querySelector('.crime-name').textContent;
    }).join('\n');
    navigator.clipboard.writeText(crimesText).then(() => showToast('Crimes copiados!', 'success'));
}

function sendToDiscord() {
    const webhookURLs = [
        'https://discord.com/api/webhooks/1254874190021136515/YeO75hfQxFcupfWrRaHqCL-OHtVyxo1a-YsZDWEAZoKM8baUZhnbIdU80E45T_TQ94A_',
        'https://discord.com/api/webhooks/1439769655643344900/XqH5tARHL2HeaQD3D0acVGEYYDETSVlUX40KpmXJUqccL909fIia29TB6IYuJ2sM-Je_'
    ];
    const nome = document.getElementById('preso_nome').value;
    const passaporte = document.getElementById('preso_passaporte').value;
    const responsavel = document.getElementById('responsavel_prisao').value;
    if (!nome || !passaporte || !responsavel) {
        showToast('Preencha Nome, Passaporte e Responsável!', 'error');
        return;
    }
    const crimesListText = Array.from(state.selectedCrimes).map(id => {
        const item = document.querySelector(`[data-crime-id="${id}"]`);
        const name = item.querySelector('.crime-name').textContent;
        const crime = crimeMap[id];
        return `- ${crime ? crime.article : ''} - ${name}`;
    });
    if (state.acaoMaior) crimesListText.push(`- Ação Maior: ${state.acaoMaior.name}`);

    let description = `👤 **Nome do Preso:** ${nome}\n\n`;
    description += `🆔 **Passaporte do Preso:** ${passaporte}\n\n`;
    description += `👨‍⚖️ **Advogado:** ${document.getElementById('adv_passaporte').value || 'N/A'}\n\n`;
    description += `⏳ **Pena Total:** ${document.getElementById('pena_total').textContent}\n\n`;
    description += `💸 **Multa:** ${document.getElementById('multa_total').textContent}\n\n`;
    description += `💰 **Fiança:** ${document.getElementById('fianca_total').textContent}\n\n`;
    
    let formatResponsavel = responsavel.trim();
    if (/^\d{17,20}$/.test(formatResponsavel)) {
        formatResponsavel = `<@${formatResponsavel}>`;
    }
    description += `👮 **Responsável pela prisão:** ${formatResponsavel}\n\n`;
    
    description += `📜 **Crimes Cometidos**\n`;
    description += `\`\`\`\n${crimesListText.length > 0 ? crimesListText.join('\n') : 'Nenhum crime selecionado'}\n\`\`\`\n`;
    
    const relatorio = document.getElementById('relatorio-texto').value;
    if (relatorio) {
        description += `📝 **Relatório**\n\`\`\`\n${relatorio}\n\`\`\`\n`;
    }

    const fileKeysMapped = {
        'preso': 'Foto do Preso',
        'rg': 'Foto do RG',
        'apreensao': 'Foto da Apreensão',
        'quimico': 'Teste Químico',
        'residual': 'Teste Residual'
    };
    
    const uploadedFiles = Object.keys(state.files);
    if (uploadedFiles.length > 0) {
        description += `🖼️ **Evidências Visuais**\n`;
        uploadedFiles.forEach(key => {
            const mappedName = fileKeysMapped[key] || key;
            description += `🔷 ${mappedName} Anexada\n`;
        });
    }

    const embeds = [{
        title: "⚖️ REGISTRO DE PRISÃO ⚖️",
        url: "https://capitalcity.com.br",
        color: 0xff4444,
        thumbnail: { url: "https://burp.com.br/calculadora/logo.jpg" },
        description: description
    }];

    const mentionsText = Array.from(state.mentions).map(id => `<@&${id}>`).join(' ');
    
    // Preparar attachments para o payload_json
    const attachments = Object.keys(state.files).map((key, index) => ({
        id: index,
        description: `Evidência: ${key}`,
        filename: `${key}.png`
    }));

    if (attachments.length > 0) {
        embeds[0].image = { url: `attachment://${attachments[0].filename}` };
        for (let i = 1; i < attachments.length; i++) {
            embeds.push({
                url: "https://capitalcity.com.br",
                image: { url: `attachment://${attachments[i].filename}` }
            });
        }
    }

    const payload = {
        embeds: embeds
    };

    if (mentionsText) {
        payload.content = mentionsText;
    }

    if (attachments.length > 0) {
        payload.attachments = attachments;
    }

    Promise.all(webhookURLs.map(url => {
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify(payload));
        
        Object.entries(state.files).forEach(([key, file], index) => {
            formData.append(`files[${index}]`, file, `${key}.png`);
        });

        return fetch(url, { method: 'POST', body: formData });
    }))
        .then(() => showToast('Enviado para o Discord!', 'success'))
        .catch(() => showToast('Erro ao enviar.', 'error'));
}

function clearAll(showNotification = true) {
    state.selectedCrimes.clear();
    state.acaoMaior = null;
    state.modifiers = { advogado: false, primario: false, confesso: false, oac: false };
    state.mentions.clear();
    state.files = {};
    document.querySelectorAll('.crime-item-modern').forEach(item => item.classList.remove('selected'));
    document.getElementById('acoes-select').selectedIndex = 0;
    document.querySelectorAll('.modifier-item').forEach(item => item.classList.remove('active'));
    document.getElementById('sub-atenuantes').classList.remove('show');
    document.querySelectorAll('.mention-item').forEach(item => item.classList.remove('selected'));
    document.querySelectorAll('.uploader-modern').forEach(uploader => {
        uploader.classList.remove('has-image');
        uploader.querySelector('img').src = '';
    });
    document.querySelectorAll('.form-control-modern').forEach(input => input.value = '');
    document.getElementById('relatorio-texto').value = '';
    calculateTotals();
    updateSelectedCrimesList();
    if (showNotification) showToast('Todos os dados foram limpos!', 'success');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast-modern ${type}`;
    toast.innerHTML = `<i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function fillPenalCodeModal() {
    document.getElementById('penalCodeBody').innerHTML = Object.entries(crimesData).map(([key, cat]) => `
                <h5 style="color: var(--accent-blue); margin-top: 1rem; margin-bottom: 0.75rem; font-size: 1rem;">${cat.title}</h5>
                ${cat.crimes.map(c => `
                    <p style="margin-bottom: 0.5rem; font-size: 0.875rem;">
                        <strong>${c.article} - ${c.name}</strong><br>
                        <span style="color: var(--text-secondary); font-size: 0.8125rem;">${c.desc}</span>
                    </p>
                `).join('')}
            `).join('<hr style="border-color: var(--border-color); margin: 1rem 0;">');
}
