const dragStyles = document.createElement('style');
dragStyles.innerHTML = `
    .dragging { opacity: 0.5; border: 2px dashed #888 !important; }
    .column, .card { user-select: none; }
    .column-header { cursor: grab; }
    .column-header:active { cursor: grabbing; }
`;
document.head.appendChild(dragStyles);

const board = document.getElementById('board');
const newBoardBtn = document.getElementById('new-board-btn');
const changeBgBtn = document.getElementById('change-bg-btn');
const exportBtn = document.getElementById('exportBtn');
const addColumnBtn = document.querySelector('.add-column-btn');
const boardTitle = document.querySelector('.board-title');

// Модалки
const modal = document.getElementById('card-modal');
const modalInput = modal.querySelector('.modal-text-input');
const saveCardBtn = modal.querySelector('.save-modal-btn');
const closeModalBtn = modal.querySelector('.close-btn');
const addImageBtn = modal.querySelector('.add-image-btn');

const columnModal = document.getElementById('column-modal');
const columnModalInput = columnModal.querySelector('.modal-column-input');
const saveColumnBtn = columnModal.querySelector('.save-column-btn');
const closeColumnBtn = columnModal.querySelector('.close-column-btn');

const bgModal = document.getElementById('bg-modal');
const closeBgBtn = bgModal.querySelector('.close-bg-btn');
const bgTextInput = document.getElementById('bg-text-input');
const bgUploadBtn = document.getElementById('bg-upload-btn');
const bgSaveBtn = document.getElementById('bg-save-btn');

const shareModal = document.getElementById('share-modal');
const closeShareBtn = shareModal.querySelector('.close-share-btn');
const exportPngBtn = document.getElementById('export-png-btn');
const generateLinkBtn = document.getElementById('generate-link-btn');
const linkContainer = document.getElementById('link-container');
const shareLinkInput = document.getElementById('share-link-input');
const copyLinkBtn = document.getElementById('copy-link-btn');

const lightboxModal = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');
const closeLightboxBtn = document.querySelector('.close-lightbox-btn');

let selectedImageData = null;
let targetCardList = null;
let dragType = null; 
let cardToEdit = null;

/* ЗБЕРЕЖЕННЯ ТА ЗАВАНТАЖЕННЯ З LOCAL STORAGE */
function saveBoard() {
    const data = {
        title: boardTitle.textContent,
        background: document.body.style.background,
        columns: []
    };

    document.querySelectorAll('.column').forEach(col => {
        const title = col.querySelector('.column-title').textContent;
        const cards = [];
        
        col.querySelectorAll('.card').forEach(card => {
            const text = card.querySelector('.card-content').textContent;
            const imgPlaceholder = card.querySelector('.card-image-placeholder');
            const img = imgPlaceholder.querySelector('img');
            cards.push({
                text: text.trim(),
                image: img ? img.src : null
            });
        });
        data.columns.push({ title, cards });
    });

    localStorage.setItem('taskFlowBoardData', JSON.stringify(data));
}

function loadBoard() {
    const savedData = localStorage.getItem('taskFlowBoardData');
    if (!savedData) return;

    const data = JSON.parse(savedData);
    
    if (data.title) boardTitle.textContent = data.title;
    if (data.background) document.body.style.background = data.background;

    document.querySelectorAll('.column').forEach(col => col.remove());

    const addColumnWrapper = document.querySelector('.add-column-wrapper');

    data.columns.forEach((colData, index) => {
        const column = createColumnElement(colData.title);
        board.insertBefore(column, addColumnWrapper);
        attachColumnEvents(column);

        const cardList = column.querySelector('.card-list');
        colData.cards.forEach(cardData => {
            const card = createCardElement(cardData.text, cardData.image);
            cardList.appendChild(card);
            attachCardEvents(card);
        });
    });
    updateAllColumnCounters();
}

/* СТВОРЕННЯ ЕЛЕМЕНТІВ (Колонки та Картки) */
function createColumnElement(title) {
    const column = document.createElement('div');
    column.className = 'column';
    column.draggable = true;
    
    column.innerHTML = `
        <div class="column-header" style="position: relative;">
            <h2 class="column-title editable-title" contenteditable="true" spellcheck="false" title="Натисніть, щоб змінити назву">${title}</h2>
            <span class="column-info">Стовпець X</span>
            <button class="column-options-btn">⋮</button>
            <div class="dropdown-menu column-dropdown">
                <button class="dropdown-item danger delete-column-btn">Видалити колонку</button>
            </div>
        </div>
        <div class="card-list"></div>
        <button class="add-card-btn">+</button>
    `;
    return column;
}

function createCardElement(text, imageUrl) {
    let imageContent = imageUrl 
        ? `<img src="${imageUrl}" alt="Card Image" style="max-width: 100%; border-radius: 4px; cursor: zoom-in;">` 
        : '';
        
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.innerHTML = `
        <div class="card-header-menu">
            <button class="card-options-btn">⋮</button>
            <div class="dropdown-menu card-dropdown">
                <button class="dropdown-item edit-card-btn">Редагувати</button>
                <button class="dropdown-item danger delete-card-btn">Видалити</button>
            </div>
        </div>
        ${imageContent ? `<div class="card-image-placeholder">${imageContent}</div>` : `<div class="card-image-placeholder" style="display:none;"></div>`}
        <div class="card-content">${text}</div>
    `;
    return card;
}

/* ЛОГІКА РЕДАГУВАННЯ ТЕКСТУ INLINE */
function handleInlineEdit(element) {
    element.addEventListener('blur', saveBoard);
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            element.blur();     
        }
    });
}
handleInlineEdit(boardTitle);

/* ЛОГІКА СТВОРЕННЯ НОВОЇ ДОШКИ */
newBoardBtn.addEventListener('click', () => {
    if(confirm('Ви впевнені, що хочете створити нову дошку? Усі незбережені дані поточної дошки будуть втрачені.')) {
        localStorage.removeItem('taskFlowBoardData');
        location.reload();
    }
});

/* ЛОГІКА МОДАЛКИ ФОНУ */
changeBgBtn.addEventListener('click', () => {
    bgModal.classList.remove('hidden');
    bgTextInput.value = '';
});

closeBgBtn.addEventListener('click', () => bgModal.classList.add('hidden'));

bgUploadBtn.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png, image/jpeg, image/webp';
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            document.body.style.background = `url(${event.target.result}) center/cover`;
            saveBoard();
            bgModal.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    });
    fileInput.click();
});

bgSaveBtn.addEventListener('click', () => {
    const val = bgTextInput.value.trim();
    if (val) {
        document.body.style.background = val.startsWith('#') ? val : `url(${val}) center/cover`;
        saveBoard();
    }
    bgModal.classList.add('hidden');
});

/* ЛОГІКА "ПОДІЛИТИСЯ" */
exportBtn.addEventListener('click', () => {
    shareModal.classList.remove('hidden');
    linkContainer.style.display = 'none'; // Ховаємо поле з посиланням при кожному новому відкритті
});

closeShareBtn.addEventListener('click', () => shareModal.classList.add('hidden'));

// Згенерувати посилання
generateLinkBtn.addEventListener('click', () => {
    // Оскільки бекенду немає, генеруємо фейкове, але візуально робоче посилання
    const boardId = Math.random().toString(36).substring(2, 15);
    shareLinkInput.value = `https://taskflow.app/b/${boardId}`;
    linkContainer.style.display = 'flex';
});

// Копіювання посилання із захистом (fallback)
copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, 99999); 
    
    try {
        navigator.clipboard.writeText(shareLinkInput.value).then(() => {
            showCopySuccess();
        });
    } catch (err) {
        // Запасний варіант для старих браузерів
        document.execCommand('copy');
        showCopySuccess();
    }
});

function showCopySuccess() {
    const originalText = copyLinkBtn.textContent;
    copyLinkBtn.textContent = 'Скопійовано! ✓';
    copyLinkBtn.style.backgroundColor = '#28a745';
    setTimeout(() => {
        copyLinkBtn.textContent = originalText;
        copyLinkBtn.style.backgroundColor = '#4b36c4';
    }, 2000);
}

// Експорт у PNG 
exportPngBtn.addEventListener('click', () => {
    // Ховаємо інтерфейсні кнопки та модалку
    document.querySelectorAll('.column-options-btn, .card-header-menu, .add-card-btn, .add-column-wrapper').forEach(btn => btn.style.display = 'none');
    shareModal.classList.add('hidden');

    // ЗАХИСТ ВІД QA: Заставляємо дошку розгорнутися на повну ширину скролу
    const originalOverflow = board.style.overflow;
    const originalWidth = board.style.width;
    const currentBg = document.body.style.background;
    
    board.style.overflow = 'visible';
    board.style.width = board.scrollWidth + 'px';
    board.style.background = currentBg || '#2b1165'; // Переносимо фон на контейнер для рендеру

    html2canvas(board, { 
        backgroundColor: null, // Дозволяємо прозорість, щоб фон контейнера працював
        width: board.scrollWidth,
        height: Math.max(board.scrollHeight, window.innerHeight),
        windowWidth: board.scrollWidth,
        scrollX: 0,
        scrollY: 0
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${boardTitle.textContent.trim() || 'TaskFlow_Board'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        // Відновлюємо стилі
        board.style.overflow = originalOverflow;
        board.style.width = originalWidth;
        board.style.background = 'transparent';
        document.querySelectorAll('.column-options-btn, .card-header-menu, .add-card-btn, .add-column-wrapper').forEach(btn => btn.style.display = '');
    }).catch(err => {
        console.error('Помилка генерації зображення:', err);
        alert('Виникла помилка при створенні зображення. Перевірте консоль.');
    });
});

/* ЗАКРИТТЯ МЕНЮШОК ПРИ КЛІКУ ПОЗА НИМИ */
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(d => d.style.display = 'none');
});

/* СТВОРЕННЯ КОЛОНКИ */
addColumnBtn.addEventListener('click', () => {
    columnModal.classList.remove('hidden');
    columnModalInput.value = '';
    columnModalInput.focus();
});

closeColumnBtn.addEventListener('click', () => columnModal.classList.add('hidden'));

saveColumnBtn.addEventListener('click', () => {
    const title = columnModalInput.value.trim();
    if (!title) return;

    const column = createColumnElement(title);
    const addColumnWrapper = document.querySelector('.add-column-wrapper');
    board.insertBefore(column, addColumnWrapper);
    
    attachColumnEvents(column);
    updateAllColumnCounters(); 
    columnModal.classList.add('hidden');
    saveBoard(); 
});

/* ПОДІЇ КОЛОНКИ */
function attachColumnEvents(column) {
    const colTitle = column.querySelector('.column-title');
    handleInlineEdit(colTitle); 

    column.querySelector('.add-card-btn').addEventListener('click', (e) => {
        targetCardList = e.target.previousElementSibling;
        cardToEdit = null; 
        modal.classList.remove('hidden');
        modalInput.value = '';
        resetImageState();
        modalInput.focus();
    });

    const optionsBtn = column.querySelector('.column-options-btn');
    const dropdown = column.querySelector('.column-dropdown');
    
    optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown-menu').forEach(d => { if (d !== dropdown) d.style.display = 'none'; });
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    dropdown.querySelector('.delete-column-btn').addEventListener('click', () => {
        column.remove();
        updateAllColumnCounters(); 
        saveBoard(); 
    });

    // DRAG & DROP КОЛОНКИ
    column.addEventListener('dragstart', (e) => {
        if (e.target.closest('.card') || e.target.closest('.editable-title')) return; 
        dragType = 'column';
        column.classList.add('dragging');
    });

    column.addEventListener('dragend', () => {
        column.classList.remove('dragging');
        dragType = null;
        updateAllColumnCounters(); 
        saveBoard(); 
    });

    const cardList = column.querySelector('.card-list');
    cardList.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragType !== 'card') return; 

        const afterElement = getDragAfterElement(cardList, e.clientY);
        const draggable = document.querySelector('.card.dragging');
        if (afterElement == null) {
            cardList.appendChild(draggable);
        } else {
            cardList.insertBefore(draggable, afterElement);
        }
    });
}

board.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dragType !== 'column') return;

    const afterElement = getDragAfterElement(board, e.clientX, true);
    const draggable = document.querySelector('.column.dragging');
    const wrapper = document.querySelector('.add-column-wrapper');
    
    if (afterElement == null) {
        board.insertBefore(draggable, wrapper);
    } else {
        board.insertBefore(draggable, afterElement);
    }
});

/* ЛОГІКА КАРТОК */
closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    resetImageState();
});

function resetImageState() {
    selectedImageData = null;
    addImageBtn.textContent = '+ Додати зображення';
    let imgPreview = document.getElementById('modal-image-preview');
    if(imgPreview) imgPreview.remove();
}

addImageBtn.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png, image/jpeg';
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            selectedImageData = event.target.result;
            addImageBtn.textContent = 'Зображення вибрано ✓';
            
            let imgPreview = document.getElementById('modal-image-preview');
            if (!imgPreview) {
                imgPreview = document.createElement('img');
                imgPreview.id = 'modal-image-preview';
                imgPreview.style.cssText = 'max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 5px; margin-top: 10px;';
                document.querySelector('#card-modal .modal-content').insertBefore(imgPreview, saveCardBtn);
            }
            imgPreview.src = selectedImageData;
        };
        reader.readAsDataURL(file);
    });
    fileInput.click();
});

saveCardBtn.addEventListener('click', () => {
    const text = modalInput.value.trim();
    if (!text && !selectedImageData) return; 

    if (cardToEdit) {
        cardToEdit.querySelector('.card-content').textContent = text;
        const placeholder = cardToEdit.querySelector('.card-image-placeholder');
        if (selectedImageData) {
            placeholder.innerHTML = `<img src="${selectedImageData}" alt="Card Image" style="max-width: 100%; border-radius: 4px; cursor: zoom-in;">`;
            placeholder.style.display = 'block';
            attachLightbox(placeholder.querySelector('img')); 
        } else if (!placeholder.querySelector('img')) {
            placeholder.style.display = 'none';
        }
    } else {
        const card = createCardElement(text, selectedImageData);
        targetCardList.appendChild(card);
        attachCardEvents(card);
        updateAllColumnCounters();
    }
    
    modal.classList.add('hidden');
    saveBoard(); 
});

function attachCardEvents(card) {
    const optionsBtn = card.querySelector('.card-options-btn');
    const dropdown = card.querySelector('.card-dropdown');

    optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown-menu').forEach(d => { if (d !== dropdown) d.style.display = 'none'; });
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    card.querySelector('.delete-card-btn').addEventListener('click', () => {
        card.remove();
        updateAllColumnCounters();
        saveBoard(); 
    });

    card.querySelector('.edit-card-btn').addEventListener('click', () => {
        cardToEdit = card;
        modalInput.value = card.querySelector('.card-content').textContent;
        resetImageState();
        
        const existingImg = card.querySelector('.card-image-placeholder img');
        if (existingImg) {
            selectedImageData = existingImg.src;
            addImageBtn.textContent = 'Зображення вибрано ✓';
            let imgPreview = document.createElement('img');
            imgPreview.id = 'modal-image-preview';
            imgPreview.src = existingImg.src;
            imgPreview.style.cssText = 'max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 5px; margin-top: 10px;';
            document.querySelector('#card-modal .modal-content').insertBefore(imgPreview, saveCardBtn);
        }

        modal.classList.remove('hidden');
        modalInput.focus();
    });

    const imgElement = card.querySelector('.card-image-placeholder img');
    if (imgElement) attachLightbox(imgElement);

    // DRAG & DROP
    card.addEventListener('dragstart', (e) => {
        if (e.target.closest('.card-header-menu')) {
            e.preventDefault(); 
            return;
        }
        e.stopPropagation(); 
        dragType = 'card';
        card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        dragType = null;
        updateAllColumnCounters();
        saveBoard(); 
    });
}

function attachLightbox(imgElement) {
    imgElement.addEventListener('click', (e) => {
        e.stopPropagation(); 
        lightboxImg.src = imgElement.src;
        lightboxModal.classList.remove('hidden');
    });
}
closeLightboxBtn.addEventListener('click', () => lightboxModal.classList.add('hidden'));

/* ДОПОМІЖНІ ФУНКЦІЇ */
function updateAllColumnCounters() {
    document.querySelectorAll('.column').forEach((column, index) => {
        const infoSpan = column.querySelector('.column-info');
        if (infoSpan) {
            infoSpan.textContent = `Стовпець ${index + 1}`;
        }
    });
}

function getDragAfterElement(container, coord, isX = false) {
    const selector = isX ? '.column:not(.dragging)' : '.card:not(.dragging)';
    const draggableElements = [...container.querySelectorAll(selector)];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = isX ? (coord - box.left - box.width / 2) : (coord - box.top - box.height / 2);
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

loadBoard();
