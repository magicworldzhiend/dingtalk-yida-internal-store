/**
 * 尊敬的用户，你好：页面 JS 面板是高阶用法，一般不建议普通用户使用，如需使用，请确定你具备研发背景，能够自我排查问题。当然，你也可以咨询身边的技术顾问或者联系宜搭平台的技术支持获得服务（可能收费）。
 * 我们可以用 JS 面板来开发一些定制度高功能，比如：调用阿里云接口用来做图像识别、上报用户使用数据（如加载完成打点）等等。
 * 你可以点击面板上方的 「使用帮助」了解。
 */
/**
 * button onClick
 */


//页面加载完成
export function didMount() {
    initHomeProductLoadMore.call(this);
}


/**
 * 加载 Swiper 脚本。
 *
 * @returns {Promise<void>} Swiper 脚本加载结果
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
 */
export function initHomeSwiper() {
    const pageContext = this;
    let retryCount = 0;

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
            })
            .catch((error) => {
                console.error('Swiper 加载失败', error);
            });
    }

    mountSwiper();
}

/**
 * 初始化首页商品列表的触底加载。
 */
export function initHomeProductLoadMore() {
    const page = this;

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

        page.__homeProductObserver = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                if (!entry || !entry.isIntersecting || entry.target.dataset.hasMore !== 'true') {
                    return;
                }

                page.__homeProductObserver.disconnect();

                const pageState = page.state || {};
                const visibleCount = Number(pageState.productVisibleCount || 4);

                page.setState({
                    productVisibleCount: visibleCount + 4
                });

                window.setTimeout(() => observeLoadMore(), 120);
            },
            {
                root: null,
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

    observeLoadMore();
}
