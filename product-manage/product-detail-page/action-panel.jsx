const YIDA_OSS_PREFIX = "https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD";
const DEFAULT_DEBUG_SPU_ID = "520260824163552";
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

    const product = {
        // 级联分类名称
        categoryNames:
            instanceObj.formData.cascadeSelectField_msv95kk7.join("/") || [],
        // 级联分类的ID
        categoryIds: instanceObj.formData.cascadeSelectField_msv95kk7_id || [],
        // 上下架
        shelfStatus: instanceObj.formData.radioField_msq691fu || "",
        // SPU编号
        spuNo: instanceObj.formData.serialNumberField_mszwuoff || "",
        // 商品名称
        productName: instanceObj.formData.textField_msq691fs || "",
        // 图片，字符串转数组
        imageList:
            JSON.parse(instanceObj.formData.imageField_msq691ft).map(
                (item) => YIDA_OSS_PREFIX + item.downloadUrl,
            ) || "[]",
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
        // 规格列表
        attrList: tableRows.map((row) => {
            const attr = row.textField_msymrpxg || "";
            const valueStr = row.textareaField_msymrpxh || "";
            const value = valueStr
                .split("，")
                .map((item) => item.trim())
                .filter(Boolean);
            return {
                attr: attr,
                value: value,
            };
        }),
        // SKU明细列表
        attrValueList: specTableRows.map((row) => {
            let imageList = [];
            try {
                const imgJsonStr = row.imageField_mt2mwxv8 || "[]";
                const rawImgArr = JSON.parse(imgJsonStr.trim());
                if (Array.isArray(rawImgArr)) {
                    imageList = rawImgArr
                        .filter((item) => item.previewUrl)
                        .map((item) => YIDA_OSS_PREFIX + item.previewUrl);
                }
            } catch (err) {
                imageList = [];
            }
            return {
                // 具体的SKU_ID
                skuId: row.textField_mt9jn5sc || "",
                attrText: row.textField_msygk2pr || "",
                imageList: imageList,
                price: row.numberField_msymrpxb || 0,
                totalStock: row.numberField_mt81ft78 || 0,
                availableStock: row.numberField_msymrpxc || 0,
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

    // 正常从首页路由读取 SPU_ID；直接调试详情页时回退到固定测试商品。
    const spuID = this.utils.getUrlParams().spuID || DEFAULT_DEBUG_SPU_ID;


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


    const selectedMap = {};
    const attrList = product.attrList || [];
    for (let i = 0; i < attrList.length; i++) {
        const attrItem = attrList[i];
        const attrName = attrItem.attr;
        const valueList = attrItem.value || [];
        if (attrName && valueList.length > 0) {
            selectedMap[attrName] = valueList[0];
        }
    }

    product.selectedMap = selectedMap;
    this.setState(
        {
            product: product
        }

    );

    initProductDetailSwiper.call(this);

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
