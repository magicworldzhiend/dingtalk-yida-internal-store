const DEFAULT_DEBUG_ORDER_ID = '17920260831135120';
const YIDA_OSS_PREFIX = 'https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD';
const HOME_PAGE_URL = 'https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD/workbench';
const MY_ORDER_PAGE_ID = 'FORM-B889F45E7D8B4CF8B1E2D69C54D88D8BK0UK';
const SKU_FORM_UUID = 'FORM-016AA49B5DF5456ABF9C5A9BE4D5F090AKKK';

/**
 * 从当前页面地址读取订单业务主键。
 *
 * @param {Object} page 页面上下文
 * @returns {String} 订单业务主键；不存在时返回空字符串
 */
function getOrderId(page) {
    const urlParams = page.utils.getUrlParams() || {};
    return String(urlParams.orderId || DEFAULT_DEBUG_ORDER_ID).trim();
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
        searchFieldJson: JSON.stringify({textField_mt17nqjb: spuId}),
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
        ? Object.assign({}, row, {numberField_msymrpxd: lockedStock - quantity})
        : row
    );
    await page.dataSourceMap.updateSkuStock.load({
        formInstId: skuRecord.formInstId,
        updateFormDataJson: JSON.stringify({tableField_msygk2pq: updatedSkuRows}),
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
        content.scrollBy({top: event.deltaY, left: event.deltaX, behavior: 'auto'});
    };
    document.addEventListener('wheel', page.pendingPaymentWheelScrollHandler, {capture: true, passive: false});
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
 * 本阶段仅搭建页面骨架。订单与订单明细数据源完成配置后，
 * 再根据 orderId 加载并写入页面状态。DEFAULT_DEBUG_ORDER_ID 仅用于
 * 开发调试，正式发布前必须移除，避免无路由参数时展示测试订单。
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
        selectedPaymentMethod: '',
        isSubmittingPayment: false,
        orderRemark: '',
        isCancelDialogVisible: false,
        isCancellingOrder: false,
    });

    // 内容 JSX 挂载在既有待支付内容 Container 中；全局导航使用独立 Container。
    initPendingPaymentPurchaseBarAlignment.call(this);
    try {
        await loadRawOrderData(this, orderId);
    } catch (error) {
        console.error('[待付款页] 查询订单失败：', error);
        this.setState({ pageStatus: 'load-failed' });
    }
}

/** 卸载待支付页时释放页面级监听和倒计时。 */
export function didUnmount() {
    if (this.pendingPaymentCountdownTimer) window.clearTimeout(this.pendingPaymentCountdownTimer);
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

/**
 * 保存用户在待付款页最终选择的支付方式。
 *
 * 支付方式写回成功后才允许进入在线收款流程；当前尚未接入在线收款，
 * 因此本方法只完成写回与结果提示，不得伪造支付成功。
 */
export async function onConfirmPayment() {
    const order = this.state.order || {};
    const selectedPaymentMethod = this.state.selectedPaymentMethod || '';
    const orderRemark = String(typeof this.pendingPaymentRemarkDraft === 'string'
        ? this.pendingPaymentRemarkDraft
        : this.state.orderRemark || '');

    if (this.state.pageStatus !== 'loaded' || order.status !== '待支付') {
        this.utils.toast({
            title: '当前订单不可支付，请刷新后重试。',
            type: 'warning',
        });
        return;
    }

    if (orderRemark.length > 150) {
        this.utils.toast({title: '备注不能超过 150 字', type: 'warning'});
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
        this.utils.toast({
            title: '支付方式已保存，正在准备支付。',
            type: 'success',
        });
    } catch (error) {
        console.error('[待付款页] 更新支付方式失败：', error);
        this.utils.toast({
            title: '支付方式保存失败，请稍后重试。',
            type: 'error',
        });
    } finally {
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
    const order = this.state.order || {};

    if (order.status !== '待支付' || !order.formInstId) {
        this.utils.toast({ title: '当前订单不可取消，请刷新后重试', type: 'warning' });
        return;
    }

    const closeTime = Date.now();
    this.setState({ isCancellingOrder: true });
    refreshPendingPaymentJsx(this);

    try {
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
