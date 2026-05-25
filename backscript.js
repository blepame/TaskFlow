const dragStyles = document.createElement('style');
dragStyles.innerHTML = `
    .dragging { opacity: 0.5; border: 2px dashed #888 !important; }
    .column, .card { user-select: none; }
    .column-header { cursor: grab; }
    .column-header:active { cursor: grabbing; }
    .card { cursor: pointer; transition: transform 0.1s; }
    .card:hover { transform: scale(1.02); }
`;
document.head.appendChild(dragStyles);

const board = document.getElementById('board');
const changeBgBtn = document.getElementById('change-bg-btn');
const addColumnBtn = document.querySelector('.add-column-btn');
const modal = document.getElementById('card-modal');
const modalInput = document.querySelector('.modal-text-input');
const saveCardBtn = document.querySelector('.save-modal-btn');
const closeModalBtn = document.querySelector('.close-btn');
const addImageBtn = document.querySelector('.add-image-btn');

let selectedImageData = null;
let targetCardList = null;
let dragType = null; 

const columnModal = document.createElement('div');
columnModal.className = 'modal hidden';
columnModal.innerHTML = `
    <div class="modal-content">
        <span class="close-column-btn close-btn">&times;</span>
        <input type="text" placeholder="Введіть назву колонки..." class="modal-column-input modal-text-input">
        <button class="save-column-btn save-modal-btn" style="margin-top: 15px;">Зберегти</button>
    </div>
`;
document.body.appendChild(columnModal);

const columnModalInput = columnModal.querySelector('.modal-column-input');
const saveColumnBtn = columnModal.querySelector('.save-column-btn');
const closeColumnBtn = columnModal.querySelector('.close-column-btn');

const editCardModal = document.createElement('div');
editCardModal.className = 'modal hidden';
editCardModal.innerHTML = `
    <div class="modal-content">
        <span class="close-edit-btn close-btn">&times;</span>
        <textarea class="edit-text-input modal-text-input" placeholder="Текст картки..." style="min-height: 80px; resize: vertical; font-family: inherit;"></textarea>
        <button class="edit-image-btn save-modal-btn" style="background: #4CAF50; margin-top: 10px;">+ Додати/Змінити ПНГ</button>
        <div id="edit-image-preview-container" style="margin-top: 10px; display: none;">
            <img id="edit-image-preview" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 5px;">
        </div>
        <button class="save-edit-btn save-modal-btn" style="margin-top: 15px;">Зберегти зміни</button>
    </div>
`;
document.body.appendChild(editCardModal);

const editTextInput = editCardModal.querySelector('.edit-text-input');
const editImageBtn = editCardModal.querySelector('.edit-image-btn');
const saveEditBtn = editCardModal.querySelector('.save-edit-btn');
const closeEditBtn = editCardModal.querySelector('.close-edit-btn');
const editImagePreview = editCardModal.querySelector('#edit-image-preview');
const editImagePreviewContainer = editCardModal.querySelector('#edit-image-preview-container');

let cardToEdit = null;
let editImageData = null;

// Логіка модалки редагування
closeEditBtn.addEventListener('click', () => {
    editCardModal.classList.add('hidden');
});

editImageBtn.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png, image/jpeg';

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            editImageData = event.target.result;
            editImagePreview.src = editImageData;
            editImagePreviewContainer.style.display = 'block';
            editImageBtn.textContent = 'Зображення вибрано ✓';
        };
        reader.readAsDataURL(file);
    });

    fileInput.click();
});

saveEditBtn.addEventListener('click', () => {
    if (!cardToEdit) return;
    
    const text = editTextInput.value.trim();
    if (text) {
        cardToEdit.querySelector('.card-content').textContent = text;
    }

    if (editImageData) {
        cardToEdit.querySelector('.card-image-placeholder').innerHTML = `<img src="${editImageData}" alt="Card Image" style="max-width: 100%; border-radius: 4px;">`;
    }

    editCardModal.classList.add('hidden');
});

document.querySelectorAll('.column').forEach(column => {
    column.draggable = true;
    attachColumnEvents(column);
});
document.querySelectorAll('.card').forEach(attachCardEvents);

changeBgBtn.addEventListener('click', () => {
    const newBg = prompt('Введіть URL зображення або HEX колір (наприклад, #1a1a1a або #2b1165):');
    if (newBg) {
        document.body.style.background = newBg.startsWith('#') ? newBg : `url(${newBg}) center/cover`;
    }
});

board.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dragType !== 'column') return;

    const afterElement = getDragAfterElementColumn(board, e.clientX);
    const draggable = document.querySelector('.column.dragging');
    const wrapper = document.querySelector('.add-column-wrapper');
    
    if (afterElement == null) {
        board.insertBefore(draggable, wrapper);
    } else {
        board.insertBefore(draggable, afterElement);
    }
});

addColumnBtn.addEventListener('click', () => {
    columnModal.classList.remove('hidden');
    columnModalInput.value = '';
    columnModalInput.focus();
});

closeColumnBtn.addEventListener('click', () => {
    columnModal.classList.add('hidden');
});

saveColumnBtn.addEventListener('click', () => {
    const title = columnModalInput.value.trim();
    if (!title) return;

    const column = document.createElement('div');
    column.className = 'column';
    column.draggable = true;
    column.innerHTML = `
        <div class="column-header" style="position: relative;">
            <h2 class="column-title">${title}</h2>
            <span class="column-info">Інформація про стовпець (0)</span>
            <button class="column-options-btn">⋮</button>
            <div class="column-dropdown" style="display: none; position: absolute; right: 0; top: 30px; background: #272727; padding: 5px; border-radius: 5px; z-index: 100; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                <button class="delete-column-btn" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Видалити</button>
            </div>
        </div>
        <div class="card-list"></div>
        <button class="add-card-btn">+</button>
    `;

    const addColumnWrapper = document.querySelector('.add-column-wrapper');
    board.insertBefore(column, addColumnWrapper);
    
    attachColumnEvents(column);
    columnModal.classList.add('hidden');
});

function attachColumnEvents(column) {
    column.querySelector('.add-card-btn').addEventListener('click', (e) => {
        targetCardList = e.target.previousElementSibling;
        modal.classList.remove('hidden');
        modalInput.value = '';
        modalInput.focus();
    });

    const header = column.querySelector('.column-header');
    header.style.position = 'relative';

    let dropdown = column.querySelector('.column-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'column-dropdown';
        dropdown.style.cssText = 'display: none; position: absolute; right: 0; top: 30px; background: #272727; padding: 5px; border-radius: 5px; z-index: 100; box-shadow: 0 2px 5px rgba(0,0,0,0.5);';
        dropdown.innerHTML = `<button class="delete-column-btn" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Видалити</button>`;
        header.appendChild(dropdown);
    }

    const optionsBtn = column.querySelector('.column-options-btn');
    optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        document.querySelectorAll('.column-dropdown').forEach(d => {
            if (d !== dropdown) d.style.display = 'none';
        });
        
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    dropdown.querySelector('.delete-column-btn').addEventListener('click', () => {
        column.remove();
    });

    column.addEventListener('dragstart', (e) => {
        if (e.target.closest('.card')) return; 
        dragType = 'column';
        column.classList.add('dragging');
    });

    column.addEventListener('dragend', () => {
        column.classList.remove('dragging');
        dragType = null;
    });

    const cardList = column.querySelector('.card-list');
    cardList.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragType !== 'card') return; 

        const afterElement = getDragAfterElementCard(cardList, e.clientY);
        const draggable = document.querySelector('.card.dragging');
        if (afterElement == null) {
            cardList.appendChild(draggable);
        } else {
            cardList.insertBefore(draggable, afterElement);
        }
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.column-dropdown').forEach(d => d.style.display = 'none');
});

closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    resetImageState();
});

function resetImageState() {
    selectedImageData = null;
    addImageBtn.textContent = '+ Додати зображення';
    const imagePreview = document.getElementById('modal-image-preview');
    if (imagePreview) {
        imagePreview.style.display = 'none';
        imagePreview.src = '';
    }
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
            
            let imagePreview = document.getElementById('modal-image-preview');
            if (!imagePreview) {
                imagePreview = document.createElement('img');
                imagePreview.id = 'modal-image-preview';
                imagePreview.style.cssText = 'max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 5px; display: none; margin-top: 10px; margin-bottom: 10px;';
                document.querySelector('.modal-content').insertBefore(imagePreview, saveCardBtn);
            }
            imagePreview.src = selectedImageData;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    fileInput.click();
});

saveCardBtn.addEventListener('click', () => {
    const text = modalInput.value.trim();
    if (!text || !targetCardList) return;

    let imageContent = selectedImageData 
        ? `<img src="${selectedImageData}" alt="Card Image" style="max-width: 100%; border-radius: 4px;">` 
        : 'Зображення не вставлено';

    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.innerHTML = `
        <button class="delete-card-btn">Видалити</button>
        <div class="card-image-placeholder">${imageContent}</div>
        <div class="card-content">${text}</div>
    `;

    targetCardList.appendChild(card);
    attachCardEvents(card);
    updateColumnCounter(targetCardList.closest('.column'));
    
    modal.classList.add('hidden');
    resetImageState();
});

function attachCardEvents(card) {
    // Видалення картки
    card.querySelector('.delete-card-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const column = card.closest('.column');
        card.remove();
        if (column) updateColumnCounter(column);
    });

    // Відкриття модалки при кліку на саму картку
    card.addEventListener('click', () => {
        cardToEdit = card;
        
        // Підтягуємо існуючий текст
        editTextInput.value = card.querySelector('.card-content').textContent;
        
        // Скидаємо стан кнопки фото
        editImageData = null;
        editImageBtn.textContent = '+ Додати/Змінити ПНГ';
        
        // Перевіряємо, чи є вже фото в картці, щоб показати його в прев'ю
        const existingImg = card.querySelector('.card-image-placeholder img');
        if (existingImg) {
            editImagePreview.src = existingImg.src;
            editImagePreviewContainer.style.display = 'block';
        } else {
            editImagePreview.src = '';
            editImagePreviewContainer.style.display = 'none';
        }

        editCardModal.classList.remove('hidden');
        editTextInput.focus();
    });

    // Drag and Drop
    card.addEventListener('dragstart', (e) => {
        e.stopPropagation(); 
        dragType = 'card';
        card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        dragType = null;
        document.querySelectorAll('.column').forEach(updateColumnCounter);
    });
}

function updateColumnCounter(column) {
    const count = column.querySelectorAll('.card').length;
    const infoSpan = column.querySelector('.column-info');
    if (infoSpan) {
        infoSpan.textContent = `Інформація про стовпець (${count})`;
    }
}

function getDragAfterElementCard(container, y) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function getDragAfterElementColumn(container, x) {
    const draggableElements = [...container.querySelectorAll('.column:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
