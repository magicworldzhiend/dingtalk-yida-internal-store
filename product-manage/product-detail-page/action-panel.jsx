const YIDA_OSS_PREFIX = "https://jepa8c.aliwork.com/APP_VZ5VTLROLBD0JJKKLROD";
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


export async function didMount() {

// 获取spuID
    const spuID = this.utils.getUrlParams().spuID;
    if (!spuID) {
        this.utils.toast({ title: "缺少spuID参数，页面无法加载", type: "error" });
        setTimeout(() => {
            // window.history.back();
        }, 1000);
        return;
    }


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

    this.$("slider_mt9iecc2").set(
        "images",
        product.imageList.map((src) => ({ src })),
    );

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
