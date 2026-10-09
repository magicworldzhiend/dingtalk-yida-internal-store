const YIDA_OSS_PREFIX = 'https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD';
const HOME_PAGE_URL = 'https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD/workbench';
const MY_ORDER_PAGE_ID = 'FORM-B889F45E7D8B4CF8B1E2D69C54D88D8BK0UK';
const ORDER_DETAIL_PAGE_ID = 'FORM-89F417DBC8DC4E1F8DD01C57CB9AD951BMD8';
const SKU_FORM_UUID = 'FORM-016AA49B5DF5456ABF9C5A9BE4D5F090AKKK';
const WECHAT_PAYMENT_POLL_INTERVAL = 3000;

/**
 * 从当前页面地址读取订单业务主键。
 *
 * @param {Object} page 页面上下文
 * @returns {String} 订单业务主键；不存在时返回空字符串
 */
function getOrderId(page) {
    const urlParams = page.utils.getUrlParams() || {};
    return String(urlParams.orderId || '').trim();
}

/**
 * 提取宜搭连接器响应中的支付服务业务对象。
 *
 * @param {Object} response 宜搭数据源响应
 * @returns {Object} 支付服务业务对象
 */
function resolveWechatPaymentResponse(response) {
    let content = response && response.content !== undefined ? response.content : response;

    if (typeof content === 'string') {
        try {
            content = JSON.parse(content);
        } catch (error) {
            throw new Error('微信支付服务返回格式异常');
        }
    }

    if (content && content.body !== undefined) {
        content = content.body;
        if (typeof content === 'string') {
            try {
                content = JSON.parse(content);
            } catch (error) {
                throw new Error('微信支付服务响应体格式异常');
            }
        }
    }

    return content && content.serviceReturnValue !== undefined
        ? content.serviceReturnValue
        : content || {};
}

/**
 * 规范化微信 Native 下单服务响应。
 *
 * 页面只接收二维码图片和支付尝试号；金额、微信 code_url、商户密钥
 * 均不能进入宜搭页面状态或浏览器日志。
 *
 * @param {Object} response 宜搭数据源响应
 * @returns {Object} 页面可安全展示的支付信息
 */
function buildWechatNativePayment(response) {
    const content = resolveWechatPaymentResponse(response);
    const paymentAttemptNo = String(content.paymentAttemptNo || content.outTradeNo || '').trim();
    const qrCodeImageUrl = String(content.qrCodeImageUrl || content.qrCodeDataUrl || '').trim();
    const expiresAt = content.expiresAt || content.timeExpire || '';

    if (!paymentAttemptNo || !qrCodeImageUrl || !expiresAt) {
        throw new Error(content.message || '微信支付单创建结果不完整');
    }

    return {
        paymentAttemptNo: paymentAttemptNo,
        qrCodeImageUrl: qrCodeImageUrl,
        expiresAt: expiresAt,
        status: 'PENDING',
    };
}

/**
 * 停止微信支付状态轮询。
 *
 * @param {Object} page 页面上下文
 */
function stopWechatPaymentStatusPolling(page) {
    if (page.wechatPaymentPollingTimer) {
        window.clearTimeout(page.wechatPaymentPollingTimer);
        page.wechatPaymentPollingTimer = null;
    }
}

/**
 * 轮询支付服务查询订单状态；支付成功必须由支付服务完成验签、查单和宜搭落库。
 *
 * @param {Object} page 页面上下文
 * @returns {Promise<void>} 查询结果
 */
async function refreshWechatPaymentStatus(page) {
    const payment = page.state.wechatPayment || {};
    const order = page.state.order || {};

    if (!payment.paymentAttemptNo || !order.orderId || page.state.pageStatus !== 'loaded') {
        return;
    }

    const response = await page.dataSourceMap.wechatPay.load({
        inputs: JSON.stringify({
            Body: {
                action: 'QUERY',
                orderId: order.orderId,
                paymentAttemptNo: payment.paymentAttemptNo,
            },
        }),
    });
    const content = resolveWechatPaymentResponse(response);
    const paymentStatus = String(content.paymentStatus || content.status || '').toUpperCase();

    if (paymentStatus === 'SUCCESS') {
        stopWechatPaymentStatusPolling(page);
        await loadRawOrderData(page, order.orderId);
        page.setState({
            wechatPayment: Object.assign({}, payment, { status: 'SUCCESS' }),
        });
        refreshPendingPaymentJsx(page);
        page.utils.toast({ title: '微信支付成功，正在打开订单详情', type: 'success' });
        page.wechatPaymentSuccessTimer = window.setTimeout(() => {
            page.utils.router.replace(ORDER_DETAIL_PAGE_ID, { orderNo: order.orderId });
        }, 600);
        return;
    }

    if (paymentStatus === 'CLOSED' || paymentStatus === 'FAILED') {
        stopWechatPaymentStatusPolling(page);
        page.setState({
            wechatPayment: Object.assign({}, payment, { status: paymentStatus }),
        });
        refreshPendingPaymentJsx(page);
        return;
    }

    page.setState({
        wechatPayment: Object.assign({}, payment, { status: 'PENDING' }),
    });
    refreshPendingPaymentJsx(page);
}

/**
 * 启动微信支付状态轮询。
 *
 * @param {Object} page 页面上下文
 */
function startWechatPaymentStatusPolling(page) {
    stopWechatPaymentStatusPolling(page);

    const poll = async () => {
        try {
            await refreshWechatPaymentStatus(page);
        } catch (error) {
            console.error('[待付款页] 查询微信支付状态失败：', error);
        }

        const payment = page.state.wechatPayment || {};
        if (payment.status === 'PENDING' && page.state.pageStatus === 'loaded') {
            page.wechatPaymentPollingTimer = window.setTimeout(poll, WECHAT_PAYMENT_POLL_INTERVAL);
        }
    };

    poll();
}

/**
 * 将宜搭图片字段转换为可展示的图片地址。
 *
 * @param {String|Array} imageValue 图片字段值
 * @returns {String} 可展示的图片地址；无图片时返回空字符串
 */
function resolveImageUrl(imageValue) {
    if (!imageValue) {
        return '';
    }

    try {
        const imageList = Array.isArray(imageValue)
            ? imageValue
            : JSON.parse(String(imageValue));
        const image = Array.isArray(imageList) ? imageList[0] : null;
        const imageUrl = image && (image.downloadUrl || image.url || image.previewUrl);

        if (!imageUrl) {
            return '';
        }

        return /^https?:\/\//i.test(imageUrl)
            ? imageUrl
            : YIDA_OSS_PREFIX + imageUrl;
    } catch (error) {
        return '';
    }
}

/**
 * 将订单与订单明细查询结果转换为待付款页面状态。
 *
 * @param {Object} orderResponse 订单表查询响应
 * @param {Object} orderDetailResponse 订单明细表查询响应
 * @returns {Object|null} 页面订单数据；未查询到完整订单时返回空值
 */
function buildPendingPaymentData(orderResponse, orderDetailResponse) {
    const orderRecord = orderResponse && orderResponse.data && orderResponse.data[0];
    const orderDetailRecord = orderDetailResponse
        && orderDetailResponse.data
        && orderDetailResponse.data[0];

    if (!orderRecord || !orderDetailRecord) {
        return null;
    }

    const orderFormData = orderRecord.formData || {};
    const orderDetailFormData = orderDetailRecord.formData || {};
    const orderId = orderFormData.serialNumberField_mt2mw545 || '';
    const orderDetailOrderId = orderDetailFormData.textField_mt7zg4f3 || '';
    const timeoutCloseTime = orderFormData.dateField_mt2mw54j;

    if (!orderId || orderId !== orderDetailOrderId || !Number.isFinite(Number(timeoutCloseTime))) {
        return null;
    }

    return {
        order: {
            orderId: orderId,
            formInstId: orderRecord.formInstId || '',
            status: orderFormData.radioField_mt2mw54h || '',
            closeStatus: orderFormData.radioField_mt8fx6mi || '',
            payableAmount: orderFormData.numberField_mt2mw54b,
            paymentMethod: orderFormData.radioField_mtgliziq || '',
            remark: orderFormData.textareaField_mt2mw54i || '',
            submitTime: orderFormData.dateField_mt6szq75,
            timeoutCloseTime: timeoutCloseTime,
        },
        orderDetail: {
            formInstId: orderDetailRecord.formInstId || '',
            recipient: orderDetailFormData.textField_mv0lwdcs || '',
            address: orderDetailFormData.textField_mv0lwdcv || '',
            phone: orderDetailFormData.textField_mv0lwdcw || '',
            spuId: orderDetailFormData.textField_mt9xddqu || '',
            skuId: orderDetailFormData.textField_mt9i74jf || '',
            imageUrl: resolveImageUrl(orderDetailFormData.imageField_mtglpdws),
            productName: orderDetailFormData.textField_mt9i74jg || '',
            specification: orderDetailFormData.textField_mt9i74jk || '',
            unitPrice: orderDetailFormData.numberField_mt9i74jj,
            quantity: orderDetailFormData.numberField_mt9i74jl,
        },
    };
}

/**
 * 按订单的绝对超时关闭时间刷新待付款倒计时。
 *
 * @param {Object} page 页面上下文
 * @param {Number|String} timeoutCloseTime 订单超时关闭时间
 */
function refreshPaymentCountdown(page, timeoutCloseTime) {
    const remainingMilliseconds = new Date(timeoutCloseTime).getTime() - Date.now();

    if (remainingMilliseconds <= 0) {
        page.setState({
            remainingMilliseconds: 0,
            pageStatus: 'expired',
        });
        return;
    }

    page.setState({
        remainingMilliseconds: remainingMilliseconds,
        pageStatus: 'loaded',
    });

    page.pendingPaymentCountdownTimer = window.setTimeout(() => {
        refreshPaymentCountdown(page, timeoutCloseTime);
    }, 1000);
}

/**
 * 刷新待付款 JSX，确保异步状态即时反映到页面按钮与选择项。
 *
 * @param {Object} page 页面上下文
 */
function refreshPendingPaymentJsx(page) {
    const jsxComponent = page.$('jsx_mtgm8ahr');
    if (jsxComponent) {
        jsxComponent.forceUpdate();
    }
}

/**
 * 释放订单商品的锁定库存。
 *
 * 当前可用库存为“总库存 - 锁定库存”的公式字段，只更新锁定库存，
 * 由宜搭在保存 SKU 明细后自动重算可用库存。
 *
 * @param {Object} page 页面上下文
 * @param {Object} orderDetail 订单商品明细
 * @returns {Promise<void>} 库存释放完成结果
 */
async function releaseOrderSkuStock(page, orderDetail) {
    const spuId = String(orderDetail && orderDetail.spuId || '').trim();
    const skuId = String(orderDetail && orderDetail.skuId || '').trim();
    const quantity = Number(orderDetail && orderDetail.quantity || 0);

    if (!spuId || !skuId || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('订单商品规格或购买数量异常，无法释放库存');
    }

    const response = await page.dataSourceMap.getGoodsSkuListBySpu.load({
        formUuid: SKU_FORM_UUID,
        currentPage: 1,
        pageSize: 1,
        searchFieldJson: JSON.stringify({ textField_mt17nqjb: spuId }),
    });
    const skuRecord = response && response.data && response.data[0];
    const skuRows = skuRecord && skuRecord.formData && skuRecord.formData.tableField_msygk2pq;
    const skuIndex = Array.isArray(skuRows)
        ? skuRows.findIndex((row) => String(row.textField_mt9jn5sc || '') === skuId)
        : -1;

    if (!skuRecord || !skuRecord.formInstId || skuIndex < 0) {
        throw new Error('未找到订单对应的商品规格，库存未释放');
    }

    const lockedStock = Number(skuRows[skuIndex].numberField_msymrpxd || 0);
    if (!Number.isFinite(lockedStock) || lockedStock < quantity) {
        throw new Error('锁定库存不足，库存未释放');
    }

    const updatedSkuRows = skuRows.map((row, index) => index === skuIndex
        ? Object.assign({}, row, { numberField_msymrpxd: lockedStock - quantity })
        : row
    );
    await page.dataSourceMap.updateSkuStock.load({
        formInstId: skuRecord.formInstId,
        updateFormDataJson: JSON.stringify({ tableField_msygk2pq: updatedSkuRows }),
    });
}

/** 获取待支付页实际内容 Container 的滚动根。 */
function findPendingPaymentContentScrollElement() {
    let element = document.querySelector('.pending-payment-page');
    while (element && element !== document.body) {
        const overflowY = window.getComputedStyle(element).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
            return element;
        }
        element = element.parentElement;
    }
    return null;
}

/** 将 PC 端任意位置的滚轮事件统一转交给待支付内容区。 */
export function initPendingPaymentWheelScroll() {
    const page = this;
    page.pendingPaymentWheelScrollHandler = (event) => {
        if (window.matchMedia('(max-width: 767px)').matches) return;
        const content = findPendingPaymentContentScrollElement();
        if (!content) return;
        event.preventDefault();
        content.scrollBy({ top: event.deltaY, left: event.deltaX, behavior: 'auto' });
    };
    document.addEventListener('wheel', page.pendingPaymentWheelScrollHandler, { capture: true, passive: false });
}

/** 将取消对话框对齐到页面内容区（不含侧边栏）的视觉中心。 */
export function centerPendingPaymentCancelDialog() {
    window.requestAnimationFrame(() => {
        const dialog = document.querySelector('.pending-payment-dialog');
        const pageElement = document.querySelector('.pending-payment-page');
        if (!dialog || !pageElement) return;
        dialog.style.removeProperty('transform');
        const dialogRect = dialog.getBoundingClientRect();
        const pageRect = pageElement.getBoundingClientRect();
        const offsetX = Math.round(pageRect.left + pageRect.width / 2 - (dialogRect.left + dialogRect.width / 2));
        const offsetY = Math.round(window.innerHeight / 2 - (dialogRect.top + dialogRect.height / 2));
        dialog.style.transform = 'translate(' + offsetX + 'px, ' + offsetY + 'px)';
        dialog.style.visibility = 'visible';
        dialog.style.opacity = '1';
    });
}

/**
 * 让 PC 端固定支付栏与待付款内容区域的实际边界保持对齐。
 *
 * 固定定位元素不能继承 Container 的宽度与左边界；页面侧栏或窗口尺寸变化时，
 * 通过实时边界重新计算，移动端则沿用 CSS 全宽支付栏。
 */
export function initPendingPaymentPurchaseBarAlignment() {
    const pageContext = this;
    let retryCount = 0;
    let animationFrameId = null;

    function clearPurchaseBarPosition(purchaseBar) {
        purchaseBar.style.removeProperty('left');
        purchaseBar.style.removeProperty('right');
        purchaseBar.style.removeProperty('width');
    }

    function updatePurchaseBarPosition() {
        animationFrameId = null;

        const pageElement = document.querySelector('.pending-payment-page');
        const purchaseBar = document.querySelector('.pending-payment-bar');
        if (!pageElement || !purchaseBar) {
            return;
        }

        if (window.matchMedia('(max-width: 767px)').matches) {
            clearPurchaseBarPosition(purchaseBar);
            return;
        }

        const pageRect = pageElement.getBoundingClientRect();
        if (pageRect.width <= 0) {
            return;
        }

        purchaseBar.style.left = pageRect.left + 'px';
        purchaseBar.style.right = 'auto';
        purchaseBar.style.width = pageRect.width + 'px';
    }

    function schedulePurchaseBarPosition() {
        if (animationFrameId !== null) {
            return;
        }
        animationFrameId = window.requestAnimationFrame(updatePurchaseBarPosition);
    }

    function bindPurchaseBarPosition() {
        const pageElement = document.querySelector('.pending-payment-page');
        const purchaseBar = document.querySelector('.pending-payment-bar');
        if (!pageElement || !purchaseBar) {
            if (retryCount < 40) {
                retryCount += 1;
                window.setTimeout(bindPurchaseBarPosition, 250);
            }
            return;
        }

        if (window.ResizeObserver) {
            pageContext.pendingPaymentPurchaseBarResizeObserver = new window.ResizeObserver(
                schedulePurchaseBarPosition
            );
            pageContext.pendingPaymentPurchaseBarResizeObserver.observe(pageElement);
        }

        window.addEventListener('resize', schedulePurchaseBarPosition);
        window.addEventListener('orientationchange', schedulePurchaseBarPosition);
        document.addEventListener('transitionend', schedulePurchaseBarPosition, true);
        schedulePurchaseBarPosition();
    }

    bindPurchaseBarPosition();
}

/**
 * 查询订单与订单明细，并写入待付款页面展示状态。
 *
 * @param {Object} page 页面上下文
 * @param {String} orderId 订单业务主键
 * @returns {Promise<void>} 查询完成结果
 */
async function loadRawOrderData(page, orderId) {
    const orderResponse = await page.dataSourceMap.getOrderById.load({
        formUuid: 'FORM-F7AEAE3939C14A4696786991D78FB19E85EL',
        currentPage: 1,
        pageSize: 1,
        searchFieldJson: JSON.stringify({
            serialNumberField_mt2mw545: orderId,
        }),
    });

    const orderDetailResponse = await page.dataSourceMap.getOrderDetailByOrderId.load({
        formUuid: 'FORM-FD12EFCA83254FFD977BCFADCFC85533PDEN',
        currentPage: 1,
        pageSize: 1,
        searchFieldJson: JSON.stringify({
            textField_mt7zg4f3: orderId,
        }),
    });

    const pendingPaymentData = buildPendingPaymentData(orderResponse, orderDetailResponse);
    if (!pendingPaymentData) {
        page.setState({ pageStatus: 'not-found' });
        return;
    }

    page.setState({
        order: pendingPaymentData.order,
        orderDetail: pendingPaymentData.orderDetail,
        shippingInfoDraft: {
            recipient: pendingPaymentData.orderDetail.recipient,
            address: pendingPaymentData.orderDetail.address,
            phone: pendingPaymentData.orderDetail.phone,
        },
        selectedPaymentMethod: pendingPaymentData.order.paymentMethod,
        isSubmittingPayment: false,
        orderRemark: pendingPaymentData.order.remark,
        isCancelDialogVisible: false,
        isCancellingOrder: false,
    });
    page.pendingPaymentRemarkDraft = pendingPaymentData.order.remark;
    window.requestAnimationFrame(() => {
        const remarkInput = document.querySelector('#pending-payment-remark-input');
        if (remarkInput) {
            remarkInput.value = page.pendingPaymentRemarkDraft;
        }
    });
    refreshPaymentCountdown(page, pendingPaymentData.order.timeoutCloseTime);
}

/**
 * 初始化待付款页面的路由状态。
 *
 * 订单与订单明细数据源完成配置后，根据 URL 中的 orderId 加载并写入页面状态。
 * 缺少 orderId 时直接展示错误页，禁止回退到任何测试订单。
 */
export async function didMount() {
    initPendingPaymentWheelScroll.call(this);
    const orderId = getOrderId(this);
    this.pendingPaymentRemarkDraft = '';

    this.setState({
        orderId: orderId,
        pageStatus: 'loading',
        order: null,
        orderDetail: null,
        shippingInfoDraft: {recipient: '', address: '', phone: ''},
        isSavingShippingInfo: false,
        selectedPaymentMethod: '',
        isSubmittingPayment: false,
        orderRemark: '',
        wechatPayment: null,
        isCancelDialogVisible: false,
        isCancellingOrder: false,
    });

    // 内容 JSX 挂载在既有待支付内容 Container 中；全局导航使用独立 Container。
    initPendingPaymentPurchaseBarAlignment.call(this);
    if (!orderId) {
        this.setState({ pageStatus: 'missing-order-id' });
        return;
    }
    try {
        await loadRawOrderData(this, orderId);
    } catch (error) {
        console.error('[待付款页] 查询订单失败：', error);
        this.setState({ pageStatus: 'load-failed' });
    }

    // 加载钉钉
    const script = document.createElement('script');
    script.src = 'https://g.alicdn.com/dingding/dingtalk-jsapi/2.10.3/dingtalk.open.js';
    await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

/** 卸载待支付页时释放页面级监听和倒计时。 */
export function didUnmount() {
    if (this.pendingPaymentCountdownTimer) window.clearTimeout(this.pendingPaymentCountdownTimer);
    stopWechatPaymentStatusPolling(this);
    if (this.wechatPaymentSuccessTimer) window.clearTimeout(this.wechatPaymentSuccessTimer);
    if (this.pendingPaymentPurchaseBarResizeObserver) this.pendingPaymentPurchaseBarResizeObserver.disconnect();
    if (this.pendingPaymentWheelScrollHandler) {
        document.removeEventListener('wheel', this.pendingPaymentWheelScrollHandler, true);
    }
}

/** 打开商城首页。 */
export function goToHome() {
    window.location.href = HOME_PAGE_URL;
}

/** 打开当前登录人的订单列表。 */
export function goToMyOrders() {
    this.utils.router.push(MY_ORDER_PAGE_ID);
}

/** 校验并保存收货信息到当前订单明细表单实例。 */
export async function onSaveShippingInfo() {
    const order = this.state.order || {};
    const orderDetail = this.state.orderDetail || {};
    if (this.state.isSavingShippingInfo || this.state.isSubmittingPayment || this.state.isCancellingOrder) {
        return;
    }
    if (this.state.pageStatus !== 'loaded' || order.status !== '待支付' || !orderDetail.formInstId) {
        this.utils.toast({title: '当前订单不可保存收货信息，请刷新后重试', type: 'warning'});
        return;
    }
    const draft = this.state.shippingInfoDraft || {};
    const shippingInfo = {
        recipient: String(draft.recipient || '').trim(),
        address: String(draft.address || '').trim(),
        phone: String(draft.phone || '').trim(),
    };
    if (!shippingInfo.recipient || !shippingInfo.address || !shippingInfo.phone) {
        this.utils.toast({title: '请填写收件人、地址和电话', type: 'warning'});
        return;
    }
    this.setState({isSavingShippingInfo: true});
    refreshPendingPaymentJsx(this);
    try {
        const response = await this.dataSourceMap.updateOrderShippingInfo.load({
            formInstId: orderDetail.formInstId,
            updateFormDataJson: JSON.stringify({
                textField_mv0lwdcs: shippingInfo.recipient,
                textField_mv0lwdcv: shippingInfo.address,
                textField_mv0lwdcw: shippingInfo.phone,
            }),
        });
        if (response && response.success === false) {
            throw new Error('收货信息保存失败，请稍后重试');
        }
        this.setState({
            orderDetail: Object.assign({}, orderDetail, shippingInfo),
            shippingInfoDraft: shippingInfo,
        });
        this.utils.toast({title: '收货信息已保存', type: 'success'});
    } catch (error) {
        this.utils.toast({title: '收货信息保存失败，请稍后重试', type: 'error'});
    } finally {
        this.setState({isSavingShippingInfo: false});
        refreshPendingPaymentJsx(this);
    }
}

/**
 * 保存用户在待付款页最终选择的支付方式。
 *
 * 支付方式写回成功后才允许进入在线收款流程；当前尚未接入在线收款，
 * 因此本方法只完成写回与结果提示，不得伪造支付成功。
 */
// export async function onConfirmPayment() {
//   const order = this.state.order || {};
//   const selectedPaymentMethod = this.state.selectedPaymentMethod || '';
//   const orderRemark = String(typeof this.pendingPaymentRemarkDraft === 'string'
//     ? this.pendingPaymentRemarkDraft
//     : this.state.orderRemark || '');

//   if (this.state.pageStatus !== 'loaded' || order.status !== '待支付') {
//     this.utils.toast({
//       title: '当前订单不可支付，请刷新后重试。',
//       type: 'warning',
//     });
//     return;
//   }

//   if (orderRemark.length > 150) {
//     this.utils.toast({ title: '备注不能超过 150 字', type: 'warning' });
//     return;
//   }

//   if (!order.formInstId || !selectedPaymentMethod) {
//     this.utils.toast({
//       title: '未获取到订单或支付方式，请刷新后重试。',
//       type: 'warning',
//     });
//     return;
//   }

//   this.setState({ isSubmittingPayment: true });
//   refreshPendingPaymentJsx(this);

//   try {
//     await this.dataSourceMap.updateOrderPaymentMethod.load({
//       formInstId: order.formInstId,
//       updateFormDataJson: JSON.stringify({
//         radioField_mtgliziq: selectedPaymentMethod,
//         textareaField_mt2mw54i: orderRemark,
//       }),
//     });

//     this.setState({
//       order: Object.assign({}, order, {
//         paymentMethod: selectedPaymentMethod,
//         remark: orderRemark,
//       }),
//     });
//     this.utils.toast({
//       title: '支付方式已保存，正在准备支付。',
//       type: 'success',
//     });
//   } catch (error) {
//     console.error('[待付款页] 更新支付方式失败：', error);
//     this.utils.toast({
//       title: '支付方式保存失败，请稍后重试。',
//       type: 'error',
//     });
//   } finally {
//     this.setState({ isSubmittingPayment: false });
//     refreshPendingPaymentJsx(this);
//   }
// }
export async function onConfirmPayment() {
    if (this.state.isSavingShippingInfo) return;
    const order = this.state.order || {};
    const selectedPaymentMethod = this.state.selectedPaymentMethod || '';
    const orderRemark = String(typeof this.pendingPaymentRemarkDraft === 'string'
        ? this.pendingPaymentRemarkDraft
        : this.state.orderRemark || '');

    // 基础状态校验
    if (this.state.pageStatus !== 'loaded' || order.status !== '待支付') {
        this.utils.toast({
            title: '当前订单不可支付，请刷新后重试。',
            type: 'warning',
        });
        return;
    }
    if (orderRemark.length > 150) {
        this.utils.toast({ title: '备注不能超过 150 字', type: 'warning' });
        return;
    }
    if (!order.formInstId || !selectedPaymentMethod) {
        this.utils.toast({
            title: '未获取到订单或支付方式，请刷新后重试。',
            type: 'warning',
        });
        return;
    }

    this.setState({ isSubmittingPayment: true });
    refreshPendingPaymentJsx(this);

    try {
        // 1. 先保存支付方式和备注（保留原有业务逻辑）
        await this.dataSourceMap.updateOrderPaymentMethod.load({
            formInstId: order.formInstId,
            updateFormDataJson: JSON.stringify({
                radioField_mtgliziq: selectedPaymentMethod,
                textareaField_mt2mw54i: orderRemark,
            }),
        });

        this.setState({
            order: Object.assign({}, order, {
                paymentMethod: selectedPaymentMethod,
                remark: orderRemark,
            }),
        });

        // 2. 选择支付宝时，调用支付连接器并自动跳转
        if (selectedPaymentMethod === '支付宝') {
            this.utils.toast({
                title: '正在唤起支付宝支付...',
                type: 'loading',
                duration: 0,
            });

            console.log("req", order.orderId, order.payableAmount, orderRemark)

            // 调用支付宝支付连接器
            // const payRes = await this.dataSourceMap.alipayPay.load({
            //   outTradeNo: order.orderId,    // 订单号：冒号左边必须和连接器输入参数名一致
            //   totalAmount: order.payableAmount, // 实付金额：冒号左边必须和连接器输入参数名一致
            //   subject: orderRemark || '商品订单支付', // 订单标题
            // });
            const inputs = JSON.stringify({
                body: {
                    outTradeNo: order.orderId,
                    totalAmount: order.payableAmount,
                    subject: orderRemark || '商品订单支付'
                }
            });

            // 调用连接器，参数名必须叫 inputs
            const payRes = await this.dataSourceMap.alipayPay.load({
                inputs: inputs
            });
            // // 弹窗显示完整返回结果
            // alert("【连接器返回结果】\n成功：" + payRes.success +
            //   "\n错误信息：" + (payRes.error || "无") +
            //   "\n订单号：" + payRes.outTradeNo +
            //   "\n金额：" + payRes.totalAmount +
            //   "\n标题：" + payRes.subject +
            //   "\ninput:" +payRes.input
            // );
            console.log("payRes:", payRes)
            // 校验连接器返回结果
            // if (!payRes || !payRes.success || !payRes.result) {
            //   throw new Error((payRes && payRes.error) || '支付链接生成失败，请稍后重试');
            // }

            // 3. 创建隐藏表单并自动提交，跳转到支付宝支付页
            // const formHtml = payRes.result.form;
            const formHtml = payRes.result;
            const div = document.createElement('div');
            div.style.display = 'none';
            div.innerHTML = formHtml;
            document.body.appendChild(div);

            const form = div.querySelector('form');
            if (!form) {
                throw new Error('支付表单异常，无法跳转');
            }


            const ua = navigator.userAgent.toLowerCase();
            const isMobile = /android|iphone|ipad|ipod/.test(ua);
            if (isMobile) {
                // 移动端：关闭loading，弹出提示，手动按钮打开
                // // 宜搭弹窗，展示按钮
                // this.utils.dialog({
                //   title: '请在浏览器打开支付',
                //   content: '钉钉内置浏览器无法自动唤起支付宝，请点击下方按钮打开外部浏览器进行支付',
                //   footer: (
                //     <button onClick={async () => {
                //       // 用户点击事件内打开新窗口
                //       const newWin = window.open('', '_blank');
                //       if (!newWin) {
                //         this.utils.toast({ title: "弹窗被拦截，请允许弹窗", type: "error" });
                //         return;
                //       }
                //       // 新建空白文档，把表单克隆过去
                //       const newDoc = newWin.document;
                //       newDoc.open();
                //       newDoc.write('<html><body></body></html>');
                //       newDoc.close();
                //       // 克隆表单节点，放入新窗口body
                //       const formClone = form.cloneNode(true);
                //       newDoc.body.appendChild(formClone);
                //       // 在新窗口提交表单
                //       formClone.submit();
                //     }}>
                //       打开新页面支付
                // </button>
                //   )
                // })

                form.setAttribute('target', '_self');
                form.submit();

            } else {
                form.setAttribute('target', '_blank');
                form.submit();
            }

            // form.setAttribute('target', '_blank');
            // form.submit(); // 自动提交表单，页面会跳转到支付宝

        } else if (selectedPaymentMethod === '微信') {
            // 支付服务以订单号自行查询应付金额和最新订单状态，页面不传递金额或商户配置。
            const paymentResponse = await this.dataSourceMap.wechatPay.load({
                inputs: JSON.stringify({
                    Body: {
                        action: 'CREATE',
                        orderId: order.orderId,
                    },
                }),
            });
            const wechatPayment = buildWechatNativePayment(paymentResponse);
            this.setState({
                isSubmittingPayment: false,
                wechatPayment: wechatPayment,
            });
            refreshPendingPaymentJsx(this);
            this.utils.toast({ title: '请使用微信扫描二维码完成支付', type: 'success' });
            startWechatPaymentStatusPolling(this);
        } else {
            throw new Error('暂不支持所选支付方式');
        }

    } catch (error) {
        console.error('[待付款页] 支付发起失败：', error);
        this.utils.toast({
            title: error.message || '支付发起失败，请稍后重试',
            type: 'error',
        });
        this.setState({ isSubmittingPayment: false });
        refreshPendingPaymentJsx(this);
    }
}


/**
 * 取消待支付订单。
 *
 * 先写入未释放库存的关闭中间态，库存释放成功后再完成关闭状态。
 */
export async function onCancelOrder() {
    if (this.state.isSavingShippingInfo) return;
    const order = this.state.order || {};

    if (order.status !== '待支付' || !order.formInstId) {
        this.utils.toast({ title: '当前订单不可取消，请刷新后重试', type: 'warning' });
        return;
    }

    const closeTime = Date.now();
    this.setState({ isCancellingOrder: true });
    refreshPendingPaymentJsx(this);

    try {
        const wechatPayment = this.state.wechatPayment || {};
        if (wechatPayment.paymentAttemptNo && wechatPayment.status === 'PENDING') {
            await this.dataSourceMap.wechatPay.load({
                inputs: JSON.stringify({
                    Body: {
                        action: 'CLOSE',
                        orderId: order.orderId,
                        paymentAttemptNo: wechatPayment.paymentAttemptNo,
                    },
                }),
            });
            stopWechatPaymentStatusPolling(this);
        }

        await this.dataSourceMap.updateOrderOnCancel.load({
            formInstId: order.formInstId,
            updateFormDataJson: JSON.stringify({
                radioField_mt2mw54h: '已关闭',
                radioField_mt8fx6mi: '关闭（未释放库存）',
                dateField_mt2qewds: closeTime,
                radioField_mt9fft19: '否',
            }),
        });

        await releaseOrderSkuStock(this, this.state.orderDetail);

        await this.dataSourceMap.updateOrderOnCancel.load({
            formInstId: order.formInstId,
            updateFormDataJson: JSON.stringify({
                radioField_mt8fx6mi: '关闭（已释放库存）',
            }),
        });

        this.setState({
            pageStatus: 'closed',
            remainingMilliseconds: 0,
            isCancelDialogVisible: false,
            order: Object.assign({}, order, {
                status: '已关闭',
                closeStatus: '关闭（已释放库存）',
            }),
        });
        refreshPendingPaymentJsx(this);
        this.utils.toast({ title: '订单已取消', type: 'success' });
        this.utils.router.replace(MY_ORDER_PAGE_ID);
    } catch (error) {
        console.error('[待付款页] 取消订单失败：', error);
        this.utils.toast({
            title: error.message || '订单取消失败，请稍后重试',
            type: 'error',
        });
    } finally {
        this.setState({ isCancellingOrder: false });
        refreshPendingPaymentJsx(this);
    }
}
