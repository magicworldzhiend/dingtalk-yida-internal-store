/**
 * 渲染 Swiper 所需的 Banner DOM；实际轮播行为由页面 JS 的 initHomeSwiper 初始化。
 */
function render(me, state, data, ctx) {
    const bannerList = Array.isArray(this.state.getAvailableBanner)
        ? this.state.getAvailableBanner
        : [];

    return (
        <div id="home-banner-swiper" class="swiper home-banner-swiper">
            <div class="swiper-wrapper">
                {/* 每条 Banner 的链接由数据源根据关联 SPU 实例 ID 生成。 */}
                {bannerList.map((banner, index) => (
                    <a
                        key={banner.src || index}
                        class="swiper-slide"
                        href={banner.link || ''}
                    >
                        <img src={banner.src} alt="" />
                    </a>
                ))}
            </div>

            <div class="swiper-button-prev home-banner-prev"></div>
            <div class="swiper-button-next home-banner-next"></div>
            <div class="swiper-pagination home-banner-pagination"></div>
        </div>
    );
}
