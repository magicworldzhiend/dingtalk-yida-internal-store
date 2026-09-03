const ORDER_FORM_UUID = 'FORM-F7AEAE3939C14A4696786991D78FB19E85EL';
const ORDER_DETAIL_FORM_UUID = 'FORM-FD12EFCA83254FFD977BCFADCFC85533PDEN';
const MY_ORDER_PAGE_ID = 'FORM-B889F45E7D8B4CF8B1E2D69C54D88D8BK0UK';
const PENDING_PAYMENT_PAGE_ID = 'FORM-01464CAE858D4323956BD131C332AB9F7IOM';
const HOME_PAGE_URL = 'https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD/workbench';
const ORDER_DETAIL_JSX_ID = 'jsx_mt0wteuu';

/** 将宜搭图片字段转换为可展示的图片地址。 */
function resolveImageUrl(value) {
    const applicationOrigin = 'https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD';
    try {
        const image = (Array.isArray(value) ? value : JSON.parse(String(value || '[]')))[0] || {};
        const url = image.downloadUrl || image.url || image.previewUrl || '';
        return url && !/^https?:\/\//i.test(url) ? applicationOrigin + url : url;
    } catch (error) {
        return '';
    }
}

/** 格式化订单页面显示的时间。 */
function formatDateTime(value) {
    const date = new Date(Number(value));
    if (!value || Number.isNaN(date.getTime())) {
        return '--';
    }
    const pad = (number) => String(number).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

/** 刷新订单详情 JSX。 */
function refreshOrderDetailJsx(page) {
    const component = page.$(ORDER_DETAIL_JSX_ID);
    if (component) {
        component.forceUpdate();
    }
}

/** 获取订单详情实际内容 Container 的滚动根。 */
function findOrderDetailContentScrollElement() {
    let element = document.querySelector('.order-detail-page');
    while (element && element !== document.body) {
        const overflowY = window.getComputedStyle(element).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
            return element;
        }
        element = element.parentElement;
    }
    return null;
}

/** 将 PC 端任意位置的滚轮事件统一转交给订单详情内容区。 */
export function initOrderDetailWheelScroll() {
    const page = this;
    page.orderDetailWheelScrollHandler = (event) => {
        if (window.matchMedia('(max-width: 767px)').matches) return;
        const content = findOrderDetailContentScrollElement();
        if (!content) return;
        event.preventDefault();
        content.scrollBy({top: event.deltaY, left: event.deltaX, behavior: 'auto'});
    };
    document.addEventListener('wheel', page.orderDetailWheelScrollHandler, {capture: true, passive: false});
}

/** 将对话框对齐到页面内容区（不含侧边栏）的视觉中心。 */
function centerDialogToPageContent(dialogSelector, pageSelector) {
    window.requestAnimationFrame(() => {
        const dialog = document.querySelector(dialogSelector);
        const pageElement = document.querySelector(pageSelector);
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

/** 按订单绝对关闭时间刷新待支付倒计时。 */
function refreshPaymentCountdown(page, timeoutCloseTime) {
    const remainingMilliseconds = new Date(timeoutCloseTime).getTime() - Date.now();
    if (remainingMilliseconds <= 0) {
        page.setState({remainingPaymentMilliseconds: 0});
        refreshOrderDetailJsx(page);
        return;
    }
    page.setState({remainingPaymentMilliseconds: remainingMilliseconds});
    refreshOrderDetailJsx(page);
    page.orderDetailCountdownTimer = window.setTimeout(() => {
        refreshPaymentCountdown(page, timeoutCloseTime);
    }, 1000);
}

/** 让 PC 端固定支付栏与订单详情内容区域保持对齐。 */
export function initOrderDetailPaymentBarAlignment() {
    const page = this;
    let retryCount = 0;
    let animationFrameId = null;
    const clearPosition = (bar) => {
        bar.style.removeProperty('left');
        bar.style.removeProperty('right');
        bar.style.removeProperty('width');
    };
    const updatePosition = () => {
        animationFrameId = null;
        const pageElement = document.querySelector('.order-detail-page');
        const bar = document.querySelector('.order-detail-payment-bar');
        if (!pageElement || !bar) return;
        if (window.matchMedia('(max-width: 767px)').matches) {
            clearPosition(bar);
            return;
        }
        const rect = pageElement.getBoundingClientRect();
        if (rect.width > 0) {
            bar.style.left = rect.left + 'px';
            bar.style.right = 'auto';
            bar.style.width = rect.width + 'px';
        }
    };
    const schedulePosition = () => {
        if (animationFrameId === null) animationFrameId = window.requestAnimationFrame(updatePosition);
    };
    const bindPosition = () => {
        const pageElement = document.querySelector('.order-detail-page');
        const bar = document.querySelector('.order-detail-payment-bar');
        if (!pageElement || !bar) {
            if (retryCount++ < 40) window.setTimeout(bindPosition, 250);
            return;
        }
        if (window.ResizeObserver) {
            page.orderDetailPaymentBarResizeObserver = new window.ResizeObserver(schedulePosition);
            page.orderDetailPaymentBarResizeObserver.observe(pageElement);
        }
        window.addEventListener('resize', schedulePosition);
        window.addEventListener('orientationchange', schedulePosition);
        document.addEventListener('transitionend', schedulePosition, true);
        schedulePosition();
    };
    bindPosition();
}

/** 查询当前订单的商品快照。 */
async function loadOrderDetails(page, orderNo) {
    const response = await page.dataSourceMap.getMyOrderDetails.load({
        formUuid: ORDER_DETAIL_FORM_UUID, currentPage: 1, pageSize: 100,
        searchFieldJson: JSON.stringify({textField_mt7zg4f3: String(orderNo)})
    });
    const records = Array.isArray(response && response.data) ? response.data : [];
    return records.map((record) => {
        const data = record.formData || {};
        return {
            goodsId: data.textField_mt9i74jf || record.formInstId || '',
            goodsSpuId: data.textField_mt9xddqu || '', goodsName: data.textField_mt9i74jg || '商品信息缺失',
            goodsCategory: data.textField_mt9i74jh || '--', goodsNum: Number(data.numberField_mt9i74jl || 0),
            goodsPrice: Number(data.numberField_mt9i74jj || 0), specification: data.textField_mt9i74jk || '--',
            imageUrl: resolveImageUrl(data.imageField_mtglpdws)
        };
    });
}

/** 查询当前用户可见的订单主记录。 */
async function loadOrder(page, userId, orderNo) {
    const response = await page.dataSourceMap.getMyOrderList.load({
        formUuid: ORDER_FORM_UUID, currentPage: 1, pageSize: 1,
        searchFieldJson: JSON.stringify({
            textField_mt2mw548: String(userId),
            serialNumberField_mt2mw545: String(orderNo)
        })
    });
    const record = response && response.data && response.data[0];
    if (!record) {
        return null;
    }
    const data = record.formData || {};
    return {
        formInstId: record.formInstId || '', orderNo: data.serialNumberField_mt2mw545 || String(orderNo), status: data.radioField_mt2mw54h || '',
        payableAmount: Number(data.numberField_mt2mw54b || 0), createTime: data.dateField_mt6szq75 || '',
        paymentTime: data.dateField_mt2mw54k || '', closeTime: data.dateField_mt2qewds || '',
        timeoutCloseTime: data.dateField_mt2mw54j || '', isTimeoutClosed: data.radioField_mt9fft19 === '是',
        remark: data.textareaField_mt2mw54i || '', organizationName: record.originatorCorpName || ''
    };
}

/** 获取当前登录人的末级部门名称。 */
async function loadDepartment(page) {
    try {
        const response = await page.dataSourceMap.getDept.load();
        const departments = Array.isArray(response && response.values) ? response.values : [];
        const paths = departments.map((item) => item.deptFullPath && item.deptFullPath.zh_CN).filter(Boolean);
        return paths[paths.length - 1] || '--';
    } catch (error) {
        return '--';
    }
}

/** 加载订单详情页数据。 */
export async function didMount() {
    initOrderDetailWheelScroll.call(this);
    const orderNo = this.utils.getUrlParams().orderNo;
    if (!orderNo) {
        this.setState({orderDetailPageStatus: 'missing-order-no'});
        refreshOrderDetailJsx(this);
        return;
    }
    this.setState({orderDetailPageStatus: 'loading', order: null, goodsList: [], remainingPaymentMilliseconds: 0, isCancelDialogVisible: false, isCancellingOrder: false});
    refreshOrderDetailJsx(this);
    try {
        const userId = this.utils.getLoginUserId();
        const [order, goodsList, departmentName] = await Promise.all([loadOrder(this, userId, orderNo), loadOrderDetails(this, orderNo), loadDepartment(this)]);
        if (!order) {
            this.setState({orderDetailPageStatus: 'not-found'});
        } else {
            this.setState({
                orderDetailPageStatus: 'loaded',
                order: order,
                goodsList: goodsList,
                customerName: this.utils.getLoginUserName() || '--',
                departmentName: departmentName
            });
            if (order.status === '待支付') {
                refreshPaymentCountdown(this, order.timeoutCloseTime);
                initOrderDetailPaymentBarAlignment.call(this);
            }
        }
    } catch (error) {
        console.error('[订单详情] 加载失败', error);
        this.setState({orderDetailPageStatus: 'load-failed'});
    }
    refreshOrderDetailJsx(this);
}

/** 跳转至既有待支付页，继续选择支付方式并进入支付流程。 */
export function goToPendingPayment() {
    const order = this.state.order || {};
    if (order.status !== '待支付' || !order.orderNo) {
        this.utils.toast({title: '订单状态已变化，请刷新后重试', type: 'warning'});
        return;
    }
    this.utils.router.push(PENDING_PAYMENT_PAGE_ID, {orderId: order.orderNo});
}

export function openCancelOrderDialog() {
    if ((this.state.order || {}).status !== '待支付') return;
    this.setState({isCancelDialogVisible: true});
    refreshOrderDetailJsx(this);
    centerDialogToPageContent('.order-detail-dialog', '.order-detail-page');
}

export function closeCancelOrderDialog() {
    if (this.state.isCancellingOrder) return;
    this.setState({isCancelDialogVisible: false});
    refreshOrderDetailJsx(this);
}

/** 取消当前待支付订单；库存释放仍由既有业务规则负责。 */
export async function cancelPendingOrder() {
    const order = this.state.order || {};
    if (order.status !== '待支付' || !order.formInstId) {
        this.utils.toast({title: '当前订单不可取消，请刷新后重试', type: 'warning'});
        return;
    }
    this.setState({isCancellingOrder: true});
    refreshOrderDetailJsx(this);
    const closeTime = Date.now();
    try {
        await this.dataSourceMap.updateOrderOnCancel.load({
            formInstId: order.formInstId,
            updateFormDataJson: JSON.stringify({
                radioField_mt2mw54h: '已关闭',
                radioField_mt8fx6mi: '关闭（未释放库存）',
                dateField_mt2qewds: closeTime,
                radioField_mt9fft19: '否'
            })
        });
        this.setState({
            remainingPaymentMilliseconds: 0, isCancelDialogVisible: false,
            order: Object.assign({}, order, {status: '已关闭', closeStatus: '关闭（未释放库存）', closeTime: closeTime, isTimeoutClosed: false})
        });
        this.utils.toast({title: '订单已取消', type: 'success'});
        this.utils.router.replace(MY_ORDER_PAGE_ID);
    } catch (error) {
        console.error('[订单详情] 取消订单失败', error);
        this.utils.toast({title: error.message || '订单取消失败，请稍后重试', type: 'error'});
    } finally {
        this.setState({isCancellingOrder: false});
        refreshOrderDetailJsx(this);
    }
}

export function didUnmount() {
    if (this.orderDetailCountdownTimer) window.clearTimeout(this.orderDetailCountdownTimer);
    if (this.orderDetailPaymentBarResizeObserver) this.orderDetailPaymentBarResizeObserver.disconnect();
    if (this.orderDetailWheelScrollHandler) {
        document.removeEventListener('wheel', this.orderDetailWheelScrollHandler, true);
    }
}

/** 返回订单列表。 */
export function backToOrderList() {
    this.utils.router.replace(MY_ORDER_PAGE_ID);
}

/** 打开商城首页。 */
export function goToHome() {
    window.location.href = HOME_PAGE_URL;
}

/** 打开订单商品对应的商品详情页。 */
export function openProductDetail(goods) {
    if (!goods || !goods.goodsSpuId) {
        this.utils.toast({title: '未获取到商品信息，暂时无法打开商品详情', type: 'warning'});
        return;
    }
    this.utils.router.push('FORM-CBE983ABBA9A456882844971E75A61FC1M0L', {spuID: goods.goodsSpuId});
}

/** 格式化时间，供 JSX 中展示。 */
export function formatOrderDetailDateTime(value) {
    return formatDateTime(value);
}
