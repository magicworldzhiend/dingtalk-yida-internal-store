/** 渲染待支付页 PC 端全局导航，对应 div_mtjtnyto 内的 jsx_mtjtnytp。 */
function render() {
    const page = this;

    return (
        <nav class="pending-payment-global-navigation" aria-label="全局导航">
            <button type="button" onClick={() => page.goToHome()}>首页</button>
            <button type="button" class="pending-payment-global-navigation-active" onClick={() => page.goToMyOrders()}>我的订单</button>
        </nav>
    );
}
