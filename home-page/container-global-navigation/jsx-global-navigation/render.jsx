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
            <button type="button" class="home-global-navigation-active" aria-current="page">
                <svg class="mobile-navigation-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-3.75v-6h-7.5v6H4.5A1.5 1.5 0 0 1 3 19.5z"></path></svg>
                <span>首页</span>
            </button>
            <button type="button" onClick={openMyOrders}>
                <svg class="mobile-navigation-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"></circle><path d="M4 21c0-4.1 3.6-7 8-7s8 2.9 8 7"></path></svg>
                <span>我的订单</span>
                {pendingPaymentOrderBadge && (
                    <span class="home-global-navigation-badge" aria-hidden="true">
                        {pendingPaymentOrderBadge}
                    </span>
                )}
            </button>
        </nav>
    );
}
