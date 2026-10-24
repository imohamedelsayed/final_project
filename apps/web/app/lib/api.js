const API_BASE = '';

async function fetchJson(url, options = {}) {
  const isServer = typeof window === 'undefined';
  const baseUrl = isServer ? process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000' : API_BASE;

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',
    cache: options.cache || 'no-store'
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(body?.error?.message || 'Network request failed');
    error.status = response.status;
    error.code = body?.error?.code || 'UNKNOWN_ERROR';
    error.fields = body?.error?.fields || {};
    throw error;
  }

  return body?.data;
}

async function fetchPaginated(url, options = {}) {
  const isServer = typeof window === 'undefined';
  const baseUrl = isServer ? process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000' : API_BASE;

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',
    cache: options.cache || 'no-store'
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(body?.error?.message || 'Network request failed');
    error.status = response.status;
    error.code = body?.error?.code || 'UNKNOWN_ERROR';
    error.fields = body?.error?.fields || {};
    throw error;
  }

  return {
    items: body?.data || [],
    pagination: body?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 }
  };
}

export const api = {
  // Public Catalog
  async getBanners() {
    return fetchJson('/api/v1/banners');
  },

  async getFeaturedProducts() {
    return fetchJson('/api/v1/featured-products');
  },

  async getCategories() {
    return fetchJson('/api/v1/categories');
  },

  async getBrands() {
    return fetchJson('/api/v1/brands');
  },

  async getProducts(params = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, value);
      }
    }
    const queryString = query.toString();
    const url = `/api/v1/products${queryString ? `?${queryString}` : ''}`;

    const isServer = typeof window === 'undefined';
    const baseUrl = isServer ? process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000' : API_BASE;
    const fullUrl = `${baseUrl}${url}`;

    const res = await fetch(fullUrl, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(body?.error?.message || 'Failed to fetch products');
      err.status = res.status;
      throw err;
    }
    return {
      items: body.data || [],
      pagination: body.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 }
    };
  },

  async getProductBySlug(slug) {
    return fetchJson(`/api/v1/products/${slug}`);
  },

  // Persistent Cart
  async getCart() {
    return fetchJson('/api/v1/cart');
  },

  async addToCart(variantId, quantity = 1) {
    return fetchJson('/api/v1/cart/items', {
      method: 'POST',
      body: JSON.stringify({ variantId, quantity })
    });
  },

  async updateCartItem(itemId, quantity) {
    return fetchJson(`/api/v1/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity })
    });
  },

  async removeCartItem(itemId) {
    return fetchJson(`/api/v1/cart/items/${itemId}`, {
      method: 'DELETE'
    });
  },

  async clearCart() {
    return fetchJson('/api/v1/cart/items', {
      method: 'DELETE'
    });
  },

  // Authentication
  async getMe() {
    try {
      const res = await fetchJson('/api/v1/auth/me');
      if (!res) return null;
      const u = res.user || res;
      const verified = u.emailVerifiedAt || u.email_verified_at || null;
      return {
        ...u,
        user: u,
        email_verified_at: verified,
        emailVerifiedAt: verified
      };
    } catch (err) {
      if (err.status === 401 || err.code === 'UNAUTHORIZED') {
        return null;
      }
      throw err;
    }
  },

  async login({ email, password, totpCode }) {
    const res = await fetchJson('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, totpCode })
    });
    if (!res) return null;
    const u = res.user || res;
    const verified = u.emailVerifiedAt || u.email_verified_at || null;
    return {
      ...u,
      user: u,
      email_verified_at: verified,
      emailVerifiedAt: verified
    };
  },

  async adminLogin({ email, password, totpCode }) {
    const res = await fetchJson('/api/v1/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, totpCode })
    });
    if (!res) return null;
    const u = res.user || res;
    const verified = u.emailVerifiedAt || u.email_verified_at || null;
    return {
      ...u,
      user: u,
      email_verified_at: verified,
      emailVerifiedAt: verified
    };
  },

  async register({ name, email, password }) {
    return fetchJson('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  async verifyEmail({ email, code }) {
    return fetchJson('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
  },

  async resendVerification({ email }) {
    return fetchJson('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async logout() {
    return fetchJson('/api/v1/auth/logout', {
      method: 'POST'
    });
  },

  // Orders & Checkout
  async quoteCoupon(code) {
    return fetchJson('/api/v1/coupons/quote', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },

  async checkoutOrder({
    idempotencyKey,
    address,
    couponCode,
    termsAccepted = true,
    termsVersion = 'v1.0'
  }) {
    return fetchJson('/api/v1/checkout/orders', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        address,
        coupon_code: couponCode || null,
        terms_accepted: termsAccepted,
        terms_version: termsVersion
      })
    });
  },

  async getMyOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `/api/v1/orders${query ? `?${query}` : ''}`;
    const res = await fetchJson(url);
    return res;
  },

  async getOrderByNumber(orderNumber) {
    return fetchJson(`/api/v1/orders/${encodeURIComponent(orderNumber)}`);
  },

  async cancelMyOrder(orderNumber, reason) {
    return fetchJson(`/api/v1/orders/${encodeURIComponent(orderNumber)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // Admin Order Management
  async getAdminOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `/api/v1/admin/orders${query ? `?${query}` : ''}`;
    const isServer = typeof window === 'undefined';
    const baseUrl = isServer ? process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000' : API_BASE;
    const fullUrl = `${baseUrl}${url}`;

    const res = await fetch(fullUrl, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store'
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(body?.error?.message || 'Failed to fetch admin orders');
      err.status = res.status;
      err.code = body?.error?.code;
      throw err;
    }
    return {
      orders: body.data || [],
      pagination: body.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 }
    };
  },

  async getAdminOrder(orderId) {
    return fetchJson(`/api/v1/admin/orders/${orderId}`);
  },

  async setAdminFinalTotal(orderId, shippingFee) {
    return fetchJson(`/api/v1/admin/orders/${orderId}/final-total`, {
      method: 'PATCH',
      body: JSON.stringify({ shipping_fee: shippingFee })
    });
  },

  async recordCustomerAgreement(orderId, agreedPricingVersion) {
    return fetchJson(`/api/v1/admin/orders/${orderId}/customer-agreement`, {
      method: 'POST',
      body: JSON.stringify({ agreed_pricing_version: agreedPricingVersion })
    });
  },

  async confirmAdminOrder(orderId) {
    return fetchJson(`/api/v1/admin/orders/${orderId}/confirm`, {
      method: 'POST'
    });
  },

  async transitionAdminOrderStatus(orderId, newStatus, reason) {
    return fetchJson(`/api/v1/admin/orders/${orderId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ new_status: newStatus, reason })
    });
  },

  async getWhatsappSetting() {
    return fetchJson('/api/v1/admin/settings/whatsapp');
  },

  async updateWhatsappSetting(whatsappNumber) {
    return fetchJson('/api/v1/admin/settings/whatsapp', {
      method: 'PATCH',
      body: JSON.stringify({ whatsapp_number: whatsappNumber })
    });
  },

  async getAdminDashboardSummary() {
    return fetchJson('/api/v1/admin/dashboard/summary');
  },

  // Admin Categories
  async getAdminCategories(params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.set(k, v);
    }
    const qs = query.toString();
    return fetchPaginated(`/api/v1/admin/categories${qs ? `?${qs}` : ''}`);
  },

  async createAdminCategory(data) {
    return fetchJson('/api/v1/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getAdminCategory(id) {
    return fetchJson(`/api/v1/admin/categories/${id}`);
  },

  async updateAdminCategory(id, data) {
    return fetchJson(`/api/v1/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminCategory(id) {
    return fetchJson(`/api/v1/admin/categories/${id}`, {
      method: 'DELETE'
    });
  },

  // Admin Brands
  async getAdminBrands(params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.set(k, v);
    }
    const qs = query.toString();
    return fetchPaginated(`/api/v1/admin/brands${qs ? `?${qs}` : ''}`);
  },

  async createAdminBrand(data) {
    return fetchJson('/api/v1/admin/brands', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getAdminBrand(id) {
    return fetchJson(`/api/v1/admin/brands/${id}`);
  },

  async updateAdminBrand(id, data) {
    return fetchJson(`/api/v1/admin/brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminBrand(id) {
    return fetchJson(`/api/v1/admin/brands/${id}`, {
      method: 'DELETE'
    });
  },

  // Admin Products
  async getAdminProducts(params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.set(k, v);
    }
    const qs = query.toString();
    return fetchPaginated(`/api/v1/admin/products${qs ? `?${qs}` : ''}`);
  },

  async createAdminProduct(data) {
    return fetchJson('/api/v1/admin/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getAdminProduct(id) {
    return fetchJson(`/api/v1/admin/products/${id}`);
  },

  async updateAdminProduct(id, data) {
    return fetchJson(`/api/v1/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Admin Product Variants
  async getAdminProductVariants(productId) {
    return fetchJson(`/api/v1/admin/products/${productId}/variants`);
  },

  async createAdminProductVariant(productId, data) {
    return fetchJson(`/api/v1/admin/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAdminProductVariant(productId, variantId, data) {
    return fetchJson(`/api/v1/admin/products/${productId}/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminProductVariant(productId, variantId) {
    return fetchJson(`/api/v1/admin/products/${productId}/variants/${variantId}`, {
      method: 'DELETE'
    });
  },

  // Admin Product Specifications
  async getAdminProductSpecs(productId) {
    return fetchJson(`/api/v1/admin/products/${productId}/specifications`);
  },

  async addAdminProductSpec(productId, data) {
    return fetchJson(`/api/v1/admin/products/${productId}/specifications`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAdminProductSpec(productId, specId, data) {
    return fetchJson(`/api/v1/admin/products/${productId}/specifications/${specId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminProductSpec(productId, specId) {
    return fetchJson(`/api/v1/admin/products/${productId}/specifications/${specId}`, {
      method: 'DELETE'
    });
  },

  // Admin Product Images
  async getAdminProductImages(productId) {
    return fetchJson(`/api/v1/admin/products/${productId}/images`);
  },

  async addAdminProductImage(productId, formDataOrData) {
    const isFormData = typeof FormData !== 'undefined' && formDataOrData instanceof FormData;
    return fetchJson(`/api/v1/admin/products/${productId}/images`, {
      method: 'POST',
      body: isFormData ? formDataOrData : JSON.stringify(formDataOrData)
    });
  },

  async updateAdminProductImage(productId, imageId, data) {
    return fetchJson(`/api/v1/admin/products/${productId}/images/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminProductImage(productId, imageId) {
    return fetchJson(`/api/v1/admin/products/${productId}/images/${imageId}`, {
      method: 'DELETE'
    });
  },

  // Admin Inventory
  async getAdminInventoryItems(params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.set(k, v);
    }
    const qs = query.toString();
    return fetchPaginated(`/api/v1/admin/inventory/items${qs ? `?${qs}` : ''}`);
  },

  async adjustInventory({ variantId, quantityDelta, reason }) {
    return fetchJson('/api/v1/admin/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify({ variantId, quantityDelta, reason })
    });
  },

  async getAdminInventoryAdjustments(params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.set(k, v);
    }
    const qs = query.toString();
    return fetchPaginated(`/api/v1/admin/inventory/adjustments${qs ? `?${qs}` : ''}`);
  },

  // Standalone Media Upload
  async uploadStandaloneMedia(formData) {
    return fetchJson('/api/v1/admin/media/upload', {
      method: 'POST',
      body: formData
    });
  },

  // Admin Coupons
  async getAdminCoupons(params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.set(k, v);
    }
    const qs = query.toString();
    return fetchPaginated(`/api/v1/admin/coupons${qs ? `?${qs}` : ''}`);
  },

  async getAdminCoupon(id) {
    return fetchJson(`/api/v1/admin/coupons/${id}`);
  },

  async createAdminCoupon(data) {
    return fetchJson('/api/v1/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAdminCoupon(id, data) {
    return fetchJson(`/api/v1/admin/coupons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminCoupon(id) {
    return fetchJson(`/api/v1/admin/coupons/${id}`, {
      method: 'DELETE'
    });
  },

  // Admin Banners
  async getAdminBanners(params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query.set(k, v);
    }
    const qs = query.toString();
    return fetchPaginated(`/api/v1/admin/banners${qs ? `?${qs}` : ''}`);
  },

  async createAdminBanner(dataOrFormData) {
    const isFormData = typeof FormData !== 'undefined' && dataOrFormData instanceof FormData;
    return fetchJson('/api/v1/admin/banners', {
      method: 'POST',
      body: isFormData ? dataOrFormData : JSON.stringify(dataOrFormData)
    });
  },

  async updateAdminBanner(id, data) {
    return fetchJson(`/api/v1/admin/banners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteAdminBanner(id) {
    return fetchJson(`/api/v1/admin/banners/${id}`, {
      method: 'DELETE'
    });
  },

  // Admin Featured Products
  async getAdminFeaturedProducts() {
    return fetchJson('/api/v1/admin/featured-products');
  },

  async addAdminFeaturedProduct(data) {
    return fetchJson('/api/v1/admin/featured-products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAdminFeaturedProduct(productId, data) {
    return fetchJson(`/api/v1/admin/featured-products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async removeAdminFeaturedProduct(productId) {
    return fetchJson(`/api/v1/admin/featured-products/${productId}`, {
      method: 'DELETE'
    });
  },

  // Store Settings (WhatsApp)
  async getAdminWhatsappSetting() {
    return fetchJson('/api/v1/admin/settings/whatsapp');
  },

  async updateAdminWhatsappSetting(whatsappNumber) {
    return fetchJson('/api/v1/admin/settings/whatsapp', {
      method: 'PATCH',
      body: JSON.stringify({ whatsapp_number: whatsappNumber })
    });
  },

  // Staff User Management (Super Admin only)
  async getAdminStaffUsers() {
    return fetchJson('/api/v1/admin/users');
  },

  async createAdminStaffUser(data) {
    return fetchJson('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAdminStaffUser(id, data) {
    return fetchJson(`/api/v1/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async resetAdminStaffTotp(id) {
    return fetchJson(`/api/v1/admin/users/${id}/reset-totp`, {
      method: 'POST'
    });
  }
};
