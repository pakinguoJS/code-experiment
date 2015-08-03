$(function () {
    var store_data = store.get('ci_debug');
    var using = store.get('ci_debug_using') || 'NULL';
    if (!store_data) {
        renderEmpty();
        return;
    }

    var list = "";
    var tpl = '<li>\
        <a href="#" data-rel="action-item" data-id="{mid}">\
            <span class="glyphicon glyphicon-bookmark"></span>\
            <span>{name}</span>\
            <!--<p>\
                <label><input type="checkbox" data-id="{mid}" data-rel="trigger">Use</label>\
                <span data-href="../config/config.html?mid={mid}" data-rel="module-edit"><span class="glyphicon glyphicon-edit"></span>Edit</span>\
            </p>-->\
        </a>\
    </li>';
    for (var itm in store_data) {
        list += tpl.replace(/\{mid\}/g, store_data[itm].id).replace('{name}', store_data[itm].name);
    }
    if (list === "") {
        renderEmpty();
        return;
    }

    function renderEmpty() {
        $('<li><a href="../config/config.html" target="_blank">暂无模块，点击进入设置模块页面</a></li>').insertBefore($('#moduleListDivider'));
    }


    // 根据using勾选在使用中的
    var $list = $(list);
    $list.find('input[type="checkbox"][data-id="' + using + '"]').attr('checked', true);
    $list.insertBefore($('#moduleListDivider'));

    // 监听编辑
    $('#moduleList').on('click', 'span[data-rel="module-edit"]', function () {
        $('<a href="' + $(this).attr('data-href') + '" target="_blank"></a>').appendTo($('body'))[0].click();
    });

    // 监听use
    $('#moduleList').on('change', 'input[type="checkbox"][data-rel="trigger"]', function () {
        var mid = $(this).attr('data-id');

        if (this.checked) {
            // UI
            $('#moduleList').find('input[type="checkbox"][data-rel="trigger"]').each(function () {
                this.checked = false;
            });
            this.checked = true;

            // 缓存
            store.set('ci_debug_using', mid);

            // 执行页面参数转换
            // step1: 获取当前活动窗口的location.href等参数
            // step2: 获取模块的参数列表
            // step3: 调用chrome的库函数执行脚本
            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                var current = tabs[0];
                var url = current.url;

                var rs = getParameters(url);

                // 拉取模块的参数
                var module = store_data[mid];
                var paramters = {};
                for (var itm in module.params) {
                    paramters[module.params[itm].key] = module.params[itm].val
                }

                // 替换url
                var instanceUrlFilter = new UrlFilter(rs.origin, null, rs.search, rs.hash);
                var reloadUrl = instanceUrlFilter.addParameters(paramters);
                var code = "location.href = '" + reloadUrl + "'";

                // 调用chrome API刷新页面
                chrome.tabs.executeScript(null, {code: code});
            });
        } else {
            // 清空缓存
            store.set('ci_debug_using', null);

            // 执行页面参数转换
            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                var current = tabs[0];
                var url = current.url;

                var rs = getParameters(url);

                // 拉取模块的参数
                var module = store_data[mid];
                var paramters = [];
                for (var itm in module.params) {
                    paramters.push(module.params[itm].key);
                }

                // 替换url
                var instanceUrlFilter = new UrlFilter(rs.origin, null, rs.search, rs.hash);
                var reloadUrl = instanceUrlFilter.delParameters(paramters);
                var code = "location.href = '" + reloadUrl + "'";

                // 调用chrome API刷新页面
                chrome.tabs.executeScript(null, {code: code});
            });
        }
    });


    function getParameters(url) {
        var s_index = url.indexOf('?');
        var h_index = url.lastIndexOf('#');
        var origin, search, hash;

        // 分几种情况赋值
        if (s_index < 0 && h_index < 0) {
            origin = url;
            search = "";
            hash = "";
        } else if (s_index > -1 && h_index > -1) {
            if (s_index < h_index) {
                origin = url.substring(0, s_index);
                search = url.substring(s_index, h_index);
                hash = url.substring(h_index, url.length);
            } else {
                origin = url.substring(0, h_index);
                search = "";
                hash = url.substring(h_index, url.length);
            }
        } else if (s_index < 0 && h_index > -1) {
            origin = url.substring(0, h_index);
            search = '';
            hash = url.substring(h_index, url.length);
        } else {
            origin = url.substring(0, s_index);
            search = url.substring(s_index, url.length);
            hash = '';
        }

        return {
            origin: origin,
            search: search,
            hash: hash
        }
    }


    // 监听点击
    $('#moduleList').on('click', 'a[data-rel="action-item"]', function () {
        var mid = $(this).attr('data-id');

        // 缓存
        store.set('ci_debug_using', mid);

        // 执行页面参数转换
        // step1: 获取当前活动窗口的location.href等参数
        // step2: 获取模块的参数列表
        // step3: 调用chrome的库函数执行脚本
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            var current = tabs[0];
            var url = current.url;

            var rs = getParameters(url);

            // 拉取模块的参数
            var module = store_data[mid];
            var paramters = {};
            for (var itm in module.params) {
                paramters[module.params[itm].key] = module.params[itm].val
            }

            // 替换url
            var instanceUrlFilter = new UrlFilter(rs.origin, null, rs.search, rs.hash);
            var reloadUrl = instanceUrlFilter.addParameters(paramters);
            var code = "location.href = '" + reloadUrl + "'";

            // 调用chrome API刷新页面
            chrome.tabs.executeScript(null, {code: code});

            // close window
            window.close();
        });
    });


    // 监听回到默认链接
    $("#cancel").click(function(){
        var mid = using;
        if(!using || using == 'NULL'){
            window.close();
            return;
        }

        // 清空缓存
        store.set('ci_debug_using', null);

        // 执行页面参数转换
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            var current = tabs[0];
            var url = current.url;

            var rs = getParameters(url);

            // 拉取模块的参数
            var module = store_data[mid];
            var paramters = [];
            for (var itm in module.params) {
                paramters.push(module.params[itm].key);
            }

            // 替换url
            var instanceUrlFilter = new UrlFilter(rs.origin, null, rs.search, rs.hash);
            var reloadUrl = instanceUrlFilter.delParameters(paramters);
            var code = "location.href = '" + reloadUrl + "'";

            // 调用chrome API刷新页面
            chrome.tabs.executeScript(null, {code: code});

            window.close();
        });
    });


});

