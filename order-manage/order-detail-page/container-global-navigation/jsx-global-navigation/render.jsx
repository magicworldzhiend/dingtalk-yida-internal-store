/** 渲染订单详情 PC 端全局导航，对应 div_mtjt8sv7 内的 jsx_mtjt8sv8。 */
function render() {
    const page = this;

    return (
        <nav class="order-detail-global-navigation" aria-label="全局导航">
            <button type="button" onClick={() => page.goToHome()}>首页</button>
            <button type="button" class="order-detail-global-navigation-active" onClick={() => page.backToOrderList()}>我的订单</button>
        </nav>
    );
}
