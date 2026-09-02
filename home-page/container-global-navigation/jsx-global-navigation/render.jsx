/** 渲染首页 PC 端固定全局导航，对应 div_mtjis26a 内的 jsx_mtjis26b。 */
function render() {
    const pageState = this.state || {};
    const pendingPaymentOrderCount = Number(pageState.pendingPaymentOrderCount || 0);
    const pendingPaymentOrderBadge = Number.isFinite(pendingPaymentOrderCount)
        && pendingPaymentOrderCount > 0
        ? (pendingPaymentOrderCount > 99 ? '99+' : String(pendingPaymentOrderCount))
        : '';

    /** 打开当前登录用户的订单列表，并保存首页返回地址。 */
    const openMyOrders = () => {
        try {
            window.sessionStorage.setItem('internalStoreHomeUrl', window.location.href);
        } catch (error) {
            // 存储不可用时仍允许进入订单列表。
        }

        this.utils.router.push('FORM-B889F45E7D8B4CF8B1E2D69C54D88D8BK0UK');
    };

    return (
        <nav class="home-global-navigation" aria-label="全局导航">
            <button type="button" class="home-global-navigation-active" aria-current="page">首页</button>
            <button type="button" onClick={openMyOrders}>
                我的订单
                {pendingPaymentOrderBadge && (
                    <span class="home-global-navigation-badge" aria-hidden="true">
                        {pendingPaymentOrderBadge}
                    </span>
                )}
            </button>
        </nav>
    );
}
