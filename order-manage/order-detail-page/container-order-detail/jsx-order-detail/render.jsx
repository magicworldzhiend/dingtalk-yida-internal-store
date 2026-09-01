/** 渲染订单详情、订单进度和商品快照。 */
function render() {
    const page = this;
    const state = page.state || {};
    const order = state.order || {};
    const goodsList = Array.isArray(state.goodsList) ? state.goodsList : [];
    const pageStatus = state.orderDetailPageStatus || 'loading';

    /** 统一金额展示，避免浮点计算结果直接暴露给用户。 */
    function formatAmount(value) {
        const amount = Number(value);
        return Number.isFinite(amount) ? amount.toFixed(2) : '--';
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
            return [{title: '待支付', time: order.createTime, state: 'current', lineTone: 'closed'}, {
                title: '超时关闭',
                time: order.timeoutCloseTime,
                state: 'upcoming',
                tone: 'closed'
            }];
        }
        if (order.status === '已关闭' && (order.isTimeoutClosed || !order.paymentTime)) {
            return [{title: '待支付', time: order.createTime, state: 'complete', lineTone: 'closed'}, {
                title: '超时关闭',
                time: order.closeTime,
                state: 'current',
                tone: 'closed'
            }];
        }
        return [
            {title: '待支付', time: order.createTime, state: 'complete'},
            {title: '待领用', time: order.paymentTime, state: order.status === '待领用' ? 'current' : 'complete', lineTone: order.status === '已关闭' ? 'closed' : ''},
            {
                title: order.status === '已关闭' ? '已关闭' : '已完成',
                time: order.closeTime,
                state: order.status === '待领用' ? 'upcoming' : 'current',
                tone: order.status === '已关闭' ? 'closed' : order.status === '已完成' ? 'finished' : ''
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
            <header class="order-detail-header">
                <button type="button" class="order-detail-back-button" onClick={() => page.backToOrderList()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                         strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6"></path>
                    </svg>
                    <span>返回订单列表</span></button>
                <div class="order-detail-header-title"><h1>订单详情</h1><span
                    class={getStatusClass(order.status)}>{order.status || '--'}</span></div>
                <span class="order-detail-header-space" aria-hidden="true"></span>
            </header>
            <section class="order-detail-card order-detail-timeline-card">
                <div class="order-detail-section-heading"><h2>订单状态</h2></div>
                <div
                    class={'order-detail-timeline order-detail-timeline-' + timeline.length}>{timeline.map((item, index) =>
                    <div class={'order-detail-timeline-item order-detail-timeline-item-' + item.state + (item.tone ? ' order-detail-timeline-item-' + item.tone : '')} key={item.title}>
                        <span class="order-detail-timeline-dot"></span>{index < timeline.length - 1 && <span
                        class={'order-detail-timeline-line' + (item.lineTone ? ' order-detail-timeline-line-' + item.lineTone : '')}></span>}<strong>{item.title}</strong><em>{page.formatOrderDetailDateTime(item.time)}</em>
                    </div>)}</div>
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
        </div>
    );
}
