/**
 * 渲染首页搜索框、类目筛选抽屉及其交互状态。
 */
function render(me, state, data, ctx) {
    const pageContext = this;
    const pageState = pageContext.state || {};
    const categoryList = Array.isArray(pageState.getCategoryList)
        ? pageState.getCategoryList
        : [];
    const isMobile = pageContext.utils.isMobile();
    const keywordInput = pageState.keywordInput !== undefined
        ? pageState.keywordInput
        : (pageState.keyword || '');
    const drawerVisible = Boolean(pageState.filterDrawerVisible);
    const selectedParentCategoryId = pageState.selectedParentCategoryId || '';
    const selectedCategoryId = pageState.selectedCategoryId || '';
    const activeCategoryMenu = pageState.activeCategoryMenu || '';
    const hasActiveSearchOrFilter = Boolean(
        String(keywordInput || '').trim()
        || String(pageState.keyword || '').trim()
        || pageState.appliedParentCategoryId
        || pageState.appliedCategoryId
    );

    const selectedParentCategory = categoryList.find(function (item) {
        return item.value === selectedParentCategoryId;
    });

    const childCategoryList = selectedParentCategory
        ? (selectedParentCategory.children || [])
        : [];

    const selectedChildCategory = childCategoryList.find(function (item) {
        return item.value === selectedCategoryId;
    });

    const selectedParentCategoryLabel = selectedParentCategory
        ? selectedParentCategory.label
        : '全部类目';

    const selectedChildCategoryLabel = selectedChildCategory
        ? selectedChildCategory.label
        : '全部二级类目';

    /** 统一调用页面状态更新，保持 JSX 与商品列表共享同一 state。 */
    function updateState(value) {
        pageContext.setState(value);
    }

    /** 在搜索或筛选条件变化后，通知商品触底观察器绑定新列表。 */
    function resetProductListObserver() {
        window.setTimeout(function () {
            window.dispatchEvent(new Event('home-product-list-changed'));
        }, 100);
    }

    /** 提交输入框关键字，并将商品卡片可见数量重置为首批 4 条。 */
    function submitSearch() {
        updateState({
            keyword: String(keywordInput || '').trim(),
            productVisibleCount: 4
        });
        resetProductListObserver();
    }

    /** 清空搜索、已应用类目及抽屉状态，恢复全部商品展示。 */
    function clearSearchAndResetProducts() {
        updateState({
            keywordInput: '',
            keyword: '',
            selectedParentCategoryId: '',
            selectedCategoryId: '',
            appliedParentCategoryId: '',
            appliedCategoryId: '',
            productVisibleCount: 4,
            filterDrawerVisible: false,
            activeCategoryMenu: ''
        });
        resetProductListObserver();
    }

    /** 打开抽屉并回显上一次已确认的类目筛选，而非未确认的临时选择。 */
    function openFilterDrawer() {
        updateState({
            filterDrawerVisible: true,
            activeCategoryMenu: '',
            selectedParentCategoryId: pageState.appliedParentCategoryId || '',
            selectedCategoryId: pageState.appliedCategoryId || ''
        });
    }

    /** 关闭抽屉并丢弃本次未点击“确定”的临时选择。 */
    function closeFilterDrawer() {
        updateState({
            filterDrawerVisible: false,
            activeCategoryMenu: '',
            selectedParentCategoryId: '',
            selectedCategoryId: ''
        });
    }

    /** 清除类目筛选并恢复商品列表首批展示。 */
    function clearFilter() {
        updateState({
            selectedParentCategoryId: '',
            selectedCategoryId: '',
            appliedParentCategoryId: '',
            appliedCategoryId: '',
            productVisibleCount: 4,
            activeCategoryMenu: ''
        });
        resetProductListObserver();
    }

    /** 将抽屉内临时选择写入 applied 状态，供商品列表实际过滤。 */
    function confirmFilter() {
        updateState({
            appliedParentCategoryId: selectedParentCategoryId,
            appliedCategoryId: selectedCategoryId,
            filterDrawerVisible: false,
            activeCategoryMenu: '',
            selectedParentCategoryId: '',
            productVisibleCount: 4,
            selectedCategoryId: ''
        });
        resetProductListObserver();
    }

    /** 切换一级或二级类目下拉菜单的展开状态。 */
    function toggleCategoryMenu(menuName) {
        updateState({
            activeCategoryMenu: activeCategoryMenu === menuName ? '' : menuName
        });
    }

    /** 选择一级类目时清空已选二级类目，避免父子类目不匹配。 */
    function selectParentCategory(categoryId) {
        updateState({
            selectedParentCategoryId: categoryId,
            selectedCategoryId: '',
            activeCategoryMenu: ''
        });
    }

    /** 选择二级类目并关闭当前下拉菜单。 */
    function selectChildCategory(categoryId) {
        updateState({
            selectedCategoryId: categoryId,
            activeCategoryMenu: ''
        });
    }

    /**
     * 渲染带动画的类目下拉选择器。
     *
     * @param {string} menuName 当前下拉菜单标识。
     * @param {Array} optionList 可选类目列表。
     * @param {string} selectedId 当前选中业务主键。
     * @param {string} selectedLabel 当前展示文本。
     * @param {string} allOptionLabel “全部”选项文本。
     * @param {Function} onSelect 类目选择回调。
     */
    function renderCategoryDropdown(
        menuName,
        optionList,
        selectedId,
        selectedLabel,
        allOptionLabel,
        onSelect
    ) {
        const expanded = activeCategoryMenu === menuName;

        return (
            <div style={{ position: 'relative' }}>
                <button
                    type="button"
                    onClick={(event) => {
                        // 防止点击按钮冒泡到抽屉容器并立即关闭菜单。
                        event.stopPropagation();
                        toggleCategoryMenu(menuName);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        border: '1px solid #D9DDE3',
                        borderRadius: '8px',
                        color: '#1F2329',
                        backgroundColor: '#FFFFFF',
                        textAlign: 'left'
                    }}
                >
                    <span>{selectedLabel}</span>
                    <span
                        style={{
                            color: '#8F959E',
                            fontSize: '16px',
                            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 180ms ease-in-out'
                        }}
                    >
            ⌄
          </span>
                </button>

                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: '0',
                        left: '0',
                        zIndex: '10',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        padding: '6px',
                        boxSizing: 'border-box',
                        border: '1px solid #E5E6EB',
                        borderRadius: '8px',
                        opacity: expanded ? 1 : 0,
                        pointerEvents: expanded ? 'auto' : 'none',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 8px 20px rgba(31, 35, 41, 0.12)',
                        transform: expanded ? 'translateY(0)' : 'translateY(-8px)',
                        transformOrigin: 'top',
                        transition: 'opacity 180ms ease-in-out, transform 180ms ease-in-out'
                    }}
                >
                    <button
                        type="button"
                        class={!selectedId
                            ? 'home-category-option home-category-option-selected'
                            : 'home-category-option'}
                        onClick={() => onSelect('')}
                        style={{
                            width: '100%',
                            height: '36px',
                            border: '0',
                            borderRadius: '6px',
                            textAlign: 'left'
                        }}
                    >
                        {allOptionLabel}
                    </button>

                    {optionList.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            class={selectedId === item.value
                                ? 'home-category-option home-category-option-selected'
                                : 'home-category-option'}
                            onClick={() => onSelect(item.value)}
                            style={{
                                width: '100%',
                                height: '36px',
                                border: '0',
                                borderRadius: '6px',
                                textAlign: 'left'
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                width: '100%',
                padding: isMobile ? '12px 0' : '16px 0'
            }}
        >
            <div
                style={{
                    position: 'relative',
                    flex: '1',
                    minWidth: '0'
                }}
            >
                <input
                    value={keywordInput}
                    placeholder="搜索商品名称"
                    onChange={(event) => updateState({
                        keywordInput: event.target.value
                    })}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            submitSearch();
                        }
                    }}
                    style={{
                        width: '100%',
                        height: '42px',
                        padding: hasActiveSearchOrFilter
                            ? '0 80px 0 14px'
                            : '0 46px 0 14px',
                        border: '1px solid #D9DDE3',
                        borderRadius: '8px',
                        outline: 'none',
                        fontSize: '14px',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box'
                    }}
                />

                {hasActiveSearchOrFilter && (
                    <button
                        type="button"
                        class="home-icon-action"
                        title="清空搜索并恢复全部商品"
                        aria-label="清空搜索并恢复全部商品"
                        onClick={() => clearSearchAndResetProducts()}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            right: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            padding: '0',
                            border: '0',
                            borderRadius: '6px',
                            color: '#8F959E',
                            backgroundColor: 'transparent',
                            transform: 'translateY(-50%)'
                        }}
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        >
                            <path d="M6 6l12 12"></path>
                            <path d="M18 6L6 18"></path>
                        </svg>
                    </button>
                )}

                <button
                    type="button"
                    class="home-icon-action"
                    title="搜索"
                    onClick={() => submitSearch()}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        right: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        padding: '0',
                        border: '0',
                        borderRadius: '6px',
                        color: '#1677FF',
                        backgroundColor: 'transparent',
                        transform: 'translateY(-50%)'
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="6"></circle>
                        <path d="M20 20l-4.2-4.2"></path>
                    </svg>
                </button>
            </div>

            <button
                type="button"
                class="home-filter-icon-action"
                title="筛选"
                onClick={() => openFilterDrawer()}
                style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '42px',
                    height: '42px',
                    padding: '0',
                    border: '1px solid #D9DDE3',
                    borderRadius: '8px',
                    color: '#1677FF',
                    backgroundColor: '#FFFFFF'
                }}
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M4 6h16"></path>
                    <path d="M4 12h16"></path>
                    <path d="M4 18h16"></path>
                    <circle cx="9" cy="6" r="2"></circle>
                    <circle cx="15" cy="12" r="2"></circle>
                    <circle cx="11" cy="18" r="2"></circle>
                </svg>
            </button>

            <div
                onClick={() => closeFilterDrawer()}
                style={{
                    position: 'fixed',
                    inset: '0',
                    zIndex: '1000',
                    opacity: drawerVisible ? 1 : 0,
                    pointerEvents: drawerVisible ? 'auto' : 'none',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    transition: 'opacity 240ms ease-in-out'
                }}
            >
                <div
                    onClick={(event) => {
                        event.stopPropagation();
                        updateState({
                            activeCategoryMenu: ''
                        });
                    }}
                    style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        display: 'flex',
                        flexDirection: 'column',
                        width: isMobile ? '100%' : '360px',
                        height: '100%',
                        padding: '24px',
                        boxSizing: 'border-box',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '-8px 0 24px rgba(31, 35, 41, 0.12)',
                        transform: drawerVisible ? 'translateX(0)' : 'translateX(100%)',
                        transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
                        willChange: 'transform'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '24px'
                        }}
                    >
            <span
                style={{
                    color: '#1F2329',
                    fontSize: '18px',
                    fontWeight: '600'
                }}
            >
              商品筛选
            </span>

                        <button
                            type="button"
                            onClick={() => closeFilterDrawer()}
                            style={{
                                border: '0',
                                color: '#646A73',
                                backgroundColor: 'transparent',
                                fontSize: '24px'
                            }}
                        >
                            ×
                        </button>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <div
                            style={{
                                marginBottom: '8px',
                                color: '#1F2329',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}
                        >
                            一级类目
                        </div>

                        {renderCategoryDropdown(
                            'parent',
                            categoryList,
                            selectedParentCategoryId,
                            selectedParentCategoryLabel,
                            '全部类目',
                            selectParentCategory
                        )}
                    </div>

                    {childCategoryList.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <div
                                style={{
                                    marginBottom: '8px',
                                    color: '#1F2329',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}
                            >
                                二级类目
                            </div>

                            {renderCategoryDropdown(
                                'child',
                                childCategoryList,
                                selectedCategoryId,
                                selectedChildCategoryLabel,
                                '全部二级类目',
                                selectChildCategory
                            )}
                        </div>
                    )}

                    <div
                        style={{
                            display: 'flex',
                            gap: '12px',
                            marginTop: 'auto'
                        }}
                    >
                        <button
                            class="home-filter-reset"
                            type="button"
                            onClick={() => clearFilter()}
                            style={{
                                flex: '1',
                                height: '42px',
                                border: '1px solid #D9DDE3',
                                borderRadius: '8px',
                                color: '#1F2329',
                                backgroundColor: '#FFFFFF'
                            }}
                        >
                            重置
                        </button>

                        <button
                            type="button"
                            class="home-filter-confirm"
                            onClick={() => confirmFilter()}
                            style={{
                                flex: '1',
                                height: '42px',
                                border: '0',
                                borderRadius: '8px',
                                color: '#FFFFFF',
                                backgroundColor: '#1677FF'
                            }}
                        >
                            确定
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
