/**
 * 尊敬的用户，你好：页面 JS 面板是高阶用法，一般不建议普通用户使用，如需使用，请确定你具备研发背景，能够自我排查问题。当然，你也可以咨询身边的技术顾问或者联系宜搭平台的技术支持获得服务（可能收费）。
 * 我们可以用 JS 面板来开发一些定制度高功能，比如：调用阿里云接口用来做图像识别、上报用户使用数据（如加载完成打点）等等。
 * 你可以点击面板上方的 「使用帮助」了解。
 */
/**
 * button onClick
 */


/**
 * 首页完成首次渲染后，分别启动 Banner 轮播、商品触底分页和待支付订单数量查询。
 * 三个初始化必须同时保留，避免其中一项功能在覆盖页面 JS 时失效。
 */
export function didMount() {
    initHomeWheelScroll.call(this);
    initHomeSwiper.call(this);
    initHomeProductLoadMore.call(this);
    loadPendingPaymentOrderCount.call(this);
}

/** 将首页任意位置的鼠标滚轮统一转交给内容滚动 Container。 */
export function initHomeWheelScroll() {
    const page = this;

    page.homeWheelScrollHandler = (event) => {
        const contentScrollElement = findHomeContentScrollElement(
            document.querySelector('.home-banner-section')
        );

        if (!contentScrollElement || window.matchMedia('(max-width: 767px)').matches) {
            return;
        }

        event.preventDefault();
        contentScrollElement.scrollBy({
            top: event.deltaY,
            left: event.deltaX,
            behavior: 'auto'
        });
    };
    document.addEventListener('wheel', page.homeWheelScrollHandler, {capture: true, passive: false});
}

/** 查找包含指定节点的首页内容滚动容器。 */
function findHomeContentScrollElement(element) {
    let currentElement = element && element.nodeType === 1 ? element : null;

    while (currentElement && currentElement !== document.body) {
        const overflowY = window.getComputedStyle(currentElement).overflowY;

        if (overflowY === 'auto' || overflowY === 'scroll') {
            return currentElement;
        }
        currentElement = currentElement.parentElement;
    }

    return null;
}

/**
 * 查询当前登录用户的待支付订单数量，供首页“我的订单”入口展示红点。
 * 查询失败时隐藏红点，不影响首页商品浏览。
 *
 * @returns {Promise<void>} 查询完成后的处理结果。
 */
export function loadPendingPaymentOrderCount() {
    const page = this;
    const submitterId = String((window.loginUser || {}).userId || '').trim();

    if (!submitterId || !page.dataSourceMap || !page.dataSourceMap.getPendingPaymentOrderCount) {
        page.setState({ pendingPaymentOrderCount: 0 });
        return Promise.resolve();
    }

    return page.dataSourceMap.getPendingPaymentOrderCount.load({
        formUuid: 'FORM-F7AEAE3939C14A4696786991D78FB19E85EL',
        currentPage: 1,
        // 仅使用 totalCount，无需加载全部待支付订单记录。
        pageSize: 1,
        searchFieldJson: JSON.stringify({
            textField_mt2mw548: submitterId,
            radioField_mt2mw54h: '待支付'
        })
    }).then((response) => {
        const result = response && response.result ? response.result : response;
        const count = Number(result && result.totalCount || 0);

        page.setState({
            pendingPaymentOrderCount: Number.isFinite(count) && count > 0 ? count : 0
        });
    }).catch((error) => {
        console.error('首页待支付订单数量查询失败', error);
        page.setState({ pendingPaymentOrderCount: 0 });
    });
}



/**
 * 按固定 CDN 地址加载 Swiper，并复用全局 Promise 防止重复插入 script。
 *
 * @returns {Promise<void>} Swiper 脚本加载结果。
 */
function loadSwiperScript() {
    if (window.Swiper) {
        return Promise.resolve();
    }

    if (window.homeSwiperScriptPromise) {
        return window.homeSwiperScriptPromise;
    }

    window.homeSwiperScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/swiper@11.2.1/swiper-bundle.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });

    return window.homeSwiperScriptPromise;
}

/**
 * 初始化首页 Banner 的 Swiper 轮播。
 * 数据源或 DOM 尚未就绪时短暂轮询；每次初始化前销毁旧实例。
 */
export function initHomeSwiper() {
    const pageContext = this;
    let retryCount = 0;

    /** 加载指定轮播项的延迟图片，避免首次渲染并发下载全部 Banner 原图。 */
    function loadBannerImage(slide) {
        const image = slide && slide.querySelector('img[data-home-banner-src]');

        if (!image) {
            return;
        }

        const imageUrl = image.dataset.homeBannerSrc;

        if (!imageUrl) {
            return;
        }

        image.src = imageUrl;
        image.removeAttribute('data-home-banner-src');
    }

    /** 预加载当前 Banner 及下一张，兼顾首屏带宽和轮播切换体验。 */
    function loadActiveBannerImages(swiper) {
        const bannerCount = Array.isArray(pageContext.state.getAvailableBanner)
            ? pageContext.state.getAvailableBanner.length
            : 0;

        if (!bannerCount) {
            return;
        }

        const currentIndex = Number(swiper.realIndex || 0);
        const nextIndex = (currentIndex + 1) % bannerCount;

        [currentIndex, nextIndex].forEach((bannerIndex) => {
            const slideList = document.querySelectorAll(
                '#home-banner-swiper .swiper-slide[data-banner-index="' + bannerIndex + '"]'
            );

            slideList.forEach(loadBannerImage);
        });
    }

    /** 尝试挂载轮播实例，直到 Banner 数据和目标 DOM 同时就绪。 */
    function mountSwiper() {
        const bannerList = Array.isArray(pageContext.state.getAvailableBanner)
            ? pageContext.state.getAvailableBanner
            : [];
        const swiperElement = document.querySelector('#home-banner-swiper');

        if ((!bannerList.length || !swiperElement) && retryCount < 40) {
            retryCount += 1;
            setTimeout(mountSwiper, 250);
            return;
        }

        if (!bannerList.length || !swiperElement) {
            return;
        }

        // 页面重新渲染时先释放旧实例，避免箭头和自动播放重复绑定。
        if (pageContext.homeSwiper) {
            pageContext.homeSwiper.destroy(true, true);
            pageContext.homeSwiper = null;
        }

        loadSwiperScript()
            .then(() => {
                pageContext.homeSwiper = new window.Swiper(swiperElement, {
                    loop: bannerList.length > 1,
                    speed: 500,
                    allowTouchMove: true,
                    simulateTouch: true,
                    // 横向滑动仍由 Banner 轮播处理，纵向手势交还内容 Container 滚动。
                    touchStartPreventDefault: false,
                    touchMoveStopPropagation: false,
                    autoplay: bannerList.length > 1
                        ? {
                            delay: 5000,
                            disableOnInteraction: false
                        }
                        : false,
                    pagination: {
                        el: swiperElement.querySelector('.home-banner-pagination'),
                        clickable: true
                    },
                    navigation: {
                        prevEl: swiperElement.querySelector('.home-banner-prev'),
                        nextEl: swiperElement.querySelector('.home-banner-next')
                    }
                });

                loadActiveBannerImages(pageContext.homeSwiper);
                pageContext.homeSwiper.on('slideChangeTransitionStart', () => {
                    loadActiveBannerImages(pageContext.homeSwiper);
                });
            })
            .catch((error) => {
                console.error('Swiper 加载失败', error);
            });
    }

    mountSwiper();
}

/**
 * 初始化商品列表的“本地分批展示 + 远程分页累计”逻辑。
 * SPU 决定商品页是否还有更多记录；SKU 在当前 SPU 缺失时按页补齐。
 */
export function initHomeProductLoadMore() {
    const page = this;

    const pageSize = 10;

    /** 在 JSX 完成 setState 重渲染后，通知观察器重新绑定新的加载标记。 */
    function emitProductListChanged() {
        window.setTimeout(() => {
            window.dispatchEvent(new Event('home-product-list-changed'));
        }, 100);
    }

    /**
     * 规范化远程数据源的返回值，兼容直接数组、分页对象及 result 包装对象。
     *
     * @param {Object|Array} value 数据源状态或 load() 返回值。
     * @returns {{data: Array, totalCount: number, currentPage: number}|null}
     */
    function readDataPage(value) {
        const response = value && value.result ? value.result : value;

        if (Array.isArray(response)) {
            return {
                data: response,
                totalCount: response.length,
                currentPage: 1
            };
        }

        return response && Array.isArray(response.data)
            ? {
                data: response.data,
                totalCount: Number(response.totalCount || response.data.length),
                currentPage: Number(response.currentPage || 1)
            }
            : null;
    }

    /** 使用宜搭记录实例 ID 作为累计去重键。 */
    function getRecordKey(record, fallbackIndex) {
        return String(record && record.formInstId || fallbackIndex);
    }

    /** 合并已加载页和新页，并剔除跨页重复记录。 */
    function mergeRecords(currentList, nextList) {
        const recordMap = {};

        currentList.concat(nextList).forEach((record, index) => {
            recordMap[getRecordKey(record, index)] = record;
        });

        return Object.keys(recordMap).map((key) => recordMap[key]);
    }

    /** 从 SPU 记录中读取项目约定的 SPU 业务主键。 */
    function getSpuId(record) {
        return String(
            record && record.formData && record.formData.serialNumberField_mszwuoff || ''
        );
    }

    /** 从 SKU 顶层记录中读取其关联的 SPU 业务主键。 */
    function getSkuSpuId(record) {
        return String(
            record && record.formData && record.formData.textField_mt17nqjb || ''
        );
    }

    /**
     * 将页面私有缓存同步到 state，触发 JSX 重新聚合价格、库存和商品卡片。
     * 缓存放在 page 对象上，避免远程数据源下一页覆盖前一页 state。
     */
    function syncCatalogState() {
        const catalog = page.__homeCatalogCache;

        if (!catalog) {
            return;
        }

        page.setState({
            homeLoadedSpuRecords: catalog.spuRecords,
            homeLoadedSkuRecords: catalog.skuRecords,
            homeSpuTotalCount: catalog.spuTotalCount,
            homeSkuTotalCount: catalog.skuTotalCount,
            homeCatalogLoading: Boolean(page.__homeCatalogLoading)
        });
        emitProductListChanged();
    }

    /**
     * 使用两个自动加载数据源的第 1 页创建商品缓存。
     * 返回 null 表示数据源尚未完成首次请求。
     */
    function createCatalogCache() {
        if (page.__homeCatalogCache) {
            return page.__homeCatalogCache;
        }

        const pageState = page.state || {};
        const spuPage = readDataPage(pageState.getAvailableSpu);
        const skuPage = readDataPage(pageState.getSkuStock);

        if (!spuPage || !skuPage) {
            return null;
        }

        // 分别保存 SPU 与 SKU 的页码，不能假定两者的分页顺序一致。
        page.__homeCatalogCache = {
            spuRecords: mergeRecords([], spuPage.data),
            skuRecords: mergeRecords([], skuPage.data),
            spuTotalCount: spuPage.totalCount,
            skuTotalCount: skuPage.totalCount,
            spuCurrentPage: spuPage.currentPage,
            skuCurrentPage: skuPage.currentPage
        };

        return page.__homeCatalogCache;
    }

    /**
     * 请求指定远程数据源的一页数据。
     * load() 参数会覆盖数据源配置中的 currentPage/pageSize。
     */
    function requestDataPage(dataSourceName, currentPage) {
        if (!page.dataSourceMap || !page.dataSourceMap[dataSourceName]) {
            return Promise.reject(new Error('未找到数据源：' + dataSourceName));
        }

        return page.dataSourceMap[dataSourceName]
            .load({
                currentPage: currentPage,
                pageSize: pageSize
            })
            .then((response) => {
                const dataPage = readDataPage(response);

                if (!dataPage) {
                    throw new Error(dataSourceName + ' 未返回可用分页数据');
                }

                return dataPage;
            });
    }

    /**
     * 加载下一页 SKU 顶层记录；达到总数或最后一页时不再请求。
     */
    function loadNextSkuPage() {
        const catalog = page.__homeCatalogCache;

        if (
            !catalog
            || catalog.skuRecords.length >= catalog.skuTotalCount
            || catalog.skuCurrentPage * pageSize >= catalog.skuTotalCount
        ) {
            return Promise.resolve();
        }

        return requestDataPage('getSkuStock', catalog.skuCurrentPage + 1)
            .then((skuPage) => {
                catalog.skuRecords = mergeRecords(catalog.skuRecords, skuPage.data);
                catalog.skuTotalCount = skuPage.totalCount;
                catalog.skuCurrentPage = skuPage.currentPage;
            });
    }

    /**
     * 确保指定 SPU 都有对应 SKU 顶层记录。
     * SKU 页与 SPU 页无固定对应关系，因此按 SPU_ID 缺失情况持续补页。
     */
    function ensureSkuCoverage(spuIdList) {
        const catalog = page.__homeCatalogCache;

        if (!catalog) {
            return Promise.resolve();
        }

        const skuSpuIdMap = {};
        catalog.skuRecords.forEach((record) => {
            const spuId = getSkuSpuId(record);

            if (spuId) {
                skuSpuIdMap[spuId] = true;
            }
        });

        // 某 SPU 没有 SKU 时不能把它直接判为缺货，必须先尝试加载后续 SKU 页。
        const hasMissingSku = () => spuIdList.some((spuId) => (
            spuId && !skuSpuIdMap[spuId]
        ));

        const loadUntilCovered = () => {
            if (
                !hasMissingSku()
                || catalog.skuRecords.length >= catalog.skuTotalCount
                || catalog.skuCurrentPage * pageSize >= catalog.skuTotalCount
            ) {
                return Promise.resolve();
            }

            return loadNextSkuPage().then(() => {
                catalog.skuRecords.forEach((record) => {
                    const spuId = getSkuSpuId(record);

                    if (spuId) {
                        skuSpuIdMap[spuId] = true;
                    }
                });
                return loadUntilCovered();
            });
        };

        return loadUntilCovered();
    }

    /** 加载下一页 SPU，并累计到现有商品记录中。 */
    function loadNextSpuPage() {
        const catalog = page.__homeCatalogCache;

        if (
            !catalog
            || catalog.spuRecords.length >= catalog.spuTotalCount
            || catalog.spuCurrentPage * pageSize >= catalog.spuTotalCount
        ) {
            return Promise.resolve();
        }

        return requestDataPage('getAvailableSpu', catalog.spuCurrentPage + 1)
            .then((spuPage) => {
                catalog.spuRecords = mergeRecords(catalog.spuRecords, spuPage.data);
                catalog.spuTotalCount = spuPage.totalCount;
                catalog.spuCurrentPage = spuPage.currentPage;
            });
    }

    /**
     * 初始化首页缓存，并先补齐首批 SPU 所需的 SKU 数据。
     * 数据源尚未返回时最多等待约 12 秒。
     */
    function bootstrapCatalog(retryCount = 0) {
        const catalog = createCatalogCache();

        if (!catalog) {
            if (retryCount < 60) {
                return new Promise((resolve) => {
                    window.setTimeout(() => resolve(bootstrapCatalog(retryCount + 1)), 200);
                });
            }

            return Promise.reject(new Error('首页 SPU 或 SKU 初始数据加载超时'));
        }

        const spuIdList = catalog.spuRecords.map(getSpuId).filter(Boolean);

        return ensureSkuCoverage(spuIdList).then(() => {
            syncCatalogState();
        });
    }

    /**
     * 触底且本地商品已展示完时调用：加载下一页 SPU，再补齐其 SKU。
     */
    function loadNextCatalogPage() {
        if (page.__homeCatalogLoading) {
            return Promise.resolve();
        }

        // 并发触底回调只允许一个远程分页请求执行。
        page.__homeCatalogLoading = true;
        syncCatalogState();

        return bootstrapCatalog()
            .then(() => loadNextSpuPage())
            .then(() => {
                const catalog = page.__homeCatalogCache;
                const spuIdList = catalog.spuRecords.map(getSpuId).filter(Boolean);

                return ensureSkuCoverage(spuIdList);
            })
            .catch((error) => {
                console.error('首页商品分页加载失败', error);
                page.utils.toast({
                    type: 'error',
                    title: '商品加载失败，请稍后重试'
                });
            })
            .then(() => {
                page.__homeCatalogLoading = false;
                syncCatalogState();
            });
    }

    /**
     * 监听商品列表底部标记：本地有未显示卡片时只增加可见数，
     * 本地耗尽后才请求下一页远程数据。
     */
    const observeLoadMore = (retryCount = 0) => {
        const sentinel = document.getElementById('home-product-load-more');

        if (!sentinel) {
            if (retryCount < 60) {
                window.setTimeout(() => observeLoadMore(retryCount + 1), 200);
            }
            return;
        }

        if (page.__homeProductObserver) {
            page.__homeProductObserver.disconnect();
        }

        const contentScrollElement = findHomeContentScrollElement(
            document.querySelector('.home-banner-section')
        );
        page.__homeProductObserver = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                if (!entry || !entry.isIntersecting || entry.target.dataset.hasMore !== 'true') {
                    return;
                }

                page.__homeProductObserver.disconnect();

                const visibleCount = Number(entry.target.dataset.visibleCount || 0);
                const loadedProductCount = Number(entry.target.dataset.loadedProductCount || 0);
                const pageState = page.state || {};

                // 当前缓存仍有未展示卡片，不需要额外请求网络数据。
                if (visibleCount < loadedProductCount) {
                    page.setState({
                        productVisibleCount: Number(pageState.productVisibleCount || 4) + 4
                    });
                    emitProductListChanged();
                    return;
                }

                loadNextCatalogPage().then(() => {
                    page.setState({
                        productVisibleCount: Number(pageState.productVisibleCount || 4) + 4
                    });
                    emitProductListChanged();
                });
            },
            {
                root: contentScrollElement,
                rootMargin: '0px 0px 240px 0px',
                threshold: 0
            }
        );

        page.__homeProductObserver.observe(sentinel);
    };

    if (page.__homeProductListChangedHandler) {
        window.removeEventListener(
            'home-product-list-changed',
            page.__homeProductListChangedHandler
        );
    }

    page.__homeProductListChangedHandler = () => {
        window.setTimeout(() => observeLoadMore(), 100);
    };

    window.addEventListener(
        'home-product-list-changed',
        page.__homeProductListChangedHandler
    );

    bootstrapCatalog()
        .catch((error) => {
            console.error('首页商品初始加载失败', error);
        })
        .then(() => observeLoadMore());
}

/** 释放首页页面级滚轮监听。 */
export function didUnmount() {
    if (this.homeWheelScrollHandler) {
        document.removeEventListener('wheel', this.homeWheelScrollHandler, true);
    }

    if (this.__homeProductObserver) {
        this.__homeProductObserver.disconnect();
    }

    if (this.__homeProductListChangedHandler) {
        window.removeEventListener(
            'home-product-list-changed',
            this.__homeProductListChangedHandler
        );
    }
}
