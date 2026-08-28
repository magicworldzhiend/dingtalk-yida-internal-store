/**
 * 聚合 SPU、SKU 缓存并渲染首页商品卡片、下架状态和触底加载标记。
 */
function render(me, state, data, ctx) {
    const pageState = this.state || {};
    const domain = 'https://jepa8c.aliwork.com';

    /** 兼容分页对象和旧版数组状态，读取数据源当前页内容。 */
    function readDataPage(value) {
        if (Array.isArray(value)) {
            return {
                data: value,
                totalCount: value.length,
                currentPage: 1
            };
        }

        return value && Array.isArray(value.data)
            ? {
                data: value.data,
                totalCount: Number(value.totalCount || value.data.length),
                currentPage: Number(value.currentPage || 1)
            }
            : {
                data: [],
                totalCount: 0,
                currentPage: 1
            };
    }

    const spuSourcePage = readDataPage(pageState.getAvailableSpu);
    const skuSourcePage = readDataPage(pageState.getSkuStock);
    const spuList = Array.isArray(pageState.homeLoadedSpuRecords)
        ? pageState.homeLoadedSpuRecords
        : spuSourcePage.data;
    const skuList = Array.isArray(pageState.homeLoadedSkuRecords)
        ? pageState.homeLoadedSkuRecords
        : skuSourcePage.data;
    const spuTotalCount = Number(
        pageState.homeSpuTotalCount || spuSourcePage.totalCount || spuList.length
    );
    const skuTotalCount = Number(
        pageState.homeSkuTotalCount || skuSourcePage.totalCount || skuList.length
    );
    const loadedSkuSpuIdMap = {};

    // 用于判断当前已加载 SPU 是否仍缺少关联 SKU，避免误判为缺货。
    skuList.forEach(function (sku) {
        const spuId = String(sku && sku.formData && sku.formData.textField_mt17nqjb || '');

        if (spuId) {
            loadedSkuSpuIdMap[spuId] = true;
        }
    });
    const keyword = String(pageState.keyword || '').trim().toLowerCase();
    const parentCategoryId = String(pageState.appliedParentCategoryId || '');
    const categoryId = String(pageState.appliedCategoryId || '');
    const isMobile = this.utils.isMobile();

    /** 安全解析宜搭以 JSON 字符串保存的图片字段。 */
    function parseJson(value, defaultValue) {
        try {
            return JSON.parse(value || '');
        } catch (error) {
            return defaultValue;
        }
    }

    /** 从宜搭图片字段优先取下载地址，并补齐同域相对路径。 */
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

    /** 读取 SKU 顶层记录中的规格明细子表。 */
    function getSkuDetailList(sku) {
        const formData = sku.formData || {};
        return Array.isArray(formData.tableField_msygk2pq)
            ? formData.tableField_msygk2pq
            : [];
    }

    const skuSummaryMap = {};

    // 以 SPU_ID 聚合最低价和全部规格的可用库存，供商品卡片展示。
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
            const productStatus = String(formData.radioField_msq691fu || '');
            const isOffShelf = productStatus === '下架';

            if (!spuId || (!skuSummary && !isOffShelf)) {
                return null;
            }

            // 等全部 SPU 加载完成再展示下架商品，保证其始终排在上架商品之后。
            if (isOffShelf && spuList.length < spuTotalCount) {
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
                lowestPrice: skuSummary ? skuSummary.lowestPrice : null,
                availableStock: skuSummary ? skuSummary.availableStock : 0,
                isOffShelf: isOffShelf
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
        })
        .sort(function (previousProduct, nextProduct) {
            return Number(previousProduct.isOffShelf) - Number(nextProduct.isOffShelf);
        });

    const productPageSize = 4;
    const visibleProductCount = Number(
        pageState.productVisibleCount || productPageSize
    );
    const visibleProductList = productList.slice(0, visibleProductCount);
    const hasMoreProduct = visibleProductCount < productList.length;
    const hasUnloadedSpu = spuList.length < spuTotalCount;
    const hasUnloadedSku = skuList.length < skuTotalCount
        && spuList.some(function (spu) {
            const spuId = String(
                spu && spu.formData && spu.formData.serialNumberField_mszwuoff || ''
            );
            return spuId && !loadedSkuSpuIdMap[spuId];
        });
    const canLoadMoreProduct = hasMoreProduct
        || hasUnloadedSpu
        || hasUnloadedSku
        || Boolean(pageState.homeCatalogLoading);



    if (!productList.length) {
        return (
            <div>
                <div
                    style={{
                        padding: isMobile ? '48px 12px' : '64px 24px',
                        color: '#8F959E',
                        textAlign: 'center',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px'
                    }}
                >
                    {canLoadMoreProduct ? '正在加载商品…' : '暂无可展示商品'}
                </div>

                <div
                    id="home-product-load-more"
                    data-has-more={canLoadMoreProduct ? 'true' : 'false'}
                    data-visible-count="0"
                    data-loaded-product-count="0"
                    style={{ minHeight: '1px' }}
                ></div>
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
                        class={product.isOffShelf
                            ? 'home-product-card home-product-card-off-shelf'
                            : 'home-product-card'}
                        href={product.spuId ? '#' : ''}
                        onClick={(event) => {
                            event.preventDefault();

                            if (product.spuId) {
                                this.utils.router.push(
                                    'FORM-CBE983ABBA9A456882844971E75A61FC1M0L',
                                    { spuID: product.spuId }
                                );
                            }
                        }}
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
                                position: 'relative',
                                width: '100%',
                                aspectRatio: '1 / 1',
                                backgroundColor: '#F5F6F8',
                                overflow: 'hidden'
                            }}
                        >
                            {product.productImage ? (
                                <img
                                    src={product.productImage}
                                    alt={product.productName}
                                    loading="lazy"
                                    fetchpriority="low"
                                    decoding="async"
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

                            {product.isOffShelf && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#FFFFFF',
                                        backgroundColor: 'rgba(31, 35, 41, 0.56)',
                                        fontSize: isMobile ? '18px' : '22px',
                                        fontWeight: '600',
                                        letterSpacing: '0.12em'
                                    }}
                                >
                                    已下架
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
                {product.lowestPrice === null
                    ? '暂无售价'
                    : '¥' + product.lowestPrice.toFixed(2)}
              </span>

                                <span
                                    style={{
                                        flex: '0 0 auto',
                                        color: product.isOffShelf
                                            ? '#8F959E'
                                            : (product.availableStock > 0 ? '#00B42A' : '#8F959E'),
                                        fontSize: '12px'
                                    }}
                                >
                {product.isOffShelf
                    ? '已下架'
                    : (product.availableStock > 0 ? '有货' : '暂时缺货')}
              </span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>

            <div
                id="home-product-load-more"
                data-has-more={canLoadMoreProduct ? 'true' : 'false'}
                data-visible-count={visibleProductList.length}
                data-loaded-product-count={productList.length}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '56px',
                    color: '#8F959E',
                    fontSize: '13px'
                }}
            >
                {canLoadMoreProduct ? '正在加载更多商品…' : '已经到底了'}
            </div>
        </div>
    );
}
