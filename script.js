// ==========================================================================
// CONFIGURAÇÃO DO SHEETDB (GOOGLE SHEETS) E WHATSAPP
// ==========================================================================
const SHEETDB_URL = "https://sheetdb.io/api/v1/s3b6boh5jg211";
const WHATSAPP_NUMBER = "5516994487125"; // Número oficial Planeta Kids

let products = [];
let cart = []; // Armazena os itens adicionados ao carrinho
let selectedSize = null; // Tamanho temporariamente selecionado no modal

// Categorias da Loja
const categories = [
  { id: "todos", name: "✨ Todos os Produtos" },
  { id: "menina", name: "👧 Meninas" },
  { id: "menino", name: "👦 Meninos" },
  { id: "bebe", name: "👶 Bebês" },
  { id: "conjuntos", name: "🎁 Conjuntos" },
  { id: "pijamas", name: "🌙 Pijamas" }
];

let currentCategory = "todos";
let currentSort = "featured";

// Elementos do DOM
const categoriesContainer = document.getElementById("categories-container");
const productsGrid = document.getElementById("products-grid");
const sortSelect = document.getElementById("sort-select");
const resultsCount = document.getElementById("results-count");

const modal = document.getElementById("product-modal");
const modalBody = document.getElementById("modal-body-content");
const modalCloseBtn = document.getElementById("modal-close-btn");

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
  renderCategories();
  fetchProductsFromSheet();

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderProducts();
    });
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
});

// BUSCAR PRODUTOS DA PLANILHA GOOGLE SHEETS COM CACHE
async function fetchProductsFromSheet() {
  resultsCount.textContent = "A carregar produtos...";

  const CACHE_KEY = "universokids_products_cache";
  const CACHE_TIME_KEY = "universokids_cache_time";
  const CACHE_DURATION = 10 * 60 * 1000; // Cache válida por 10 minutos

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  const now = new Date().getTime();

  if (cachedData && cachedTime && (now - cachedTime < CACHE_DURATION)) {
    products = JSON.parse(cachedData);
    renderProducts();
    return;
  }

  try {
    const response = await fetch(SHEETDB_URL);
    const data = await response.json();

    products = data.map(item => {
      let imgs = [];
      if (item.imagem) {
        imgs = item.imagem.split(',').map(url => url.trim()).filter(url => url.length > 0);
      }
      if (imgs.length === 0) {
        imgs = ["https://via.placeholder.com/300?text=Sem+Foto"];
      }

      return {
        id: item.id,
        nome: item.nome,
        categoria: item.categoria,
        preco: parseFloat(item.preco) || 0,
        emPromocao: String(item.emPromocao).toLowerCase() === "true",
        precoPromocional: item.precoPromocional ? parseFloat(item.precoPromocional) : null,
        tamanhos: item.tamanhos || "",
        imagens: imgs,
        imagemPrincipal: imgs[0],
        descricao: item.descricao || "Peça confeccionada com alto padrão de qualidade e conforto para o seu pequeno."
      };
    });

    localStorage.setItem(CACHE_KEY, JSON.stringify(products));
    localStorage.setItem(CACHE_TIME_KEY, now);

    renderProducts();
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    
    if (cachedData) {
      products = JSON.parse(cachedData);
      renderProducts();
      resultsCount.textContent = "Modo offline (a mostrar dados recentes).";
    } else {
      resultsCount.textContent = "Erro ao carregar produtos da planilha.";
    }
  }
}

// RENDERIZAR CATEGORIAS
function renderCategories() {
  if (!categoriesContainer) return;
  categoriesContainer.innerHTML = categories.map(cat => `
    <button 
      class="category-btn ${cat.id === currentCategory ? 'active' : ''}" 
      onclick="setCategory('${cat.id}', this)"
    >
      ${cat.name}
    </button>
  `).join('');
}

window.setCategory = function(catId, btnElement) {
  currentCategory = catId;
  renderCategories();
  renderProducts();

  if (btnElement && categoriesContainer) {
    const containerWidth = categoriesContainer.offsetWidth;
    const btnOffset = btnElement.offsetLeft;
    const btnWidth = btnElement.offsetWidth;
    categoriesContainer.scrollTo({
      left: btnOffset - (containerWidth / 2) + (btnWidth / 2),
      behavior: 'smooth'
    });
  }
};

// FILTRAR, ORDENAR E RENDERIZAR PRODUTOS
function renderProducts() {
  if (!productsGrid) return;

  let filtered = products.filter(p => {
    return currentCategory === "todos" || p.categoria === currentCategory;
  });

  if (currentSort === "price-asc") {
    filtered.sort((a, b) => (a.emPromocao ? a.precoPromocional : a.preco) - (b.emPromocao ? b.precoPromocional : b.preco));
  } else if (currentSort === "price-desc") {
    filtered.sort((a, b) => (b.emPromocao ? b.precoPromocional : b.preco) - (a.emPromocao ? a.precoPromocional : a.preco));
  } else if (currentSort === "name-asc") {
    filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }

  resultsCount.textContent = `A mostrar ${filtered.length} produto(s)`;

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 2.5rem 1rem; background: white; border-radius: 16px;">
        <h3>Nenhum produto nesta categoria! 🎈</h3>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered.map(p => {
    const temPromocao = p.emPromocao && p.precoPromocional;
    const precoExibido = temPromocao 
      ? `<span style="text-decoration: line-through; color: #aaa; font-size: 0.75rem; margin-right: 2px;">R$ ${p.preco.toFixed(2).replace('.', ',')}</span> R$ ${p.precoPromocional.toFixed(2).replace('.', ',')}`
      : `R$ ${p.preco.toFixed(2).replace('.', ',')}`;

    return `
      <article class="product-card" onclick="openModal('${p.id}')">
        <div class="card-img-wrapper">
          <span class="tag-badge" style="${temPromocao ? 'background: #FF5A8D; color: white;' : ''}">${temPromocao ? 'OFF' : 'Novo'}</span>
          <img src="${p.imagemPrincipal}" alt="${p.nome}" loading="lazy">
        </div>
        <div class="card-content">
          <h3 class="product-title">${p.nome}</h3>
          <p class="product-sizes">Tamanhos: ${p.tamanhos || 'Diversos'}</p>
          <div class="card-footer">
            <span class="product-price">${precoExibido}</span>
            <button class="btn-details">Ver mais</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// MODAL DE DETALHES DO PRODUTO (Seleção de fotos e tamanho)
window.openModal = function(productId) {
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;

  selectedSize = null; // Reset do tamanho selecionado
  const temPromocao = product.emPromocao && product.precoPromocional;
  const valorFinal = temPromocao ? product.precoPromocional : product.preco;
  const tamanhosLista = product.tamanhos ? product.tamanhos.split(',').map(s => s.trim()) : [];

  modalBody.innerHTML = `
    <div class="modal-grid">
      <div class="modal-gallery-container">
        <div class="modal-main-img">
          <img id="active-modal-img" src="${product.imagens[0]}" alt="${product.nome}">
        </div>
        ${product.imagens.length > 1 ? `
          <div class="modal-thumbnails">
            ${product.imagens.map((imgUrl, index) => `
              <img src="${imgUrl}" class="thumb-img ${index === 0 ? 'active' : ''}" onclick="changeActiveImageModal('${imgUrl}', this)" alt="Miniatura ${index + 1}">
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="modal-info">
        <h2 class="modal-title">${product.nome}</h2>
        <div class="modal-price">
          ${temPromocao ? `<span style="text-decoration: line-through; color: #aaa; font-size: 0.95rem; margin-right: 6px;">R$ ${product.preco.toFixed(2).replace('.', ',')}</span>` : ''}
          R$ ${valorFinal.toFixed(2).replace('.', ',')}
        </div>
        <p class="modal-description">${product.descricao}</p>
        
        <div class="modal-sizes-box">
          <div class="modal-sizes-title" style="font-weight:600; font-size:0.9rem; margin-bottom: 6px;">Selecione o Tamanho:</div>
          <div class="size-pills">
            ${tamanhosLista.length > 0 ? tamanhosLista.map(s => `
              <button class="size-pill-btn" onclick="selectSize('${s}', this)">${s}</button>
            `).join('') : '<span style="font-size:0.85rem; color:#888;">Tamanho Único</span>'}
          </div>
        </div>

        <button onclick="addToCart('${product.id}', ${valorFinal})" class="btn-whatsapp" style="margin-top: 15px;">
          🛒 Adicionar ao Carrinho
        </button>
      </div>
    </div>
  `;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
};

window.selectSize = function(size, btnElement) {
  selectedSize = size;
  document.querySelectorAll('.size-pill-btn').forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
};

window.changeActiveImageModal = function(imgUrl, thumbElement) {
  const activeImg = document.getElementById("active-modal-img");
  if (activeImg) activeImg.src = imgUrl;
  document.querySelectorAll('.thumb-img').forEach(el => el.classList.remove('active'));
  if (thumbElement) thumbElement.classList.add('active');
};

function closeModal() {
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "auto";
}

// ==========================================================================
// FUNÇÕES DO CARRINHO DE COMPRAS
// ==========================================================================
window.addToCart = function(productId, price) {
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;

  const tamanhosLista = product.tamanhos ? product.tamanhos.split(',').map(s => s.trim()) : [];
  if (tamanhosLista.length > 0 && !selectedSize) {
    alert("Por favor, selecione um tamanho antes de adicionar ao carrinho!");
    return;
  }

  cart.push({
    id: product.id,
    nome: product.nome,
    tamanho: selectedSize || "Único",
    preco: price
  });

  updateCartUI();
  closeModal();
  toggleCartModal();
};

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  updateCartUI();
};

window.toggleCartModal = function() {
  const cartModal = document.getElementById("cart-modal");
  if (!cartModal) return;
  cartModal.classList.toggle("active");
  if (cartModal.classList.contains("active")) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "auto";
  }
};

function updateCartUI() {
  const counter = document.getElementById("cart-counter");
  const itemsContainer = document.getElementById("cart-items-container");
  const totalPriceEl = document.getElementById("cart-total-price");

  if (counter) counter.textContent = cart.length;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `<p style="text-align: center; color: #888; padding: 20px;">O seu carrinho está vazio. 🎈</p>`;
    if (totalPriceEl) totalPriceEl.textContent = "R$ 0,00";
    return;
  }

  let total = 0;
  itemsContainer.innerHTML = cart.map((item, index) => {
    total += item.preco;
    return `
      <div class="cart-item-row">
        <div>
          <strong>${item.nome}</strong><br>
          <span style="color: #FF5A8D; font-size: 0.8rem; font-weight: 600;">Tamanho: ${item.tamanho}</span> | 
          <span style="color: #666; font-size: 0.85rem;">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
        </div>
        <button onclick="removeFromCart(${index})" class="btn-remove-item">🗑️ Remover</button>
      </div>
    `;
  }).join('');

  if (totalPriceEl) {
    totalPriceEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  }
}

// Envia mensagem limpa para o WhatsApp com o tamanho escolhido
window.sendCartToWhatsApp = function() {
  if (cart.length === 0) {
    alert("O seu carrinho está vazio!");
    return;
  }

  let mensagem = "Olá, Universo Kids! Gostaria de fazer o pedido dos seguintes produtos:\n\n";
  
  let totalGeral = 0;
  cart.forEach((item, index) => {
    mensagem += `${index + 1}. *${item.nome}* (Tam: ${item.tamanho}) - R$ ${item.preco.toFixed(2).replace('.', ',')}\n`;
    totalGeral += item.preco;
  });

  mensagem += `\n💰 *Total do Pedido: R$ ${totalGeral.toFixed(2).replace('.', ',')}*`;

  const encodedMessage = encodeURIComponent(mensagem);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
};