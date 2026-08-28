function render() {
    const data = this.state || {};
    const product = data.product || {};
    const attrList = product.attrList || [];
    const attrValueList = product.attrValueList || [];
    const selectedMap = product.selectedMap || {};

    const getFilterSku = () => {
        const result = [];
        for (let i = 0; i < attrValueList.length; i++) {
            const sku = attrValueList[i];
            const attrText = sku.attrText || "";
            const arr = attrText.split(" / ");
            let match = true;
            const keys = Object.keys(selectedMap);
            for (let j = 0; j < keys.length; j++) {
                const key = keys[j];
                const selectVal = selectedMap[key];
                if (arr.indexOf(selectVal) === -1) {
                    match = false;
                    break;
                }
            }
            if (match) {
                result.push(sku);
            }
        }
        return result;
    };

    const filterSkuList = getFilterSku();
    let currentSku = null;
    const selectedCount = Object.keys(selectedMap).length;
    const attrCount = attrList.length;
    if (selectedCount === attrCount && filterSkuList.length > 0) {
        currentSku = filterSkuList[0];
    }

    let showPrice = 0;
    let availableStock = 0;
    if (currentSku) {
        showPrice = currentSku.price || 0;
        availableStock = currentSku.availableStock || 0;
    } else if (filterSkuList.length > 0) {
        showPrice = filterSkuList[0].price || 0;
        availableStock = product.availableStock || 0;
    } else if (attrValueList.length > 0) {
        showPrice = attrValueList[0].price || 0;
        availableStock = product.availableStock || 0;
    }

    const productName = product.productName || "";
    const categoryNames = product.categoryNames || "-";
    const spuNo = product.spuNo || "-";
    const shelfStatus = product.shelfStatus || "-";

    const refreshJsx = () => {
        const jsxComponent = this.$("jsx_mt9iecc3");
        if (jsxComponent) {
            jsxComponent.forceUpdate();
        }
    };

    const selectAttr = (attrName, value) => {
        const newSelectedMap = {
            ...selectedMap,
            [attrName]: value,
        };
        this.setState({
            product: {
                ...product,
                selectedMap: newSelectedMap,
            },
        });
        refreshJsx();
    };

    const renderAttrDom = () => {
        const out = [];
        for (let i = 0; i < attrList.length; i++) {
            const attrItem = attrList[i];
            const attrName = attrItem.attr || "";
            const valueList = attrItem.value || [];
            const tagList = [];
            for (let j = 0; j < valueList.length; j++) {
                const value = valueList[j];
                const active = selectedMap[attrName] === value;
                tagList.push(
                    <span
                        key={j}
                        style={{
                            display: "inline-block",
                            padding: "6px 14px",
                            margin: "0 8px 8px 0",
                            border: active ? "1px solid #ff7800" : "1px solid #ccc",
                            borderRadius: "4px",
                            color: active ? "#ff7800" : "#333",
                            backgroundColor: active ? "#fff7e6" : "#fff",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                        }}
                        onClick={() => {
                            selectAttr(attrName, value);
                        }}
                    >
            {value}
          </span>
                );
            }
            out.push(
                <div
                    key={i}
                    style={{
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: 15,
                            color: "#333",
                            marginBottom: 8,
                        }}
                    >
                        {attrName}：
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                        }}
                    >
                        {tagList}
                    </div>
                </div>
            );
        }
        return out;
    };

    const renderSkuResult = () => {
        const out = [];
        for (let k = 0; k < filterSkuList.length; k++) {
            const sku = filterSkuList[k];
            const imgArr = sku.imageList || [];
            const imgDom = [];
            for (let m = 0; m < imgArr.length; m++) {
                imgDom.push(
                    <img
                        key={m}
                        src={imgArr[m]}
                        style={{
                            maxWidth: "100%",
                            width: 280,
                            height: "auto",
                            marginRight: 12,
                            marginBottom: 10,
                            borderRadius: 4,
                        }}
                    />
                );
            }
            out.push(
                <div
                    key={k}
                    style={{
                        marginBottom: 16,
                        paddingBottom: 12,
                        borderBottom: "1px solid #eee",
                    }}
                >
                    <div
                        style={{
                            fontSize: 14,
                            color: "#666",
                            marginBottom: 8,
                        }}
                    >
                        规格：{sku.attrText}
                        ｜价格： ¥ {sku.price}
                        ｜库存：{sku.totalStock || 0}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                        }}
                    >
                        {imgDom}
                    </div>
                </div>
            );
        }
        if (out.length === 0) {
            return (
                <div
                    style={{
                        color: "#999",
                        fontSize: 14,
                        padding: "20px 0",
                    }}
                >
                    暂无符合条件的商品规格
                </div>
            );
        }
        return out;
    };

    return (
        <div
            style={{
                backgroundColor: "#f5f5f5",
                paddingBottom: "80px",
            }}
        >
            {/* 商品基本信息 */}
            <div
                style={{
                    backgroundColor: "#ffffff",
                    padding: "16px",
                    marginBottom: 12,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "baseline",
                        }}
                    >
            <span
                style={{
                    color: "#ff7800",
                    fontSize: 20,
                }}
            >
              ¥
            </span>
                        <span
                            style={{
                                color: "#ff7800",
                                fontSize: 36,
                                fontWeight: "bold",
                                marginLeft: 2,
                            }}
                        >
              {showPrice}
            </span>
                    </div>
                    <div
                        style={{
                            fontSize: 16,
                            color: "#666666",
                        }}
                    >
                        可用库存：{availableStock}
                    </div>
                </div>

                <div
                    style={{
                        fontSize: 20,
                        fontWeight: 500,
                        color: "#222222",
                        marginTop: 12,
                        lineHeight: "1.45",
                    }}
                >
                    {productName}
                </div>

                <div
                    style={{
                        marginTop: 10,
                        fontSize: 13,
                        color: "#666666",
                    }}
                >
                    <div>分类：{categoryNames}</div>
                    <div
                        style={{
                            marginTop: 4,
                        }}
                    >
                        SPU编号：{spuNo}
                    </div>
                    <div
                        style={{
                            marginTop: 4,
                        }}
                    >
                        上架状态：{shelfStatus}
                    </div>
                </div>
            </div>

            {/* 规格信息 */}
            <div
                style={{
                    backgroundColor: "#ffffff",
                    padding: "16px",
                    marginBottom: 12,
                }}
            >
                <div
                    style={{
                        fontSize: 22,
                        fontWeight: "bold",
                        color: "#111111",
                        marginBottom: 14,
                    }}
                >
                    规格信息
                </div>

                {renderAttrDom()}

                {/* =========购买数量【修复后】========= */}
                <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 15, color: "#333", marginBottom: 10 }}>购买数量：</div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <button
                            onClick={(e) => {
                                const input = e.target.parentNode.querySelector('input');
                                let val = Number(input.value);

                                if (val <= 1) {
                                    this.utils.toast({
                                        title: "下单数量最少为1",
                                        type: "warning",
                                        duration: 1500
                                    });
                                    return;
                                }

                                input.value = val - 1;
                            }}
                            style={{
                                width: 36,
                                height: 36,
                                border: "1px solid #d9d9d9",
                                borderRight: "none",
                                borderRadius: "4px 0 0 4px",
                                background: "#ffffff",
                                fontSize: 16,
                                color: "#333",
                                cursor: "pointer",
                                outline: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 0
                            }}
                        >
                            -
                        </button>

                        <input
                            type="text"
                            defaultValue={1}
                            style={{
                                width: 62,
                                height: 36,
                                textAlign: "center",
                                border: "1px solid #d9d9d9",
                                fontSize: 15,
                                color: "#333",
                                outline: "none",
                                padding: 0,
                                margin: 0
                            }}
                            onBlur={(e) => {
                                let v = Number(e.target.value);

                                if (isNaN(v) || v < 1) {
                                    v = 1;
                                }

                                if (v > availableStock) {
                                    this.utils.toast({
                                        title: `当前可用库存只有${availableStock}个，不能多买`,
                                        type: "warning",
                                        duration: 1800
                                    });
                                    v = availableStock;
                                }

                                e.target.value = v;
                            }}
                        />

                        <button
                            onClick={(e) => {
                                const input = e.target.parentNode.querySelector('input');
                                let val = Number(input.value);

                                if (val >= availableStock) {
                                    this.utils.toast({
                                        title: `当前可用库存只有${availableStock}个，不能多买`,
                                        type: "warning",
                                        duration: 1800
                                    });
                                    return;
                                }

                                input.value = val + 1;
                            }}
                            style={{
                                width: 36,
                                height: 36,
                                border: "1px solid #d9d9d9",
                                borderLeft: "none",
                                borderRadius: "0 4px 4px 0",
                                background: "#ffffff",
                                fontSize: 16,
                                color: "#333",
                                cursor: "pointer",
                                outline: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 0
                            }}
                        >
                            +
                        </button>


                    </div>
                </div>
                {/* =========结束========= */}
            </div>

            {/* 商品详情 */}
            <div
                style={{
                    backgroundColor: "#ffffff",
                    padding: "16px",
                }}
            >
                <div
                    style={{
                        fontSize: 22,
                        fontWeight: "bold",
                        color: "#111111",
                        marginBottom: 14,
                    }}
                >
                    商品详情
                </div>
                {renderSkuResult()}
            </div>

            {/* 悬浮立即购买按钮 */}
            <div
                style={{
                    position: "fixed",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "transparent",
                    padding: "12px 16px",
                    boxShadow: "0 -2px 10px rgba(0,0,0,0.08)",
                    zIndex: 999,
                }}
            >
                <button
                    style={{
                        width: "100%",
                        height: "44px",
                        backgroundColor: "#ff7800",
                        color: "#fff",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "16px",
                        cursor: "pointer",
                    }}
                    onClick={(e) => {
                        // 读取输入框值
                        const container = e.target.closest('div[style*="position: fixed"]').previousElementSibling;
                        const inputDom = container.querySelector('input');
                        let buyNum = 1;
                        if (inputDom) {
                            let raw = Number(inputDom.value);
                            if (!isNaN(raw)) {
                                buyNum = raw;
                            }
                            if (buyNum < 1) buyNum = 1;
                            if (buyNum > availableStock) buyNum = availableStock;
                        }

                        console.log("=====点击立即购买=====");
                        console.log("product：", JSON.parse(JSON.stringify(this.state.product)));
                        console.log("选中规格selectedMap：", JSON.parse(JSON.stringify(this.state.product.selectedMap || {})));
                        console.log("购买数量buyNum：", buyNum);

                        const stateSnapshot = JSON.parse(JSON.stringify(this.state));
                        const product = stateSnapshot.product || {};
                        const { attrValueList, selectedMap, spec_id, spuNo, categoryIds, categoryNames, productName } = product;
                        const selectValues = Object.values(selectedMap);
                        let targetSku = null;
                        for (const sku of attrValueList) {
                            const arr = sku.attrText.split(" / ");
                            let allMatch = true;
                            for (const v of selectValues) {
                                if (!arr.includes(v)) {
                                    allMatch = false;
                                    break;
                                }
                            }
                            if (allMatch) {
                                targetSku = sku;
                                break;
                            }
                        }

                        if (!targetSku) {
                            console.error("未找到匹配SKU，请完整选择全部规格");
                            this.utils.toast({ title: "请完整选择全部规格", type: "warning" });
                            return;
                        }

                        const req = {
                            spec_id,
                            spuNo,
                            categoryIds,
                            categoryNames,
                            productName,
                            buyNum: buyNum,
                            ...targetSku,
                        };

                        console.log("最终请求req参数：", req);
                        this.utils.toast({
                            title: "请求参数" + JSON.stringify(req),
                            type: "success",
                            duration: 2000,
                        });
                    }}
                >
                    立即购买
                </button>
            </div>
        </div>
    );
}
