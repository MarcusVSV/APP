// debts.js

// === MÁSCARA DE MOEDA ===
const valorInput = document.getElementById('valor');
valorInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') { e.target.value = ''; return; }
    value = (parseInt(value) / 100).toFixed(2);
    value = value.replace('.', ',');
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    e.target.value = 'R$ ' + value;
});

// === GERENCIAMENTO DE CONTATOS ===
const devedorInput = document.getElementById('devedor');
const datalistContatos = document.getElementById('lista-contatos');
const btnSalvarContato = document.getElementById('btn-salvar-contato');

function carregarContatos() {
    const contatos = JSON.parse(localStorage.getItem('meusContatos')) || [];
    contatos.sort((a, b) => a.localeCompare(b));
    datalistContatos.innerHTML = '';
    contatos.forEach(contato => {
        const option = document.createElement('option');
        option.value = contato;
        datalistContatos.appendChild(option);
    });
}

devedorInput.addEventListener('input', () => {
    const contatos = JSON.parse(localStorage.getItem('meusContatos')) || [];
    const nomeAtual = devedorInput.value.trim();
    if (nomeAtual !== '' && !contatos.includes(nomeAtual)) {
        btnSalvarContato.classList.remove('hidden');
    } else {
        btnSalvarContato.classList.add('hidden');
    }
});

btnSalvarContato.addEventListener('click', () => {
    const contatos = JSON.parse(localStorage.getItem('meusContatos')) || [];
    const novoContato = devedorInput.value.trim();
    if (novoContato) {
        contatos.push(novoContato);
        localStorage.setItem('meusContatos', JSON.stringify(contatos));
        carregarContatos();
        btnSalvarContato.classList.add('hidden');
    }
});

// === GERENCIAMENTO DE MOTIVOS (SALVOS) ===
const inputMotivoCustom = document.getElementById('motivo-custom');
const datalistMotivos = document.getElementById('lista-motivos');
const btnSalvarMotivo = document.getElementById('btn-salvar-motivo');
const containerMotivoCustom = document.getElementById('container-motivo-custom');

function carregarMotivos() {
    const motivos = JSON.parse(localStorage.getItem('meusMotivos')) || [];
    motivos.sort((a, b) => a.localeCompare(b));
    datalistMotivos.innerHTML = '';
    motivos.forEach(motivo => {
        const option = document.createElement('option');
        option.value = motivo;
        datalistMotivos.appendChild(option);
    });
}

inputMotivoCustom.addEventListener('input', () => {
    const motivos = JSON.parse(localStorage.getItem('meusMotivos')) || [];
    const motivoAtual = inputMotivoCustom.value.trim();
    if (motivoAtual !== '' && !motivos.includes(motivoAtual)) {
        btnSalvarMotivo.classList.remove('hidden');
    } else {
        btnSalvarMotivo.classList.add('hidden');
    }
});

btnSalvarMotivo.addEventListener('click', () => {
    const motivos = JSON.parse(localStorage.getItem('meusMotivos')) || [];
    const novoMotivo = inputMotivoCustom.value.trim();
    if (novoMotivo) {
        motivos.push(novoMotivo);
        localStorage.setItem('meusMotivos', JSON.stringify(motivos));
        carregarMotivos();
        btnSalvarMotivo.classList.add('hidden');
    }
});

// === CONTROLE DE INTERFACE (FORMULÁRIO) ===
const radiosMotivo = document.querySelectorAll('input[name="motivo"]');
radiosMotivo.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'outro') {
            containerMotivoCustom.classList.remove('hidden');
            inputMotivoCustom.required = true;
        } else {
            containerMotivoCustom.classList.add('hidden');
            inputMotivoCustom.required = false;
        }
    });
});

const radiosParcelas = document.querySelectorAll('input[name="parcelas"]');
const inputParcelasCustom = document.getElementById('qtd-parcelas-custom');
radiosParcelas.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            inputParcelasCustom.classList.remove('hidden');
            inputParcelasCustom.required = true;
        } else {
            inputParcelasCustom.classList.add('hidden');
            inputParcelasCustom.required = false;
        }
    });
});

const toggleDataCustom = document.getElementById('toggle-data-custom');
const inputDataCustom = document.getElementById('data-primeira-parcela');
toggleDataCustom.addEventListener('change', (e) => {
    if (e.target.checked) {
        inputDataCustom.classList.remove('hidden');
        inputDataCustom.required = true;
    } else {
        inputDataCustom.classList.add('hidden');
        inputDataCustom.required = false;
    }
});

// === SISTEMA DE NAVEGAÇÃO ENTRE ABAS ===
const tabBtns = document.querySelectorAll('.tab-btn');
const viewContainers = document.querySelectorAll('.view-container');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        viewContainers.forEach(v => v.classList.add('hidden'));
        
        btn.classList.add('active');
        const targetView = btn.getAttribute('data-target');
        document.getElementById(targetView).classList.remove('hidden');
        
        if (targetView === 'view-lista') {
            renderizarDividas();
        }
    });
});

// === CÁLCULO DE DATAS E PARCELAS ===
function calcularPrimeiroVencimento(origem) {
    const data = new Date();
    const diaAtual = data.getDate();
    let mesVenc = data.getMonth();
    let anoVenc = data.getFullYear();
    let diaVenc;

    if (origem === 'Nubank') {
        diaVenc = 4;
        mesVenc += (diaAtual >= 28) ? 2 : 1;
    } else if (origem === 'Mercado Pago') {
        diaVenc = 19;
        mesVenc += (diaAtual >= 16) ? 2 : 1;
    } else {
        diaVenc = diaAtual;
        mesVenc += 1;
    }
    return new Date(anoVenc, mesVenc, diaVenc);
}

function gerarParcelas(valorFinalParcela, qtdParcelas, origem, dataCustom) {
    const parcelas = [];
    let dataBase = dataCustom ? new Date(dataCustom + 'T12:00:00') : calcularPrimeiroVencimento(origem);

    for (let i = 0; i < qtdParcelas; i++) {
        let dataVencimento = new Date(dataBase.getFullYear(), dataBase.getMonth() + i, dataBase.getDate());
        parcelas.push({
            numero: i + 1,
            valor: valorFinalParcela.toFixed(2), // Recebe o valor exato da parcela e formata
            dataVencimento: dataVencimento.toISOString(), 
            status: 'Pendente'
        });
    }
    return parcelas;
}

// === SUBMISSÃO DO CADASTRO ===
document.getElementById('form-divida').addEventListener('submit', function(e) {
    e.preventDefault();

    // Lógica do Valor e Tipo
    let valorString = valorInput.value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
    const valorDigitado = parseFloat(valorString);
    const tipoValor = document.querySelector('input[name="tipo-valor"]:checked').value;

    const devedor = devedorInput.value.trim();
    const dataOcorrencia = document.getElementById('data-ocorrencia').value;
    
    let motivo = document.querySelector('input[name="motivo"]:checked').value;
    if (motivo === 'outro') motivo = inputMotivoCustom.value.trim();
    const detalhes = document.getElementById('detalhes-motivo').value.trim();

    const origem = document.querySelector('input[name="origem"]:checked').value;
    
    // Lógica de Parcelas
    let qtdParcelas = document.querySelector('input[name="parcelas"]:checked').value;
    if(qtdParcelas === 'custom') {
        qtdParcelas = inputParcelasCustom.value;
    }
    qtdParcelas = parseInt(qtdParcelas) || 1;

    // Definição Matemática (Total vs Parcela)
    let valorTotal, valorDaParcela;
    if (tipoValor === 'total') {
        valorTotal = valorDigitado;
        valorDaParcela = valorDigitado / qtdParcelas;
    } else {
        valorDaParcela = valorDigitado;
        valorTotal = valorDigitado * qtdParcelas;
    }

    const usarDataCustom = toggleDataCustom.checked;
    const dataCustomValor = usarDataCustom ? inputDataCustom.value : null;

    // Gera as parcelas baseadas no valor já calculado da parcela
    const parcelas = gerarParcelas(valorDaParcela, qtdParcelas, origem, dataCustomValor);

    const novaDivida = {
        id: Date.now(),
        devedor,
        motivo,
        dataOcorrencia,
        detalhes,
        origem,
        valorTotal: valorTotal,
        parcelas
    };

    const dividasSalvas = JSON.parse(localStorage.getItem('minhasDividas')) || [];
    dividasSalvas.push(novaDivida);
    localStorage.setItem('minhasDividas', JSON.stringify(dividasSalvas));

    alert('Dívida registrada com sucesso!');
    
    // Reseta Interface Visual
    this.reset();
    containerMotivoCustom.classList.add('hidden');
    inputParcelasCustom.classList.add('hidden');
    inputDataCustom.classList.add('hidden');
    btnSalvarContato.classList.add('hidden');
    btnSalvarMotivo.classList.add('hidden');
    valorInput.value = '';
});

// === RENDERIZAÇÃO DA LISTA DE DÍVIDAS ATIVAS ===
function renderizarDividas() {
    const container = document.getElementById('lista-dividas-container');
    const dividas = JSON.parse(localStorage.getItem('minhasDividas')) || [];
    
    if (dividas.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:40px;">Nenhuma dívida ativa encontrada.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    dividas.forEach(divida => {
        const card = document.createElement('div');
        card.className = 'debt-card';
        const valorTotalFmt = divida.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        let htmlParcelas = '';
        divida.parcelas.forEach(p => {
            const dataFmt = new Date(p.dataVencimento).toLocaleDateString('pt-BR');
            const isPaga = p.status === 'Pago';
            const valorParcelaFmt = parseFloat(p.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            htmlParcelas += `
                <li class="installment-item ${isPaga ? 'paga' : ''}">
                    <div class="installment-info">
                        <span class="installment-value">Parcela ${p.numero}: ${valorParcelaFmt}</span>
                        <span class="installment-date">Vencimento: ${dataFmt}</span>
                    </div>
                    <input type="checkbox" class="pay-checkbox" 
                        ${isPaga ? 'checked' : ''} 
                        onchange="alterarStatusParcela(${divida.id}, ${p.numero}, this.checked)">
                </li>
            `;
        });
        
        card.innerHTML = `
            <div class="debt-header">
                <div class="debt-title">
                    <h3>${divida.devedor}</h3>
                    <span><strong>${divida.motivo}</strong> ${divida.detalhes ? `- ${divida.detalhes}` : ''}</span>
                </div>
                <div class="debt-amount">${valorTotalFmt}</div>
            </div>
            <ul class="installment-list">
                ${htmlParcelas}
            </ul>
            <button class="btn-whatsapp" onclick="enviarRelatorioWhats(${divida.id})">
                Enviar Relatório por WhatsApp
            </button>
        `;
        container.appendChild(card);
    });
}

// === ALTERAR STATUS DA PARCELA (PAGO / PENDENTE) ===
window.alterarStatusParcela = function(dividaId, numeroParcela, isChecked) {
    let dividas = JSON.parse(localStorage.getItem('minhasDividas')) || [];
    const dIndex = dividas.findIndex(d => d.id === dividaId);
    
    if (dIndex !== -1) {
        const pIndex = dividas[dIndex].parcelas.findIndex(p => p.numero === numeroParcela);
        if (pIndex !== -1) {
            dividas[dIndex].parcelas[pIndex].status = isChecked ? 'Pago' : 'Pendente';
            localStorage.setItem('minhasDividas', JSON.stringify(dividas));
            renderizarDividas(); 
        }
    }
};

// === GERAR RELATÓRIO DO WHATSAPP COM STATUS ATUAL ===
window.enviarRelatorioWhats = function(dividaId) {
    const dividas = JSON.parse(localStorage.getItem('minhasDividas')) || [];
    const divida = dividas.find(d => d.id === dividaId);
    
    if (divida) {
        let texto = `Fala *${divida.devedor}*, beleza? Segue o resumo do nosso *${divida.motivo}*`;
        
        if (divida.dataOcorrencia) {
            const dataOcorridoFmt = new Date(divida.dataOcorrencia + 'T12:00:00').toLocaleDateString('pt-BR');
            texto += ` realizado no dia ${dataOcorridoFmt}:\n`;
        } else {
            texto += `:\n`;
        }

        if (divida.detalhes) texto += `_Detalhes: ${divida.detalhes}_\n`;
        
        const valorTotalFmt = divida.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        texto += `\n*Valor Total:* ${valorTotalFmt}\n\n`;
        
        divida.parcelas.forEach(p => {
            const dataFmt = new Date(p.dataVencimento).toLocaleDateString('pt-BR');
            const valorParcelaFmt = parseFloat(p.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const statusIcon = p.status === 'Pago' ? '✅ *[Pago]*' : '⏳ *[Pendente]*';
            texto += `*Parcela ${p.numero}*: ${valorParcelaFmt} | Vence em: ${dataFmt} ${statusIcon}\n`;
        });
        
        texto += `\nQualquer dúvida me avisa!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    }
};

// Inicialização de Dados ao Abrir o App
carregarContatos();
carregarMotivos();

// === REGISTRO DO SERVICE WORKER (PWA) ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso no escopo:', registration.scope);
      })
      .catch(error => {
        console.log('Falha ao registrar o Service Worker:', error);
      });
  });
}