/**
 * 尊敬的用户，你好：页面 JS 面板是高阶用法，一般不建议普通用户使用，如需使用，请确定你具备研发背景，能够自我排查问题。当然，你也可以咨询身边的技术顾问或者联系宜搭平台的技术支持获得服务（可能收费）。
 * 我们可以用 JS 面板来开发一些定制度高功能，比如：调用阿里云接口用来做图像识别、上报用户使用数据（如加载完成打点）等等。
 * 你可以点击面板上方的 「使用帮助」了解。
 */

const SPU_IMAGE_FIELD_ID = 'imageField_msq691ft';
const SPU_IMAGE_MAX_DIMENSION = 1280;
const IMAGE_COMPRESS_QUALITY = 0.8;
const COMPRESSOR_SCRIPT_URL = 'https://g.alicdn.com/code/lib/compressorjs/1.1.1/compressor.min.js';

// 当页面渲染完毕后马上调用下面的函数，这个函数是在当前页面 - 设置 - 生命周期 - 页面加载完成时中被关联的。
export function didMount() {

    // const arr = this.$('cascadeSelectField_msv95kk7').getValue();
    // if(arr.length>0){
    //     this.$('cascadeSelectField_msv95kk7').setValue('FINST-' + this.$('cascadeSelectField_msv95kk7').getValue())
    // }
    console.log(`「页面 JS」：当前页面地址 ${location.href}`);
    this.$(SPU_IMAGE_FIELD_ID).set('autoUpload', false);
    this.utils.loadScript(COMPRESSOR_SCRIPT_URL);
    // console.log(`「页面 JS」：当前页面 id 参数为 ${this.state.urlParams.id}`);
    // 更多 this 相关 API 请参考：https://www.yuque.com/yida/support/ocmxyv#OCEXd
    // document.title = window.loginUser.userName + ' | 宜搭';


}


/**
 * CascadeSelectField onChange
 * @param value 选中的值，单选时返回单个值，多选时返回数组
 * @param data 选中的数据，包括 value 和 label，单选时返回单个值，多选时返回数组，父子节点选中关联时，同时选中，只返回父节点
 * @param extra 额外参数
 */
export function onChange({ value, data, extra }){
    console.log('onChange', value, data, extra);
    console.log('商品类别选择结果：', value);

    let childId = '';

    if (Array.isArray(value)) {
        childId = value[value.length - 1];
    } else {
        childId = value || '';
    }

    console.log('最终子类ID：', childId);

    this.$('textField_mtbaod64').setValue(childId);
}

/**
 * 处理商品主图的“选择文件”事件：压缩完成后才上传至宜搭。
 *
 * @param {Array} files 图片上传组件传入的待上传文件列表
 */
export function onSelectSpuImage(files) {
    if (!window.Compressor) {
        this.utils.toast({
            title: '图片压缩组件仍在加载，请稍后重试。',
            type: 'warning',
        });
        return;
    }

    this.compressAndUploadSpuImages(files);
}

/**
 * 将商品主图压缩为 JPEG，并通过宜搭图片组件上传压缩结果。
 *
 * @param {Array} files 图片上传组件传入的待上传文件列表
 */
export function compressAndUploadSpuImages(files) {
    var page = this;
    var imageField = page.$(SPU_IMAGE_FIELD_ID);
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
            maxWidth: SPU_IMAGE_MAX_DIMENSION,
            maxHeight: SPU_IMAGE_MAX_DIMENSION,
            mimeType: 'image/jpeg',
            success: function (compressedFile) {
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

                compressedFile.lastModifiedDate = new Date();
                compressedFile.name = page.buildCompressedSpuImageName();
                compressedFile.uid = fileItem.uid;

                if (uploaderRef.state && Array.isArray(uploaderRef.state.value)) {
                    uploaderRef.state.value.forEach(function (currentFile) {
                        if (currentFile && currentFile.uid === compressedFile.uid) {
                            currentFile.size = compressedFile.size;
                            currentFile.name = compressedFile.name;
                        }
                    });
                }

                uploaderRef.uploaderRef.startUpload([compressedFile]);
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
 * 处理商品主图“上传成功”事件：将运行时上传对象标准化为宜搭图片字段对象。
 * 标准化后，原生表单的数据管理页和首页均可正确读取图片。
 */
export function onSpuImageUploadSuccess() {
    var imageField = this.$(SPU_IMAGE_FIELD_ID);
    var imageList = imageField && typeof imageField.getValue === 'function'
        ? imageField.getValue()
        : [];
    var uploadedImageList = Array.isArray(imageList) ? imageList : [];
    var normalizedImageList = uploadedImageList.map(this.normalizeSpuImage);

    if (!imageField || !normalizedImageList.length) {
        this.utils.toast({
            title: '商品主图上传数据不完整，请删除后重新上传。',
            type: 'error',
        });
        return;
    }

    // 多图并发上传时，任一图片尚未返回完整数据就不回写，避免覆盖待上传图片。
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
export function normalizeSpuImage(file) {
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
 * 生成不包含原始文件名的商品主图 JPEG 文件名。
 *
 * @returns {String} JPEG 文件名
 */
export function buildCompressedSpuImageName() {
    var randomBytes = new Uint32Array(1);
    var randomValue = '';

    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(randomBytes);
        randomValue = randomBytes[0].toString(36);
    } else {
        randomValue = Math.random().toString(36).slice(2, 10);
    }

    return 'spu-'
        + Date.now().toString(36)
        + '-'
        + randomValue.slice(0, 8)
        + '.jpg';
}
