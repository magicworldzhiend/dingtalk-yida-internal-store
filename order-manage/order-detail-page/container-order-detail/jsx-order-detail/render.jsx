/** 渲染订单详情、订单进度和商品快照。 */
function render() {
    const page = this;
    const state = page.state || {};
    const order = state.order || {};
    const goodsList = Array.isArray(state.goodsList) ? state.goodsList : [];
    const pageStatus = state.orderDetailPageStatus || 'loading';
    const isMobile = page.utils.isMobile();

    /** 统一金额展示，避免浮点计算结果直接暴露给用户。 */
    function formatAmount(value) {
        const amount = Number(value);
        return Number.isFinite(amount)
            ? amount.toFixed(2).replace(/\.?0+$/, '')
            : '--';
    }

    function formatCountdown(value) {
        const seconds = Math.floor(Math.max(0, Number(value) || 0) / 1000);
        const pad = (number) => String(number).padStart(2, '0');
        return pad(Math.floor(seconds / 3600)) + ':' + pad(Math.floor(seconds % 3600 / 60)) + ':' + pad(seconds % 60);
    }

    /** 返回订单状态对应的视觉类名。 */
    function getStatusClass(status) {
        return 'order-detail-status order-detail-status-' + ({
            '待支付': 'wait-pay',
            '待领用': 'wait-claim',
            '已完成': 'finished',
            '已关闭': 'closed'
        }[status] || 'default');
    }

    /** 根据订单状态生成仅用于展示的进度节点。 */
    function getTimeline() {
        if (order.status === '待支付') {
            return [
                {title: '待支付', time: order.createTime, state: 'current'},
                {title: '待领用', state: 'upcoming'},
                {title: '已完成', state: 'upcoming'}
            ];
        }
        // 支付前关闭时，第二节点替换为关闭结果；“已完成”仍保留为未到达的灰色节点。
        if (order.status === '已关闭' && (order.isTimeoutClosed || !order.paymentTime)) {
            return [
                {title: '待支付', time: order.createTime, state: 'complete', lineTone: 'closing'},
                {title: order.isTimeoutClosed ? '已超时关闭' : '已关闭', time: order.closeTime, state: 'current', tone: 'closed'},
                {title: '已完成', state: 'upcoming'}
            ];
        }
        if (order.status === '已关闭') {
            return [
                {title: '待支付', time: order.createTime, state: 'complete'},
                {title: '待领用', time: order.paymentTime, state: 'complete', lineTone: 'closing'},
                {title: '已关闭', time: order.closeTime, state: 'current', tone: 'closed'}
            ];
        }
        return [
            {title: '待支付', time: order.createTime, state: 'complete'},
            {title: '待领用', time: order.paymentTime, state: order.status === '待领用' ? 'current' : 'complete'},
            {
                title: '已完成',
                time: order.closeTime,
                state: order.status === '待领用' ? 'upcoming' : 'current',
                tone: order.status === '已完成' ? 'finished' : ''
            }
        ];
    }

    if (pageStatus === 'loading') return <div class="order-detail-page">
        <div class="order-detail-empty">正在加载订单详情…</div>
    </div>;
    if (pageStatus === 'missing-order-no' || pageStatus === 'not-found' || pageStatus === 'load-failed') {
        const message = pageStatus === 'missing-order-no' ? '缺少订单编号，请从订单列表重新进入。' : pageStatus === 'not-found' ? '未找到订单信息，订单可能不存在或无查看权限。' : '订单加载失败，请刷新后重试。';
        return <div class="order-detail-page">
            <section class="order-detail-empty-card"><h1>无法打开订单详情</h1><p>{message}</p>
                <button type="button" onClick={() => page.backToOrderList()}>返回订单列表</button>
            </section>
        </div>;
    }

    const timeline = getTimeline();
    return (
        <div class="order-detail-page">
            {!isMobile && <div class="order-detail-global-layout"><nav class="order-detail-breadcrumb" aria-label="页面层级">
                <button type="button" onClick={() => page.goToHome()}>首页</button>
                <span aria-hidden="true">/</span>
                <button type="button" onClick={() => page.backToOrderList()}>我的订单</button>
                <span aria-hidden="true">/</span>
                <span aria-current="page">订单详情</span>
            </nav></div>}
            <section class="order-detail-card order-detail-timeline-card">
                <div class="order-detail-section-heading"><h2>订单状态</h2></div>
                <div
                    class={'order-detail-timeline order-detail-timeline-' + timeline.length}>{timeline.map((item, index) =>
                    <div class={'order-detail-timeline-item order-detail-timeline-item-' + item.state + (item.tone ? ' order-detail-timeline-item-' + item.tone : '')} key={item.title}>
                        <span class="order-detail-timeline-dot"></span>{index < timeline.length - 1 && <span
                        class={'order-detail-timeline-line' + (item.lineTone ? ' order-detail-timeline-line-' + item.lineTone : '')}></span>}<strong>{item.title}</strong><em>{page.formatOrderDetailDateTime(item.time)}</em>
                    </div>)}</div>
                {order.status === '待支付' && <div class="order-detail-countdown">
                    <span>剩余支付时间</span><strong>{formatCountdown(state.remainingPaymentMilliseconds)}</strong>
                    <em>超时后订单将自动关闭</em>
                </div>}
            </section>
            <section class="order-detail-card">
                <div class="order-detail-section-heading"><h2>基本信息</h2></div>
                <dl class="order-detail-meta-grid">
                    <div>
                        <dt>订单编号</dt>
                        <dd class="order-detail-order-no">{order.orderNo || '--'}</dd>
                    </div>
                    <div>
                        <dt>商品金额</dt>
                        <dd class="order-detail-amount">¥ {formatAmount(order.payableAmount)}</dd>
                    </div>
                    <div>
                        <dt>订单状态</dt>
                        <dd><span class={getStatusClass(order.status)}>{order.status || '--'}</span></dd>
                    </div>
                    <div>
                        <dt>下单人</dt>
                        <dd>{state.customerName || '--'}</dd>
                    </div>
                    <div>
                        <dt>所属部门</dt>
                        <dd>{state.departmentName || '--'}</dd>
                    </div>
                    <div>
                        <dt>组织名称</dt>
                        <dd>{order.organizationName || '--'}</dd>
                    </div>
                    <div class="order-detail-meta-full">
                        <dt>备注</dt>
                        <dd>{order.remark || '无'}</dd>
                    </div>
                </dl>
            </section>
            <section class="order-detail-card order-detail-goods-card">
                <div class="order-detail-section-heading"><h2>商品明细</h2>
                    <span>{goodsList.length ? '共 ' + goodsList.length + ' 件商品' : ''}</span></div>
                {goodsList.length ?
                    <div class="order-detail-goods-list">{goodsList.map((goods, index) => <button type="button"
                                                                                                  class="order-detail-goods-item"
                                                                                                  key={goods.goodsId || index}
                                                                                                  onClick={() => page.openProductDetail(goods)}>{goods.imageUrl ?
                        <img src={goods.imageUrl} alt={goods.goodsName} loading="lazy" decoding="async"/> :
                        <span class="order-detail-image-empty">商品图</span>}<span
                        class="order-detail-goods-content"><strong>{goods.goodsName}</strong><em>{goods.goodsCategory}</em><em>{goods.specification}</em></span><span
                        class="order-detail-goods-summary"><em>¥ {formatAmount(goods.goodsPrice)} × {goods.goodsNum || '--'}</em><strong>¥ {formatAmount(goods.goodsPrice * goods.goodsNum)}</strong></span>
                        <svg class="order-detail-goods-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6"></path>
                        </svg>
                    </button>)}</div> : <div class="order-detail-no-goods">暂无商品数据</div>}</section>
            {goodsList.length ? <section class="order-detail-card order-detail-goods-preview-card">
                <div class="order-detail-section-heading"><h2>商品明细图</h2><span>规格图片</span></div>
                <div class="order-detail-goods-preview">{goodsList.map((goods, index) => goods.imageUrl ?
                    <img key={goods.goodsId || index} src={goods.imageUrl} alt={goods.goodsName} decoding="async"/> :
                    <span key={goods.goodsId || index}>暂无商品图片</span>)}</div>
            </section> : null}
            {order.status === '待支付' && <footer class="order-detail-payment-bar">
                <div class="order-detail-payment-bar-content"><div><span>应付</span><strong>¥ {formatAmount(order.payableAmount)}</strong></div>
                    <div class="order-detail-payment-actions"><button type="button" class="order-detail-cancel-button" disabled={state.isCancellingOrder} onClick={() => page.openCancelOrderDialog()}>取消订单</button>
                        <button type="button" disabled={state.isCancellingOrder} onClick={() => page.goToPendingPayment()}>支付订单</button></div>
                </div>
            </footer>}
            {state.isCancelDialogVisible && <div class="order-detail-dialog-mask" onClick={() => page.closeCancelOrderDialog()}>
                <section class="order-detail-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>是否取消订单？</h2><p>取消后订单不可恢复，确定不再继续支付吗？</p><div><button type="button" disabled={state.isCancellingOrder} onClick={() => page.closeCancelOrderDialog()}>暂不取消</button><button type="button" class="order-detail-dialog-danger" disabled={state.isCancellingOrder} onClick={() => page.cancelPendingOrder()}>{state.isCancellingOrder ? '取消中...' : '确认取消'}</button></div></section>
            </div>}
        </div>
    );
}
