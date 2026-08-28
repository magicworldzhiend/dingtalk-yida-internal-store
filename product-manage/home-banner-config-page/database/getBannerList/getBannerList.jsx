function didFetch(content) {
    var data = content && content.data ? content.data : [];
    var currentPage = Number(content && content.currentPage) || 1;
    var pageSize = 20;

    var pad = function (value) {
        return value < 10 ? '0' + value : String(value);
    };

    var result = data.map(function (item, index) {
        var formData = item.formData || {};
        var user = item.modifyUser || item.originator || {};
        var userName = user.name || {};

        var bannerDesktopUrl = '';
        var bannerMobileUrl = '';
        var bannerImageJson = formData.imagefield_0Qbn7EcV || '';

        // 解析轮播图：用于表格缩略展示
        try {
            var images = JSON.parse(bannerImageJson || '[]');
            var image = Array.isArray(images) && images.length ? images[0] : {};
            // 首页已经验证 downloadUrl 可访问；压缩上传时 previewUrl 可能为空或不可用于表格预览。
            var sourceUrl = image.downloadUrl || image.url || image.previewUrl || '';

            if (sourceUrl) {
                bannerDesktopUrl = sourceUrl.replace(
                    /([?&])process=[^&]*/,
                    '$1process=image/resize,m_fill,w_300,h_200,limit_0/quality,q_80'
                );

                bannerMobileUrl = sourceUrl.replace(
                    /([?&])process=[^&]*/,
                    '$1process=image/resize,m_fill,w_360,h_180,limit_0/quality,q_80'
                );
            }
        } catch (error) {
            bannerDesktopUrl = '';
            bannerMobileUrl = '';
        }

        // 解析关联 SPU：关联字段的值是 JSON 字符串
        var spuAssociationJson =
            formData.associationFormField_mt7zpx6h_id || '';
        var spuAssociation = [];

        try {
            var parsedAssociation = spuAssociationJson
                ? JSON.parse(spuAssociationJson)
                : [];

            // 当前关联字段为双层 JSON 字符串：
            // 第一次解析得到字符串，第二次解析才得到关联数组。
            if (typeof parsedAssociation === 'string') {
                parsedAssociation = JSON.parse(parsedAssociation);
            }

            spuAssociation = Array.isArray(parsedAssociation)
                ? parsedAssociation
                : [];
        } catch (error) {
            console.error('解析关联 SPU 失败：', error);
            spuAssociation = [];
        }

        var selectedSpu = spuAssociation[0] || {};

        var latestModifiedTime = '-';
        if (item.gmtModified) {
            var date = new Date(item.gmtModified);
            latestModifiedTime = date.getFullYear() + '-'
                + pad(date.getMonth() + 1) + '-'
                + pad(date.getDate()) + ' '
                + pad(date.getHours()) + ':'
                + pad(date.getMinutes());
        }

        return {
            serialNo: item.serialNo,
            formInstId: item.formInstId,
            displayIndex: (currentPage - 1) * pageSize + index + 1,

            productName: formData.textField_mt806lzd || '-',
            bannerDesktopUrl: bannerDesktopUrl,
            bannerMobileUrl: bannerMobileUrl,
            enabled: formData.radiofield_9aVrQD8v || '-',
            latestSubmitter: userName.zh_CN || userName.pureEn_US || item.modifier || '-',
            latestModifiedTime: latestModifiedTime,

            // 表格可展示字段
            spuId: selectedSpu.title || '',

            // 编辑使用的隐藏字段
            spuFormInstId: selectedSpu.instanceId || '',
            spuAssociationJson: spuAssociationJson,
            bannerImageJson: bannerImageJson,
            sortValue: formData.numberfield_4BCfVwCO_value === ''
                ? 0
                : Number(formData.numberfield_4BCfVwCO_value || 0)
        };
    });

    return {
        idCursor: content.idCursor,
        data: result,
        totalCount: content.totalCount || 0,
        currentPage: currentPage
    };
}
