function render(me, state, data, ctx) {
    const bannerList = Array.isArray(this.state.getAvailableBanner)
        ? this.state.getAvailableBanner
        : [];

    return (
        <div id="home-banner-swiper" class="swiper home-banner-swiper">
            <div class="swiper-wrapper">
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
