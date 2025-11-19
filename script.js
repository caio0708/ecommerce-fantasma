document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES DO DOM (Expandido) ---
    const productGrid = document.querySelector('.product-grid');
    const cartQuantity = document.querySelector('.cart-quantity');
    const cartModal = document.querySelector('.cart-modal');
    const closeButton = document.querySelector('.close-button');
    const cartItems = document.querySelector('.cart-items');
    const cartTotal = document.querySelector('.cart-total'); // Subtotal
    const checkoutBtn = document.getElementById('checkout');
    const cartIcon = document.querySelector('.cart-icon');
    const cartIconNav = document.querySelector('.cart-icon-nav');
    
    // Seletores de Frete
    const calculateShippingBtn = document.getElementById('calculate-shipping');
    const zipCodeInput = document.getElementById('zip-code');
    const shippingCostEl = document.querySelector('.shipping-cost'); // Span do Frete
    const finalTotalEl = document.querySelector('.final-total'); // Span do Total
    const resultadoFreteDiv = document.getElementById('resultado-frete');
    const freteErroDiv = document.getElementById('frete-erro');
    const campoValorFrete = document.getElementById('valor_frete'); // Hidden
    const campoTipoFrete = document.getElementById('tipo_frete');   // Hidden

    // Novos Seletores de Cliente e PIX
    const customerDetailsSection = document.querySelector('.customer-details-section');
    const customerNameInput = document.getElementById('customer-name');
    const customerCpfInput = document.getElementById('customer-cpf');
    const customerEmailInput = document.getElementById('customer-email');
    const customerPhoneInput = document.getElementById('customer-phone');

    const pixResultSection = document.querySelector('.pix-result-section');
    const qrCodeDisplay = document.getElementById('qr-code-display');
    const pixCopiaEColaTextarea = document.getElementById('pix-copia-e-cola');
    const copyPixBtn = document.getElementById('copy-pix-btn');

    // --- ESTADO DA APLICAÇÃO ---
    let cart = [];
    let shippingCost = 0; // Armazena o custo de frete *selecionado*

    // --- IMPORTANTE: Substitua pela URL do seu Webhook de CÁLCULO DE FRETE ---
    const URL_WEBHOOK_FRETE = "http://localhost:5678/webhook-test/frete"; // URL que retorna as *opções*
    const URL_WEBHOOK_ORDER = "http://localhost:5678/webhook-test/finaliza-pedido"; // URL para o pedido final

    // --- PRODUTOS ---
    const products = [
        { id: 1, name: 'A Obra-Prima', price: 24.90, image: 'img/10.png', description: '"Contemple minha arte. Favor não dar descarga..."' },
        { id: 2, name: 'O Tesouro do Fantasma', price: 24.90, image: 'img/12.png', description: '"Mais valioso que ouro. Mas não cheire."' },
        { id: 3, name: 'O Fantasma Contra-Ataca', price: 24.90, image: 'img/13.png', description: '"Que a Força esteja com o proxêmo..."' },
        { id: 4, name: 'Área em Demolição', price: 24.90, image: 'img/14.png', description: '"A estrutura do vaso foi comprometida."' },
        { id: 5, name: 'Algo Acabou de Nascer Aqui!', price: 24.90, image: 'img/15.png', description: '"(NÃO SEI O QUE É, MUT PEREE BRAVO...)"' },
        { id: 6, name: 'Cafezinho Passado na Hora', price: 24.90, image: 'img/16.png', description: '"(Aroma intenso. Sabor... inesofcéuvel...)"' },
        { id: 7, name: 'Alerta: Soltaram o Kraken!', price: 24.90, image: 'img/17.png', description: '"Ele veio das proudfenezas. Reze antes o olhar..."' },
        { id: 8, name: 'Oppenheimer Atômico', price: 24.90, image: 'img/3.png', description: '"Acabou de acontecer uma reação em cadeia..."' },
        { id: 9, name: 'Deixei um Presente!', price: 24.90, image: 'img/5.png', description: '"(Abre que a surpresa é de cagar...)"' }
    ];

    // --- FUNÇÕES PRINCIPAIS ---

    // Função para formatar moeda
    function formatCurrency(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    // Renderiza os produtos na página
    function renderProducts() {
        if (!productGrid) return;
        productGrid.innerHTML = '';
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <p class="product-price">${formatCurrency(product.price)}</p>
                    <button class="add-to-cart" data-id="${product.id}">Assombrar Carrinho 👻</button>
                </div>
            `;
            productGrid.appendChild(productCard);
        });
    }

    // Atualiza o carrinho (modal e ícone)
    function updateCart() {
        // Atualiza os itens do carrinho
        if (cart.length === 0) {
            cartItems.innerHTML = '<p>Seu carrinho está assustadoramente vazio.</p>';
        } else {
            cartItems.innerHTML = '';
            cart.forEach(item => {
                const cartItem = document.createElement('div');
                cartItem.classList.add('cart-item');
                cartItem.innerHTML = `
                    <span>${item.name} x ${item.quantity}</span>
                    <span>${formatCurrency(item.price * item.quantity)}</span>
                `;
                cartItems.appendChild(cartItem);
            });
        }
        
        // Calcula e exibe totais
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal + shippingCost; // shippingCost é atualizado ao *selecionar* o frete

        cartTotal.textContent = formatCurrency(subtotal);
        shippingCostEl.textContent = formatCurrency(shippingCost);
        finalTotalEl.textContent = formatCurrency(total);
        
        // Atualiza o ícone da bolha
        cartQuantity.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    // Adiciona um item ao carrinho
    function addToCart(productId) {
        const product = products.find(p => p.id === productId);
        const cartItem = cart.find(item => item.id === productId);
        if (cartItem) {
            cartItem.quantity++;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        
        // Importante: Se o carrinho muda, o frete calculado anteriormente é invalidado.
        resetShipping();
        updateCart();
    }

    // Reseta o estado do frete (chamado ao mudar o carrinho ou CEP)
    function resetShipping() {
        shippingCost = 0;
        resultadoFreteDiv.innerHTML = '';
        resultadoFreteDiv.style.display = 'none';
        freteErroDiv.style.display = 'none';
        campoValorFrete.value = '';
        campoTipoFrete.value = '';

        // NOVO: Esconde a seção PIX e mostra a de detalhes do cliente
        pixResultSection.style.display = 'none';
        customerDetailsSection.style.display = 'block';
        checkoutBtn.style.display = 'block'; // Mostra o botão para gerar PIX
        
        // Desabilita o checkout
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Calcule o frete para continuar';

        // Atualiza os totais para refletir o frete zerado
        updateCart();
    }

    // --- LÓGICA DE CÁLCULO DE FRETE (DO SEU SCRIPT ORIGINAL) ---
    async function handleCalculateShipping() {
        let cep = zipCodeInput.value.replace(/\D/g, '');
        
        if (cep.length !== 8) {
            exibirErroFrete('CEP inválido. Digite 8 números.');
            return;
        }

        setLoadingFrete(true);
        resetShipping(); // Limpa resultados antigos

        try {
            const response = await fetch(URL_WEBHOOK_FRETE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cep: cep, items: cart }) // Envia o CEP e os itens
            });

            if (!response.ok) {
                throw new Error(`O servidor de frete respondeu com status ${response.status}`);
            }

            const n8nData = await response.json();
            
            // Lógica para lidar com a resposta do n8n (ex: [ { "json": [...] } ])
            let opcoesFrete;
            if (Array.isArray(n8nData) && n8nData.length > 0 && n8nData[0].json) {
                opcoesFrete = n8nData[0].json; // Padrão n8n
            } else if (Array.isArray(n8nData)) {
                opcoesFrete = n8nData; // Resposta direta
            } else {
                throw new Error("Formato da resposta de frete não reconhecido.");
            }

            const opcoesValidas = opcoesFrete.filter(opt => opt.id && opt.price && !opt.error);

            if (opcoesValidas.length > 0) {
                resultadoFreteDiv.innerHTML = '<h4>Escolha sua entrega assombrada:</h4>'; // Título
                
                opcoesValidas.forEach(opcao => {
                    const divOpcao = document.createElement('div');
                    divOpcao.className = 'frete-opcao';

                    const precoNum = parseFloat(opcao.price);
                    const precoFormatado = formatCurrency(precoNum);
                    const prazoDias = opcao.delivery_time;
                    const textoPrazo = prazoDias > 1 ? `Até ${prazoDias} dias úteis` : `${prazoDias} dia útil`;
                    const radioId = `frete-${opcao.id}`;

                    divOpcao.innerHTML = `
                        <input type="radio" 
                               id="${radioId}" 
                               name="opcao_frete" 
                               value="${precoNum}" 
                               data-nome="${opcao.name}">
                        <label for="${radioId}">
                            <div class="frete-detalhe">
                                <strong>${opcao.name}</strong>
                                <span>${textoPrazo}</span>
                            </div>
                            <span class="frete-preco">${precoFormatado}</span>
                        </label>
                    `;
                    resultadoFreteDiv.appendChild(divOpcao);
                });
                
                resultadoFreteDiv.style.display = 'block';
                checkoutBtn.textContent = 'Escolha uma opção de frete';
                
            } else {
                exibirErroFrete('Nenhuma opção de frete encontrada para este CEP.');
            }

        } catch (error) {
            console.error('Erro ao calcular frete:', error);
            let msg = error.message.includes('Failed to fetch') ? 'Erro de rede/CORS. Verifique o n8n.' : error.message;
            exibirErroFrete(`Não foi possível calcular o frete. (${msg})`);
        } finally {
            setLoadingFrete(false);
        }
    }

    // Funções auxiliares de frete
    function setLoadingFrete(isLoading) {
        if (isLoading) {
            calculateShippingBtn.classList.add('loading');
            calculateShippingBtn.disabled = true;
        } else {
            calculateShippingBtn.classList.remove('loading');
            calculateShippingBtn.disabled = false;
        }
    }

    function exibirErroFrete(mensagem) {
        freteErroDiv.textContent = mensagem;
        freteErroDiv.style.display = 'block';
        resultadoFreteDiv.style.display = 'none';
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Erro no cálculo do frete';
    }


    // --- EVENT LISTENERS ---

    // 1. Adicionar ao Carrinho (na página principal)
    productGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart')) {
            const productId = parseInt(e.target.dataset.id);
            addToCart(productId);
            cartModal.style.display = 'block'; // Abre o modal
        }
    });

    // 2. Abrir/Fechar Modal
    function openCartModal(e) {
        e.preventDefault();
        updateCart(); // Garante que está atualizado ao abrir
        cartModal.style.display = 'block';
    }
    cartIcon.addEventListener('click', openCartModal);
    cartIconNav.addEventListener('click', openCartModal);

    closeButton.addEventListener('click', () => cartModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) cartModal.style.display = 'none';
    });

    // 3. Calcular Frete (Botão)
    calculateShippingBtn.addEventListener('click', handleCalculateShipping);

    // 4. Mudar CEP (Input)
    zipCodeInput.addEventListener('input', () => {
        // Se o usuário digitar, reseta o frete anterior
        resetShipping();
    });

    // 5. SELECIONAR OPÇÃO DE FRETE (Rádio)
    resultadoFreteDiv.addEventListener('change', (e) => {
        if (e.target.name === 'opcao_frete') {
            // Pega os valores do rádio selecionado
            shippingCost = parseFloat(e.target.value);
            const nomeSelecionado = e.target.getAttribute('data-nome');

            // Salva nos campos hidden
            campoValorFrete.value = shippingCost.toFixed(2);
            campoTipoFrete.value = nomeSelecionado;

            // Atualiza os totais na tela
            updateCart();

            // Habilita o botão de finalizar
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Finalizar Pedido Fantasma';
        }
    });

// 6. Finalizar Pedido / Gerar PIX (Webhook)
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio.');
        return;
    }
    if (shippingCost === 0 || campoValorFrete.value === '') {
        alert('Por favor, calcule e selecione uma opção de frete.');
        return;
    }

    // --- 1. Coletar e Validar Dados do Cliente ---
    const customerData = {
        name: customerNameInput.value.trim(),
        cpf: customerCpfInput.value.trim().replace(/\D/g, ''),
        email: customerEmailInput.value.trim(),
        phone: customerPhoneInput.value.trim().replace(/\D/g, ''),
    };

    if (!customerData.name || customerData.cpf.length !== 11 || !customerData.email.includes('@') || customerData.phone.length < 10) {
        alert('Por favor, preencha corretamente seu nome, CPF (11 dígitos), email e celular (DD + número).');
        return;
    }
    // --- Fim da Validação ---

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + shippingCost;

    checkoutBtn.textContent = 'Gerando PIX... ⏳';
    checkoutBtn.disabled = true;

    fetch(URL_WEBHOOK_ORDER, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cart: cart,
            shipping_type: campoTipoFrete.value,
            shipping_cost: shippingCost,
            subtotal: subtotal,
            total: total,
            customer: customerData // ENVIANDO DADOS DO CLIENTE
        }),
    })
    .then(response => {
            if (!response.ok) { throw new Error('Erro ao gerar PIX. Status: ' + response.status); }
            return response.json();
        })
    .then(data => {
        // --- INÍCIO DA CORREÇÃO: Lê o formato JSON Simples ---
        
        let pixData;
        
        // Se a resposta for um objeto JSON simples (o que esperamos do "JSON Body" personalizado)
        if (data && data.pixPayload && data.qrCodeUrl) {
             pixData = data;
        } 
        // Lógica de fallback, caso o n8n volte a usar o formato antigo (array aninhado)
        else if (Array.isArray(data) && data.length > 0 && data[0].json) {
             pixData = data[0].json;
        } else {
             // Se cair aqui, o formato é totalmente desconhecido.
             throw new Error("Formato de resposta PIX inesperado.");
        }

        // --- FIM DA CORREÇÃO ---

        // --- 2. Exibir Resultado PIX ---

        // 2a. PIX Copia e Cola
        pixCopiaEColaTextarea.value = pixData.pixPayload; // AGORA FUNCIONA!

        // 2b. QR Code Image
        qrCodeDisplay.innerHTML = `<img src="${pixData.qrCodeUrl}" alt="QR Code PIX" style="max-width: 100%; height: auto; border: 4px solid var(--cor-principal); border-radius: 8px;">`;

        // 2c. Alternar Seções do Modal
        document.querySelector('.shipping-section').style.display = 'none';
        customerDetailsSection.style.display = 'none';
        checkoutBtn.style.display = 'none';
        pixResultSection.style.display = 'block';

        alert('PIX gerado com sucesso! Utilize o código ou QR Code para pagar.');
    })
    .catch(error => {
        console.error('Erro ao gerar PIX:', error);
        alert('Houve um erro ao gerar o PIX. Tente novamente. Detalhe: ' + error.message);
        // Reseta o botão em caso de falha
        checkoutBtn.textContent = 'Gerar PIX Fantasma';
        checkoutBtn.disabled = false;
    });
});

// 7. NOVO: Botão de Copiar PIX
copyPixBtn.addEventListener('click', () => {
    // Seleciona o texto na textarea
    pixCopiaEColaTextarea.select();
    pixCopiaEColaTextarea.setSelectionRange(0, 99999); // Para mobile

    navigator.clipboard.writeText(pixCopiaEColaTextarea.value).then(() => {
        copyPixBtn.textContent = 'Copiado! 🎉';
        setTimeout(() => {
            copyPixBtn.textContent = 'Copiar Código PIX';
        }, 2000);
    }).catch(err => {
        console.error('Erro ao copiar: ', err);
        alert('Erro ao copiar código. Por favor, copie manualmente.');
    });
});

// 8. Atualizar texto do botão #checkout quando o frete é selecionado (Linha ~324)
// Procure e substitua:
// checkoutBtn.textContent = 'Finalizar Pedido Fantasma';
// Por:
checkoutBtn.textContent = 'Gerar PIX Fantasma';

    // --- INICIALIZAÇÃO ---
    renderProducts();
});