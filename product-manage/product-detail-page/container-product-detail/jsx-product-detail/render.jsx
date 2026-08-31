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
    const isCreatingOrder = Boolean(pageState.isCreatingOrder);

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

    const onBuy = async () => {
        if (isCreatingOrder) {
            return;
        }

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

        const loginUser = window.loginUser || {};
        const submitterId = String(loginUser.userId || '').trim();
        if (!submitterId) {
            this.utils.toast({ title: '未获取到当前登录用户，请刷新后重试', type: 'warning' });
            return;
        }

        this.setState({ isCreatingOrder: true });
        refreshJsx();
        let createdOrderId = '';
        try {
            const latestSkuResponse = await this.dataSourceMap.getGoodsSkuListBySpu.load({
                formUuid: 'FORM-016AA49B5DF5456ABF9C5A9BE4D5F090AKKK',
                currentPage: 1,
                pageSize: 1,
                searchFieldJson: JSON.stringify({
                    textField_mt17nqjb: product.spuNo,
                }),
            });
            const latestSkuRecord = latestSkuResponse
                && latestSkuResponse.data
                && latestSkuResponse.data[0];
            const latestSkuFormData = latestSkuRecord && latestSkuRecord.formData;
            const latestSkuRows = latestSkuFormData
                && latestSkuFormData.tableField_msygk2pq;
            const latestSkuRowIndex = Array.isArray(latestSkuRows)
                ? latestSkuRows.findIndex((row) => row.textField_mt9jn5sc === currentSku.skuId)
                : -1;
            const latestSkuRow = latestSkuRowIndex >= 0
                ? latestSkuRows[latestSkuRowIndex]
                : null;

            if (!latestSkuRecord || !latestSkuRow) {
                throw new Error('未查询到当前 SKU，请刷新商品详情后重试');
            }

            const latestAvailableStock = Number(latestSkuRow.numberField_msymrpxc);
            const latestLockedStock = Number(latestSkuRow.numberField_msymrpxd || 0);
            const latestUnitPrice = Number(latestSkuRow.numberField_msymrpxb);
            if (!Number.isFinite(latestAvailableStock) || latestAvailableStock < buyNum) {
                throw new Error('当前 SKU 库存不足，请刷新后重新选择');
            }
            if (!Number.isFinite(latestLockedStock) || !Number.isFinite(latestUnitPrice)) {
                throw new Error('当前 SKU 的库存或价格数据异常');
            }

            const orderStartTime = Date.now();
            const payableAmount = Math.round((latestUnitPrice * buyNum + Number.EPSILON) * 100) / 100;
            const response = await this.dataSourceMap.createPendingOrder.load({
                formUuid: 'FORM-F7AEAE3939C14A4696786991D78FB19E85EL',
                appType: 'APP_VZ5VTLROLBD0JJKKLROD',
                formDataJson: JSON.stringify({
                    textField_mt2mw548: submitterId,
                    radioField_mt2mw54h: '待支付',
                    dateField_mt6szq75: orderStartTime,
                    dateField_mt2mw54j: orderStartTime + 10 * 60 * 1000,
                    radioField_mt8fx6mi: '未关闭',
                    radioField_mt9fft19: '否',
                    numberField_mt2mw54b: payableAmount,
                    numberField_mtglxtt3: 0,
                }),
            });

            const orderFormInstId = String(response || '').trim();
            if (!orderFormInstId) {
                throw new Error('创建订单未返回记录实例 ID');
            }

            const orderRecord = await this.dataSourceMap.getOrderByFormInstId.load({
                formInstId: orderFormInstId,
            });
            const orderId = String(
                orderRecord
                && orderRecord.formData
                && orderRecord.formData.serialNumberField_mt2mw545
                || ''
            ).trim();

            if (!orderId) {
                console.error('[商品详情] 订单记录详情：', orderRecord);
                throw new Error('未获取到订单业务流水号');
            }
            createdOrderId = orderId;

            const orderDetailFormInstId = String(
                await this.dataSourceMap.createOrderDetail.load({
                    formUuid: 'FORM-FD12EFCA83254FFD977BCFADCFC85533PDEN',
                    appType: 'APP_VZ5VTLROLBD0JJKKLROD',
                    formDataJson: JSON.stringify({
                        textField_mt7zg4f3: orderId,
                        textField_mt9xddqu: product.spuNo,
                        textField_mt9i74jf: currentSku.skuId,
                        textField_mt9i74jg: product.productName,
                        textField_mt9i74jh: product.categoryNames,
                        numberField_mt9i74jj: latestUnitPrice,
                        numberField_mt9i74jl: buyNum,
                        textField_mt9i74jk: latestSkuRow.textField_msygk2pr || currentSku.attrText,
                        imageField_mtglpdws: latestSkuRow.imageField_mt2mwxv8 || '[]',
                        numberField_mtglpdwt: payableAmount,
                        radioField_mt8fx6mi: '未关闭',
                    }),
                }) || ''
            ).trim();

            if (!orderDetailFormInstId) {
                throw new Error('创建订单明细未返回记录实例 ID');
            }

            const updatedSkuRows = latestSkuRows.map((row, index) => (
                index === latestSkuRowIndex
                    ? Object.assign({}, row, {
                        numberField_msymrpxc: latestAvailableStock - buyNum,
                        numberField_msymrpxd: latestLockedStock + buyNum,
                    })
                    : row
            ));
            await this.dataSourceMap.updateSkuStock.load({
                formInstId: latestSkuRecord.formInstId,
                updateFormDataJson: JSON.stringify({
                    tableField_msygk2pq: updatedSkuRows,
                }),
            });

            console.log('[商品详情] 下单完成：', {
                orderFormInstId: orderFormInstId,
                orderId: orderId,
                orderDetailFormInstId: orderDetailFormInstId,
            });
            window.location.href = window.location.origin
                + '/APP_VZ5VTLROLBD0JJKKLROD/preview/FORM-01464CAE858D4323956BD131C332AB9F7IOM?orderId='
                + encodeURIComponent(orderId);
        } catch (error) {
            console.error('[商品详情] 创建待支付订单失败：', error);
            this.utils.toast({
                title: createdOrderId
                    ? '订单 ' + createdOrderId + ' 未完成，请联系管理员处理'
                    : '订单创建失败，请查看控制台后重试',
                type: 'error',
            });
        } finally {
            this.setState({ isCreatingOrder: false });
            refreshJsx();
        }
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
                            disabled={isOutOfStock || isOffShelf || isCreatingOrder}
                            onClick={onBuy}
                        >
                            {isCreatingOrder ? '创建订单中...' : (isOffShelf ? '商品已下架' : (isOutOfStock ? '暂时缺货' : '立即购买'))}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
