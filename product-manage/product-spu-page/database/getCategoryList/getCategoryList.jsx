function didFetch(content) {
    // const rawList = content.data || [];

    // // 递归构建级联树
    // const buildTree = (parentId) => {
    //   return rawList
    //     .filter(item => {
    //       const parentVal = item.formData.textField_mshahk0e;
    //       // 匹配父级ID：parentId为null时查找一级分类（父级为空）
    //       if (parentId === null) {
    //         return !parentVal;
    //       } else {
    //         return parentVal === parentId;
    //       }
    //     })
    //     .map(item => {
    //       const node = {
    //         value: item.


    //         label: item.formData.textField_msh3c4lq || ''
    //       };
    //       // 递归查找当前节点的子级分类
    //       const children = buildTree(item.formInstId);
    //       if (children.length > 0) {
    //         node.children = children;
    //       }
    //       return node;
    //     })
    //     .filter(item => {
    //       const cleanLabel = (item.label || '').replace(/[\s\u3000]/g, '');
    //       return cleanLabel !== '';
    //     }); // 过滤掉名称为空的无效节点
    // };

    // // 从根节点开始生成完整级联选项
    // const cascaderOptions = buildTree(null);
    // console.log(cascaderOptions);
    // return cascaderOptions;

//1111111111111
    console.log(content.data,'content.data')
    const flatList = (content.data || []).map((item) => {

        return {
            label: item.formData.textField_msh3c4lq, // 显示名称
            value: item.formData.serialNumberField_mszw0a4j,                  // 选中值
            parentId: item.formData.textField_mshahk0e || null,
        };
    });
    console.log(flatList, ' flatList.data')
    function buildTree(list, pid = null) {
        const childNodes = list.filter(n => n.parentId === pid);
        childNodes.sort((a, b) => (Number(a.sortNum || 0)) - (Number(b.sortNum || 0)));
        childNodes.forEach(node => {
            if (buildTree(list, node.value).length > 0)  node.children = buildTree(list, node.value);
        });
        console.log(childNodes,'childNodes')
        return childNodes;
    }
    console.log(buildTree(flatList),'buildTree(flatList)')
    this.state.getCategoryList = buildTree(flatList)
    return buildTree(flatList);

}