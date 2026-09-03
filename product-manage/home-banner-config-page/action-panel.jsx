/**
 * 尊敬的用户，你好：页面 JS 面板是高阶用法，一般不建议普通用户使用，如需使用，请确定你具备研发背景，能够自我排查问题。当然，你也可以咨询身边的技术顾问或者联系宜搭平台的技术支持获得服务（可能收费）。
 * 我们可以用 JS 面板来开发一些定制度高功能，比如：调用阿里云接口用来做图像识别、上报用户使用数据（如加载完成打点）等等。
 * 你可以点击面板上方的 「使用帮助」了解。
 */

const BANNER_IMAGE_FIELD_ID = 'imageField_mt9t5mqv';
const BANNER_SPU_ID_FIELD_ID = 'textField_mtl0x4j7';
const BANNER_FORM_REMARK_FIELD_ID = 'textField_mtl49hth';
const BANNER_FORM_GRADIENT_COLOR_FIELD_ID = 'textField_mtl49htj';
const BANNER_REMARK_INPUT_ID = 'textField_mtl4dxuc';
const BANNER_GRADIENT_COLOR_INPUT_ID = 'textField_mtl4dxuh';
const DEFAULT_BANNER_GRADIENT_COLOR = '#182334';
const BANNER_GRADIENT_SAMPLE_START_RATIO = 2 / 3;
const BANNER_GRADIENT_COLOR_DARKEN_RATIO = 0.68;
const BANNER_IMAGE_MAX_DIMENSION = 1920;
const IMAGE_COMPRESS_QUALITY = 0.8;
const COMPRESSOR_SCRIPT_URL = 'https://g.alicdn.com/code/lib/compressorjs/1.1.1/compressor.min.js';

/** 根据持久化的 SPU 业务编号定位 Banner 编辑下拉框所需的表单实例。 */
function findSpuByBusinessId(spuList, spuId) {
    return (Array.isArray(spuList) ? spuList : []).find(function (item) {
        return String(item.spuId || '') === String(spuId || '');
    }) || null;
}

/** 将管理员输入的十六进制颜色规范为 #RRGGBB；非法输入返回空字符串。 */
function normalizeBannerGradientColor(value) {
    var match = String(value || '').trim().match(/^#?([0-9a-fA-F]{6})$/);
    return match ? '#' + match[1].toUpperCase() : '';
}

/** 兼容读取宜搭不同组件实例的当前值。 */
function getComponentValue(component) {
    if (!component) {
        return undefined;
    }

    if (typeof component.get === 'function') {
        return component.get('value');
    }

    return typeof component.getValue === 'function'
        ? component.getValue()
        : undefined;
}

/** 将 RGB 色值转换为可持久化的 #RRGGBB 格式。 */
function toHexColor(red, green, blue) {
    var toHex = function (value) {
        return Math.max(0, Math.min(255, Math.round(value)))
            .toString(16)
            .padStart(2, '0');
    };

    return '#' + toHex(red) + toHex(green) + toHex(blue);
}

// 当页面渲染完毕后马上调用下面的函数，这个函数是在当前页面 - 设置 - 生命周期 - 页面加载完成时中被关联的。
export function didMount() {
    console.log(`「页面 JS」：当前页面地址 ${location.href}`);
    this.loadSpuList();
    this.utils.loadScript(COMPRESSOR_SCRIPT_URL);
    // console.log(`「页面 JS」：当前页面 id 参数为 ${this.state.urlParams.id}`);
    // 更多 this 相关 API 请参考：https://www.yuque.com/yida/support/ocmxyv#OCEXd
    // document.title = window.loginUser.userName + ' | 宜搭';
}

// 渲染图片格式，比例均：3:2
export function renderBannerImage(value) {
    if (!value) {
        return <span style={{ color: '#999' }}>暂无图片</span>;
    }

    var isMobile = window.innerWidth <= 768;
    var width = isMobile ? '120px' : '180px';
    var height = isMobile ? '80px' : '120px';

    return (
        <img
            src={value}
            style={{
                display: 'block',
                width: width,
                height: height,
                objectFit: 'cover',
                objectPosition: 'center',
                borderRadius: '4px'
            }}
        />
    );
}

/**
 * 重新加载自动数据源，刷新轮播配置列表。
 */
export function onRefreshBannerList() {
    this.reloadDataSource();
}

/**
 * 按商品名称加载轮播配置列表。
 *
 * @param {Object} params 表格分页与搜索参数
 */
export function onFetchBannerList(params) {
    var searchKey = (params.searchKey || '').trim();
    var currentPage = params.from === 'search'
        ? 1
        : (params.currentPage || 1);

    this.setState({
        searchKey: searchKey
    });

    this.dataSourceMap.getBannerList.load({
        formUuid: 'FORM-FSD66281M0N88KURKUU4B7EQZ3GA2HPVHZ7TM1',
        currentPage: currentPage,
        pageSize: 20,
        searchFieldJson: searchKey
            ? JSON.stringify({
                textField_mt806lzd: searchKey
            })
            : ''
    });
}

/**
 * 渲染轮播启用状态，并支持管理员快捷切换。
 *
 * @param {String} value 当前状态
 * @param {Number} index 行索引
 * @param {Object} rowData 当前行数据
 * @returns {React.ReactNode} 启用状态开关
 */
export function renderBannerEnabled(value, index, rowData) {
    var page = this;
    var enabled = value === '启用';
    var isMobile = window.innerWidth <= 768;
    var width = isMobile ? '48px' : '52px';
    var height = isMobile ? '26px' : '28px';

    return (
        <div
            title={enabled ? '当前已启用，点击禁用' : '当前已禁用，点击启用'}
            onClick={() => {
                var nextValue = enabled ? '禁用' : '启用';

                page.dataSourceMap.updateBannerEnabled.load({
                    formInstId: rowData.formInstId,
                    updateFormDataJson: JSON.stringify({
                        radiofield_9aVrQD8v: nextValue
                    }),
                    useLatestVersion: 'y'
                }).then(() => {
                    page.utils.toast({
                        title: nextValue === '启用' ? '已启用' : '已禁用',
                        type: 'success'
                    });

                    var searchKey = (page.state.searchKey || '').trim();
                    page.dataSourceMap.getBannerList.load({
                        formUuid: 'FORM-FSD66281M0N88KURKUU4B7EQZ3GA2HPVHZ7TM1',
                        currentPage: 1,
                        pageSize: 20,
                        searchFieldJson: searchKey
                            ? JSON.stringify({
                                textField_mt806lzd: searchKey
                            })
                            : ''
                    });
                }).catch((error) => {
                    page.utils.toast({
                        title: error.message || '状态更新失败',
                        type: 'error'
                    });
                });
            }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: width,
                height: height,
                padding: '2px',
                boxSizing: 'border-box',
                borderRadius: height,
                cursor: 'pointer',
                backgroundColor: enabled ? '#1677ff' : '#bfbfbf',
                transition: 'background-color 0.2s'
            }}
        >
      <span
          style={{
              width: isMobile ? '22px' : '24px',
              height: isMobile ? '22px' : '24px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              transform: enabled
                  ? (isMobile ? 'translateX(22px)' : 'translateX(24px)')
                  : 'translateX(0)',
              transition: 'transform 0.2s'
          }}
      />
        </div>
    );
}


/**
 * 打开删除确认对话框。
 *
 * @param {Object} rowData 当前行数据
 */
export function onDeleteBanner(rowData) {
    var productName = rowData.productName || '该轮播配置';

    this.setState({
        deletingBanner: rowData
    });

    this.$('dialog_mt9t5mqm').show();
}

/**
 * 确认后物理删除轮播配置。
 */
export function onConfirmDeleteBanner() {
    var page = this;
    var deletingBanner = page.state.deletingBanner;

    if (!deletingBanner || !deletingBanner.formInstId) {
        page.utils.toast({
            title: '未获取到待删除的轮播配置',
            type: 'error'
        });
        return;
    }

    page.$('dialog_mt9t5mqm').set('confirmState', 'LOADING');

    page.dataSourceMap.deleteBanner.load({
        formInstId: deletingBanner.formInstId
    }).then(() => {
        page.$('dialog_mt9t5mqm').set('confirmState', 'NORMAL');
        page.$('dialog_mt9t5mqm').hide();

        page.utils.toast({
            title: '删除成功',
            type: 'success'
        });

        page.setState({
            deletingBanner: null
        });

        var searchKey = (page.state.searchKey || '').trim();

        return page.dataSourceMap.getBannerList.load({
            formUuid: 'FORM-FSD66281M0N88KURKUU4B7EQZ3GA2HPVHZ7TM1',
            currentPage: 1,
            pageSize: 20,
            searchFieldJson: searchKey
                ? JSON.stringify({
                    textField_mt806lzd: searchKey
                })
                : ''
        });
    }).catch((error) => {
        page.$('dialog_mt9t5mqm').set('confirmState', 'NORMAL');

        page.utils.toast({
            title: error.message || '删除失败',
            type: 'error'
        });
    });
}


const SPU_FORM_UUID = 'FORM-173F54EE060A41AF99AA1A776B15917CP6H3';

/**
 * 页面加载时调用：加载 SPU 下拉选项。
 * 下拉显示：SPU_ID | 商品名称
 * 下拉值：SPU formInstId
 */
export async function loadSpuList() {
    try {
        const res = await this.utils.yida.searchFormDatas({
            formUuid: SPU_FORM_UUID,
            pageSize: 100,
        });

        const spuList = (res.data || []).map((item) => {
            const formData = item.formData || {};
            const spuId = formData.serialNumberField_mszwuoff || '';
            const productName = formData.textField_msq691fs || '';
            const images = formData.imageField_msq691ft
                ? JSON.parse(formData.imageField_msq691ft)
                : [];

            return {
                text: `${spuId} | ${productName}`,
                value: item.formInstId,
                spuId,
                productName,
                images,
            };
        });

        this.setState({ spuList });
    } catch (error) {
        this.utils.toast({
            title: `加载商品 SPU 失败：${error.message || '未知错误'}`,
            type: 'error',
        });
    }
}

/**
 * 表格“编辑”按钮事件。
 * rowData 必须是当前行的完整数据，且包含 formInstId、formData。
 */
export function onOpenEditBanner(rowData) {
    if (!rowData || !rowData.formInstId) {
        this.utils.toast({
            title: '未获取到轮播记录，请刷新列表后重试。',
            type: 'error',
        });
        return;
    }

    var bannerImages = [];

    try {
        bannerImages = rowData.bannerImageJson
            ? JSON.parse(rowData.bannerImageJson)
            : [];
    } catch (error) {
        this.utils.toast({
            title: '轮播图片数据解析失败。',
            type: 'error',
        });
        return;
    }

    var selectedSpu = findSpuByBusinessId(this.state.spuList, rowData.spuId);
    var selectedSpuFormInstId = selectedSpu ? selectedSpu.value : '';

    // 当前要更新的首页轮播记录实例 ID
    this.setState({
        bannerDialogMode: 'edit',
        editingBannerFormInstId: rowData.formInstId,
        editingSpuFormInstId: selectedSpuFormInstId,
        editingBannerImages: bannerImages,
        isEditingBannerImageChanged: false,
        bannerGradientColor: normalizeBannerGradientColor(rowData.gradientColor)
            || DEFAULT_BANNER_GRADIENT_COLOR,
    });

    this.$('dialog_mt9t5mqt').show(() => {
        var spuSelect = this.$('selectField_mt9t5mqx');
        var imageField = this.$('imageField_mt9t5mqv');
        var numberField = this.$('numberField_mt9t5mqw');
        var remarkField = this.$(BANNER_REMARK_INPUT_ID);
        var gradientColorField = this.$(BANNER_GRADIENT_COLOR_INPUT_ID);

        if (!spuSelect || !imageField || !numberField || !remarkField) {
            this.utils.toast({
                title: '编辑弹窗字段未找到，请确认打开的是编辑弹窗。',
                type: 'error',
            });
            return;
        }

        // Banner 图片必须先在浏览器压缩，再由组件上传压缩结果。
        imageField.set('autoUpload', false);

        // false：编辑回填时不触发 SPU 值变化，保留管理员此前自定义的轮播图。
        spuSelect.setValue(selectedSpuFormInstId, {
            triggerChange: false,
        });

        if (!selectedSpu) {
            this.utils.toast({
                title: '该 Banner 缺少有效 SPU_ID，请重新选择商品后保存。',
                type: 'warning',
            });
        }

        imageField.setValue(bannerImages, {
            triggerChange: false,
        });

        numberField.setValue(Number(rowData.sortValue || 0), {
            triggerChange: false,
        });

        remarkField.setValue(rowData.remark || '', {
            triggerChange: false,
        });
        if (gradientColorField) {
            gradientColorField.setValue(
                normalizeBannerGradientColor(rowData.gradientColor)
                    || DEFAULT_BANNER_GRADIENT_COLOR,
                { triggerChange: false }
            );
        }
    });
}

/**
 * 打开新增 Banner 对话框，并清空现有编辑值。
 * 确认按钮会根据 create 模式创建轮播配置记录。
 */
export function onOpenCreateBanner() {
    this.setState({
        bannerDialogMode: 'create',
        editingBannerFormInstId: '',
        editingSpuFormInstId: '',
        editingBannerImages: [],
        isEditingBannerImageChanged: false,
        bannerGradientColor: DEFAULT_BANNER_GRADIENT_COLOR,
    });

    this.$('dialog_mt9t5mqt').show(() => {
        var spuSelect = this.$('selectField_mt9t5mqx');
        var imageField = this.$('imageField_mt9t5mqv');
        var numberField = this.$('numberField_mt9t5mqw');
        var remarkField = this.$(BANNER_REMARK_INPUT_ID);
        var gradientColorField = this.$(BANNER_GRADIENT_COLOR_INPUT_ID);

        if (!spuSelect || !imageField || !numberField || !remarkField) {
            this.utils.toast({
                title: '新增弹窗字段未找到，请确认当前页面组件配置。',
                type: 'error',
            });
            return;
        }

        imageField.set('autoUpload', false);
        spuSelect.setValue('', { triggerChange: false });
        imageField.setValue([], { triggerChange: false });
        numberField.setValue(0, { triggerChange: false });
        remarkField.setValue('', { triggerChange: false });
        if (gradientColorField) {
            gradientColorField.setValue(DEFAULT_BANNER_GRADIENT_COLOR, {
                triggerChange: false,
            });
        }
    });
}

/**
 * 编辑弹窗中 SPU 下拉的“值变化”事件。
 */
export function onEditBannerSpuChange({ value }) {
    const selectedSpu = (this.state.spuList || []).find(
        (item) => item.value === value,
    );

    if (!selectedSpu) {
        this.$('imageField_mt9t5mqv').setValue([]);
        return;
    }

    // 自动回填 SPU 主图；用户仍可在上传组件中自行删除、替换。
    this.$('imageField_mt9t5mqv').setValue(selectedSpu.images || []);
    this.setState({
        editingBannerImages: selectedSpu.images || [],
        isEditingBannerImageChanged: true,
    });

    this.detectBannerGradientColor(selectedSpu.images && selectedSpu.images[0])
        .then((color) => this.applyBannerGradientColor(color))
        .catch(() => undefined);
}

/**
 * 从图片底部三分之一采样主色，返回适合文字叠加展示的深色十六进制值。
 * 本地 File 一定可采样；已上传的跨域签名 URL 受浏览器 CORS 限制，失败时由调用方保留当前颜色。
 *
 * @param {File|Blob|Object|String} imageSource 本地文件、图片对象或图片 URL
 * @returns {Promise<String>} 识别出的 #RRGGBB
 */
export function detectBannerGradientColor(imageSource) {
    return new Promise(function (resolve, reject) {
        var sourceUrl = '';
        var shouldRevokeUrl = false;

        if (imageSource instanceof Blob) {
            sourceUrl = URL.createObjectURL(imageSource);
            shouldRevokeUrl = true;
        } else if (typeof imageSource === 'string') {
            sourceUrl = imageSource;
        } else if (imageSource) {
            sourceUrl = imageSource.downloadUrl
                || imageSource.url
                || imageSource.previewUrl
                || '';
        }

        if (!sourceUrl) {
            reject(new Error('未找到可分析的图片地址'));
            return;
        }

        var image = new Image();
        if (!shouldRevokeUrl) {
            image.crossOrigin = 'anonymous';
        }

        image.onload = function () {
            try {
                var canvas = document.createElement('canvas');
                var originalWidth = image.naturalWidth || image.width;
                var originalHeight = image.naturalHeight || image.height;
                var width = Math.min(originalWidth, 320);
                var height = Math.max(1, Math.round(width * originalHeight / originalWidth));
                var context = canvas.getContext('2d', { willReadFrequently: true });
                canvas.width = width;
                canvas.height = height;
                context.drawImage(image, 0, 0, width, height);

                var sampleStartY = Math.floor(height * BANNER_GRADIENT_SAMPLE_START_RATIO);
                var imageData = context.getImageData(
                    0,
                    sampleStartY,
                    width,
                    Math.max(1, height - sampleStartY)
                ).data;
                var colorBuckets = {};

                for (var index = 0; index < imageData.length; index += 16) {
                    if (imageData[index + 3] < 128) {
                        continue;
                    }

                    var bucketKey = [
                        Math.floor(imageData[index] / 32),
                        Math.floor(imageData[index + 1] / 32),
                        Math.floor(imageData[index + 2] / 32),
                    ].join('-');
                    colorBuckets[bucketKey] = (colorBuckets[bucketKey] || 0) + 1;
                }

                var dominantBucket = Object.keys(colorBuckets).reduce(function (current, key) {
                    return !current || colorBuckets[key] > colorBuckets[current]
                        ? key
                        : current;
                }, '');

                if (!dominantBucket) {
                    throw new Error('未识别到有效图片颜色');
                }

                var colorParts = dominantBucket.split('-').map(Number);
                resolve(toHexColor(
                    (colorParts[0] * 32 + 16) * BANNER_GRADIENT_COLOR_DARKEN_RATIO,
                    (colorParts[1] * 32 + 16) * BANNER_GRADIENT_COLOR_DARKEN_RATIO,
                    (colorParts[2] * 32 + 16) * BANNER_GRADIENT_COLOR_DARKEN_RATIO
                ));
            } catch (error) {
                reject(error);
            } finally {
                if (shouldRevokeUrl) {
                    URL.revokeObjectURL(sourceUrl);
                }
            }
        };

        image.onerror = function () {
            if (shouldRevokeUrl) {
                URL.revokeObjectURL(sourceUrl);
            }
            reject(new Error('图片加载失败'));
        };

        image.src = sourceUrl;
    });
}

/** 将自动识别或管理员选择的颜色同步到页面状态与只读文本组件。 */
export function applyBannerGradientColor(color) {
    var normalizedColor = normalizeBannerGradientColor(color);
    var gradientColorField = this.$(BANNER_GRADIENT_COLOR_INPUT_ID);

    if (!normalizedColor) {
        return;
    }

    if (gradientColorField) {
        gradientColorField.setValue(normalizedColor, {
            triggerChange: false,
        });
    }

    this.setState({ bannerGradientColor: normalizedColor });
}

/**
 * Banner 新增或编辑弹窗的保存逻辑。
 */
export async function submitEditBanner() {
    var bannerFormInstId = this.state.editingBannerFormInstId;
    var isCreate = this.state.bannerDialogMode === 'create';
    var spuSelect = this.$('selectField_mt9t5mqx');
    var imageField = this.$('imageField_mt9t5mqv');
    var numberField = this.$('numberField_mt9t5mqw');
    var remarkField = this.$(BANNER_REMARK_INPUT_ID);
    var gradientColorField = this.$(BANNER_GRADIENT_COLOR_INPUT_ID);

    if (
        !spuSelect || !imageField || !numberField || !remarkField
    ) {
        this.utils.toast({
            title: '编辑弹窗未处于可保存状态。',
            type: 'error',
        });
        return;
    }

    var selectedSpuFormInstId = getComponentValue(spuSelect)
        || this.state.editingSpuFormInstId
        || '';
    var currentBannerImages = getComponentValue(imageField);
    var hasCurrentBannerImages = Array.isArray(currentBannerImages)
        && currentBannerImages.length;
    var bannerImages = !isCreate && !this.state.isEditingBannerImageChanged
        ? (this.state.editingBannerImages || [])
        : (hasCurrentBannerImages ? currentBannerImages : []);
    var sortValue = getComponentValue(numberField);
    var remark = String(getComponentValue(remarkField) || '').trim();
    var gradientColor = normalizeBannerGradientColor(
        getComponentValue(gradientColorField)
    ) || normalizeBannerGradientColor(this.state.bannerGradientColor);

    if (!isCreate && !bannerFormInstId) {
        this.utils.toast({
            title: '未获取到当前轮播记录，请关闭后重新点击编辑。',
            type: 'error',
        });
        return;
    }

    if (!selectedSpuFormInstId) {
        this.utils.toast({
            title: '请选择商品 SPU。',
            type: 'error',
        });
        return;
    }

    if (bannerImages.length !== 1) {
        this.utils.toast({
            title: '轮播图必须且只能保留 1 张，请删除多余图片后再保存。',
            type: 'error',
        });
        return;
    }

    var selectedSpu = (this.state.spuList || []).find(function (item) {
        return item.value === selectedSpuFormInstId;
    });

    if (!selectedSpu) {
        this.utils.toast({
            title: '未找到所选 SPU，请关闭弹窗后重新打开。',
            type: 'error',
        });
        return;
    }

    if (!gradientColor) {
        this.utils.toast({
            title: '渐变主色请输入 #RRGGBB 格式，例如 #38465A。',
            type: 'error',
        });
        return;
    }

    var numberSortValue = Number(sortValue || 0);
    if (!Number.isFinite(numberSortValue)) {
        this.utils.toast({
            title: '排序值必须是数字。',
            type: 'error',
        });
        return;
    }

    var normalizedBannerImages = bannerImages.map(function (file) {
        var response = file.response || {};
        var originFile = file.originFileObj || {};

        var previewUrl = file.previewUrl
            || file.imgURL
            || response.imgURL
            || originFile.imgURL
            || '';

        var downloadUrl = file.downloadUrl
            || file.downloadURL
            || response.downloadURL
            || originFile.downloadURL
            || file.url
            || response.url
            || originFile.url
            || '';

        var fileUuid = file.fileUuid
            || response.key
            || originFile.key
            || '';

        return {
            previewUrl: previewUrl,
            size: Number(file.size || 0),
            name: file.name || '',
            downloadUrl: downloadUrl,
            fileUuid: fileUuid,
            url: file.url || response.url || originFile.url || downloadUrl,
        };
    });

    if (
        !normalizedBannerImages[0].previewUrl ||
        !normalizedBannerImages[0].downloadUrl ||
        !normalizedBannerImages[0].fileUuid
    ) {
        this.utils.toast({
            title: '图片上传数据不完整，请删除后重新上传。',
            type: 'error',
        });
        return;
    }

    var updateFormData = {
        // SPU 业务编号既是商品跳转参数，也是删除 Banner 自动化的唯一筛选条件。
        [BANNER_SPU_ID_FIELD_ID]: selectedSpu.spuId,
        [BANNER_FORM_REMARK_FIELD_ID]: remark,
        [BANNER_FORM_GRADIENT_COLOR_FIELD_ID]: gradientColor,
        textField_mt806lzd: selectedSpu.productName,
        imagefield_0Qbn7EcV: JSON.stringify(normalizedBannerImages),
        numberfield_4BCfVwCO: numberSortValue,
        // 新增记录默认启用；管理员可通过列表开关调整。
        radiofield_9aVrQD8v: '启用',
    };

    try {
        console.log(
            '即将保存的轮播图片：',
            JSON.stringify(bannerImages)
        );

        if (isCreate) {
            await this.utils.yida.saveFormData({
                formUuid: 'FORM-FSD66281M0N88KURKUU4B7EQZ3GA2HPVHZ7TM1',
                appType: window.pageConfig.appType,
                formDataJson: JSON.stringify(updateFormData),
            });
        } else {
            await this.utils.yida.updateFormData({
                formInstId: bannerFormInstId,
                updateFormDataJson: JSON.stringify(updateFormData),
                useLatestVersion: 'y',
            });
        }

        this.$('dialog_mt9t5mqt').hide();

        this.utils.toast({
            title: isCreate ? '轮播配置已新增。' : '轮播配置已更新。',
            type: 'success',
        });

        this.setState({
            bannerDialogMode: '',
            editingBannerFormInstId: '',
            editingSpuFormInstId: '',
            editingBannerImages: [],
            isEditingBannerImageChanged: false,
            bannerGradientColor: DEFAULT_BANNER_GRADIENT_COLOR,
        });

        this.onRefreshBannerList();
    } catch (error) {
        this.utils.toast({
            title: '保存失败：' + (error.message || '未知错误'),
            type: 'error',
        });
    }
}

/**
 * 复用现有对话框确认按钮，按当前弹窗模式保存新增或编辑数据。
 */
export function onConfirmEditBanner() {
    this.submitEditBanner().catch((error) => {
        console.error('保存轮播配置失败：', error);

        this.utils.toast({
            title: '保存失败：' + (error.message || '未知错误'),
            type: 'error',
        });
    });

}

/**
 * 处理 Banner 图片的“选择文件”事件：压缩完成后才上传至宜搭。
 *
 * @param {Array} files 图片上传组件传入的待上传文件列表
 */
export function onSelectBannerImage(files) {
    if (!window.Compressor) {
        this.utils.toast({
            title: '图片压缩组件仍在加载，请稍后重试。',
            type: 'warning',
        });
        return;
    }

    this.setState({ isEditingBannerImageChanged: true });

    this.compressAndUploadImage(
        BANNER_IMAGE_FIELD_ID,
        files,
        BANNER_IMAGE_MAX_DIMENSION,
    );
}

/**
 * 将本地选择的图片压缩为 JPEG，并通过宜搭图片组件上传压缩结果。
 *
 * @param {String} fieldId 图片上传组件唯一标识
 * @param {Array} files 图片上传组件传入的待上传文件列表
 * @param {Number} maxDimension 图片最长边上限
 */
export function compressAndUploadImage(fieldId, files, maxDimension) {
    var page = this;
    var imageField = page.$(fieldId);
    var fileList = Array.isArray(files) ? files : [];

    if (!imageField || !fileList.length) {
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
            maxWidth: maxDimension,
            maxHeight: maxDimension,
            mimeType: 'image/jpeg',
            success: function (compressedFile) {
                var uploaderRef = componentType === 'drag'
                    ? imageField.uploaderRef.uploaderRef
                    : (isMobile
                        ? imageField.uploaderRef.uploaderRef
                        : imageField.uploaderRef);

                if (!uploaderRef || !uploaderRef.uploaderRef) {
                    page.utils.toast({
                        title: '图片上传组件未就绪，请关闭弹窗后重试。',
                        type: 'error',
                    });
                    return;
                }

                compressedFile.lastModifiedDate = new Date();
                compressedFile.name = page.buildCompressedImageName();
                compressedFile.uid = fileItem.uid;

                if (uploaderRef.state && Array.isArray(uploaderRef.state.value)) {
                    uploaderRef.state.value.forEach(function (currentFile) {
                        if (currentFile && currentFile.uid === compressedFile.uid) {
                            currentFile.size = compressedFile.size;
                            currentFile.name = compressedFile.name;
                        }
                    });
                }

                var uploadCompressedImage = function () {
                    uploaderRef.uploaderRef.startUpload([compressedFile]);
                };

                if (fieldId !== BANNER_IMAGE_FIELD_ID) {
                    uploadCompressedImage();
                    return;
                }

                page.detectBannerGradientColor(compressedFile)
                    .then(function (color) {
                        page.applyBannerGradientColor(color);
                    })
                    .catch(function () {
                        // 自动取色失败不阻塞上传；管理员可通过色板手动选择。
                    })
                    .then(uploadCompressedImage);
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
 * 生成不包含原始文件名的 Banner JPEG 文件名。
 *
 * @returns {String} JPEG 文件名
 */
export function buildCompressedImageName() {
    var randomBytes = new Uint32Array(1);
    var randomValue = '';

    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(randomBytes);
        randomValue = randomBytes[0].toString(36);
    } else {
        randomValue = Math.random().toString(36).slice(2, 10);
    }

    return 'banner-'
        + Date.now().toString(36)
        + '-'
        + randomValue.slice(0, 8)
        + '.jpg';
}
