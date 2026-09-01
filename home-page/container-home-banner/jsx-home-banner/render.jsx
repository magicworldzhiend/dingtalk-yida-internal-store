/**
 * 渲染 Swiper 所需的 Banner DOM；实际轮播行为由页面 JS 的 initHomeSwiper 初始化。
 */
function render(me, state, data, ctx) {
    const bannerList = Array.isArray(this.state.getAvailableBanner)
        ? this.state.getAvailableBanner
        : [];

    // 没有可展示 Banner 时交由 Container 隐藏整个轮播板块，避免保留空白区域。
    if (!bannerList.length) {
        return <div class="home-banner-empty" aria-hidden="true"></div>;
    }

    return (
        <div id="home-banner-swiper" class="swiper home-banner-swiper">
            <div class="swiper-wrapper">
                {/* 点击 Banner 后由宜搭路由跳转至关联 SPU 的详情页。 */}
                {bannerList.map((banner, index) => (
                    <a
                        key={banner.src || index}
                        class="swiper-slide"
                        data-banner-index={index}
                        href={banner.spuId ? '#' : ''}
                        onClick={(event) => {
                            event.preventDefault();

                            if (banner.spuId) {
                                try {
                                    window.sessionStorage.setItem(
                                        'internalStoreHomeUrl',
                                        window.location.href
                                    );
                                } catch (error) {
                                    // 存储不可用时仍允许按原路由进入商品详情。
                                }
                                this.utils.router.push(
                                    'FORM-CBE983ABBA9A456882844971E75A61FC1M0L',
                                    { spuID: banner.spuId }
                                );
                            }
                        }}
                    >
                        <img
                            src={index === 0 ? banner.src : undefined}
                            data-home-banner-src={index === 0 ? undefined : banner.src}
                            alt=""
                            loading={index === 0 ? 'eager' : 'lazy'}
                            fetchpriority={index === 0 ? 'high' : 'low'}
                            decoding="async"
                        />
                    </a>
                ))}
            </div>

            <div class="swiper-button-prev home-banner-prev"></div>
            <div class="swiper-button-next home-banner-next"></div>
            <div class="swiper-pagination home-banner-pagination"></div>
        </div>
    );
}
