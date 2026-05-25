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

const savedBg = localStorage.getItem('boardBackground');
if (savedBg) {
    document.body.style.background = savedBg.startsWith('#') ? savedBg : `url(${savedBg}) center/cover`;
}

const boardTitle = document.querySelector('.board-title');
if (boardTitle) {
    const savedTitle = localStorage.getItem('boardTitle');
    if (savedTitle) {
        boardTitle.textContent = savedTitle;
    }

    boardTitle.contentEditable = 'true';
    boardTitle.style.cursor = 'text';
    boardTitle.style.outline = 'none';
    boardTitle.style.userSelect = 'auto'; 
    boardTitle.style.pointerEvents = 'auto';
    boardTitle.style.position = 'relative';
    boardTitle.style.zIndex = '1000';

    boardTitle.addEventListener('click', () => {
        boardTitle.focus();
    });

    boardTitle.addEventListener('focus', () => {
        boardTitle.style.borderBottom = '1px dashed rgba(255, 255, 255, 0.5)';
    });

    boardTitle.addEventListener('blur', () => {
        boardTitle.style.borderBottom = 'none';
        localStorage.setItem('boardTitle', boardTitle.textContent.trim());
    });

    boardTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            boardTitle.blur();
        }
    });
}

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

function saveBoardState() {
    const columns = document.querySelectorAll('.column');
    const data = Array.from(columns).map(col => {
        const title = col.querySelector('.column-title').textContent;
        const cards = Array.from(col.querySelectorAll('.card')).map(card => {
            const text = card.querySelector('.card-content').textContent;
            const img = card.querySelector('.card-image-placeholder img');
            return { text: text, image: img ? img.src : null };
        });
        return { title: title, cards: cards };
    });
    localStorage.setItem('kanbanData', JSON.stringify(data));
}

function loadBoardState() {
    const savedData = localStorage.getItem('kanbanData');
    if (!savedData || !board) return;

    const data = JSON.parse(savedData);
    document.querySelectorAll('.column').forEach(c => c.remove());

    const addColumnWrapper = document.querySelector('.add-column-wrapper');

    data.forEach(colData => {
        const column = document.createElement('div');
        column.className = 'column';
        column.draggable = true;
        column.innerHTML = `
            <div class="column-header" style="position: relative;">
                <h2 class="column-title">${colData.title}</h2>
                <span class="column-info">Інформація про стовпець (${colData.cards.length})</span>
                <button class="column-options-btn">⋮</button>
                <div class="column-dropdown" style="display: none; position: absolute; right: 0; top: 30px; background: #272727; padding: 5px; border-radius: 5px; z-index: 100; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                    <button class="delete-column-btn" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Видалити</button>
                </div>
            </div>
            <div class="card-list"></div>
            <button class="add-card-btn">+</button>
        `;

        const cardList = column.querySelector('.card-list');
        
        colData.cards.forEach(cardData => {
            let imageContent = cardData.image 
                ? `<img src="${cardData.image}" alt="Card Image" style="max-width: 100%; border-radius: 4px;">` 
                : 'Зображення не вставлено';

            const card = document.createElement('div');
            card.className = 'card';
            card.draggable = true;
            card.innerHTML = `
                <button class="delete-card-btn">Видалити</button>
                <div class="card-image-placeholder">${imageContent}</div>
                <div class="card-content">${cardData.text}</div>
            `;
            
            cardList.appendChild(card);
            attachCardEvents(card);
        });

        if (addColumnWrapper) {
            board.insertBefore(column, addColumnWrapper);
        } else {
            board.appendChild(column);
        }
        
        attachColumnEvents(column);
    });
}

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
    saveBoardState();
});

if (changeBgBtn) {
    changeBgBtn.addEventListener('click', () => {
        const newBg = prompt('Введіть URL зображення або HEX колір (наприклад, #1a1a1a або #2b1165):');
        if (newBg) {
            document.body.style.background = newBg.startsWith('#') ? newBg : `url(${newBg}) center/cover`;
            localStorage.setItem('boardBackground', newBg);
        }
    });
}

if (board) {
    board.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragType !== 'column') return;

        const afterElement = getDragAfterElementColumn(board, e.clientX);
        const draggable = document.querySelector('.column.dragging');
        const wrapper = document.querySelector('.add-column-wrapper');
        
        if (afterElement == null) {
            if(wrapper) board.insertBefore(draggable, wrapper);
        } else {
            board.insertBefore(draggable, afterElement);
        }
    });
}

if (addColumnBtn) {
    addColumnBtn.addEventListener('click', (e) => {
        e.preventDefault();
        columnModal.classList.remove('hidden');
        columnModalInput.value = '';
        columnModalInput.focus();
    });
}

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
    if (board && addColumnWrapper) {
        board.insertBefore(column, addColumnWrapper);
    } else if (board) {
        board.appendChild(column);
    }
    
    attachColumnEvents(column);
    columnModal.classList.add('hidden');
    saveBoardState();
});

function attachColumnEvents(column) {
    const addCardBtnElement = column.querySelector('.add-card-btn');
    if (addCardBtnElement) {
        addCardBtnElement.addEventListener('click', (e) => {
            targetCardList = e.target.previousElementSibling;
            if (modal) {
                modal.classList.remove('hidden');
                if (modalInput) {
                    modalInput.value = '';
                    modalInput.focus();
                }
            }
        });
    }

    const header = column.querySelector('.column-header');
    if (header) header.style.position = 'relative';

    let dropdown = column.querySelector('.column-dropdown');
    if (!dropdown && header) {
        dropdown = document.createElement('div');
        dropdown.className = 'column-dropdown';
        dropdown.style.cssText = 'display: none; position: absolute; right: 0; top: 30px; background: #272727; padding: 5px; border-radius: 5px; z-index: 100; box-shadow: 0 2px 5px rgba(0,0,0,0.5);';
        dropdown.innerHTML = `<button class="delete-column-btn" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Видалити</button>`;
        header.appendChild(dropdown);
    }

    const optionsBtn = column.querySelector('.column-options-btn');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.column-dropdown').forEach(d => {
                if (d !== dropdown) d.style.display = 'none';
            });
            if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
    }

    if (dropdown) {
        const deleteColBtn = dropdown.querySelector('.delete-column-btn');
        if (deleteColBtn) {
            deleteColBtn.addEventListener('click', () => {
                column.remove();
                saveBoardState();
            });
        }
    }

    column.addEventListener('dragstart', (e) => {
        if (e.target.closest('.card')) return; 
        dragType = 'column';
        column.classList.add('dragging');
    });

    column.addEventListener('dragend', () => {
        column.classList.remove('dragging');
        dragType = null;
        saveBoardState();
    });

    const cardList = column.querySelector('.card-list');
    if (cardList) {
        cardList.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (dragType !== 'card') return; 

            const afterElement = getDragAfterElementCard(cardList, e.clientY);
            const draggable = document.querySelector('.card.dragging');
            if (!draggable) return;

            if (afterElement == null) {
                cardList.appendChild(draggable);
            } else {
                cardList.insertBefore(draggable, afterElement);
            }
        });
    }
}

document.addEventListener('click', () => {
    document.querySelectorAll('.column-dropdown').forEach(d => d.style.display = 'none');
});

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        if (modal) modal.classList.add('hidden');
        resetImageState();
    });
}

function resetImageState() {
    selectedImageData = null;
    if (addImageBtn) addImageBtn.textContent = '+ Додати зображення';
    const imagePreview = document.getElementById('modal-image-preview');
    if (imagePreview) {
        imagePreview.style.display = 'none';
        imagePreview.src = '';
    }
}

if (addImageBtn) {
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
                    if (saveCardBtn && saveCardBtn.parentNode) {
                        saveCardBtn.parentNode.insertBefore(imagePreview, saveCardBtn);
                    }
                }
                imagePreview.src = selectedImageData;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });

        fileInput.click();
    });
}

if (saveCardBtn) {
    saveCardBtn.addEventListener('click', () => {
        if (!modalInput || !targetCardList) return;
        const text = modalInput.value.trim();
        if (!text) return;

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
        const parentColumn = targetCardList.closest('.column');
        if (parentColumn) updateColumnCounter(parentColumn);
        
        if (modal) modal.classList.add('hidden');
        resetImageState();
        saveBoardState();
    });
}

function attachCardEvents(card) {
    const deleteBtn = card.querySelector('.delete-card-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const column = card.closest('.column');
            card.remove();
            if (column) updateColumnCounter(column);
            saveBoardState();
        });
    }

    card.addEventListener('click', () => {
        cardToEdit = card;
        
        const contentDiv = card.querySelector('.card-content');
        if (contentDiv) editTextInput.value = contentDiv.textContent;
        
        editImageData = null;
        editImageBtn.textContent = '+ Додати/Змінити ПНГ';
        
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

    card.addEventListener('dragstart', (e) => {
        e.stopPropagation(); 
        dragType = 'card';
        card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        dragType = null;
        document.querySelectorAll('.column').forEach(updateColumnCounter);
        saveBoardState();
    });
}

function updateColumnCounter(column) {
    const cards = column.querySelectorAll('.card');
    const infoSpan = column.querySelector('.column-info');
    if (infoSpan) {
        infoSpan.textContent = `Інформація про стовпець (${cards ? cards.length : 0})`;
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

document.querySelectorAll('.column').forEach(column => {
    column.draggable = true;
    attachColumnEvents(column);
});
document.querySelectorAll('.card').forEach(attachCardEvents);

loadBoardState();
