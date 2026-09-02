/** 渲染订单列表 PC 端固定全局导航，对应 div_mtjj2y2c 内的 jsx_mtjj2y2d。 */
function render() {
    const page = this;

    return (
        <nav class="my-order-global-navigation" aria-label="全局导航">
            <button type="button" onClick={() => page.backToHome()}>首页</button>
            <button type="button" class="my-order-global-navigation-active" aria-current="page">我的订单</button>
        </nav>
    );
}
