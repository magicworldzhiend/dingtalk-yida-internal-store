/**
 * 渲染商品详情、规格选择及购买操作区域。
 */
function render() {
    const pageState = this.state || {};
    const product = pageState.product || {};
    const attrList = product.attrList || [];
    const attrValueList = product.attrValueList || [];
    const productImageList = Array.isArray(product.imageList)
        ? product.imageList
        : [];
    const selectedMap = product.selectedMap || {};
    const selectedCount = Object.keys(selectedMap).length;
    const attrCount = attrList.length;
    const buyNum = Math.max(1, Number(product.buyNum || 1));

    const getMatchedSkuList = () => {
        return attrValueList.filter((sku) => {
            const selectedValueList = Object.values(selectedMap);
            const skuValueList = String(sku.attrText || '').split(' / ');

            return selectedValueList.every((value) => (
                skuValueList.indexOf(value) !== -1
            ));
        });
    };

    const matchedSkuList = getMatchedSkuList();
    const currentSku = selectedCount === attrCount && matchedSkuList.length
        ? matchedSkuList[0]
        : null;
    const previewSku = currentSku || matchedSkuList[0] || attrValueList[0] || {};
    const showPrice = Number(previewSku.price || 0);
    const totalPrice = (Math.round((showPrice * buyNum + Number.EPSILON) * 100) / 100)
        .toFixed(2);
    const availableStock = Number(previewSku.availableStock || 0);
    const isOutOfStock = availableStock <= 0;
    const productName = product.productName || '商品详情';
    const selectedImageUrl = (previewSku.imageList && previewSku.imageList[0])
        || (product.imageList && product.imageList[0])
        || '';
    const categoryNames = product.categoryNames || '-';
    const spuNo = product.spuNo || '-';
    const shelfStatus = product.shelfStatus || '-';
    const isOffShelf = shelfStatus === '下架';

    const refreshJsx = () => {
        const jsxComponent = this.$('jsx_mt9iecc3');
        if (jsxComponent) {
            jsxComponent.forceUpdate();
        }
    };

    const selectAttr = (attrName, value) => {
        this.setState({
            product: Object.assign({}, product, {
                selectedMap: Object.assign({}, selectedMap, {
                    [attrName]: value,
                }),
            }),
        });
        refreshJsx();
    };

    const updateBuyNum = (value) => {
        if (isOutOfStock) {
            this.utils.toast({
                title: '当前商品暂无可用库存',
                type: 'warning',
            });
            return;
        }

        const nextValue = Math.min(
            availableStock,
            Math.max(1, Number(value) || 1)
        );

        this.setState({
            product: Object.assign({}, product, {
                buyNum: nextValue,
            }),
        });
        refreshJsx();
    };

    const renderAttrDom = () => {
        if (!attrList.length) {
            return <div class="product-detail-empty">该商品暂无可选规格</div>;
        }

        return attrList.map((attrItem, index) => {
            const attrName = attrItem.attr || '';
            const valueList = attrItem.value || [];

            return (
                <div class="product-detail-attribute" key={attrName || index}>
                    <div class="product-detail-attribute-name">{attrName}</div>
                    <div class="product-detail-attribute-values">
                        {valueList.map((value) => {
                            const active = selectedMap[attrName] === value;

                            return (
                                <button
                                    key={value}
                                    class={active
                                        ? 'product-detail-option product-detail-option-active'
                                        : 'product-detail-option'}
                                    onClick={() => selectAttr(attrName, value)}
                                >
                                    {value}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        });
    };

    const onBuy = () => {
        if (isOffShelf) {
            this.utils.toast({ title: '该商品已下架', type: 'warning' });
            return;
        }

        if (isOutOfStock) {
            this.utils.toast({ title: '当前商品暂无可用库存', type: 'warning' });
            return;
        }

        if (!currentSku) {
            this.utils.toast({ title: '请完整选择全部规格', type: 'warning' });
            return;
        }

        const requestData = Object.assign({
            spec_id: product.spec_id,
            spuNo: product.spuNo,
            categoryIds: product.categoryIds,
            categoryNames: product.categoryNames,
            productName: product.productName,
            buyNum: buyNum,
        }, currentSku);

        console.log('商品详情立即购买参数：', requestData);
        this.utils.toast({
            title: '已选择 ' + buyNum + ' 件商品',
            type: 'success',
            duration: 1500,
        });
    };

    /** 从首页进入详情页时，返回浏览器历史中的首页。 */
    const goBackToHome = () => {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        this.utils.toast({
            title: '未找到首页访问记录，请从首页重新进入商品详情。',
            type: 'warning',
        });
    };

    return (
        <div class="product-detail-page">
            <section class="product-detail-gallery">
                {productImageList.length ? (
                    <div id="product-detail-swiper" class="swiper product-detail-swiper">
                        <div class="swiper-wrapper">
                            {productImageList.map((imageUrl, index) => (
                                <div
                                    key={imageUrl || index}
                                    class="swiper-slide"
                                    data-product-image-index={index}
                                >
                                    <img
                                        src={index === 0 ? imageUrl : undefined}
                                        data-product-detail-src={index === 0 ? undefined : imageUrl}
                                        alt={productName}
                                        loading={index === 0 ? 'eager' : 'lazy'}
                                        fetchpriority={index === 0 ? 'high' : 'low'}
                                        decoding="async"
                                    />
                                </div>
                            ))}
                        </div>
                        <div class="swiper-button-prev product-detail-prev"></div>
                        <div class="swiper-button-next product-detail-next"></div>
                        <div class="swiper-pagination product-detail-pagination"></div>
                    </div>
                ) : (
                    <div class="product-detail-gallery-empty">暂无商品主图</div>
                )}
            </section>
            <main class="product-detail-container">
                <section class="product-detail-card product-detail-summary">
                    <div class="product-detail-summary-header">
                        <span class={isOffShelf
                            ? 'product-detail-status product-detail-status-off'
                            : 'product-detail-status'}
                        >
                            {isOffShelf ? '已下架' : '在售'}
                        </span>
                        <span class="product-detail-spu">SPU：{spuNo}</span>
                    </div>
                    <h1 class="product-detail-title">{productName}</h1>
                    <div class="product-detail-category">{categoryNames}</div>
                    <div class="product-detail-price-row">
                        <div>
                            <span class="product-detail-price-prefix">¥</span>
                            <strong class="product-detail-price">{showPrice}</strong>
                        </div>
                        <span class={isOutOfStock
                            ? 'product-detail-stock product-detail-stock-empty'
                            : 'product-detail-stock'}
                        >
                            {isOutOfStock ? '暂时缺货' : '可用库存 ' + availableStock}
                        </span>
                    </div>
                </section>

                <section class="product-detail-card product-detail-specification">
                    <div class="product-detail-selection-layout">
                        <div class="product-detail-selection-content">
                            <div class="product-detail-section-heading">
                                <h2>选择规格</h2>
                                <span>{selectedCount}/{attrCount || 0} 已选</span>
                            </div>
                            <div class="product-detail-attribute-area">
                                {renderAttrDom()}
                            </div>
                            <div class="product-detail-quantity-row">
                                <span class="product-detail-quantity-label">购买数量</span>
                                <div class="product-detail-stepper">
                                    <button
                                        disabled={buyNum <= 1 || isOutOfStock}
                                        onClick={() => updateBuyNum(buyNum - 1)}
                                    >
                                        −
                                    </button>
                                    <input
                                        value={buyNum}
                                        inputMode="numeric"
                                        onChange={(event) => updateBuyNum(event.target.value)}
                                        onBlur={(event) => updateBuyNum(event.target.value)}
                                    />
                                    <button
                                        disabled={buyNum >= availableStock || isOutOfStock}
                                        onClick={() => updateBuyNum(buyNum + 1)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                        <aside class="product-detail-spec-image">
                            {selectedImageUrl ? (
                                <div class="product-detail-spec-image-main">
                                    <img
                                        key={selectedImageUrl}
                                        src={selectedImageUrl}
                                        alt={currentSku ? currentSku.attrText : productName}
                                        decoding="async"
                                    />
                                </div>
                            ) : (
                                <div class="product-detail-spec-image-empty">暂无规格图片</div>
                            )}
                            {selectedImageUrl ? (
                                <div class="product-detail-spec-image-popover">
                                    <img
                                        src={selectedImageUrl}
                                        alt=""
                                        decoding="async"
                                    />
                                </div>
                            ) : null}
                        </aside>
                    </div>
                </section>
            </main>

            <footer class="product-detail-purchase-bar">
                <div class="product-detail-purchase-content">
                    <div class="product-detail-purchase-summary">
                        <span>已选 {currentSku ? currentSku.attrText : '规格'} × {buyNum}</span>
                        <strong>合计 ¥ {totalPrice}</strong>
                    </div>
                    <div class="product-detail-purchase-actions">
                        <button
                            class="product-detail-home-button"
                            type="button"
                            onClick={goBackToHome}
                        >
                            <span class="product-detail-home-icon" aria-hidden="true">⌂</span>
                            返回首页
                        </button>
                        <button
                            class="product-detail-buy-button"
                            disabled={isOutOfStock || isOffShelf}
                            onClick={onBuy}
                        >
                            {isOffShelf ? '商品已下架' : (isOutOfStock ? '暂时缺货' : '立即购买')}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
