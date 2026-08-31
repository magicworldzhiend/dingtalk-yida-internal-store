/**
 * 尊敬的用户，你好：页面 JS 面板是高阶用法，一般不建议普通用户使用，如需使用，请确定你具备研发背景，能够自我排查问题。当然，你也可以咨询身边的技术顾问或者联系宜搭平台的技术支持获得服务（可能收费）。
 * 我们可以用 JS 面板来开发一些定制度高功能，比如：调用阿里云接口用来做图像识别、上报用户使用数据（如加载完成打点）等等。
 * 你可以点击面板上方的 「使用帮助」了解。
 */

const SKU_IMAGE_FIELD_ID = 'imageField_mt2mwxv8';
const SKU_IMAGE_MAX_DIMENSION = 1280;
const IMAGE_COMPRESS_QUALITY = 0.8;
const COMPRESSOR_SCRIPT_URL = 'https://g.alicdn.com/code/lib/compressorjs/1.1.1/compressor.min.js';
const SKU_IMAGE_AUTO_UPLOAD_RETRY_LIMIT = 40;

// 当页面渲染完毕后马上调用下面的函数，这个函数是在当前页面 - 设置 - 生命周期 - 页面加载完成时中被关联的。
export function didMount() {
    console.log(`「页面 JS」：当前页面地址 ${location.href}`);
    // console.log(`「页面 JS」：当前页面 id 参数为 ${this.state.urlParams.id}`);
    // 更多 this 相关 API 请参考：https://www.yuque.com/yida/support/ocmxyv#OCEXd
    // document.title = window.loginUser.userName + ' | 宜搭';

    this.loadSpecAndFill();
    this.utils.loadScript(COMPRESSOR_SCRIPT_URL);
    this.disableSkuImageAutoUpload();
}


export function loadSpecAndFill() {
    var self = this;
    var urlParams = self.state.urlParams;
    var goodsId = urlParams && urlParams.goodsId;

    if (!goodsId) {
        console.log('缺少 goodsId 参数，跳过加载');
        return;
    }

    // 辅助函数：从 formData 获取子表单数组（若存在）
    function getSubformFromFormData(record, fieldId) {
        // if (record.formData && Array.isArray(record.formData[fieldId])) {
        //   return record.formData[fieldId];
        // }
        // return null;
        if (!record.formData || !Array.isArray(record.formData[fieldId])) {
            return null;
        }

        return record.formData[fieldId].map(function (row) {
            var newRow = {};

            Object.keys(row).forEach(function (key) {
                var value = row[key];

                // 图片字段如果是字符串，转成数组对象
                if (
                    key.indexOf('imageField_') === 0 &&
                    typeof value === 'string'
                ) {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        console.log('图片字段解析失败：', key, value);
                    }
                }

                newRow[key] = value;
            });

            return newRow;
        });
    }

    // 辅助函数：从 instValue 解析子表单数据，返回对象数组（键为内部字段 ID）
    function getSubformFromInstValue(record, fieldId) {
        let instValueArr;
        try {
            instValueArr = typeof record.instValue === 'string'
                ? JSON.parse(record.instValue)
                : record.instValue;
        } catch (e) {
            console.error('解析 instValue 失败', e);
            return [];
        }

        if (!Array.isArray(instValueArr)) {
            return [];
        }

        const tableField = instValueArr.find(item => item.fieldId === fieldId);
        if (!tableField || !tableField.fieldData || !tableField.fieldData.value) {
            return [];
        }

        return tableField.fieldData.value.map(row => {
            const rowObj = {};
            row.forEach(cell => {
                rowObj[cell.fieldId] = cell.fieldData ? cell.fieldData.value : undefined;
            });
            return rowObj;
        });
    }

    // 主流程：加载数据源
    self.dataSourceMap['getSpecByGoodsId'].load({
        formUuid: 'FORM-016AA49B5DF5456ABF9C5A9BE4D5F090AKKK',
        pageSize: 100,
        pageNumber: 1,
        searchField: JSON.stringify([{
            field: 'textField_mt17nqjb',
            operator: 'eq',
            value: [goodsId]
        }])
    }).then(function (res) {
        var list = res && res.data ? res.data : [];
        console.log(list.length,"list.length")
        if (!list || list.length === 0) {
            console.log('暂无规格记录');
            return;
        }

        // 根据 goodsId 精确匹配记录，避免取到其他商品的数据
        var targetRecord = null;
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var recordGoodsId = item.formData && item.formData.textField_mt17nqjb;
            // 兼容字符串与数字比较
            if (recordGoodsId !== undefined && String(recordGoodsId) === String(goodsId)) {
                targetRecord = item;
                break;
            }
        }

        if (!targetRecord) {
            console.log('未找到 goodsId 为 ' + goodsId + ' 的规格记录，不进行回填');
            return;
        }

        var record = targetRecord;
        console.log('匹配到的记录：', record);

        // ===== 1. 回显主表单普通字段 / SPU_ID / 商品名称等 =====
        // 假设 SPU_ID 的组件唯一标识是 textField_xxxx，商品名称是 textField_yyyy
        // 如果存在 formData 中：
        if (record.formData) {
            // 示例：回显 SPU_ID (根据你的实际组件id修改)
            if (record.formData.serialNumberField_mt0u1j9w) {
                self.$('serialNumberField_mt0u1j9w').setValue(record.formData.serialNumberField_mt0u1j9w);
            }

        }


        // ===== 回填商品属性配置表子表单 =====
        var attrData = getSubformFromFormData(record, 'tableField_msymrpxf')
            || getSubformFromInstValue(record, 'tableField_msymrpxf');

        if (attrData && attrData.length > 0) {
            console.log('回填商品属性配置表数据：', attrData);
            self.$('tableField_msymrpxf').setValue(attrData);
        } else {
            console.warn('未找到商品属性配置表数据');
        }

        // ===== 回填规格值子表单 =====
        var specData = getSubformFromFormData(record, 'tableField_msygk2pq')
            || getSubformFromInstValue(record, 'tableField_msygk2pq');

        if (specData && specData.length > 0) {
            console.log('回填规格值子表单数据：', specData);
            self.$('tableField_msygk2pq').setValue(specData);
            self.disableSkuImageAutoUpload();
        } else {
            console.warn('未找到规格值子表单数据');
        }

        // 验证回填结果（可选）
        console.log('商品属性配置表当前值：', self.$('tableField_msymrpxf').getValue());
        console.log('规格值子表单当前值：', self.$('tableField_msygk2pq').getValue());
    }).catch(function (err) {
        console.error('查询失败:', err);
    });
}

/**
 * 等待子表单图片字段渲染完成后关闭自动上传，避免原图先于压缩流程上传。
 */
export function disableSkuImageAutoUpload() {
    var page = this;
    var retryCount = 0;

    if (page.skuImageAutoUploadTimer) {
        window.clearTimeout(page.skuImageAutoUploadTimer);
        page.skuImageAutoUploadTimer = null;
    }

    function disableAutoUpload() {
        var imageField = page.$(SKU_IMAGE_FIELD_ID);

        if (imageField && typeof imageField.set === 'function') {
            imageField.set('autoUpload', false);
            page.skuImageAutoUploadTimer = null;
            return;
        }

        if (retryCount >= SKU_IMAGE_AUTO_UPLOAD_RETRY_LIMIT) {
            page.skuImageAutoUploadTimer = null;
            console.warn('未找到 SKU 图片字段，未能关闭自动上传。');
            return;
        }

        retryCount += 1;
        page.skuImageAutoUploadTimer = window.setTimeout(disableAutoUpload, 250);
    }

    disableAutoUpload();
}

/**
 * 处理 SKU 图片“选择文件”事件，压缩完成后才上传至宜搭。
 *
 * @param {Array} files 图片上传组件传入的待上传文件列表
 */
export function onSelectSkuImage(files) {
    this.disableSkuImageAutoUpload();

    if (!window.Compressor) {
        this.utils.toast({
            title: '图片压缩组件仍在加载，请稍后重试。',
            type: 'warning',
        });
        return;
    }

    this.compressAndUploadSkuImages(files);
}

/**
 * 将 SKU 图片压缩为 JPEG，并通过宜搭图片组件上传压缩结果。
 *
 * @param {Array} files 图片上传组件传入的待上传文件列表
 */
export function compressAndUploadSkuImages(files) {
    var page = this;
    var imageField = page.$(SKU_IMAGE_FIELD_ID);
    var fileList = Array.isArray(files) ? files : [];

    if (!imageField) {
        page.utils.toast({
            title: 'SKU 图片组件未就绪，请刷新表单后重试。',
            type: 'error',
        });
        return;
    }

    if (!fileList.length) {
        return;
    }

    var componentType = imageField.get('type');
    var isMobile = page.utils.isMobile();

    fileList.forEach(function (fileItem) {
        var originalFile = fileItem && fileItem.originFileObj;

        if (!originalFile) {
            page.utils.toast({
                title: '未读取到本地图片文件，请重新选择图片。',
                type: 'error',
            });
            return;
        }

        new window.Compressor(originalFile, {
            quality: IMAGE_COMPRESS_QUALITY,
            maxWidth: SKU_IMAGE_MAX_DIMENSION,
            maxHeight: SKU_IMAGE_MAX_DIMENSION,
            mimeType: 'image/jpeg',
            success: function (compressedFile) {
                var compressedFileName = page.buildCompressedSkuImageName();
                var compressedImageFile = compressedFile;
                var uploaderRef = componentType === 'drag'
                    ? imageField.uploaderRef.uploaderRef
                    : (isMobile
                        ? imageField.uploaderRef.uploaderRef
                        : imageField.uploaderRef);

                if (!uploaderRef || !uploaderRef.uploaderRef) {
                    page.utils.toast({
                        title: '图片上传组件未就绪，请刷新表单后重试。',
                        type: 'error',
                    });
                    return;
                }

                // Compressor.js 的返回文件名可能是只读属性，因此重新构造 File，
                // 确保上传器接收的是压缩后的 JPEG 字节，而不仅是更新展示名称。
                if (typeof window.File === 'function') {
                    compressedImageFile = new window.File(
                        [compressedFile],
                        compressedFileName,
                        {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        }
                    );
                } else {
                    compressedImageFile.lastModifiedDate = new Date();
                    compressedImageFile.name = compressedFileName;
                }

                compressedImageFile.uid = fileItem.uid;
                fileItem.originFileObj = compressedImageFile;

                if (uploaderRef.state && Array.isArray(uploaderRef.state.value)) {
                    uploaderRef.state.value.forEach(function (currentFile) {
                        if (currentFile && currentFile.uid === compressedImageFile.uid) {
                            currentFile.size = compressedImageFile.size;
                            currentFile.name = compressedImageFile.name;
                            currentFile.originFileObj = compressedImageFile;
                            currentFile.file = compressedImageFile;
                        }
                    });
                }

                uploaderRef.uploaderRef.startUpload([compressedImageFile]);
            },
            error: function (error) {
                page.utils.toast({
                    title: '图片压缩失败：' + (error.message || '未知错误'),
                    type: 'error',
                });
            },
        });
    });
}

/**
 * 处理 SKU 图片“上传成功”事件，将运行时对象标准化为宜搭图片字段对象。
 */
export function onSkuImageUploadSuccess() {
    var imageField = this.$(SKU_IMAGE_FIELD_ID);
    var imageList = imageField && typeof imageField.getValue === 'function'
        ? imageField.getValue()
        : [];
    var uploadedImageList = Array.isArray(imageList) ? imageList : [];
    var normalizedImageList = uploadedImageList.map(this.normalizeSkuImage);

    if (!imageField || !normalizedImageList.length) {
        this.utils.toast({
            title: 'SKU 图片上传数据不完整，请删除后重新上传。',
            type: 'error',
        });
        return;
    }

    // 多图并发上传时，任一图片未返回完整数据前不回写，避免覆盖待上传图片。
    if (normalizedImageList.some(function (image) {
        return !image.previewUrl || !image.downloadUrl || !image.fileUuid;
    })) {
        return;
    }

    imageField.setValue(normalizedImageList, {
        triggerChange: false,
    });
}

/**
 * 将单个运行时上传对象转换为宜搭标准图片字段对象。
 *
 * @param {Object} file 图片上传组件返回的文件对象
 * @returns {Object} 标准图片字段对象
 */
export function normalizeSkuImage(file) {
    var imageFile = file || {};
    var response = imageFile.response || {};
    var originFile = imageFile.originFileObj || {};
    var downloadUrl = imageFile.downloadUrl
        || imageFile.downloadURL
        || response.downloadURL
        || originFile.downloadURL
        || imageFile.url
        || response.url
        || originFile.url
        || '';
    var previewUrl = imageFile.previewUrl
        || imageFile.imgURL
        || response.imgURL
        || originFile.imgURL
        || downloadUrl;

    return {
        previewUrl: previewUrl,
        size: Number(imageFile.size || 0),
        name: imageFile.name || '',
        downloadUrl: downloadUrl,
        fileUuid: imageFile.fileUuid || response.key || originFile.key || '',
        url: imageFile.url || response.url || originFile.url || downloadUrl,
    };
}

/**
 * 生成不包含原始文件名的 SKU 图片 JPEG 文件名。
 *
 * @returns {String} JPEG 文件名
 */
export function buildCompressedSkuImageName() {
    var randomBytes = new Uint32Array(1);
    var randomValue = '';

    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(randomBytes);
        randomValue = randomBytes[0].toString(36);
    } else {
        randomValue = Math.random().toString(36).slice(2, 10);
    }

    return 'sku-'
        + Date.now().toString(36)
        + '-'
        + randomValue.slice(0, 8)
        + '.jpg';
}

/**
 * TableField onChange
 */
// export function onChange({ value, extra }){
//   // ========== 全部替换成你自己的真实字段ID ==========
//   const ATTR_TABLE_ID = 'tableField_msymrpxf';          // 整个属性配置子表单ID
//   const ATTR_NAME_FIELD = 'textField_msymrpxg';    // 属性表中“属性名”列的ID
//   const ATTR_VALUE_FIELD = 'textareaField_msymrpxh';  // 属性表中“属性值”列的ID

//   const SKU_TABLE_ID = 'tableField_msygk2pq';          // 整个规格值子表单ID
//   const SKU_SPEC_COL = 'textField_msygk2pr';      // 规格表中“属性值”列的ID
//   const SKU_PRICE_COL = 'numberField_msymrpxb';       // 规格表中“单价”列的ID
//   const SKU_STOCK_COL = 'numberField_msymrpxc';       // 规格表中“当前可用库存”列的ID
//   const SKU_ID_COL = 'textField_mt9jn5sc';
//   const SPLIT_CHAR = '，'; // 属性值用中文逗号分隔

//   // ========== 1. 读取属性配置表数据 ==========
//   const attrRows = this.$(ATTR_TABLE_ID).getValue() || [];
//   // 过滤掉空行
//   const validAttrs = attrRows.filter(row =>
//     row[ATTR_NAME_FIELD] && row[ATTR_NAME_FIELD].trim() && row[ATTR_VALUE_FIELD] && row[ATTR_VALUE_FIELD].trim()
//   );

//   // 调试用：按F12打开控制台可看到读到的数据
//   console.log('读到的属性配置：', validAttrs);

//   if (validAttrs.length === 0) {
//     this.$(SKU_TABLE_ID).setValue([]);
//     return;
//   }

//   // ========== 2. 解析属性值，计算笛卡尔积 ==========
//   const valueGroups = validAttrs.map(row => {
//     return row[ATTR_VALUE_FIELD]
//       .split(/[，,]/)              // 同时识别中文逗号、英文逗号
//       .map(v => v.replace(/\s+/g, '')) // 去除所有空格
//       .filter(v => v);
//   });

//   // 笛卡尔积计算：生成所有属性值的组合
//   function cartesianProduct(arrays) {
//     return arrays.reduce((acc, curr) => {
//       const res = [];
//       acc.forEach(a => {
//         curr.forEach(b => {
//           res.push([...a, b]);
//         });
//       });
//       return res;
//     }, [[]]);
//   }

//   const allCombinations = cartesianProduct(valueGroups);

//   // // ========== 3. 把组合写入规格子表单 ==========
//   // const skuTable = this.$(SKU_TABLE_ID);
//   // skuTable.setValue([]); // 先清空原有行

//   // // 构建新行数据
//   // const newRows = allCombinations.map(combo => {
//   //   // 多个属性值拼成字符串显示，比如 绿色 / XL
//   //   const specText = combo.join(' / ');
//   //   return {
//   //     [SKU_SPEC_COL]: specText,
//   //     [SKU_PRICE_COL]: 0,
//   //     [SKU_STOCK_COL]: 0
//   //   };
//   // });

//   // skuTable.setValue(newRows);
//   // ========== 3. 把组合写入规格子表单 ==========
//   const skuTable = this.$(SKU_TABLE_ID);

//   // 先读取当前已有的规格数据
//   const oldRows = skuTable.getValue() || [];

//   // 建立旧数据映射
//   const oldRowMap = {};

//   oldRows.forEach(row => {
//     const specText = row[SKU_SPEC_COL];

//     if (specText) {
//       oldRowMap[specText] = row;
//     }
//   });

//   // 根据新的笛卡尔积生成规格
//   const newRows = allCombinations.map(combo => {

//     const specText = combo.join(' / ');

//     // 如果这个规格以前已经存在，就保留原来的整行数据
//     if (oldRowMap[specText]) {
//       return oldRowMap[specText];
//     }

//     // 如果是新增加的规格，才创建新行
//     return {
//       [SKU_SPEC_COL]: specText,
//       [SKU_PRICE_COL]: 0,
//       [SKU_STOCK_COL]: 0
//     };
//   });

//   // 回填规格数据
//   skuTable.setValue(newRows);

// } 

// export function beforeSubmit({ formDataMap }) {
//   console.log('beforeSubmit', formDataMap);
//   const FORM_UUID = 'FORM-016AA49B5DF5456ABF9C5A9BE4D5F090AKKK';
//   const GOODS_FIELD_ID = 'textField_mt17nqjb';
//   const SERIAL_FIELD_ID = 'serialNumberField_mt0u1j9w';
//   const goodsId = formDataMap[GOODS_FIELD_ID] && formDataMap[GOODS_FIELD_ID].fieldData ? formDataMap[GOODS_FIELD_ID].fieldData.value : '';
//   console.log('当前提交商品ID:', goodsId);
//   if (!goodsId) {
//     this.utils.toast('请在商品列表中对对应商品完善规格信息');
//     return false;
//   }
//   return new Promise((resolve) => {
//     let needUpdate = false;
//     const searchParams = {
//       formUuid: FORM_UUID,
//       pageSize: 100,
//       pageNumber: 1,
//       searchFieldList: [
//         {
//           fieldId: GOODS_FIELD_ID,
//           value: goodsId
//         }
//       ]
//     };
//     console.log('查询参数:', JSON.stringify(searchParams));
//     this.dataSourceMap.searchByGoodsId.load(searchParams)
//       .then(function (res) {
//         const dataList = (res && res.data) || [];
//         console.log('查询结果:', dataList);
//         if (dataList.length > 0) {
//           const existRecord = dataList[0];
//           const recordGoodsId = existRecord.formData ? existRecord.formData[GOODS_FIELD_ID] : '';
//           console.log('数据库商品ID:', recordGoodsId);
//           if (String(goodsId) === String(recordGoodsId)) {
//             console.log('发现相同商品ID，执行更新');
//             needUpdate = true;
//             const updateData = {};
//             Object.keys(formDataMap).forEach(function (key) {
//               if (key === SERIAL_FIELD_ID) {
//                 return;
//               }
//               const field = formDataMap[key];
//               if (!field) {
//                 return;
//               }
//               if (field.componentName === 'TableField') {
//                 const rows = field.fieldData && field.fieldData.value ? field.fieldData.value : [];
//                 updateData[key] = rows.map(function (row) {
//                   const rowData = {};
//                   row.forEach(function (cell) {
//                     if (cell.fieldData && cell.fieldData.value !== undefined && cell.fieldData.value !== null) {
//                       rowData[cell.fieldId] = cell.fieldData.value;
//                     }
//                   });
//                   return rowData;
//                 });
//               } else {
//                 if (field.fieldData && field.fieldData.value !== undefined && field.fieldData.value !== null) {
//                   updateData[key] = field.fieldData.value;
//                 }
//               }
//             });
//             console.log('更新数据:', updateData);
//             const updateParams = {
//               formUuid: FORM_UUID,
//               formInstId: existRecord.formInstId,
//               updateFormDataJson: JSON.stringify(updateData)
//             };
//             console.log('更新参数:', updateParams);
//             return this.dataSourceMap.updateSpecRecord.load(updateParams);
//           }
//         }
//         return null;
//       }.bind(this))
//       .then(function (updateRes) {
//         console.log('更新接口返回:', updateRes);
//         if (needUpdate) {
//           this.utils.toast('商品ID已存在，数据已更新');
//           resolve(false);
//         } else {
//           this.utils.toast('未发现相同商品ID，允许新增');
//           resolve(true);
//         }
//       }.bind(this))
//       .catch(function (err) {
//         console.error('提交异常:', err);
//         this.utils.toast('提交校验失败');
//         resolve(false);
//       });
//   });
// }

// export function beforeSubmit({ formDataMap }) {
//   // 注意：目前不支持在这里修改提交数据

//   console.log('beforeSubmit', formDataMap);

//   // 需要时可返回 false 阻止提交，支持 Promise
//   //return false;
//   // 1. 【请替换】获取当前表单的 UUID
//   const FORM_UUID = 'FORM-016AA49B5DF5456ABF9C5A9BE4D5F090AKKK';

//   // 2. 【请替换】获取商品 ID 字段的唯一标识
//   const GOODS_FIELD_ID = 'textField_mt17nqjb';

//   const goodsId = formDataMap[GOODS_FIELD_ID];
//   if (!goodsId) {
//     return true;
//   }

//   return new Promise((resolve) => {
//     const searchParams = {
//       formUuid: FORM_UUID,
//       pageSize: 100,
//       pageNumber: 1,
//       searchFieldList: [
//         { fieldId: GOODS_FIELD_ID, value: goodsId }
//       ]
//     };

//     this.dataSourceMap.searchByGoodsId.load(searchParams)
//       .then(function (res) {
//         // 【关键修改 1】去掉？. ，使用传统 && 判空
//         var dataList = (res && res.data) || [];
//         console.log(dataList, 'dataList')
//         if (dataList.length > 0) {
//           var existRecord = dataList[0];
//           console.log(existRecord, "existRecord")
//           var updateParams = {
//             formUuid: FORM_UUID,
//             formInstId: existRecord.formInstId,
//             updateFormDataJson: JSON.stringify(formDataMap)
//           };

//           return this.dataSourceMap.updateSpecRecord.load(updateParams);
//         } else {
//           return null;
//         }
//       }.bind(this)) // 注意这里的 bind (this)，确保 this 指向正确
//       .then(function (updateRes) {
//         if (updateRes) {
//           // 【关键修改 2】检查更新是否真的成功（防止后台返回错误但依然走了更新分支）
//           var isSuccess = updateRes && (updateRes.success === true || updateRes.code === '0');
//           if (isSuccess) {
//             this.utils.toast(' 该商品 ID 已存在，已自动更新数据 ');
//           } else {
//             this.utils.toast(' 更新失败，请稍后重试 ');
//           }
//           resolve(false); // 无论更新成功与否，都阻止新建（因为数据已存在）
//         } else {
//           this.utils.toast(' 没查到数据，放行新增 ');
//           resolve(true); // 没查到数据，放行新增
//         }
//       }.bind(this))
//       .catch(function (err) {
//         console.error(' 校验异常:', err);
//         // 接口报错时放行提交，避免用户卡死
//         resolve(true);
//       });
//   });
// }

/**
 * 商品属性配置表 TableField onChange
 */
export function onChange({ value, extra }) {
    // =====================================================
    // 1. 字段 ID
    // =====================================================
    const ATTR_TABLE_ID = 'tableField_msymrpxf';
    const ATTR_NAME_FIELD = 'textField_msymrpxg';
    const ATTR_VALUE_FIELD = 'textareaField_msymrpxh';

    const SKU_TABLE_ID = 'tableField_msygk2pq';
    const SKU_SPEC_COL = 'textField_msygk2pr';
    const SKU_PRICE_COL = 'numberField_msymrpxb';
    const SKU_STOCK_COL = 'numberField_msymrpxc';
    const SKU_ID_COL = 'textField_mt9jn5sc';

    // =====================================================
    // 2. 读取属性配置
    // =====================================================
    const attrRows = this.$(ATTR_TABLE_ID).getValue() || [];

    const validAttrs = attrRows.filter(row => {
        const name = row[ATTR_NAME_FIELD];
        const value = row[ATTR_VALUE_FIELD];

        return (
            name &&
            String(name).trim() &&
            value &&
            String(value).trim()
        );
    });

    console.log(
        '当前属性配置：',
        JSON.parse(JSON.stringify(validAttrs))
    );

    // =====================================================
    // 3. 读取原来的 SKU 表
    // =====================================================
    const skuTable = this.$(SKU_TABLE_ID);
    const oldRows = skuTable.getValue() || [];

    console.log(
        '原 SKU 数据：',
        JSON.parse(JSON.stringify(oldRows))
    );

    // =====================================================
    // 4. 记录所有已经存在的 SKU_ID
    //    防止新生成的14位数字重复
    // =====================================================
    const usedSkuIds = new Set();

    oldRows.forEach(row => {
        const skuId = row[SKU_ID_COL];

        if (skuId !== undefined && skuId !== null && String(skuId).trim()) {
            usedSkuIds.add(String(skuId).trim());
        }
    });

    // =====================================================
    // 5. 根据时间戳生成14位不重复纯数字 SKU_ID
    // =====================================================
    let lastTimestamp = 0;
    let sequence = 0;

    function createSkuId() {
        let timestamp = Date.now();

        if (timestamp > lastTimestamp) {
            lastTimestamp = timestamp;
            sequence = 0;
        } else {
            sequence++;

            // 同一毫秒最多使用0~9共10个序号
            // 超过后逻辑时间戳自动+1
            if (sequence > 9) {
                lastTimestamp++;
                sequence = 0;
            }

            timestamp = lastTimestamp;
        }

        let skuId = String(lastTimestamp) + String(sequence);

        // 极端情况下如果与已有 SKU_ID 重复，则继续递增
        while (usedSkuIds.has(skuId)) {
            sequence++;

            if (sequence > 9) {
                lastTimestamp++;
                sequence = 0;
            }

            skuId = String(lastTimestamp) + String(sequence);
        }

        usedSkuIds.add(skuId);

        return skuId;
    }

    // =====================================================
    // 6. 如果属性全部删除
    // =====================================================
    if (validAttrs.length === 0) {
        skuTable.setValue([]);
        return;
    }

    // =====================================================
    // 7. 解析新的属性值
    // =====================================================
    const newValueGroups = validAttrs.map(row => {
        return String(row[ATTR_VALUE_FIELD])
            .split(/[，,]/)
            .map(v => v.replace(/\s+/g, ''))
            .filter(Boolean);
    });

    // =====================================================
    // 8. 笛卡尔积
    // =====================================================
    function cartesianProduct(arrays) {
        return arrays.reduce((acc, curr) => {
            const result = [];

            acc.forEach(a => {
                curr.forEach(b => {
                    result.push([...a, b]);
                });
            });

            return result;
        }, [[]]);
    }

    const newCombinations = cartesianProduct(newValueGroups);

    // =====================================================
    // 9. 建立旧 SKU 映射
    // =====================================================
    const oldRowMap = {};

    oldRows.forEach(row => {
        const spec = row[SKU_SPEC_COL];

        if (!spec) return;

        const key = String(spec)
            .split('/')
            .map(v => v.trim())
            .join(' / ');

        oldRowMap[key] = row;
    });

    // =====================================================
    // 10. 从旧 SKU 数据反推出旧属性值
    // =====================================================
    let oldDimensionCount = 0;

    if (oldRows.length > 0) {
        const firstSpec = oldRows[0][SKU_SPEC_COL];

        if (firstSpec) {
            oldDimensionCount = String(firstSpec)
                .split('/')
                .length;
        }
    }

    const oldValueGroups = Array.from(
        { length: oldDimensionCount },
        () => []
    );

    oldRows.forEach(row => {
        const spec = row[SKU_SPEC_COL];

        if (!spec) return;

        const parts = String(spec)
            .split('/')
            .map(v => v.trim());

        if (parts.length !== oldDimensionCount) return;

        parts.forEach((value, index) => {
            if (!oldValueGroups[index].includes(value)) {
                oldValueGroups[index].push(value);
            }
        });
    });

    console.log('旧属性值：', oldValueGroups);
    console.log('新属性值：', newValueGroups);

    // =====================================================
    // 11. 建立新属性值 -> 旧属性值映射
    //     用于识别属性值编辑
    // =====================================================
    const valueMaps = [];

    const commonDimensionCount = Math.min(
        oldValueGroups.length,
        newValueGroups.length
    );

    for (let i = 0; i < commonDimensionCount; i++) {
        const oldValues = oldValueGroups[i] || [];
        const newValues = newValueGroups[i] || [];
        const map = {};

        // 没修改的值直接对应自己
        newValues.forEach(newValue => {
            if (oldValues.includes(newValue)) {
                map[newValue] = newValue;
            }
        });

        // 找出旧数据中消失的值
        const removedValues = oldValues.filter(
            oldValue => !newValues.includes(oldValue)
        );

        // 找出新增加的值
        const addedValues = newValues.filter(
            newValue => !oldValues.includes(newValue)
        );

        // 消失数量和新增数量一致，视为属性值修改
        if (
            removedValues.length > 0 &&
            removedValues.length === addedValues.length
        ) {
            addedValues.forEach((newValue, index) => {
                map[newValue] = removedValues[index];
            });
        }

        valueMaps.push(map);
    }

    // =====================================================
    // 12. 防止一个旧 SKU 被继承多次
    // =====================================================
    const usedOldSku = new Set();

    // =====================================================
    // 13. 生成新的规格表
    // =====================================================
    const newRows = newCombinations.map(combo => {
        const newSpecText = combo.join(' / ');

        // -----------------------------------------------------
        // 情况 A：规格完全没变
        // 保留原来的整行数据，包括 SKU_ID
        // -----------------------------------------------------
        const exactOldRow = oldRowMap[newSpecText];

        if (exactOldRow) {
            usedOldSku.add(newSpecText);

            return {
                ...exactOldRow,
                [SKU_SPEC_COL]: newSpecText,
                [SKU_ID_COL]:
                    exactOldRow[SKU_ID_COL] || createSkuId()
            };
        }

        // -----------------------------------------------------
        // 情况 B：判断是否属于原规格属性值编辑
        // -----------------------------------------------------
        const oldCombo = [];
        let canFindOldCombo = true;

        for (let i = 0; i < commonDimensionCount; i++) {
            const newValue = combo[i];
            const map = valueMaps[i] || {};

            if (
                Object.prototype.hasOwnProperty.call(
                    map,
                    newValue
                )
            ) {
                oldCombo.push(map[newValue]);
            } else {
                canFindOldCombo = false;
                break;
            }
        }

        // -----------------------------------------------------
        // 如果新增了新的属性维度：
        // 第一个新增属性值继承原 SKU，
        // 其他组合视为真正新增 SKU
        // -----------------------------------------------------
        if (
            canFindOldCombo &&
            newValueGroups.length > oldValueGroups.length
        ) {
            for (
                let i = oldValueGroups.length;
                i < newValueGroups.length;
                i++
            ) {
                if (combo[i] !== newValueGroups[i][0]) {
                    canFindOldCombo = false;
                    break;
                }
            }
        }

        // -----------------------------------------------------
        // 找到属性编辑前的旧 SKU
        // SKU_ID 保持不变
        // -----------------------------------------------------
        if (
            canFindOldCombo &&
            oldCombo.length > 0
        ) {
            const oldSpecText = oldCombo.join(' / ');
            const oldRow = oldRowMap[oldSpecText];

            if (
                oldRow &&
                !usedOldSku.has(oldSpecText)
            ) {
                usedOldSku.add(oldSpecText);

                return {
                    ...oldRow,
                    [SKU_SPEC_COL]: newSpecText,
                    [SKU_ID_COL]:
                        oldRow[SKU_ID_COL] || createSkuId()
                };
            }
        }

        // -----------------------------------------------------
        // 情况 C：真正新增 SKU
        // 只有新增 SKU 才生成新的14位数字 ID
        // -----------------------------------------------------
        return {
            [SKU_SPEC_COL]: newSpecText,
            [SKU_PRICE_COL]: 0,
            [SKU_STOCK_COL]: 0,
            [SKU_ID_COL]: createSkuId()
        };
    });

    console.log(
        '即将写入 SKU：',
        JSON.parse(JSON.stringify(newRows))
    );

    // =====================================================
    // 14. 最终回填
    // =====================================================
    skuTable.setValue(newRows);
    this.disableSkuImageAutoUpload();
}



export function beforeSubmit({ formDataMap }) {
    console.log('beforeSubmit', formDataMap);
    const FORM_UUID = 'FORM-016AA49B5DF5456ABF9C5A9BE4D5F090AKKK';
    const GOODS_FIELD_ID = 'textField_mt17nqjb';
    const SERIAL_FIELD_ID = 'serialNumberField_mt0u1j9w';

    const goodsId = formDataMap[GOODS_FIELD_ID] && formDataMap[GOODS_FIELD_ID].fieldData ? formDataMap[GOODS_FIELD_ID].fieldData.value : '';
    console.log('当前提交商品ID:', goodsId);

    if (!goodsId) {
        this.utils.toast('请在商品列表中对对应商品完善规格信息');
        return false;
    }

    // 保存外层的 this 引用，避免 Promise 内部丢失
    const self = this;

    return new Promise((resolve) => {
        let needUpdate = false;

        // 【修改点 1】修改查询参数，使用与之前成功查询一致的 searchField 格式
        const searchParams = {
            formUuid: FORM_UUID,
            pageSize: 10, // 适当给大一点或保持1
            pageNumber: 1,
            searchField: JSON.stringify([{
                field: GOODS_FIELD_ID,
                operator: 'eq',
                value: [goodsId]
            }])
        };

        console.log('查询参数:', JSON.stringify(searchParams));

        self.dataSourceMap.searchByGoodsId.load(searchParams)
            .then(function (res) {
                const dataList = (res && res.data) || [];
                console.log('查询结果:', dataList);

                if (dataList.length > 0) {
                    // 遍历查找精准匹配的记录
                    let existRecord = null;
                    for (let i = 0; i < dataList.length; i++) {
                        const item = dataList[i];
                        const recordGoodsId = item.formData && item.formData[GOODS_FIELD_ID];
                        if (recordGoodsId !== undefined && String(recordGoodsId) === String(goodsId)) {
                            existRecord = item;
                            break;
                        }
                    }

                    if (existRecord) {
                        console.log('发现相同商品ID，执行更新', existRecord);
                        needUpdate = true;
                        const updateData = {};

                        Object.keys(formDataMap).forEach(function (key) {
                            if (key === SERIAL_FIELD_ID) {
                                return;
                            }
                            const field = formDataMap[key];
                            if (!field) {
                                return;
                            }
                            if (field.componentName === 'TableField') {
                                const rows = field.fieldData && field.fieldData.value ? field.fieldData.value : [];
                                updateData[key] = rows.map(function (row) {
                                    const rowData = {};
                                    row.forEach(function (cell) {
                                        if (cell.fieldData && cell.fieldData.value !== undefined && cell.fieldData.value !== null) {
                                            rowData[cell.fieldId] = cell.fieldData.value;
                                        }
                                    });
                                    return rowData;
                                });
                            } else {
                                if (field.fieldData && field.fieldData.value !== undefined && field.fieldData.value !== null) {
                                    updateData[key] = field.fieldData.value;
                                }
                            }
                        });

                        console.log('更新数据:', updateData);
                        const updateParams = {
                            formUuid: FORM_UUID,
                            formInstId: existRecord.formInstId,
                            updateFormDataJson: JSON.stringify(updateData)
                        };

                        console.log('更新参数:', updateParams);
                        // 使用 self 执行更新
                        return self.dataSourceMap.updateSpecRecord.load(updateParams);
                    }
                }
                return null;
            })
            .then(function (updateRes) {
                console.log('更新接口返回:', updateRes);
                if (needUpdate) {
                    self.utils.toast('商品ID已存在，数据已更新');
                    resolve(false); // 阻止默认的新增提交，因为已经手动调接口更新了
                } else {
                    self.utils.toast('未发现相同商品ID，允许新增');
                    resolve(true); // 允许正常新增
                }
            })
            .catch(function (err) {
                console.error('提交异常:', err);
                self.utils.toast('提交校验失败');
                resolve(false);
            });
    });
}
