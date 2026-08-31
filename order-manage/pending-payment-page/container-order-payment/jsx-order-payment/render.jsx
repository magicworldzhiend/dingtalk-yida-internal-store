/**
 * 渲染待付款订单确认页。
 *
 * order 与 orderDetail 将在订单数据源接入后由页面 JS 写入 state；
 * 当前页面先完整承载加载态和订单信息布局，不发起支付或库存写入。
 */
function render() {
    /** 将金额格式化为人民币展示文本。 */
    const formatAmount = (value) => {
        const amount = Number(value);
        return Number.isFinite(amount) ? amount.toFixed(2) : '--';
    };

    /** 将时间格式化为订单页面展示文本。 */
    const formatDateTime = (value) => {
        if (!value) {
            return '--';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '--';
        }

        const pad = (number) => String(number).padStart(2, '0');
        return date.getFullYear()
            + '-' + pad(date.getMonth() + 1)
            + '-' + pad(date.getDate())
            + ' ' + pad(date.getHours())
            + ':' + pad(date.getMinutes())
            + ':' + pad(date.getSeconds());
    };

    /** 根据剩余毫秒数格式化支付倒计时。 */
    const formatCountdown = (value) => {
        const remainingMilliseconds = Math.max(0, Number(value) || 0);
        const totalSeconds = Math.floor(remainingMilliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (number) => String(number).padStart(2, '0');

        return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
    };

    const pageState = this.state || {};
    const order = pageState.order || {};
    const orderDetail = pageState.orderDetail || {};
    const orderId = pageState.orderId || '';
    const pageStatus = pageState.pageStatus || 'ready-to-load';
    const isMissingOrderId = pageStatus === 'missing-order-id';
    const isOrderLoaded = pageStatus === 'loaded' || pageStatus === 'expired';
    const selectedPaymentMethod = pageState.selectedPaymentMethod || order.paymentMethod || '';
    const isSubmittingPayment = Boolean(pageState.isSubmittingPayment);
    const canPay = pageStatus === 'loaded'
        && order.status === '待支付'
        && Boolean(selectedPaymentMethod)
        && !isSubmittingPayment;
    const imageUrl = orderDetail.imageUrl || '';
    const productName = orderDetail.productName || '订单商品加载中';
    const specification = orderDetail.specification || '--';
    const quantity = Number(orderDetail.quantity || 0);
    const unitPrice = formatAmount(orderDetail.unitPrice);
    const payableAmount = formatAmount(order.payableAmount);
    const countdownText = isOrderLoaded
        ? formatCountdown(pageState.remainingMilliseconds)
        : '--:--:--';
    const submitTime = formatDateTime(order.submitTime);

    const getPaymentMethodIcon = (paymentMethod) => {
        if (paymentMethod === '支付宝') {
            return '支';
        }
        if (paymentMethod === '微信') {
            return '微';
        }
        return '付';
    };

    const selectPaymentMethod = (paymentMethod) => {
        if (isSubmittingPayment) {
            return;
        }
        this.setState({ selectedPaymentMethod: paymentMethod });
        const jsxComponent = this.$('jsx_mtgm8ahr');
        if (jsxComponent) {
            jsxComponent.forceUpdate();
        }
    };

    if (isMissingOrderId) {
        return (
            <div class="pending-payment-page pending-payment-empty">
                <section class="pending-payment-card pending-payment-empty-card">
                    <h1>无法打开待付款订单</h1>
                    <p>缺少订单编号，请从“我的订单”或商品详情页重新进入。</p>
                </section>
            </div>
        );
    }

    if (pageStatus === 'not-found') {
        return (
            <div class="pending-payment-page pending-payment-empty">
                <section class="pending-payment-card pending-payment-empty-card">
                    <h1>未找到订单信息</h1>
                    <p>订单不存在、订单明细缺失，或订单关联关系不一致。</p>
                </section>
            </div>
        );
    }

    if (pageStatus === 'load-failed') {
        return (
            <div class="pending-payment-page pending-payment-empty">
                <section class="pending-payment-card pending-payment-empty-card">
                    <h1>订单加载失败</h1>
                    <p>请刷新后重试；若问题持续，请联系管理员核对订单数据权限。</p>
                </section>
            </div>
        );
    }

    return (
        <div class="pending-payment-page">
            <header class="pending-payment-header">
                <h1>待付款</h1>
                <p>请在支付倒计时结束前完成支付，逾期订单将自动关闭。</p>
            </header>

            <section class="pending-payment-card pending-payment-countdown-card">
                <span class="pending-payment-card-label">支付倒计时</span>
                <strong class="pending-payment-countdown">{countdownText}</strong>
                <p>{pageStatus === 'expired'
                    ? '订单已超时，等待关闭结果确认。'
                    : '支付截止时间：' + formatDateTime(order.timeoutCloseTime)}</p>
            </section>

            <section class="pending-payment-card pending-payment-product-card">
                {imageUrl ? (
                    <img
                        class="pending-payment-product-image"
                        src={imageUrl}
                        alt={productName}
                        decoding="async"
                    />
                ) : (
                    <div class="pending-payment-image-placeholder">商品图</div>
                )}
                <div class="pending-payment-product-content">
                    <h2>{productName}</h2>
                    <p>{specification}</p>
                    <div class="pending-payment-product-detail">
                        <span>¥ {unitPrice} × {quantity || '--'}</span>
                        <strong>应付 ¥ {payableAmount}</strong>
                    </div>
                </div>
            </section>

            <section class="pending-payment-card pending-payment-sku-preview-card">
                <div class="pending-payment-section-heading">
                    <h2>规格确认</h2>
                </div>
                <div class="pending-payment-sku-preview">
                    {imageUrl ? (
                        <img src={imageUrl} alt={productName} decoding="async" />
                    ) : (
                        <div class="pending-payment-sku-preview-empty">暂无 SKU 图片</div>
                    )}
                </div>
            </section>

            <section class="pending-payment-card pending-payment-method-card">
                <h2>支付方式</h2>
                <div class="pending-payment-method-list">
                    {['支付宝', '微信'].map((paymentMethod) => (
                        <button
                            key={paymentMethod}
                            type="button"
                            class={selectedPaymentMethod === paymentMethod
                                ? 'pending-payment-method-row pending-payment-method-row-active'
                                : 'pending-payment-method-row'}
                            disabled={isSubmittingPayment}
                            onClick={() => selectPaymentMethod(paymentMethod)}
                        >
                            <span class="pending-payment-method-icon" aria-hidden="true">
                                {getPaymentMethodIcon(paymentMethod)}
                            </span>
                            <span>{paymentMethod}</span>
                            <span class="pending-payment-method-check" aria-hidden="true">
                                {selectedPaymentMethod === paymentMethod ? '✓' : ''}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section class="pending-payment-card pending-payment-meta-card">
                <div><span>订单号</span><strong>{order.orderId || orderId}</strong></div>
                <div><span>下单时间</span><strong>{submitTime}</strong></div>
            </section>

            <footer class="pending-payment-bar">
                <div class="pending-payment-bar-content">
                    <div>
                        <span>应付</span>
                        <strong>¥ {payableAmount}</strong>
                    </div>
                    <button
                        type="button"
                        disabled={!canPay}
                        onClick={() => this.onConfirmPayment()}
                    >
                        {isSubmittingPayment ? '保存中...' : '去支付'}
                    </button>
                </div>
            </footer>
        </div>
    );
}
