function didFetch(content) {
    const categoryList = (content.data || [])
        .map(function (item) {
            const formData = item.formData || {};

            return {
                label: formData.textField_msh3c4lq || '',
                value: formData.serialNumberField_mszw0a4j || '',
                parentId: formData.textField_mshahk0e || '',
                sortNumber: Number(formData.numberField_msh3c4lr || 0)
            };
        })
        .filter(function (item) {
            return item.label && item.value;
        });

    function buildCategoryTree(parentId) {
        return categoryList
            .filter(function (item) {
                return item.parentId === parentId;
            })
            .sort(function (left, right) {
                return left.sortNumber - right.sortNumber;
            })
            .map(function (item) {
                const children = buildCategoryTree(item.value);

                return children.length
                    ? {
                        label: item.label,
                        value: item.value,
                        children: children
                    }
                    : {
                        label: item.label,
                        value: item.value
                    };
            });
    }

    return buildCategoryTree('');
}