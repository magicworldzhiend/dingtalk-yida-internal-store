/** 渲染商品详情 PC 端全局导航，对应 div_mtjswqgb 内的 jsx_mtjswqgc。 */
function render() {
    const page = this;

    return (
        <nav class="product-detail-global-navigation" aria-label="全局导航">
            <button type="button" class="product-detail-global-navigation-active" onClick={() => page.goToHome()}>
                <svg class="mobile-navigation-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-3.75v-6h-7.5v6H4.5A1.5 1.5 0 0 1 3 19.5z"></path></svg>
                <span>首页</span>
            </button>
            <button type="button" onClick={() => page.goToMyOrders()}>
                <svg class="mobile-navigation-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"></circle><path d="M4 21c0-4.1 3.6-7 8-7s8 2.9 8 7"></path></svg>
                <span>我的订单</span>
            </button>
        </nav>
    );
}
