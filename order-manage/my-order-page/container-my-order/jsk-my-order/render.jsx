/** 渲染当前登录用户的订单列表。 */
function render() {
    const page = this;
    const state = page.state || {};
    const isMobile = page.utils.isMobile();
    const statusList = ['', '待支付', '待领用', '已完成', '已关闭'];
    const orderList = Array.isArray(state.myOrderList) ? state.myOrderList : [];
    const activeStatus = state.myOrderStatus || '';
    const keywordInput = state.myOrderKeywordInput || '';

    /** 格式化金额。 */
    function formatAmount(value) {
        const amount = Number(value);
        return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
    }

    /** 格式化订单创建时间。 */
    function formatDateTime(value) {
        const date = new Date(value);
        if (!value || Number.isNaN(date.getTime())) {
            return '--';
        }
        const pad = (number) => String(number).padStart(2, '0');
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
            + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    }

    /** 返回订单状态对应的视觉类名。 */
    function getStatusClass(status) {
        return 'my-order-status my-order-status-' + ({
            '待支付': 'wait-pay',
            '待领用': 'wait-claim',
            '已完成': 'finished',
            '已关闭': 'closed',
        }[status] || 'default');
    }

    /** 提交订单号或商品名称搜索。 */
    function submitSearch() {
        page.reloadMyOrderList({status: activeStatus, keyword: keywordInput});
    }

    /** 切换订单状态筛选。 */
    function selectStatus(status) {
        page.reloadMyOrderList({status: status, keyword: keywordInput});
    }

    return (
        <div class={isMobile ? 'my-order-page my-order-page-mobile' : 'my-order-page'}>
            <div class="my-order-fixed-header">
            {!isMobile && (
                <header class="my-order-header">
                    <button type="button" class="my-order-back" onClick={() => page.backToHome()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6"></path>
                        </svg>
                        <span>返回首页</span>
                    </button>
                    <h1>我的订单</h1>
                    <div class="my-order-header-space"></div>
                </header>
            )}

            <section class="my-order-toolbar">
                <div class="my-order-tabs" role="tablist" aria-label="订单状态">
                    {statusList.map((status) => (
                        <button
                            key={status || 'all'}
                            type="button"
                            role="tab"
                            aria-selected={activeStatus === status}
                            class={activeStatus === status ? 'my-order-tab my-order-tab-active' : 'my-order-tab'}
                            onClick={() => selectStatus(status)}
                        >
                            {status || '全部'}
                        </button>
                    ))}
                </div>
                {isMobile ? <div class="my-order-mobile-search">
                    <input
                        value={keywordInput}
                        placeholder="搜索订单号或商品名称"
                        onChange={(event) => page.setState({myOrderKeywordInput: event.target.value})}
                        onKeyDown={(event) => event.key === 'Enter' && submitSearch()}
                    />
                    <button type="button" onClick={submitSearch}>搜索</button>
                </div> : <div class="my-order-search">
                    <input
                        value={keywordInput}
                        placeholder="搜索订单号或商品名称"
                        onChange={(event) => page.setState({myOrderKeywordInput: event.target.value})}
                        onKeyDown={(event) => event.key === 'Enter' && submitSearch()}
                    />
                    <button type="button" aria-label="搜索" onClick={submitSearch}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="6"></circle>
                            <path d="M20 20l-4.2-4.2"></path>
                        </svg>
                    </button>
                </div>}
            </section>
            </div>

            <main class="my-order-list">
                {state.myOrderLoading && <div class="my-order-empty">正在加载订单…</div>}
                {!state.myOrderLoading && state.myOrderLoadFailed &&
                    <div class="my-order-empty">订单加载失败，请刷新后重试</div>}
                {!state.myOrderLoading && !state.myOrderLoadFailed && !orderList.length &&
                    <div class="my-order-empty">暂无符合条件的订单</div>}
                {orderList.map((order) => {
                    const showPaidAmount = order.status !== '待支付' && Number(order.paidAmount) > 0;
                    return (
                        <article class="my-order-card" key={order.formInstId || order.orderId}>
                            <div class="my-order-card-top">
                                <span>订单号：{order.orderId || '--'}</span>
                                <span>{formatDateTime(order.createTime)}</span>
                            </div>
                            <div class="my-order-product-row">
                                {order.imageUrl ? <img src={order.imageUrl} alt={order.productName} decoding="async"/> :
                                    <div class="my-order-image-empty">商品图</div>}
                                <button type="button" class="my-order-product"
                                        onClick={() => page.openMyOrderDetail(order)}>
                                    <strong>{order.productName}</strong>
                                    <span>{order.specification}</span>
                                    <em>× {order.quantity || '--'}</em>
                                </button>
                                <span class={getStatusClass(order.status)}>{order.status || '--'}</span>
                            </div>
                            <div class="my-order-card-bottom">
                                <strong>{showPaidAmount ? '实付' : '应付'}：¥{formatAmount(showPaidAmount ? order.paidAmount : order.payableAmount)}</strong>
                                <div class="my-order-actions">
                                    <button type="button" class="my-order-detail"
                                            onClick={() => page.openMyOrderDetail(order)}>订单详情
                                    </button>
                                    {order.status === '待支付' && <button type="button" class="my-order-primary"
                                                                          onClick={() => page.goToPendingPayment(order)}>去支付</button>}
                                    {order.status === '待领用' && <button type="button" class="my-order-primary"
                                                                          onClick={() => page.confirmOrderClaim(order)}>确认领取</button>}
                                </div>
                            </div>
                        </article>
                    );
                })}
                <div
                    id="my-order-load-more"
                    data-has-more={state.myOrderHasMore ? 'true' : 'false'}
                    class="my-order-load-more"
                >
                    {state.myOrderLoading
                        ? '正在加载订单…'
                        : state.myOrderHasMore
                            ? '继续下滑加载更多订单'
                            : orderList.length ? '已经到底了' : ''}
                </div>
            </main>
        </div>
    );
}
