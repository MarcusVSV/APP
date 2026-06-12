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

// === CONTROLE DE INTERFACE (FORMULÁRIO) ===
const radiosMotivo = document.querySelectorAll('input[name="motivo"]');
const inputMotivoCustom = document.getElementById('motivo-custom');

radiosMotivo.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'outro') {
            inputMotivoCustom.classList.remove('hidden');
            inputMotivoCustom.required = true;
        } else {
            inputMotivoCustom.classList.add('hidden');
            inputMotivoCustom.required = false;
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
        
        // Se clicar na aba de listagem, renderiza os dados atualizados
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

function gerarParcelas(valorTotal, qtdParcelas, origem, dataCustom) {
    const parcelas = [];
    const valorParcela = (valorTotal / qtdParcelas).toFixed(2);
    let dataBase = dataCustom ? new Date(dataCustom + 'T12:00:00') : calcularPrimeiroVencimento(origem);

    for (let i = 0; i < qtdParcelas; i++) {
        let dataVencimento = new Date(dataBase.getFullYear(), dataBase.getMonth() + i, dataBase.getDate());
        parcelas.push({
            numero: i + 1,
            valor: valorParcela,
            dataVencimento: dataVencimento.toISOString(), // Salva como string ISO estável
            status: 'Pendente'
        });
    }
    return parcelas;
}

// === SUBMISSÃO DO CADASTRO ===
document.getElementById('form-divida').addEventListener('submit', function(e) {
    e.preventDefault();

    let valorString = valorInput.value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
    const valor = parseFloat(valorString);
    const devedor = devedorInput.value.trim();
    
    let motivo = document.querySelector('input[name="motivo"]:checked').value;
    if (motivo === 'outro') motivo = inputMotivoCustom.value.trim();
    const detalhes = document.getElementById('detalhes-motivo').value.trim();

    const origem = document.querySelector('input[name="origem"]:checked').value;
    
    let qtdParcelas = document.querySelector('input[name="parcelas"]:checked').value;
    if(qtdParcelas === 'custom') qtdParcelas = prompt("Quantas parcelas?") || 1;

    const usarDataCustom = toggleDataCustom.checked;
    const dataCustomValor = usarDataCustom ? inputDataCustom.value : null;

    const parcelas = gerarParcelas(valor, parseInt(qtdParcelas), origem, dataCustomValor);

    const novaDivida = {
        id: Date.now(),
        devedor,
        motivo,
        detalhes,
        origem,
        valorTotal: valor,
        parcelas
    };

    const dividasSalvas = JSON.parse(localStorage.getItem('minhasDividas')) || [];
    dividasSalvas.push(novaDivida);
    localStorage.setItem('minhasDividas', JSON.stringify(dividasSalvas));

    alert('Dívida registrada com sucesso!');
    
    this.reset();
    inputMotivoCustom.classList.add('hidden');
    inputDataCustom.classList.add('hidden');
    btnSalvarContato.classList.add('hidden');
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
            renderizarDividas(); // Re-renderiza para aplicar estilo visual imediatamente
        }
    }
};

// === GERAR RELATÓRIO DO WHATSAPP COM STATUS ATUAL ===
window.enviarRelatorioWhats = function(dividaId) {
    const dividas = JSON.parse(localStorage.getItem('minhasDividas')) || [];
    const divida = dividas.find(d => d.id === dividaId);
    
    if (divida) {
        let texto = `Fala *${divida.devedor}*, beleza? Segue o resumo do nosso *${divida.motivo}*:\n`;
        if (divida.detalhes) texto += `_Detalhes: ${divida.detalhes}_\n`;
        texto += `\n`;
        
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

// Inicialização inicial do carregamento de contatos
carregarContatos();

// debts.js (Adicione no final do arquivo)

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