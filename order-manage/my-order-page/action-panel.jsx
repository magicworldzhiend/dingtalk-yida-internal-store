const ORDER_FORM_UUID = 'FORM-F7AEAE3939C14A4696786991D78FB19E85EL';
const ORDER_DETAIL_FORM_UUID = 'FORM-FD12EFCA83254FFD977BCFADCFC85533PDEN';
const PENDING_PAYMENT_PAGE_ID = 'FORM-01464CAE858D4323956BD131C332AB9F7IOM';
const MY_ORDER_JSX_ID = 'jsx_mti8yqbo';
const ORDER_PAGE_SIZE = 10;
const YIDA_OSS_PREFIX = 'https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD';

/** 解析宜搭图片字段。 */
function resolveImageUrl(value) {
    try {
        const image = (Array.isArray(value) ? value : JSON.parse(String(value || '[]')))[0] || {};
        const url = image.downloadUrl || image.url || image.previewUrl || '';
        return url && !/^https?:\/\//i.test(url) ? YIDA_OSS_PREFIX + url : url;
    } catch (error) {
        return '';
    }
}

/** 刷新绑定的订单 JSX。 */
function refreshMyOrderJsx(page) {
    const component = page.$(MY_ORDER_JSX_ID);
    if (component) {
        component.forceUpdate();
    }
}

/** 查询一个订单对应的商品快照。 */
async function loadOrderDetail(page, orderId) {
    const response = await page.dataSourceMap.getOrderDetails.load({
        formUuid: ORDER_DETAIL_FORM_UUID, currentPage: 1, pageSize: 1,
        searchFieldJson: JSON.stringify({textField_mt7zg4f3: orderId})
    });
    const data = response && response.data && response.data[0] && response.data[0].formData || {};
    return {
        productName: data.textField_mt9i74jg || '商品信息缺失',
        specification: data.textField_mt9i74jk || '--',
        quantity: Number(data.numberField_mt9i74jl || 0),
        imageUrl: resolveImageUrl(data.imageField_mtglpdws)
    };
}

/** 将订单主记录转换为页面卡片数据。 */
async function buildOrder(page, record) {
    const data = record.formData || {};
    const orderId = String(data.serialNumberField_mt2mw545 || '');
    let detail;
    try {
        detail = orderId ? await loadOrderDetail(page, orderId) : {};
    } catch (error) {
        detail = {productName: '商品信息加载失败', specification: '--', quantity: 0, imageUrl: ''};
    }
    return {
        formInstId: record.formInstId || '',
        orderId: orderId,
        status: data.radioField_mt2mw54h || '',
        payableAmount: Number(data.numberField_mt2mw54b || 0),
        paidAmount: Number(data.numberField_mtglxtt3 || 0),
        createTime: data.dateField_mt6szq75 || record.gmtCreate || '',
        productName: detail.productName || '商品信息缺失',
        specification: detail.specification || '--',
        quantity: detail.quantity || 0,
        imageUrl: detail.imageUrl || ''
    };
}

/** 将缓存同步到页面状态。 */
function syncMyOrderState(page) {
    const cache = page.__myOrderCache;
    const keyword = String(cache.keyword || '').toLowerCase();
    const list = cache.orderList.filter((order) => !keyword || order.orderId.toLowerCase().indexOf(keyword) !== -1 || order.productName.toLowerCase().indexOf(keyword) !== -1);
    page.setState({
        myOrderList: list,
        myOrderStatus: cache.status,
        myOrderKeyword: cache.keyword,
        myOrderKeywordInput: cache.keyword,
        myOrderTotalCount: cache.totalCount,
        myOrderHasMore: cache.orderList.length < cache.totalCount,
        myOrderLoading: Boolean(page.__myOrderLoading),
        myOrderLoadFailed: false
    });
    window.setTimeout(() => window.dispatchEvent(new Event('my-order-list-changed')), 50);
    refreshMyOrderJsx(page);
}

/** 加载下一页订单并累计到本地缓存。 */
async function loadNextOrderPage(page) {
    const cache = page.__myOrderCache;
    if (!cache || cache.orderList.length >= cache.totalCount && cache.currentPage > 0) {
        return;
    }
    const fields = {textField_mt2mw548: String((window.loginUser || {}).userId || '').trim()};
    if (!fields.textField_mt2mw548) {
        throw new Error('未获取到当前登录用户');
    }
    if (cache.status) {
        fields.radioField_mt2mw54h = cache.status;
    }
    const response = await page.dataSourceMap.getMyOrderList.load({
        formUuid: ORDER_FORM_UUID,
        currentPage: cache.currentPage + 1,
        pageSize: ORDER_PAGE_SIZE,
        searchFieldJson: JSON.stringify(fields)
    });
    const records = Array.isArray(response && response.data) ? response.data : [];
    const nextOrders = await Promise.all(records.map((record) => buildOrder(page, record)));
    const existing = {};
    cache.orderList.concat(nextOrders).forEach((order) => {
        existing[order.formInstId || order.orderId] = order;
    });
    cache.orderList = Object.keys(existing).map((key) => existing[key]);
    cache.totalCount = Number(response && response.totalCount || cache.orderList.length);
    cache.currentPage = Number(response && response.currentPage || cache.currentPage + 1);
}

/** 初始化订单页面和自动加载观察器。 */
export async function didMount() {
    this.setState({
        myOrderList: [],
        myOrderStatus: '',
        myOrderKeyword: '',
        myOrderKeywordInput: '',
        myOrderLoading: true,
        myOrderLoadFailed: false
    });
    this.initMyOrderLoadMore();
    this.initMyOrderPullToRefresh();
    await this.reloadMyOrderList({status: '', keyword: ''});
}

/** 初始化移动端订单列表下拉刷新。 */
export function initMyOrderPullToRefresh() {
    const page = this;
    if (!page.utils.isMobile()) {
        return;
    }
    let retryCount = 0;
    let startY = 0;

    function bindPullToRefresh() {
        const orderList = document.querySelector('.my-order-list');
        if (!orderList) {
            if (retryCount < 20) {
                retryCount += 1;
                window.setTimeout(bindPullToRefresh, 100);
            }
            return;
        }
        orderList.addEventListener('touchstart', (event) => {
            startY = orderList.scrollTop <= 0 && event.touches[0] ? event.touches[0].clientY : 0;
        }, {passive: true});
        orderList.addEventListener('touchend', (event) => {
            const endY = event.changedTouches[0] ? event.changedTouches[0].clientY : 0;
            if (startY && endY - startY >= 64) {
                page.refreshMyOrderList();
            }
            startY = 0;
        }, {passive: true});
    }

    bindPullToRefresh();
}

/** 刷新当前筛选条件下的订单列表。 */
export async function refreshMyOrderList() {
    if (this.__myOrderLoading || this.__myOrderRefreshing) {
        return;
    }
    this.__myOrderRefreshing = true;
    try {
        await this.reloadMyOrderList({status: this.state.myOrderStatus, keyword: this.state.myOrderKeyword});
        if (this.state.myOrderLoadFailed) {
            throw new Error('订单刷新失败');
        }
        this.utils.toast({title: '订单已刷新', type: 'success'});
    } catch (error) {
        this.utils.toast({title: '订单刷新失败，请稍后重试', type: 'error'});
    } finally {
        this.__myOrderRefreshing = false;
    }
}

/** 按状态或搜索条件重建订单分页缓存。商品名搜索会加载全部订单页，保证结果完整。 */
export async function reloadMyOrderList(options) {
    const status = String(options && options.status || '');
    const keyword = String(options && options.keyword || '').trim();
    this.__myOrderCache = {orderList: [], totalCount: 0, currentPage: 0, status: status, keyword: keyword};
    this.__myOrderLoading = true;
    syncMyOrderState(this);
    try {
        await loadNextOrderPage(this);
        while (keyword && this.__myOrderCache.orderList.length < this.__myOrderCache.totalCount) {
            await loadNextOrderPage(this);
        }
        this.__myOrderLoading = false;
        syncMyOrderState(this);
    } catch (error) {
        console.error('[我的订单] 查询失败', error);
        this.__myOrderLoading = false;
        this.setState({myOrderList: [], myOrderLoading: false, myOrderLoadFailed: true, myOrderHasMore: false});
        refreshMyOrderJsx(this);
    }
}

/** 触底时自动加载下一页订单。 */
export function initMyOrderLoadMore() {
    const page = this;
    const observe = () => {
        const sentinel = document.getElementById('my-order-load-more');
        if (!sentinel) {
            window.setTimeout(observe, 100);
            return;
        }
        if (page.__myOrderObserver) {
            page.__myOrderObserver.disconnect();
        }
        const orderList = document.querySelector('.my-order-list');
        page.__myOrderObserver = new IntersectionObserver((entries) => {
            if (!entries[0] || !entries[0].isIntersecting || entries[0].target.dataset.hasMore !== 'true' || page.__myOrderLoading) {
                return;
            }
            page.__myOrderObserver.disconnect();
            page.loadNextMyOrderPage();
        }, {root: orderList, rootMargin: '0px 0px 240px 0px', threshold: 0});
        page.__myOrderObserver.observe(sentinel);
    };
    window.addEventListener('my-order-list-changed', observe);
    observe();
}

/** 对当前筛选条件加载更多订单。 */
export async function loadNextMyOrderPage() {
    if (this.__myOrderLoading) {
        return;
    }
    this.__myOrderLoading = true;
    syncMyOrderState(this);
    try {
        await loadNextOrderPage(this);
    } catch (error) {
        console.error('[我的订单] 加载更多失败', error);
        this.utils.toast({title: '订单加载失败，请稍后重试', type: 'error'});
    }
    this.__myOrderLoading = false;
    syncMyOrderState(this);
}

/** 校验订单最新状态后跳转待付款页面。 */
export async function goToPendingPayment(order) {
    if (!order || !order.orderId || order.status !== '待支付') {
        this.utils.toast({title: '订单状态已变化，请刷新订单后重试', type: 'warning'});
        return;
    }
    try {
        const response = await this.dataSourceMap.getMyOrderList.load({
            formUuid: ORDER_FORM_UUID,
            currentPage: 1,
            pageSize: 1,
            searchFieldJson: JSON.stringify({serialNumberField_mt2mw545: order.orderId})
        });
        const latestStatus = response && response.data && response.data[0]
            && response.data[0].formData && response.data[0].formData.radioField_mt2mw54h;
        if (latestStatus !== '待支付') {
            this.utils.toast({title: '订单状态已变化，请刷新订单后重试', type: 'warning'});
            return;
        }
        this.utils.router.push(PENDING_PAYMENT_PAGE_ID, {orderId: order.orderId});
    } catch (error) {
        this.utils.toast({title: '订单状态校验失败，请刷新订单后重试', type: 'warning'});
    }
}

/** 确认领取订单商品。 */
export function confirmOrderClaim(order) {
    const page = this;
    page.utils.dialog({
        method: 'confirm',
        title: '确认领取',
        content: '确认已领取该订单商品吗？',
        footerActions: ['cancel', 'ok'],
        onOk: async () => {
            await page.dataSourceMap.updateMyOrder.load({
                formInstId: order.formInstId,
                updateFormDataJson: JSON.stringify({radioField_mt2mw54h: '已完成', dateField_mt2qewds: Date.now()})
            });
            page.utils.toast({title: '已确认领取', type: 'success'});
            await page.reloadMyOrderList({status: page.state.myOrderStatus, keyword: page.state.myOrderKeyword});
        }
    });
}

/** 预留订单详情入口。 */
export function openMyOrderDetail() {
    this.utils.toast({title: '订单详情功能即将上线', type: 'warning'});
}

/** 返回进入页面前的首页地址。 */
export function backToHome() {
    try {
        const url = window.sessionStorage.getItem('internalStoreHomeUrl');
        if (url) {
            window.location.href = url;
            return;
        }
    } catch (error) {
    }
    window.history.back();
}
