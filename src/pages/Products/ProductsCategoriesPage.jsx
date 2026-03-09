import React, { useState } from 'react';
import { productService, categoryService, addonService, variantService } from '../../api';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiPackage, FiTag, FiCoffee, FiMinus,
} from 'react-icons/fi';

export default function ProductsCategoriesPage() {
  const { gold, goldDark, goldRgb, isDark, t, panelBg, panelBorder, inputStyle } = useSettings();
  const {
    products, categories, addons,
    refreshProducts, refreshCategories, refreshAddons,
  } = useData();

  /* tab */
  const [activeTab, setActiveTab] = useState('products'); // products | categories | addons

  /* product form */
  const emptyProduct = { name: '', description: '', price: '', category_id: '', image: '' };
  const [productForm, setProductForm] = useState(emptyProduct);
  const [productSizes, setProductSizes] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSaving, setProductSaving] = useState(false);

  /* category form */
  const emptyCategory = { name: '', description: '' };
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);

  /* addon form */
  const emptyAddon = { name: '', description: '', price: '', category_id: '', product_id: '' };
  const [addonForm, setAddonForm] = useState(emptyAddon);
  const [editingAddon, setEditingAddon] = useState(null);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [addonSaving, setAddonSaving] = useState(false);

  /* delete confirmation modal */
  const [deleteModal, setDeleteModal] = useState({ open: false, type: '', id: null, name: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* pagination */
  const [productsPage, setProductsPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [addonsPage, setAddonsPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const CATS_PER_PAGE = 9;
  const ADDONS_PER_PAGE = 9;

  /* ── fetch data ── */
  // Data is provided by DataContext – no local fetch needed.
  // After mutations we call refreshProducts / refreshCategories.

  /* ── Product CRUD ── */
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setProductSizes([]);
    setShowProductModal(true);
  };
  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      category_id: String(p.category_id),
      image: p.image || '',
    });
    // Load variants as sizes
    setProductSizes((p.variants || []).map(v => ({
      id: v.id,
      name: v.name,
      price: String(v.additional_price),
    })));
    setShowProductModal(true);
  };
  const saveProduct = async () => {
    // Filter out incomplete size entries (must have a name selected)
    const validSizes = productSizes.filter(s => s.name && s.name.trim() !== '');
    
    // Validation: need name, category, and either price OR sizes
    if (!productForm.name || !productForm.category_id) {
      alert('Please fill in all required fields');
      return;
    }
    
    // If no sizes, price is required; if sizes exist, price defaults to first size price
    const hasValidPrice = productForm.price && parseFloat(productForm.price) > 0;
    const hasSizes = validSizes.length > 0;
    
    if (!hasValidPrice && !hasSizes) {
      alert('Please enter a price or add sizes');
      return;
    }
    
    // If sizes exist but no base price, use the first size's price as default
    const finalPrice = hasSizes 
      ? (validSizes[0]?.price ? parseFloat(validSizes[0].price) : 0)
      : parseFloat(productForm.price);
    
    setProductSaving(true);
    try {
      const payload = {
        name: productForm.name,
        description: productForm.description || null,
        price: finalPrice,
        category_id: parseInt(productForm.category_id),
        image: productForm.image || null,
      };
      
      let productId;
      if (editingProduct) {
        await productService.update(editingProduct.id, payload);
        productId = editingProduct.id;
      } else {
        const response = await productService.create(payload);
        console.log('Product created:', response);
        productId = response.data?.id;
        if (!productId) {
          console.error('No product ID returned:', response);
          throw new Error('Product was created but no ID was returned');
        }
      }
      
      // Sync variants (sizes with prices)
      if (validSizes.length > 0) {
        console.log('Syncing variants for product:', productId, validSizes);
        try {
          await variantService.sync(productId, validSizes.map(s => ({
            id: s.id || null,
            name: s.name,
            additional_price: parseFloat(s.price) || 0,
          })));
        } catch (variantErr) {
          console.error('Variant sync error:', variantErr);
          // Product was created, variants failed - don't throw, just log
        }
      } else if (editingProduct) {
        // Clear variants if all removed
        try {
          await variantService.sync(productId, []);
        } catch (variantErr) {
          console.error('Variant clear error:', variantErr);
        }
      }
      
      await refreshProducts();
      setShowProductModal(false);
      setProductSizes([]);
    } catch (err) {
      console.error('Save product error:', err);
      const message = err.response?.data?.message 
        || err.response?.data?.errors 
        || err.message 
        || 'Failed to save product';
      alert(typeof message === 'object' ? JSON.stringify(message) : message);
    } finally {
      setProductSaving(false);
    }
  };
  const deleteProduct = (id, name) => {
    setDeleteModal({ open: true, type: 'product', id, name });
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
  const deleteCategory = (id, name) => {
    setDeleteModal({ open: true, type: 'category', id, name });
  };

  /* ── Addon CRUD ── */
  const openAddAddon = () => {
    setEditingAddon(null);
    setAddonForm(emptyAddon);
    setShowAddonModal(true);
  };
  const openEditAddon = (a) => {
    setEditingAddon(a);
    setAddonForm({ name: a.name, description: a.description || '', price: String(a.price), category_id: a.category_id || '', product_id: a.product_id || '' });
    setShowAddonModal(true);
  };
  const saveAddon = async () => {
    if (!addonForm.name || !addonForm.price) return;
    setAddonSaving(true);
    try {
      const payload = {
        ...addonForm,
        price: parseFloat(addonForm.price),
        category_id: addonForm.category_id || null,
        product_id: addonForm.product_id || null,
      };
      if (editingAddon) {
        await addonService.update(editingAddon.id, payload);
      } else {
        await addonService.create(payload);
      }
      await refreshAddons();
      setShowAddonModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save addon');
    } finally {
      setAddonSaving(false);
    }
  };
  const deleteAddon = (id, name) => {
    setDeleteModal({ open: true, type: 'addon', id, name });
  };

  /* ── Confirm Delete Handler ── */
  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      if (deleteModal.type === 'product') {
        await productService.delete(deleteModal.id);
        await refreshProducts();
      } else if (deleteModal.type === 'category') {
        await categoryService.delete(deleteModal.id);
        await refreshCategories();
      } else if (deleteModal.type === 'addon') {
        await addonService.delete(deleteModal.id);
        await refreshAddons();
      }
      setDeleteModal({ open: false, type: '', id: null, name: '' });
    } catch (err) {
      alert(`Failed to delete ${deleteModal.type}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  /* paginated data */
  const paginatedProducts = products.slice((productsPage - 1) * ITEMS_PER_PAGE, productsPage * ITEMS_PER_PAGE);
  const totalProductPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const paginatedCategories = categories.slice((categoriesPage - 1) * CATS_PER_PAGE, categoriesPage * CATS_PER_PAGE);
  const totalCategoryPages = Math.max(1, Math.ceil(categories.length / CATS_PER_PAGE));
  const paginatedAddons = (addons || []).slice((addonsPage - 1) * ADDONS_PER_PAGE, addonsPage * ADDONS_PER_PAGE);
  const totalAddonPages = Math.max(1, Math.ceil((addons || []).length / ADDONS_PER_PAGE));

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>Products, Categories & Add-ons</h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMuted }}>
          Manage your product catalog, categories, and add-on modifiers.
        </p>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 sm:mb-8">
        {[
          { key: 'products', label: 'Products', icon: <FiPackage size={14} /> },
          { key: 'categories', label: 'Categories', icon: <FiTag size={14} /> },
          { key: 'addons', label: 'Add-ons', icon: <FiCoffee size={14} /> },
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
                      {p.variants && p.variants.length > 0 && (
                        <p className="text-[11px]" style={{ color: t.textFaint }}>
                          Sizes: {p.variants.map(v => v.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEditProduct(p)}
                        className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} style={{ color: t.textSecondary }}>
                        <FiEdit2 size={14} />
                      </button>
                      <button onClick={() => deleteProduct(p.id, p.name)}
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
                      <button onClick={() => deleteCategory(c.id, c.name)}
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
                    <option value="" style={{ background: '#000', color: '#fff' }}>Select a category</option>
                    {categories.map((c) => <option key={c.id} value={c.id} style={{ background: '#000', color: '#fff' }}>{c.name}</option>)}
                  </select>
                </div>

                {productSizes.length === 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                        style={{ color: t.textMuted }}>Price (₱) *</label>
                      <input type="number" step="0.01" min="0" value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="0.00" />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => setProductSizes([...productSizes, { name: '', price: '' }])}
                        className="w-full py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                        style={{ background: `rgba(${goldRgb},0.15)`, color: gold, border: `1px solid ${gold}` }}
                      >
                        <FiPlus size={14} /> Add Sizes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setProductSizes([...productSizes, { name: '', price: '' }])}
                      className="py-2 px-4 rounded-lg text-sm font-semibold transition flex items-center gap-2"
                      style={{ background: `rgba(${goldRgb},0.15)`, color: gold, border: `1px solid ${gold}` }}
                    >
                      <FiPlus size={14} /> Add Size
                    </button>
                  </div>
                )}

                {/* Dynamic Size Inputs */}
                {productSizes.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-wider font-semibold"
                      style={{ color: t.textMuted }}>Sizes & Prices</label>
                    {productSizes.map((sizeItem, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={sizeItem.name}
                          onChange={(e) => {
                            const updated = [...productSizes];
                            updated[idx].name = e.target.value;
                            setProductSizes(updated);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg text-sm" style={inputStyle}
                        >
                          <option value="" style={{ background: '#000', color: '#fff' }}>Select Size</option>
                          <option value="R" style={{ background: '#000', color: '#fff' }}>Regular (R)</option>
                          <option value="S" style={{ background: '#000', color: '#fff' }}>Small (S)</option>
                          <option value="M" style={{ background: '#000', color: '#fff' }}>Medium (M)</option>
                          <option value="L" style={{ background: '#000', color: '#fff' }}>Large (L)</option>
                          <option value="XL" style={{ background: '#000', color: '#fff' }}>Extra Large (XL)</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={sizeItem.price}
                          onChange={(e) => {
                            const updated = [...productSizes];
                            updated[idx].price = e.target.value;
                            setProductSizes(updated);
                          }}
                          className="w-28 px-3 py-2 rounded-lg text-sm" style={inputStyle}
                          placeholder="₱0.00"
                        />
                        <button
                          type="button"
                          onClick={() => setProductSizes(productSizes.filter((_, i) => i !== idx))}
                          className="p-2 rounded-lg transition hover:bg-red-500/20"
                          style={{ color: '#f87171' }}
                        >
                          <FiMinus size={16} />
                        </button>
                      </div>
                    ))}
                    <p className="text-[10px]" style={{ color: t.textFaint }}>
                      Each size has its own full price (not added to base price)
                    </p>
                  </div>
                )}

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

      {/* ═══════════════ ADDONS TAB ═══════════════ */}
      {activeTab === 'addons' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: t.textPrimary }}>
              All Add-ons <span className="text-sm font-normal ml-2" style={{ color: t.textMuted }}>({(addons || []).length})</span>
            </h2>
            <button onClick={openAddAddon}
              className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
              <FiPlus size={16} /> Add Add-on
            </button>
          </div>

          {(addons || []).length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: panelBg, border: panelBorder }}>
              <FiCoffee size={48} className="mx-auto mb-4" style={{ color: t.textFaint }} />
              <p className="text-sm" style={{ color: t.textMuted }}>No add-ons yet. Add your first add-on modifier!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedAddons.map((a) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-5 flex items-start justify-between" style={{ background: panelBg, border: panelBorder }}>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm" style={{ color: t.textPrimary }}>{a.name}</h3>
                    {a.category ? (
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1" style={{ background: `rgba(${goldRgb},0.15)`, color: gold }}>
                        {a.category.name}
                      </span>
                    ) : (
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1" style={{ background: t.divider, color: t.textMuted }}>
                        All Categories
                      </span>
                    )}
                    {a.product ? (
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ml-1" style={{ background: `rgba(100,149,237,0.15)`, color: '#6495ED' }}>
                        {a.product.name}
                      </span>
                    ) : null}
                    {a.description && <p className="text-xs mt-1" style={{ color: t.textFaint }}>{a.description}</p>}
                    <p className="text-sm font-bold mt-2" style={{ color: gold }}>
                      +₱{parseFloat(a.price).toLocaleString('en', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex gap-1.5 ml-3">
                    <button onClick={() => openEditAddon(a)}
                      className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} style={{ color: t.textSecondary }}>
                      <FiEdit2 size={14} />
                    </button>
                    <button onClick={() => deleteAddon(a.id, a.name)}
                      className="p-2 rounded-lg transition hover:bg-red-500/20" style={{ color: '#f87171' }}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {totalAddonPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs" style={{ color: t.textMuted }}>
                Page {addonsPage} of {totalAddonPages} ({(addons || []).length} add-ons)
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setAddonsPage((p) => Math.max(1, p - 1))} disabled={addonsPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: t.divider, color: t.textPrimary }}>
                  ← Prev
                </button>
                <span className="text-xs px-2" style={{ color: t.textSecondary }}>
                  {addonsPage} / {totalAddonPages}
                </span>
                <button onClick={() => setAddonsPage((p) => Math.min(totalAddonPages, p + 1))} disabled={addonsPage === totalAddonPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
                  style={{ background: t.divider, color: t.textPrimary }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════ ADDON MODAL ═══════════════ */}
      <AnimatePresence>
        {showAddonModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => setShowAddonModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}` }}>

              <div className="p-5 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
                <h2 className="text-lg font-bold" style={{ color: t.textPrimary }}>
                  {editingAddon ? 'Edit Add-on' : 'Add New Add-on'}
                </h2>
                <button onClick={() => setShowAddonModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition`} style={{ color: t.textSecondary }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Add-on Name *</label>
                  <input value={addonForm.name} onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="e.g. Extra Rice" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Price (₱) *</label>
                  <input type="number" step="0.01" min="0" value={addonForm.price}
                    onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Description</label>
                  <textarea rows={2} value={addonForm.description}
                    onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm resize-none" style={inputStyle} placeholder="Optional…" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Category (Optional)</label>
                  <select
                    value={addonForm.category_id}
                    onChange={(e) => setAddonForm({ ...addonForm, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle}
                  >
                    <option value="" style={{ background: '#000', color: '#fff' }}>All Categories (Global)</option>
                    {(categories || []).map((cat) => (
                      <option key={cat.id} value={cat.id} style={{ background: '#000', color: '#fff' }}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] mt-1" style={{ color: t.textFaint }}>
                    If set, this add-on will only appear for products in the selected category.
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: t.textMuted }}>Product (Optional)</label>
                  <select
                    value={addonForm.product_id}
                    onChange={(e) => setAddonForm({ ...addonForm, product_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle}
                  >
                    <option value="" style={{ background: '#000', color: '#fff' }}>All Products</option>
                    {(products || []).filter(p => !addonForm.category_id || String(p.category_id) === String(addonForm.category_id)).map((prod) => (
                      <option key={prod.id} value={prod.id} style={{ background: '#000', color: '#fff' }}>{prod.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] mt-1" style={{ color: t.textFaint }}>
                    If set, this add-on will only appear for this specific product.
                  </p>
                </div>
              </div>

              <div className="p-5 flex gap-3" style={{ borderTop: panelBorder }}>
                <button onClick={() => setShowAddonModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: t.modalBorder, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}>
                  Cancel
                </button>
                <button onClick={saveAddon} disabled={addonSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
                  {addonSaving ? 'Saving…' : editingAddon ? 'Update Add-on' : 'Add Add-on'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ DELETE CONFIRMATION MODAL ═══════════════ */}
      <AnimatePresence>
        {deleteModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => !deleteLoading && setDeleteModal({ open: false, type: '', id: null, name: '' })}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}` }}>

              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" 
                  style={{ background: 'rgba(248, 113, 113, 0.15)' }}>
                  <FiTrash2 size={28} style={{ color: '#f87171' }} />
                </div>
                <h2 className="text-lg font-bold mb-2" style={{ color: t.textPrimary }}>
                  Delete {deleteModal.type.charAt(0).toUpperCase() + deleteModal.type.slice(1)}?
                </h2>
                <p className="text-sm mb-1" style={{ color: t.textSecondary }}>
                  Are you sure you want to delete
                </p>
                <p className="text-sm font-semibold mb-4" style={{ color: gold }}>
                  "{deleteModal.name}"
                </p>
                {deleteModal.type === 'category' && (
                  <p className="text-xs px-4 py-2 rounded-lg mb-4" style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171' }}>
                    Warning: Products under this category may become orphaned.
                  </p>
                )}
                <p className="text-xs" style={{ color: t.textMuted }}>
                  This action cannot be undone.
                </p>
              </div>

              <div className="p-4 flex gap-3" style={{ borderTop: panelBorder }}>
                <button 
                  onClick={() => setDeleteModal({ open: false, type: '', id: null, name: '' })}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  style={{ background: t.modalBorder, color: t.textPrimary, border: `1px solid ${t.inputBorder}` }}>
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
                  style={{ background: '#ef4444', color: '#fff' }}>
                  {deleteLoading ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
