// ===== CONFIGURATION =====
const API_BASE_URL = 'https://finance-tracker-api-beta.vercel.app/api/v1';

// ===== STATE MANAGEMENT =====
let currentUser = null;
let expenses = [];
let categories = [];
let users = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    await checkAuth();
    
    // Initialize event listeners
    initializeNavigation();
    initializeModals();
    initializeForms();
    initializeFilters();
    
    // Load initial data
    await loadCategories();
    
    // Restore last visited page or default to dashboard
    const lastPage = sessionStorage.getItem('currentPage') || 'dashboard';
    navigateToPage(lastPage);
});

// ===== AUTHENTICATION =====
async function checkAuth() {
    try {
        // Get user from sessionStorage (just display data, not credentials)
        const userStr = sessionStorage.getItem('currentUser');
        if (!userStr) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = JSON.parse(userStr);
        
        // Verify authentication cookie is still valid
        const response = await fetch(`${API_BASE_URL}/categories`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            // Token expired or invalid, clear session and redirect
            sessionStorage.removeItem('currentUser');
            window.location.href = 'login.html';
            return;
        }
        
        updateUserProfile();
        
        // Show admin menu items if user is admin
        if (currentUser.role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'flex';
            });
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

function updateUserProfile() {
    document.getElementById('userName').textContent = 
        `${currentUser.first_name} ${currentUser.last_name}`;
    document.getElementById('userRole').textContent = currentUser.role;
}

// ===== NAVIGATION =====
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageName = item.getAttribute('data-page');
            navigateToPage(pageName);
        });
    });
}

function navigateToPage(pageName) {
    // Save current page to sessionStorage
    sessionStorage.setItem('currentPage', pageName);
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');
    
    // Update active page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`)?.classList.add('active');
    
    // Load page data
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'add-expense':
            // Form is already ready
            break;
        case 'expenses':
            loadExpenses();
            break;
        case 'my-categories':
            loadMyCategoriesTable();
            break;
        case 'users':
            loadUsers();
            break;
        case 'categories':
            loadCategoriesTable();
            break;
    }
}

// ===== MODAL MANAGEMENT =====
function initializeModals() {
    // User profile modal
    document.getElementById('userProfile').addEventListener('click', openUserProfileModal);
    
    // Close buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function openUserProfileModal() {
    document.getElementById('editFirstName').value = currentUser.first_name;
    document.getElementById('editLastName').value = currentUser.last_name;
    document.getElementById('editPassword').value = '';
    openModal('userProfileModal');
}

// ===== FORMS =====
function initializeForms() {
    // Add expense form
    document.getElementById('addExpenseForm').addEventListener('submit', handleAddExpense);
    
    // Edit profile form
    document.getElementById('editProfileForm').addEventListener('submit', handleEditProfile);
    
    // Edit user form (admin)
    document.getElementById('editUserForm').addEventListener('submit', handleEditUser);
    
    // Category form
    document.getElementById('categoryForm').addEventListener('submit', handleSaveCategory);
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
        document.getElementById('categoryModalTitle').textContent = 'Add Category';
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
        openModal('categoryModal');
    });
    
    // My Categories button
    document.getElementById('addMyCategoryBtn')?.addEventListener('click', () => {
        document.getElementById('categoryModalTitle').textContent = 'Add Category';
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
        openModal('categoryModal');
    });
    
    // Edit expense form
    document.getElementById('editExpenseForm').addEventListener('submit', handleEditExpense);
}

// ===== EXPENSE OPERATIONS =====
async function handleAddExpense(e) {
    e.preventDefault();
    
    const categoryId = document.getElementById('expenseCategory').value;
    const expenseData = {
        user_id: currentUser.user_id,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        category_ids: categoryId ? [parseInt(categoryId)] : [],
        expense_date: document.getElementById('expenseDate').value,
        store_name: document.getElementById('expenseStoreName').value || null,
        description: document.getElementById('expenseDescription').value || null
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(expenseData)
        });
        
        if (response.ok) {
            showAlert('Expense added successfully!', 'success');
            document.getElementById('addExpenseForm').reset();
            // Set date to today
            document.getElementById('expenseDate').valueAsDate = new Date();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Failed to add expense', 'error');
        }
    } catch (error) {
        console.error('Error adding expense:', error);
        showAlert('Failed to add expense', 'error');
    }
}

async function loadExpenses() {
    try {
        // Admin sees all expenses, regular users use their specific route
        const url = currentUser.role === 'admin' 
            ? `${API_BASE_URL}/expenses`
            : `${API_BASE_URL}/users/${currentUser.user_id}/expenses`;
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (response.ok) {
            expenses = await response.json();
            displayExpenses(expenses);
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

function displayExpenses(expensesToShow) {
    const tbody = document.getElementById('expensesTableBody');
    
    if (expensesToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No expenses found</td></tr>';
        return;
    }
    
    tbody.innerHTML = expensesToShow.map(expense => `
        <tr onclick="openExpenseDetailModal(${expense.expense_id})" style="cursor: pointer;" title="Click to view details">
            <td>${expense.expense_id}</td>
            <td>$${parseFloat(expense.amount).toFixed(2)}</td>
            <td>${expense.categories || 'N/A'}</td>
            <td>${expense.store_name || '-'}</td>
            <td>${formatDate(expense.expense_date)}</td>
            <td>${expense.description || '-'}</td>
            <td class="table-actions">
                <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); openEditExpenseModal(${expense.expense_id})">Edit</button>
                <button class="btn btn-small btn-danger" onclick="event.stopPropagation(); deleteExpense(${expense.expense_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function openEditExpenseModal(expenseId) {
    const expense = expenses.find(e => e.expense_id === expenseId);
    if (!expense) return;
    
    document.getElementById('editExpenseId').value = expense.expense_id;
    document.getElementById('editExpenseAmount').value = expense.amount;
    document.getElementById('editExpenseCategory').value = expense.category_id;
    document.getElementById('editExpenseDate').value = expense.expense_date.split('T')[0];
    document.getElementById('editExpenseStoreName').value = expense.store_name || '';
    document.getElementById('editExpenseDescription').value = expense.description || '';
    
    openModal('editExpenseModal');
}

async function handleEditExpense(e) {
    e.preventDefault();
    
    const expenseId = document.getElementById('editExpenseId').value;
    const categoryId = document.getElementById('editExpenseCategory').value;
    const expenseData = {
        user_id: currentUser.user_id,
        amount: parseFloat(document.getElementById('editExpenseAmount').value),
        category_ids: categoryId ? [parseInt(categoryId)] : [],
        expense_date: document.getElementById('editExpenseDate').value,
        store_name: document.getElementById('editExpenseStoreName').value || null,
        description: document.getElementById('editExpenseDescription').value || null
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(expenseData)
        });
        
        if (response.ok) {
            showAlert('Expense updated successfully!', 'success');
            closeAllModals();
            loadExpenses();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Failed to update expense', 'error');
        }
    } catch (error) {
        console.error('Error updating expense:', error);
        showAlert('Failed to update expense', 'error');
    }
}

async function deleteExpense(expenseId) {
    const confirmed = await showConfirm(
        'Are you sure you want to delete this expense? This action cannot be undone.',
        'Delete Expense'
    );
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showAlert('Expense deleted successfully!', 'success');
            loadExpenses();
            loadDashboard();
        } else {
            showAlert('Failed to delete expense', 'error');
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showAlert('Failed to delete expense', 'error');
    }
}

// ===== CATEGORY OPERATIONS =====
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            categories = await response.json();
            populateCategorySelects();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function populateCategorySelects() {
    const selects = [
        document.getElementById('expenseCategory'),
        document.getElementById('expenseCategoryFilter'),
        document.getElementById('editExpenseCategory')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        
        const currentValue = select.value;
        const options = categories.map(cat => 
            `<option value="${cat.category_id}">${cat.name}</option>`
        ).join('');
        
        if (select.id.includes('Filter')) {
            select.innerHTML = '<option value="">All Categories</option>' + options;
        } else {
            select.innerHTML = '<option value="">Select a category</option>' + options;
        }
        
        select.value = currentValue;
    });
}

async function loadCategoriesTable() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            categories = await response.json();
            displayCategories(categories);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function displayCategories(categoriesToShow) {
    const tbody = document.getElementById('categoriesTableBody');
    
    if (categoriesToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No categories found</td></tr>';
        return;
    }
    
    tbody.innerHTML = categoriesToShow.map(category => `
        <tr>
            <td>${category.category_id}</td>
            <td>${category.category_name}</td>
            <td>${category.description || '-'}</td>
            <td>${formatDate(category.created_at)}</td>
            <td class="table-actions">
                <button class="btn btn-small btn-secondary" onclick="openEditCategoryModal(${category.category_id})">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteCategory(${category.category_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openEditCategoryModal(categoryId) {
    const category = categories.find(c => c.category_id === categoryId);
    if (!category) return;
    
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryId').value = category.category_id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    
    openModal('categoryModal');
}

async function handleSaveCategory(e) {
    e.preventDefault();
    
    const categoryId = document.getElementById('categoryId').value;
    const categoryData = {
        name: document.getElementById('categoryName').value,
        description: document.getElementById('categoryDescription').value || null
    };
    
    try {
        const url = categoryId 
            ? `${API_BASE_URL}/categories/${categoryId}`
            : `${API_BASE_URL}/categories`;
        const method = categoryId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(categoryData)
        });
        
        if (response.ok) {
            showAlert(`Category ${categoryId ? 'updated' : 'created'} successfully!`, 'success');
            closeAllModals();
            await loadCategories();
            loadCategoriesTable();
            loadMyCategoriesTable();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Failed to save category', 'error');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showAlert('Failed to save category', 'error');
    }
}

async function deleteCategory(categoryId) {
    const confirmed = await showConfirm(
        'Are you sure you want to delete this category? This action cannot be undone.',
        'Delete Category'
    );
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showAlert('Category deleted successfully!', 'success');
            await loadCategories();
            loadCategoriesTable();
            loadMyCategoriesTable();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showAlert('Failed to delete category', 'error');
    }
}

// ===== MY CATEGORIES (USER VIEW) =====
let myCategories = [];

async function loadMyCategoriesTable() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            myCategories = await response.json();
            displayMyCategories(myCategories);
        }
    } catch (error) {
        console.error('Error loading my categories:', error);
    }
}

function displayMyCategories(categoriesToShow) {
    const tbody = document.getElementById('myCategoriesTableBody');
    
    if (categoriesToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No categories found</td></tr>';
        return;
    }
    
    tbody.innerHTML = categoriesToShow.map(category => `
        <tr>
            <td>${category.category_id}</td>
            <td>${category.name}</td>
            <td>${category.description || '-'}</td>
            <td>${formatDate(category.created_at)}</td>
            <td class="table-actions">
                <button class="btn btn-small btn-secondary" onclick="openEditCategoryModal(${category.category_id})">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteMyCategoryWithRefresh(${category.category_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteMyCategoryWithRefresh(categoryId) {
    const confirmed = await showConfirm(
        'Are you sure you want to delete this category? This action cannot be undone.',
        'Delete Category'
    );
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showAlert('Category deleted successfully!', 'success');
            await loadCategories();
            loadMyCategoriesTable();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showAlert('Failed to delete category', 'error');
    }
}

function filterMyCategories() {
    const search = document.getElementById('myCategorySearchFilter').value.toLowerCase();
    
    let filtered = myCategories.filter(category => {
        return !search ||
            category.name.toLowerCase().includes(search) ||
            category.description?.toLowerCase().includes(search);
    });
    
    displayMyCategories(filtered);
}

function clearMyCategoryFilters() {
    document.getElementById('myCategorySearchFilter').value = '';
    displayMyCategories(myCategories);
}

// ===== USER OPERATIONS (ADMIN) =====
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            users = await response.json();
            displayUsers(users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers(usersToShow) {
    const tbody = document.getElementById('usersTableBody');
    
    if (usersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = usersToShow.map(user => `
        <tr>
            <td>${user.user_id}</td>
            <td>${user.first_name}</td>
            <td>${user.last_name}</td>
            <td><span style="text-transform: capitalize;">${user.role}</span></td>
            <td>${formatDate(user.created_at)}</td>
            <td class="table-actions">
                <button class="btn btn-small btn-secondary" onclick="openEditUserModal(${user.user_id})">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteUser(${user.user_id})" ${user.user_id === currentUser.user_id ? 'disabled' : ''}>Delete</button>
            </td>
        </tr>
    `).join('');
}

function openEditUserModal(userId) {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;
    
    document.getElementById('editUserId').value = user.user_id;
    document.getElementById('editUserFirstName').value = user.first_name;
    document.getElementById('editUserLastName').value = user.last_name;
    document.getElementById('editUserRole').value = user.role;
    document.getElementById('editUserPassword').value = '';
    
    openModal('editUserModal');
}

async function handleEditUser(e) {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const userData = {
        first_name: document.getElementById('editUserFirstName').value,
        last_name: document.getElementById('editUserLastName').value,
        role: document.getElementById('editUserRole').value
    };
    
    const password = document.getElementById('editUserPassword').value;
    if (password) {
        userData.password = password;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            showAlert('User updated successfully!', 'success');
            closeAllModals();
            loadUsers();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Failed to update user', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showAlert('Failed to update user', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showAlert('User deleted successfully!', 'success');
            loadUsers();
        } else {
            showAlert('Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Failed to delete user', 'error');
    }
}

// ===== PROFILE OPERATIONS =====
async function handleEditProfile(e) {
    e.preventDefault();
    
    const userData = {
        first_name: document.getElementById('editFirstName').value,
        last_name: document.getElementById('editLastName').value,
        role: currentUser.role
    };
    
    const password = document.getElementById('editPassword').value;
    if (password) {
        userData.password = password;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.user_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            currentUser.first_name = updatedUser.first_name;
            currentUser.last_name = updatedUser.last_name;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserProfile();
            showAlert('Profile updated successfully!', 'success');
            closeAllModals();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Failed to update profile', 'error');
    }
}

// ===== DASHBOARD =====
async function loadDashboard() {
    try {
        // Admin sees all expenses, regular users use their specific route
        const url = currentUser.role === 'admin' 
            ? `${API_BASE_URL}/expenses`
            : `${API_BASE_URL}/users/${currentUser.user_id}/expenses`;
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const allExpenses = await response.json();
            updateDashboardStats(allExpenses);
            displayRecentExpenses(allExpenses.slice(0, 5));
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateDashboardStats(expenses) {
    const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    
    const now = new Date();
    const thisMonth = expenses.filter(exp => {
        const expDate = new Date(exp.expense_date);
        return expDate.getMonth() === now.getMonth() && 
               expDate.getFullYear() === now.getFullYear();
    });
    const monthTotal = thisMonth.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    
    const avg = expenses.length > 0 ? total / expenses.length : 0;
    
    document.getElementById('totalExpenses').textContent = `$${total.toFixed(2)}`;
    document.getElementById('monthExpenses').textContent = `$${monthTotal.toFixed(2)}`;
    document.getElementById('totalTransactions').textContent = expenses.length;
    document.getElementById('avgExpense').textContent = `$${avg.toFixed(2)}`;
}

function displayRecentExpenses(recentExpenses) {
    const container = document.getElementById('recentExpensesList');
    
    if (recentExpenses.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">No expenses yet</p>';
        return;
    }
    
    container.innerHTML = recentExpenses.map(expense => `
        <div class="expense-item" onclick="openExpenseDetailModal(${expense.expense_id})" style="cursor: pointer;">
            <div class="expense-details">
                <div class="expense-category">${expense.categories || 'Uncategorized'}</div>
                <div class="expense-description">${expense.description || 'No description'}</div>
                <div class="expense-date">${formatDate(expense.expense_date)}</div>
            </div>
            <div class="expense-amount">$${parseFloat(expense.amount).toFixed(2)}</div>
        </div>
    `).join('');
}

// ===== FILTERS =====
function initializeFilters() {
    // Expense filters
    document.getElementById('expenseSearchFilter')?.addEventListener('input', filterExpenses);
    document.getElementById('expenseCategoryFilter')?.addEventListener('change', filterExpenses);
    document.getElementById('expenseDateFromFilter')?.addEventListener('change', filterExpenses);
    document.getElementById('expenseDateToFilter')?.addEventListener('change', filterExpenses);
    document.getElementById('clearExpenseFilters')?.addEventListener('click', clearExpenseFilters);
    
    // User filters
    document.getElementById('userSearchFilter')?.addEventListener('input', filterUsers);
    document.getElementById('userRoleFilter')?.addEventListener('change', filterUsers);
    document.getElementById('clearUserFilters')?.addEventListener('click', clearUserFilters);
    
    // Category filters
    document.getElementById('categorySearchFilter')?.addEventListener('input', filterCategories);
    document.getElementById('clearCategoryFilters')?.addEventListener('click', clearCategoryFilters);
    
    // My Category filters
    document.getElementById('myCategorySearchFilter')?.addEventListener('input', filterMyCategories);
    document.getElementById('clearMyCategoryFilters')?.addEventListener('click', clearMyCategoryFilters);
}

function filterExpenses() {
    const search = document.getElementById('expenseSearchFilter').value.toLowerCase();
    const category = document.getElementById('expenseCategoryFilter').value;
    const dateFrom = document.getElementById('expenseDateFromFilter').value;
    const dateTo = document.getElementById('expenseDateToFilter').value;
    
    let filtered = expenses.filter(expense => {
        const matchesSearch = !search || 
            expense.description?.toLowerCase().includes(search) ||
            expense.categories?.toLowerCase().includes(search) ||
            expense.amount.toString().includes(search);
        
        // Check if the category filter matches by finding the category name in the categories string
        const selectedCategory = categories.find(cat => cat.category_id == category);
        const matchesCategory = !category || 
            (selectedCategory && expense.categories?.toLowerCase().includes(selectedCategory.name.toLowerCase()));
        
        const expenseDate = new Date(expense.expense_date);
        const matchesDateFrom = !dateFrom || expenseDate >= new Date(dateFrom);
        const matchesDateTo = !dateTo || expenseDate <= new Date(dateTo);
        
        return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
    });
    
    displayExpenses(filtered);
}

function clearExpenseFilters() {
    document.getElementById('expenseSearchFilter').value = '';
    document.getElementById('expenseCategoryFilter').value = '';
    document.getElementById('expenseDateFromFilter').value = '';
    document.getElementById('expenseDateToFilter').value = '';
    displayExpenses(expenses);
}

function filterUsers() {
    const search = document.getElementById('userSearchFilter').value.toLowerCase();
    const role = document.getElementById('userRoleFilter').value;
    
    let filtered = users.filter(user => {
        const matchesSearch = !search ||
            user.first_name.toLowerCase().includes(search) ||
            user.last_name.toLowerCase().includes(search);
        
        const matchesRole = !role || user.role === role;
        
        return matchesSearch && matchesRole;
    });
    
    displayUsers(filtered);
}

function clearUserFilters() {
    document.getElementById('userSearchFilter').value = '';
    document.getElementById('userRoleFilter').value = '';
    displayUsers(users);
}

function filterCategories() {
    const search = document.getElementById('categorySearchFilter').value.toLowerCase();
    
    let filtered = categories.filter(category => {
        return !search ||
            category.name.toLowerCase().includes(search) ||
            category.description?.toLowerCase().includes(search);
    });
    
    displayCategories(filtered);
}

function clearCategoryFilters() {
    document.getElementById('categorySearchFilter').value = '';
    displayCategories(categories);
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function showAlert(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    // Set icon based on type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '✓';
            toast.style.backgroundColor = '#10b981';
            break;
        case 'error':
            icon = '✕';
            toast.style.backgroundColor = '#ef4444';
            break;
        case 'warning':
            icon = '⚠';
            toast.style.backgroundColor = '#f59e0b';
            break;
        default:
            icon = 'ℹ';
            toast.style.backgroundColor = '#3b82f6';
    }
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Custom confirm dialog
function showConfirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');
        const closeBtn = modal.querySelector('.modal-close');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // Show modal
        modal.classList.add('active');
        
        // Handle responses
        const handleOk = () => {
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            modal.classList.remove('active');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            closeBtn.removeEventListener('click', handleCancel);
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        closeBtn.addEventListener('click', handleCancel);
    });
}

// Set today's date as default for expense date inputs
document.getElementById('expenseDate').valueAsDate = new Date();

// Logout functionality
async function logout() {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Open expense detail modal
async function openExpenseDetailModal(expenseId) {
    const expense = expenses.find(e => e.expense_id === expenseId);
    if (!expense) {
        // Try to fetch from dashboard expenses if not in expenses array
        const url = currentUser.role === 'admin' 
            ? `${API_BASE_URL}/expenses`
            : `${API_BASE_URL}/users/${currentUser.user_id}/expenses`;
        
        try {
            const response = await fetch(url, { credentials: 'include' });
            if (response.ok) {
                const allExpenses = await response.json();
                const foundExpense = allExpenses.find(e => e.expense_id === expenseId);
                if (foundExpense) {
                    displayExpenseDetails(foundExpense);
                }
            }
        } catch (error) {
            console.error('Error fetching expense:', error);
        }
        return;
    }
    
    displayExpenseDetails(expense);
}

function displayExpenseDetails(expense) {
    document.getElementById('detailExpenseId').textContent = expense.expense_id;
    document.getElementById('detailExpenseAmount').textContent = `$${parseFloat(expense.amount).toFixed(2)}`;
    document.getElementById('detailExpenseCategory').textContent = expense.categories || 'Uncategorized';
    document.getElementById('detailExpenseDate').textContent = formatDate(expense.expense_date);
    document.getElementById('detailExpenseStoreName').textContent = expense.store_name || 'Not specified';
    document.getElementById('detailExpenseDescription').textContent = expense.description || 'No description provided';
    
    // Show/hide user row based on whether we have user info
    const userRow = document.getElementById('detailUserRow');
    if (expense.first_name && expense.last_name) {
        document.getElementById('detailExpenseUser').textContent = `${expense.first_name} ${expense.last_name}`;
        userRow.style.display = 'flex';
    } else {
        userRow.style.display = 'none';
    }
    
    openModal('expenseDetailModal');
}

// Make functions globally available
window.openEditExpenseModal = openEditExpenseModal;
window.deleteExpense = deleteExpense;
window.openEditCategoryModal = openEditCategoryModal;
window.deleteCategory = deleteCategory;
window.deleteMyCategoryWithRefresh = deleteMyCategoryWithRefresh;
window.openExpenseDetailModal = openExpenseDetailModal;
window.openEditUserModal = openEditUserModal;
window.deleteUser = deleteUser;
window.logout = logout;