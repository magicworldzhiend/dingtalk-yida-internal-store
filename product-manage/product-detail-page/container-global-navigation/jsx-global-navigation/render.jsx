/** 渲染商品详情 PC 端全局导航，对应 div_mtjswqgb 内的 jsx_mtjswqgc。 */
function render() {
    const page = this;

    return (
        <nav class="product-detail-global-navigation" aria-label="全局导航">
            <button type="button" class="product-detail-global-navigation-active" onClick={() => page.goToHome()}>首页</button>
            <button type="button" onClick={() => page.goToMyOrders()}>我的订单</button>
        </nav>
    );
}
