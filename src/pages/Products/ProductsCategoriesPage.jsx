import React, { useState } from 'react';
import { productService, categoryService } from '../../api';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiPackage, FiTag,
} from 'react-icons/fi';

export default function ProductsCategoriesPage() {
  const { gold, goldDark, isDark, t, panelBg, panelBorder, inputStyle } = useSettings();
  const {
    products, categories,
    refreshProducts, refreshCategories,
  } = useData();

  /* tab */
  const [activeTab, setActiveTab] = useState('products'); // products | categories

  /* product form */
  const emptyProduct = { name: '', description: '', price: '', stock: '0', category_id: '', image: '' };
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSaving, setProductSaving] = useState(false);

  /* category form */
  const emptyCategory = { name: '', description: '' };
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);

  /* pagination */
  const [productsPage, setProductsPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const CATS_PER_PAGE = 9;

  /* ── fetch data ── */
  // Data is provided by DataContext – no local fetch needed.
  // After mutations we call refreshProducts / refreshCategories.

  /* ── Product CRUD ── */
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setShowProductModal(true);
  };
  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      stock: String(p.stock ?? 0),
      category_id: String(p.category_id),
      image: p.image || '',
    });
    setShowProductModal(true);
  };
  const saveProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.category_id) return;
    setProductSaving(true);
    try {
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock) || 0,
        category_id: parseInt(productForm.category_id),
      };
      if (editingProduct) {
        await productService.update(editingProduct.id, payload);
      } else {
        await productService.create(payload);
      }
      await refreshProducts();
      setShowProductModal(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save product');
    } finally {
      setProductSaving(false);
    }
  };
  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productService.delete(id);
      await refreshProducts();
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  /* ── Category CRUD ── */
  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategory);
    setShowCategoryModal(true);
  };
  const openEditCategory = (c) => {
    setEditingCategory(c);
    setCategoryForm({ name: c.name, description: c.description || '' });
    setShowCategoryModal(true);
  };
  const saveCategory = async () => {
    if (!categoryForm.name) return;
    setCategorySaving(true);
    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, categoryForm);
      } else {
        await categoryService.create(categoryForm);
      }
      await refreshCategories();
      setShowCategoryModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save category');
    } finally {
      setCategorySaving(false);
    }
  };
  const deleteCategory = async (id) => {
    if (!confirm('Delete this category? Products under it may become orphaned.')) return;
    try {
      await categoryService.delete(id);
      await refreshCategories();
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  /* paginated data */
  const paginatedProducts = products.slice((productsPage - 1) * ITEMS_PER_PAGE, productsPage * ITEMS_PER_PAGE);
  const totalProductPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const paginatedCategories = categories.slice((categoriesPage - 1) * CATS_PER_PAGE, categoriesPage * CATS_PER_PAGE);
  const totalCategoryPages = Math.max(1, Math.ceil(categories.length / CATS_PER_PAGE));

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>Products & Categories</h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMuted }}>
          Manage your product catalog and categories.
        </p>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 sm:mb-8">
        {[
          { key: 'products', label: 'Products', icon: <FiPackage size={14} /> },
          { key: 'categories', label: 'Categories', icon: <FiTag size={14} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 transition-all"
            style={{
              background: activeTab === tab.key ? gold : t.tableBg,
              color: activeTab === tab.key ? '#000' : t.textSecondary,
              border: activeTab === tab.key ? 'none' : `1px solid ${t.modalBorder}`,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ PRODUCTS TAB ═══════════════ */}
      {activeTab === 'products' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold" style={{ color: t.textPrimary }}>
              All Products <span className="text-xs sm:text-sm font-normal ml-2" style={{ color: t.textMuted }}>({products.length})</span>
            </h2>
            <button onClick={openAddProduct}
              className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 w-full sm:w-auto"
              style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
              <FiPlus size={16} /> Add Product
            </button>
          </div>

          {products.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: panelBg, border: panelBorder }}>
              <FiPackage size={48} className="mx-auto mb-4" style={{ color: t.textFaint }} />
              <p className="text-sm" style={{ color: t.textMuted }}>No products yet. Add your first product!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-4 flex flex-col" style={{ background: panelBg, border: panelBorder }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate" style={{ color: t.textPrimary }}>{p.name}</h3>
                      <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                        {p.category?.name || 'No category'}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md font-bold"
                      style={{
                        background: p.is_available !== false ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                        color: p.is_available !== false ? '#34d399' : '#f87171',
                      }}>
                      {p.is_available !== false ? 'Available' : 'Unavailable'}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: t.textFaint }}>{p.description}</p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${t.divider}` }}>
                    <div>
                      <p className="text-lg font-bold" style={{ color: gold }}>₱{parseFloat(p.price).toLocaleString('en', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[11px]" style={{ color: t.textFaint }}>Stock: {p.stock ?? '∞'}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEditProduct(p)}
                        className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} style={{ color: t.textSecondary }}>
                        <FiEdit2 size={14} />
                      </button>
                      <button onClick={() => deleteProduct(p.id)}
                        className="p-2 rounded-lg transition hover:bg-red-500/20" style={{ color: '#f87171' }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {totalProductPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs" style={{ color: t.textMuted }}>
                Page {productsPage} of {totalProductPages} ({products.length} products)
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setProductsPage((p) => Math.max(1, p - 1))} disabled={productsPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: t.divider, color: t.textPrimary }}>
                  ← Prev
                </button>
                <span className="text-xs px-2" style={{ color: t.textSecondary }}>
                  {productsPage} / {totalProductPages}
                </span>
                <button onClick={() => setProductsPage((p) => Math.min(totalProductPages, p + 1))} disabled={productsPage === totalProductPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: t.divider, color: t.textPrimary }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════ CATEGORIES TAB ═══════════════ */}
      {activeTab === 'categories' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: t.textPrimary }}>
              All Categories <span className="text-sm font-normal ml-2" style={{ color: t.textMuted }}>({categories.length})</span>
            </h2>
            <button onClick={openAddCategory}
              className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
              <FiPlus size={16} /> Add Category
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: panelBg, border: panelBorder }}>
              <FiTag size={48} className="mx-auto mb-4" style={{ color: t.textFaint }} />
              <p className="text-sm" style={{ color: t.textMuted }}>No categories yet. Add your first category!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedCategories.map((c) => {
                const count = products.filter((p) => p.category_id === c.id).length;
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-5 flex items-start justify-between" style={{ background: panelBg, border: panelBorder }}>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm" style={{ color: t.textPrimary }}>{c.name}</h3>
                      {c.description && <p className="text-xs mt-1" style={{ color: t.textFaint }}>{c.description}</p>}
                      <p className="text-[11px] mt-2" style={{ color: gold }}>{count} product{count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex gap-1.5 ml-3">
                      <button onClick={() => openEditCategory(c)}
                        className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} style={{ color: t.textSecondary }}>
                        <FiEdit2 size={14} />
                      </button>
                      <button onClick={() => deleteCategory(c.id)}
                        className="p-2 rounded-lg transition hover:bg-red-500/20" style={{ color: '#f87171' }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          {totalCategoryPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs" style={{ color: t.textMuted }}>
                Page {categoriesPage} of {totalCategoryPages} ({categories.length} categories)
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCategoriesPage((p) => Math.max(1, p - 1))} disabled={categoriesPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: t.divider, color: t.textPrimary }}>
                  ← Prev
                </button>
                <span className="text-xs px-2" style={{ color: t.textSecondary }}>
                  {categoriesPage} / {totalCategoryPages}
                </span>
                <button onClick={() => setCategoriesPage((p) => Math.min(totalCategoryPages, p + 1))} disabled={categoriesPage === totalCategoryPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: t.divider, color: t.textPrimary }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════ PRODUCT MODAL ═══════════════ */}
      <AnimatePresence>
        {showProductModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => setShowProductModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}` }}>

              <div className="p-5 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
                <h2 className="text-lg font-bold" style={{ color: t.textPrimary }}>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button onClick={() => setShowProductModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition`} style={{ color: t.textSecondary }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Product Name *</label>
                  <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="e.g. Lechon Kawali" />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Category *</label>
                  <select value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle}>
                    <option value="" style={{ background: isDark ? '#1a1a1a' : '#fff' }}>Select a category</option>
                    {categories.map((c) => <option key={c.id} value={c.id} style={{ background: isDark ? '#1a1a1a' : '#fff' }}>{c.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                      style={{ color: t.textMuted }}>Price (₱) *</label>
                    <input type="number" step="0.01" min="0" value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                      style={{ color: t.textMuted }}>Stock</label>
                    <input type="number" min="0" value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="0" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Description</label>
                  <textarea rows={3} value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm resize-none" style={inputStyle} placeholder="Optional description…" />
                </div>
              </div>

              <div className="p-5 flex gap-3" style={{ borderTop: panelBorder }}>
                <button onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: t.modalBorder, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}>
                  Cancel
                </button>
                <button onClick={saveProduct} disabled={productSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
                  {productSaving ? 'Saving…' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ CATEGORY MODAL ═══════════════ */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => setShowCategoryModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}` }}>

              <div className="p-5 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
                <h2 className="text-lg font-bold" style={{ color: t.textPrimary }}>
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                <button onClick={() => setShowCategoryModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition`} style={{ color: t.textSecondary }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Category Name *</label>
                  <input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="e.g. Main Course" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Description</label>
                  <textarea rows={2} value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm resize-none" style={inputStyle} placeholder="Optional…" />
                </div>
              </div>

              <div className="p-5 flex gap-3" style={{ borderTop: panelBorder }}>
                <button onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: t.modalBorder, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}>
                  Cancel
                </button>
                <button onClick={saveCategory} disabled={categorySaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
                  {categorySaving ? 'Saving…' : editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
