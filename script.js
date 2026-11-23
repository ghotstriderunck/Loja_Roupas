const STORAGE_KEY = 'loja_roupas_dados_v1';
const LOW_STOCK_THRESHOLD = 2;
const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"products":[],"sales":[]}');

if (!Array.isArray(savedState.products) || !Array.isArray(savedState.sales)) {
    throw new Error('Os dados salvos da loja estão em um formato inválido.');
}

let products = savedState.products;
let sales = savedState.sales;

const productForm = document.getElementById('productForm');
const saleForm = document.getElementById('saleForm');
const inventorySearch = document.getElementById('inventorySearch');
const inventoryBody = document.getElementById('inventoryBody');
const salesBody = document.getElementById('salesBody');
const saleProduct = document.getElementById('saleProduct');
const saleButton = document.getElementById('saleButton');

const money = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, sales }));
}

function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalize(value) {
    return value.trim().toLocaleLowerCase('pt-BR');
}

function addCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
}

function showFeedback(elementId, message, type) {
    const feedback = document.getElementById(elementId);
    feedback.textContent = message;
    feedback.className = `feedback${type ? ` feedback-${type}` : ''}`;
}

function renderSummary() {
    const stockCount = products.reduce((sum, product) => sum + product.stock, 0);
    const lowStockCount = products.filter(product => product.stock <= LOW_STOCK_THRESHOLD).length;
    const salesTotal = sales.reduce((sum, sale) => sum + sale.total, 0);

    document.getElementById('productCount').textContent = products.length;
    document.getElementById('stockCount').textContent = stockCount;
    document.getElementById('lowStockCount').textContent = lowStockCount;
    document.getElementById('salesTotal').textContent = money.format(salesTotal);
}

function renderInventory() {
    inventoryBody.textContent = '';
    const query = normalize(inventorySearch.value);
    const visibleProducts = products.filter(product => {
        const searchable = [product.name, product.category, product.size, product.color].join(' ');
        return normalize(searchable).includes(query);
    });

    if (visibleProducts.length === 0) {
        const row = document.createElement('tr');
        const cell = addCell(row, products.length ? 'Nenhuma peça encontrada.' : 'Seu estoque ainda está vazio.');
        cell.colSpan = 8;
        cell.className = 'empty-state';
        inventoryBody.appendChild(row);
        return;
    }

    visibleProducts.forEach(product => {
        const row = document.createElement('tr');
        addCell(row, product.name);
        addCell(row, product.category || 'Sem categoria');
        addCell(row, product.size);
        addCell(row, product.color);
        addCell(row, String(product.stock));
        addCell(row, money.format(product.price));

        const statusCell = addCell(row, '');
        const status = document.createElement('span');
        status.className = product.stock === 0 ? 'badge badge-out' :
            product.stock <= LOW_STOCK_THRESHOLD ? 'badge badge-low' : 'badge badge-ok';
        status.textContent = product.stock === 0 ? 'Sem estoque' :
            product.stock <= LOW_STOCK_THRESHOLD ? 'Estoque baixo' : 'Disponível';
        statusCell.appendChild(status);

        const actionCell = addCell(row, '');
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'button button-delete';
        deleteButton.textContent = 'Excluir';
        deleteButton.setAttribute('aria-label', `Excluir ${product.name}, tamanho ${product.size}, cor ${product.color}`);
        deleteButton.addEventListener('click', () => deleteProduct(product.id));
        actionCell.appendChild(deleteButton);
        inventoryBody.appendChild(row);
    });
}

function deleteProduct(productId) {
    const productIndex = products.findIndex(product => product.id === productId);

    if (productIndex === -1) {
        return;
    }

    const product = products[productIndex];
    const description = `${product.name} • tamanho ${product.size} • cor ${product.color}`;

    if (!confirm(`Excluir ${description} do estoque? As vendas anteriores serão mantidas no histórico.`)) {
        return;
    }

    products.splice(productIndex, 1);
    saveState();
    render();
    showFeedback('productFeedback', `${description} foi excluída do estoque.`, 'success');
}

function renderSaleOptions() {
    saleProduct.textContent = '';
    const availableProducts = products.filter(product => product.stock > 0);
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = availableProducts.length
        ? 'Selecione uma peça'
        : 'Nenhuma peça disponível em estoque';
    saleProduct.appendChild(placeholder);

    availableProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} • ${product.size} • ${product.color} — ${product.stock} un. — ${money.format(product.price)}`;
        saleProduct.appendChild(option);
    });

    saleButton.disabled = availableProducts.length === 0;
}

function renderSales() {
    salesBody.textContent = '';
    const recentSales = sales.slice().reverse().slice(0, 20);

    if (recentSales.length === 0) {
        const row = document.createElement('tr');
        const cell = addCell(row, 'Nenhuma venda registrada ainda.');
        cell.colSpan = 5;
        cell.className = 'empty-state';
        salesBody.appendChild(row);
        return;
    }

    recentSales.forEach(sale => {
        const row = document.createElement('tr');
        addCell(row, sale.date);
        addCell(row, `${sale.name} • ${sale.size} • ${sale.color}`);
        addCell(row, String(sale.quantity));
        addCell(row, sale.customer || '—');
        addCell(row, money.format(sale.total));
        salesBody.appendChild(row);
    });
}

function render() {
    renderSummary();
    renderInventory();
    renderSaleOptions();
    renderSales();
}

productForm.addEventListener('submit', event => {
    event.preventDefault();

    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const size = document.getElementById('productSize').value.trim();
    const color = document.getElementById('productColor').value.trim();
    const stock = Number(document.getElementById('productStock').value);
    const price = Number(document.getElementById('productPrice').value);

    if (!name || !size || !color || !Number.isInteger(stock) || stock < 0 || !Number.isFinite(price) || price <= 0) {
        showFeedback('productFeedback', 'Confira os dados: quantidade deve ser inteira e o preço maior que zero.', 'error');
        return;
    }

    const existing = products.find(product =>
        normalize(product.name) === normalize(name) &&
        normalize(product.size) === normalize(size) &&
        normalize(product.color) === normalize(color)
    );

    if (existing) {
        existing.stock += stock;
        existing.price = price;
        existing.category = category;
    } else {
        products.push({ id: createId(), name, category, size, color, stock, price });
    }

    saveState();
    render();
    productForm.reset();
    document.getElementById('productStock').value = '1';
    showFeedback('productFeedback', existing
        ? `Estoque atualizado para ${name} • ${size} • ${color}.`
        : `${name} • ${size} • ${color} cadastrado(a) com sucesso.`, 'success');
});

saleForm.addEventListener('submit', event => {
    event.preventDefault();

    const product = products.find(item => item.id === saleProduct.value);
    const quantity = Number(document.getElementById('saleQuantity').value);
    const customer = document.getElementById('saleCustomer').value.trim();

    if (!product || !Number.isInteger(quantity) || quantity <= 0) {
        showFeedback('saleFeedback', 'Selecione uma peça e informe uma quantidade válida.', 'error');
        return;
    }

    if (quantity > product.stock) {
        showFeedback('saleFeedback', `Estoque insuficiente. Há ${product.stock} unidade(s) disponível(is).`, 'error');
        return;
    }

    const total = Math.round(product.price * quantity * 100) / 100;
    product.stock -= quantity;
    sales.push({
        date: new Date().toLocaleString('pt-BR'),
        name: product.name,
        size: product.size,
        color: product.color,
        quantity,
        customer,
        unitPrice: product.price,
        total
    });

    saveState();
    render();
    saleForm.reset();
    document.getElementById('saleQuantity').value = '1';
    showFeedback('saleFeedback', `${quantity} unidade(s) vendida(s) por ${money.format(total)}.`, 'success');
});

inventorySearch.addEventListener('input', renderInventory);

render();
