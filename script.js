let db;
let stock = [];
let orders = [];
let isAdminLoggedIn = false;

// Inicializar IndexedDB
window.onload = function() {
    let request = indexedDB.open("ProductDB", 1);

    request.onerror = function(event) {
        console.error("Error al abrir IndexedDB:", event);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        loadStockFromDB();
        loadOrdersFromDB();
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains("products")) {
            db.createObjectStore("products", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("orders")) {
            db.createObjectStore("orders", { keyPath: "id", autoIncrement: true });
        }
    };
};

// Cargar productos desde IndexedDB
function loadStockFromDB() {
    const transaction = db.transaction(["products"], "readonly");
    const store = transaction.objectStore("products");
    const request = store.getAll();

    request.onsuccess = function(event) {
        stock = event.target.result;
        updateProductList();
    };
}

// Cargar pedidos desde IndexedDB
function loadOrdersFromDB() {
    const transaction = db.transaction(["orders"], "readonly");
    const store = transaction.objectStore("orders");
    const request = store.getAll();

    request.onsuccess = function(event) {
        orders = event.target.result;
    };
}

// Mostrar pantalla de login del administrador
function showAdminLogin() {
    hideAll();
    document.getElementById('adminLogin').classList.remove('hidden');
}

// Función de login del administrador
function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    if (password === "admin123") {
        isAdminLoggedIn = true;
        document.getElementById('adminLogin').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
    } else {
        alert("Contraseña incorrecta");
    }
}

// Función para que el administrador cargue productos
function addProduct() {
    const productName = document.getElementById('productName').value;
    const productQuantity = parseInt(document.getElementById('productQuantity').value);

    if (productName && productQuantity >= 0) {
        const newProduct = { name: productName, quantity: productQuantity };
        saveProductToDB(newProduct);
        stock.push(newProduct);
        updateProductList();
    } else {
        alert("Por favor, complete todos los campos correctamente.");
    }
}

// Guardar producto en IndexedDB
function saveProductToDB(product) {
    const transaction = db.transaction(["products"], "readwrite");
    const store = transaction.objectStore("products");
    store.add(product);
}

// Actualizar la lista de productos para el administrador
function updateProductList() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '<h3>Productos en stock:</h3>';
    stock.forEach((product, index) => {
        productList.innerHTML += `
            <div>
                <p>${index + 1}. ${product.name} - Cantidad: ${product.quantity}</p>
                <button onclick="editProduct(${index})">Editar</button>
                <button onclick="deleteProduct(${index})">Eliminar</button>
            </div>`;
    });
}

// Editar producto
function editProduct(index) {
    const newName = prompt("Nuevo nombre del producto:", stock[index].name);
    const newQuantity = prompt("Nueva cantidad:", stock[index].quantity);

    if (newName !== null && newQuantity !== null) {
        stock[index].name = newName;
        stock[index].quantity = parseInt(newQuantity);
        updateProductInDB(stock[index]);
        updateProductList();
    }
}

// Actualizar producto en IndexedDB
function updateProductInDB(product) {
    const transaction = db.transaction(["products"], "readwrite");
    const store = transaction.objectStore("products");
    store.put(product);
}

// Eliminar producto
function deleteProduct(index) {
    const product = stock[index];
    const transaction = db.transaction(["products"], "readwrite");
    const store = transaction.objectStore("products");
    store.delete(product.id);

    stock.splice(index, 1);
    updateProductList();
}

// Mostrar la lista de productos para los usuarios
function showProductList() {
    hideAll();
    const stockList = document.getElementById('stockList');
    stockList.innerHTML = '';
    stock.forEach((product, index) => {
        stockList.innerHTML += `
            <div>
                <label>${product.name} (Disponible: ${product.quantity})</label>
                <input type="number" id="product-${index}" placeholder="Cantidad" min="0" max="${product.quantity}">
            </div>`;
    });
    stockList.innerHTML += `<button onclick="placeOrder()">Realizar Pedido</button>`;
    document.getElementById('userPanel').classList.remove('hidden');
}

// Función para realizar el pedido
function placeOrder() {
    const userName = document.getElementById('userName').value;
    if (!userName) {
        alert("Por favor, ingrese su apellido y nombre.");
        return;
    }

    let userOrder = [];
    let error = false;
    stock.forEach((product, index) => {
        const quantity = parseInt(document.getElementById(`product-${index}`).value);
        if (quantity > product.quantity) {
            alert(`La cantidad para ${product.name} excede el stock.`);
            error = true;
        } else if (quantity > 0) {
            userOrder.push({ name: product.name, quantity });
            product.quantity -= quantity; // Reducir cantidad en stock
            updateProductInDB(product); // Actualizar en la base de datos
        }
    });

    if (error) return;

    if (userOrder.length > 0) {
        saveOrderToDB({ userName, items: userOrder });
        showReceipt(userOrder);
    } else {
        alert("No se ha realizado ningún pedido.");
    }
}

// Guardar pedido en IndexedDB
function saveOrderToDB(order) {
    const transaction = db.transaction(["orders"], "readwrite");
    const store = transaction.objectStore("orders");
    store.add(order);
}

// Mostrar comprobante de pedido
function showReceipt(order) {
    const receiptDetails = document.getElementById('receiptDetails');
    receiptDetails.innerHTML = '<h3>Detalle de Pedido:</h3>';
    order.forEach(item => {
        receiptDetails.innerHTML += `<p>${item.name} - Cantidad: ${item.quantity}</p>`;
    });
    document.getElementById('receipt').classList.remove('hidden');
}

// Ocultar comprobante de pedido
function hideReceipt() {
    document.getElementById('receipt').classList.add('hidden');
    document.getElementById('userPanel').classList.remove('hidden');
}

// Descargar pedidos en PDF
async function downloadOrders() {
    if (!isAdminLoggedIn) {
        alert("Solo el administrador puede descargar los pedidos.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    orders.forEach((order, index) => {
        doc.text(`Pedido ${index + 1}:`, 10, 10 + index * 20);
        doc.text(`Nombre: ${order.userName}`, 10, 20 + index * 20);
        order.items.forEach((item, itemIndex) => {
            doc.text(`${item.name} - Cantidad: ${item.quantity}`, 10, 30 + itemIndex * 10 + index * 20);
        });
        doc.text('-----------------------', 10, 40 + index * 20);
    });

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').split('.')[0];
    const filename = `Pedidos_${timestamp}.pdf`;

    doc.save(filename);
}

// Vaciar base de datos de pedidos
function clearOrders() {
    if (!isAdminLoggedIn) {
        alert("Solo el administrador puede vaciar la base de datos de pedidos.");
        return;
    }

    const transaction = db.transaction(["orders"], "readwrite");
    const store = transaction.objectStore("orders");
    store.clear();

    orders = [];
    alert("La base de datos de pedidos ha sido vaciada.");
}

// Función para ocultar todas las secciones excepto la seleccionada
function hideAll() {
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('userPanel').classList.add('hidden');
    document.getElementById('receipt').classList.add('hidden');
}
