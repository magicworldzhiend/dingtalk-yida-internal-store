const ORDER_FORM_UUID = 'FORM-F7AEAE3939C14A4696786991D78FB19E85EL';
const ORDER_DETAIL_FORM_UUID = 'FORM-FD12EFCA83254FFD977BCFADCFC85533PDEN';
const MY_ORDER_PAGE_ID = 'FORM-B889F45E7D8B4CF8B1E2D69C54D88D8BK0UK';
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
        orderNo: data.serialNumberField_mt2mw545 || String(orderNo), status: data.radioField_mt2mw54h || '',
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
    const orderNo = this.utils.getUrlParams().orderNo;
    if (!orderNo) {
        this.setState({orderDetailPageStatus: 'missing-order-no'});
        refreshOrderDetailJsx(this);
        return;
    }
    this.setState({orderDetailPageStatus: 'loading', order: null, goodsList: []});
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
        }
    } catch (error) {
        console.error('[订单详情] 加载失败', error);
        this.setState({orderDetailPageStatus: 'load-failed'});
    }
    refreshOrderDetailJsx(this);
}

/** 返回订单列表。 */
export function backToOrderList() {
    this.utils.router.replace(MY_ORDER_PAGE_ID);
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
