// debts.js

// === GERENCIAMENTO DE ESTADO CENTRAL (STORE) ===
let carteira = JSON.parse(localStorage.getItem('minhaCarteira')) || { saldo: 0, nubank: 0, mercadoPago: 0 };
let transacoes = JSON.parse(localStorage.getItem('minhasTransacoes')) || [];
let dividas = JSON.parse(localStorage.getItem('minhasDividas')) || [];

function salvarDados() {
    localStorage.setItem('minhaCarteira', JSON.stringify(carteira));
    localStorage.setItem('minhasTransacoes', JSON.stringify(transacoes));
    localStorage.setItem('minhasDividas', JSON.stringify(dividas));
    atualizarDashboard();
}

// === MÁSCARAS DE MOEDA ===
function formatarMoeda(input) {
    let value = input.value.replace(/\D/g, '');
    if (value === '') { input.value = ''; return; }
    value = (parseInt(value) / 100).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = 'R$ ' + value;
}

const valorInput = document.getElementById('valor');
const transValorInput = document.getElementById('trans-valor');
if (valorInput) valorInput.addEventListener('input', (e) => formatarMoeda(e.target));
if (transValorInput) transValorInput.addEventListener('input', (e) => formatarMoeda(e.target));

// Preenche a data de hoje por padrão no form de transação
const transDataInput = document.getElementById('trans-data');
if (transDataInput) transDataInput.valueAsDate = new Date();


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
        
        if (targetView === 'view-lista') renderizarDividas();
        if (targetView === 'view-home') atualizarDashboard();
    });
});


// === LÓGICA DO DASHBOARD (HOME) E TRANSAÇÕES ===
// NOVO: Define quando o ciclo atual começou (Dia 5)
function obterInicioPeriodoAtual() {
    const hoje = new Date();
    let ano = hoje.getFullYear();
    let mes = hoje.getMonth();
    
    // Se hoje for dia 4 ou antes, o ciclo atual começou no dia 5 do mês passado
    if (hoje.getDate() <= 4) {
        mes -= 1;
        if (mes < 0) {
            mes = 11;
            ano -= 1;
        }
    }
    return new Date(ano, mes, 5, 0, 0, 0); // Dia 5 do mês do ciclo
}

function obterDataCortePeriodo() {
    const hoje = new Date();
    let ano = hoje.getFullYear();
    let mes = hoje.getMonth() + 1; // Puxa até o próximo mês
    if (mes > 11) { mes = 0; ano++; }
    return new Date(ano, mes, 4, 23, 59, 59); // Dia 4 do próximo mês
}

function atualizarDashboard() {
    // 1. Atualiza Visuais Básicos
    const saldoEl = document.getElementById('saldo-atual');
    const nuEl = document.getElementById('divida-nu');
    const mpEl = document.getElementById('divida-mp');
    
    if(saldoEl) saldoEl.innerText = carteira.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(nuEl) nuEl.innerText = carteira.nubank.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(mpEl) mpEl.innerText = carteira.mercadoPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 2. Calcula Saldo Previsto (até dia 4)
    const dataCorte = obterDataCortePeriodo();
    const hoje = new Date();
    let previsao = carteira.saldo;

    dividas.forEach(d => {
        d.parcelas.forEach(p => {
            const dataP = new Date(p.dataVencimento);
            if (p.status === 'Pendente' && dataP <= dataCorte) {
                previsao += parseFloat(p.valor);
            }
        });
    });

    transacoes.forEach(t => {
        const dataT = new Date(t.data + 'T12:00:00');
        if (dataT > hoje && dataT <= dataCorte) {
            if (t.tipo === 'entrada' && t.conta === 'Cofre pessoal') previsao += parseFloat(t.valor);
            if (t.tipo === 'saida' && t.conta === 'Cofre pessoal') previsao -= parseFloat(t.valor);
        }
    });

    const prevEl = document.getElementById('saldo-previsto');
    if(prevEl) prevEl.innerText = previsao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 3. Renderiza Histórico
    const listaTr = document.getElementById('lista-transacoes');
    if(!listaTr) return;
    
    listaTr.innerHTML = '';
    const recentes = [...transacoes].sort((a,b) => new Date(b.data) - new Date(a.data)).slice(0, 10);
    
    if(recentes.length === 0) {
        listaTr.innerHTML = '<p style="text-align:center; font-size:0.85rem; color:var(--text-muted);">Nenhuma transação recente.</p>';
    }

    recentes.forEach(t => {
        const li = document.createElement('li');
        li.className = 'trans-item';
        const isEntrada = t.tipo === 'entrada';
        const valorFmt = parseFloat(t.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataFmt = new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR');
        
        li.innerHTML = `
            <div class="trans-info">
                <strong>${t.descricao}</strong>
                <span>${dataFmt} • ${t.conta}</span>
            </div>
            <div class="trans-val ${isEntrada ? 'val-entrada' : 'val-saida'}">
                ${isEntrada ? '+' : '-'} ${valorFmt}
            </div>
        `;
        listaTr.appendChild(li);
    });
}

// Edição Manual das faturas
window.editarDividaCartao = function(cartao) {
    let nomeVisual = cartao === 'nubank' ? 'Nubank' : 'Mercado Pago';
    const novoValor = prompt(`Qual o valor atual da fatura do ${nomeVisual}? (Use ponto para centavos)`);
    if(novoValor !== null && !isNaN(novoValor.replace(',', '.'))) {
        carteira[cartao] = parseFloat(novoValor.replace(',', '.'));
        salvarDados();
    }
};

// Submissão do Form de Transação Manual
const formTransacao = document.getElementById('form-transacao');
if(formTransacao) {
    formTransacao.addEventListener('submit', function(e) {
        e.preventDefault();
        let valorString = transValorInput.value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
        const valor = parseFloat(valorString);
        const tipo = document.querySelector('input[name="trans-tipo"]:checked').value;
        const data = document.getElementById('trans-data').value;
        const conta = document.querySelector('input[name="trans-conta"]:checked').value;
        const descricao = document.getElementById('trans-desc').value.trim();

        const novaTr = { id: Date.now(), tipo, valor, data, conta, descricao };
        transacoes.push(novaTr);

        const dataT = new Date(data + 'T12:00:00');
        const hoje = new Date();
        hoje.setHours(23,59,59);

        // Se a data é no passado ou hoje, processa o impacto no saldo/cartão
        if (dataT <= hoje) {
            if (tipo === 'entrada') {
                if (conta === 'Cofre pessoal') carteira.saldo += valor;
                else if (conta === 'Nubank') carteira.nubank = Math.max(0, carteira.nubank - valor);
                else if (conta === 'Mercado Pago') carteira.mercadoPago = Math.max(0, carteira.mercadoPago - valor);
            } else {
                if (conta === 'Cofre pessoal') carteira.saldo -= valor;
                else if (conta === 'Nubank') carteira.nubank += valor;
                else if (conta === 'Mercado Pago') carteira.mercadoPago += valor;
            }
        }

        salvarDados();
        this.reset();
        document.getElementById('trans-data').valueAsDate = new Date(); 
        alert('Transação registrada!');
    });
}


// === GERENCIAMENTO DE CONTATOS E MOTIVOS ===
const devedorInput = document.getElementById('devedor');
const datalistContatos = document.getElementById('lista-contatos');
const btnSalvarContato = document.getElementById('btn-salvar-contato');

function carregarContatos() {
    const contatos = JSON.parse(localStorage.getItem('meusContatos')) || [];
    contatos.sort((a, b) => a.localeCompare(b));
    if(datalistContatos) {
        datalistContatos.innerHTML = '';
        contatos.forEach(contato => {
            const option = document.createElement('option');
            option.value = contato;
            datalistContatos.appendChild(option);
        });
    }
}

if(devedorInput) {
    devedorInput.addEventListener('input', () => {
        const contatos = JSON.parse(localStorage.getItem('meusContatos')) || [];
        const nomeAtual = devedorInput.value.trim();
        if (nomeAtual !== '' && !contatos.includes(nomeAtual)) {
            btnSalvarContato.classList.remove('hidden');
        } else {
            btnSalvarContato.classList.add('hidden');
        }
    });
}

if(btnSalvarContato) {
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
}

const inputMotivoCustom = document.getElementById('motivo-custom');
const datalistMotivos = document.getElementById('lista-motivos');
const btnSalvarMotivo = document.getElementById('btn-salvar-motivo');
const containerMotivoCustom = document.getElementById('container-motivo-custom');

function carregarMotivos() {
    const motivos = JSON.parse(localStorage.getItem('meusMotivos')) || [];
    motivos.sort((a, b) => a.localeCompare(b));
    if(datalistMotivos) {
        datalistMotivos.innerHTML = '';
        motivos.forEach(motivo => {
            const option = document.createElement('option');
            option.value = motivo;
            datalistMotivos.appendChild(option);
        });
    }
}

if(inputMotivoCustom) {
    inputMotivoCustom.addEventListener('input', () => {
        const motivos = JSON.parse(localStorage.getItem('meusMotivos')) || [];
        const motivoAtual = inputMotivoCustom.value.trim();
        if (motivoAtual !== '' && !motivos.includes(motivoAtual)) {
            btnSalvarMotivo.classList.remove('hidden');
        } else {
            btnSalvarMotivo.classList.add('hidden');
        }
    });
}

if(btnSalvarMotivo) {
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
}


// === CONTROLE DE INTERFACE (FORMULÁRIO DE DÍVIDAS) ===
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
if(toggleDataCustom) {
    toggleDataCustom.addEventListener('change', (e) => {
        if (e.target.checked) {
            inputDataCustom.classList.remove('hidden');
            inputDataCustom.required = true;
        } else {
            inputDataCustom.classList.add('hidden');
            inputDataCustom.required = false;
        }
    });
}


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
            valor: valorFinalParcela.toFixed(2),
            dataVencimento: dataVencimento.toISOString(), 
            status: 'Pendente'
        });
    }
    return parcelas;
}


// === SUBMISSÃO DO CADASTRO DE DÍVIDA ===
const formDivida = document.getElementById('form-divida');
if(formDivida) {
    formDivida.addEventListener('submit', function(e) {
        e.preventDefault();

        // Valores
        let valorString = valorInput.value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
        const valorDigitado = parseFloat(valorString);
        const tipoValor = document.querySelector('input[name="tipo-valor"]:checked').value;

        // Infos gerais
        const devedor = devedorInput.value.trim();
        const dataOcorrencia = document.getElementById('data-ocorrencia').value;
        const detalhes = document.getElementById('detalhes-motivo').value.trim();
        const origem = document.querySelector('input[name="origem"]:checked').value;
        
        let motivo = document.querySelector('input[name="motivo"]:checked').value;
        if (motivo === 'outro') motivo = inputMotivoCustom.value.trim();

        // Parcelas
        let qtdParcelas = document.querySelector('input[name="parcelas"]:checked').value;
        if(qtdParcelas === 'custom') {
            qtdParcelas = inputParcelasCustom.value;
        }
        qtdParcelas = parseInt(qtdParcelas) || 1;

        // Lógica Matemática (Total vs Mensalidade)
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

        dividas.push(novaDivida);
        salvarDados();

        alert('Dívida registrada com sucesso!');
        
        this.reset();
        containerMotivoCustom.classList.add('hidden');
        inputParcelasCustom.classList.add('hidden');
        inputDataCustom.classList.add('hidden');
        btnSalvarContato.classList.add('hidden');
        btnSalvarMotivo.classList.add('hidden');
        valorInput.value = '';
    });
}


// === LÓGICA DE DÍVIDAS A RECEBER E PAGAMENTO ===
// === LÓGICA DE DÍVIDAS A RECEBER E PAGAMENTO ===
window.alterarStatusParcela = function(dividaId, numeroParcela, isChecked) {
    const dIndex = dividas.findIndex(d => d.id === dividaId);
    if (dIndex === -1) return;
    
    const pIndex = dividas[dIndex].parcelas.findIndex(p => p.numero === numeroParcela);
    if (pIndex === -1) return;

    const parcela = dividas[dIndex].parcelas[pIndex];
    const valorP = parseFloat(parcela.valor);
    const origem = dividas[dIndex].origem;

    // A TRAVA MÁGICA: Verifica se a parcela é do ciclo atual/futuro ou se é apenas histórico
    const inicioPeriodo = obterInicioPeriodoAtual();
    const dataVenc = new Date(parcela.dataVencimento);
    const afetaSaldo = dataVenc >= inicioPeriodo;

    // Regras de Integração Financeira
    if (isChecked && parcela.status !== 'Pago') {
        if (afetaSaldo) { // Só mexe no dinheiro se for do ciclo atual pra frente
            carteira.saldo += valorP;
            if (origem === 'Nubank') carteira.nubank = Math.max(0, carteira.nubank - valorP);
            if (origem === 'Mercado Pago') carteira.mercadoPago = Math.max(0, carteira.mercadoPago - valorP);
        }
        parcela.status = 'Pago';
    } 
    else if (!isChecked && parcela.status === 'Pago') {
        if (afetaSaldo) { // Reverte a operação com a mesma regra
            carteira.saldo -= valorP;
            if (origem === 'Nubank') carteira.nubank += valorP;
            if (origem === 'Mercado Pago') carteira.mercadoPago += valorP;
        }
        parcela.status = 'Pendente';
    }

    salvarDados();
    renderizarDividas();
};

window.excluirDivida = function(dividaId) {
    if(confirm('Tem certeza que deseja excluir esta dívida? Essa ação não pode ser desfeita.')) {
        dividas = dividas.filter(d => d.id !== dividaId);
        salvarDados();
        renderizarDividas();
    }
};

window.enviarRelatorioWhats = function(dividaId) {
    const divida = dividas.find(d => d.id === dividaId);
    if (divida) {
        let texto = `_Mensagem gerada automaticamente pelo app Quick Debts_\n\n`;
        texto += `Fala *${divida.devedor}*, beleza? Segue o resumo do nosso *${divida.motivo}*`;
        
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


// === FILTROS E RENDERIZAÇÃO DA LISTA DE DÍVIDAS ATIVAS ===
const radiosFiltro = document.querySelectorAll('input[name="filtro-tipo"]');
const containerFiltroPessoa = document.getElementById('filtro-pessoa-container');
const containerFiltroMes = document.getElementById('filtro-mes-container');
const inputFiltroPessoa = document.getElementById('filtro-pessoa');
const inputFiltroMes = document.getElementById('filtro-mes');

if(inputFiltroMes) {
    const now = new Date();
    inputFiltroMes.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

radiosFiltro.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if(e.target.value === 'pessoa') {
            containerFiltroPessoa.classList.remove('hidden'); 
            containerFiltroMes.classList.add('hidden');
        } else {
            containerFiltroPessoa.classList.add('hidden'); 
            containerFiltroMes.classList.remove('hidden');
        }
        renderizarDividas();
    });
});

if(inputFiltroPessoa) inputFiltroPessoa.addEventListener('input', renderizarDividas);
if(inputFiltroMes) inputFiltroMes.addEventListener('change', renderizarDividas);


function renderizarDividas() {
    const container = document.getElementById('lista-dividas-container');
    if(!container) return;

    const radioSelecionado = document.querySelector('input[name="filtro-tipo"]:checked');
    const tipoFiltro = radioSelecionado ? radioSelecionado.value : 'pessoa';
    
    if (dividas.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:40px;">Nenhuma dívida cadastrada.</p>';
        return;
    }
    
    container.innerHTML = '';

    if (tipoFiltro === 'pessoa') {
        let dividasFiltradas = dividas;
        const buscaPessoa = inputFiltroPessoa ? inputFiltroPessoa.value.trim().toLowerCase() : '';
        
        if (buscaPessoa) {
            dividasFiltradas = dividasFiltradas.filter(d => d.devedor.toLowerCase().includes(buscaPessoa));
        }

        if (dividasFiltradas.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:40px;">Nenhum devedor encontrado.</p>';
            return;
        }

        dividasFiltradas.forEach(divida => {
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
                    <div class="debt-actions">
                        <div class="debt-amount">${valorTotalFmt}</div>
                        <button class="btn-delete" onclick="excluirDivida(${divida.id})">🗑️ Excluir</button>
                    </div>
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

    } else {
        const mesAlvo = inputFiltroMes ? inputFiltroMes.value : ''; 
        let parcelasDoMes = [];

        dividas.forEach(d => {
            d.parcelas.forEach(p => {
                const dataP = new Date(p.dataVencimento);
                const mesP = `${dataP.getFullYear()}-${String(dataP.getMonth() + 1).padStart(2, '0')}`;
                
                if (mesP === mesAlvo) {
                    parcelasDoMes.push({ divida: d, parcela: p });
                }
            });
        });

        if (parcelasDoMes.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:40px;">Nenhuma parcela para este mês.</p>';
            return;
        }

        parcelasDoMes.sort((a, b) => new Date(a.parcela.dataVencimento) - new Date(b.parcela.dataVencimento));

        parcelasDoMes.forEach(item => {
            const card = document.createElement('div');
            card.className = 'debt-card';
            
            const dataFmt = new Date(item.parcela.dataVencimento).toLocaleDateString('pt-BR');
            const isPaga = item.parcela.status === 'Pago';
            const valorParcelaFmt = parseFloat(item.parcela.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            card.innerHTML = `
                <div class="debt-header" style="border-bottom:none; margin-bottom:0; padding-bottom:0;">
                    <div class="debt-title">
                        <h3>${item.divida.devedor}</h3>
                        <span><strong>${item.divida.motivo}</strong> - Parcela ${item.parcela.numero} de ${item.divida.parcelas.length}</span>
                        <span style="display:block; margin-top:4px; font-size:0.85rem; color:var(--text-muted);">Vencimento: ${dataFmt}</span>
                    </div>
                    <div class="debt-actions" style="align-items:flex-end;">
                        <div class="debt-amount" style="${isPaga ? 'text-decoration:line-through; color:#A0AEC0;' : 'color:var(--primary-blue);'}">${valorParcelaFmt}</div>
                        <input type="checkbox" class="pay-checkbox" style="margin-top:8px;"
                            ${isPaga ? 'checked' : ''} 
                            onchange="alterarStatusParcela(${item.divida.id}, ${item.parcela.numero}, this.checked)">
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }
}


// === INICIALIZAÇÃO ===
carregarContatos();
carregarMotivos();
atualizarDashboard();
renderizarDividas();


// === REGISTRO DO SERVICE WORKER (PWA) ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('SW registrado com sucesso:', registration.scope);
      })
      .catch(error => {
        console.log('Falha no registro do SW:', error);
      });
  });
}