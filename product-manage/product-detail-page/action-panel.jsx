const YIDA_OSS_PREFIX = "https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD";
const DEFAULT_HOME_URL = "https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD/workbench";
const MY_ORDER_PAGE_ID = "FORM-B889F45E7D8B4CF8B1E2D69C54D88D8BK0UK";
// const getGoodsImageUrl = (picStr) => {
//   if (!picStr) return "";
//   try {
//     const cleanStr = picStr.trim();
//     const arr = JSON.parse(cleanStr);
//     // previewUrl downloadUrl
//     if (Array.isArray(arr) && arr.length > 0 && arr[0].downloadUrl) {
//       return YIDA_OSS_PREFIX + arr[0].downloadUrl;
//     }
//     return "";
//   } catch (e) {
//     console.error("解析商品图片失败", e, picStr);
//     return "";
//   }
// };

/**
 * 根据SPU获取商品信息
 */
async function getGoodsBySpu(spu, instance) {
    const searchObj = {
        serialNumberField_mszwuoff: spu.toString(),
    };
    const res = await instance.dataSourceMap.getGoodsBySpu.load({
        formUuid: "FORM-173F54EE060A41AF99AA1A776B15917CP6H3",
        currentPage: 1,
        pageSize: 1,
        searchFieldJson: JSON.stringify(searchObj),
    });
    let instanceObj = null;
    if (res && Array.isArray(res.data) && res.data.length > 0) {
        instanceObj = res.data[0];
    }
    // console.log("后端返回商品详情数据：", instanceObj);
    if (!instanceObj) {
        return null;
    }

    const formData = instanceObj.formData || {};
    let imageList = [];
    try {
        const rawImageList = JSON.parse(formData.imageField_msq691ft || "[]");
        imageList = Array.isArray(rawImageList)
            ? rawImageList
                .map((item) => item && (item.downloadUrl || item.url || item.previewUrl))
                .filter(Boolean)
                .map((imageUrl) => /^https?:\/\//i.test(imageUrl)
                    ? imageUrl
                    : YIDA_OSS_PREFIX + imageUrl)
            : [];
    } catch (error) {
        console.warn("[商品详情] 商品主图数据格式异常，已忽略该图片字段", error);
    }

    const product = {
        // 级联分类名称
        categoryNames: Array.isArray(formData.cascadeSelectField_msv95kk7)
            ? formData.cascadeSelectField_msv95kk7.join("/")
            : "",
        // 级联分类的ID
        categoryIds: formData.cascadeSelectField_msv95kk7_id || [],
        // 上下架
        shelfStatus: formData.radioField_msq691fu || "",
        // SPU编号
        spuNo: formData.serialNumberField_mszwuoff || "",
        // 商品名称
        productName: formData.textField_msq691fs || "",
        // 图片字段异常时降级为空数组，不阻断商品详情展示。
        imageList: imageList,
    };

    return product;
}

/**
 * 根据SPU获取SKU列表
 */
async function getGoodsSkuListBySpu(spu, instance) {
    const searchObj = {
        textField_mt17nqjb: spu.toString(),
    };
    const res = await instance.dataSourceMap.getGoodsSkuListBySpu.load({
        formUuid: "FORM-016AA49B5DF5456ABF9C5A9BE4D5F090AKKK",
        currentPage: 1,
        pageSize: 100,
        searchFieldJson: JSON.stringify(searchObj),
    });
    let instanceObj = null;
    if (res && Array.isArray(res.data) && res.data.length > 0) {
        instanceObj = res.data[0];
    }
    // console.log("后端返回商品规格列表数据：", instanceObj);
    if (!instanceObj) {
        return null;
    }

    // 获取规格子表
    const tableRows = instanceObj.formData.tableField_msymrpxf || [];
    // 具体的规格子表
    const specTableRows = instanceObj.formData.tableField_msygk2pq || [];


    const productDetails = {
        // 规格表的主键ID
        spec_id: instanceObj.formData.serialNumberField_mt0u1j9w,
        // SKU 表记录实例 ID；更新规格明细子表时必须使用该值。
        skuFormInstId: instanceObj.formInstId || "",
        // 锁定库存时必须整体回写，避免仅提交一行覆盖其他 SKU。
        skuDetailRows: specTableRows,
        // 规格列表
        attrList: tableRows.map((row) => {
            const attr = row.textField_msymrpxg || "";
            const valueStr = row.textareaField_msymrpxh || "";
            const value = valueStr
                .split(/[，,]/)
                .map((item) => item.trim())
                .filter(Boolean);
            return {
                attr: attr,
                value: value,
            };
        }),
        // SKU明细列表
        attrValueList: specTableRows.map((row, rowIndex) => {
            let imageList = [];
            try {
                const imgJsonStr = row.imageField_mt2mwxv8 || "[]";
                const rawImgArr = JSON.parse(imgJsonStr.trim());
                if (Array.isArray(rawImgArr)) {
                    imageList = rawImgArr
                        // previewUrl 是预览图，放大后会模糊；详情页优先使用原始下载地址。
                        .map((item) => item.downloadUrl || item.url || item.previewUrl || "")
                        .filter(Boolean)
                        .map((imageUrl) => (
                            /^https?:\/\//i.test(imageUrl)
                                ? imageUrl
                                : YIDA_OSS_PREFIX + imageUrl
                        ));
                }
            } catch (err) {
                imageList = [];
            }
            return {
                // 具体的SKU_ID
                skuId: row.textField_mt9jn5sc || "",
                attrText: row.textField_msygk2pr || "",
                imageList: imageList,
                imageValue: row.imageField_mt2mwxv8 || "[]",
                price: row.numberField_msymrpxb || 0,
                totalStock: row.numberField_mt81ft78 || 0,
                availableStock: row.numberField_msymrpxc || 0,
                lockedStock: row.numberField_msymrpxd || 0,
                skuRowIndex: rowIndex,
            };
        }),
    };
    return productDetails;
}

/**
 * 按固定 CDN 地址加载 Swiper，复用全局 Promise 防止重复插入脚本。
 *
 * @returns {Promise<void>} Swiper 脚本加载结果
 */
function loadProductDetailSwiperScript() {
    if (window.Swiper) {
        return Promise.resolve();
    }

    if (window.productDetailSwiperScriptPromise) {
        return window.productDetailSwiperScriptPromise;
    }

    window.productDetailSwiperScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/swiper@11.2.1/swiper-bundle.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });

    return window.productDetailSwiperScriptPromise;
}

/**
 * 让固定支付栏始终与商品详情的实际内容区域对齐。
 *
 * fixed 元素会以浏览器视口定位，无法继承宜搭页面容器在侧栏展开、收起后的
 * 可用区域。这里读取 JSX 根节点的实时边界并写入支付栏；不依赖侧栏宽度，
 * 因而适用于不同页面布局和窗口尺寸。
 */
export function initProductDetailPurchaseBarAlignment() {
    const pageContext = this;
    let retryCount = 0;
    let animationFrameId = null;

    function clearPurchaseBarPosition(purchaseBar) {
        purchaseBar.style.removeProperty('left');
        purchaseBar.style.removeProperty('right');
        purchaseBar.style.removeProperty('width');
    }

    /**
     * 在首次定位完成后显示购买栏，避免先以视口全宽绘制、再收缩到内容区。
     *
     * @param {HTMLElement} purchaseBar 商品详情购买栏元素
     */
    function revealPurchaseBar(purchaseBar) {
        purchaseBar.setAttribute('data-aligned', 'true');
    }

    function updatePurchaseBarPosition() {
        animationFrameId = null;

        const pageElement = document.querySelector('.product-detail-page');
        const purchaseBar = document.querySelector('.product-detail-purchase-bar');

        if (!pageElement || !purchaseBar) {
            return;
        }

        // 移动端沿用 CSS 的全宽底栏，避免安全区和窄屏布局受桌面端定位影响。
        if (window.matchMedia('(max-width: 767px)').matches) {
            clearPurchaseBarPosition(purchaseBar);
            revealPurchaseBar(purchaseBar);
            return;
        }

        const pageRect = pageElement.getBoundingClientRect();

        if (pageRect.width <= 0) {
            return;
        }

        purchaseBar.style.left = pageRect.left + 'px';
        purchaseBar.style.right = 'auto';
        purchaseBar.style.width = pageRect.width + 'px';
        revealPurchaseBar(purchaseBar);
    }

    function schedulePurchaseBarPosition() {
        if (animationFrameId !== null) {
            return;
        }

        animationFrameId = window.requestAnimationFrame(updatePurchaseBarPosition);
    }

    function bindPurchaseBarPosition() {
        const pageElement = document.querySelector('.product-detail-page');
        const purchaseBar = document.querySelector('.product-detail-purchase-bar');

        if (!pageElement || !purchaseBar) {
            if (retryCount < 40) {
                retryCount += 1;
                window.setTimeout(bindPurchaseBarPosition, 250);
            }
            return;
        }

        // 详情内容宽度变化（响应式和画布布局变化）时自动重新对齐。
        if (window.ResizeObserver) {
            pageContext.productDetailPurchaseBarResizeObserver = new window.ResizeObserver(
                schedulePurchaseBarPosition
            );
            pageContext.productDetailPurchaseBarResizeObserver.observe(pageElement);
        }

        window.addEventListener('resize', schedulePurchaseBarPosition);
        window.addEventListener('orientationchange', schedulePurchaseBarPosition);
        // 宜搭左侧导航通常通过过渡动画展开/收起；动画结束后重新读取内容边界。
        document.addEventListener('transitionend', schedulePurchaseBarPosition, true);
        schedulePurchaseBarPosition();
    }

    bindPurchaseBarPosition();
}

/** 获取商品详情实际内容 Container 的滚动根。 */
function findProductDetailContentScrollElement() {
    let element = document.querySelector('.product-detail-page');
    while (element && element !== document.body) {
        const overflowY = window.getComputedStyle(element).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
            return element;
        }
        element = element.parentElement;
    }
    return null;
}

/** 将 PC 端任意位置的滚轮事件统一转交给商品详情内容区。 */
export function initProductDetailWheelScroll() {
    const page = this;
    page.productDetailWheelScrollHandler = (event) => {
        if (window.matchMedia('(max-width: 767px)').matches) return;
        const content = findProductDetailContentScrollElement();
        if (!content) return;
        event.preventDefault();
        content.scrollBy({top: event.deltaY, left: event.deltaX, behavior: 'auto'});
    };
    document.addEventListener('wheel', page.productDetailWheelScrollHandler, {capture: true, passive: false});
}

/** 根据当前悬停 SKU 图的位置更新固定放大图坐标，避免被内容滚动区裁切。 */
export function initProductDetailImagePopover() {
    const page = this;
    page.productDetailImagePopoverMoveHandler = (event) => {
        if (window.matchMedia('(max-width: 767px)').matches) return;
        const target = event.target;
        const imageContainer = target && target.closest && target.closest('.product-detail-spec-image');
        const popover = imageContainer && imageContainer.querySelector('.product-detail-spec-image-popover');
        if (!popover) return;
        const imageRect = imageContainer.getBoundingClientRect();
        const popoverWidth = Math.min(510, window.innerWidth * 0.38);
        const pagePadding = 16;
        let left = imageRect.right + pagePadding;
        if (left + popoverWidth > window.innerWidth - pagePadding) {
            left = imageRect.left - popoverWidth - pagePadding;
        }
        left = Math.max(pagePadding, left);
        const top = Math.max(
            pagePadding,
            Math.min(imageRect.bottom - popoverWidth, window.innerHeight - popoverWidth - pagePadding)
        );
        popover.style.setProperty('--product-detail-popover-left', Math.round(left) + 'px');
        popover.style.setProperty('--product-detail-popover-top', Math.round(top) + 'px');
    };
    document.addEventListener('pointermove', page.productDetailImagePopoverMoveHandler, true);
}

/**
 * 按可售 SKU 初始化规格选择，保证进入详情页时优先展示可购买的规格组合。
 *
 * @param {Array} attrList 商品属性列表
 * @param {Array} attrValueList SKU 明细列表
 * @returns {Object} 初始选中的属性值映射
 */
function buildInitialSelectedMap(attrList, attrValueList) {
    const fallbackSku = attrValueList[0] || {};
    const availableSku = attrValueList.find((sku) => (
        Number(sku.availableStock || 0) > 0
    ));
    const initialSku = availableSku || fallbackSku;
    const skuValueList = String(initialSku.attrText || '')
        .split(' / ')
        .map((value) => value.trim());
    const selectedMap = {};

    attrList.forEach((attrItem, index) => {
        const attrName = attrItem.attr || '';
        const valueList = attrItem.value || [];
        const skuValue = skuValueList[index];

        if (attrName && valueList.indexOf(skuValue) !== -1) {
            selectedMap[attrName] = skuValue;
        } else if (attrName && valueList.length > 0) {
            selectedMap[attrName] = valueList[0];
        }
    });

    return selectedMap;
}

/**
 * 初始化商品详情主图 Swiper，并按需加载当前图与下一张图。
 */
export function initProductDetailSwiper() {
    const pageContext = this;
    let retryCount = 0;

    function loadProductImage(slide) {
        const image = slide && slide.querySelector('img[data-product-detail-src]');

        if (!image || !image.dataset.productDetailSrc) {
            return;
        }

        image.src = image.dataset.productDetailSrc;
        image.removeAttribute('data-product-detail-src');
    }

    function loadActiveProductImages(swiper) {
        const imageList = pageContext.state.product
            && Array.isArray(pageContext.state.product.imageList)
            ? pageContext.state.product.imageList
            : [];
        const currentIndex = Number(swiper.realIndex || 0);
        const nextIndex = imageList.length > 1
            ? (currentIndex + 1) % imageList.length
            : currentIndex;

        [currentIndex, nextIndex].forEach((imageIndex) => {
            document.querySelectorAll(
                '#product-detail-swiper .swiper-slide[data-product-image-index="'
                + imageIndex + '"]'
            ).forEach(loadProductImage);
        });
    }

    function mountSwiper() {
        const imageList = pageContext.state.product
            && Array.isArray(pageContext.state.product.imageList)
            ? pageContext.state.product.imageList
            : [];
        const swiperElement = document.querySelector('#product-detail-swiper');

        if ((!imageList.length || !swiperElement) && retryCount < 40) {
            retryCount += 1;
            setTimeout(mountSwiper, 250);
            return;
        }

        if (!imageList.length || !swiperElement) {
            return;
        }

        if (pageContext.productDetailSwiper) {
            pageContext.productDetailSwiper.destroy(true, true);
            pageContext.productDetailSwiper = null;
        }

        loadProductDetailSwiperScript()
            .then(() => {
                pageContext.productDetailSwiper = new window.Swiper(swiperElement, {
                    loop: imageList.length > 1,
                    speed: 500,
                    allowTouchMove: true,
                    simulateTouch: true,
                    autoplay: imageList.length > 1
                        ? {
                            delay: 5000,
                            disableOnInteraction: false,
                        }
                        : false,
                    pagination: {
                        el: swiperElement.querySelector('.product-detail-pagination'),
                        clickable: true,
                    },
                    navigation: {
                        prevEl: swiperElement.querySelector('.product-detail-prev'),
                        nextEl: swiperElement.querySelector('.product-detail-next'),
                    },
                });

                loadActiveProductImages(pageContext.productDetailSwiper);
                pageContext.productDetailSwiper.on('slideChangeTransitionStart', () => {
                    loadActiveProductImages(pageContext.productDetailSwiper);
                });
            })
            .catch((error) => {
                console.error('商品详情 Swiper 加载失败：', error);
            });
    }

    mountSwiper();
}


export async function didMount() {
    initProductDetailWheelScroll.call(this);

    // 商品详情只能通过携带 SPU_ID 的业务路由进入，禁止回退到固定测试商品。
    const spuID = String(this.utils.getUrlParams().spuID || "").trim();
    if (!spuID) {
        this.setState({productDetailPageStatus: "missing-spu-id", product: null});
        return;
    }


    const product = {};
    const spu = await getGoodsBySpu(spuID, this);
    if (spu) {
        Object.assign(product, spu);
    }
    const sku = await getGoodsSkuListBySpu(spuID, this);
    // console.log("封装的商品详情数据：", product);
    // console.log("封装的商品规格数据：", sku);
    if (sku) {
        Object.assign(product, sku);
    }


    const attrList = product.attrList || [];
    product.selectedMap = buildInitialSelectedMap(
        attrList,
        product.attrValueList || []
    );
    this.setState(
        {
            product: product
        }

    );

    initProductDetailSwiper.call(this);
    initProductDetailPurchaseBarAlignment.call(this);
    initProductDetailImagePopover.call(this);

}

/** 卸载商品详情页时释放页面级监听。 */
export function didUnmount() {
    if (this.productDetailPurchaseBarResizeObserver) this.productDetailPurchaseBarResizeObserver.disconnect();
    if (this.productDetailWheelScrollHandler) {
        document.removeEventListener('wheel', this.productDetailWheelScrollHandler, true);
    }
    if (this.productDetailImagePopoverMoveHandler) {
        document.removeEventListener('pointermove', this.productDetailImagePopoverMoveHandler, true);
    }
}

/** 返回首页记录的稳定地址。 */
export function goToHome() {
    try {
        const homeUrl = window.sessionStorage.getItem('internalStoreHomeUrl');
        if (homeUrl) {
            window.location.href = homeUrl;
            return;
        }
    } catch (error) {
        // sessionStorage 不可用时使用固定首页地址。
    }
    window.location.href = DEFAULT_HOME_URL;
}

/** 打开当前登录用户的订单列表。 */
export function goToMyOrders() {
    this.utils.router.push(MY_ORDER_PAGE_ID);
}

/**
 * 获取部门
 */
async function getDept(ins) {
    const res = await ins.dataSourceMap["getDept"].load();
    const list = res.values.map((item) => item.deptFullPath.zh_CN);
    // console.log("部门全路径数组：", list);
    const lastDept = list.length > 0 ? list[list.length - 1] : "";
    return lastDept;
}

/**
 * 格式化日期
 */
function formatDate(timestamp) {
    if (timestamp) {
        const fmt = new Intl.DateTimeFormat("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        return fmt.format(Number(timestamp)).toString().replaceAll("/", "-");
    }
    return "-";
}
