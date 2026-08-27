function render(me, state, data, ctx) {
    const pageState = this.state || {};
    const domain = 'https://jepa8c.aliwork.com';
    const spuList = Array.isArray(pageState.getAvailableSpu)
        ? pageState.getAvailableSpu
        : [];
    const skuList = Array.isArray(pageState.getSkuStock)
        ? pageState.getSkuStock
        : [];
    const keyword = String(pageState.keyword || '').trim().toLowerCase();
    const parentCategoryId = String(pageState.appliedParentCategoryId || '');
    const categoryId = String(pageState.appliedCategoryId || '');
    const isMobile = this.utils.isMobile();

    function parseJson(value, defaultValue) {
        try {
            return JSON.parse(value || '');
        } catch (error) {
            return defaultValue;
        }
    }

    function resolveImageUrl(imageFieldValue) {
        const imageList = parseJson(imageFieldValue, []);
        const image = imageList[0] || {};
        const imageUrl = image.downloadUrl || image.url || image.previewUrl || '';

        if (!imageUrl) {
            return '';
        }

        return /^https?:\/\//i.test(imageUrl)
            ? imageUrl
            : domain + imageUrl;
    }

    function getSkuDetailList(sku) {
        const formData = sku.formData || {};
        return Array.isArray(formData.tableField_msygk2pq)
            ? formData.tableField_msygk2pq
            : [];
    }

    const skuSummaryMap = {};

    skuList.forEach(function (sku) {
        const formData = sku.formData || {};
        const spuId = String(formData.textField_mt17nqjb || '');

        if (!spuId) {
            return;
        }

        const detailList = getSkuDetailList(sku);
        const priceList = detailList
            .map(function (detail) {
                return Number(detail.numberField_msymrpxb);
            })
            .filter(function (price) {
                return Number.isFinite(price);
            });

        if (!priceList.length) {
            return;
        }

        const availableStock = detailList.reduce(function (total, detail) {
            return total + Number(detail.numberField_msymrpxc || 0);
        }, 0);

        const currentSummary = skuSummaryMap[spuId];

        if (!currentSummary) {
            skuSummaryMap[spuId] = {
                lowestPrice: Math.min.apply(null, priceList),
                availableStock: availableStock
            };
            return;
        }

        currentSummary.lowestPrice = Math.min(
            currentSummary.lowestPrice,
            Math.min.apply(null, priceList)
        );
        currentSummary.availableStock += availableStock;
    });

    const productList = spuList
        .map(function (spu) {
            const formData = spu.formData || {};
            const spuId = String(formData.serialNumberField_mszwuoff || '');
            const skuSummary = skuSummaryMap[spuId];

            if (!spuId || !skuSummary) {
                return null;
            }

            const categoryIdList = Array.isArray(
                formData.cascadeSelectField_msv95kk7_id
            )
                ? formData.cascadeSelectField_msv95kk7_id.map(String)
                : [];
            const productName = String(formData.textField_msq691fs || '');

            return {
                spuId: spuId,
                formInstId: spu.formInstId || '',
                productName: productName,
                productImage: resolveImageUrl(formData.imageField_msq691ft),
                categoryIdList: categoryIdList,
                lowestPrice: skuSummary.lowestPrice,
                availableStock: skuSummary.availableStock
            };
        })
        .filter(function (product) {
            return product;
        })
        .filter(function (product) {
            if (keyword && product.productName.toLowerCase().indexOf(keyword) === -1) {
                return false;
            }

            if (
                parentCategoryId
                && product.categoryIdList.indexOf(parentCategoryId) === -1
            ) {
                return false;
            }

            if (
                categoryId
                && product.categoryIdList[product.categoryIdList.length - 1] !== categoryId
            ) {
                return false;
            }

            return true;
        });

    const productPageSize = 4;
    const visibleProductCount = Number(
        pageState.productVisibleCount || productPageSize
    );
    const visibleProductList = productList.slice(0, visibleProductCount);
    const hasMoreProduct = visibleProductCount < productList.length;



    if (!productList.length) {
        return (
            <div
                style={{
                    padding: isMobile ? '48px 12px' : '64px 24px',
                    color: '#8F959E',
                    textAlign: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px'
                }}
            >
                暂无可展示商品
            </div>
        );
    }

    return (
        <div style={{ width: '100%' }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile
                        ? 'repeat(2, minmax(0, 1fr))'
                        : 'repeat(4, minmax(0, 1fr))',
                    gap: isMobile ? '12px' : '16px',
                    width: '100%'
                }}
            >
                {visibleProductList.map((product) => (
                    <a
                        key={product.spuId}
                        class="home-product-card"
                        href={product.formInstId
                            ? '/detail?spuId=' + encodeURIComponent(product.formInstId)
                            : ''}
                        style={{
                            display: 'block',
                            overflow: 'hidden',
                            border: '1px solid #EEF0F3',
                            borderRadius: '12px',
                            color: 'inherit',
                            backgroundColor: '#FFFFFF',
                            textDecoration: 'none'
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                aspectRatio: '1 / 1',
                                backgroundColor: '#F5F6F8'
                            }}
                        >
                            {product.productImage ? (
                                <img
                                    src={product.productImage}
                                    alt={product.productName}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        objectPosition: 'center'
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '100%',
                                        height: '100%',
                                        color: '#8F959E',
                                        fontSize: '13px'
                                    }}
                                >
                                    暂无图片
                                </div>
                            )}
                        </div>

                        <div style={{ padding: isMobile ? '10px' : '12px' }}>
                            <div
                                style={{
                                    display: '-webkit-box',
                                    overflow: 'hidden',
                                    minHeight: isMobile ? '38px' : '42px',
                                    color: '#1F2329',
                                    fontSize: isMobile ? '14px' : '15px',
                                    fontWeight: '500',
                                    lineHeight: '21px',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: '2'
                                }}
                            >
                                {product.productName}
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    marginTop: '10px'
                                }}
                            >
              <span
                  style={{
                      color: '#F53F3F',
                      fontSize: isMobile ? '16px' : '18px',
                      fontWeight: '600'
                  }}
              >
                ¥{product.lowestPrice.toFixed(2)}
              </span>

                                <span
                                    style={{
                                        flex: '0 0 auto',
                                        color: product.availableStock > 0 ? '#00B42A' : '#8F959E',
                                        fontSize: '12px'
                                    }}
                                >
                {product.availableStock > 0 ? '有货' : '暂时缺货'}
              </span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>

            <div
                id="home-product-load-more"
                data-has-more={hasMoreProduct ? 'true' : 'false'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '56px',
                    color: '#8F959E',
                    fontSize: '13px'
                }}
            >
                {hasMoreProduct ? '正在加载更多商品…' : '已经到底了'}
            </div>
        </div>
    );
}
